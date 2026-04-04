import { API_BASE } from './config.js';

/**
 * 1. 提交交易记录 (增强版：支持自定义 Action 和 额外字段)
 */
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction", extraFields = {}) {
    console.log("准备提交 POST:", { type, amount, symbol, action, ...extraFields });

    const address = window.currentAddress || window.userAddress || localStorage.getItem('fbs_address');
    
    if (!address) {
        console.error("未连接钱包，无法提交记录");
        return { success: false, error: "No wallet address" };
    }

    const now = new Date();
    // 格式化时间为 YYYY/MM/DD HH:mm:ss 适配飞书
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
            // --- 核心修复：改为弹窗后刷新页面，给飞书数据写入留出缓冲时间 ---
            alert(`✅ ${type}申请已提交`);
            location.reload(); 
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
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;
    const symbol = document.getElementById('transToken')?.value?.toUpperCase() || "USDT";

    if (!toAddr || !amount || amount <= 0) {
        alert("请填写正确的接收地址和数量");
        return;
    }

    if (window.showModal) window.showModal("处理中", "正在提交内部转账申请...");

    const result = await postTransactionRecord(
        "内部转账", 
        amount, 
        symbol, 
        "transfer", 
        { receiver: toAddr }
    );

    if (!result.success && window.closeModal) {
        window.closeModal();
    }
}

/**
 * 3. 获取并渲染用户数据 (增强数据保护版)
 */
export async function fetchUserData(address) {
    if (!address) return;
    try {
        // 增加随机数防止浏览器缓存旧的空数据
        const res = await fetch(`${API_BASE}?address=${address}&t=${Date.now()}`);
        if (!res.ok) throw new Error('网络请求失败');
        const data = await res.json();
        
        console.log("Worker 返回原始数据:", data);

        // --- 核心保护：如果 data.balances 是空的，坚决不渲染渲染 UI，防止资产归零 ---
        if (!data.newUser && (!data.balances || Object.keys(data.balances).length === 0)) {
            console.warn("⚠️ 检测到飞书数据同步延迟（空余额），跳过此次渲染以保护页面显示。");
            return; 
        }

        if (data.newUser) {
            if (typeof window.showRegisterModal === 'function') window.showRegisterModal(address);
            return;
        }

        // --- 基础信息渲染 ---
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // --- 资产与价格处理 ---
        if (data.balances && data.allPrices) {
            window.currentPrices = data.allPrices;
            window.userBalances = data.balances; // 备份到全局方便计算页面使用

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

        // --- 矿机/团队/记录渲染 ---
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
        if (window.showModal) window.showModal("处理中", "正在绑定推荐关系...");

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
            location.reload(); 
        } else {
            alert("❌ 绑定失败: " + (result.msg || "推荐码无效"));
        }
    } catch (error) {
        console.error("绑定异常:", error);
    } finally {
        if (window.closeModal) window.closeModal();
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
