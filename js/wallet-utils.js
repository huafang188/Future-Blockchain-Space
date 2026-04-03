let currentAddress = localStorage.getItem('fbs_address');

// 挂载全局钱包点击事件
export function mountWalletClickHandler() {
    window.handleWalletClick = function() {
        console.log("Wallet button clicked");
        const savedAddr = localStorage.getItem('fbs_address');
        if (savedAddr) {
            logout();
        } else {
            connectWallet();
        }
    };
}

// 连接钱包（含签名）
export async function connectWallet() {
    if (!window.ethereum) return alert("请在钱包内打开");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0]; 
        
        const msg = `FBS Login\nAddress: ${address}\nTime: ${Date.now()}`;
        await window.ethereum.request({ method: 'personal_sign', params: [msg, address] });
        
        localStorage.setItem('fbs_address', address);
        localStorage.removeItem('user_logout_manual');
        currentAddress = address;
        
        finishLogin();
    } catch (e) { 
        console.error("Login Cancelled", e); 
    }
}

// 完成登录（更新UI+拉取数据）
export function finishLogin() {
    updateWalletUI(currentAddress);
    if (typeof fetchUserData === 'function') fetchUserData(currentAddress);
    if (typeof closeModal === 'function') closeModal();
}

// 更新钱包UI
export function updateWalletUI(addr) {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = addr.slice(0, 6) + '...' + addr.slice(-4);
        el.removeAttribute('data-i18n');
        el.className = "cursor-pointer font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] border border-emerald-100 mb-4 inline-block";
    }
}

// 重置钱包UI
export function resetWalletUI() {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = '连接钱包';
        el.className = "cursor-pointer font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] border border-blue-100 mb-4 inline-block";
    }
}

// 登出钱包
export function logout() {
    if (confirm("确定要退出登录并断开连接吗？")) {
        localStorage.setItem('user_logout_manual', 'true');
        localStorage.removeItem('fbs_address');
        location.reload();
    }
}

// 获取当前地址
export function getCurrentAddress() {
    return currentAddress || localStorage.getItem('fbs_address');
}

// 更新当前地址
export function setCurrentAddress(addr) {
    currentAddress = addr;
}
