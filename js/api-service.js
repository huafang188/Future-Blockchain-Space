import { API_BASE } from './config.js';

/**
 * 1. 提交交易/申请记录到后端 (POST)
 * @param {string} type - 交易类型描述 (如: '充值', '提币')
 * @param {number|string} amount - 数量
 * @param {string} symbol - 币种 (如: 'USDT')
 * @param {string} action - Worker 路由标识 (如: 'bind_inviter', 'record_transaction')
 * @param {object} extraFields - 额外字段 (如: signature, email)
 */
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction", extraFields = {}) {
    const address = localStorage.getItem('fbs_address');
    
    if (!address) {
        alert("请先连接钱包");
        return { success: false };
    }

    // 构造发送给 Worker 的标准 Payload
    const payload = {
        action: action,        
        address: address,      
        type: type,            
        amount: String(amount),
        symbol: symbol,        
        ...extraFields
    };

    console.log(`[API] 正在提交 ${action}:`, payload);

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (result.success) {
            console.log(`[API] ${type} 提交成功`);
            // 提交成功后，自动拉取最新数据，更新 UI
            fetchUserData(address);
            return result;
        } else {
            alert(`提交失败: ${result.msg || "服务器拒绝"}`);
            return result;
        }
    } catch (e) {
        console.error("[API] 提交异常:", e);
        alert("网络连接失败，请检查 Worker 配置");
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取用户完整数据并渲染 UI (GET)
 * @param {string} address - 钱包地址
 */
export async function fetchUserData(address) {
    if (!address) return;
    
    try {
        console.log(`[API] 正在拉取用户数据: ${address}`);
        const res = await fetch(`${API_BASE}?address=${address.toLowerCase()}&t=${Date.now()}`);
        if (!res.ok) throw new Error('网络响应异常');
        
        const data = await res.json();
        console.log("[API] 收到后端数据:", data);

        // A. 新用户逻辑：弹出绑定邀请码弹窗
        if (data.newUser) {
            if (window.openBindInviterModal) {
                window.openBindInviterModal();
            }
            return;
        }

        // B. 基础资料 (对应 HTML: info_inviteCode, info_inviter 等)
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // C. 团队数据渲染 (关键修复：对应 HTML ID)
        if (data.team) {
            updateText('team_directCount', data.team["直推人数"]);
            updateText('team_directSales', data.team["直推业绩"]);
            updateText('team_totalCount', data.team["团队人数"]);
            updateText('team_totalSales', data.team["团队业绩"]);
            updateText('team_totalReward', data.team["累计奖励"]);
        }

        // D. 矿机数据渲染
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_daily', data.miner["日产量"]);
            updateText('miner_deadline', data.miner["挖矿期限"]);
            updateText('miner_locked', data.miner["锁仓数量"]);
        }

        // E. 资产与实时币价渲染
        if (data.balances && data.allPrices) {
            window.currentPrices = data.allPrices; // 存入全局供 calculations.js 使用
            
            // 如果 ui-render.js 加载了，调用它渲染资产列表
            if (window.renderTokenList) {
                window.renderTokenList(data.balances);
            }
        }

        // F. 历史记录渲染
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

    } catch (e) {
        console.error("[API] 数据拉取或渲染失败:", e);
    }
}

/**
 * 3. 辅助：绑定推荐人
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    
    // 生成一个随机的本地邀请码
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const res = await postTransactionRecord(
        "绑定关系", 
        "0", 
        "INFO", 
        "bind_inviter", 
        { inviterId: inviterId, myInviteCode: myCode }
    );
    
    if (res.success) {
        alert("绑定成功！");
        if (window.closeModal) window.closeModal();
    }
}

/**
 * 4. 统一文本更新工具
 * 自动处理 0, null, undefined 的显示
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const isAmount = id.includes('Sales') || id.includes('Reward') || id.includes('totalValue') || id.includes('bal_');
    
    if (value === undefined || value === null || value === "" || value === "NaN") {
        el.innerText = isAmount ? "0.00" : "---";
        return;
    }

    if (isAmount && !isNaN(value)) {
        el.innerText = parseFloat(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    } else {
        el.innerText = value;
    }
}

// --- 全局挂载，确保 HTML 里的 onclick 能找到这些函数 ---
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
