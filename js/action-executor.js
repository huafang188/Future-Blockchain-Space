import { RECEIVE_ADDRS, CONTRACT_ADDRS, API_BASE } from './config.js';
import { getCurrentAddress } from './wallet-utils.js';
import { postTransactionRecord, fetchUserData } from './api-service.js';

/**
 * 辅助工具：将文本转为 Hex 格式
 * 解决 4001 报错的核心：部分钱包要求 personal_sign 的参数必须是 Hex 字符串
 */
const toHex = (msg) => '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * --- 核心逻辑：合约代币转账 (针对 BSC 链优化) ---
 */
export async function executeTokenTransfer(contractAddr, to, amountStr, symbol = 'USDT') {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        // 显示加载模态框，防止重复点击
        window.showModal("modal_processing", `<div class="p-10 text-center"><div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>请在钱包确认交易并等待...</div>`);

        // BSC 链上的 USDT/ETH/BTC 映射代币均为 18 位精度
        const decimals = 18; 
        const parsedAmount = ethers.parseUnits(amountStr.toString(), decimals);
        
        const tx = await contract.transfer(to, parsedAmount);
        const receipt = await tx.wait();
        
        return receipt.status === 1;
    } catch (e) {
        console.error("合约转账失败:", e);
        const errorMsg = e.code === 4001 ? "您已取消交易确认" : (e.reason || e.message || "交易异常");
        alert("⚠️ " + errorMsg);
        if (window.closeModal) window.closeModal();
        return false;
    }
}

/**
 * --- 核心逻辑：原生代币转账 (BNB) ---
 */
export async function executeNativeTransfer(to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({ to, value: ethers.parseEther(amountStr.toString()) });
        await tx.wait();
        return true;
    } catch (e) { 
        alert("支付失败: " + (e.code === 4001 ? "您已取消支付" : "请检查余额")); 
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
    
    if (!amount || parseFloat(amount) <= 0) return alert("请输入正确金额");
    
    try {
        let success = false;
        // 判断是否为原生代币
        if (symbol === 'BNB' || CONTRACT_ADDRS[symbol] === 'NATIVE') {
            success = await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
        } else {
            const tokenAddr = CONTRACT_ADDRS[symbol];
            if(!tokenAddr) return alert("暂不支持该代币充值");
            success = await executeTokenTransfer(tokenAddr, RECEIVE_ADDRS.RECHARGE, amount, symbol);
        }

        if (success) {
            window.showModal("modal_syncing", "链上支付成功，正在记录账单...");
            await postTransactionRecord('充值', amount, symbol);
            alert("✅ 充值记录已提交，请等待区块确认");
            location.reload(); 
        }
    } catch (e) { console.error("充值逻辑异常:", e); }
}

/**
 * --- 业务 2：链上支付 (购买矿机/交电费) ---
 */
export async function doChainPay(bizType) {
    const totalEl = (bizType === 'MINER') ? document.getElementById('buyTotal') : document.getElementById('elecCost');
    if (!totalEl) return;

    const totalText = totalEl.innerText.replace('$ ', '').replace(' USDT', '');
    if(!totalText || parseFloat(totalText) <= 0) return alert("支付金额必须大于 0");

    try {
        const success = await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], totalText, 'USDT');
        if (success) {
            const typeName = (bizType === 'MINER') ? '购买矿机' : '缴纳电费';
            window.showModal("modal_syncing", "支付成功，正在更新系统状态...");
            await postTransactionRecord(typeName, totalText, 'USDT');
            alert(`✅ ${typeName}成功！`);
            location.reload();
        }
    } catch (e) { console.error("支付逻辑异常:", e); }
}

/**
 * --- 业务 3：提币与兑换签名 (核心修复) ---
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

        if(!amount || parseFloat(amount) <= 0) return alert("数量填写不完整");

        // 构造签名消息：加入随机 Timestamp 防止重放攻击并确保 Hex 唯一性
        const msg = `Future Space Request\nType: ${actionName}\nValue: ${amount} ${symbol}\nTime: ${Date.now()}`;
        const hexMsg = toHex(msg);

        // 发起签名
        const signature = await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [hexMsg, currentAddress] 
        });
        
        if (signature) {
            window.showModal("modal_submitting", "签名验证成功，正在上传...");
            await postTransactionRecord(actionName, amount, symbol, "record_transaction", { signature });
            alert("✅ 申请已进入后台审核流程");
            location.reload();
        }
    } catch (e) { 
        console.error("签名授权异常:", e);
        alert(e.code === 4001 ? "您拒绝了签名请求" : "操作异常，请检查网络"); 
    }
}

/**
 * --- 业务 4：内部转账 ---
 */
export async function doInternalTransfer() {
    const symbol = document.getElementById('transToken')?.value?.toUpperCase();
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;
    const senderAddr = getCurrentAddress();

    if (!toAddr || !amount || parseFloat(amount) <= 0) return alert("请完整输入收款地址和金额");
    if (toAddr.toLowerCase() === senderAddr.toLowerCase()) return alert("不能转账给自己");

    try {
        const msg = `Internal Transfer Confirmation\nTo: ${toAddr}\nAmount: ${amount} ${symbol}\nRef: ${Math.random().toString(36).substring(7)}`;
        const hexMsg = toHex(msg);
        
        const signature = await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [hexMsg, senderAddr] 
        });

        if (!signature) return;

        window.showModal("modal_processing", "安全校验通过，正在处理流水...");
        const result = await postTransactionRecord(
            "内部转账", 
            amount, 
            symbol, 
            "transfer", 
            { receiver: toAddr, signature: signature }
        );
        
        if(result) {
            alert("✅ 内部转账申请已提交");
            location.reload();
        }
    } catch (e) { 
        console.error("转账处理异常:", e);
        alert(e.code === 4001 ? "您已取消签名" : "转账失败，请确保资产充足");
        if (window.closeModal) window.closeModal();
    }
}

/**
 * --- 业务 5：绑定邮箱/激活团队 ---
 */
export async function doTeamEmailSubmit() {
    const email = document.getElementById('team_email')?.value.trim();
    const senderAddr = getCurrentAddress();
    
    if (!email || !email.includes('@')) return alert("请输入格式正确的邮箱");

    try {
        const msg = `Active Account Binding\nEmail: ${email}\nUser: ${senderAddr}`;
        const hexMsg = toHex(msg);
        
        const signature = await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [hexMsg, senderAddr] 
        });

        window.showModal("modal_processing", "绑定请求发送中...");
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
            alert("✅ 邮箱绑定申请成功，请等待审核"); 
            if (window.closeModal) window.closeModal();
            fetchUserData(senderAddr); 
        } else { 
            alert("提交失败: " + (res.error || "请稍后重试")); 
        }
    } catch (e) { 
        console.error(e);
        alert("用户取消操作");
    }
}

/**
 * --- 全局挂载 ---
 */
export function mountActionExecutors() {
    window.doRecharge = doRecharge;
    window.doChainPay = doChainPay;
    window.handleSignAction = handleSignAction;
    window.doInternalTransfer = doInternalTransfer;
    window.doTeamEmailSubmit = doTeamEmailSubmit; 
}
