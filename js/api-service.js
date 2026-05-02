import { API_BASE, getTeamByInviter, findTopLevelInviter, getTeamInfoByCode, buildInviterChain, FEISHU_FIELD_MAP } from './config.js';

// 用于管理请求取消，彻底解决并发请求导致的 "Failed to fetch" 报错
let fetchController = null;

// CSRF token 管理
let csrfToken = null;

/**
 * 生成或获取 CSRF token
 */
function getCsrfToken() {
    if (!csrfToken) {
        csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        // 存储到 localStorage
        localStorage.setItem('fbs_csrf_token', csrfToken);
    }
    return csrfToken;
}

/**
 * 辅助函数：统一处理API错误
 */
function handleApiError(message) {
    if (window.showModal) {
        window.showModal("错误", `<div class="p-4 text-center">${message}</div>`);
    } else {
        alert(message);
    }
}

/**
 * 1. 提交交易/申请记录到后端 (POST)
 * 涵盖：充值、提现、兑换、绑定推荐人、矿机/内部转账
 */
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction", extraFields = {}) {
    const address = localStorage.getItem('fbs_address');
    
    if (!address) {
        alert("请先连接钱包");
        return { success: false };
    }

    const payload = {
        action: action,        
        address: address.toLowerCase().trim(),      
        type: type,            
        amount: String(amount),
        symbol: symbol,        
        ...extraFields
    };

    console.log(`[API] 发起 POST 请求 [${action}]:`, payload);

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        // 飞书 code 为 0 或 result.success 为 true 均代表写入成功
        if (result.success || result.code === 0) {
            console.log(`[API] ${type} 后端写入成功`);
            
            // 成功后执行局部数据同步（不刷新页面）
            await fetchUserData(address); 
            
            // 成功后关闭所有可能存在的弹窗
            if (window.closeModal) window.closeModal();
            
            return { success: true, data: result };
        } else {
            handleApiError(`提交失败: ${result.msg || "服务器繁忙"}`);
            return { success: false };
        }
    } catch (e) {
        // 捕获因刷新页面导致的连接中断
        if (e.message === 'Failed to fetch') return { success: false };
        console.error("[API] POST 请求异常:", e);
        handleApiError(`请求异常: ${e.message}`);
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取用户完整数据并同步渲染 UI (GET)
 * 包含资产余额、实时单价、团队业绩、矿机运行状态
 */
export async function fetchUserData(address) {
    if (!address) return;

    // 终止上一次未完成的请求，防止数据混乱和 Failed to fetch 报错
    if (fetchController) fetchController.abort();
    fetchController = new AbortController();
    const { signal } = fetchController;
    
    try {
        console.log(`[API] 正在从后端同步数据: ${address}`);
        const cleanAddr = address.toLowerCase().trim();
        
        const res = await fetch(`${API_BASE}?address=${cleanAddr}&t=${Date.now()}`, { signal });
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const data = await res.json();
        console.log("[API] 后端原始数据包:", data);

        // --- 核心逻辑：新用户初始化，取消自动弹窗 ---
        if (data.newUser) {
            console.log("[API] 该地址为新用户，待手动绑定");
            updateText('info_inviteCode', '---');
            updateText('info_inviter', '---');
            // 此处清空资产显示，防止显示上一个钱包的数据
            if (window.renderTokenList) window.renderTokenList({});
            return;
        }

        // --- 核心逻辑：单价 Key 标准化 ---
        if (data.allPrices) {
            const normalizedPrices = {};
            Object.keys(data.allPrices).forEach(key => {
                normalizedPrices[key.toUpperCase()] = parseFloat(data.allPrices[key]);
            });
            window.currentPrices = normalizedPrices; 
        }

        // --- 历史价格数据 ---
        if (data.priceHistory) {
            window.priceHistory = data.priceHistory;
        }

        // 将用户资产存入全局供 calculations.js 使用
        window.userBalances = data.balances || {};

        // --- 团队识别与推荐链处理（适配飞书表格结构）---
        const userInfo = {
            inviteCode: data.info?.["推荐码"],
            inviter: data.info?.["推荐人"],
            inviterChain: [],
            team: null,
            topInviter: null
        };
        
        // 1. 如果后端已经返回了团队信息，直接使用
        if (data.info?.["团队"]) {
            userInfo.team = data.info["团队"];
        }
        
        // 2. 构建推荐链
        // 优先使用后端直接返回的推荐链
        if (data.info?.["推荐链"] && data.info["推荐链"].length > 0) {
            userInfo.inviterChain = data.info["推荐链"];
        }
        // 如果后端返回了推荐关系列表，前端构建推荐链
        else if (data.inviterList && data.inviterList.length > 0 && userInfo.inviteCode) {
            userInfo.inviterChain = buildInviterChain(data.inviterList, userInfo.inviteCode);
            console.log(`[Team] 前端构建推荐链:`, userInfo.inviterChain);
        }
        
        // 3. 根据推荐链找到最高层级推荐人并确定团队
        if (userInfo.inviterChain.length > 0) {
            const topResult = findTopLevelInviter(userInfo.inviterChain);
            userInfo.topInviter = topResult.inviter;
            if (!userInfo.team) {
                userInfo.team = topResult.team;
            }
        }
        // 4. 如果只有直接推荐人，根据推荐人确定团队
        else if (userInfo.inviter && !userInfo.team) {
            userInfo.team = getTeamByInviter(userInfo.inviter);
            userInfo.topInviter = userInfo.inviter;
        }
        
        // 保存到全局状态
        window.currentUserInfo = userInfo;
        console.log(`[Team] 用户团队识别结果: ${userInfo.team} (最高层级推荐人: ${userInfo.topInviter || '无'})`);

        // C. 渲染资料信息
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // D. 渲染团队数据（适配飞书表格结构）
        const userInviteCode = data.info?.["推荐码"];
        let teamData = {
            directCount: 0,
            directSales: 0,
            totalCount: 0,
            totalSales: 0,
            totalReward: 0
        };
        
        // 1. 优先使用后端直接返回的团队数据
        if (data.team) {
            teamData = {
                directCount: data.team["直推人数"] || data.team[FEISHU_FIELD_MAP.userTeam.directCount] || 0,
                directSales: data.team["直推业绩"] || data.team[FEISHU_FIELD_MAP.userTeam.directSales] || 0,
                totalCount: data.team["团队人数"] || data.team[FEISHU_FIELD_MAP.userTeam.totalCount] || 0,
                totalSales: data.team["团队业绩"] || data.team[FEISHU_FIELD_MAP.userTeam.totalSales] || 0,
                totalReward: data.team["累计奖励"] || data.team[FEISHU_FIELD_MAP.userTeam.totalReward] || 0
            };
        }
        // 2. 如果后端返回了团队列表数据，根据推荐码查找
        else if (data.teamList && data.teamList.length > 0 && userInviteCode) {
            teamData = getTeamInfoByCode(data.teamList, userInviteCode);
            console.log(`[Team] 从团队列表中找到数据:`, teamData);
        }
        
        // 渲染团队数据
        updateText('team_directCount', teamData.directCount);
        updateText('team_directSales', teamData.directSales.toFixed(2));
        updateText('team_totalCount', teamData.totalCount);
        updateText('team_totalSales', teamData.totalSales.toFixed(2));
        updateText('team_totalReward', teamData.totalReward.toFixed(2));

        // E. 渲染矿机数据 (严格匹配飞书文字列名)
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_running', data.miner["在运行"]);
            updateText('miner_daily', data.miner["日产量"]);
            updateText('miner_deadline', data.miner["挖矿期限"]); 
            updateText('miner_locked', data.miner["锁仓数量"]);
        }

        // F. 渲染工厂模块 - 质押数据（#是数字类型标识，不是字段名的一部分）
        const stakeTokens = ['NEO', 'NEX', 'NET', 'NEA', 'NRY', 'NCL'];
        stakeTokens.forEach(token => {
            const amtEl = document.getElementById(`stake_${token}`);
            const dayEl = document.getElementById(`stake_${token}_days`);
            if (amtEl && data.stake) {
                // 优先尝试不带#的字段名（#是数字类型标识）
                const possibleKeys = [
                    token,
                    `${token}质押数量`,
                    `${token}质押`,
                    `${token}数量`,
                    // 兼容可能的#前缀情况
                    `# ${token}`,
                    `# ${token}质押数量`,
                    `# ${token}质押`,
                    `# ${token}数量`
                ];
                let value = 0;
                for (const key of possibleKeys) {
                    if (data.stake[key] !== undefined && data.stake[key] !== null && data.stake[key] !== '') {
                        value = data.stake[key];
                        break;
                    }
                }
                amtEl.innerText = parseFloat(value).toFixed(2);
            }
            if (dayEl && data.stake) {
                const possibleKeys = [
                    `${token}剩余天数`,
                    `${token}天数`,
                    `${token}days`,
                    `${token}deadline`,
                    `${token}到期天数`,
                    // 兼容可能的#前缀情况
                    `# ${token}剩余天数`,
                    `# ${token}天数`
                ];
                let value = 0;
                for (const key of possibleKeys) {
                    if (data.stake[key] !== undefined && data.stake[key] !== null && data.stake[key] !== '') {
                        value = data.stake[key];
                        break;
                    }
                }
                dayEl.innerText = value;
            }
        });

        // G. 渲染工厂模块 - 用户流动性数据（#是数字类型标识，不是字段名的一部分）
        const lpPairs = [
            { key: 'LP-NEO/USDT', id: 'liq_NEOUSDT' },
            { key: 'LP-NEX/USDT', id: 'liq_NEXUSDT' },
            { key: 'LP-NET/USDT', id: 'liq_NETUSDT' },
            { key: 'LP-NEA/USDT', id: 'liq_NEAUSDT' },
            { key: 'LP-NRY/USDT', id: 'liq_NRYUSDT' },
            { key: 'LP-NCL/USDT', id: 'liq_NCLUSDT' }
        ];
        lpPairs.forEach(pair => {
            const el = document.getElementById(pair.id);
            if (el && data.liquidity) {
                // #是数字类型标识，优先尝试不带#的字段名
                const baseKey = pair.key.split('/')[0].split('-')[1]; // 获取 NEO, NEX 等
                const possibleKeys = [
                    pair.key,                          // LP-NEO/USDT
                    pair.key.replace('/', ''),         // LP-NEOUSDT
                    pair.key.replace('-', '—'),        // LP—NEO/USDT（中文破折号）
                    pair.key.replace('-', '—').replace('/', ''), // LP—NEOUSDT
                    `LP${baseKey}USDT`,                // LPNEOUSDT
                    `LP—${baseKey}USDT`,               // LP—NEOUSDT（中文破折号）
                    pair.id,                           // liq_NEOUSDT
                    // 兼容可能的#前缀情况
                    `# ${pair.key}`,
                    `# ${pair.key.replace('/', '')}`,
                    `# ${pair.key.replace('-', '—')}`,
                    `# ${pair.key.replace('-', '—').replace('/', '')}`,
                    `# LP${baseKey}USDT`,
                    `# LP—${baseKey}USDT`,
                    `# ${pair.id}`
                ];
                let value = 0;
                for (const key of possibleKeys) {
                    if (data.liquidity[key] !== undefined && data.liquidity[key] !== null && data.liquidity[key] !== '') {
                        value = data.liquidity[key];
                        break;
                    }
                }
                el.innerText = parseFloat(value).toFixed(2);
            }
        });

        // H. 渲染工厂模块 - 总流动性池数据（#是数字类型标识，不是字段名的一部分）
        const totalPairs = [
            { key: 'NEO/USDT', id: 'totalLiq_NEOUSDT' },
            { key: 'NEX/USDT', id: 'totalLiq_NEXUSDT' },
            { key: 'NET/USDT', id: 'totalLiq_NETUSDT' },
            { key: 'NEA/USDT', id: 'totalLiq_NEAUSDT' },
            { key: 'NRY/USDT', id: 'totalLiq_NRYUSDT' },
            { key: 'NCL/USDT', id: 'totalLiq_NCLUSDT' }
        ];
        totalPairs.forEach(pair => {
            const el = document.getElementById(pair.id);
            if (el && data.totalLiquidity) {
                // #是数字类型标识，优先尝试不带#的字段名
                const baseKey = pair.key.split('/')[0]; // 获取 NEO, NEX 等
                const possibleKeys = [
                    pair.key,                          // NEO/USDT
                    pair.key.replace('/', ''),         // NEOUSDT
                    `${baseKey}USDT`,                  // NEOUSDT
                    `${baseKey}/USDT流动性`,           // NEO/USDT流动性
                    `总${baseKey}USDT`,                // 总NEOUSDT
                    pair.id,                           // totalLiq_NEOUSDT
                    // 兼容可能的#前缀情况
                    `# ${pair.key}`,
                    `# ${pair.key.replace('/', '')}`,
                    `# ${baseKey}USDT`,
                    `# ${baseKey}/USDT流动性`,
                    `# 总${baseKey}USDT`,
                    `# ${pair.id}`
                ];
                let value = 0;
                for (const key of possibleKeys) {
                    if (data.totalLiquidity[key] !== undefined && data.totalLiquidity[key] !== null && data.totalLiquidity[key] !== '') {
                        value = data.totalLiquidity[key];
                        break;
                    }
                }
                el.innerText = parseFloat(value).toFixed(2);
            }
        });

        // F. 执行各 UI 模块的渲染函数
        if (window.renderTokenList) window.renderTokenList(data.balances || {});
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);
        if (window.renderPriceCharts) window.renderPriceCharts();

    } catch (e) {
        if (e.name === 'AbortError' || e.message === 'Failed to fetch') {
            console.warn("[API] 请求被中止或页面重载");
        } else {
            console.error("[API] 同步用户数据失败:", e);
        }
    }
}

/**
 * 3. 绑定推荐人业务逻辑
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    
    // 生成临时随机码
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const res = await postTransactionRecord(
        "绑定关系", 
        "0", 
        "INFO", 
        "bind_inviter", 
        { inviterId: inviterId, myInviteCode: myCode }
    );
    
    if (res.success) {
        alert("✅ 推荐人绑定成功");
    }
}

/**
 * 4. 统一文本更新工具
 * 自动识别数值字段并进行千分位格式化 (Apple 风格)
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return; // 容错：如果 ID 不在当前页面，直接跳过不报错
    
    // 定义数值类型的 ID 特征
    const isNumberField = id.includes('Sales') || id.includes('Reward') || id.includes('totalValue') || 
                          id.includes('bal_') || id.includes('val_') || id.includes('price_') || 
                          id.includes('locked') || id.includes('daily') || id.includes('Count');
    
    // 处理空值
    if (value === undefined || value === null || value === "" || value === "NaN") {
        el.innerText = isNumberField ? "0.00" : "--";
        return;
    }

    // 处理数值格式化
    if (isNumberField && !isNaN(value)) {
        let num = parseFloat(value);
        // 单价展示 4 位，其余金额/数量展示 2 位
        let decimals = id.includes('price_') ? 4 : 2;
        el.innerText = num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    } else {
        // 纯文本展示
        el.innerText = value;
    }
}

// 暴露到全局，确保 HTML 按钮、导航和其它模块能调用
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
