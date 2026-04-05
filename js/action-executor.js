import { RECEIVE_ADDRS, CONTRACT_ADDRS, API_BASE } from './config.js';
import { getCurrentAddress } from './wallet-utils.js';
import { postTransactionRecord, fetchUserData } from './api-service.js';

/**
 * 辅助工具：将普通文本转为钱包所需的 Hex 格式
 */
const toHex = (msg) => '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * --- 底层逻辑：合约代币转账 (USDT/BNB等链上支付) ---
 */
export async function executeTokenTransfer(contractAddr, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        window.showModal("modal_processing", `<div class="p-10 text-center"><div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>请在钱包确认交易并等待...</div>`);

        // 这里的精度处理：USDT 在 BSC/TRON/ETH 大多是 18 或 6 位，请根据你实际合约调整
        const decimals = 18; 
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
 * --- 业务 1：充值 (由链上转账触发) ---
 */
export async function doRecharge() {
    const symbol = document.getElementById('recToken')?.value.toUpperCase();
    const amount = document.getElementById('recAmount')?.value;
    if (!amount || amount <= 0) return alert("请输入正确金额");
    
    try {
        let success = false;
        if (symbol === 'BNB' || symbol === 'ETH') {
            success = await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
        } else {
            const tokenAddr = CONTRACT_ADDRS[symbol];
            if(!tokenAddr) return alert("暂不支持该代币充值");
            success = await executeTokenTransfer(tokenAddr, RECEIVE_ADDRS.RECHARGE, amount);
        }

        if (success) {
            window.showModal("modal_syncing", "链上支付成功，正在记录账单...");
            await postTransactionRecord('充值', amount, symbol);
            alert("✅ 充值成功，请稍后刷新余额");
            location.reload(); 
        }
    } catch (e) { console.error("充值异常:", e); }
}

/**
 * --- 业务 2：链上支付 (购买矿机/交电费) ---
 */
export async function doChainPay(bizType) {
    const totalText = (bizType === 'MINER') 
        ? document.getElementById('buyTotal')?.innerText.replace('$ ', '') 
        : document.getElementById('elecCost')?.innerText.replace(' USDT', '');
    
    if(!totalText || parseFloat(totalText) <= 0) return alert("金额计算错误");

    try {
        const success = await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], totalText);
        if (success) {
            const typeName = (bizType === 'MINER') ? '购买矿机' : '缴纳电费';
            window.showModal("modal_syncing", "支付成功，正在同步数据...");
            await postTransactionRecord(typeName, totalText, 'USDT');
            alert(`✅ ${typeName}成功！`);
            location.reload();
        }
    } catch (e) { console.error("支付异常:", e); }
}

/**
 * --- 业务 3：签名动作 (提币/兑换 - 仅申请，不扣链上气费) ---
 */
export async function handleSignAction(type) {
    try {
        const currentAddress = getCurrentAddress();
        if(!currentAddress) return alert("请先连接钱包");

        let actionName = "", amount = "0", symbol = "";
        if (type === 'WITHDRAW') {
            actionName = "提币";
            amount = document.getElementById('witAmount')?.value;
            symbol = document.getElementById('witToken')?.value.toUpperCase();
        } else {
            actionName = "兑换";
            amount = document.getElementById('sFromAmt')?.value;
            const fromT = document.getElementById('sFromToken')?.value.toUpperCase();
            const toT = document.getElementById('sToToken')?.value.toUpperCase();
            symbol = `${fromT}->${toT}`;
        }

        if(!amount || amount <= 0) return alert("请输入有效数量");

        // 构造消息并签名
        const msg = `Future Blockchain Space\nAction: ${actionName}\nAmount: ${amount} ${symbol}\nTimestamp: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [toHex(msg), currentAddress] });
        
        if (sig) {
            window.showModal("modal_submitting", "签名已确认，正在提交申请...");
            await postTransactionRecord(actionName, amount, symbol, "record_transaction", { signature: sig });
            alert("✅ 申请已提交后台审核");
            location.reload();
        }
    } catch (e) { 
        console.error(e);
        alert(e.code === 4001 ? "用户取消了签名" : "操作失败"); 
    }
}

/**
 * --- 业务 4：内部转账 (需要签名验证) ---
 */
export async function doInternalTransfer() {
    const symbol = document.getElementById('transToken')?.value?.toUpperCase();
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;
    const senderAddr = getCurrentAddress();

    if (!toAddr || !amount || parseFloat(amount) <= 0) return alert("请完整填写转账信息");

    try {
        const msg = `Internal Transfer Confirmation\nAsset: ${symbol}\nAmount: ${amount}\nTo: ${toAddr}\nTime: ${new Date().toISOString()}`;
        const signature = await window.ethereum.request({ method: 'personal_sign', params: [toHex(msg), senderAddr] });

        if (!signature) return;
        window.showModal("modal_processing", "正在安全提交转账请求...");

        const result = await postTransactionRecord(
            "内部转账", 
            amount, 
            symbol, 
            "transfer", 
            { receiver: toAddr, signature: signature }
        );
        
        if(result) {
            alert("✅ 内部转账成功");
            location.reload();
        }
    } catch (e) { 
        console.error("转账异常:", e);
        alert(e.code === 4001 ? "转账已取消" : "转账失败，请检查余额");
        if (window.closeModal) window.closeModal();
    }
}

/**
 * --- 业务 5：转让矿机 (需要签名验证) ---
 */
export async function doMinerTransfer() {
    const toAddr = document.getElementById('minerT_Addr')?.value.trim();
    const amount = document.getElementById('minerT_Amount')?.value;
    const senderAddr = getCurrentAddress();

    if (!toAddr || !amount) return alert("请填写接收地址和数量");

    try {
        const msg = `Transfer Miner Ownership\nQuantity: ${amount}\nNew Owner: ${toAddr}\nDate: ${new Date().toDateString()}`;
        const signature = await window.ethereum.request({ method: 'personal_sign', params: [toHex(msg), senderAddr] });

        window.showModal("modal_processing", "正在提交转让协议...");
        
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
    } catch (e) { console.error(e); alert("操作已取消"); }
}

/**
 * --- 业务 6：绑定邮箱/申请团队权限 ---
 */
export async function doTeamEmailSubmit() {
    const email = document.getElementById('team_email')?.value.trim();
    const senderAddr = getCurrentAddress();
    
    if (!email || !email.includes('@')) return alert("请输入有效的邮箱地址");

    try {
        const msg = `Activate Team Privileges\nEmail: ${email}\nOwner: ${senderAddr}`;
        const signature = await window.ethereum.request({ method: 'personal_sign', params: [toHex(msg), senderAddr] });

        window.showModal("modal_processing", "正在提交激活申请...");

        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "bind_email", 
                address: senderAddr,
                email: email,
                signature: signature
            })
        });

        const res = await response.json();
        if (res.success) { 
            alert("✅ 申请成功，请等待审核激活"); 
            if (window.closeModal) window.closeModal();
            fetchUserData(senderAddr); 
        } else { 
            alert("绑定失败: " + (res.error || "请稍后再试")); 
        }
    } catch (e) { 
        console.error(e);
        alert("操作已取消");
    }
}

/**
 * --- 初始化挂载 ---
 */
export function mountActionExecutors() {
    window.doRecharge = doRecharge;
    window.doChainPay = doChainPay;
    window.handleSignAction = handleSignAction;
    window.doInternalTransfer = doInternalTransfer;
    window.doMinerTransfer = doMinerTransfer; 
    window.doTeamEmailSubmit = doTeamEmailSubmit; 
}
