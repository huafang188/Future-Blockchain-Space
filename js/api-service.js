import { API_BASE } from './config.js';

// 用于管理请求取消，彻底解决并发请求导致的 "Failed to fetch" 报错
let fetchController = null;

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
            headers: { 'Content-Type': 'application/json' },
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
            alert(`提交失败: ${result.msg || "服务器繁忙"}`);
            return { success: false };
        }
    } catch (e) {
        // 捕获因刷新页面导致的连接中断
        if (e.message === 'Failed to fetch') return { success: false };
        console.error("[API] POST 请求异常:", e);
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

        // 将用户资产存入全局供 calculations.js 使用
        window.userBalances = data.balances || {};

        // C. 渲染资料信息
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // D. 渲染团队数据
        if (data.team) {
            updateText('team_directCount', data.team["直推人数"]);
            updateText('team_directSales', data.team["直推业绩"]);
            updateText('team_totalCount', data.team["团队人数"]);
            updateText('team_totalSales', data.team["团队业绩"]);
            updateText('team_totalReward', data.team["累计奖励"]);
        }

        // E. 渲染矿机数据 (严格匹配飞书文字列名)
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_daily', data.miner["日产量"]);
            updateText('miner_deadline', data.miner["挖矿期限"]); 
            updateText('miner_locked', data.miner["锁仓数量"]);
        }

        // F. 执行各 UI 模块的渲染函数
        if (window.renderTokenList) window.renderTokenList(data.balances || {});
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

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
