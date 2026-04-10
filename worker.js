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
  price_config: 'tblgxb6xZZBW67Ws',
  user_stake: 'tbljgq6NxJXT3CK1',
  user_liquidity: 'tblVnzvYCkDz9vp8',
  total_liquidity: 'tblTMAZy81uIe0Th'
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
        // D. 质押
        else if (body.action === "stake") {
          targetTable = TABLE_IDS.tx_history;
          rawFields = {
            "用户": userAddr,
            "交易类型": "质押",
            "交易代币": body.symbol || "",
            "交易数量": body.amount || "0",
            "交易状态": "已提交",
            "交易时间": timeStr,
            "备注": `周期${body.period || ""}天`
          };
        }
        // E. 增加流动性
        else if (body.action === "add_liquidity") {
          targetTable = TABLE_IDS.tx_history;
          rawFields = {
            "用户": userAddr,
            "交易类型": "增加流动性",
            "交易代币": body.lpPair || "",
            "交易数量": body.amount || "0",
            "交易状态": "已提交",
            "交易时间": timeStr,
            "备注": body.signature ? "已签名确认" : ""
          };
        }
        // F. 提取流动性
        else if (body.action === "remove_liquidity") {
          targetTable = TABLE_IDS.tx_history;
          rawFields = {
            "用户": userAddr,
            "交易类型": "提取流动性",
            "交易代币": body.lpPair || "",
            "交易数量": body.amount || "0",
            "交易状态": "已提交",
            "交易时间": timeStr,
            "备注": body.signature ? "已签名确认" : ""
          };
        }
        // G. 通用交易 (充值、提现、兑换)
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
            // 1. 如果是 null/undefined 变空字符串
            // 2. 如果是数字 变字符串
            // 3. 确保没有任何 Object 传进去
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
        const [relD, balD, teamD, minerD, txD, logD, priceD, okxRes, stakeD, userLiqD, totalLiqD] = await Promise.all([
          queryTable(feishuToken, TABLE_IDS.recommend_rel),
          queryTable(feishuToken, TABLE_IDS.user_balance),
          queryTable(feishuToken, TABLE_IDS.user_team),
          queryTable(feishuToken, TABLE_IDS.user_miner),
          queryTable(feishuToken, TABLE_IDS.tx_history),
          queryTable(feishuToken, TABLE_IDS.transfer_log),
          queryTable(feishuToken, TABLE_IDS.price_config),
          fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT').then(r => r.json()).catch(() => ({ data: [] })),
          queryTable(feishuToken, TABLE_IDS.user_stake),
          queryTable(feishuToken, TABLE_IDS.user_liquidity),
          queryTable(feishuToken, TABLE_IDS.total_liquidity)
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
        
        // 1.2 处理 飞书自定义价格 (覆盖或新增 NEO/NET/NEA 等)
        if (priceD?.items) {
          priceD.items.forEach(i => {
            const f = i.fields;
            const sym = String(f["token"] || f["Token"] || f["代币"] || "").toUpperCase().trim();
            const val = parseFloat(f["price"] || f["Price"] || f["价格"]);
            
            if (sym && !isNaN(val)) {
                allPrices[sym] = val;
            }
          });
        }

        // 2. 匹配用户信息
        const findFields = (data) => data?.items?.find(i => {
          const u = String(i.fields["用户"] || i.fields["address"] || "").toLowerCase().trim();
          return u === address;
        })?.fields;

        const userInfo = findFields(relD);

        // 新用户处理
        if (!userInfo) {
          return jsonResponse({ newUser: true, address, allPrices });
        }

        const userBalances = findFields(balD) || {};
        const userTeam = findFields(teamD) || {};
        const userMiner = findFields(minerD) || {};
        const userStake = findFields(stakeD) || {};
        const userLiquidity = findFields(userLiqD) || {};

        // 总流动性取第一条记录（全局共享）
        const totalLiquidity = totalLiqD?.items?.[0]?.fields || {};

        // 3. 整理返回对象 (严格对齐前端 ID)
        return jsonResponse({
          newUser: false,
          address,
          allPrices,
          info: {
            "推荐码": userInfo["推荐码"] || "---",
            "推荐人": userInfo["推荐人"] || "无",
            "注册时间": userInfo["注册时间"] || "---"
          },
          balances: userBalances,
          team: {
            "直推人数": Number(userTeam["直推人数"] || 0),
            "直推业绩": Number(userTeam["直推业绩"] || 0),
            "团队人数": Number(userTeam["团队人数"] || 0),
            "团队业绩": Number(userTeam["团队业绩"] || 0),
            "累计奖励": Number(userTeam["累计奖励"] || 0)
          },
          miner: {
            "矿机数量": userMiner["矿机数量"] || 0,
            "日产量": userMiner["日产量"] || 0,
            "挖矿期限": userMiner["挖矿期限"] || "---", // 严格对齐你截图中的列名
            "锁仓数量": userMiner["锁仓数量"] || 0    // 严格对齐你截图中的列名
          },
          history: (txD?.items || [])
            .filter(i => String(i.fields["用户"] || "").toLowerCase().trim() === address)
            .map(i => i.fields)
            .reverse(),
          transfers: (logD?.items || [])
            .filter(i => String(i.fields["用户"] || "").toLowerCase().trim() === address)
            .map(i => i.fields)
            .reverse(),
          stake: {
            "NEO": userStake["NEO"] || "0",
            "NEO剩余天数": userStake["NEO剩余天数"] || "0",
            "NEX": userStake["NEX"] || "0",
            "NEX剩余天数": userStake["NEX剩余天数"] || "0",
            "NET": userStake["NET"] || "0",
            "NET剩余天数": userStake["NET剩余天数"] || "0",
            "NEA": userStake["NEA"] || "0",
            "NEA剩余天数": userStake["NEA剩余天数"] || "0",
            "NRY": userStake["NRY"] || "0",
            "NRY剩余天数": userStake["NRY剩余天数"] || "0",
            "NCL": userStake["NCL"] || "0",
            "NCL剩余天数": userStake["NCL剩余天数"] || "0"
          },
          liquidity: {
            "LP-NEO/USDT": userLiquidity["LP-NEO/USDT"] || "0",
            "LP-NEX/USDT": userLiquidity["LP-NEX/USDT"] || "0",
            "LP-NET/USDT": userLiquidity["LP-NET/USDT"] || "0",
            "LP-NEA/USDT": userLiquidity["LP-NEA/USDT"] || "0",
            "LP-NRY/USDT": userLiquidity["LP-NRY/USDT"] || "0",
            "LP-NCL/USDT": userLiquidity["LP-NCL/USDT"] || "0"
          },
          totalLiquidity: {
            "NEO/USDT": totalLiquidity["NEO/USDT"] || "0",
            "NEX/USDT": totalLiquidity["NEX/USDT"] || "0",
            "NET/USDT": totalLiquidity["NET/USDT"] || "0",
            "NEA/USDT": totalLiquidity["NEA/USDT"] || "0",
            "NRY/USDT": totalLiquidity["NRY/USDT"] || "0",
            "NCL/USDT": totalLiquidity["NCL/USDT"] || "0"
          }
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
 * 🔍 查询飞书
 */
async function queryTable(token, tableId) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.app_token}/tables/${tableId}/records?page_size=500`;
  try {
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await res.json();
    return data.data || { items: [] };
  } catch (e) {
    return { items: [] };
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
 * 📦 统一响应
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { 
    status, 
    headers: corsHeaders 
  });
}