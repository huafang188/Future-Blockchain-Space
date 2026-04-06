let currentAddress = localStorage.getItem('fbs_address');

/**
 * 1. 挂载全局钱包点击事件
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
 * 2. 连接钱包逻辑
 */
export async function connectWallet() {
    if (!window.ethereum) return alert("请在钱包内置浏览器中打开");

    try {
        // A. 请求授权获取账号
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0]; 
        
        // B. 安全签名确认（确保用户知情且防止重放）
        const msg = `FBS Login\nAddress: ${address}\nTime: ${Date.now()}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(msg)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        await window.ethereum.request({ 
            method: 'personal_sign', 
            params: [hexMsg, address] 
        });
        
        // C. 更新状态标记
        localStorage.setItem('fbs_address', address);
        localStorage.setItem('user_logout_manual', 'false'); // 关键：允许自动重连
        currentAddress = address;
        
        console.log("[Wallet] 连接成功:", address);
        
        // D. 完成登录流程（更新UI并拉取飞书数据）
        finishLogin();

    } catch (e) { 
        console.error("[Wallet] 连接取消或失败:", e); 
        // 只有非 4001（用户主动取消）才报错提示
        if (e.code !== 4001) alert("连接失败，请重试");
    }
}

/**
 * 3. 完成登录后的动作
 */
export function finishLogin() {
    // 更新按钮显示
    updateWalletUI(currentAddress);
    
    // 立即拉取飞书后台资产数据
    if (typeof window.fetchUserData === 'function') {
        window.fetchUserData(currentAddress);
    }
    
    // 如果有打开的弹窗，自动关闭
    if (typeof window.closeModal === 'function') {
        window.closeModal();
    }
}

/**
 * 4. 更新钱包 UI（已连接状态）
 */
export function updateWalletUI(addr) {
    const el = document.getElementById('walletAddr');
    if (el) {
        // 显示前6位和后4位
        el.innerText = addr.slice(0, 6) + '...' + addr.slice(-4);
        el.removeAttribute('data-i18n'); // 移除国际化键名，直接显示地址
        el.className = "cursor-pointer font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] border border-emerald-100 mb-4 inline-block";
    }
}

/**
 * 5. 重置钱包 UI（未连接状态）
 */
export function resetWalletUI() {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = '连接钱包';
        el.setAttribute('data-i18n', 'connect'); // 恢复国际化标记
        el.className = "cursor-pointer font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] border border-blue-100 mb-4 inline-block";
        
        // 立即触发一次多语言翻译扫描
        if (window.i18nRender) {
            window.i18nRender(localStorage.getItem('fbs_lang') || 'zh-CN');
        }
    }
}

/**
 * 6. 登出逻辑
 */
export function logout() {
    if (confirm("确定要退出登录并断开连接吗？\n退出后下次访问将不再自动连接。")) {
        // 设置手动退出标记，阻止 app-init.js 的重连判断
        localStorage.setItem('user_logout_manual', 'true');
        localStorage.removeItem('fbs_address');
        
        // 清理当前状态并刷新页面回到初始态
        location.reload();
    }
}

/**
 * 获取/设置地址的辅助函数
 */
export function getCurrentAddress() {
    return localStorage.getItem('fbs_address');
}

export function setCurrentAddress(addr) {
    currentAddress = addr;
}
