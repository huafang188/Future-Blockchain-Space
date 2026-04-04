import { API_BASE } from './config.js';
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction") {
    // 增加调试日志，确认函数是否被调用
    console.log("准备提交 POST:", { type, amount, symbol, action });

    const address = window.currentAddress || window.userAddress || localStorage.getItem('fbs_address');
    
    if (!address) {
        console.error("未连接钱包，无法提交记录");
        return { success: false, error: "No wallet address" };
    }

    const now = new Date();
    // 格式化：2026-04-04 15:30:00 (飞书表格对这种格式支持更好)
    const formattedDate = now.toLocaleString(); 

    const payload = {
        action: action,
        address: address,
        type: type,
        amount: String(amount),
        symbol: symbol,
        status: "已完成", // 修改为已完成
        time: formattedDate
    };

    try {
        // 使用 await 确保请求发出
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        console.log("服务器返回结果:", result);

        if (result.success) {
            // 只有成功了才去尝试刷新数据
            if (typeof fetchUserData === 'function') {
                await fetchUserData(address); 
            }
        }
        return result;
    } catch (e) {
        console.error("提交请求异常:", e);
        return { success: false, error: e.message };
    }
}

export async function fetchUserData(address) {
    if (!address) return;
    
    try {
        const res = await fetch(`${API_BASE}?address=${address}`);
        if (!res.ok) throw new Error('网络请求失败');
        
        const data = await res.json();

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

        // --- E. 资产处理 (核心修复：增加空值和类型保护) ---
        if (data.balances && typeof data.balances === 'object') {
            window.userBalances = data.balances;
            
            // 渲染资产列表页
            if (typeof renderTokenList === 'function') {
                renderTokenList(data.balances);
            }
            
            let calculatedTotal = 0;
            const prices = window.TOKEN_PRICES || { "USDT": 1, "FBS": 0.5, "BNB": 600 };

            Object.keys(data.balances).forEach(token => {
                const balance = parseFloat(data.balances[token]) || 0;
                const price = prices[token] || 0;
                calculatedTotal += (balance * price);
                // 更新首页的小余额显示
                updateText(`bal_${token}`, balance.toFixed(2));
            });

            // 更新总估值
            updateText('totalValue', calculatedTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }));
        }

        // --- F. 历史记录渲染 (核心修复：强制转为数组) ---
        const historyList = Array.isArray(data.history) ? data.history : [];
        const transferList = Array.isArray(data.transfers) ? data.transfers : [];

        if (window.renderHistory) window.renderHistory(historyList);
        if (window.renderTransfers) window.renderTransfers(transferList);
        
        // --- G. 统计面板刷新 ---
        const currentLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        if (typeof renderStatsPage === 'function') {
            renderStatsPage(currentLang);
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
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "bind_relationship",
                user: walletAddr,
                inviter: inviterId,
                regTime: formattedTime
            })
        });

        const result = await response.json();
        if (result.success || result.data) {
            // UI 立即反馈
            updateText('info_inviter', inviterId);
            updateText('info_regTime', formattedTime);
            if (window.closeModal) window.closeModal();
            alert("✅ 绑定成功");
            // 刷新用户数据
            fetchUserData(walletAddr);
        } else {
            alert("绑定失败: " + (result.message || "未知错误"));
        }
    } catch (error) {
        console.error("绑定异常:", error);
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
        // 如果是业绩类字段，空值显示 0.00
        const isAmountField = id.includes('Sales') || id.includes('Reward') || id.includes('bal_') || id.includes('totalValue');
        el.innerText = isAmountField ? "0.00" : "0";
    } else {
        el.innerText = value;
    }
}
