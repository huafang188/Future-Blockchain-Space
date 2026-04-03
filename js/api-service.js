import { API_BASE } from './config.js';

// 提交交易记录
export async function postTransactionRecord(type, amount, symbol) {
    const address = window.currentAddress || window.userAddress || localStorage.getItem('fbs_address');
    
    if (!address) {
        console.error("未连接钱包，无法提交记录");
        return;
    }

    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;

    const payload = {
        action: "record_transaction",
        address: address,
        type: type,
        amount: String(amount),
        symbol: symbol,
        status: "已提交",
        time: formattedDate
    };

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success && typeof fetchUserData === 'function') {
            fetchUserData(address);
        }
    } catch (e) {
        console.error("提交失败:", e);
    }
}

// 获取用户数据
export async function fetchUserData(address) {
    try {
        const res = await fetch(`${API_BASE}?address=${address}`);
        if (!res.ok) throw new Error('网络请求失败');
        
        const data = await res.json();

        // 新用户弹窗
        if (data.newUser) {
            if (typeof window.showRegisterModal === 'function') {
                window.showRegisterModal(address);
            }
            return;
        }

        // 基础信息
        const info = data.info || {};
        updateText('info_inviteCode', info["推荐码"] || "---");
        updateText('info_inviter', info["推荐人"] || "---");
        updateText('info_regTime', info["注册时间"] || "--");

        // 矿机
        const miner = data.miner || {};
        updateText('miner_count', miner["矿机数量"]);
        updateText('miner_daily', miner["日产量"]);
        updateText('miner_deadline', miner["挖矿期限"] || "--");
        updateText('miner_locked', miner["锁仓数量"]);

        // 团队
        const t = data.team || {};
        updateText('team_directCount', t["直推人数"]);
        updateText('team_directSales', t["直推业绩"]);
        updateText('team_totalCount', t["团队人数"]);
        updateText('team_totalSales', t["团队业绩"]);
        updateText('team_totalReward', t["累计奖励"]);

        // 资产
        if (data.balances) {
            window.userBalances = data.balances;
            if (typeof renderTokenList === 'function') {
                renderTokenList(data.balances);
            }
            
            let calculatedTotal = 0;
            const prices = window.TOKEN_PRICES || { "USDT": 1, "FBS": 0.5, "BNB": 600 };

            Object.keys(data.balances).forEach(token => {
                const balance = parseFloat(data.balances[token]) || 0;
                const price = prices[token] || 0;
                calculatedTotal += (balance * price);
                updateText(`bal_${token}`, balance.toFixed(2));
            });

            updateText('totalValue', calculatedTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }));
        }

        // 历史 & 转账
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);
        
        // 统计面板
        const currentLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        if (typeof renderStatsPage === 'function') {
            renderStatsPage(currentLang);
        }

    } catch (e) {
        console.error("前端渲染逻辑报错:", e);
    }
}

// 绑定推荐人
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
            if(document.getElementById('info_inviter')) document.getElementById('info_inviter').innerText = inviterId;
            if(document.getElementById('info_regTime')) document.getElementById('info_regTime').innerText = formattedTime;
            window.showModal("绑定成功", "推荐关系已记录");
        } else {
            alert("绑定失败: " + (result.message || "请求未成功"));
        }
    } catch (error) {
        console.error("绑定异常:", error);
        alert("网络连接失败");
    }
}

// 通用更新文本
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    if (value === undefined || value === null) {
        el.innerText = (id.includes('Sales') || id.includes('Reward')) ? "0.00" : "0";
    } else {
        el.innerText = value;
    }
}
