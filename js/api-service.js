import { API_BASE } from './config.js';

/**
 * 1. 提交交易记录 (通用 POST 函数)
 */
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction", extraFields = {}) {
    console.log("准备提交数据:", { type, amount, symbol, action, ...extraFields });

    const address = window.currentAddress || localStorage.getItem('fbs_address');
    
    if (!address) {
        alert("未连接钱包，无法提交记录");
        return { success: false, error: "No wallet address" };
    }

    const payload = {
        action: action,        
        address: address,      
        type: type,            
        amount: String(amount),
        symbol: symbol,        
        ...extraFields
    };

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();

        if (result.success) {
            // 成功提示
            alert(`✅ ${type}申请已成功提交`);
            
            // 局部数据刷新：不刷新页面，直接重拉数据
            if (window.fetchUserData) {
                window.fetchUserData(address); 
            }
            // 如果有弹窗，关闭它
            if (window.closeModal) window.closeModal();

        } else {
            alert(`❌ 提交失败: ${result.msg || "服务器拒绝"}`);
        }
        return result;
    } catch (e) {
        console.error("提交异常:", e);
        alert("网络连接失败，请检查 API 地址");
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取并渲染用户数据 (核心渲染逻辑)
 */
export async function fetchUserData(address) {
    if (!address) return;
    
    try {
        // 加上时间戳防止浏览器缓存
        const res = await fetch(`${API_BASE}?address=${address}&t=${Date.now()}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        console.log("收到后端整合数据:", data);

        // A. 新用户处理：弹出注册/绑定邀请弹窗
        if (data.newUser) {
            if (typeof window.showRegisterModal === 'function') {
                window.showRegisterModal(address);
            }
            return;
        }

        // B. 基础资料渲染 (对齐飞书字段名)
        updateText('info_inviteCode', data.info?.["推荐码"]);
        updateText('info_inviter', data.info?.["推荐人"]);
        updateText('info_regTime', data.info?.["注册时间"]);

        // C. 团队数据渲染 (关键修复：对齐 HTML 中的 ID)
        if (data.team) {
            updateText('direct_count', data.team["直推人数"]);
            updateText('direct_sales', data.team["直推业绩"]);
            updateText('team_count', data.team["团队人数"]);
            updateText('team_sales', data.team["团队业绩"]);
            updateText('total_reward', data.team["累计奖励"]);
        }

        // D. 资产与实时币价渲染
        if (data.balances && data.allPrices) {
            window.currentPrices = data.allPrices; // 全局存一份备查
            
            const cleanPrices = {};
            Object.keys(data.allPrices).forEach(k => {
                cleanPrices[k.toUpperCase()] = parseFloat(data.allPrices[k]) || 0;
            });
            
            let totalValueUSD = 0;
            // 遍历用户余额表中的所有代币列
            Object.keys(data.balances).forEach(token => {
                const bal = parseFloat(data.balances[token]) || 0;
                const price = cleanPrices[token.toUpperCase()] || 0;
                const itemValue = bal * price;
                
                totalValueUSD += itemValue;

                // 动态寻找页面上的余额、价格、价值标签
                updateText(`bal_${token}`, bal.toFixed(4));
                updateText(`price_${token}`, price > 0 ? `$${price.toFixed(4)}` : "---");
                updateText(`val_${token}`, `$${itemValue.toFixed(2)}`);
            });
            
            // 总资产价值格式化
            updateText('totalValue', totalValueUSD.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }));
        }

        // E. 矿机状态渲染
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_daily', data.miner["日产量"]);
        }

        // F. 历史记录列表渲染 (调用 ui-render.js 中的函数)
        if (window.renderHistory) window.renderHistory(data.history || []);
        if (window.renderTransfers) window.renderTransfers(data.transfers || []);

    } catch (e) {
        console.error("fetchUserData 渲染失败:", e);
    }
}

/**
 * 3. 绑定邀请人
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    const walletAddr = window.currentAddress || localStorage.getItem('fbs_address');
    
    if (!inviterId) return alert("请输入推荐人 ID");
    
    // 生成自己的随机邀请码 (或者由后端生成)
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const res = await postTransactionRecord(
        "绑定邀请", 
        "0", 
        "INFO", 
        "bind_inviter", 
        { inviterId: inviterId, myInviteCode: myCode }
    );
    
    if (res.success) {
        // 绑定成功后关闭弹窗并刷新
        if (window.closeModal) window.closeModal();
    }
}

/**
 * 4. 通用文本更新工具 (防止出现 undefined/NaN)
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // 处理各种无效值
    if (value === undefined || value === null || value === "" || value === "NaN" || value === 0 || value === "0") {
        // 如果是金额类字段，默认显示 0.00，否则显示 ---
        const isAmountField = id.includes('Sales') || id.includes('Reward') || id.includes('bal_') || id.includes('totalValue');
        el.innerText = isAmountField ? "0.00" : (value === 0 || value === "0" ? "0" : "---");
    } else {
        el.innerText = value;
    }
}

// 暴露到全局，方便 HTML 里的 onclick 调用
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
