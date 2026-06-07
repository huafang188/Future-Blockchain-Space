/**
 * 🛠️ Future Space 后端 Worker - 终极修复版
 * 修复：价格逻辑优化、矿机字段对齐、提交逻辑加固
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
      const address = url.searchParams.get("address")?.toLowerCase().trim();
      
      // ==========================================
      // 【POST 逻辑】强制字符串化，修复 ConvFail
      // ==========================================
      if (request.method === "POST") {
        const body = await request.json();
        const userAddr = String(body.address || "").toLowerCase().trim();
        
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
      // 【GET 逻辑】全量读取（修复价格配置与矿机字段）
      // ==========================================
      if (address) {
        // 并行拉取所有数据
        const [relD, balD, teamD, minerD, txD, logD, priceD, okxRes] = await Promise.all([
          queryTable(feishuToken, TABLE_IDS.recommend_rel),
          queryTable(feishuToken, TABLE_IDS.user_balance),
          queryTable(feishuToken, TABLE_IDS.user_team),
          queryTable(feishuToken, TABLE_IDS.user_miner),
          queryTable(feishuToken, TABLE_IDS.tx_history),
          queryTable(feishuToken, TABLE_IDS.transfer_log),
          queryTable(feishuToken, TABLE_IDS.price_config),
          fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT').then(r => r.json()).catch(() => ({ data: [] }))
        ]);

        // 1. 价格整合
        const allPrices = { "USDT": 1.0, "BTC": 0, "ETH": 0, "BNB": 0 };
        
        // 1.1 处理 OKX 实时价格 (BTC/ETH/BNB)
        if (okxRes?.data) {
          okxRes.data.forEach(t => {
            if (t.instId === "BTC-USDT") allPrices["BTC"] = parseFloat(t.last);
            if (t.instId === "ETH-USDT") allPrices["ETH"] = parseFloat(t.last);
            if (t.instId === "BNB-USDT") allPrices["BNB"] = parseFloat(t.last);
          });
        }
        
        // 1.2 处理飞书自定义价格 - 修复：先提取所有价格，再处理历史数据
        const priceHistory = {};
        const tokenSymbols = ['NEO', 'NEX', 'NET', 'NEA', 'NRY', 'NCL'];
        tokenSymbols.forEach(sym => {
            priceHistory[sym] = [];
        });

        if (priceD?.items) {
          priceD.items.forEach(i => {
            const f = i.fields;
            const sym = String(f["token"] || f["Token"] || f["代币"] || "").toUpperCase().trim();
            const val = parseFloat(f["price"] || f["Price"] || f["价格"]);
            const executeTime = f["execute_time"] || f["执行时间"] || f["时间"];
            
            // 【修复】先提取价格到 allPrices（无论是否有时间）
            if (sym && !isNaN(val)) {
                allPrices[sym] = val;
            }
            
            // 然后提取历史价格记录（需要包含时间字段）
            if (sym && val && executeTime && priceHistory[sym]) {
                priceHistory[sym].push({
                    token: sym,
                    price: String(val),
                    execute_time: String(executeTime)
                });
            }
          });
        }

        // 1.3 从历史数据中提取最新价格（确保资产概览展示最新日期的价格）
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

        // 2. 匹配用户信息
        const findFields = (data, tableName) => {
          if (!data?.items || data.items.length === 0) {
            return null;
          }
          
          const found = data.items.find(i => {
            const f = i.fields || {};
            // 尝试匹配多种地址字段名
            const u = String(f["用户"] || f["#用户"] || f["address"] || f["#address"] || f["Address"] || f["#Address"] || "").toLowerCase().trim();
            return u === address;
          });
          
          if (found) {
            // 返回清理掉 # 前缀的字段对象，方便后续使用
            const cleanFields = {};
            Object.keys(found.fields).forEach(k => {
              cleanFields[k.replace(/^#/, '')] = found.fields[k];
            });
            return cleanFields;
          } else {
            return null;
          }
        };

        const userInfo = findFields(relD, "推荐关系表");
        
        // 新用户处理
        if (!userInfo || Object.keys(userInfo).length === 0) {
          return jsonResponse({ 
            newUser: true, 
            address, 
            allPrices, 
            priceHistory
          });
        }

        const userBalances = findFields(balD, "用户余额表") || {};
        const userTeam = findFields(teamD, "用户团队表") || {};
        const userMiner = findFields(minerD, "用户矿机表") || {};

        // 3. 整理返回对象 (严格对齐前端 ID)
        return jsonResponse({
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
            .filter(i => String(i.fields["用户"] || "").toLowerCase().trim() === address)
            .map(i => i.fields)
            .reverse(),
          transfers: (logD?.items || [])
            .filter(i => String(i.fields["用户"] || "").toLowerCase().trim() === address)
            .map(i => i.fields)
            .reverse()
        });
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
 * 🔍 查询飞书（支持分页，获取所有记录）
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
 * 🔍 根据地址查找用户数据
 * @param {Object} tableData - 表格数据
 * @param {string} address - 用户钱包地址
 * @returns {Object} 用户字段数据
 */
function findFields(tableData, address) {
  if (!tableData?.items || !address) return {};
  
  const searchAddr = address.toLowerCase().trim();
  
  // 遍历所有记录，查找匹配的用户
  for (const item of tableData.items) {
    const fields = item.fields || {};
    
    // 尝试匹配各种可能的用户地址字段名
    const possibleFields = [
      fields["用户"],
      fields["地址"],
      fields["钱包地址"],
      fields["user"],
      fields["address"],
      fields["User"],
      fields["Address"],
      fields["钱包"],
      fields["ETH地址"],
      fields["BSC地址"],
      fields["账户地址"],
      fields["合约地址"],
      fields["账号"],
      fields["account"],
      fields["Account"],
      fields["addr"],
      fields["Addr"]
    ];
    
    for (const fieldValue of possibleFields) {
      if (fieldValue) {
        const fieldAddr = String(fieldValue).toLowerCase().trim();
        // 支持完整地址匹配和部分匹配（最后40位）
        if (fieldAddr === searchAddr || 
            fieldAddr.endsWith(searchAddr.slice(-40)) ||
            searchAddr.endsWith(fieldAddr.slice(-40))) {
          return fields;
        }
      }
    }
  }
  
  return {};
}

/**
 * 📦 统一响应
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { 
    status, 
    headers: corsHeaders 
  });
}
