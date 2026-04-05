import { RECEIVE_ADDRS, CONTRACT_ADDRS, BSC_CHAIN_ID } from './config.js';
import { postTransactionRecord } from './api-service.js';

/**
 * 🛠️ 辅助：将文字转为钱包兼容的 Hex 格式
 */
const toHex = (msg) => '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * 🔒 核心：强制切换/添加 币安智能链 (BSC)
 */
async function ensureBSCNetwork() {
    if (!window.ethereum) {
        alert("请在 Web3 钱包浏览器中打开");
        return false;
    }
    try {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId !== BSC_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BSC_CHAIN_ID }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: BSC_CHAIN_ID,
                            chainName: 'Binance Smart Chain',
                            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                            rpcUrls: ['https://bsc-dataseed.binance.org/'],
                            blockExplorerUrls: ['https://bscscan.com/']
                        }]
                    });
                } else {
                    throw switchError;
                }
            }
        }
        return true;
    } catch (error) {
        alert("请切换至 BSC 网络后再进行操作");
        return false;
    }
}

/**
 * 💸 逻辑 A：链上真实转账 (充值、购买矿机、缴电费)
 */
async function executeOnChainTransfer(bizType, tokenSymbol, amount, targetAddr) {
    if (!await ensureBSCNetwork()) return;

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        if (window.showModal) window.showModal("modal_processing", "请在钱包内确认转账并等待区块确认...");

        let tx;
        if (tokenSymbol === 'BNB') {
            tx = await signer.sendTransaction({
                to: targetAddr,
                value: ethers.parseEther(amount.toString())
            });
        } else {
            const contractAddr = CONTRACT_ADDRS[tokenSymbol];
            if (!contractAddr) throw new Error("不支持的代币合约");
            const contract = new ethers.Contract(contractAddr, [
                "function transfer(address to, uint256 amount) public returns (bool)"
            ], signer);
            // 假设 BSC 上这些代币都是 18 位精度
            tx = await contract.transfer(targetAddr, ethers.parseUnits(amount.toString(), 18));
        }

        const receipt = await tx.wait();
        if (receipt.status === 1) {
            // 链上成功后，提交记录给飞书
            const typeMap = { "RECHARGE": "充值", "MINER": "购买矿机", "ELECTRIC": "缴纳电费" };
            await postTransactionRecord(typeMap[bizType] || bizType, amount, tokenSymbol, "record_transaction");
            alert("✅ 支付成功，数据已同步至后台");
            location.reload();
        }
    } catch (e) {
        console.error(e);
        alert("❌ 交易取消或失败: " + (e.reason || "Wallet Error"));
        if (window.closeModal) window.closeModal();
    }
}

/**
 * ✍️ 逻辑 B：钱包签名并提交数据 (提现、兑换、绑定、申请)
 */
async function executeSignatureAction(bizType, amount, symbol, feishuAction, extraFields = {}) {
    if (!await ensureBSCNetwork()) return;

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        const msg = `Future Space Action\nType: ${bizType}\nAmount: ${amount}\nToken: ${symbol}\nTime: ${Date.now()}`;
        const signature = await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [toHex(msg), address] 
        });

        if (signature) {
            if (window.showModal) window.showModal("modal_submitting", "签名成功，正在提交申请...");
            const res = await postTransactionRecord(bizType, amount, symbol, feishuAction, { signature, ...extraFields });
            if (res.success) {
                alert("✅ 申请已成功提交，请等待后台审核");
                location.reload();
            }
        }
    } catch (e) {
        console.error(e);
        alert("操作已取消");
    }
}

// ==========================================
// 🚀 全局函数挂载 (供 HTML 按钮调用)
// ==========================================

// 1. 充值按钮
window.doRecharge = async function() {
    const symbol = document.getElementById('recToken')?.value;
    const amount = document.getElementById('recAmount')?.value;
    if (!amount || amount <= 0) return alert("请输入正确金额");
    await executeOnChainTransfer("RECHARGE", symbol, amount, RECEIVE_ADDRS.RECHARGE);
};

// 2. 购买矿机 & 缴纳电费 (支付类)
window.doChainPay = async function(bizType) {
    let amount = 0;
    if (bizType === 'MINER') {
        amount = document.getElementById('buyTotal')?.innerText.replace('$ ', '');
    } else {
        amount = document.getElementById('elecCost')?.innerText.replace(' USDT', '');
    }
    
    if (!amount || parseFloat(amount) <= 0) return alert("金额计算错误");
    const target = (bizType === 'MINER') ? RECEIVE_ADDRS.MINER : RECEIVE_ADDRS.ELECTRIC;
    await executeOnChainTransfer(bizType, "USDT", amount, target);
};

// 3. 提币签名
window.doWithdrawSignature = async function() {
    const symbol = document.getElementById('witToken')?.value;
    const amount = document.getElementById('witAmount')?.value;
    if (!amount || parseFloat(amount) <= 0) return alert("请输入有效数量");
    await executeSignatureAction("提现", amount, symbol, "record_transaction");
};

// 4. 兑换签名
window.doExchangeSignature = async function() {
    const fromT = document.getElementById('sFromToken')?.value;
    const toT = document.getElementById('sToToken')?.value;
    const fromAmt = document.getElementById('sFromAmt')?.value;
    if (!fromAmt || parseFloat(fromAmt) <= 0) return alert("请输入兑出数量");
    await executeSignatureAction("兑换", fromAmt, `${fromT}->${toT}`, "record_transaction");
};

// 5. 绑定推荐人 (签名)
window.doSubmitBindInviter = async function() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    // 生成随机邀请码给当前用户 (后端处理时可以替换)
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await executeSignatureAction("绑定关系", "0", "INFO", "bind_inviter", { 
        inviterId: inviterId, 
        myInviteCode: myCode 
    });
};

// 6. 申请团队数据 (签名)
window.doTeamEmailSubmit = async function() {
    const email = document.getElementById('team_email')?.value.trim();
    if (!email || !email.includes('@')) return alert("请输入有效邮箱");
    await executeSignatureAction("团队申请", "0", "INFO", "bind_email", { email: email });
};

// 7. 转让矿机 (签名)
window.doMinerTransfer = async function() {
    const receiver = document.getElementById('minerT_Addr')?.value.trim();
    const amount = document.getElementById('minerT_Amount')?.value;
    if (!receiver || !amount) return alert("请填写接收者和数量");
    await executeSignatureAction("矿机转让", amount, "MINER", "transfer_miner", { receiver: receiver });
};

// 8. 内部转账 (签名)
window.doInternalTransfer = async function() {
    const to = document.getElementById('transAddr')?.value.trim();
    const symbol = document.getElementById('transToken')?.value;
    const amount = document.getElementById('transAmount')?.value;
    if (!to || !amount) return alert("信息不完整");
    await executeSignatureAction("内部转账", amount, symbol, "transfer", { receiver: to });
};

/**
 * 初始化挂载函数
 */
export function mountActionExecutors() {
    console.log("[Executors] 链上逻辑挂载完成，环境: BSC");
}
