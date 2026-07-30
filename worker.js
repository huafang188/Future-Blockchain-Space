/**
 * 🛠️ Future Space 后端 Worker - 性能优化版
 * 优化：使用飞书筛选API + 缓存机制 + 按需查询
 */

// 凭据：优先从 Cloudflare 环境变量读取，回退到默认值（便于本地调试）
const FEISHU_CONFIG = {
  app_id: 'cli_a924482f68619bc6',
  app_secret: 'uYPygSaP8QJ2DZ3TssyJBcSQwwYgHxyY',
  app_token: 'YCHSbfDEpa3RhYs2zLFc45YJnbb',
};

const TABLE_IDS = {
  recommend_rel: 'tblXc1F4VkFsmqJF',
  user_balance: 'tblFXkcGlzTimXep',
  user_team: 'tblPKLs0jYlN0UnJ',
  user_miner: 'tbljxvG3g9XOBRb3',
  tx_history: 'tblebIbE44XseRWh',
  transfer_log: 'tblTcC8g8C2hWXQV',
  price_config: 'tblgxb6xZZBW67Ws'
};

// 缓存机制：存储公共数据，减少重复查询
const cache = {
  prices: { data: null, time: 0 },
  okxPrices: { data: null, time: 0 },
  // 用户数据缓存：10秒内同一用户请求返回缓存
  users: new Map(),
  // 飞书 Token 缓存：避免每次请求都重新获取
  feishuToken: { token: null, time: 0 },
  // 签名防重缓存：30秒内相同签名只处理一次
  signatures: new Map()
};
// 单飞机制：同一用户并发请求只查一次，共享结果（防止缓存过期瞬间雪崩）
const inflightUsers = new Map();

const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const USER_CACHE_DURATION = 10 * 1000; // 10秒用户缓存
const TOKEN_CACHE_DURATION = 60 * 60 * 1000; // 1小时 Token 缓存
const SIGNATURE_CACHE_DURATION = 30 * 1000; // 30秒签名缓存
const MAX_CACHE_USERS = 1000; // 用户缓存上限
const MAX_CACHE_SIGNATURES = 5000; // 签名缓存上限

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
  "Content-Type": "application/json"
};

export default {
  async fetch(request, env) {
    // 从 Cloudflare 环境变量加载凭据（优先），兼容本地默认值
    if (env) {
      FEISHU_CONFIG.app_id = env.FEISHU_APP_ID || FEISHU_CONFIG.app_id;
      FEISHU_CONFIG.app_secret = env.FEISHU_APP_SECRET || FEISHU_CONFIG.app_secret;
      FEISHU_CONFIG.app_token = env.FEISHU_APP_TOKEN || FEISHU_CONFIG.app_token;
    }

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const url = new URL(request.url);
      const address = url.searchParams.get("address")?.trim();
      
      // ==========================================
      // 【POST 逻辑】强制字符串化，修复 ConvFail
      // ==========================================
      if (request.method === "POST") {
        const requestStart = Date.now();
        const feishuToken = await getFeishuToken();
        
        const body = await request.json();
        const userAddr = String(body.address || "").trim();
        
        // 格式化时间为莫斯科时间字符串（Worker 运行在 UTC，需显式转换时区）
        const now = new Date();
        const moscowParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Moscow',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).formatToParts(now);
        const p = {};
        for (const part of moscowParts) p[part.type] = part.value;
        const timeStr = `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}:${p.second}`;

        if (!userAddr) return jsonResponse({ success: false, msg: "Address is required" }, 400);

        // --- 签名防重检查 ---
        // 注意：当前仅做防重，未对签名做链上验证（需 secp256k1 库，后续增强）
        if (body.signature) {
          const sigKey = body.signature;
          if (cache.signatures.has(sigKey)) {
            console.log(`[POST] ⛔ 检测到重复签名: ${sigKey.substring(0, 20)}...`);
            return jsonResponse({ success: false, msg: "重复提交，请勿重复签名" });
          }
          // 达到上限时先清理过期项再写入
          if (cache.signatures.size >= MAX_CACHE_SIGNATURES) {
            for (const [key, time] of cache.signatures.entries()) {
              if (Date.now() - time > SIGNATURE_CACHE_DURATION) {
                cache.signatures.delete(key);
              }
            }
          }
          cache.signatures.set(sigKey, Date.now());
        }

        let targetTable = TABLE_IDS.tx_history;
        let rawFields = {};

        // A. 绑定邀请
        if (body.action === "bind_inviter") {
          targetTable = TABLE_IDS.recommend_rel;
          rawFields = {
            "用户": userAddr,
            "推荐码": body.myInviteCode,
            "推荐人": body.inviterId,
            "注册时间": timeStr
          };
        }
        // B. 转账/矿机转让 (进入 transfer_log 表)
        else if (body.action === "transfer" || body.action === "transfer_miner") {
          targetTable = TABLE_IDS.transfer_log;
          rawFields = {
            "用户": userAddr,
            "接收者": body.receiver,
            "接收类型": (body.action === "transfer_miner" ? "MINER" : body.symbol),
            "接收数量": body.amount, 
            "状态": "成功",
            "转账时间": timeStr
          };
        }
        // C. 申请团队 (进入 tx_history 表)
        else if (body.action === "bind_email") {
          targetTable = TABLE_IDS.tx_history;
          rawFields = {
            "用户": userAddr,
            "交易类型": "申请团队数据",
            "交易代币": "INFO",
            "交易数量": "0",
            "交易状态": "已提交",
            "交易时间": timeStr,
            "备注": body.email
          };
        }
        // D. 通用交易 (充值、提现、兑换)
        else {
          targetTable = TABLE_IDS.tx_history;
          rawFields = {
            "用户": userAddr,
            "交易类型": body.type || "操作记录",
            "交易代币": body.symbol || "USDT",
            "交易数量": body.amount, 
            "交易状态": "已提交",
            "交易时间": timeStr,
            "备注": body.signature ? "已签名确认" : ""
          };
        }

        // --- 核心修复：强制清理并 String 化所有字段 ---
        const finalFields = {};
        Object.keys(rawFields).forEach(key => {
            const value = rawFields[key];
            if (value === null || value === undefined) {
                finalFields[key] = "";
            } else {
                finalFields[key] = String(value); 
            }
        });

        console.log(`[POST] 开始写入飞书表: ${body.action}, Token获取耗时: ${Date.now() - requestStart}ms`);
        const feishuRes = await createRecord(feishuToken, targetTable, finalFields);
        const feishuData = await feishuRes.json();
        console.log(`[POST] ✅ 完成 ${body.action}, 总耗时: ${Date.now() - requestStart}ms`);

        return jsonResponse({
          success: feishuData.code === 0,
          msg: feishuData.msg,
          requestTime: Date.now() - requestStart
        });
      }

      // ==========================================
      // 【GET 逻辑】优化版：按地址精准查询 + 单飞去重 + 用户数据缓存
      // ==========================================
      // 在 GET 请求前才获取 token
      const feishuToken = await getFeishuToken();
      if (address) {
        const requestStart = Date.now();

        // 1. 检查用户数据缓存（10秒内不重复查询）
        const userCacheKey = address.toLowerCase();
        const cachedUserData = cache.users.get(userCacheKey);

        if (cachedUserData && (Date.now() - cachedUserData.time) < USER_CACHE_DURATION) {
          console.log(`[GET] 使用缓存数据，用户: ${address}`);

          // 返回缓存的用户数据 + 重新获取的价格
          const { allPrices, priceHistory } = await getCachedPrices(feishuToken);

          return jsonResponse({
            ...cachedUserData.data,
            allPrices,
            priceHistory,
            cached: true,
            requestTime: Date.now() - requestStart
          });
        }

        // 1.5 单飞去重：缓存过期瞬间，同一用户的并发请求只查一次，共享结果
        if (inflightUsers.has(userCacheKey)) {
          console.log(`[GET] 单飞命中，等待已有查询完成，用户: ${address}`);
          const sharedData = await inflightUsers.get(userCacheKey);
          const { allPrices, priceHistory } = await getCachedPrices(feishuToken);
          return jsonResponse({
            ...sharedData,
            allPrices,
            priceHistory,
            cached: true,
            requestTime: Date.now() - requestStart
          });
        }

        // 2. 获取公共数据（价格配置 + OKX价格）- 使用缓存
        let allPrices = { "USDT": 1.0, "SOL": 0, "GRAM": 0, "BNB": 0 };
        let priceHistory = {};
        const tokenSymbols = ['NEO', 'NEX', 'NET', 'NEA', 'NRY', 'NCL'];
        tokenSymbols.forEach(sym => { priceHistory[sym] = []; });

        // 2.1 OKX价格缓存
        const now = Date.now();
        if (cache.okxPrices.data && (now - cache.okxPrices.time) < CACHE_DURATION) {
          Object.assign(allPrices, cache.okxPrices.data);
        } else {
          const okxRes = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT').then(r => r.json()).catch(() => ({ data: [] }));
          if (okxRes?.data) {
            okxRes.data.forEach(t => {
              if (t.instId === "SOL-USDT") allPrices["SOL"] = parseFloat(t.last);
              if (t.instId === "TON-USDT") allPrices["GRAM"] = parseFloat(t.last);
              if (t.instId === "BNB-USDT") allPrices["BNB"] = parseFloat(t.last);
            });
            cache.okxPrices.data = { "SOL": allPrices["SOL"], "GRAM": allPrices["GRAM"], "BNB": allPrices["BNB"] };
            cache.okxPrices.time = now;
          }
        }

        // 2.2 飞书价格配置缓存
        if (cache.prices.data && (now - cache.prices.time) < CACHE_DURATION) {
          Object.assign(allPrices, cache.prices.data.allPrices);
          priceHistory = cache.prices.data.priceHistory;
        } else {
          const priceD = await queryTable(feishuToken, TABLE_IDS.price_config);
          
          if (priceD?.items) {
            priceD.items.forEach(i => {
              const f = i.fields;
              const sym = String(f["token"] || f["Token"] || f["代币"] || "").toUpperCase().trim();
              const val = parseFloat(f["price"] || f["Price"] || f["价格"]);
              const executeTime = f["execute_time"] || f["执行时间"] || f["时间"];
              
              if (sym && !isNaN(val)) {
                allPrices[sym] = val;
              }
              
              if (sym && val && executeTime && priceHistory[sym]) {
                priceHistory[sym].push({
                  token: sym,
                  price: String(val),
                  execute_time: String(executeTime)
                });
              }
            });
          }

          tokenSymbols.forEach(sym => {
            if (priceHistory[sym].length > 0) {
              priceHistory[sym].sort((a, b) => {
                const dateA = parseDateStr(a.execute_time);
                const dateB = parseDateStr(b.execute_time);
                return dateA - dateB;
              });
              const latestRecord = priceHistory[sym][priceHistory[sym].length - 1];
              if (latestRecord) {
                allPrices[sym] = parseFloat(latestRecord.price);
              }
            }
          });

          cache.prices.data = { allPrices, priceHistory };
          cache.prices.time = now;
        }

        // 3. 按地址精准查询用户数据（替代全表扫描，大幅减少数据传输量）
        //    使用飞书筛选 API 只查该用户的记录，而非拉取全表后内存过滤

        // 3.1 注册单飞 Promise：同一用户并发请求共享此次查询结果
        const queryPromise = (async () => {
          // 先查推荐关系表，判断是否为新用户
          const userInfo = await queryUserByAddress(feishuToken, TABLE_IDS.recommend_rel, address);

          // 新用户处理：提前返回，避免查询其他 5 张表
          if (!userInfo || Object.keys(userInfo).length === 0) {
            return { newUser: true, address, allPrices, priceHistory, requestTime: Date.now() - requestStart };
          }

          // 3.2 并行查询该用户的其他数据（仅查该用户的记录）
          const [userBalances, userTeam, userMiner, txList, logList] = await Promise.all([
            queryUserByAddress(feishuToken, TABLE_IDS.user_balance, address),
            queryUserByAddress(feishuToken, TABLE_IDS.user_team, address),
            queryUserByAddress(feishuToken, TABLE_IDS.user_miner, address),
            queryUserByAddress(feishuToken, TABLE_IDS.tx_history, address),
            queryUserByAddress(feishuToken, TABLE_IDS.transfer_log, address)
          ]);

          // 4. 整理返回对象
          return {
            newUser: false,
            address,
            allPrices,
            priceHistory,
            info: {
              "推荐码": userInfo["推荐码"] || "---",
              "推荐人": userInfo["推荐人"] || "无",
              "注册时间": userInfo["注册时间"] || "---",
              "团队": userInfo["团队"] || userInfo["所属团队"] || ""
            },
            balances: userBalances || {},
            team: {
              "直推人数": Number(userTeam?.["直推人数"] || 0),
              "直推业绩": Number(userTeam?.["直推业绩"] || 0),
              "团队人数": Number(userTeam?.["团队人数"] || 0),
              "团队业绩": Number(userTeam?.["团队业绩"] || 0),
              "累计奖励": Number(userTeam?.["累计奖励"] || 0),
              "矿工等级": userTeam?.["矿工等级"] || ""
            },
            miner: {
              "矿机数量": userMiner?.["矿机数量"] || 0,
              "在运行": userMiner?.["在运行"] || 0,
              "日产量": userMiner?.["日产量"] || 0,
              "挖矿期限": userMiner?.["挖矿期限"] || "---",
              "锁仓数量": userMiner?.["锁仓数量"] || 0
            },
            history: (Array.isArray(txList) ? txList : []).reverse(),
            transfers: (Array.isArray(logList) ? logList : []).reverse(),
            requestTime: Date.now() - requestStart
          };
        })();

        inflightUsers.set(userCacheKey, queryPromise);
        try {
          const responseData = await queryPromise;

          // 新用户不缓存（下次连接可能已注册）
          if (!responseData.newUser) {
            // 用户缓存达到上限时先清理过期项
            if (cache.users.size >= MAX_CACHE_USERS) {
              for (const [key, val] of cache.users.entries()) {
                if (Date.now() - val.time > USER_CACHE_DURATION) cache.users.delete(key);
              }
            }
            cache.users.set(userCacheKey, { time: Date.now(), data: responseData });
          }

          // 定期清理过期缓存（每100次请求清理一次）
          if (Math.random() < 0.01) {
            cleanupCache();
          }

          console.log(`[GET] 查询完成，耗时: ${responseData.requestTime}ms`);
          return jsonResponse(responseData);
        } finally {
          inflightUsers.delete(userCacheKey);
        }
      }

      return jsonResponse({ status: "active", api_version: "2.1.0" });

    } catch (err) {
      console.error("Worker Error:", err.message);
      return jsonResponse({ success: false, error: err.message }, 500);
    }
  }
};

/**
 * 🔒 飞书鉴权
 */
async function getFeishuToken() {
  // 检查缓存是否有效
  if (cache.feishuToken.token && (Date.now() - cache.feishuToken.time) < TOKEN_CACHE_DURATION) {
    return cache.feishuToken.token;
  }
  
  const url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: FEISHU_CONFIG.app_id, app_secret: FEISHU_CONFIG.app_secret })
  });
  const data = await res.json();
  const token = data.app_access_token;

  // 仅在成功获取 token 时缓存，避免失败时缓存 undefined 导致级联故障（1小时）
  if (token) {
    cache.feishuToken = { token, time: Date.now() };
  } else {
    console.error('[getFeishuToken] 获取 token 失败:', data);
  }

  return token;
}

/**
 * 🔍 查询飞书（支持分页，获取所有记录）- 仅用于价格配置等小数据表
 */
async function queryTable(token, tableId) {
  let allItems = [];
  let hasMore = true;
  let pageToken = "";

  while (hasMore) {
    const baseUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableId}/records`;
    const url = pageToken
      ? `${baseUrl}?page_size=500&page_token=${pageToken}`
      : `${baseUrl}?page_size=500`;

    try {
      const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
      const data = await res.json();

      if (data.data?.items) {
        allItems = allItems.concat(data.data.items);
      }

      hasMore = data.data?.has_more || false;
      pageToken = data.data?.page_token || "";
    } catch (e) {
      console.error(`[queryTable] 获取表格 ${tableId} 数据失败:`, e);
      hasMore = false;
    }
  }

  return { items: allItems };
}

/**
 * 获取缓存的价格数据（用于缓存命中时快速返回）
 * token 参数保留以兼容调用方，价格数据全部走缓存
 */
async function getCachedPrices(token) {
  void token; // 暂未使用，保留参数以兼容调用方签名
  const now = Date.now();
  
  let allPrices = { "USDT": 1.0, "SOL": 0, "GRAM": 0, "BNB": 0 };
  let priceHistory = {};
  const tokenSymbols = ['NEO', 'NEX', 'NET', 'NEA', 'NRY', 'NCL'];
  tokenSymbols.forEach(sym => { priceHistory[sym] = []; });

  // OKX价格缓存
  if (cache.okxPrices.data && (now - cache.okxPrices.time) < CACHE_DURATION) {
    Object.assign(allPrices, cache.okxPrices.data);
  } else {
    const okxRes = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT').then(r => r.json()).catch(() => ({ data: [] }));
    if (okxRes?.data) {
      okxRes.data.forEach(t => {
        if (t.instId === "SOL-USDT") allPrices["SOL"] = parseFloat(t.last);
        if (t.instId === "TON-USDT") allPrices["GRAM"] = parseFloat(t.last);
        if (t.instId === "BNB-USDT") allPrices["BNB"] = parseFloat(t.last);
      });
      cache.okxPrices.data = { "SOL": allPrices["SOL"], "GRAM": allPrices["GRAM"], "BNB": allPrices["BNB"] };
      cache.okxPrices.time = now;
    }
  }

  // 价格配置缓存
  if (cache.prices.data && (now - cache.prices.time) < CACHE_DURATION) {
    Object.assign(allPrices, cache.prices.data.allPrices);
    priceHistory = cache.prices.data.priceHistory;
  }

  return { allPrices, priceHistory };
}

/**
 * 🧹 清理过期缓存
 */
function cleanupCache() {
  const now = Date.now();
  
  // 清理用户缓存
  for (const [key, value] of cache.users.entries()) {
    if (now - value.time > USER_CACHE_DURATION) {
      cache.users.delete(key);
    }
  }
  
  // 清理价格缓存
  if (cache.prices.data && (now - cache.prices.time) > CACHE_DURATION) {
    cache.prices.data = null;
    cache.prices.time = 0;
  }
  
  if (cache.okxPrices.data && (now - cache.okxPrices.time) > CACHE_DURATION) {
    cache.okxPrices.data = null;
    cache.okxPrices.time = 0;
  }

  // 清理签名缓存
  for (const [key, time] of cache.signatures.entries()) {
    if (now - time > SIGNATURE_CACHE_DURATION) {
      cache.signatures.delete(key);
    }
  }

  console.log(`[Cache] 清理完成，用户缓存: ${cache.users.size}，签名缓存: ${cache.signatures.size}`);
}

/**
 * �🚀 性能优化：使用飞书筛选API，只查询特定用户的数据
 * @param {string} token - 飞书访问令牌
 * @param {string} tableId - 表格ID
 * @param {string} address - 用户钱包地址
 * @returns {Object|Array} 用户数据（单条记录返回对象，多条记录返回数组）
 */
async function queryUserByAddress(token, tableId, address) {
  const baseUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableId}/records/search`;
  
  // 构建筛选条件：匹配用户地址字段 "用户"
  // 注意：POST 写入时使用 "用户" 字段名，此处与之保持一致
  // 重要：飞书 search API 的 value 必须是数组格式，传字符串会报 field validation failed
  const filterConditions = [
    { field_name: "用户", operator: "is", value: [address] },
    { field_name: "用户", operator: "is", value: [address.toLowerCase()] },
    { field_name: "用户", operator: "contains", value: [address] },
    { field_name: "用户", operator: "contains", value: [address.toLowerCase()] }
  ];

  try {
    // 支持分页：交易历史等表可能有多页记录
    let allItems = [];
    let hasMore = true;
    let pageToken = "";

    while (hasMore) {
      const body = {
        filter: { conjunction: "or", conditions: filterConditions },
        page_size: 500
      };
      if (pageToken) body.page_token = pageToken;

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      // 飞书 API 报错时 data.code 非 0，打印日志便于排查
      if (data.code && data.code !== 0) {
        console.error(`[queryUserByAddress] 表 ${tableId} 查询失败:`, data.code, data.msg);
        return null;
      }

      if (data.data?.items) {
        allItems = allItems.concat(data.data.items);
      }
      hasMore = data.data?.has_more || false;
      pageToken = data.data?.page_token || "";
    }

    if (allItems.length === 0) {
      console.log(`[queryUserByAddress] 表 ${tableId} 未找到用户 ${address}`);
      return null;
    }

    console.log(`[queryUserByAddress] 表 ${tableId} 找到 ${allItems.length} 条记录`);

    // 根据表格类型返回不同格式
    // 推荐关系、余额、团队、矿机表：返回单条记录的字段对象
    if (tableId === TABLE_IDS.recommend_rel ||
        tableId === TABLE_IDS.user_balance ||
        tableId === TABLE_IDS.user_team ||
        tableId === TABLE_IDS.user_miner) {

      const cleanFields = {};
      const fields = allItems[0].fields || {};
      Object.keys(fields).forEach(k => {
        cleanFields[k.replace(/^#/, '')] = fields[k];
      });
      return cleanFields;
    }

    // 交易历史、转账记录表：返回多条记录的字段数组
    if (tableId === TABLE_IDS.tx_history || tableId === TABLE_IDS.transfer_log) {
      return allItems.map(item => {
        const cleanFields = {};
        const fields = item.fields || {};
        Object.keys(fields).forEach(k => {
          cleanFields[k.replace(/^#/, '')] = fields[k];
        });
        return cleanFields;
      });
    }

    return null;
  } catch (e) {
    console.error(`[queryUserByAddress] 查询用户 ${address} 数据失败:`, e);
    return null;
  }
}

/**
 * ✍️ 写入飞书
 */
async function createRecord(token, tableId, fields) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableId}/records`;
  return fetch(url, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ fields })
  });
}

/**
 * 📅 日期字符串解析（处理飞书格式 DD/MM/YYYY）
 */
function parseDateStr(dateStr) {
  if (!dateStr) return new Date(0);
  // 支持 DD/MM/YYYY 格式
  const dmyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }
  // 支持 YYYY/MM/DD 格式（POST 写入的时间格式）
  const ymdMatch = dateStr.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

/**
 *  统一响应
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { 
    status, 
    headers: corsHeaders 
  });
}
