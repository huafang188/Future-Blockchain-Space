import { RECEIVE_ADDRS, CONTRACT_ADDRS, BSC_CHAIN_ID, getReceiveAddress } from './config.js';
import { postTransactionRecord } from './api-service.js';
import { refreshAssetDisplay } from './ui-render.js';

// 导入 fetchUserData 用于刷新数据
let fetchUserDataFunc = null;

// 初始化 fetchUserData 函数引用
function initFetchUserData() {
    if (!fetchUserDataFunc && window.fetchUserData) {
        fetchUserDataFunc = window.fetchUserData;
    }
}

// 刷新用户数据（从后端获取最新数据）
async function refreshUserDataAfterTransaction() {
    initFetchUserData();
    const address = localStorage.getItem('fbs_address');
    if (address && fetchUserDataFunc) {
        console.log('[Executors] 交易完成，正在刷新用户数据...');
        await fetchUserDataFunc(address);
    }
}

// 当前用户信息（从全局状态获取）
function getUserInfo() {
    return window.currentUserInfo || {};
}

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
        // 兼容处理：有些钱包返回十进制 '56'，有些返回十六进制 '0x38'
        if (currentChainId !== BSC_CHAIN_ID && currentChainId !== '56') {
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
 * 💸 逻辑 A：链上真实转账 (用于：充值、购买矿机、缴电费)
 * 增加：金额清洗与余额预检查逻辑
 */
async function executeOnChainTransfer(bizType, tokenSymbol, rawAmount, targetAddr) {
    if (!await ensureBSCNetwork()) return;

    try {
        // --- 1. 金额强力清洗：只保留数字和小数点 ---
        const cleanAmount = String(rawAmount).replace(/[^\d.]/g, '');
        if (!cleanAmount || isNaN(parseFloat(cleanAmount))) {
            throw new Error("无效的金额格式");
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        if (window.showModal) window.showModal("modal_processing", "正在检查余额...");

        let tx;
        if (tokenSymbol === 'BNB') {
            // 原生代币检查
            const bnbBalance = await provider.getBalance(userAddress);
            const amountInWei = ethers.parseEther(cleanAmount);
            if (bnbBalance < amountInWei) throw new Error("您的钱包 BNB 余额不足");

            tx = await signer.sendTransaction({
                to: targetAddr,
                value: amountInWei
            });
        } else {
            // 合约代币 (USDT等)
            const contractAddr = CONTRACT_ADDRS[tokenSymbol];
            if (!contractAddr) throw new Error("不支持的代币合约");
            
            const contract = new ethers.Contract(contractAddr, [
                "function transfer(address to, uint256 amount) public returns (bool)",
                "function balanceOf(address owner) view returns (uint256)"
            ], signer);

            // 预检查代币余额
            const balance = await contract.balanceOf(userAddress);
            const amountToPay = ethers.parseUnits(cleanAmount, 18);
            
            if (balance < amountToPay) {
                throw new Error(`余额不足：您的钱包中 ${tokenSymbol} 数量不足`);
            }

            if (window.showModal) window.showModal("modal_processing", "正在等待钱包确认...");
            tx = await contract.transfer(targetAddr, amountToPay);
        }

        const receipt = await tx.wait();
        if (receipt.status === 1) {
            const typeMap = { "RECHARGE": "充值", "MINER": "购买矿机", "ELECTRIC": "缴纳电费" };
            // 提交成功记录到后台，不刷新页面
            const res = await postTransactionRecord(typeMap[bizType] || bizType, cleanAmount, tokenSymbol, "record_transaction");
            if (res.success) {
                alert(`✅ ${typeMap[bizType] || '交易'}成功，资产已实时更新`);
                if (window.closeModal) window.closeModal();
                // 延迟500ms后刷新用户数据（等待后端处理完成）
                setTimeout(async () => {
                    await refreshUserDataAfterTransaction();
                }, 500);
            }
        }
    } catch (e) {
        console.error("[Executors] 交易异常详情:", e);
        
        // 解析更加友好的错误信息
        let msg = e.message || "未知错误";
        if (e.code === 'ACTION_REJECTED' || msg.includes("user rejected")) {
            msg = "您已取消交易签名";
        } else if (msg.includes("insufficient funds")) {
            msg = "手续费 (BNB) 不足";
        } else if (e.action === 'estimateGas') {
            msg = "Gas 预估失败，请确保钱包有足够代币和 BNB 手续费";
        }

        alert("❌ 交易失败: " + msg);
        if (window.closeModal) window.closeModal();
    }
}

/**
 * ✍️ 逻辑 B：钱包签名并提交数据 (用于：提现、兑换、绑定、团队、矿机转让、内转)
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
            if (window.showModal) window.showModal("modal_submitting", "签名成功，正在同步后台...");
            const res = await postTransactionRecord(bizType, amount, symbol, feishuAction, { signature, ...extraFields });
            if (res.success) {
                alert(`✅ ${bizType}申请已成功提交`);
                if (window.closeModal) window.closeModal();
                // 延迟500ms后刷新用户数据（等待后端处理完成）
                setTimeout(async () => {
                    await refreshUserDataAfterTransaction();
                }, 500);
            }
        }
    } catch (e) {
        console.error("[Executors] 签名异常:", e);
        if (e.code === 4001) {
            alert("您已取消签名授权");
        } else {
            alert("签名操作失败，请重试");
        }
        if (window.closeModal) window.closeModal();
    }
}

// ==========================================
// 🚀 全局映射挂载
// ==========================================

// 1. 充值（支持按团队分流）
window.doRecharge = async function() {
    const symbol = document.getElementById('recToken')?.value;
    const amount = document.getElementById('recAmount')?.value;
    if (!amount || parseFloat(amount) <= 0) return alert("请输入正确金额");
    
    // 获取用户信息进行地址分流
    const userInfo = getUserInfo();
    const receiveAddr = getReceiveAddress('RECHARGE', userInfo);
    
    console.log(`[Recharge] 分流地址: ${receiveAddr} (团队: ${userInfo.team || '默认'})`);
    await executeOnChainTransfer("RECHARGE", symbol, amount, receiveAddr);
};

// 2. 购买矿机 & 缴纳电费（支持按团队分流）
window.doChainPay = async function(bizType) {
    let rawValue = "";
    if (bizType === 'MINER') {
        rawValue = document.getElementById('buyTotal')?.innerText || "0";
    } else {
        rawValue = document.getElementById('elecCost')?.innerText || "0";
    }
    
    // 清洗掉 $ 或 USDT 字符
    const amount = rawValue.replace(/[^\d.]/g, '');
    if (!amount || parseFloat(amount) <= 0) return alert("金额计算异常，请重试");

    // 获取用户信息进行地址分流
    const userInfo = getUserInfo();
    const addrType = (bizType === 'MINER') ? 'MINER' : 'ELECTRIC';
    const target = getReceiveAddress(addrType, userInfo);
    
    console.log(`[${bizType}] 分流地址: ${target} (团队: ${userInfo.team || '默认'})`);
    // 强制使用 USDT 支付
    await executeOnChainTransfer(bizType, "USDT", amount, target);
};

// 3. 提币
window.doWithdrawSignature = async function() {
    const symbol = document.getElementById('witToken')?.value;
    const amount = document.getElementById('witAmount')?.value;
    if (!amount || parseFloat(amount) <= 0) return alert("请输入提现数量");
    await executeSignatureAction("提现", amount, symbol, "record_transaction");
};

// 4. 兑换
window.doExchangeSignature = async function() {
    const fromT = document.getElementById('sFromToken')?.value;
    const toT = document.getElementById('sToToken')?.value;
    const fromAmt = document.getElementById('sFromAmt')?.value;
    if (!fromAmt || parseFloat(fromAmt) <= 0) return alert("请输入兑换数量");
    await executeSignatureAction("兑换", fromAmt, `${fromT}->${toT}`, "record_transaction");
};

// 5. 绑定推荐人
window.doSubmitBindInviter = async function() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await executeSignatureAction("绑定关系", "0", "INFO", "bind_inviter", { 
        inviterId: inviterId, 
        myInviteCode: myCode 
    });
};

// 6. 申请团队数据
window.doTeamEmailSubmit = async function() {
    const email = document.getElementById('team_email')?.value.trim();
    if (!email || !email.includes('@')) return alert("请输入有效邮箱");
    await executeSignatureAction("团队申请", "0", "INFO", "bind_email", { email: email });
};

// 7. 转让矿机
window.doMinerTransfer = async function() {
    const receiver = document.getElementById('minerT_Addr')?.value.trim();
    const amount = document.getElementById('minerT_Amount')?.value;
    if (!receiver || !amount || parseFloat(amount) <= 0) return alert("请填写接收地址和数量");
    await executeSignatureAction("矿机转让", amount, "MINER", "transfer_miner", { receiver: receiver });
};

// 8. 内部转账
window.doInternalTransfer = async function() {
    const to = document.getElementById('transAddr')?.value.trim();
    const symbol = document.getElementById('transToken')?.value;
    const amount = document.getElementById('transAmount')?.value;
    if (!to || !amount || parseFloat(amount) <= 0) return alert("转账信息不完整");
    await executeSignatureAction("内部转账", amount, symbol, "transfer", { receiver: to });
};

export function mountActionExecutors() {
    console.log("[Executors] 核心交易逻辑已挂载 (含余额预检与金额清洗)");
}
