/**
 * 1. 挂载全局钱包点击事件
 * 处理逻辑：未连接时去连接，已连接时点击则触发退出登录
 *
 * 重要：按钮在 HTML 中已通过 onclick="handleWalletClick()" 绑定点击事件，
 * 此处仅将函数挂载到 window，不再通过 addEventListener 重复绑定，
 * 否则点击一次会触发两次（connect 与 logout 同时执行）。
 */
export function mountWalletClickHandler() {
    // 防重复点击锁：连接流程进行中时，忽略后续点击
    let isProcessing = false;

    function handleWalletClick() {
        console.log("[Wallet] 按钮点击");

        // 防重复点击：连接或退出流程进行中时，直接忽略
        if (isProcessing) {
            console.log("[Wallet] 正在处理中，忽略重复点击");
            return;
        }

        const savedAddr = localStorage.getItem('fbs_address');

        if (savedAddr) {
            // 已连接状态：走退出流程
            isProcessing = true;
            try {
                logout();
            } finally {
                // logout 是同步的（confirm 取消也会立即返回），立即解锁
                isProcessing = false;
            }
        } else {
            // 未连接状态：走连接流程
            isProcessing = true;
            // 连接流程是异步的，完成后解锁
            const unlock = () => { isProcessing = false; };
            const p = connectWallet();
            if (p && typeof p.then === 'function') {
                p.then(unlock, unlock);
            } else {
                isProcessing = false;
            }
        }
    }

    // 挂载到 window 供 HTML onclick 使用
    window.handleWalletClick = handleWalletClick;

    // 仅绑定触摸视觉反馈（不触发点击逻辑），提升移动端按压手感
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

/**
 * 兼容旧浏览器的 EVM Provider 检测
 * 不使用 optional chaining (?.)，兼容 Android 10 等老旧浏览器
 * 所有属性访问都包裹 try-catch，防止旧浏览器访问 getter 时抛出异常
 */
function getEVMProvider() {
    // 1. 优先检测 window.ethereum（大多数钱包的标准注入方式）
    try {
        if (window.ethereum && typeof window.ethereum.request === 'function') {
            return window.ethereum;
        }
    } catch (e) { /* ignore */ }

    // 2. Bitget 钱包：多种检测路径
    try {
        if (window.bitkeep) {
            try {
                if (window.bitkeep.ethereum && typeof window.bitkeep.ethereum.request === 'function') {
                    return window.bitkeep.ethereum;
                }
            } catch (e) { /* bitkeep.ethereum getter 可能抛异常 */ }

            if (typeof window.bitkeep.request === 'function') return window.bitkeep;
            if (typeof window.bitkeep.send === 'function') return window.bitkeep;
            return window.bitkeep;
        }
    } catch (e) { /* ignore */ }

    // 3. TP 钱包：兼容多种注入方式
    try {
        if (window.tokenpocket) {
            try {
                if (window.tokenpocket.ethereum && typeof window.tokenpocket.ethereum.request === 'function') {
                    return window.tokenpocket.ethereum;
                }
            } catch (e) { /* tokenpocket.ethereum getter 可能抛异常 */ }

            if (typeof window.tokenpocket.request === 'function') return window.tokenpocket;
            if (typeof window.tokenpocket.toEthereum === 'function') {
                return window.tokenpocket.toEthereum();
            }
            return window.tokenpocket;
        }
    } catch (e) { /* ignore */ }

    // 4. MetaMask Mobile
    try {
        if (window.ethereum && window.ethereum.isMetaMask) {
            return window.ethereum;
        }
    } catch (e) { /* ignore */ }

    // 5. Trust Wallet
    try {
        if (window.trustwallet) {
            try {
                if (window.trustwallet.ethereum && typeof window.trustwallet.ethereum.request === 'function') {
                    return window.trustwallet.ethereum;
                }
            } catch (e) { /* ignore */ }
            if (typeof window.trustwallet.request === 'function') return window.trustwallet;
            return window.trustwallet;
        }
    } catch (e) { /* ignore */ }

    // 6. OKX Wallet
    try {
        if (window.okxwallet) {
            try {
                if (window.okxwallet.ethereum && typeof window.okxwallet.ethereum.request === 'function') {
                    return window.okxwallet.ethereum;
                }
            } catch (e) { /* ignore */ }
            if (typeof window.okxwallet.request === 'function') return window.okxwallet;
            return window.okxwallet;
        }
    } catch (e) { /* ignore */ }

    // 7. TokenPocket 别名检测
    try {
        if (window.tp) {
            try {
                if (window.tp.ethereum && typeof window.tp.ethereum.request === 'function') {
                    return window.tp.ethereum;
                }
            } catch (e) { /* ignore */ }
            if (typeof window.tp.request === 'function') return window.tp;
            return window.tp;
        }
    } catch (e) { /* ignore */ }

    // 8. 兜底检测：任何具有 request 或 send 方法的对象
    try {
        if (window.ethereum && (typeof window.ethereum.request === 'function' || typeof window.ethereum.send === 'function')) {
            return window.ethereum;
        }
    } catch (e) { /* ignore */ }

    return null;
}

/**
 * 异步检测 EVM Provider（带重试机制，兼容老旧手机钱包注入慢的问题）
 * Android 10 等老旧手机需要更长的等待时间
 */
async function getEVMProviderWithRetry(maxRetries, delayMs) {
    maxRetries = maxRetries || 8;
    delayMs = delayMs || 1500;

    let provider = getEVMProvider();
    if (provider) return provider;

    // 钱包注入可能需要时间，尤其是老旧手机，使用指数退避策略
    for (let i = 0; i < maxRetries; i++) {
        const currentDelay = delayMs * Math.pow(1.2, i);
        console.log('[Wallet] Provider 未就绪，等待 ' + Math.round(currentDelay) + 'ms 后重试 (' + (i + 1) + '/' + maxRetries + ')');
        await new Promise(function(resolve) { setTimeout(resolve, currentDelay); });
        provider = getEVMProvider();
        if (provider) return provider;
    }

    return null;
}

/**
 * 检测钱包环境（兼容旧浏览器）
 */
export function detectWalletEnv() {
    if (window.bitkeep && window.bitkeep.ethereum) return 'bitget';
    if (window.tokenpocket && window.tokenpocket.ethereum) return 'tokenpocket';
    if (window.ethereum) return 'evm';
    return 'none';
}

/**
 * 2. 连接钱包核心逻辑（根据当前链选择对应钱包 API）
 */
export async function connectWallet() {
    return await connectEVMWallet();
}

/**
 * 2a. EVM 链钱包连接（BSC）
 */
async function connectEVMWallet() {
    const provider = await getEVMProviderWithRetry(8, 1500);
    if (!provider) {
        alert("请在钱包内置浏览器中打开\n\n支持的钱包：\n• 小狐狸 (MetaMask)\n• 比特儿 (Bitget)\n• TokenPocket\n• Trust Wallet\n• OKX Wallet");
        return;
    }

    try {
        var accounts = null;
        var address = null;

        // 尝试多种方式获取账户
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

        // 尝试 enable() 方法（最老版本钱包）
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

        // 安全签名确认
        var msg = 'FBS Login\nAddress: ' + address + '\nTime: ' + Date.now();
        var hexMsg = '0x' + Array.from(new TextEncoder().encode(msg)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');

        // 兼容多种签名 API
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

        // 连接成功后立即预加载数据，加速后续显示
        if (window.fetchUserData) {
            window.fetchUserData(address, { silent: true }).catch(e =>
                console.warn('[Wallet] EVM 预加载失败:', e.message)
            );
        }

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

/**

 * 3. 完成登录后的动作（更新UI + 拉取数据）
 */
export function finishLogin() {
    const addr = localStorage.getItem('fbs_address');
    // 1. 更新按钮显示
    updateWalletUI(addr);
    
    // 2. 立即拉取飞书后台资产数据
    // 注意：fetchUserData 内部已删除"新用户自动弹窗"逻辑
    if (typeof window.fetchUserData === 'function') {
        window.fetchUserData(addr);
    }
    
    // 3. 如果是在某个交互弹窗中触发的登录，自动关闭弹窗
    if (typeof window.closeModal === 'function') {
        window.closeModal();
    }
}

/**
 * 4. 更新钱包 UI（已连接状态：显示缩略地址）
 */
export function updateWalletUI(addr) {
    const el = document.getElementById('walletAddr');
    if (el) {
        const displayAddr = addr.slice(0, 6) + '...' + addr.slice(-4);
        el.innerText = displayAddr;
        el.removeAttribute('data-i18n');
        el.className = "cursor-pointer font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] border border-emerald-100 mb-4 inline-block transition-transform active:scale-95 focus:outline-none";
    }
}

/**
 * 5. 重置钱包 UI（未连接状态：显示连接钱包）
 */
export function resetWalletUI() {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = '连接钱包';
        el.setAttribute('data-i18n', 'connect');
        el.className = "cursor-pointer font-black bg-purple-50 text-purple-600 px-4 py-2 rounded-full text-[10px] border border-purple-100 mb-4 inline-block transition-transform active:scale-95 focus:outline-none";
        
        // 触发一次全局多语言翻译，使“连接钱包”根据当前语言显示
        if (window.i18nRender) {
            const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
            window.i18nRender(savedLang);
        }
    }
}

/**
 * 存储已注册的事件监听器，用于退出时清理
 */
const registeredListeners = [];
let listenersMounted = false;

/**
 * 6. 登出逻辑
 * @param {boolean} showConfirm - 是否显示确认对话框（默认true）
 */
export function logout(showConfirm) {
    if (showConfirm === undefined) showConfirm = true;
    
    if (showConfirm && !confirm("确定要退出登录吗？")) {
        return;
    }
    
    // 不保存登录状态，清空所有数据
    localStorage.removeItem('fbs_address');
    localStorage.removeItem('fbs_chain');
    localStorage.removeItem('user_logout_manual');
    
    // 清空全局数据缓存，防止余额残留
    if (window.userBalances) window.userBalances = {};
    if (window.lastFetchedData) window.lastFetchedData = null;
    if (window.currentUserInfo) window.currentUserInfo = null;
    
    // 清空列表显示
    if (typeof window.renderHistory === 'function') window.renderHistory([]);
    if (typeof window.renderTransfers === 'function') window.renderTransfers([]);
    if (typeof window.renderTokenList === 'function') window.renderTokenList({});
    
    // 重置团队/矿机数据显示
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

    // 重置"我的身份"与社区权重
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
    
    // 移除所有钱包事件监听器，防止退出后自动连接
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
    
    // 重置标志，允许下次登录时重新注册监听器
    listenersMounted = false;
    
    // 立即更新 UI 为未连接状态
    if (typeof window.syncWalletUI === 'function') {
        window.syncWalletUI();
    } else {
        resetWalletUI();
    }
}

/**
 * 获取当前地址（始终从 localStorage 读取最新值）
 */
export function getCurrentAddress() {
    return localStorage.getItem('fbs_address');
}

/**
 * 同步钱包 UI 状态（根据 localStorage 自动显示已连接/未连接）
 */
export function syncWalletUI() {
    const addr = localStorage.getItem('fbs_address');
    if (addr) {
        updateWalletUI(addr);
        // 切换账户时重新拉取数据
        if (typeof window.fetchUserData === 'function') {
            window.fetchUserData(addr);
        }
    } else {
        // 未登录状态：清空所有数据缓存和显示
        if (window.userBalances) window.userBalances = {};
        if (window.lastFetchedData) window.lastFetchedData = null;
        if (window.currentUserInfo) window.currentUserInfo = null;
        
        if (typeof window.renderHistory === 'function') window.renderHistory([]);
        if (typeof window.renderTransfers === 'function') window.renderTransfers([]);
        if (typeof window.renderTokenList === 'function') window.renderTokenList({});
        
        resetWalletUI();
    }
}

/**
 * 外部调用接口：手动更新当前地址（同时更新 localStorage）
 */
export function setCurrentAddress(addr) {
    localStorage.setItem('fbs_address', addr);
}

/**
 * 7. 监听钱包账户变化，自动连接新账户（仅 EVM 链）
 */
export function mountAccountChangeListener() {
    const chain = window.currentChain || 'BSC';
    if (chain !== 'BSC') {
        console.log(`[Wallet] 当前链 ${chain} 不支持账户变化监听`);
        return;
    }
    
    const provider = getEVMProvider();
    if (!provider) return;
    
    // 防止重复注册
    if (listenersMounted) {
        console.log("[Wallet] 监听器已挂载，跳过重复注册");
        return;
    }
    listenersMounted = true;
    
    console.log("[Wallet] 挂载 EVM 账户变化监听器");
    
    // 账户变化处理函数 - 用户切换钱包后重置状态，等待手动连接
    const accountsChangedHandler = async (accounts) => {
        console.log("[Wallet] 检测到账户变化:", accounts);
        
        const storedAddress = localStorage.getItem('fbs_address');
        
        // 如果没有账户，重置UI
        if (!accounts || accounts.length === 0) {
            console.log("[Wallet] 钱包已锁定或无账户");
            resetWalletUI();
            return;
        }
        
        const newAddress = accounts[0];
        
        // 如果地址变化，重置状态，等待用户手动连接新钱包
        if (newAddress !== storedAddress) {
            console.log("[Wallet] 钱包地址变化，重置登录状态");
            logout(false);
        }
    };
    
    // 链变化处理函数
    const chainChangedHandler = (chainId) => {
        console.log("[Wallet] EVM 网络变更:", chainId);
        // 链切换时清除登录状态，提示用户重新连接
        const storedChain = localStorage.getItem('fbs_chain');
        if (storedChain === 'BSC') {
            // 清除登录状态
            localStorage.removeItem('fbs_address');
            localStorage.removeItem('fbs_chain');
            localStorage.setItem('user_logout_manual', 'true');
            
            // 清空全局数据缓存
            if (window.userBalances) window.userBalances = {};
            if (window.lastFetchedData) window.lastFetchedData = null;
            if (window.currentUserInfo) window.currentUserInfo = null;
            
            // 同步 UI
            if (typeof window.syncWalletUI === 'function') window.syncWalletUI();
            // 提示重新连接
            setTimeout(() => {
                alert('检测到钱包网络已切换，请重新连接钱包');
            }, 300);
        }
    };
    
    // 注册监听器并保存引用
    provider.on('accountsChanged', accountsChangedHandler);
    provider.on('chainChanged', chainChangedHandler);
    
    // 保存到数组，用于退出时清理
    registeredListeners.push(
        { event: 'accountsChanged', handler: accountsChangedHandler },
        { event: 'chainChanged', handler: chainChangedHandler }
    );
}
