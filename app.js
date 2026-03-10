/**
 * Future Blockchain Space - 全功能安全增强版 (集成多语言与账号持久化)
 */

const API_BASE = "https://api.fbsfbs.fit";
const BSC_CHAIN_ID = '0x38';

const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};

const CONTRACT_ADDRS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'BNB': "NATIVE"
};

const tokenInfo = {
    'FBS': { price: 0.1, logo: 'assets/fbs_logo.png' },
    'FBST': { price: 0.05, logo: 'assets/fbst_logo.png' },
    'FBSP': { price: 1.2, logo: 'assets/fbsp_logo.png' },
    'PBSU': { price: 1.0, logo: 'assets/fbsu_logo.png' },
    'USDT': { price: 1.0, logo: 'assets/USDT.png' },
    'BNB': { price: 600, logo: 'assets/BNB.png' },
    'BTC': { price: 65000, logo: 'assets/BTC.png' },
    'ETH': { price: 3500, logo: 'assets/ETH.png' }
};

let currentAddress = null;
let userBalances = {};
// 全局语言变量，优先读取本地缓存
let currentLang = localStorage.getItem('fbs_lang') || 'zh-CN';

// --- 1. 自动初始化逻辑 ---
window.onload = async () => {
    // 初始化页面语言显示
    updateViewText();

    // 渲染空列表占位
    renderTokenList({});
    
    // 如果之前登录过，尝试自动链接
    if (localStorage.getItem('fbs_isLoggedIn') === 'true') {
        connectWallet(true); // true 表示静默尝试
    }

    // 监听钱包账号切换
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                handleNewAddress(accounts[0]);
            } else {
                handleLogout(); 
            }
        });
        
        // 监听链切换（确保在 BSC 链）
        window.ethereum.on('chainChanged', () => window.location.reload());
    }
};

// --- 2. 身份与多语言逻辑 ---

/**
 * 切换语言触发器
 */
function switchLang(lang) {
    currentLang = lang;
    localStorage.setItem('fbs_lang', lang); 
    updateViewText();
    // 重新渲染代币列表以更新列表内的“余额”等翻译
    renderTokenList(userBalances);
}

/**
 * 更新全局语言显示
 */
function updateViewText() {
    const data = i18n[currentLang]; 
    if (!data) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) {
            if (el.tagName === 'INPUT') {
                el.placeholder = data[key];
            } else {
                el.innerText = data[key];
            }
        }
    });

    const select = document.getElementById('langSelect');
    if (select) select.value = currentLang;

    // 更新登录按钮状态
    const walletAddrEl = document.getElementById('walletAddr');
    if (walletAddrEl) {
        if (!currentAddress) {
            walletAddrEl.innerText = data['connect'] || "CONNECT WALLET";
        } else {
            walletAddrEl.innerText = currentAddress.slice(0, 6) + '...' + currentAddress.slice(-4);
        }
    }
}

async function connectWallet(isAuto = false) {
    if (!window.ethereum) return isAuto ? null : alert("请在 Web3 钱包内打开");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
            await handleNewAddress(accounts[0]);
            localStorage.setItem('fbs_isLoggedIn', 'true');
        }
    } catch (e) {
        if (!isAuto) alert("连接已取消");
    }
}

async function handleNewAddress(address) {
    currentAddress = address;
    updateViewText(); // 更新地址显示
    await fetchUserData(address);
}

function handleLogout() {
    currentAddress = null;
    userBalances = {};
    localStorage.removeItem('fbs_isLoggedIn');
    updateViewText();
    renderTokenList({});
    alert("已退出登录 / Disconnected");
}

function checkAuth() {
    if (!currentAddress) {
        const msg = i18n[currentLang]['connect'] || "请先连接钱包";
        alert(msg);
        connectWallet();
        return false;
    }
    return true;
}

// --- 3. 弹窗与业务逻辑 ---

function showModal(titleKey, html) {
    // 支持直接传入 i18n 的 Key
    const translatedTitle = i18n[currentLang][titleKey] || titleKey;
    document.getElementById('modalTitle').innerText = translatedTitle;
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.remove('hidden');
    
    // 关键：动态插入内容后执行翻译扫描
    updateViewText();
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

function openMinerModal(type) {
    if (!checkAuth()) return;
    const nums = [1, 5, 10, 15, 20, 25, 50, 100];
    if (type === 'buy') {
        showModal('buy_miner', `
            <div class="space-y-4">
                <div class="grid grid-cols-4 gap-2">${nums.map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border p-2 rounded-xl text-[10px] font-bold">${n}${i18n[currentLang]['m_count'] || '台'}</button>`).join('')}</div>
                <div class="p-4 bg-blue-50 rounded-2xl flex justify-between"><span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span></div>
                <button onclick="doChainPay('MINER')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg" data-i18n="confirm_pay">确认支付</button>
            </div>`);
    } else {
        const days = [30, 60, 90, 180, 360];
        showModal('pay_fee', `
            <div class="space-y-4 text-left">
                <select id="elecNum" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none outline-none">${nums.map(n => `<option value="${n}">${n} ${i18n[currentLang]['m_count'] || '台'}</option>`).join('')}</select>
                <select id="elecDays" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none outline-none">${days.map(d => `<option value="${d}">${d} ${i18n[currentLang]['m_term'] || '天'}</option>`).join('')}</select>
                <div class="p-4 bg-slate-900 rounded-2xl flex justify-between items-center"><span class="text-xs text-slate-400" data-i18n="confirm_pay">需支付</span><span id="elecCost" class="text-xl font-black text-yellow-500">30.00</span></div>
                <button onclick="doChainPay('ELECTRIC')" class="w-full bg-slate-800 text-white py-4 rounded-2xl font-black shadow-lg" data-i18n="confirm_pay">确认支付</button>
            </div>`);
    }
}

function openFinanceModal(type) {
    if (!checkAuth()) return;
    const options = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
    if (type === 'recharge') {
        showModal('recharge', `
            <div class="space-y-4 text-left">
                <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t}">${t}</option>`).join('')}</select>
                <input type="number" id="recAmount" data-i18n="input_amount" placeholder="输入充值数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button onclick="doRecharge()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg" data-i18n="recharge">确认</button>
            </div>`);
    } else if (type === 'withdraw') {
        showModal('withdraw', `
            <div class="space-y-4 text-left">
                <select id="witToken" onchange="updateMax()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">${options}</select>
                <div class="text-[10px] font-bold text-blue-500 px-2"><span data-i18n="balance">可用余额</span>: <span id="maxWit">0.00</span></div>
                <input type="number" id="witAmount" data-i18n="input_amount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button onclick="handleSignAction('WITHDRAW')" class="w-full bg-red-500 text-white py-4 rounded-2xl font-black shadow-lg" data-i18n="withdraw">签名提现</button>
            </div>`);
        updateMax();
    }
}

// --- 4. 支付与链交互 ---

async function executeTokenTransfer(contractAddr, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.parseUnits(amountStr, 18), { gasLimit: 120000 });
        showLoadingUI(tx.hash);
        const receipt = await tx.wait();
        if (receipt.status === 1) {
            alert("✅ Success!");
            closeModal();
            fetchUserData(currentAddress);
        }
    } catch (e) {
        alert("Fail: " + (e.reason || "Check Balance"));
        closeModal();
    }
}

function renderTokenList(balances) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let total = 0;
    const balanceLabel = i18n[currentLang]['balance'] || 'Balance';
    
    container.innerHTML = Object.keys(tokenInfo).map(s => {
        const bal = parseFloat(balances[s] || 0);
        total += bal * tokenInfo[s].price;
        return `<div class="flex items-center justify-between p-4 border-b border-slate-50">
            <div class="flex items-center gap-3">
                <img src="${tokenInfo[s].logo}" class="w-7 h-7 rounded-full" onerror="this.src='https://ui-avatars.com/api/?name=${s}'">
                <div><div class="font-bold text-xs">${s}</div><div class="text-[9px] text-slate-400">${balanceLabel}: $ ${tokenInfo[s].price}</div></div>
            </div>
            <div class="text-right">
                <div class="font-black text-xs">${bal.toFixed(4)}</div>
                <div class="text-[9px] text-blue-500 font-bold">$ ${(bal * tokenInfo[s].price).toFixed(2)}</div>
            </div>
        </div>`;
    }).join('');
    if (document.getElementById('totalValue')) document.getElementById('totalValue').innerText = total.toFixed(2);
}

async function fetchUserData(addr) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${addr.toLowerCase()}`);
        const data = await res.json();
        if (data.balances) {
            userBalances = data.balances;
            renderTokenList(data.balances);
        }
    } catch (e) { renderTokenList({}); }
}

function showLoadingUI(hash) {
    document.getElementById('modalContent').innerHTML = `
        <div class="py-10 text-center">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="font-black text-slate-800" data-i18n="history_title">Pending...</p>
            <p class="text-[9px] text-slate-400 mt-2">Hash: ${hash.slice(0,10)}...</p>
        </div>`;
}

// 辅助计算函数 (保持不变)
async function doChainPay(biz) {
    let amt = (biz === 'MINER') ? document.getElementById('buyTotal').innerText.replace('$ ', '') : document.getElementById('elecCost').innerText.replace(' USDT', '');
    await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[biz], amt);
}

async function doRecharge() {
    const s = document.getElementById('recToken').value, a = document.getElementById('recAmount').value;
    await executeTokenTransfer(CONTRACT_ADDRS[s], RECEIVE_ADDRS.RECHARGE, a);
}

async function handleSignAction(type) {
    try {
        const msg = `${type} Request\nAccount: ${currentAddress}\nTime: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        if (sig) { alert("Success!"); closeModal(); }
    } catch (e) { alert("Canceled"); }
}

function setBuyNum(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.add('bg-blue-600', 'text-white');
    document.getElementById('buyTotal').innerText = `$ ${(n * 150).toFixed(2)}`;
}

function calcElec() {
    const n = document.getElementById('elecNum').value, d = document.getElementById('elecDays').value;
    document.getElementById('elecCost').innerText = (n * (d / 30) * 30).toFixed(2);
}

function calcSwap() {
    const fT = document.getElementById('sFromToken').value, tT = document.getElementById('sToToken').value;
    const amt = document.getElementById('sFromAmt').value || 0;
    document.getElementById('sToAmt').value = (amt * (tokenInfo[fT].price / tokenInfo[tT].price)).toFixed(6);
    document.getElementById('maxSwap').innerText = (i18n[currentLang]['balance'] || "余额") + ": " + (userBalances[fT] || 0);
}

function updateMax() {
    const t = document.getElementById('witToken').value;
    document.getElementById('maxWit').innerText = (userBalances[t] || 0).toFixed(4);
}
