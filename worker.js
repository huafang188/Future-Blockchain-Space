/**
 * 🛠️ Future Space 后端 Worker - 性能优化版
 * 优化：使用飞书筛选API + 缓存机制 + 按需查询
 */

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
  users: new Map()
};
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const USER_CACHE_DURATION = 10 * 1000; // 10秒用户缓存

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
  "Content-Type": "application/json"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const feishuToken = await getFeishuToken();
      const url = new URL(request.url);
      const address = url.searchParams.get("address")?.trim();
      
      // ==========================================
      // 【POST 逻辑】强制字符串化，修复 ConvFail
      // ==========================================
      if (request.method === "POST") {
        const body = await request.json();
        const userAddr = String(body.address || "").trim();
        
        // 格式化时间为纯字符串
        const now = new Date();
        const timeStr = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

        if (!userAddr) return jsonResponse({ success: false, msg: "Address is required" }, 400);

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

        const feishuRes = await createRecord(feishuToken, targetTable, finalFields);
        const feishuData = await feishuRes.json();

        return jsonResponse({ 
          success: feishuData.code === 0, 
          msg: feishuData.msg, 
          feishu_res: feishuData 
        });
      }

      // ==========================================
      // 【GET 逻辑】优化版：全量查询 + 用户数据缓存
      // ==========================================
      if (address) {
        const requestStart = Date.now();
        
        // 1. 检查用户数据缓存（10秒内不重复查询）
        const cacheKey = `${address}_${Date.now()}`;
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

        // 3. 并行查询用户相关数据（全量查询，然后在前端过滤）
        const [relD, balD, teamD, minerD, txD, logD] = await Promise.all([
          queryTable(feishuToken, TABLE_IDS.recommend_rel),
          queryTable(feishuToken, TABLE_IDS.user_balance),
          queryTable(feishuToken, TABLE_IDS.user_team),
          queryTable(feishuToken, TABLE_IDS.user_miner),
          queryTable(feishuToken, TABLE_IDS.tx_history),
          queryTable(feishuToken, TABLE_IDS.transfer_log)
        ]);

        // 4. 在内存中查找用户数据（保持原有逻辑）
        const findFields = (data) => {
          if (!data?.items || data.items.length === 0) return null;
          
          const found = data.items.find(i => {
            const f = i.fields || {};
            const storedAddr = String(f["用户"] || f["#用户"] || "").trim();
            return storedAddr.toLowerCase() === address.toLowerCase() || storedAddr === address;
          });
          
          if (found) {
            const cleanFields = {};
            Object.keys(found.fields).forEach(k => {
              cleanFields[k.replace(/^#/, '')] = found.fields[k];
            });
            return cleanFields;
          }
          return null;
        };

        const userInfo = findFields(relD);
        
        // 5. 新用户处理
        if (!userInfo || Object.keys(userInfo).length === 0) {
          return jsonResponse({ 
            newUser: true, 
            address, 
            allPrices, 
            priceHistory,
            requestTime: Date.now() - requestStart
          });
        }

        const userBalances = findFields(balD) || {};
        const userTeam = findFields(teamD) || {};
        const userMiner = findFields(minerD) || {};

        // 6. 整理返回对象
        const responseData = {
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
          balances: userBalances,
          team: {
            "直推人数": Number(userTeam["直推人数"] || 0),
            "直推业绩": Number(userTeam["直推业绩"] || 0),
            "团队人数": Number(userTeam["团队人数"] || 0),
            "团队业绩": Number(userTeam["团队业绩"] || 0),
            "累计奖励": Number(userTeam["累计奖励"] || 0),
            "矿工等级": userTeam["矿工等级"] || ""
          },
          miner: {
            "矿机数量": userMiner["矿机数量"] || 0,
            "在运行": userMiner["在运行"] || 0,
            "日产量": userMiner["日产量"] || 0,
            "挖矿期限": userMiner["挖矿期限"] || "---",
            "锁仓数量": userMiner["锁仓数量"] || 0
          },
          history: (txD?.items || [])
            .filter(i => {
              const storedAddr = String(i.fields["用户"] || "").trim();
              return storedAddr.toLowerCase() === address.toLowerCase() || storedAddr === address;
            })
            .map(i => i.fields)
            .reverse(),
          transfers: (logD?.items || [])
            .filter(i => {
              const storedAddr = String(i.fields["用户"] || "").trim();
              return storedAddr.toLowerCase() === address.toLowerCase() || storedAddr === address;
            })
            .map(i => i.fields)
            .reverse(),
          requestTime: Date.now() - requestStart
        };

        // 7. 缓存用户数据（10秒）
        cache.users.set(userCacheKey, {
          time: Date.now(),
          data: responseData
        });

        // 8. 定期清理过期缓存（每100次请求清理一次）
        if (Math.random() < 0.01) {
          cleanupCache();
        }

        console.log(`[GET] 查询完成，耗时: ${responseData.requestTime}ms`);
        return jsonResponse(responseData);
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
  const url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: FEISHU_CONFIG.app_id, app_secret: FEISHU_CONFIG.app_secret })
  });
  const data = await res.json();
  return data.app_access_token;
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
 * � 获取缓存的价格数据（用于缓存命中时快速返回）
 */
async function getCachedPrices(token) {
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
  
  console.log(`[Cache] 清理完成，当前用户缓存: ${cache.users.size}`);
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
  
  // 构建筛选条件：匹配用户地址字段
  // 尝试多种可能的字段名和格式
  const filterConditions = [
    // 精确匹配（大写）
    { field_name: "用户", operator: "is", value: address },
    // 精确匹配（小写）
    { field_name: "用户", operator: "is", value: address.toLowerCase() },
    // 包含匹配
    { field_name: "用户", operator: "contains", value: address },
    { field_name: "用户", operator: "contains", value: address.toLowerCase() }
  ];

  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filter: {
          conjunction: "or",
          conditions: filterConditions
        },
        page_size: 100
      })
    });

    const data = await res.json();

    if (!data.data?.items || data.data.items.length === 0) {
      console.log(`[queryUserByAddress] 表 ${tableId} 未找到用户 ${address}`);
      return null;
    }

    console.log(`[queryUserByAddress] 表 ${tableId} 找到 ${data.data.items.length} 条记录`);

    // 根据表格类型返回不同格式
    // 推荐关系、余额、团队、矿机表：返回单条记录的字段对象
    if (tableId === TABLE_IDS.recommend_rel || 
        tableId === TABLE_IDS.user_balance || 
        tableId === TABLE_IDS.user_team || 
        tableId === TABLE_IDS.user_miner) {
      
      const cleanFields = {};
      const fields = data.data.items[0].fields || {};
      Object.keys(fields).forEach(k => {
        cleanFields[k.replace(/^#/, '')] = fields[k];
      });
      return cleanFields;
    }
    
    // 交易历史、转账记录表：返回多条记录的字段数组
    if (tableId === TABLE_IDS.tx_history || tableId === TABLE_IDS.transfer_log) {
      return data.data.items.map(item => {
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
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
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
