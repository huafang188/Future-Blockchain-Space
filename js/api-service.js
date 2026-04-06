import { API_BASE } from './config.js';

/**
 * 1. 提交交易/申请记录到后端 (POST)
 * 逻辑：成功后不刷新页面，仅通过 fetchUserData 同步最新资产和记录
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
        amount: String(amount), // 强制转为字符串，适配飞书文字列
        symbol: symbol,        
        ...extraFields
    };

    console.log(`[API] 正在发起请求 [${action}]:`, payload);

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        // Worker 返回 success 或飞书返回 code 0 均视为成功
        if (result.success || result.code === 0) {
            console.log(`[API] ${type} 业务处理成功`);
            
            // --- 核心逻辑：局部刷新数据，不重载页面 ---
            await fetchUserData(address); 
            
            // 如果存在弹窗，自动执行关闭
            if (window.closeModal) window.closeModal();
            
            return { success: true, data: result };
        } else {
            const errorMsg = result.msg || "服务器拒绝请求";
            alert(`提交失败: ${errorMsg}`);
            return { success: false };
        }
    } catch (e) {
        console.error("[API] 请求异常:", e);
        alert("网络连接超时，请检查网络环境或 Worker 状态");
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取用户完整数据并同步 UI (GET)
 * 涵盖：资产、单价、团队业绩、矿机状态、历史流水
 */
export async function fetchUserData(address) {
    if (!address) return;
    
    try {
        console.log(`[API] 同步用户数据中: ${address}`);
        const res = await fetch(`${API_BASE}?address=${address.toLowerCase()}&t=${Date.now()}`);
        if (!res.ok) throw new Error('Network response error');
        
        const data = await res.json();
        console.log("[API] 后端数据解析成功:", data);

        // A. 新用户拦截：弹出绑定邀请码
        if (data.newUser) {
            if (window.openBindInviterModal) window.openBindInviterModal();
            return;
        }

        // B. --- 核心：价格 Key 标准化 (解决价格不显示) ---
        if (data.allPrices) {
            const normalizedPrices = {};
            Object.keys(data.allPrices).forEach(key => {
                normalizedPrices[key.toUpperCase()] = parseFloat(data.allPrices[key]);
            });
            window.currentPrices = normalizedPrices; // 写入全局供 render 使用
        }

        // 存储用户余额对象，供 calculations.js 计算器使用
        window.userBalances = data.balances || {};

        // C. 基础资料 (对应 HTML: info_inviteCode, info_inviter 等)
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // D. 团队数据 (对齐 HTML ID: team_directCount 等)
        if (data.team) {
            updateText('team_directCount', data.team["直推人数"]);
            updateText('team_directSales', data.team["直推业绩"]);
            updateText('team_totalCount', data.team["团队人数"]);
            updateText('team_totalSales', data.team["团队业绩"]);
            updateText('team_totalReward', data.team["累计奖励"]);
        }

        // E. 矿机数据 (精准匹配飞书截图中的列名)
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_daily', data.miner["日产量"]);
            updateText('miner_deadline', data.miner["挖矿期限"]); 
            updateText('miner_locked', data.miner["锁仓数量"]);
        }

        // F. 触发 UI 渲染函数 (调用 ui-render.js)
        if (window.renderTokenList) window.renderTokenList(data.balances || {});
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

    } catch (e) {
        console.error("[API] fetchUserData 执行失败:", e);
    }
}

/**
 * 3. 辅助功能：提交绑定推荐人请求
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入邀请码");
    
    // 生成一个 6 位的随机邀请码作为用户的初始码
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const res = await postTransactionRecord(
        "绑定关系", 
        "0", 
        "INFO", 
        "bind_inviter", 
        { inviterId: inviterId, myInviteCode: myCode }
    );
    
    if (res.success) {
        alert("✅ 账户已成功激活！");
    }
}

/**
 * 4. 统一文本与数值更新工具
 * 自动处理空值，并根据 Apple 风格进行轻量化数字格式化
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // 识别金额、价格、数量等需要特殊处理的 ID 前缀或包含词
    const isAmountField = id.includes('Sales') || id.includes('Reward') || id.includes('totalValue') || 
                          id.includes('bal_') || id.includes('val_') || id.includes('price_') || 
                          id.includes('locked') || id.includes('daily');
    
    // 容错处理：当值为 null, undefined, "" 时
    if (value === undefined || value === null || value === "" || value === "NaN") {
        el.innerText = isAmountField ? "0.00" : "--";
        return;
    }

    // 数值格式化
    if (isAmountField && !isNaN(value)) {
        let num = parseFloat(value);
        // 如果是单价展示 4 位小数，其他字段统一展示 2 位
        let decimalPlaces = id.includes('price_') ? 4 : 2;
        
        el.innerText = num.toLocaleString('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        });
    } else {
        // 纯文本字段直接赋值
        el.innerText = value;
    }
}

// ==========================================
// 🚀 暴露全局挂载
// ==========================================
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
