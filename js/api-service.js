import { API_BASE } from './config.js';

/**
 * 1. 提交交易/申请记录到后端 (POST)
 * 修复：提交后不再刷新页面，改为局部刷新数据
 */
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction", extraFields = {}) {
    const address = localStorage.getItem('fbs_address');
    
    if (!address) {
        alert("请先连接钱包");
        return { success: false };
    }

    // 构造 Payload
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

        if (result.success || result.code === 0) {
            console.log(`[API] ${type} 提交成功`);
            
            // --- 核心修复：成功后仅刷新数据，不刷新页面 ---
            await fetchUserData(address); 
            
            // 如果有弹窗，关闭它
            if (window.closeModal) window.closeModal();
            
            return { success: true, data: result };
        } else {
            alert(`提交失败: ${result.msg || "服务器拒绝"}`);
            return { success: false };
        }
    } catch (e) {
        console.error("[API] 提交异常:", e);
        alert("网络连接失败，请检查 Worker 配置");
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取用户完整数据并渲染 UI (GET)
 * 修复：强制价格 Key 大写对齐，修复矿机显示
 */
export async function fetchUserData(address) {
    if (!address) return;
    
    try {
        console.log(`[API] 正在拉取用户数据: ${address}`);
        const res = await fetch(`${API_BASE}?address=${address.toLowerCase()}&t=${Date.now()}`);
        if (!res.ok) throw new Error('网络响应异常');
        
        const data = await res.json();
        console.log("[API] 收到后端原始数据:", data);

        // A. 新用户逻辑
        if (data.newUser) {
            if (window.openBindInviterModal) window.openBindInviterModal();
            return;
        }

        // B. --- 核心修复：标准化价格对象 (Key 强制大写) ---
        if (data.allPrices) {
            const normalizedPrices = {};
            Object.keys(data.allPrices).forEach(key => {
                normalizedPrices[key.toUpperCase()] = parseFloat(data.allPrices[key]);
            });
            window.currentPrices = normalizedPrices; // 存入全局供价格显示使用
            console.log("[API] 已标准化价格表:", window.currentPrices);
        }

        // 存储余额供计算器 (calculations.js) 使用
        window.userBalances = data.balances || {};

        // C. 基础资料渲染
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // D. 团队数据渲染
        if (data.team) {
            updateText('team_directCount', data.team["直推人数"]);
            updateText('team_directSales', data.team["直推业绩"]);
            updateText('team_totalCount', data.team["团队人数"]);
            updateText('team_totalSales', data.team["团队业绩"]);
            updateText('team_totalReward', data.team["累计奖励"]);
        }

        // E. 矿机数据渲染 (对齐飞书截图中的列名)
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_daily', data.miner["日产量"]);
            updateText('miner_deadline', data.miner["挖矿期限"]); // 对应 ID: miner_deadline
            updateText('miner_locked', data.miner["锁仓数量"]);   // 对应 ID: miner_locked
        }

        // F. 触发资产列表和流水渲染 (调用 ui-render.js 函数)
        if (window.renderTokenList) window.renderTokenList(data.balances || {});
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

    } catch (e) {
        console.error("[API] fetchUserData 失败:", e);
    }
}

/**
 * 3. 辅助：绑定推荐人逻辑
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    
    // 生成随机邀请码给当前用户 (后端处理)
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 提交绑定
    const res = await postTransactionRecord(
        "绑定关系", 
        "0", 
        "INFO", 
        "bind_inviter", 
        { inviterId: inviterId, myInviteCode: myCode }
    );
    
    if (res.success) {
        alert("✅ 绑定成功！");
        // 这里不需要 reload，postTransactionRecord 内部会刷新数据
    }
}

/**
 * 4. 统一文本更新工具
 * 自动处理 0, null, undefined 的显示并格式化数字
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // 判断是否为需要格式化的小数/金额字段
    const isAmount = id.includes('Sales') || id.includes('Reward') || id.includes('totalValue') || 
                     id.includes('bal_') || id.includes('val_') || id.includes('price_') || 
                     id.includes('locked') || id.includes('daily');
    
    if (value === undefined || value === null || value === "" || value === "NaN") {
        el.innerText = isAmount ? "0.00" : "---";
        return;
    }

    if (isAmount && !isNaN(value)) {
        let num = parseFloat(value);
        // 价格显示 4 位小数，其他显示 2 位
        let decimals = id.includes('price_') ? 4 : 2;
        el.innerText = num.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    } else {
        el.innerText = value;
    }
}

// --- 全局挂载，确保 HTML 按钮和其它 JS 能访问 ---
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
