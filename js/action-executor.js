import { RECEIVE_ADDRS, CONTRACT_ADDRS } from './config.js';
import { getCurrentAddress } from './wallet-utils.js';
import { postTransactionRecord } from './api-service.js';

// 合约代币转账
export async function executeTokenTransfer(contractAddr, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        window.showModal("正在处理", `<div class="p-10 text-center"><div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>请在钱包确认交易并等待...</div>`);

        const tx = await contract.transfer(to, ethers.parseUnits(amountStr.toString(), 18));
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            alert("✅ 支付成功！");
            location.reload();
        }
    } catch (e) {
        alert("⚠️ 交易未完成: " + (e.reason || "余额不足或已取消"));
        window.closeModal();
    }
}

// 原生代币转账（BNB）
export async function executeNativeTransfer(to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({ to, value: ethers.parseEther(amountStr.toString()) });
        await tx.wait();
        alert("✅ 充值成功！");
        location.reload();
    } catch (e) { 
        alert("充值失败"); 
        window.closeModal(); 
    }
}

// 充值
export async function doRecharge() {
    const symbol = document.getElementById('recToken').value;
    const amount = document.getElementById('recAmount').value;
    if (!amount || amount <= 0) return alert("请输入金额");
    try {
        if (symbol === 'BNB') {
            await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
        } else {
            await executeTokenTransfer(CONTRACT_ADDRS[symbol], RECEIVE_ADDRS.RECHARGE, amount);
        }
        await postTransactionRecord('充值', amount, symbol);
        window.closeModal();
    } catch (e) { console.error(e); }
}

// 链上支付（矿机/电费）
export async function doChainPay(bizType) {
    const totalText = (bizType === 'MINER') 
        ? document.getElementById('buyTotal').innerText.replace('$ ', '') 
        : document.getElementById('elecCost').innerText.replace(' USDT', '');
    
    try {
        await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], totalText);
        const typeName = (bizType === 'MINER') ? '购买矿机' : '缴纳电费';
        await postTransactionRecord(typeName, totalText, 'USDT');
        window.closeModal();
    } catch (e) { console.error(e); }
}

// 签名动作（提币/兑换）
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
            await postTransactionRecord(actionName, amount, symbol);
            alert("申请已提交");
            window.closeModal();
        }
    } catch (e) { alert("已取消或签名失败"); }
}

// 内部转账
export async function doInternalTransfer() {
    const symbol = document.getElementById('transToken')?.value;
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;
    const senderAddr = getCurrentAddress();

    if (!toAddr || !amount || parseFloat(amount) <= 0) {
        alert("请输入有效的地址和数量");
        return;
    }

    try {
        const message = `确认内部转账\n转出资产: ${amount} ${symbol}\n接收地址: ${toAddr}\n时间: ${new Date().toLocaleString()}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [hexMsg, senderAddr],
        });

        const response = await fetch('https://api.neoneo.ink/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "transfer",
                address: senderAddr,
                receiver: toAddr,
                type: symbol,
                amount: String(amount),
                symbol: symbol,
                status: "已提交"
            })
        });

        const result = await response.json();
        if (result.success) {
            alert("内部转账成功");
            window.closeModal();
            fetchUserData(senderAddr);
        }
    } catch (e) {
        console.error("转账失败:", e);
        if (e.code === 4001) alert("用户取消了签名");
    }
}

// 挂载全局
export function mountActionExecutors() {
    window.doRecharge = doRecharge;
    window.doChainPay = doChainPay;
    window.handleSignAction = handleSignAction;
    window.doInternalTransfer = doInternalTransfer;
}
