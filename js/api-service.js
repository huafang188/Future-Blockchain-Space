import { API_BASE } from './config.js';

/**
 * 1. 提交交易记录
 */
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction", extraFields = {}) {
    console.log("准备提交 POST:", { type, amount, symbol, action, ...extraFields });

    const address = window.currentAddress || window.userAddress || localStorage.getItem('fbs_address');
    
    if (!address) {
        console.error("未连接钱包，无法提交记录");
        return { success: false, error: "No wallet address" };
    }

    const now = new Date();
    const formattedDate = now.toLocaleString('zh-CN', { hour12: false }).replace(/-/g, '/'); 

    const payload = {
        action: action,        
        address: address,      
        type: type,            
        amount: String(amount),
        symbol: symbol,        
        ...extraFields,        
        time: formattedDate
    };

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        console.log("服务器返回结果:", result);

        if (result.success) {
            // --- 核心修复：删掉 location.reload() ---
            alert(`✅ ${type}申请已提交`);
            
            // 执行局部数据刷新，不刷新页面
            if (window.fetchUserData) {
                window.fetchUserData(address); 
            }
            // 如果有弹窗，关闭它
            if (window.closeModal) window.closeModal();

        } else {
            console.error("提交失败详情:", result.msg);
            alert(`❌ 提交失败: ${result.msg || "后端验证未通过"}`);
        }
        return result;
    } catch (e) {
        console.error("提交请求异常:", e);
        alert("网络异常，请稍后重试");
        return { success: false, error: e.message };
    }
}

/**
 * 2. 内部转账业务逻辑
 */
export async function doInternalTransfer() {
    // 增加 event 防止冒泡（虽然这里没传 e，但在调用处最好传一下）
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;
    const symbol = document.getElementById('transToken')?.value?.toUpperCase() || "USDT";

    if (!toAddr || !amount || amount <= 0) {
        alert("请填写正确的接收地址和数量");
        return;
    }

    const result = await postTransactionRecord(
        "内部转账", 
        amount, 
        symbol, 
        "transfer", 
        { receiver: toAddr }
    );

    // 注意：这里的 closeModal 逻辑已经移入 postTransactionRecord 的成功回调中
}

/**
 * 3. 获取并渲染用户数据 (增强数据保护版)
 */
export async function fetchUserData(address) {
    if (!address) return;
    try {
        const res = await fetch(`${API_BASE}?address=${address}&t=${Date.now()}`);
        if (!res.ok) throw new Error('网络请求失败');
        const data = await res.json();
        
        console.log("Worker 返回原始数据:", data);

        if (!data.newUser && (!data.balances || Object.keys(data.balances).length === 0)) {
            console.warn("⚠️ 检测到飞书数据同步延迟（空余额），跳过此次渲染。");
            return; 
        }

        if (data.newUser) {
            if (typeof window.showRegisterModal === 'function') window.showRegisterModal(address);
            return;
        }

        // --- 渲染逻辑开始 ---
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        if (data.balances && data.allPrices) {
            window.currentPrices = data.allPrices;
            window.userBalances = data.balances;

            const cleanPrices = {};
            Object.keys(data.allPrices).forEach(k => {
                cleanPrices[k.toUpperCase()] = parseFloat(data.allPrices[k]) || 0;
            });
            
            let total = 0;
            Object.keys(data.balances).forEach(token => {
                const bal = parseFloat(data.balances[token]) || 0;
                const price = cleanPrices[token.toUpperCase()] || 0;
                const itemValue = bal * price;
                total += itemValue;

                updateText(`bal_${token}`, bal.toFixed(4));
                updateText(`price_${token}`, price > 0 ? `$${price.toFixed(2)}` : "---");
                updateText(`val_${token}`, `$${itemValue.toFixed(2)}`);
            });
            
            updateText('totalValue', total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }));
        }

        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_daily', data.miner["日产量"]);
        }

        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

    } catch (e) {
        console.error("fetchUserData 渲染链路报错:", e);
    }
}

/**
 * 4. 绑定推荐人
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    const walletAddr = window.currentAddress || localStorage.getItem('fbs_address');
    
    if (!inviterId) return alert("请输入推荐人 ID");
    if (!walletAddr) return alert("请先连接钱包");

    const now = new Date();
    const formattedTime = now.toLocaleString('zh-CN', { hour12: false }).replace(/-/g, '/'); 

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "bind_inviter", 
                address: walletAddr,
                inviterId: inviterId,
                regTime: formattedTime 
            })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ 绑定成功");
            // --- 核心修复：删掉 location.reload() ---
            if (window.fetchUserData) window.fetchUserData(walletAddr);
            if (window.closeModal) window.closeModal();
        } else {
            alert("❌ 绑定失败: " + (result.msg || "推荐码无效"));
        }
    } catch (error) {
        console.error("绑定异常:", error);
    }
}

/**
 * 5. 通用更新文本工具函数
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    if (value === undefined || value === null || value === "" || value === "NaN") {
        const isAmountField = id.includes('Sales') || id.includes('Reward') || id.includes('bal_') || id.includes('totalValue') || id.includes('val_');
        el.innerText = isAmountField ? "0.00" : "---";
    } else {
        el.innerText = value;
    }
}

// 暴露全局变量
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.doInternalTransfer = doInternalTransfer;
window.updateText = updateText;
