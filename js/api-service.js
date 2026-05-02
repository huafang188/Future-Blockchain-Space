import { API_BASE, getTeamByInviter, findTopLevelInviter } from './config.js';

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
            
            // 即使是新用户，也要尝试渲染质押和流动性数据（总流动性是全局数据）
            renderFactoryData(data);
            
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

        // 渲染工厂模块数据（质押、流动性）
        renderFactoryData(data);

        // --- 历史价格数据 ---
        if (data.priceHistory) {
            window.priceHistory = data.priceHistory;
        }

        // 将用户资产存入全局供 calculations.js 使用
        window.userBalances = data.balances || {};

        // --- 团队识别与推荐链处理 ---
        const userInfo = {
            inviteCode: data.info?.["推荐码"],
            inviter: data.info?.["推荐人"],
            inviterChain: data.info?.["推荐链"] || [],
            team: null,
            topInviter: null
        };
        
        // 1. 优先使用后端返回的团队信息（来自推荐关系列表中的"团队"列）
        if (data.info?.["团队"]) {
            userInfo.team = data.info["团队"];
        }
        // 2. 如果有推荐链，找到最高层级的推荐码并确定团队
        else if (userInfo.inviterChain && userInfo.inviterChain.length > 0) {
            const topResult = findTopLevelInviter(userInfo.inviterChain);
            userInfo.topInviter = topResult.inviter;
            userInfo.team = topResult.team;
        }
        // 3. 如果只有直接推荐人，根据推荐人确定团队
        else if (userInfo.inviter) {
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

        // D. 渲染团队数据（从后端获取）
        let teamData = {
            directCount: 0,
            directSales: 0,
            totalCount: 0,
            totalSales: 0,
            totalReward: 0
        };
        
        // 直接使用后端返回的团队数据
        if (data.team) {
            teamData = {
                directCount: data.team["直推人数"] || 0,
                directSales: data.team["直推业绩"] || 0,
                totalCount: data.team["团队人数"] || 0,
                totalSales: data.team["团队业绩"] || 0,
                totalReward: data.team["累计奖励"] || 0
            };
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

/**
 * 渲染工厂模块数据（质押、流动性、总流动性）
 * @param {Object} data - 后端返回的数据
 */
function renderFactoryData(data) {
    console.log("[Factory] 渲染工厂模块数据:", data);
    
    // 1. 渲染质押数据
    const stakeTokens = ['NEO', 'NEX', 'NET', 'NEA', 'NRY', 'NCL'];
    stakeTokens.forEach(token => {
        const amtEl = document.getElementById(`stake_${token}`);
        const dayEl = document.getElementById(`stake_${token}_days`);
        
        if (amtEl && data.stake) {
            const value = data.stake[token] || data.stake[`# ${token}`] || 0;
            amtEl.innerText = parseFloat(value).toFixed(2);
        }
        if (dayEl && data.stake) {
            const value = data.stake[`${token}剩余天数`] || data.stake[`# ${token}剩余天数`] || 0;
            dayEl.innerText = value;
        }
    });

    // 2. 渲染用户流动性数据
    const lpPairs = [
        { base: 'NEO', id: 'liq_NEOUSDT' },
        { base: 'NEX', id: 'liq_NEXUSDT' },
        { base: 'NET', id: 'liq_NETUSDT' },
        { base: 'NEA', id: 'liq_NEAUSDT' },
        { base: 'NRY', id: 'liq_NRYUSDT' },
        { base: 'NCL', id: 'liq_NCLUSDT' }
    ];
    lpPairs.forEach(({ base, id }) => {
        const el = document.getElementById(id);
        if (el && data.liquidity) {
            const key = `LP-${base}/USDT`;
            const value = data.liquidity[key] || 0;
            el.innerText = parseFloat(value).toFixed(2);
        }
    });

    // 3. 渲染总流动性数据
    const totalPairs = [
        { base: 'NEO', id: 'totalLiq_NEOUSDT' },
        { base: 'NEX', id: 'totalLiq_NEXUSDT' },
        { base: 'NET', id: 'totalLiq_NETUSDT' },
        { base: 'NEA', id: 'totalLiq_NEAUSDT' },
        { base: 'NRY', id: 'totalLiq_NRYUSDT' },
        { base: 'NCL', id: 'totalLiq_NCLUSDT' }
    ];
    totalPairs.forEach(({ base, id }) => {
        const el = document.getElementById(id);
        if (el && data.totalLiquidity) {
            const key = `${base}/USDT`;
            const value = data.totalLiquidity[key] || 0;
            el.innerText = parseFloat(value).toFixed(2);
        }
    });
}

// 暴露到全局，确保 HTML 按钮、导航和其它模块能调用
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
window.renderFactoryData = renderFactoryData;
