import { API_BASE } from './config.js';

/**
 * 1. 提交交易记录 (增强版：支持自定义 Action 和 额外字段)
 * @param {string} type 业务类型（如：充值、购买矿机）
 * @param {string|number} amount 数量
 * @param {string} symbol 代币符号
 * @param {string} action 对应 Worker 的逻辑分支 (重要)
 * @param {object} extraFields 额外字段（如转账时的 receiver）
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

    // 构建发送给 Worker 的数据包
    const payload = {
        action: action,        // 决定 Worker 去哪个表
        address: address,      // 发起人地址
        type: type,            // 交易类型
        amount: String(amount),// 数量
        symbol: symbol,        // 代币
        ...extraFields,        // 展开额外字段（如 receiver）
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
            // 提交成功后刷新数据
            await fetchUserData(address); 
        } else {
            // 如果后端返回错误（如飞书字段不匹配），打印出来
            console.error("提交失败详情:", result.msg);
        }
        return result;
    } catch (e) {
        console.error("提交请求异常:", e);
        return { success: false, error: e.message };
    }
}

/**
 * 2. 内部转账业务逻辑 (你需要确保 HTML 按钮调用的是这个函数)
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

    // 关键修复：显式传递 action 为 "transfer"，并带上 receiver 字段
    const result = await postTransactionRecord(
        "内部转账", 
        amount, 
        symbol, 
        "transfer", // 必须与 Worker 中的 if (body.action === "transfer") 对应
        { receiver: toAddr } // 必须包含 receiver 字段
    );

    if (result.success) {
        alert("✅ 转账申请已提交");
        if (window.closeModal) window.closeModal();
        location.reload();
    } else {
        alert("❌ 转账失败: " + (result.msg || "接口响应异常"));
        if (window.closeModal) window.closeModal();
    }
}

/**
 * 3. 获取并渲染用户数据 (保持不变)
 */
export async function fetchUserData(address) {
    if (!address) return;
    try {
        const res = await fetch(`${API_BASE}?address=${address}&t=${Date.now()}`);
        if (!res.ok) throw new Error('网络请求失败');
        const data = await res.json();
        
        if (data.newUser) {
            if (typeof window.showRegisterModal === 'function') window.showRegisterModal(address);
            return;
        }

        // 基础信息
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // 资产与价格
        if (data.balances && data.allPrices) {
            window.currentPrices = data.allPrices;
            const cleanPrices = {};
            Object.keys(data.allPrices).forEach(k => cleanPrices[k.toUpperCase()] = parseFloat(data.allPrices[k]) || 0);
            
            let total = 0;
            Object.keys(data.balances).forEach(token => {
                const bal = parseFloat(data.balances[token]) || 0;
                const price = cleanPrices[token.toUpperCase()] || 0;
                total += bal * price;
                updateText(`bal_${token}`, bal.toFixed(4));
                updateText(`price_${token}`, price > 0 ? `$${price.toFixed(2)}` : "---");
                updateText(`val_${token}`, `$${(bal * price).toFixed(2)}`);
            });
            updateText('totalValue', total.toFixed(2));
        }

        // 历史渲染
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

    } catch (e) {
        console.error("fetchUserData 渲染链路报错:", e);
    }
}

/**
 * 4. 绑定推荐人 (保持逻辑，但与 Worker 适配)
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
            alert("❌ 绑定失败: " + (result.msg || "后端校验未通过"));
        }
    } catch (error) {
        console.error("绑定异常:", error);
        alert("网络连接失败，请检查 API 配置");
    } finally {
        if (window.closeModal) window.closeModal();
    }
}

/**
 * 5. 通用更新文本工具函数 (保持不变)
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    if (value === undefined || value === null || value === "") {
        const isAmountField = id.includes('Sales') || id.includes('Reward') || id.includes('bal_') || id.includes('totalValue');
        el.innerText = isAmountField ? "0.00" : "---";
    } else {
        el.innerText = value;
    }
}

// 暴露全局变量给 HTML 按钮调用
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.doInternalTransfer = doInternalTransfer; // 必须暴露给 HTML 调用
window.updateText = updateText;
