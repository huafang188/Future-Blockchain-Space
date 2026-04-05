import { RECEIVE_ADDRS, CONTRACT_ADDRS, API_BASE } from './config.js';
import { postTransactionRecord, fetchUserData } from './api-service.js';

/**
 * 辅助：将文字转为 Hex 格式（确保钱包签名兼容性）
 */
const StringToHex = (msg) => '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * 核心：获取当前激活的钱包地址 (解决授权过期问题)
 */
async function getActiveAddress() {
    if (!window.ethereum) return null;
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        return accounts[0] || null;
    } catch (e) {
        return null;
    }
}

/**
 * --- 底层：ERC20 代币转账 (USDT 等) ---
 */
async function executeTokenTransfer(contractAddr, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, [
            "function transfer(address to, uint256 amount) public returns (bool)"
        ], signer);
        
        // 弹出等待提示
        if (window.showModal) window.showModal("modal_processing", "请在钱包中确认交易...");

        const decimals = 18; 
        const tx = await contract.transfer(to, ethers.parseUnits(amountStr.toString(), decimals));
        const receipt = await tx.wait();
        
        return receipt.status === 1;
    } catch (e) {
        console.error("Transfer Error:", e);
        alert("交易失败或取消: " + (e.reason || e.message));
        if (window.closeModal) window.closeModal();
        return false;
    }
}

/**
 * --- 业务 1：充值 ---
 */
export async function doRecharge() {
    const symbol = document.getElementById('recToken')?.value.toUpperCase();
    const amount = document.getElementById('recAmount')?.value;
    if (!amount || amount <= 0) return alert("请输入金额");
    
    const tokenAddr = CONTRACT_ADDRS[symbol];
    if (!tokenAddr) return alert("暂不支持该代币");

    const success = await executeTokenTransfer(tokenAddr, RECEIVE_ADDRS.RECHARGE, amount);
    if (success) {
        if (window.showModal) window.showModal("modal_syncing", "支付成功，正在记录账单...");
        // 成功后提交飞书记录
        await postTransactionRecord('充值', amount, symbol, "recharge");
        alert("✅ 充值记录已提交");
        location.reload(); 
    }
}

/**
 * --- 业务 2：支付 (购买矿机/交电费) ---
 */
export async function doChainPay(bizType) {
    const totalText = (bizType === 'MINER') 
        ? document.getElementById('buyTotal')?.innerText.replace('$ ', '') 
        : document.getElementById('elecCost')?.innerText.replace(' USDT', '');
    
    if(!totalText || parseFloat(totalText) <= 0) return alert("金额计算错误");

    const success = await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], totalText);
    if (success) {
        const typeName = (bizType === 'MINER') ? '购买矿机' : '缴纳电费';
        await postTransactionRecord(typeName, totalText, 'USDT', "record_transaction");
        alert(`✅ ${typeName}成功！`);
        location.reload();
    }
}

/**
 * --- 业务 3：签名授权操作 (提币/兑换) ---
 */
export async function handleSignAction(type) {
    try {
        const address = await getActiveAddress();
        if(!address) return alert("请先连接钱包");

        let typeName = "", amount = "0", symbol = "";
        if (type === 'WITHDRAW') {
            typeName = "提币";
            amount = document.getElementById('witAmount')?.value;
            symbol = document.getElementById('witToken')?.value.toUpperCase();
        } else {
            typeName = "兑换";
            amount = document.getElementById('sFromAmt')?.value;
            const fromT = document.getElementById('sFromToken')?.value.toUpperCase();
            const toT = document.getElementById('sToToken')?.value.toUpperCase();
            symbol = `${fromT}->${toT}`;
        }

        if(!amount || amount <= 0) return alert("请输入数量");

        const msg = `Action: ${typeName}\nAmount: ${amount}\nToken: ${symbol}\nTime: ${Date.now()}`;
        const signature = await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [StringToHex(msg), address] 
        });
        
        if (signature) {
            await postTransactionRecord(typeName, amount, symbol, "record_transaction", { signature });
            alert("✅ 申请已提交后台审核");
            location.reload();
        }
    } catch (e) { 
        console.error(e);
        alert("操作已取消"); 
    }
}

/**
 * --- 业务 4：内部转账 (资产划转) ---
 */
export async function doInternalTransfer() {
    const symbol = document.getElementById('transToken')?.value?.toUpperCase();
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;

    if (!toAddr || !amount || parseFloat(amount) <= 0) return alert("请完整填写转账信息");

    try {
        const address = await getActiveAddress();
        const msg = `Transfer: ${amount} ${symbol}\nTo: ${toAddr}\nTime: ${Date.now()}`;
        const signature = await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [StringToHex(msg), address] 
        });

        if (signature) {
            await postTransactionRecord("内部转账", amount, symbol, "transfer", { 
                receiver: toAddr, 
                signature: signature 
            });
            alert("✅ 内部转账成功");
            location.reload();
        }
    } catch (e) { alert("操作已取消"); }
}

/**
 * --- 业务 5：转让矿机记录 ---
 */
export async function doMinerTransfer() {
    const toAddr = document.getElementById('minerT_Addr')?.value.trim();
    const amount = document.getElementById('minerT_Amount')?.value;

    if (!toAddr || !amount) return alert("请填写接收地址和数量");

    try {
        const address = await getActiveAddress();
        const msg = `Transfer Miner\nQty: ${amount}\nTo: ${toAddr}`;
        const signature = await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [StringToHex(msg), address] 
        });

        if (signature) {
            await postTransactionRecord("转让矿机", amount, "MINER", "transfer_miner", { 
                receiver: toAddr, 
                signature: signature 
            });
            alert("✅ 矿机转让成功");
            location.reload();
        }
    } catch (e) { alert("操作已取消"); }
}

/**
 * --- 业务 6：绑定邮箱 / 激活团队 ---
 */
export async function doTeamEmailSubmit() {
    const email = document.getElementById('team_email')?.value.trim();
    if (!email || !email.includes('@')) return alert("请输入有效邮箱");

    try {
        const address = await getActiveAddress();
        const msg = `Bind Email: ${email}\nAddr: ${address}`;
        const signature = await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [StringToHex(msg), address] 
        });

        if (signature) {
            await postTransactionRecord("申请团队数据", "0", "INFO", "bind_email", { 
                email: email, 
                signature: signature 
            });
            alert("✅ 申请成功，请等待激活");
            if (window.closeModal) window.closeModal();
        }
    } catch (e) { alert("操作已取消"); }
}

/**
 * --- 统一挂载至全局 ---
 */
export function mountActionExecutors() {
    window.doRecharge = doRecharge;
    window.doChainPay = doChainPay;
    window.handleSignAction = handleSignAction;
    window.doInternalTransfer = doInternalTransfer;
    window.doMinerTransfer = doMinerTransfer;
    window.doTeamEmailSubmit = doTeamEmailSubmit; 
}
