/**
 * Future Blockchain Space - 旗舰安全美化版
 * 功能：强制签名登录、实时账号同步、纠正电费逻辑、全自定义美化弹窗
 */

// --- 基础配置 ---
const API_BASE = "https://api.fbsfbs.fit";
const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};
const CONTRACT_ADDRS = { 'USDT': "0x55d398326f99059ff775485246999027b3197955" };

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
let currentLang = localStorage.getItem('fbs_lang') || 'zh-CN';

// --- 1. 初始化与全局监听 ---
window.onload = async () => {
    updateViewText();
    renderTokenList({});

    if (window.ethereum) {
        // 【核心】监听账号切换：换号即强制退出，要求重新签名
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0 && accounts[0].toLowerCase() !== currentAddress?.toLowerCase()) {
                handleLogout();
                connectWallet(); // 重新拉起签名
            } else if (accounts.length === 0) {
                handleLogout();
            }
        });

        // 自动检查：如果之前成功签名过，尝试拉起
        if (localStorage.getItem('fbs_isLoggedIn') === 'true') {
            connectWallet(true);
        }
    }
};

// --- 2. 身份验证 (签名逻辑) ---
async function connectWallet(isAuto = false) {
    if (!window.ethereum) return isAuto ? null : customAlert("请在 Web3 浏览器中打开");

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        // 【关键】强制签名：防止只连钱包不登录
        const msg = `FBS Login Request\nWallet: ${address}\nTimestamp: ${Date.now()}`;
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [msg, address]
        });

        if (signature) {
            currentAddress = address;
            localStorage.setItem('fbs_isLoggedIn', 'true');
            handleNewAddress(address);
        }
    } catch (e) {
        handleLogout();
        if (!isAuto) customAlert("验证已取消或失败");
    }
}

async function handleNewAddress(address) {
    document.getElementById('walletAddr').innerText = address.slice(0, 6) + '...' + address.slice(-4);
    await fetchUserData(address);
    updateViewText();
}

function handleLogout() {
    currentAddress = null;
    userBalances = {};
    localStorage.removeItem('fbs_isLoggedIn');
    document.getElementById('walletAddr').innerText = i18n[currentLang]['connect'];
    renderTokenList({});
}

// --- 3. 业务逻辑 (电费计算纠正) ---
function calcElec() {
    const n = parseInt(document.getElementById('elecNum').value) || 0;
    const d = parseInt(document.getElementById('elecDays').value) || 0;
    // 逻辑：矿机数 * (天数/30) * 30 USDT
    const cost = n * (d / 30) * 30; 
    document.getElementById('elecCost').innerText = cost.toFixed(2) + " USDT";
}

function checkAuth() {
    if (!currentAddress) {
        customAlert(i18n[currentLang]['connect'] || "请先连接钱包");
        connectWallet();
        return false;
    }
    return true;
}

// --- 4. UI 翻译与弹窗美化 ---
function switchLang(lang) {
    currentLang = lang;
    localStorage.setItem('fbs_lang', lang);
    updateViewText();
    renderTokenList(userBalances);
}

function updateViewText() {
    const data = i18n[currentLang];
    if (!data) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (data[key]) {
            el.tagName === 'INPUT' ? el.placeholder = data[key] : el.innerText = data[key];
        }
    });
    const select = document.getElementById('langSelect');
    if (select) select.value = currentLang;
}

function customAlert(msg) {
    showModal('history_title', `<div class="py-6 text-center text-slate-200 font-bold">${msg}</div>
    <button onclick="closeModal()" class="w-full py-4 bg-indigo-600 rounded-2xl font-black shadow-lg shadow-indigo-500/30">OK</button>`);
}

function showModal(titleKey, html) {
    const title = i18n[currentLang][titleKey] || titleKey;
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalContent').innerHTML = html;
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex'; // 确保居中
    updateViewText();
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('modalOverlay').classList.add('hidden');
}

// --- 5. 弹窗路由函数 ---
function openMinerModal(type) {
    if (!checkAuth()) return;
    const nums = [1, 5, 10, 15, 20, 25, 50, 100];
    const days = [30, 60, 90, 180, 360];

    if (type === 'buy') {
        showModal('buy_miner', `
            <div class="space-y-4">
                <div class="grid grid-cols-4 gap-2">
                    ${nums.map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-700 p-2 rounded-xl text-[10px] font-bold text-slate-300 hover:bg-indigo-600">${n}台</button>`).join('')}
                </div>
                <div class="p-4 bg-slate-800/80 rounded-2xl flex justify-between border border-indigo-500/30"><span id="buyTotal" class="text-xl font-black text-indigo-400">$ 0.00</span></div>
                <button onclick="doChainPay('MINER')" class="w-full bg-indigo-600 py-4 rounded-2xl font-black shadow-lg" data-i18n="confirm_pay">立即支付</button>
            </div>`);
    } else {
        showModal('pay_fee', `
            <div class="space-y-4">
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] text-slate-500 font-bold" data-i18n="m_count">数量</label>
                    <select id="elecNum" onchange="calcElec()" class="w-full p-4 bg-slate-800 rounded-2xl border-none outline-none text-white appearance-none cursor-pointer">
                        ${nums.map(n => `<option value="${n}">${n} 台</option>`).join('')}
                    </select>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] text-slate-500 font-bold" data-i18n="m_term">周期</label>
                    <select id="elecDays" onchange="calcElec()" class="w-full p-4 bg-slate-800 rounded-2xl border-none outline-none text-white appearance-none cursor-pointer">
                        ${days.map(d => `<option value="${d}">${d} 天</option>`).join('')}
                    </select>
                </div>
                <div class="p-4 bg-slate-900 rounded-2xl flex justify-between items-center border border-yellow-500/20">
                    <span class="text-xs text-slate-400">Total</span>
                    <span id="elecCost" class="text-xl font-black text-yellow-500">30.00 USDT</span>
                </div>
                <button onclick="doChainPay('ELECTRIC')" class="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-black shadow-lg" data-i18n="confirm_pay">确认支付</button>
            </div>`);
        calcElec();
    }
}

function openFinanceModal(type) {
    if (!checkAuth()) return;
    if (type === 'exchange') {
        showModal('exchange', `
            <div class="space-y-4">
                <div class="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                    <div class="flex justify-between text-[10px] text-slate-400 mb-2">
                        <span data-i18n="balance">余额</span>: <span id="maxSwap">0.00</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="number" id="sFromAmt" oninput="calcSwap()" placeholder="0.0" class="flex-1 bg-transparent border-none text-xl font-black outline-none text-white">
                        <span class="font-bold text-indigo-400">USDT</span>
                    </div>
                </div>
                <div class="text-center text-indigo-500 text-xl font-black">↓</div>
                <div class="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                    <div class="flex items-center gap-2">
                        <input type="number" id="sToAmt" readonly class="flex-1 bg-transparent border-none text-xl font-black text-slate-400 outline-none">
                        <span class="font-bold text-emerald-400">FBS</span>
                    </div>
                </div>
                <button onclick="handleSignAction('SWAP')" class="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl font-black" data-i18n="exchange">确认兑换</button>
            </div>`);
        calcSwap();
    }
}

// --- 6. 核心支付与 API ---
async function doChainPay(biz) {
    try {
        const amtText = (biz === 'MINER') ? document.getElementById('buyTotal').innerText : document.getElementById('elecCost').innerText;
        const amt = amtText.replace(/[^\d.]/g, '');
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRS.USDT, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        const tx = await contract.transfer(RECEIVE_ADDRS[biz], ethers.parseUnits(amt, 18));
        showLoadingUI(tx.hash);
        await tx.wait();
        customAlert("✅ 交易成功");
        closeModal();
        fetchUserData(currentAddress);
    } catch (e) {
        customAlert("支付失败: " + (e.reason || "用户取消"));
    }
}

function calcSwap() {
    const amt = parseFloat(document.getElementById('sFromAmt').value) || 0;
    document.getElementById('sToAmt').value = (amt * 10).toFixed(2); // 汇率 1:10
    document.getElementById('maxSwap').innerText = (userBalances['USDT'] || 0).toFixed(2);
}

function showLoadingUI(hash) {
    document.getElementById('modalContent').innerHTML = `
        <div class="py-10 text-center space-y-4">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500 mx-auto"></div>
            <p class="font-black text-slate-200">正在打包区块...</p>
            <p class="text-[9px] text-slate-500">Hash: ${hash.slice(0, 20)}...</p>
        </div>`;
}

function renderTokenList(balances) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let total = 0;
    container.innerHTML = Object.keys(tokenInfo).map(s => {
        const bal = parseFloat(balances[s] || 0);
        total += bal * tokenInfo[s].price;
        return `<div class="flex items-center justify-between p-4 border-b border-slate-800/50">
            <div class="flex items-center gap-3">
                <img src="${tokenInfo[s].logo}" class="w-8 h-8 rounded-full shadow-lg shadow-indigo-500/20">
                <div><div class="font-bold text-xs text-white">${s}</div><div class="text-[9px] text-slate-500">$ ${tokenInfo[s].price}</div></div>
            </div>
            <div class="text-right">
                <div class="font-black text-xs text-slate-200">${bal.toFixed(4)}</div>
                <div class="text-[9px] text-indigo-400 font-bold">$ ${(bal * tokenInfo[s].price).toFixed(2)}</div>
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

function setBuyNum(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-indigo-600', 'text-white'));
    btn.classList.add('bg-indigo-600', 'text-white');
    document.getElementById('buyTotal').innerText = `$ ${(n * 150).toFixed(2)}`;
}
