import { getReceiveAddress, getContractAddress, getCurrentChainConfig } from './config.js';
import { postTransactionRecord } from './api-service.js';

// 导入 fetchUserData 用于刷新数据
let fetchUserDataFunc = null;

// 🚨 防重复提交标记
let isSubmitting = false;

// 🔒 结算处理中标记（防止用户在 Apps Script 结算完成前重复提交）
let settlementProcessing = false;
let settlementTimer = null;

/**
 * 检查是否可以提交结算类操作
 * 如果正在结算中，显示提示并返回 false
 */
function canSubmitSettlement() {
    if (settlementProcessing) {
        const remainMs = settlementTimer ? Math.max(0, settlementTimer._endTime - Date.now()) : 0;
        const remainSec = Math.ceil(remainMs / 1000);
        const msg = remainSec > 0
            ? `⏳ 上一笔结算仍在处理中 (约剩 ${remainSec}s)，请等待完成后再试`
            : `⏳ 上一笔结算仍在处理中，请等待完成后再试`;
        console.warn("[Executors] 结算处理中，禁止重复提交");
        if (window.showToast) window.showToast(msg, "warning", 3000);
        return false;
    }
    return true;
}

/**
 * 锁定结算提交（结算开始时调用）
 */
function lockSettlement(maxWaitMs = 32000) {
    settlementProcessing = true;
    // 添加页面全局"结算中"标识
    document.body?.classList.add('settlement-processing');

    // 最大等待时间后自动解锁（防止极端情况死锁）
    if (settlementTimer) clearTimeout(settlementTimer);
    settlementTimer = setTimeout(() => {
        unlockSettlement(true);
    }, maxWaitMs);
    settlementTimer._endTime = Date.now() + maxWaitMs;

    // 显示结算中指示
    showSettlementIndicator();
}

/**
 * 解锁结算提交（结算完成或失败时调用）
 */
function unlockSettlement(forced = false) {
    settlementProcessing = false;
    document.body?.classList.remove('settlement-processing');
    if (settlementTimer) {
        clearTimeout(settlementTimer);
        settlementTimer = null;
    }
    if (forced) {
        console.warn("[Executors] 结算锁超时，强制解锁");
    }
    hideSettlementIndicator();
}

/**
 * 显示结算中指示（页面顶部黄色条）
 */
function showSettlementIndicator() {
    let bar = document.getElementById('settlement-indicator');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'settlement-indicator';
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#f59e0b,#d97706);color:#fff;text-align:center;padding:10px 16px;font-weight:bold;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.2);transition:all 0.3s;';
        document.body.appendChild(bar);
    }
    bar.style.display = 'block';
    bar.innerHTML = '⏳ 结算处理中，<b>请勿重复提交</b>，数据将在结算完成后自动更新 <span id="settlement-countdown">30</span>s';

    // 倒计时
    let remain = 30;
    const countdownEl = document.getElementById('settlement-countdown');
    const countdownTimer = setInterval(() => {
        remain--;
        if (countdownEl) countdownEl.textContent = remain;
        if (remain <= 0) clearInterval(countdownTimer);
    }, 1000);

    bar._countdownTimer = countdownTimer;
}

/**
 * 隐藏结算中指示
 */
function hideSettlementIndicator() {
    const bar = document.getElementById('settlement-indicator');
    if (bar) {
        if (bar._countdownTimer) clearInterval(bar._countdownTimer);
        bar.style.transition = 'all 0.5s';
        bar.style.opacity = '0';
        setTimeout(() => { bar.remove(); }, 500);
    }
}

// 暴露到全局
window.canSubmitSettlement = canSubmitSettlement;
window.lockSettlement = lockSettlement;
window.unlockSettlement = unlockSettlement;

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

/**
 * ️ 辅助：将文字转为钱包兼容的 Hex 格式
 */
const toHex = (msg) => '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');

/**
 * 兼容旧浏览器的 EVM Provider 检测
 * 所有属性访问都包裹 try-catch，防止旧浏览器访问 getter 时抛出异常
 */
function getEVMProvider() {
    // 1. 优先检测 window.ethereum（大多数钱包的标准注入方式）
    try {
        if (window.ethereum && typeof window.ethereum.request === 'function') {
            return window.ethereum;
        }
    } catch (e) { /* ignore */ }

    // 2. Bitget 钱包
    try {
        if (window.bitkeep) {
            try {
                if (window.bitkeep.ethereum && typeof window.bitkeep.ethereum.request === 'function') {
                    return window.bitkeep.ethereum;
                }
            } catch (e) { /* getter 可能抛异常 */ }
            if (typeof window.bitkeep.request === 'function') return window.bitkeep;
            if (typeof window.bitkeep.send === 'function') return window.bitkeep;
            return window.bitkeep;
        }
    } catch (e) { /* ignore */ }

    // 3. TP 钱包
    try {
        if (window.tokenpocket) {
            try {
                if (window.tokenpocket.ethereum && typeof window.tokenpocket.ethereum.request === 'function') {
                    return window.tokenpocket.ethereum;
                }
            } catch (e) { /* getter 可能抛异常 */ }
            if (typeof window.tokenpocket.request === 'function') return window.tokenpocket;
            if (typeof window.tokenpocket.toEthereum === 'function') {
                return window.tokenpocket.toEthereum();
            }
            return window.tokenpocket;
        }
    } catch (e) { /* ignore */ }

    return null;
}

/**
 * 🔒 核心：强制切换/添加当前选中的区块链
 */
async function ensureNetwork() {
    const provider = getEVMProvider();
    if (!provider) {
        alert("请在 Web3 钱包浏览器中打开");
        return false;
    }
    
    const chainConfig = getCurrentChainConfig();
    const targetChainId = chainConfig.chainId;
    const targetChainIdDecimal = String(chainConfig.chainIdDecimal);
    
    try {
        const currentChainId = await provider.request({ method: 'eth_chainId' });
        // 兼容处理：有些钱包返回十进制，有些返回十六进制
        if (currentChainId !== targetChainId && currentChainId !== targetChainIdDecimal) {
            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetChainId }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: chainConfig.chainId,
                            chainName: chainConfig.chainName,
                            nativeCurrency: chainConfig.nativeCurrency,
                            rpcUrls: chainConfig.rpcUrls,
                            blockExplorerUrls: chainConfig.blockExplorerUrls
                        }]
                    });
                } else {
                    throw switchError;
                }
            }
        }
        return true;
    } catch (error) {
        alert(`请切换至 ${chainConfig.chainName} 网络后再进行操作`);
        return false;
    }
}

/**
 * 💸 逻辑 A：链上真实转账 (用于：充值、购买矿机、缴电费)
 * 增加：金额清洗与余额预检查逻辑
 */
async function executeOnChainTransfer(bizType, tokenSymbol, rawAmount, targetAddr) {
    // 防重复提交
    if (isSubmitting) {
        console.warn("[Executors] 上一笔交易正在处理中，请勿重复提交");
        return;
    }
    isSubmitting = true;

    if (!await ensureNetwork()) {
        isSubmitting = false;
        return;
    }

    try {
        // --- 1. 金额强力清洗：只保留数字和小数点 ---
        const cleanAmount = String(rawAmount).replace(/[^\d.]/g, '');
        if (!cleanAmount || isNaN(parseFloat(cleanAmount))) {
            throw new Error("无效的金额格式");
        }

        const evmProvider = getEVMProvider();
        const provider = new ethers.BrowserProvider(evmProvider);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        if (window.showModal) window.showModal("modal_processing", "正在检查余额...");

        let tx;
        const chainConfig = getCurrentChainConfig();
        const nativeSymbol = chainConfig.nativeCurrency.symbol;
        
        if (tokenSymbol === nativeSymbol) {
            // 原生代币转账
            const balance = await provider.getBalance(userAddress);
            const decimals = chainConfig.nativeCurrency.decimals;
            const amountInWei = ethers.parseUnits(cleanAmount, decimals);
            if (balance < amountInWei) throw new Error(`您的钱包 ${nativeSymbol} 余额不足`);

            tx = await signer.sendTransaction({
                to: targetAddr,
                value: amountInWei
            });
        } else {
            // 合约代币 (USDT等)
            const contractAddr = getContractAddress(tokenSymbol);
            if (!contractAddr) throw new Error("不支持的代币合约");
            
            const contract = new ethers.Contract(contractAddr, [
                "function transfer(address to, uint256 amount) public returns (bool)",
                "function balanceOf(address owner) view returns (uint256)"
            ], signer);

            // 预检查代币余额
            const balance = await contract.balanceOf(userAddress);
            const decimals = window.TOKEN_DECIMALS?.[tokenSymbol] || 18;
            const amountToPay = ethers.parseUnits(cleanAmount, decimals);
            
            if (balance < amountToPay) {
                throw new Error(`余额不足：您的钱包中 ${tokenSymbol} 数量不足`);
            }

            if (window.showModal) window.showModal("modal_processing", "正在等待钱包确认...");
            tx = await contract.transfer(targetAddr, amountToPay);
        }

        const receipt = await tx.wait();
        if (receipt.status === 1) {
            const typeMap = { "RECHARGE": "充值", "MINER": "购买矿机", "ELECTRIC": "缴纳电费" };
            // 提交成功记录到后台 → 【刷新交给 postTransactionRecord 统一处理】
            //   非结算类：立即 + 500ms 补刷
            //   结算类：0s→3s→8s→15s 轮询
            const res = await postTransactionRecord(typeMap[bizType] || bizType, cleanAmount, tokenSymbol, "record_transaction");
            if (res.success) {
                alert(`✅ ${typeMap[bizType] || '交易'}成功，资产已实时更新`);
                if (window.closeModal) window.closeModal();
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
    } finally {
        isSubmitting = false;
    }
}

/**
 * ✍️ 逻辑 B：钱包签名并提交数据 (用于：提现、兑换、绑定、团队、矿机转让、内转)
 */
async function executeSignatureAction(bizType, amount, symbol, feishuAction, extraFields = {}) {
    // 🚨 防重复提交检查
    if (isSubmitting) {
        console.warn("[Executors] 检测到重复提交，已忽略本次请求");
        return;
    }

    // 🔒 结算类操作：额外检查是否已有结算在进行
    const settleActions = ["exchange", "redeem", "swap", "sell", "buy", "withdraw_exchange"];
    const isSettleAction = settleActions.includes(String(feishuAction).toLowerCase()) ||
        ["兑换", "卖出", "出售", "提现兑换", "实时结算"].some(kw => String(bizType).includes(kw));
    if (isSettleAction && !canSubmitSettlement()) {
        return;
    }

    isSubmitting = true;

    // 结算类操作：锁定提交
    if (isSettleAction) {
        lockSettlement(32000);
    }

    if (!await ensureNetwork()) {
        isSubmitting = false;
        if (isSettleAction) unlockSettlement();
        return;
    }

    try {
        const evmProvider = getEVMProvider();
        const accounts = await evmProvider.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        const msg = `Future Space Action\nType: ${bizType}\nAmount: ${amount}\nToken: ${symbol}\nTime: ${Date.now()}`;
        const signature = await evmProvider.request({ 
            method: 'personal_sign', 
            params: [toHex(msg), address] 
        });

        if (signature) {
            if (window.showModal) window.showModal("modal_submitting", "签名成功，正在同步后台...");
            const res = await postTransactionRecord(bizType, amount, symbol, feishuAction, { signature, ...extraFields });
            if (res.success) {
                alert(`✅ ${bizType}申请已成功提交`);
                // 【刷新交给 postTransactionRecord 统一处理】
                //   普通类（绑定/团队/矿机转让）：立即 + 500ms 补刷
                //   结算类（兑换/提现）：0s→3s→8s→15s 轮询，余额变化提前停止
            } else {
                // 失败时也需要关闭弹窗
                console.warn(`[Executors] ${bizType}提交失败:`, res.error);
            }
            // ✅ 无论成功或失败都关闭弹窗
            if (window.closeModal) window.closeModal();
        }
    } catch (e) {
        console.error("[Executors] 签名异常:", e);
        if (e.code === 4001) {
            alert("您已取消签名授权");
        } else {
            alert("签名操作失败，请重试");
        }
        if (window.closeModal) window.closeModal();
    } finally {
        // ✅ 确保无论成功或失败，都重置提交状态
        isSubmitting = false;
    }
}

// ==========================================
// 🚀 全局映射挂载
// ==========================================

// 1. 充值
window.doRecharge = async function() {
    const symbol = document.getElementById('recToken')?.value;
    const amount = document.getElementById('recAmount')?.value;
    if (!amount || parseFloat(amount) <= 0) return alert("请输入正确金额");
    
    const receiveAddr = getReceiveAddress('RECHARGE');
    console.log(`[Recharge] 收款地址: ${receiveAddr} (链: ${window.currentChain || 'BSC'})`);
    await executeOnChainTransfer("RECHARGE", symbol, amount, receiveAddr);
};

// 2. 购买矿机 & 缴纳电费
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

    const addrType = (bizType === 'MINER') ? 'MINER' : 'ELECTRIC';
    const target = getReceiveAddress(addrType);
    
    console.log(`[${bizType}] 收款地址: ${target} (链: ${window.currentChain || 'BSC'})`);
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
window.doSubmitBindInviter = async function(event) {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 显示加载状态
    const btn = document.getElementById('btn_bind_inviter');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "绑定中...";
        btn.disabled = true;
        
        // 添加进度提示
        const progressDiv = document.createElement('div');
        progressDiv.id = 'bind-progress';
        progressDiv.className = 'text-center text-xs text-slate-500 mt-2';
        progressDiv.textContent = '正在连接钱包...';
        btn.parentNode.appendChild(progressDiv);
        
        // 监听签名进度
        const originalShowModal = window.showModal;
        window.showModal = function(title, content) {
            const progress = document.getElementById('bind-progress');
            if (progress) progress.textContent = '等待钱包签名确认...';
            originalShowModal(title, content);
        };
        
        try {
            await executeSignatureAction("绑定关系", "0", "INFO", "bind_inviter", { 
                inviterId: inviterId, 
                myInviteCode: myCode 
            });
            
            // 更新进度
            const progress = document.getElementById('bind-progress');
            if (progress) progress.textContent = '绑定成功！正在刷新数据...';
            
        } finally {
            // 恢复按钮状态
            btn.textContent = originalText;
            btn.disabled = false;
            
            // 移除进度提示
            const progress = document.getElementById('bind-progress');
            if (progress) progress.remove();
            
            // 恢复原始 showModal
            window.showModal = originalShowModal;
        }
    } else {
        await executeSignatureAction("绑定关系", "0", "INFO", "bind_inviter", { 
            inviterId: inviterId, 
            myInviteCode: myCode 
        });
    }
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
