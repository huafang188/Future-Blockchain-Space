let currentAddress = localStorage.getItem('fbs_address');

/**
 * 1. 挂载全局钱包点击事件
 * 处理逻辑：未连接时去连接，已连接时点击则触发退出登录
 */
export function mountWalletClickHandler() {
    window.handleWalletClick = function() {
        console.log("[Wallet] 按钮点击");
        const savedAddr = localStorage.getItem('fbs_address');
        
        // 如果本地已存有地址，点击则视为“登出”操作
        if (savedAddr) {
            logout();
        } else {
            // 否则执行“连接”操作
            connectWallet();
        }
    };
}

/**
 * 2. 连接钱包核心逻辑（根据当前链选择对应钱包 API）
 */
export async function connectWallet() {
    const chain = window.currentChain || 'BSC';
    console.log(`[Wallet] 连接钱包，当前链: ${chain}`);
    
    if (chain === 'BSC') {
        await connectEVMWallet();
    } else if (chain === 'TON') {
        await connectTONWallet();
    } else if (chain === 'SOL') {
        await connectSOLWallet();
    }
}

/**
 * 2a. EVM 链钱包连接（BSC）
 */
async function connectEVMWallet() {
    // 兼容 Bitget / TP / 通用 EVM 钱包
    const provider = window.bitkeep?.ethereum || window.tokenpocket?.ethereum || window.ethereum;
    if (!provider) return alert("请在钱包内置浏览器中打开");

    try {
        // A. 请求授权获取账号
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) return;
        const address = accounts[0]; 
        
        // B. 安全签名确认（Hex 转换确保手机端兼容性）
        const msg = `FBS Login\nAddress: ${address}\nTime: ${Date.now()}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        await provider.request({ 
            method: 'personal_sign', 
            params: [hexMsg, address] 
        });
        
        // C. 更新状态标记
        localStorage.setItem('fbs_address', address);
        localStorage.setItem('fbs_chain', 'BSC');
        localStorage.setItem('user_logout_manual', 'false');
        currentAddress = address;
        
        console.log("[Wallet] EVM 连接成功:", address);
        finishLogin();

    } catch (e) { 
        console.error("[Wallet] 连接取消或失败:", e); 
        if (e.code === 4001) {
            alert("您已取消签名授权");
        } else {
            alert("连接失败，请检查钱包状态");
        }
    }
}

/**
 * 2b. TON 链钱包连接
 */
async function connectTONWallet() {
    // Bitget 钱包 TON API: window.bitkeep.ton
    // 使用 send('ton_requestAccounts') 获取账户
    // 注意：切换链后可能需要短暂延迟才能获取到 ton provider
    let tonProvider = window.bitkeep?.ton || window.tokenpocket?.ton || window.tonconnect;
    
    // 如果没有立即找到，等待一小段时间重试（钱包注入可能需要时间）
    if (!tonProvider) {
        await new Promise(resolve => setTimeout(resolve, 500));
        tonProvider = window.bitkeep?.ton || window.tokenpocket?.ton || window.tonconnect;
    }
    
    if (!tonProvider) {
        // 再等待一次
        await new Promise(resolve => setTimeout(resolve, 1000));
        tonProvider = window.bitkeep?.ton || window.tokenpocket?.ton || window.tonconnect;
    }
    
    if (!tonProvider) {
        alert("请在支持 TON 的钱包浏览器中打开（如 Bitget 钱包-TON 模式、Tonkeeper 等）\n\n提示：请确保钱包已切换到 TON 网络");
        return;
    }
    
    try {
        let address;
        let provider = tonProvider;
        
        if (tonProvider.send) {
            // Bitget 钱包标准 API: send('ton_requestAccounts')
            const accounts = await tonProvider.send('ton_requestAccounts');
            address = accounts[0];
        } else if (tonProvider.connect) {
            // TON Connect UI 方式
            const wallet = await tonProvider.connect();
            address = wallet.account.address;
            provider = tonProvider; // 保存引用用于后续签名
        } else if (tonProvider.requestAccounts) {
            // 直接请求账户
            const accounts = await tonProvider.requestAccounts();
            address = accounts[0];
        } else {
            alert("TON 钱包连接方式不支持");
            return;
        }
        
        if (!address) {
            alert("未获取到 TON 地址");
            return;
        }
        
        // TON 地址格式转换（raw 格式转 user-friendly 格式）
        const displayAddr = address.replace(/\+/g, '-').replace(/\//g, '_');
        
        // 签名验证（类似 EVM 的 personal_sign）
        if (provider.send) {
            const msg = `FBS Login\nAddress: ${displayAddr}\nTime: ${Date.now()}`;
            try {
                // Bitget TON 钱包支持 ton_personalSign 或 ton_rawSign
                await provider.send('ton_personalSign', [msg]);
            } catch (signErr) {
                // 降级到 ton_rawSign
                try {
                    await provider.send('ton_rawSign', [msg]);
                } catch (e2) {
                    console.log("[Wallet] TON 签名跳过（钱包可能不支持）:", e2.message);
                    // 签名失败不阻断登录流程
                }
            }
        }
        
        localStorage.setItem('fbs_address', displayAddr);
        localStorage.setItem('fbs_chain', 'TON');
        localStorage.setItem('user_logout_manual', 'false');
        currentAddress = displayAddr;
        
        console.log("[Wallet] TON 连接成功:", displayAddr);
        finishLogin();
        
    } catch (e) {
        console.error("[Wallet] TON 连接失败:", e);
        alert("TON 钱包连接失败: " + (e.message || '未知错误'));
    }
}

/**
 * 2c. Solana 链钱包连接
 */
async function connectSOLWallet() {
    // 尝试多种 Solana 钱包 API
    const solProvider = window.solana || window.bitkeep?.solana || window.tokenpocket?.solana;
    
    if (!solProvider) {
        alert("请在支持 Solana 的钱包浏览器中打开（如 Bitget 钱包-Solana 模式、Phantom 等）");
        return;
    }
    
    try {
        // 连接 Solana 钱包
        const resp = await solProvider.connect();
        const address = resp.publicKey ? resp.publicKey.toString() : solProvider.publicKey?.toString();
        
        if (!address) {
            alert("未获取到 Solana 地址");
            return;
        }
        
        // Solana 钱包通常不需要签名即可连接（只读模式）
        // 如果需要签名验证，可以添加 signMessage
        if (solProvider.signMessage) {
            const msg = new TextEncoder().encode(`FBS Login\nAddress: ${address}\nTime: ${Date.now()}`);
            await solProvider.signMessage(msg, 'utf8');
        }
        
        localStorage.setItem('fbs_address', address);
        localStorage.setItem('fbs_chain', 'SOL');
        localStorage.setItem('user_logout_manual', 'false');
        currentAddress = address;
        
        console.log("[Wallet] SOL 连接成功:", address);
        finishLogin();
        
    } catch (e) {
        console.error("[Wallet] SOL 连接失败:", e);
        if (e.code === 4001 || e.message?.includes('rejected')) {
            alert("您已取消连接授权");
        } else {
            alert("Solana 钱包连接失败: " + (e.message || '未知错误'));
        }
    }
}

/**
 * 3. 完成登录后的动作（更新UI + 拉取数据）
 */
export function finishLogin() {
    // 1. 更新按钮显示
    updateWalletUI(currentAddress);
    
    // 2. 立即拉取飞书后台资产数据
    // 注意：fetchUserData 内部已删除“新用户自动弹窗”逻辑
    if (typeof window.fetchUserData === 'function') {
        window.fetchUserData(currentAddress);
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
        // 显示格式如 0x1234...abcd
        const displayAddr = addr.slice(0, 6) + '...' + addr.slice(-4);
        el.innerText = displayAddr;
        el.removeAttribute('data-i18n'); // 移除“连接钱包”的多语言标签
        el.className = "cursor-pointer font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] border border-emerald-100 mb-4 inline-block";
    }
}

/**
 * 5. 重置钱包 UI（未连接状态：显示连接钱包）
 */
export function resetWalletUI() {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = '连接钱包';
        el.setAttribute('data-i18n', 'connect'); // 恢复多语言标记
        el.className = "cursor-pointer font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] border border-blue-100 mb-4 inline-block";
        
        // 触发一次全局多语言翻译，使“连接钱包”根据当前语言显示
        if (window.i18nRender) {
            const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
            window.i18nRender(savedLang);
        }
    }
}

/**
 * 6. 登出逻辑
 */
export function logout() {
    if (confirm("确定要退出登录吗？\n退出后下次访问将不会自动重连。")) {
        // 设置手动退出标记，彻底阻止下一次的自动重连判断
        localStorage.setItem('user_logout_manual', 'true');
        localStorage.removeItem('fbs_address');
        
        // 清理当前状态并刷新页面回到初始态
        location.reload();
    }
}

/**
 * 外部调用接口：获取当前本地存储的地址
 */
export function getCurrentAddress() {
    return localStorage.getItem('fbs_address');
}

/**
 * 外部调用接口：手动更新当前地址变量
 */
export function setCurrentAddress(addr) {
    currentAddress = addr;
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
    
    const provider = window.bitkeep?.ethereum || window.tokenpocket?.ethereum || window.ethereum;
    if (!provider) return;
    
    console.log("[Wallet] 挂载 EVM 账户变化监听器");
    
    // 监听账户变化事件
    provider.on('accountsChanged', async (accounts) => {
        console.log("[Wallet] 检测到账户变化:", accounts);
        
        // 如果没有账户，重置UI
        if (!accounts || accounts.length === 0) {
            console.log("[Wallet] 钱包已锁定或无账户");
            return;
        }
        
        const newAddress = accounts[0];
        
        // 如果是同一个地址，不需要处理
        if (newAddress === currentAddress) {
            console.log("[Wallet] 地址未变化");
            return;
        }
        
        // 检查是否是手动登出状态
        const isManualLogout = localStorage.getItem('user_logout_manual');
        if (isManualLogout === 'true') {
            console.log("[Wallet] 用户已手动登出，跳过自动连接");
            return;
        }
        
        // 自动连接新账户（需要签名）
        try {
            // 请求签名确认
            const msg = `FBS Auto Connect\nAddress: ${newAddress}\nTime: ${Date.now()}`;
            const hexMsg = '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');
            
            await provider.request({ 
                method: 'personal_sign', 
                params: [hexMsg, newAddress] 
            });
            
            // 更新状态
            localStorage.setItem('fbs_address', newAddress);
            localStorage.setItem('fbs_chain', 'BSC');
            localStorage.setItem('user_logout_manual', 'false');
            currentAddress = newAddress;
            
            console.log("[Wallet] 自动连接新账户成功:", newAddress);
            
            // 完成登录流程
            finishLogin();
            
        } catch (e) {
            console.error("[Wallet] 自动连接失败:", e);
            // 用户取消签名，保持原状态或重置
            if (e.code === 4001) {
                console.log("[Wallet] 用户取消自动连接签名");
            }
        }
    });
}
