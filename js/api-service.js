import { API_BASE, tokenInfo } from './config.js';

/**
 * 1. 提交交易记录
 */
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction") {
    console.log("准备提交 POST:", { type, amount, symbol, action });

    const address = window.currentAddress || window.userAddress || localStorage.getItem('fbs_address');
    
    if (!address) {
        console.error("未连接钱包，无法提交记录");
        return { success: false, error: "No wallet address" };
    }

    const now = new Date();
    const formattedDate = now.toLocaleString(); 

    const payload = {
        action: action,
        address: address,
        type: type,
        amount: String(amount),
        symbol: symbol,
        status: "已完成",
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
            // 提交成功后静默刷新数据
            await fetchUserData(address); 
        }
        return result;
    } catch (e) {
        console.error("提交请求异常:", e);
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取并渲染用户数据 (核心修复版)
 */
export async function fetchUserData(address) {
    if (!address) return;
    
    try {
        const res = await fetch(`${API_BASE}?address=${address}`);
        if (!res.ok) throw new Error('网络请求失败');
        
        const data = await res.json();
        console.log("Worker 原始数据:", data);

        // --- A. 新用户逻辑 ---
        if (data.newUser) {
            if (typeof window.showRegisterModal === 'function') {
                window.showRegisterModal(address);
            }
            return;
        }

        // --- B. 基础信息渲染 ---
        const info = data.info || {};
        updateText('info_inviteCode', info["推荐码"] || "---");
        updateText('info_inviter', info["推荐人"] || "---");
        updateText('info_regTime', info["注册时间"] || "--");

        // --- C. 矿机信息渲染 ---
        const miner = data.miner || {};
        updateText('miner_count', miner["矿机数量"] || "0");
        updateText('miner_daily', miner["日产量"] || "0.00");
        updateText('miner_deadline', miner["挖矿期限"] || "--");
        updateText('miner_locked', miner["锁仓数量"] || "0.00");

        // --- D. 团队信息渲染 ---
        const t = data.team || {};
        updateText('team_directCount', t["直推人数"] || "0");
        updateText('team_directSales', t["直推业绩"] || "0.00");
        updateText('team_totalCount', t["团队人数"] || "0");
        updateText('team_totalSales', t["团队业绩"] || "0.00");
        updateText('team_totalReward', t["累计奖励"] || "0.00");

        // --- E. 资产与价格处理 (修复重点) ---
        if (data.balances && data.allPrices) {
            // 1. 存入全局变量，确保 ui-render.js 能读到
            window.currentPrices = data.allPrices;
            window.userBalances = data.balances;
            
            const prices = data.allPrices;
            let calculatedTotal = 0;

            // 2. 先执行一次渲染列表，生成 DOM 结构
            if (typeof window.renderTokenList === 'function') {
                window.renderTokenList(data.balances);
            }

            // 3. 循环计算总值并精确更新具体的 ID 文本
            Object.keys(data.balances).forEach(token => {
                const balance = parseFloat(data.balances[token]) || 0;
                const price = parseFloat(prices[token]) || 0;
                
                calculatedTotal += (balance * price);
                
                // 确保 UI 上的单价和余额实时反映
                updateText(`bal_${token}`, balance.toFixed(4));
                updateText(`price_${token}`, `$${price.toFixed(price < 1 ? 4 : 2)}`);
                updateText(`val_${token}`, `$${(balance * price).toFixed(2)}`);
            });

            // 4. 更新总估值
            updateText('totalValue', calculatedTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }));
        }

        // --- F. 历史记录渲染 ---
        const historyList = Array.isArray(data.history) ? data.history : [];
        const transferList = Array.isArray(data.transfers) ? data.transfers : [];

        if (window.renderHistory) window.renderHistory(historyList);
        if (window.renderTransfers) window.renderTransfers(transferList);
        
        // --- G. 行情详情页渲染 ---
        const currentLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        if (typeof window.renderStatsPage === 'function') {
            window.renderStatsPage(currentLang);
        }

    } catch (e) {
        console.error("fetchUserData 渲染链路报错:", e);
    }
}

/**
 * 3. 绑定推荐人
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    const walletAddr = window.currentAddress || localStorage.getItem('fbs_address');
    
    if (!inviterId) return alert("请输入推荐人 ID");
    if (!walletAddr) return alert("请先连接钱包");

    const now = new Date();
    const formattedTime = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;

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
            if (window.closeModal) window.closeModal();
            alert("✅ 绑定成功");
            location.reload(); 
        } else {
            if (window.closeModal) window.closeModal();
            alert("绑定失败: " + (result.message || "后端验证未通过"));
        }
    } catch (error) {
        console.error("绑定异常:", error);
        if (window.closeModal) window.closeModal();
        alert("网络连接失败，请检查 API 配置");
    }
}

/**
 * 4. 通用更新文本工具函数
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    if (value === undefined || value === null || value === "") {
        const isAmountField = id.includes('Sales') || id.includes('Reward') || id.includes('bal_') || id.includes('totalValue');
        el.innerText = isAmountField ? "0.00" : "0";
    } else {
        el.innerText = value;
    }
}

// 暴露全局变量
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
