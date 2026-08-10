import { getReceiveAddress, getContractAddress, getCurrentChainConfig, setCurrentChain, CHAIN_CONTRACT_ADDRS } from './config.js';
import { postTransactionRecord } from './api-service.js';

// 导入 fetchUserData 用于刷新数据
let fetchUserDataFunc = null;

// 🚨 防重复提交标记
let isSubmitting = false;
let isSubmittingSince = 0;
const SUBMIT_TIMEOUT_MS = 60000; // 60秒强制重置，防止标志卡死

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
    // 诊断日志
    console.log('[getEVMProvider] window.ethereum:', !!window.ethereum,
                'window.bitkeep:', !!window.bitkeep,
                'window.tokenpocket:', !!window.tokenpocket);

    // 1. 优先检测 window.ethereum（大多数钱包的标准注入方式）
    try {
        if (window.ethereum && typeof window.ethereum.request === 'function') {
            console.log('[getEVMProvider] 使用 window.ethereum');
            return window.ethereum;
        }
    } catch (e) { /* ignore */ }

    // 2. Bitget 钱包（优先检测 isBitkeep 标志）
    try {
        if (window.ethereum && window.ethereum.isBitkeep) {
            console.log('[getEVMProvider] 使用 window.ethereum (isBitkeep)');
            return window.ethereum;
        }
    } catch (e) { /* ignore */ }

    try {
        if (window.bitkeep) {
            console.log('[getEVMProvider] 检测到 window.bitkeep');
            try {
                if (window.bitkeep.ethereum && typeof window.bitkeep.ethereum.request === 'function') {
                    console.log('[getEVMProvider] 使用 window.bitkeep.ethereum');
                    return window.bitkeep.ethereum;
                }
            } catch (e) { /* getter 可能抛异常 */ }
            if (typeof window.bitkeep.request === 'function') {
                console.log('[getEVMProvider] 使用 window.bitkeep (request)');
                return window.bitkeep;
            }
            if (typeof window.bitkeep.send === 'function') {
                console.log('[getEVMProvider] 使用 window.bitkeep (send)');
                return window.bitkeep;
            }
            return window.bitkeep;
        }
    } catch (e) { /* ignore */ }

    // 3. TP 钱包
    try {
        if (window.tokenpocket) {
            console.log('[getEVMProvider] 检测到 window.tokenpocket');
            try {
                if (window.tokenpocket.ethereum && typeof window.tokenpocket.ethereum.request === 'function') {
                    console.log('[getEVMProvider] 使用 window.tokenpocket.ethereum');
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

    // 4. 多钱包环境：检查 providers 数组 (EIP-5749)
    try {
        if (window.ethereum && Array.isArray(window.ethereum.providers)) {
            for (const p of window.ethereum.providers) {
                if (p && typeof p.request === 'function') {
                    console.log('[getEVMProvider] 使用 providers 数组中的 provider');
                    return p;
                }
            }
        }
    } catch (e) { /* ignore */ }

    console.warn('[getEVMProvider] 未检测到任何 EVM provider');
    return null;
}

/**
 * 🔒 核心：强制切换/添加当前选中的区块链
 * 非阻塞式：切链失败不阻止后续操作（钱包可能已在正确链上）
 */
async function ensureNetwork() {
    const provider = getEVMProvider();
    if (!provider) {
        console.warn('[ensureNetwork] 未检测到 EVM provider');
        return false;
    }

    const chainConfig = getCurrentChainConfig();
    const targetChainId = chainConfig.chainId;
    const targetChainIdDecimal = String(chainConfig.chainIdDecimal);

    try {
        // 带超时的 RPC 调用（5 秒超时）
        const currentChainId = await Promise.race([
            provider.request({ method: 'eth_chainId' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('eth_chainId 超时')), 5000))
        ]);

        // 已在正确链上
        if (currentChainId === targetChainId || currentChainId === targetChainIdDecimal) {
            console.log('[ensureNetwork] 已在目标链:', chainConfig.chainName);
            return true;
        }

        console.log('[ensureNetwork] 当前链:', currentChainId, '目标链:', targetChainId, '尝试切换...');

        // 尝试切链（带超时）
        try {
            await Promise.race([
                provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetChainId }],
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('wallet_switchEthereumChain 超时')), 10000))
            ]);
            console.log('[ensureNetwork] 切链成功');
            return true;
        } catch (switchError) {
            if (switchError.code === 4902 || switchError.message?.includes('超时')) {
                // 链不存在或超时，尝试添加
                try {
                    await Promise.race([
                        provider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: chainConfig.chainId,
                                chainName: chainConfig.chainName,
                                nativeCurrency: chainConfig.nativeCurrency,
                                rpcUrls: chainConfig.rpcUrls,
                                blockExplorerUrls: chainConfig.blockExplorerUrls
                            }]
                        }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('wallet_addEthereumChain 超时')), 10000))
                    ]);
                    console.log('[ensureNetwork] 添加链成功');
                    return true;
                } catch (addError) {
                    console.warn('[ensureNetwork] 添加链失败:', addError.message);
                }
            } else {
                console.warn('[ensureNetwork] 切链失败:', switchError.message);
            }
            // 切链失败不阻止后续操作
            console.warn('[ensureNetwork] 切链失败，继续尝试后续操作');
            return true;
        }
    } catch (error) {
        console.warn('[ensureNetwork] 获取链ID失败:', error.message, '继续尝试后续操作');
        // 不阻止后续操作，钱包可能已在正确链上
        return true;
    }
}

/**
 * 💸 逻辑 A：链上真实转账 (用于：充值、购买矿机、缴电费)
 * 增加：金额清洗与余额预检查逻辑
 * 兼容 Bitget/TP/MetaMask 等钱包
 */
async function executeOnChainTransfer(bizType, tokenSymbol, rawAmount, targetAddr) {
    // 防重复提交 + 超时强制重置
    if (isSubmitting) {
        const elapsed = Date.now() - isSubmittingSince;
        if (elapsed > SUBMIT_TIMEOUT_MS) {
            console.warn(`[Executors] isSubmitting 已卡 ${(elapsed/1000).toFixed(0)}s，强制重置`);
            isSubmitting = false;
        } else {
            const msg = `⏳ 上一笔交易正在处理中，请稍候再试`;
            console.warn("[Executors] 检测到重复提交:", msg);
            if (window.showToast) window.showToast(msg, "warning", 3000);
            else alert(msg);
            return;
        }
    }
    isSubmitting = true;
    isSubmittingSince = Date.now();

    const evmProvider = getEVMProvider();
    if (!evmProvider) {
        isSubmitting = false;
        isSubmittingSince = 0;
        alert("未检测到钱包，请在 Web3 钱包浏览器中打开");
        return;
    }

    // 先切换到 BSC 链（Bitget 钱包在正确链上才能正常请求账号）
    if (!await ensureNetwork()) {
        isSubmitting = false;
        isSubmittingSince = 0;
        return;
    }

    // 获取钱包地址（兼容 Bitget 钱包：先试 eth_accounts，再试 eth_requestAccounts）
    let userAddress = null;
    try {
        if (window.showModal) window.showModal("modal_processing", "正在连接钱包...");

        // 带超时的 RPC 请求封装
        const rpcWithTimeout = (provider, method, params, timeoutMs = 8000) => {
            return Promise.race([
                provider.request({ method, params }),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`${method} 超时`)), timeoutMs))
            ]);
        };

        // 1. 先尝试 eth_accounts（已连接的钱包会直接返回地址，不弹窗）
        let accounts = [];
        try {
            accounts = await rpcWithTimeout(evmProvider, 'eth_accounts');
        } catch (e) {
            console.warn('[Executors] eth_accounts 失败:', e.message);
        }

        // 2. 如果没拿到地址，尝试 eth_requestAccounts（会弹窗请求授权）
        if (!accounts || accounts.length === 0) {
            try {
                accounts = await rpcWithTimeout(evmProvider, 'eth_requestAccounts', [], 15000);
            } catch (e) {
                console.warn('[Executors] eth_requestAccounts 失败:', e.message);
                // 3. 尝试旧版 enable() API（部分旧版 Bitget 钱包仅支持 enable）
                try {
                    if (typeof evmProvider.enable === 'function') {
                        console.log('[Executors] 尝试 enable() 方式连接');
                        accounts = await Promise.race([
                            evmProvider.enable(),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('enable 超时')), 15000))
                        ]);
                    }
                } catch (e2) {
                    console.warn('[Executors] enable() 失败:', e2.message);
                }
                // 4. Bitget 钱包专用：通过 bitkeep 对象获取
                if ((!accounts || accounts.length === 0) && window.bitkeep && window.bitkeep.ethereum) {
                    try {
                        accounts = await rpcWithTimeout(window.bitkeep.ethereum, 'eth_requestAccounts', [], 15000);
                    } catch (e3) {
                        console.warn('[Executors] Bitget 专用方式也失败:', e3.message);
                    }
                }
            }
        }

        userAddress = accounts && accounts[0];
        if (!userAddress) throw new Error("未获取到钱包地址，请确保钱包已解锁并已连接");

        // 同步写入 localStorage（postTransactionRecord 依赖此值）
        const existingAddr = localStorage.getItem('fbs_address');
        if (!existingAddr || existingAddr.toLowerCase() !== userAddress.toLowerCase()) {
            localStorage.setItem('fbs_address', userAddress);
            localStorage.setItem('fbs_chain', 'BSC');
            console.log('[Executors] 已更新 localStorage 钱包地址:', userAddress);
        }
    } catch (e) {
        isSubmitting = false;
        isSubmittingSince = 0;
        alert("钱包连接失败: " + (e.message || "用户拒绝连接"));
        return;
    }

    try {
        // --- 1. 金额强力清洗：只保留数字和小数点 ---
        const cleanAmount = String(rawAmount).replace(/[^\d.]/g, '');
        if (!cleanAmount || isNaN(parseFloat(cleanAmount))) {
            throw new Error("无效的金额格式");
        }

        const chainConfig = getCurrentChainConfig();
        const nativeSymbol = chainConfig.nativeCurrency.symbol;
        const decimals = window.TOKEN_DECIMALS?.[tokenSymbol] || chainConfig.nativeCurrency.decimals;
        const amountToPay = ethers.parseUnits(cleanAmount, decimals);

        // --- 2. 转账前检查余额（查询失败不阻止交易，让钱包自行校验）---
        if (window.showModal) window.showModal("modal_processing", "正在检查余额...");

        let userBalance = BigInt(0);
        let balanceOk = false;

        try {
            if (tokenSymbol === nativeSymbol) {
                const balanceHex = await Promise.race([
                    evmProvider.request({ method: 'eth_getBalance', params: [userAddress, 'latest'] }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                ]);
                userBalance = BigInt(balanceHex);
                balanceOk = true;
            } else {
                const contractAddr = getContractAddress(tokenSymbol);
                if (!contractAddr) throw new Error("不支持的代币合约");
                const paddedAddr = userAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
                const balanceData = '0x70a08231' + paddedAddr;

                const balanceHex = await Promise.race([
                    evmProvider.request({ method: 'eth_call', params: [{ to: contractAddr, data: balanceData }, 'latest'] }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                ]);

                if (balanceHex && balanceHex !== '0x' && balanceHex.length > 2) {
                    userBalance = BigInt(balanceHex);
                    balanceOk = true;
                }
            }
        } catch (balErr) {
            // 余额查询失败，不阻止交易，继续让钱包校验
            console.warn('[Executors] 余额查询失败，继续交易让钱包校验:', balErr.message);
        }

        // 只有查询成功且余额不足时才阻止
        if (balanceOk && userBalance < amountToPay) {
            const balStr = tokenSymbol === nativeSymbol
                ? ethers.formatEther(userBalance)
                : ethers.formatUnits(userBalance, decimals);
            throw new Error(`余额不足：您的钱包中 ${tokenSymbol} 余额为 ${balStr}，需要 ${cleanAmount} ${tokenSymbol}`);
        }

        console.log('[Executors] 余额检查完成，balanceOk:', balanceOk);

        // --- 3. 发起交易 ---
        if (window.showModal) window.showModal("modal_processing", "请在钱包中确认转账...");

        let txHash = null;

        if (tokenSymbol === nativeSymbol) {
            txHash = await Promise.race([
                evmProvider.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: userAddress,
                        to: targetAddr,
                        value: '0x' + amountToPay.toString(16)
                    }]
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('等待钱包确认超时（60秒）')), 60000))
            ]);
        } else {
            const contractAddr = getContractAddress(tokenSymbol);
            if (!contractAddr) throw new Error("不支持的代币合约");

            const paddedTarget = targetAddr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
            const paddedAmount = amountToPay.toString(16).padStart(64, '0');
            const transferData = '0xa9059cbb' + paddedTarget + paddedAmount;

            txHash = await Promise.race([
                evmProvider.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: userAddress,
                        to: contractAddr,
                        data: transferData
                    }]
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('等待钱包确认超时（60秒）')), 60000))
            ]);
        }

        if (!txHash) throw new Error("钱包未返回交易哈希");
        console.log('[Executors] 交易哈希:', txHash);

        // --- 4. 轮询 receipt（原始 RPC，带超时）---
        if (window.showModal) window.showModal("modal_processing", "交易已提交，正在确认...");
        let receipt = null;
        for (let i = 0; i < 30; i++) { // 最多 60 秒
            try {
                const r = await Promise.race([
                    evmProvider.request({ method: 'eth_getTransactionReceipt', params: [txHash] }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                ]);
                if (r) {
                    receipt = r;
                    console.log('[Executors] 收到 receipt:', JSON.stringify({ status: r.status, transactionHash: r.transactionHash }));
                    break;
                }
            } catch (e) { /* 忽略，继续轮询 */ }
            await new Promise(r => setTimeout(r, 2000));
        }

        const typeMap = { "RECHARGE": "充值", "MINER": "购买矿机", "ELECTRIC": "缴纳电费" };

        // --- 5. 提交数据到后台 ---
        // 只要拿到 txHash 就提交后台（钱包已确认扣款），receipt 仅用于提示用户
        let backendSuccess = false;
        let txConfirmed = false;

        if (receipt) {
            // 兼容各种 status 格式
            const status = receipt.status;
            txConfirmed = (status === '0x1' || status === 1 || status === true || status === '1');
            console.log('[Executors] 交易状态:', status, '确认:', txConfirmed);

            if (!txConfirmed) {
                // 链上明确失败，不提交后台
                alert(`❌ 链上交易失败，未扣款\n交易哈希: ${txHash}\n可能原因：余额不足或合约执行失败`);
                if (window.closeModal) window.closeModal();
                return;
            }
        } else {
            // receipt 超时未获取到，但钱包已返回 txHash 说明交易已提交
            console.warn('[Executors] receipt 未获取到，但交易已提交，继续提交后台');
            txConfirmed = true; // 假设成功，后台会校验
        }

        // 提交后台
        try {
            if (window.showModal) window.showModal("modal_processing", "交易成功！正在提交记录...");
            console.log('[Executors] 开始提交后台:', { type: typeMap[bizType], amount: cleanAmount, symbol: tokenSymbol });
            const res = await postTransactionRecord(typeMap[bizType] || bizType, cleanAmount, tokenSymbol, "record_transaction");
            console.log('[Executors] 后台返回:', res);
            backendSuccess = res.success || res.code === 0 || res.ok;
        } catch (e) {
            console.error('[Executors] 后台提交异常:', e);
        }

        if (backendSuccess) {
            alert(`✅ ${typeMap[bizType] || '交易'}成功，资产已实时更新\n交易哈希: ${txHash}`);
        } else {
            alert(`✅ 链上交易成功，但后台记录提交失败\n交易哈希: ${txHash}\n请联系客服手动确认`);
        }
        if (window.closeModal) window.closeModal();
    } catch (e) {
        console.error("[Executors] 交易异常详情:", e);

        // 解析更加友好的错误信息
        let msg = e.message || "未知错误";
        if (e.code === 4001 || e.code === 'ACTION_REJECTED' || msg.includes("user rejected") || msg.includes("拒绝")) {
            msg = "您已取消交易签名";
        } else if (msg.includes("insufficient funds")) {
            msg = "手续费 (BNB) 不足";
        } else if (msg.includes("missing revert data") || msg.includes("CALL_EXCEPTION")) {
            msg = "合约调用失败，请确认钱包已切换到 BSC 网络且有足够余额";
        }

        alert("❌ 交易失败: " + msg);
        if (window.closeModal) window.closeModal();
    } finally {
        isSubmitting = false;
        isSubmittingSince = 0;
    }
}

/**
 * ✍️ 逻辑 B：钱包签名并提交数据 (用于：提现、兑换、绑定、团队、矿机转让、内转)
 */
async function executeSignatureAction(bizType, amount, symbol, feishuAction, extraFields = {}) {
    // 🚨 防重复提交检查 + 超时强制重置
    if (isSubmitting) {
        const elapsed = Date.now() - isSubmittingSince;
        if (elapsed > SUBMIT_TIMEOUT_MS) {
            console.warn(`[Executors] isSubmitting 已卡 ${(elapsed/1000).toFixed(0)}s 超过60秒，强制重置`);
            isSubmitting = false;
        } else {
            const remainSec = Math.ceil((SUBMIT_TIMEOUT_MS - elapsed) / 1000);
            const msg = `⏳ 上一笔操作正在处理中（约剩${remainSec}s），请稍候再试`;
            console.warn("[Executors] 检测到重复提交，已忽略本次请求:", msg);
            if (window.showToast) window.showToast(msg, "warning", 3000);
            else alert(msg);
            return;
        }
    }
    isSubmitting = true;
    isSubmittingSince = Date.now();

    if (!await ensureNetwork()) {
        isSubmitting = false;
        isSubmittingSince = 0;
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
        isSubmittingSince = 0;
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

    // 检查当前链是否支持 USDT 合约支付，不支持则临时强制 BSC（不触发 UI 退出）
    const originalChain = window.currentChain || 'BSC';
    const hasUSDTContract = !!(CHAIN_CONTRACT_ADDRS[originalChain] && CHAIN_CONTRACT_ADDRS[originalChain]['USDT']);

    if (!hasUSDTContract && originalChain !== 'BSC') {
        console.log(`[doChainPay] 当前链 ${originalChain} 不支持 USDT 合约支付，临时切换到 BSC`);
        // 仅切换 config.js 内部链配置，不触发 UI 退出登录
        setCurrentChain('BSC');
    }

    console.log(`[${bizType}] 收款地址: ${target} (支付链: BSC)`);
    try {
        await executeOnChainTransfer(bizType, "USDT", amount, target);
    } finally {
        // 支付完成后恢复原链配置
        if (!hasUSDTContract && originalChain !== 'BSC') {
            setCurrentChain(originalChain);
        }
    }
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
