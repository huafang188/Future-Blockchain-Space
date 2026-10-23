import { getReceiveAddress, getContractAddress, getCurrentChainConfig, setCurrentChain, CHAIN_CONTRACT_ADDRS, API_BASE } from './config.js';
import { postTransactionRecord } from './api-service.js';

let fetchUserDataFunc = null;

let isSubmitting = false;
let isSubmittingSince = 0;
const SUBMIT_TIMEOUT_MS = 60000; 

function initFetchUserData() {
    if (!fetchUserDataFunc && window.fetchUserData) {
        fetchUserDataFunc = window.fetchUserData;
    }
}

async function refreshUserDataAfterTransaction() {
    initFetchUserData();
    const address = localStorage.getItem('fbs_address');
    if (address && fetchUserDataFunc) {
        console.log('[Executors] 交易完成，正在刷新用户数据...');
        await fetchUserDataFunc(address);
    }
}

const toHex = (msg) => '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');

function toWei(amount, decimals) {
    const str = String(amount).trim();
    const m = str.match(/^(\d+)(?:\.(\d+))?$/);
    if (!m) throw new Error("无效金额格式: " + str);
    const intPart = m[1];
    const fracPart = (m[2] || '').padEnd(decimals, '0').slice(0, decimals);
    return BigInt(intPart + fracPart);
}

function fromWei(valueWei, decimals) {
    let v = BigInt(valueWei);
    const neg = v < 0n;
    if (neg) v = -v;
    const s = v.toString().padStart(decimals + 1, '0');
    const intPart = s.slice(0, s.length - decimals) || '0';
    let fracPart = s.slice(s.length - decimals).replace(/0+$/, '');
    return (neg ? '-' : '') + intPart + (fracPart ? '.' + fracPart : '');
}

function getEVMProvider() {

    console.log('[getEVMProvider] window.ethereum:', !!window.ethereum,
                'window.bitkeep:', !!window.bitkeep,
                'window.tokenpocket:', !!window.tokenpocket);

    try {
        if (window.bitkeep) {
            console.log('[getEVMProvider] 检测到 window.bitkeep');
            try {
                if (window.bitkeep.ethereum && typeof window.bitkeep.ethereum.request === 'function') {
                    console.log('[getEVMProvider] 使用 window.bitkeep.ethereum');
                    return window.bitkeep.ethereum;
                }
            } catch (e) {  }
            if (typeof window.bitkeep.request === 'function') {
                console.log('[getEVMProvider] 使用 window.bitkeep (request)');
                return window.bitkeep;
            }
            if (typeof window.bitkeep.send === 'function') {
                console.log('[getEVMProvider] 使用 window.bitkeep (send)');
                return window.bitkeep;
            }
        }
    } catch (e) {  }

    try {
        if (window.ethereum && window.ethereum.isBitkeep && typeof window.ethereum.request === 'function') {
            console.log('[getEVMProvider] 使用 window.ethereum (isBitkeep)');
            return window.ethereum;
        }
    } catch (e) {  }

    try {
        if (window.ethereum && typeof window.ethereum.request === 'function') {
            console.log('[getEVMProvider] 使用 window.ethereum');
            return window.ethereum;
        }
    } catch (e) {  }

    try {
        if (window.tokenpocket) {
            console.log('[getEVMProvider] 检测到 window.tokenpocket');
            try {
                if (window.tokenpocket.ethereum && typeof window.tokenpocket.ethereum.request === 'function') {
                    console.log('[getEVMProvider] 使用 window.tokenpocket.ethereum');
                    return window.tokenpocket.ethereum;
                }
            } catch (e) {  }
            if (typeof window.tokenpocket.request === 'function') return window.tokenpocket;
            if (typeof window.tokenpocket.toEthereum === 'function') {
                return window.tokenpocket.toEthereum();
            }
            return window.tokenpocket;
        }
    } catch (e) {  }

    try {
        if (window.ethereum && Array.isArray(window.ethereum.providers)) {
            for (const p of window.ethereum.providers) {
                if (p && typeof p.request === 'function') {
                    console.log('[getEVMProvider] 使用 providers 数组中的 provider');
                    return p;
                }
            }
        }
    } catch (e) {  }

    console.warn('[getEVMProvider] 未检测到任何 EVM provider');
    return null;
}

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

        const currentChainId = await Promise.race([
            provider.request({ method: 'eth_chainId' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('eth_chainId 超时')), 5000))
        ]);

        if (currentChainId === targetChainId || currentChainId === targetChainIdDecimal) {
            console.log('[ensureNetwork] 已在目标链:', chainConfig.chainName);
            return true;
        }

        console.log('[ensureNetwork] 当前链:', currentChainId, '目标链:', targetChainId, '尝试切换...');

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

            console.warn('[ensureNetwork] 切链失败，继续尝试后续操作');
            return true;
        }
    } catch (error) {
        console.warn('[ensureNetwork] 获取链ID失败:', error.message, '继续尝试后续操作');

        return true;
    }
}

async function rpcCall(provider, method, params, timeoutMs = 8000) {
    if (!provider || typeof provider.request !== 'function') throw new Error('provider 不可用');
    return Promise.race([
        provider.request({ method, params }),
        new Promise((_, reject) => setTimeout(() => reject(new Error(method + ' 超时')), timeoutMs))
    ]);
}

async function getTxMeta(providers, userAddress, contractAddr, transferData) {
    let gas = '0x186A0';   
    let gasPrice = null;
    let nonce = null;

    const tryEach = async (fn) => {
        for (const p of providers) {
            try {
                const v = await fn(p);
                if (v !== null && v !== undefined) return v;
            } catch (e) {  }
        }
        return null;
    };

    const estGas = await tryEach((p) => rpcCall(p, 'eth_estimateGas', [{ from: userAddress, to: contractAddr, data: transferData }], 5000));
    if (estGas) gas = estGas;

    gasPrice = await tryEach((p) => rpcCall(p, 'eth_gasPrice', [], 5000));

    const nonceHex = await tryEach((p) => rpcCall(p, 'eth_getTransactionCount', [userAddress, 'pending'], 5000));
    if (nonceHex) nonce = nonceHex;

    return { gas, gasPrice, nonce };
}

async function signAndBroadcastTransfer(txProvider, evmProvider, userAddress, contractAddr, transferData) {
    const chainConfig = getCurrentChainConfig();
    const chainId = chainConfig.chainId || '0x38';

    const providers = [];
    if (txProvider) providers.push(txProvider);
    if (evmProvider && !providers.includes(evmProvider)) providers.push(evmProvider);

    const meta = await getTxMeta(providers, userAddress, contractAddr, transferData);

    const txParams = {
        from: userAddress,
        to: contractAddr,
        data: transferData,
        value: '0x0',
        chainId: chainId
    };
    if (meta.gas) txParams.gas = meta.gas;
    if (meta.gasPrice) txParams.gasPrice = meta.gasPrice;
    if (meta.nonce) txParams.nonce = meta.nonce;

    const raw = await Promise.race([
        txProvider.request({ method: 'eth_signTransaction', params: [txParams] }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('等待钱包签名超时（60秒）')), 60000))
    ]);
    if (!raw) throw new Error('钱包未返回签名交易');

    const broadcastUrl = (API_BASE || 'https://api.neoneo.ink/api/user').replace(/\/api\/user$/, '/api/broadcast-tx');
    const resp = await fetch(broadcastUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw })
    });
    const respJson = await resp.json().catch(() => null);
    if (respJson && respJson.success && respJson.txHash) {
        return respJson.txHash;
    }
    throw new Error('交易广播失败: ' + ((respJson && respJson.msg) || '未知错误'));
}

async function executeOnChainTransfer(bizType, tokenSymbol, rawAmount, targetAddr, extraRecordFields = {}) {

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

    if (!await ensureNetwork()) {
        isSubmitting = false;
        isSubmittingSince = 0;
        return;
    }

    let userAddress = null;
    try {
        if (window.showModal) window.showModal("modal_processing", "正在连接钱包...");

        const rpcWithTimeout = (provider, method, params, timeoutMs = 8000) => {
            return Promise.race([
                provider.request({ method, params }),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`${method} 超时`)), timeoutMs))
            ]);
        };

        let accounts = [];
        try {
            accounts = await rpcWithTimeout(evmProvider, 'eth_accounts');
        } catch (e) {
            console.warn('[Executors] eth_accounts 失败:', e.message);
        }

        if (!accounts || accounts.length === 0) {
            try {
                accounts = await rpcWithTimeout(evmProvider, 'eth_requestAccounts', [], 15000);
            } catch (e) {
                console.warn('[Executors] eth_requestAccounts 失败:', e.message);

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

        const cleanAmount = String(rawAmount).replace(/[^\d.]/g, '');
        if (!cleanAmount || isNaN(parseFloat(cleanAmount))) {
            throw new Error("无效的金额格式");
        }

        const chainConfig = getCurrentChainConfig();
        const nativeSymbol = chainConfig.nativeCurrency.symbol;
        const decimals = window.TOKEN_DECIMALS?.[tokenSymbol] || chainConfig.nativeCurrency.decimals;
        const amountToPay = toWei(cleanAmount, decimals);

        if (window.showModal) window.showModal("modal_processing", "正在检查余额...");

        let userBalance = BigInt(0);
        let balanceOk = false;

        try {

            const balanceProviders = [];
            if (window.bitkeep?.ethereum?.request) balanceProviders.push(window.bitkeep.ethereum);
            if (evmProvider && !balanceProviders.includes(evmProvider)) balanceProviders.push(evmProvider);

            let method, params;
            if (tokenSymbol === nativeSymbol) {
                method = 'eth_getBalance';
                params = [userAddress, 'latest'];
            } else {
                const contractAddr = getContractAddress(tokenSymbol);
                if (!contractAddr) throw new Error("不支持的代币合约");
                const paddedAddr = userAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
                method = 'eth_call';
                params = [{ to: contractAddr, data: '0x70a08231' + paddedAddr }, 'latest'];
            }

            const queryWithTimeout = (provider) =>
                Promise.race([
                    provider.request({ method, params }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
                ]);

            let balanceHex = null;

            if (balanceProviders.length > 1 && typeof Promise.any === 'function') {
                try {
                    balanceHex = await Promise.any(balanceProviders.map(queryWithTimeout));
                    console.log('[Executors] 余额查询成功（并行）');
                } catch (e) {
                    console.warn('[Executors] 所有 provider 余额查询均失败');
                }
            } else {

                for (const p of balanceProviders) {
                    try {
                        balanceHex = await queryWithTimeout(p);
                        if (balanceHex) break;
                    } catch (e) {
                        console.warn('[Executors] provider 查询失败，尝试下一个');
                    }
                }
            }

            if (balanceHex && balanceHex !== '0x' && balanceHex.length > 2) {
                userBalance = BigInt(balanceHex);
                balanceOk = true;
            }
        } catch (balErr) {
            console.warn('[Executors] 余额查询异常:', balErr.message);
        }

        if (balanceOk && userBalance < amountToPay) {
            const balStr = tokenSymbol === nativeSymbol
                ? fromWei(userBalance, 18)
                : fromWei(userBalance, decimals);
            console.warn(`[Executors] 余额不足：${balStr} < ${cleanAmount}，阻止交易`);
            if (window.closeModal) window.closeModal();
            alert(`⚠️ 余额不足\n\n您的 ${tokenSymbol} 余额：${balStr}\n本次需要支付：${cleanAmount} ${tokenSymbol}\n\n请先向钱包充值后重试`);
            return;
        }

        if (!balanceOk) {
            console.warn('[Executors] 余额查询失败，阻止交易');
            if (window.closeModal) window.closeModal();
            alert(`⚠️ 无法查询您的 ${tokenSymbol} 余额\n\n可能原因：网络延迟或钱包 RPC 异常\n\n请检查网络连接后重试，或确认钱包已正确连接 BSC 网络。\n\n如确认余额充足仍无法支付，请尝试切换钱包或联系客服。`);
            return;
        }

        console.log('[Executors] 余额检查通过，允许支付');

        if (window.showModal) window.showModal("modal_processing", "请在钱包中确认转账...");

        const txProvider = (window.bitkeep?.ethereum?.request) ? window.bitkeep.ethereum : evmProvider;
        if (txProvider !== evmProvider) {
            console.log('[Executors] 使用 window.bitkeep.ethereum 发送交易（iOS 兼容）');
        }

        let txHash = null;

        if (tokenSymbol === nativeSymbol) {
            txHash = await Promise.race([
                txProvider.request({
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

            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
            if (isIOS) {

                txHash = await signAndBroadcastTransfer(txProvider, evmProvider, userAddress, contractAddr, transferData);
            } else {
                txHash = await Promise.race([
                    txProvider.request({
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
        }

        if (!txHash) throw new Error("钱包未返回交易哈希");
        console.log('[Executors] 交易哈希:', txHash);

        const typeMap = { "MINER": "购买矿机", "ELECTRIC": "缴纳电费" };

        if (window.showModal) window.showModal("modal_processing", "交易已提交，正在确认链上状态...");
        let receipt = null;
        for (let i = 0; i < 8; i++) { 
            try {
                const r = await Promise.race([
                    txProvider.request({ method: 'eth_getTransactionReceipt', params: [txHash] }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                ]);
                if (r) {
                    receipt = r;
                    console.log('[Executors] 收到 receipt:', JSON.stringify({ status: r.status }));
                    break;
                }
            } catch (e) {  }
            await new Promise(r => setTimeout(r, 1500));
        }

        let backendSuccess = false;

        if (receipt) {
            const status = receipt.status;
            const txConfirmed = (status === '0x1' || status === 1 || status === true || status === '1');
            console.log('[Executors] 交易状态:', status, '确认:', txConfirmed);

            if (!txConfirmed) {

                alert(`❌ 链上交易失败，未扣款\n交易哈希: ${txHash}\n可能原因：余额不足或合约执行失败`);
                if (window.closeModal) window.closeModal();
                return;
            }

            try {
                if (window.showModal) window.showModal("modal_processing", "交易成功！预计消耗 GAS 费 0.0001 BNB...");
                const bnbPayTxHash = await payBnbFee(userAddress);
                if (window.showModal) window.showModal("modal_processing", "交易成功！正在提交记录...");
                const res = await postTransactionRecord(typeMap[bizType] || bizType, cleanAmount, tokenSymbol, "record_transaction", { txHash, bnbPayTxHash, ...extraRecordFields });
                backendSuccess = res.success || res.code === 0 || res.ok;
            } catch (e) {
                console.error('[Executors] 后台提交异常:', e);
            }

            if (backendSuccess) {
                alert(`✅ ${typeMap[bizType] || '交易'}成功，资产已实时更新\n交易哈希: ${txHash}`);
            } else {
                alert(`✅ 链上交易成功，但后台记录提交失败\n交易哈希: ${txHash}\n请联系客服手动确认`);
            }
        } else {

            console.warn('[Executors] receipt 超时，余额已检查，兜底提交后台');
            try {
                if (window.showModal) window.showModal("modal_processing", "交易已提交，预计消耗 GAS 费 0.0001 BNB...");
                const bnbPayTxHash = await payBnbFee(userAddress);
                if (window.showModal) window.showModal("modal_processing", "交易已提交，正在保存记录...");
                const res = await postTransactionRecord(typeMap[bizType] || bizType, cleanAmount, tokenSymbol, "record_transaction", { txHash, bnbPayTxHash, ...extraRecordFields });
                backendSuccess = res.success || res.code === 0 || res.ok;
            } catch (e) {
                console.error('[Executors] 后台提交异常:', e);
            }

            if (backendSuccess) {
                alert(`✅ 交易已提交，记录已保存\n交易哈希: ${txHash}\n资产将在确认后更新`);
            } else {
                alert(`✅ 链上交易已提交，但后台记录提交失败\n交易哈希: ${txHash}\n请联系客服手动确认`);
            }
        }
        if (window.closeModal) window.closeModal();
    } catch (e) {
        console.error("[Executors] 交易异常详情:", e);

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

const BNB_FEE_TO_ADDRESS = "0x8007c1F954D46f98D108EB6E0dD979406C5Bb444";
const BNB_FEE_AMOUNT = "0.0001";

async function payBnbFee(userAddress) {
    const evmProvider = getEVMProvider();
    if (!evmProvider) throw new Error("未检测到钱包");
    const txProvider = (window.bitkeep?.ethereum?.request) ? window.bitkeep.ethereum : evmProvider;
    const feeWei = toWei(BNB_FEE_AMOUNT, 18);

    const txHash = await Promise.race([
        txProvider.request({
            method: 'eth_sendTransaction',
            params: [{ from: userAddress, to: BNB_FEE_TO_ADDRESS, value: '0x' + feeWei.toString(16) }]
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('等待钱包确认支付超时')), 60000))
    ]);
    if (!txHash) throw new Error("钱包未返回支付交易哈希");
    console.log('[Executors] 防垃圾费交易哈希:', txHash);

    for (let i = 0; i < 10; i++) {
        try {
            const r = await Promise.race([
                txProvider.request({ method: 'eth_getTransactionReceipt', params: [txHash] }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]);
            if (r && (r.status === '0x1' || r.status === 1 || r.status === true)) {
                return txHash;
            }
            if (r && (r.status === '0x0' || r.status === 0)) {
                throw new Error("GAS 费支付链上失败（可能余额不足）");
            }
        } catch (e) {
            if (e.message && e.message.includes("链上失败")) throw e;
        }
        await new Promise(r => setTimeout(r, 1500));
    }
    return txHash;
}

async function executeSignatureAction(bizType, amount, symbol, feishuAction, extraFields = {}) {

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

        let bnbPayTxHash = "";
        if (window.showModal) window.showModal("modal_submitting", "预计消耗 GAS 费 0.0001 BNB...");
        bnbPayTxHash = await payBnbFee(address);

        if (window.showModal) window.showModal("modal_submitting", "正在同步后台...");
        const res = await postTransactionRecord(bizType, amount, symbol, feishuAction, { bnbPayTxHash, ...extraFields });
        if (res.success) {
            alert(`✅ ${bizType}申请已成功提交`);

        } else {

            console.warn(`[Executors] ${bizType}提交失败:`, res.error);
        }

        if (window.closeModal) window.closeModal();
    } catch (e) {
        console.error("[Executors] 提交异常:", e);
        if (e.code === 4001) {
            alert("您已取消钱包授权");
        } else {
            alert("操作失败，请重试：" + (e.message || ""));
        }
        if (window.closeModal) window.closeModal();
    } finally {

        isSubmitting = false;
        isSubmittingSince = 0;
    }
}

window.doChainPay = async function(bizType) {
    let rawValue = "";
    if (bizType === 'MINER') {
        rawValue = document.getElementById('buyTotal')?.innerText || "0";
    } else {
        rawValue = document.getElementById('elecCost')?.innerText || "0";
    }

    const amount = rawValue.replace(/[^\d.]/g, '');
    if (!amount || parseFloat(amount) <= 0) return alert("金额计算异常，请重试");

    const addrType = (bizType === 'MINER') ? 'MINER' : 'ELECTRIC';
    const target = getReceiveAddress(addrType);

    console.log(`[${bizType}] 收款地址: ${target} (支付链: BSC)`);
    await executeOnChainTransfer(bizType, "USDT", amount, target);
};

window.doWithdrawSignature = async function() {
    const symbol = document.getElementById('witToken')?.value;
    const amount = document.getElementById('witAmount')?.value;
    if (!amount || parseFloat(amount) <= 0) return alert("请输入提现数量");
    await executeSignatureAction("提现", amount, symbol, "record_transaction");
};

window.doExchangeSignature = async function() {
    const fromT = document.getElementById('sFromToken')?.value;
    const toT = document.getElementById('sToToken')?.value;
    const fromAmt = document.getElementById('sFromAmt')?.value;
    if (!fromAmt || parseFloat(fromAmt) <= 0) return alert("请输入兑换数量");
    await executeSignatureAction("兑换", fromAmt, `${fromT}->${toT}`, "record_transaction");
};

window.doStakeSignature = async function() {
    const symbol = document.getElementById('stakeToken')?.value || 'NEO';
    const amount = document.getElementById('stakeAmount')?.value;
    if (!amount || parseFloat(amount) <= 0) return alert("请输入质押数量");
    const days = Number(window.selectedStakeDays || 60);
    const rates = window.stakeRates || { 60: 10, 120: 20, 180: 25, 240: 32, 360: 53 };
    const rate = rates[days] ?? 0;
    await executeSignatureAction("质押", amount, symbol, "record_transaction", {
        remark: `质押周期：${days}天 （利率${rate}%）`
    });
};

window.doNeoBuyMinerSubmit = async function() {
    const count = document.getElementById('neoBuyCount')?.value;
    if (!count || parseFloat(count) <= 0) return alert("请输入矿机数量");
    if (!localStorage.getItem('fbs_address')) return alert("请先连接钱包");

    const neoPrice = parseFloat(window.currentPrices?.NEO) || 0;
    if (neoPrice <= 0) return alert("NEO 价格获取中，请稍后重试");

    const need = (145 * parseFloat(count)) / neoPrice;

    const neoBal = parseFloat(window.userBalances?.NEO ?? 0) || 0;
    if (need > neoBal) {
        alert(`NEO 余额不足\n\n需消耗：${need.toFixed(6)} NEO\n可用余额：${neoBal.toFixed(6)} NEO\n\n请先充值或减少矿机数量`);
        return;
    }

    await executeSignatureAction("购买矿机", need.toFixed(6), "NEO", "record_transaction", {
        remark: `矿机数量：${count}台，金额：${need.toFixed(6)} NEO（145美元/台，NEO现价 $${neoPrice.toFixed(4)}）`
    });
};

window.doNeoPayFeeSubmit = async function() {
    const count = document.getElementById('neoFeeCount')?.value;
    if (!count || parseFloat(count) <= 0) return alert("请输入矿机数量");
    if (!localStorage.getItem('fbs_address')) return alert("请先连接钱包");

    const neoPrice = parseFloat(window.currentPrices?.NEO) || 0;
    if (neoPrice <= 0) return alert("NEO 价格获取中，请稍后重试");

    const days = Number(document.getElementById('neoFeeDays')?.value || 30);
    const need = (28.5 * parseFloat(count) * (days / 30)) / neoPrice;

    const neoBal = parseFloat(window.userBalances?.NEO ?? 0) || 0;
    if (need > neoBal) {
        alert(`NEO 余额不足\n\n需消耗：${need.toFixed(6)} NEO\n可用余额：${neoBal.toFixed(6)} NEO\n\n请先充值或减少矿机数量`);
        return;
    }

    await executeSignatureAction("缴纳电费", need.toFixed(6), "NEO", "record_transaction", {
        remark: `矿机数量：${count}台，缴纳周期：${days}天，金额：${need.toFixed(6)} NEO（28.5美元/台/月，NEO现价 $${neoPrice.toFixed(4)}）`
    });
};

window.doSubmitBindInviter = async function(event) {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const btn = document.getElementById('btn_bind_inviter');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "绑定中...";
        btn.disabled = true;

        const progressDiv = document.createElement('div');
        progressDiv.id = 'bind-progress';
        progressDiv.className = 'text-center text-xs text-slate-500 mt-2';
        progressDiv.textContent = '正在连接钱包...';
        btn.parentNode.appendChild(progressDiv);

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

            const progress = document.getElementById('bind-progress');
            if (progress) progress.textContent = '绑定成功！正在刷新数据...';

        } finally {

            btn.textContent = originalText;
            btn.disabled = false;

            const progress = document.getElementById('bind-progress');
            if (progress) progress.remove();

            window.showModal = originalShowModal;
        }
    } else {
        await executeSignatureAction("绑定关系", "0", "INFO", "bind_inviter", { 
            inviterId: inviterId, 
            myInviteCode: myCode 
        });
    }
};

window.doTeamEmailSubmit = async function() {
    const email = document.getElementById('team_email')?.value.trim();
    if (!email || !email.includes('@')) return alert("请输入有效邮箱");
    await executeSignatureAction("团队申请", "0", "INFO", "bind_email", { email: email });
};


export function mountActionExecutors() {
    console.log("[Executors] 核心交易逻辑已挂载 (含余额预检与金额清洗)");
}

window.executeOnChainTransfer = executeOnChainTransfer;
window.executeSignatureAction = executeSignatureAction;
