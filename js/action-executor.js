import { RECEIVE_ADDRS, CONTRACT_ADDRS } from './config.js';
import { getCurrentAddress } from './wallet-utils.js';
import { postTransactionRecord, fetchUserData } from './api-service.js';

/**
 * --- 底层逻辑：合约代币转账 (USDT等) ---
 * 修复：移除内部 reload，改为返回 receipt
 */
export async function executeTokenTransfer(contractAddr, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        window.showModal("正在处理", `<div class="p-10 text-center"><div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>请在钱包确认交易并等待...</div>`);

        const tx = await contract.transfer(to, ethers.parseUnits(amountStr.toString(), 18));
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            return true; // 仅返回成功状态，不刷新页面
        }
        return false;
    } catch (e) {
        alert("⚠️ 交易未完成: " + (e.reason || "余额不足或已取消"));
        window.closeModal();
        return false;
    }
}

/**
 * --- 底层逻辑：原生代币转账 (BNB) ---
 * 修复：移除内部 reload
 */
export async function executeNativeTransfer(to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({ to, value: ethers.parseEther(amountStr.toString()) });
        await tx.wait();
        return true;
    } catch (e) { 
        alert("充值失败"); 
        window.closeModal(); 
        return false;
    }
}

/**
 * --- 业务：充值 ---
 */
export async function doRecharge() {
    const symbol = document.getElementById('recToken').value;
    const amount = document.getElementById('recAmount').value;
    if (!amount || amount <= 0) return alert("请输入金额");
    
    try {
        let success = false;
        if (symbol === 'BNB') {
            success = await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
        } else {
            success = await executeTokenTransfer(CONTRACT_ADDRS[symbol], RECEIVE_ADDRS.RECHARGE, amount);
        }

        if (success) {
            // 关键：必须等待后端记录成功
            window.showModal("同步中", `<div class="p-10 text-center">链上支付成功，正在同步账单...</div>`);
            await postTransactionRecord('充值', amount, symbol);
            alert("✅ 充值已完成并记录");
            window.closeModal();
            location.reload(); 
        }
    } catch (e) { console.error("充值业务异常:", e); }
}

/**
 * --- 业务：链上支付（购买矿机/交电费） ---
 */
export async function doChainPay(bizType) {
    const totalText = (bizType === 'MINER') 
        ? document.getElementById('buyTotal').innerText.replace('$ ', '') 
        : document.getElementById('elecCost').innerText.replace(' USDT', '');
    
    try {
        const success = await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], totalText);
        if (success) {
            const typeName = (bizType === 'MINER') ? '购买矿机' : '缴纳电费';
            window.showModal("同步中", `<div class="p-10 text-center">支付成功，正在更新资产状态...</div>`);
            await postTransactionRecord(typeName, totalText, 'USDT');
            alert(`✅ ${typeName}成功！`);
            window.closeModal();
            location.reload();
        }
    } catch (e) { console.error("支付业务异常:", e); }
}

/**
 * --- 业务：签名动作（提币/兑换） ---
 */
export async function handleSignAction(type) {
    try {
        const currentAddress = getCurrentAddress();
        const msg = `${type} Request at ${new Date().toISOString()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        
        if (sig) {
            let actionName = "", amount = "0", symbol = "";
            if (type === 'WITHDRAW') {
                actionName = "提币";
                amount = document.getElementById('witAmount').value;
                symbol = document.getElementById('witToken').value;
            } else {
                actionName = "兑换";
                amount = document.getElementById('sFromAmt').value;
                symbol = `${document.getElementById('sFromToken').value}->${document.getElementById('sToToken').value}`;
            }

            window.showModal("提交中", `<div class="p-10 text-center">签名已确认，正在提交申请...</div>`);
            await postTransactionRecord(actionName, amount, symbol);
            alert("✅ 申请已提交后台审核");
            window.closeModal();
            location.reload();
        }
    } catch (e) { alert("已取消或签名失败"); }
}

/**
 * --- 业务：内部资产转账 (修复提交失败问题) ---
 */
export async function doInternalTransfer() {
    const symbol = document.getElementById('transToken')?.value?.toUpperCase(); // 1. 确保大写以匹配价格逻辑
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;
    const senderAddr = window.currentAddress || localStorage.getItem('fbs_address');

    if (!toAddr || !amount || parseFloat(amount) <= 0) {
        alert("请输入有效的地址和数量");
        return;
    }

    try {
        // 构造签名消息
        const message = `确认内部转账\n转出资产: ${amount} ${symbol}\n接收地址: ${toAddr}\n时间: ${new Date().toLocaleString()}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // 唤起钱包签名
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [hexMsg, senderAddr],
        });

        window.showModal("转账中", `<div class="p-10 text-center">正在处理内部网络划转...</div>`);

        // --- 关键修改点：使用 API_BASE 且确保 action 匹配 Worker 逻辑 ---
        const response = await fetch('https://api.neoneo.ink/', { // 建议去掉 /api/user 除非 Worker 明确配置了该路由
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "transfer",       // 确保 Worker 的 switch-case 中有 "transfer"
                address: senderAddr,      // 发送者
                receiver: toAddr,         // 接收者
                symbol: symbol,           // 币种 (强制大写)
                amount: String(amount),   // 数量
                signature: signature,     // 签名密文
                message: message          // 原始消息用于校验
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert("✅ 内部转账成功");
            window.closeModal();
            // 静默刷新数据，不要暴力 reload 提升体验
            if (window.fetchUserData) window.fetchUserData(senderAddr);
            location.reload(); 
        } else {
            alert("转账失败: " + (result.message || result.error || "未知错误"));
            window.closeModal();
        }
    } catch (e) {
        console.error("转账请求异常:", e);
        if (e.code === 4001) {
            alert("用户取消了钱包签名");
        } else {
            alert("提交失败，请检查网络或 API 配置");
        }
        window.closeModal();
    }
}
/**
 * --- 业务：转让矿机 ---
 */
export async function doMinerTransfer() {
    const toAddr = document.getElementById('minerT_Addr')?.value.trim();
    const amount = document.getElementById('minerT_Amount')?.value;
    const senderAddr = getCurrentAddress();

    if (!toAddr || !amount || parseFloat(amount) <= 0) {
        alert("请输入有效的地址和数量");
        return;
    }

    try {
        const message = `确认转让矿机\n转让数量: ${amount}\n接收地址: ${toAddr}\n时间: ${new Date().toLocaleString()}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [hexMsg, senderAddr],
        });

        window.showModal("处理中", `<div class="p-10 text-center">正在提交矿机转让协议...</div>`);
        const response = await fetch('https://api.neoneo.ink/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "transfer_miner",
                address: senderAddr,
                receiver: toAddr,
                amount: String(amount),
                signature: signature,
                message: message
            })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ 矿机转让申请已提交");
            window.closeModal();
            location.reload();
        } else {
            alert("提交失败: " + result.message);
            window.closeModal();
        }
    } catch (e) {
        console.error("矿机转让失败:", e);
        if (e.code === 4001) alert("用户取消了签名");
    }
}

/**
 * --- 业务：提交邮箱 ---
 */
export async function doTeamEmailSubmit() {
    const email = document.getElementById('team_email')?.value.trim();
    const senderAddr = getCurrentAddress();
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailReg.test(email)) {
        alert("请输入有效的邮箱地址");
        return;
    }

    try {
        const message = `激活团队高级权限\n绑定邮箱: ${email}\n用户: ${senderAddr}\n时间: ${new Date().toLocaleString()}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [hexMsg, senderAddr],
        });

        const response = await fetch('https://api.neoneo.ink/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "bind_email",
                address: senderAddr,
                email: email,
                signature: signature,
                message: message
            })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ 邮箱绑定成功，权限已激活");
            window.closeModal();
            location.reload();
        } else {
            alert("提交失败: " + result.message);
        }
    } catch (e) {
        console.error("邮箱绑定失败:", e);
        if (e.code === 4001) alert("用户取消了签名");
    }
}

export function mountActionExecutors() {
    window.doRecharge = doRecharge;
    window.doChainPay = doChainPay;
    window.handleSignAction = handleSignAction;
    window.doInternalTransfer = doInternalTransfer;
    window.doMinerTransfer = doMinerTransfer; 
    window.doTeamEmailSubmit = doTeamEmailSubmit; 
}
