import { API_BASE } from './config.js';

// 用于管理请求取消，彻底解决 "Failed to fetch" 报错
let fetchController = null;

/**
 * 1. 提交交易/申请记录到后端 (POST)
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

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (result.success || result.code === 0) {
            console.log(`[API] ${type} 提交成功`);
            await fetchUserData(address); 
            if (window.closeModal) window.closeModal();
            return { success: true, data: result };
        } else {
            alert(`提交失败: ${result.msg || "服务器拒绝"}`);
            return { success: false };
        }
    } catch (e) {
        if (e.message === 'Failed to fetch') return { success: false };
        console.error("[API] 提交异常:", e);
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取用户完整数据并同步 UI (GET)
 */
export async function fetchUserData(address) {
    if (!address) return;

    if (fetchController) fetchController.abort();
    fetchController = new AbortController();
    const { signal } = fetchController;
    
    try {
        const cleanAddr = address.toLowerCase().trim();
        const res = await fetch(`${API_BASE}?address=${cleanAddr}&t=${Date.now()}`, { signal });
        
        if (!res.ok) throw new Error(`Network Error: ${res.status}`);
        
        const data = await res.json();
        console.log("[API] 收到完整后端包:", data);

        // --- 核心修复：取消新用户自动弹窗 ---
        if (data.newUser) {
            console.log("[API] 检测到新用户，等待用户手动绑定推荐人");
            // 不再自动执行 window.openBindInviterModal()
            // 初始化基础 UI 显示
            updateText('info_inviteCode', '---');
            updateText('info_inviter', '---');
            return;
        }

        // 价格标准化
        if (data.allPrices) {
            const normalizedPrices = {};
            Object.keys(data.allPrices).forEach(key => {
                normalizedPrices[key.toUpperCase()] = parseFloat(data.allPrices[key]);
            });
            window.currentPrices = normalizedPrices; 
        }

        window.userBalances = data.balances || {};

        // 基础资料
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // 团队数据
        if (data.team) {
            updateText('team_directCount', data.team["直推人数"]);
            updateText('team_directSales', data.team["直推业绩"]);
            updateText('team_totalCount', data.team["团队人数"]);
            updateText('team_totalSales', data.team["团队业绩"]);
            updateText('team_totalReward', data.team["累计奖励"]);
        }

        // 矿机数据
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_daily', data.miner["日产量"]);
            updateText('miner_deadline', data.miner["挖矿期限"]); 
            updateText('miner_locked', data.miner["锁仓数量"]);
        }

        // 渲染列表
        if (window.renderTokenList) window.renderTokenList(data.balances || {});
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

    } catch (e) {
        if (e.name === 'AbortError' || e.message === 'Failed to fetch') {
            console.warn("[API] 请求被中止 (正常操作)");
        } else {
            console.error("[API] 数据同步失败:", e);
        }
    }
}

/**
 * 3. 辅助：绑定推荐人
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
        alert("✅ 账户已成功激活");
    }
}

/**
 * 4. 数值更新工具
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const isAmountField = id.includes('Sales') || id.includes('Reward') || id.includes('totalValue') || 
                          id.includes('bal_') || id.includes('val_') || id.includes('price_') || 
                          id.includes('locked') || id.includes('daily') || id.includes('Count');
    
    if (value === undefined || value === null || value === "" || value === "NaN") {
        el.innerText = isAmountField ? "0.00" : "--";
        return;
    }

    if (isAmountField && !isNaN(value)) {
        let num = parseFloat(value);
        let decimalPlaces = id.includes('price_') ? 4 : 2;
        el.innerText = num.toLocaleString('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        });
    } else {
        el.innerText = value;
    }
}

window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
