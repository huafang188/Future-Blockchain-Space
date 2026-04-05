import { RECEIVE_ADDRS, CONTRACT_ADDRS, API_BASE } from './config.js';
import { getCurrentAddress } from './wallet-utils.js';
import { postTransactionRecord, fetchUserData } from './api-service.js';

/**
 * --- 底层逻辑：合约代币转账 (USDT等) ---
 */
export async function executeTokenTransfer(contractAddr, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        window.showModal("正在处理", `<div class="p-10 text-center"><div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>请在钱包确认交易并等待...</div>`);

        // 注意：根据你的网络决定精度。主网 USDT 通常是 6 位，BSC/测试网通常是 18 位。
        // 这里默认 18 位，如果是主网 USDT 请改为 6
        const decimals = contractAddr.toLowerCase() === CONTRACT_ADDRS.USDT.toLowerCase() ? 18 : 18; 
        const tx = await contract.transfer(to, ethers.parseUnits(amountStr.toString(), decimals));
        const receipt = await tx.wait();
        
        return receipt.status === 1;
    } catch (e) {
        console.error("合约转账失败:", e);
        alert("⚠️ 交易未完成: " + (e.reason || e.message || "用户取消"));
        if (window.closeModal) window.closeModal();
        return false;
    }
}

/**
 * --- 底层逻辑：原生代币转账 (BNB/ETH) ---
 */
export async function executeNativeTransfer(to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({ to, value: ethers.parseEther(amountStr.toString()) });
        await tx.wait();
        return true;
    } catch (e) { 
        alert("支付失败: " + (e.reason || "用户取消")); 
        if (window.closeModal) window.closeModal(); 
        return false;
    }
}

/**
 * --- 业务：充值 ---
 */
export async function doRecharge() {
    const symbol = document.getElementById('recToken').value.toUpperCase();
    const amount = document.getElementById('recAmount').value;
    if (!amount || amount <= 0) return alert("请输入正确金额");
    
    try {
        let success = false;
        if (symbol === 'BNB' || symbol === 'ETH') {
            success = await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
        } else {
            success = await executeTokenTransfer(CONTRACT_ADDRS[symbol], RECEIVE_ADDRS.RECHARGE, amount);
        }

        if (success) {
            window.showModal("同步中", "链上支付成功，正在记录账单...");
            await postTransactionRecord('充值', amount, symbol);
            alert("✅ 充值记录已提交，请等待确认");
            location.reload(); 
        }
    } catch (e) { console.error("充值异常:", e); }
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
            window.showModal("同步中", "支付成功，正在更新状态...");
            await postTransactionRecord(typeName, totalText, 'USDT');
            alert(`✅ ${typeName}成功！`);
            location.reload();
        }
    } catch (e) { console.error("支付异常:", e); }
}

/**
 * --- 业务：签名动作（提币/兑换申请） ---
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
                symbol = document.getElementById('witToken').value.toUpperCase();
            } else {
                actionName = "兑换";
                amount = document.getElementById('sFromAmt').value;
                symbol = `${document.getElementById('sFromToken').value.toUpperCase()}->${document.getElementById('sToToken').value.toUpperCase()}`;
            }

            window.showModal("提交中", "签名已确认，正在提交申请...");
            await postTransactionRecord(actionName, amount, symbol, "record_transaction", { signature: sig });
            alert("✅ 申请已提交后台审核");
            location.reload();
        }
    } catch (e) { alert("已取消或签名失败"); }
}

/**
 * --- 业务：内部转账 ---
 */
export async function doInternalTransfer() {
    const symbol = document.getElementById('transToken')?.value?.toUpperCase();
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;
    const senderAddr = getCurrentAddress();

    if (!toAddr || !amount || parseFloat(amount) <= 0) return alert("请完整填写转账信息");

    try {
        const message = `确认内部转账\n资产: ${amount} ${symbol}\n接收: ${toAddr}\n时间: ${new Date().toLocaleString()}`;
        // 将消息转为十六进制
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
        const signature = await window.ethereum.request({ method: 'personal_sign', params: [hexMsg, senderAddr] });

        if (!signature) return;

        window.showModal("处理中", "正在安全提交转账请求...");

        const result = await postTransactionRecord(
            "内部转账", 
            amount, 
            symbol, 
            "transfer", 
            { receiver: toAddr, signature: signature }
        );
    } catch (e) { 
        console.error("转账异常:", e);
        alert("用户取消或交易失败");
        if (window.closeModal) window.closeModal();
    }
}

/**
 * --- 业务：转让矿机 ---
 */
export async function doMinerTransfer() {
    const toAddr = document.getElementById('minerT_Addr')?.value.trim();
    const amount = document.getElementById('minerT_Amount')?.value;
    const senderAddr = getCurrentAddress();

    if (!toAddr || !amount) return alert("请填写接收地址和数量");

    try {
        const message = `确认转让矿机\n数量: ${amount}\n接收地址: ${toAddr}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
        const signature = await window.ethereum.request({ method: 'personal_sign', params: [hexMsg, senderAddr] });

        window.showModal("处理中", "正在提交转让协议...");
        
        // 直接调用 API 以适配特殊 action
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "transfer_miner",
                address: senderAddr,
                receiver: toAddr,
                amount: String(amount),
                signature: signature
            })
        });
        
        const res = await response.json();
        if (res.success) { 
            alert("✅ 矿机转让申请已提交"); 
            location.reload(); 
        } else { 
            alert("提交失败: " + (res.error || "后端拒绝")); 
            if (window.closeModal) window.closeModal(); 
        }
    } catch (e) { console.error(e); }
}

/**
 * --- 业务：绑定邮箱/申请团队数据 ---
 */
export async function doTeamEmailSubmit() {
    const email = document.getElementById('team_email')?.value.trim();
    const senderAddr = getCurrentAddress();
    
    if (!email || !email.includes('@')) return alert("请输入有效的邮箱地址");

    try {
        const message = `激活团队权限: ${email}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
        const signature = await window.ethereum.request({ method: 'personal_sign', params: [hexMsg, senderAddr] });

        window.showModal("处理中", "正在提交申请...");

        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "bind_email", // 👈 这里对齐 Worker 的分支
                address: senderAddr,
                email: email,
                signature: signature
            })
        });

        const res = await response.json();
        if (res.success) { 
            alert("✅ 申请成功，请等待审核激活"); 
            if (window.closeModal) window.closeModal();
            fetchUserData(senderAddr); // 成功后刷新数据展示
        } else { 
            alert("绑定失败: " + (res.error || "请稍后再试")); 
        }
    } catch (e) { 
        console.error(e);
        alert("操作已取消");
    }
}

/**
 * --- 挂载函数到 window 作用域 ---
 */
export function mountActionExecutors() {
    window.doRecharge = doRecharge;
    window.doChainPay = doChainPay;
    window.handleSignAction = handleSignAction;
    window.doInternalTransfer = doInternalTransfer;
    window.doMinerTransfer = doMinerTransfer; 
    window.doTeamEmailSubmit = doTeamEmailSubmit; 
}
