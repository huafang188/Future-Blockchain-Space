
export function mountWalletClickHandler() {

    let isProcessing = false;

    function handleWalletClick() {
        console.log("[Wallet] 按钮点击");

        if (isProcessing) {
            console.log("[Wallet] 正在处理中，忽略重复点击");
            return;
        }

        const savedAddr = localStorage.getItem('fbs_address');

        if (savedAddr) {

            isProcessing = true;
            try {
                logout();
            } finally {

                isProcessing = false;
            }
        } else {

            isProcessing = true;

            const unlock = () => { isProcessing = false; };
            const p = connectWallet();
            if (p && typeof p.then === 'function') {
                p.then(unlock, unlock);
            } else {
                isProcessing = false;
            }
        }
    }

    window.handleWalletClick = handleWalletClick;

    function bindTouchFeedback() {
        const walletBtn = document.getElementById('walletAddr');
        if (walletBtn && !walletBtn.dataset.touchBound) {
            walletBtn.dataset.touchBound = '1';
            walletBtn.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.95)';
            }, { passive: true });
            walletBtn.addEventListener('touchend', function() {
                this.style.transform = 'scale(1)';
            }, { passive: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindTouchFeedback);
    } else {
        bindTouchFeedback();
    }
}

function getEVMProvider() {

    try {
        if (window.ethereum && typeof window.ethereum.request === 'function') {
            return window.ethereum;
        }
    } catch (e) {  }

    try {
        if (window.bitkeep) {
            try {
                if (window.bitkeep.ethereum && typeof window.bitkeep.ethereum.request === 'function') {
                    return window.bitkeep.ethereum;
                }
            } catch (e) {  }

            if (typeof window.bitkeep.request === 'function') return window.bitkeep;
            if (typeof window.bitkeep.send === 'function') return window.bitkeep;
            return window.bitkeep;
        }
    } catch (e) {  }

    try {
        if (window.tokenpocket) {
            try {
                if (window.tokenpocket.ethereum && typeof window.tokenpocket.ethereum.request === 'function') {
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
        if (window.ethereum && window.ethereum.isMetaMask) {
            return window.ethereum;
        }
    } catch (e) {  }

    try {
        if (window.trustwallet) {
            try {
                if (window.trustwallet.ethereum && typeof window.trustwallet.ethereum.request === 'function') {
                    return window.trustwallet.ethereum;
                }
            } catch (e) {  }
            if (typeof window.trustwallet.request === 'function') return window.trustwallet;
            return window.trustwallet;
        }
    } catch (e) {  }

    try {
        if (window.okxwallet) {
            try {
                if (window.okxwallet.ethereum && typeof window.okxwallet.ethereum.request === 'function') {
                    return window.okxwallet.ethereum;
                }
            } catch (e) {  }
            if (typeof window.okxwallet.request === 'function') return window.okxwallet;
            return window.okxwallet;
        }
    } catch (e) {  }

    try {
        if (window.tp) {
            try {
                if (window.tp.ethereum && typeof window.tp.ethereum.request === 'function') {
                    return window.tp.ethereum;
                }
            } catch (e) {  }
            if (typeof window.tp.request === 'function') return window.tp;
            return window.tp;
        }
    } catch (e) {  }

    try {
        if (window.ethereum && (typeof window.ethereum.request === 'function' || typeof window.ethereum.send === 'function')) {
            return window.ethereum;
        }
    } catch (e) {  }

    return null;
}

async function getEVMProviderWithRetry(maxRetries, delayMs) {
    maxRetries = maxRetries || 8;
    delayMs = delayMs || 1500;

    let provider = getEVMProvider();
    if (provider) return provider;

    for (let i = 0; i < maxRetries; i++) {
        const currentDelay = delayMs * Math.pow(1.2, i);
        console.log('[Wallet] Provider 未就绪，等待 ' + Math.round(currentDelay) + 'ms 后重试 (' + (i + 1) + '/' + maxRetries + ')');
        await new Promise(function(resolve) { setTimeout(resolve, currentDelay); });
        provider = getEVMProvider();
        if (provider) return provider;
    }

    return null;
}

export function detectWalletEnv() {
    if (window.bitkeep && window.bitkeep.ethereum) return 'bitget';
    if (window.tokenpocket && window.tokenpocket.ethereum) return 'tokenpocket';
    if (window.ethereum) return 'evm';
    return 'none';
}

export async function connectWallet() {
    return await connectEVMWallet();
}

async function connectEVMWallet() {
    const provider = await getEVMProviderWithRetry(8, 1500);
    if (!provider) {
        alert("请在钱包内置浏览器中打开\n\n支持的钱包：\n• 小狐狸 (MetaMask)\n• 比特儿 (Bitget)\n• TokenPocket\n• Trust Wallet\n• OKX Wallet");
        return;
    }

    try {
        var accounts = null;
        var address = null;

        const methods = ['eth_requestAccounts', 'eth_accounts'];
        for (var i = 0; i < methods.length; i++) {
            try {
                accounts = await provider.request({ method: methods[i] });
                if (accounts && accounts.length > 0) {
                    address = accounts[0];
                    break;
                }
            } catch (e) {
                console.log('[Wallet] ' + methods[i] + ' 失败:', e.message);
            }
        }

        if (!address && typeof provider.enable === 'function') {
            try {
                accounts = await provider.enable();
                if (accounts && accounts.length > 0) {
                    address = accounts[0];
                }
            } catch (e) {
                console.log('[Wallet] provider.enable() 失败:', e.message);
            }
        }

        if (!address) {
            alert("无法获取钱包账户，请检查钱包授权设置");
            return;
        }

        var msg = 'FBS Login\nAddress: ' + address + '\nTime: ' + Date.now();
        var hexMsg = '0x' + Array.from(new TextEncoder().encode(msg)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');

        const signMethods = [
            { method: 'personal_sign', params: [hexMsg, address] },
            { method: 'eth_sign', params: [address, hexMsg] },
            { method: 'eth_signTypedData_v4', params: [address, JSON.stringify({
                types: { EIP712Domain: [], Message: [{ name: 'message', type: 'string' }] },
                domain: {},
                primaryType: 'Message',
                message: { message: msg }
            })] }
        ];

        var signed = false;
        for (var i = 0; i < signMethods.length; i++) {
            try {
                await provider.request(signMethods[i]);
                signed = true;
                break;
            } catch (e) {
                console.log('[Wallet] ' + signMethods[i].method + ' 失败:', e.message);
            }
        }

        if (!signed) {
            console.log('[Wallet] 所有签名方法均失败，跳过签名验证');
        }

        localStorage.setItem('fbs_address', address);
        localStorage.setItem('fbs_chain', 'BSC');
        localStorage.setItem('user_logout_manual', 'false');

        console.log('[Wallet] EVM 连接成功:', address);

        finishLogin();

    } catch (e) {
        console.error('[Wallet] 连接取消或失败:', e);
        if (e.code === 4001 || e.code === 'ACTION_REJECTED') {
            alert('您已取消签名授权');
        } else if (e.message && e.message.includes('rejected')) {
            alert('您已取消授权');
        } else {
            alert('连接失败，请检查钱包状态\n\n错误信息: ' + (e.message || e.toString()));
        }
    }
}

export function finishLogin() {
    const addr = localStorage.getItem('fbs_address');

    updateWalletUI(addr);

    if (typeof window.fetchUserData === 'function') {
        window.fetchUserData(addr);
    }

    if (typeof window.closeModal === 'function') {
        window.closeModal();
    }
}

export function updateWalletUI(addr) {
    const el = document.getElementById('walletAddr');
    if (el) {
        const displayAddr = addr.slice(0, 6) + '...' + addr.slice(-4);
        el.innerText = displayAddr;
        el.removeAttribute('data-i18n');
        el.className = "cursor-pointer font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] border border-emerald-100 mb-4 inline-block transition-transform active:scale-95 focus:outline-none";
    }
}

export function resetWalletUI() {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = '连接钱包';
        el.setAttribute('data-i18n', 'connect');
        el.className = "cursor-pointer font-black bg-purple-50 text-purple-600 px-4 py-2 rounded-full text-[10px] border border-purple-100 mb-4 inline-block transition-transform active:scale-95 focus:outline-none";

        if (window.i18nRender) {
            const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
            window.i18nRender(savedLang);
        }
    }
}

const registeredListeners = [];
let listenersMounted = false;

export function logout(showConfirm) {
    if (showConfirm === undefined) showConfirm = true;

    if (showConfirm && !confirm("确定要退出登录吗？")) {
        return;
    }

    localStorage.removeItem('fbs_address');
    localStorage.removeItem('fbs_chain');
    localStorage.removeItem('user_logout_manual');

    if (window.userBalances) window.userBalances = {};
    if (window.lastFetchedData) window.lastFetchedData = null;
    if (window.currentUserInfo) window.currentUserInfo = null;

    if (typeof window.renderHistory === 'function') window.renderHistory([]);

    if (typeof window.renderTokenList === 'function') window.renderTokenList({});

    const teamFields = ['team_directCount', 'team_directSales', 'team_totalCount', 'team_totalSales', 'team_totalReward'];
    teamFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = '0';
    });

    const minerFields = ['miner_count', 'miner_running', 'miner_daily', 'miner_deadline', 'miner_locked'];
    minerFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = '0';
    });

    const identityEl = document.getElementById('identity_level');
    if (identityEl) {
        identityEl.innerText = '--';
        identityEl.className = 'text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 text-slate-400';
    }
    const weightBar = document.getElementById('weight_bar');
    if (weightBar) {
        weightBar.style.width = '0%';
        weightBar.style.background = '#e2e8f0';
    }
    const weightValue = document.getElementById('weight_value');
    if (weightValue) weightValue.innerText = '0%';
    const holdingValue = document.getElementById('holding_value');
    if (holdingValue) holdingValue.innerText = '0.000000 NEO';

    const provider = getEVMProvider();
    if (provider) {
        registeredListeners.forEach(({ event, handler }) => {
            try {
                provider.removeListener(event, handler);
                console.log('[Wallet] 移除事件监听器:', event);
            } catch (e) {
                console.log('[Wallet] 移除监听器失败:', e.message);
            }
        });
        registeredListeners.length = 0;
    }

    listenersMounted = false;

    if (typeof window.syncWalletUI === 'function') {
        window.syncWalletUI();
    } else {
        resetWalletUI();
    }
}

export function getCurrentAddress() {
    return localStorage.getItem('fbs_address');
}

export function syncWalletUI() {
    const addr = localStorage.getItem('fbs_address');
    if (addr) {
        updateWalletUI(addr);

        if (typeof window.fetchUserData === 'function') {
            window.fetchUserData(addr);
        }
    } else {

        if (window.userBalances) window.userBalances = {};
        if (window.lastFetchedData) window.lastFetchedData = null;
        if (window.currentUserInfo) window.currentUserInfo = null;

        if (typeof window.renderHistory === 'function') window.renderHistory([]);

        if (typeof window.renderTokenList === 'function') window.renderTokenList({});

        resetWalletUI();
    }
}

export function setCurrentAddress(addr) {
    localStorage.setItem('fbs_address', addr);
}

export function mountAccountChangeListener() {
    const chain = window.currentChain || 'BSC';
    if (chain !== 'BSC') {
        console.log(`[Wallet] 当前链 ${chain} 不支持账户变化监听`);
        return;
    }

    const provider = getEVMProvider();
    if (!provider) return;

    if (listenersMounted) {
        console.log("[Wallet] 监听器已挂载，跳过重复注册");
        return;
    }
    listenersMounted = true;

    console.log("[Wallet] 挂载 EVM 账户变化监听器");

    const accountsChangedHandler = async (accounts) => {
        console.log("[Wallet] 检测到账户变化:", accounts);

        const storedAddress = localStorage.getItem('fbs_address');

        if (!accounts || accounts.length === 0) {
            console.log("[Wallet] 钱包已锁定或无账户");
            resetWalletUI();
            return;
        }

        const newAddress = accounts[0];

        if (newAddress !== storedAddress) {
            console.log("[Wallet] 钱包地址变化，重置登录状态");
            logout(false);
        }
    };

    const chainChangedHandler = (chainId) => {
        console.log("[Wallet] EVM 网络变更:", chainId);

        const storedChain = localStorage.getItem('fbs_chain');
        if (storedChain === 'BSC') {

            localStorage.removeItem('fbs_address');
            localStorage.removeItem('fbs_chain');
            localStorage.setItem('user_logout_manual', 'true');

            if (window.userBalances) window.userBalances = {};
            if (window.lastFetchedData) window.lastFetchedData = null;
            if (window.currentUserInfo) window.currentUserInfo = null;

            if (typeof window.syncWalletUI === 'function') window.syncWalletUI();

            setTimeout(() => {
                alert('检测到钱包网络已切换，请重新连接钱包');
            }, 300);
        }
    };

    provider.on('accountsChanged', accountsChangedHandler);
    provider.on('chainChanged', chainChangedHandler);

    registeredListeners.push(
        { event: 'accountsChanged', handler: accountsChangedHandler },
        { event: 'chainChanged', handler: chainChangedHandler }
    );
}
