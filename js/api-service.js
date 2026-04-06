import { API_BASE } from './config.js';

// 用于管理请求取消，彻底解决 "Failed to fetch" 报错
let fetchController = null;

/**
 * 1. 提交交易/申请记录到后端 (POST)
 * 涵盖：充值、提现、兑换、团队申请、矿机转让、内部转账
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (result.success || result.code === 0) {
            console.log(`[API] ${type} 提交成功`);
            
            // 局部刷新数据，不重载页面
            await fetchUserData(address); 
            
            if (window.closeModal) window.closeModal();
            return { success: true, data: result };
        } else {
            alert(`提交失败: ${result.msg || "服务器拒绝"}`);
            return { success: false };
        }
    } catch (e) {
        // 捕获页面刷新导致的异常，静默处理
        if (e.message === 'Failed to fetch') return { success: false };
        console.error("[API] 提交异常:", e);
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取用户完整数据并同步 UI (GET)
 * 涵盖：资产、单价、团队业绩、矿机状态、历史流水
 */
export async function fetchUserData(address) {
    if (!address) return;

    // --- 核心防护：如果上一个请求没跑完，直接中止它，防止 Failed to fetch ---
    if (fetchController) fetchController.abort();
    fetchController = new AbortController();
    const { signal } = fetchController;
    
    try {
        console.log(`[API] 开始同步用户全量数据: ${address}`);
        const cleanAddr = address.toLowerCase().trim();
        
        // 增加时间戳 t= 解决浏览器缓存问题
        const res = await fetch(`${API_BASE}?address=${cleanAddr}&t=${Date.now()}`, { signal });
        
        if (!res.ok) throw new Error(`Network Error: ${res.status}`);
        
        const data = await res.json();
        console.log("[API] 收到完整后端包:", data);

        // A. 新用户逻辑 (弹出绑定)
        if (data.newUser) {
            if (window.openBindInviterModal) window.openBindInviterModal();
            return;
        }

        // B. 价格 Key 标准化 (将 neo 转为 NEO)
        if (data.allPrices) {
            const normalizedPrices = {};
            Object.keys(data.allPrices).forEach(key => {
                normalizedPrices[key.toUpperCase()] = parseFloat(data.allPrices[key]);
            });
            window.currentPrices = normalizedPrices; 
        }

        // 存储余额供 calculations.js 计算器逻辑使用
        window.userBalances = data.balances || {};

        // C. 渲染基础资料 (对齐 HTML ID)
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // D. 渲染团队数据 (对应 HTML ID)
        if (data.team) {
            updateText('team_directCount', data.team["直推人数"]);
            updateText('team_directSales', data.team["直推业绩"]);
            updateText('team_totalCount', data.team["团队人数"]);
            updateText('team_totalSales', data.team["团队业绩"]);
            updateText('team_totalReward', data.team["累计奖励"]);
        }

        // E. 渲染矿机数据 (严格对齐飞书截图列名)
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_daily', data.miner["日产量"]);
            updateText('miner_deadline', data.miner["挖矿期限"]); // 期限
            updateText('miner_locked', data.miner["锁仓数量"]);   // 锁仓
        }

        // F. 触发 UI 组件渲染 (ui-render.js)
        // 渲染资产预览列表
        if (window.renderTokenList) window.renderTokenList(data.balances || {});
        // 渲染交易历史列表
        if (window.renderHistory) window.renderHistory(data.history || []);
        // 渲染转账流水列表
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

    } catch (e) {
        // 核心防护：如果是取消请求或刷新页面，不作为错误处理
        if (e.name === 'AbortError' || e.message === 'Failed to fetch') {
            console.warn("[API] 请求被中止 (正常操作)");
        } else {
            console.error("[API] 真实的获取数据失败:", e);
        }
    }
}

/**
 * 3. 辅助：提交绑定推荐人请求
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const res = await postTransactionRecord(
        "绑定关系", 
        "0", 
        "INFO", 
        "bind_inviter", 
        { inviterId: inviterId, myInviteCode: myCode }
    );
    
    if (res.success) {
        alert("✅ 账户已激活");
    }
}

/**
 * 4. 统一文本与数值更新工具 (Apple 轻量化格式)
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // 金额/数量类字段列表
    const isAmountField = id.includes('Sales') || id.includes('Reward') || id.includes('totalValue') || 
                          id.includes('bal_') || id.includes('val_') || id.includes('price_') || 
                          id.includes('locked') || id.includes('daily') || id.includes('Count');
    
    if (value === undefined || value === null || value === "" || value === "NaN") {
        el.innerText = isAmountField ? "0.00" : "--";
        return;
    }

    if (isAmountField && !isNaN(value)) {
        let num = parseFloat(value);
        // 单价保留4位，其它金额保留2位
        let decimalPlaces = id.includes('price_') ? 4 : 2;
        
        el.innerText = num.toLocaleString('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        });
    } else {
        el.innerText = value;
    }
}

// 暴露到全局，确保 HTML 里的 onclick="fetchUserData()" 能找到
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
