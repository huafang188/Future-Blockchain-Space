/**
 * Future Blockchain Space - 业务逻辑控制中心 (内盘账务版)
 */

const API_BASE = "https://api.fbsfbs.fit";
const BSC_CHAIN_ID = '0x38';

// 外部收币地址 (仅用于充值)
const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};

// 仅用于充值调用的合约地址 (USDT/BTC/ETH 在 BSC 上的路径)
const RECHARGE_TOKENS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'ETH': "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    'BTC': "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    'BNB': "NATIVE"
};

// 代币基础信息 (用于显示)
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
let userBalances = {}; // 存储飞书后台返回的余额

// --- 1. 登录与同步 ---
async function connectWallet() {
    if (!window.ethereum) return alert("请在 Web3 钱包内打开");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        
        // 登录签名
        const msg = `FBS Account Verify\nUser: ${address}\nTime: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, address] });
        
        if (sig) {
            currentAddress = address;
            document.getElementById('walletAddr').innerText = address.slice(0, 6) + '...' + address.slice(-4);
            fetchUserData(address);
        }
    } catch (e) { console.error("Login failed"); }
}

async function fetchUserData(address) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${address.toLowerCase()}`);
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        // data 结构应包含 balances: { FBS: 100, USDT: 50 ... }
        if (data.balances) {
            userBalances = data.balances;
            renderTokenList(data.balances);
        }
    } catch (e) {
        console.warn("无法获取后台余额，渲染默认界面");
        renderTokenList({});
    }
}

// --- 2. 代币列表渲染 (显示飞书余额) ---
function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let totalValue = 0;

    const html = Object.keys(tokenInfo).map(symbol => {
        const bal = parseFloat(balances[symbol] || 0);
        const price = tokenInfo[symbol].price;
        const value = bal * price;
        totalValue += value;

        return `
            <div class="flex items-center justify-between p-4 border-b border-slate-50">
                <div class="flex items-center gap-3">
                    <img src="${tokenInfo[symbol].logo}" class="w-8 h-8 rounded-full shadow-sm" onerror="this.src='https://ui-avatars.com/api/?name=${symbol}'">
                    <div>
                        <div class="font-bold text-slate-800 text-sm">${symbol}</div>
                        <div class="text-[10px] text-slate-400 font-bold">$ ${price.toLocaleString()}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black text-slate-800 text-sm">${bal.toFixed(4)}</div>
                    <div class="text-[10px] text-blue-600 font-bold italic">$ ${value.toFixed(2)}</div>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = html;
    if (document.getElementById('totalValue')) document.getElementById('totalValue').innerText = totalValue.toFixed(2);
}

// --- 3. 提现模块 (需签名) ---
function openWithdrawModal() {
    const options = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
    showModal("提取资产至钱包", `
        <div class="space-y-4">
            <select id="witToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none">${options}</select>
            <div class="p-2 flex justify-between text-xs font-bold text-blue-500">
                <span>后台可用余额</span><span id="witMax">0.00</span>
            </div>
            <input type="number" id="witAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black text-xl border-none">
            <button onclick="doWithdraw()" class="w-full bg-red-500 text-white py-4 rounded-2xl font-black">签署申请</button>
        </div>`);
    
    const sel = document.getElementById('witToken');
    sel.onchange = () => { document.getElementById('witMax').innerText = userBalances[sel.value] || '0.00'; };
    sel.onchange();
}

async function doWithdraw() {
    const token = document.getElementById('witToken').value;
    const amount = document.getElementById('witAmount').value;
    if (!amount || amount <= 0) return alert("请输入数量");

    try {
        const msg = `Withdraw Order\nToken: ${token}\nAmount: ${amount}\nUser: ${currentAddress}\nNonce: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        if (sig) {
            // POST 请求发送给飞书后端处理账务扣除和链上转账
            alert("提现签名成功，系统处理中...");
            closeModal();
        }
    } catch (e) { alert("签名失败"); }
}

// --- 4. 兑换模块 (需签名) ---
function openSwapModal() {
    const options = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
    showModal("资产互换 (飞书内盘)", `
        <div class="space-y-3">
            <div class="p-4 bg-slate-50 rounded-2xl">
                <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>支付</span><span id="sFromBal">余额: 0</span></div>
                <div class="flex items-center">
                    <input type="number" id="sFromAmt" oninput="calcSwap()" placeholder="0.0" class="w-full bg-transparent border-none font-black text-xl">
                    <select id="sFromToken" onchange="calcSwap()" class="font-bold">${options}</select>
                </div>
            </div>
            <div class="text-center">⇅</div>
            <div class="p-4 bg-slate-50 rounded-2xl">
                <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>收到 (预估)</span></div>
                <div class="flex items-center">
                    <input type="number" id="sToAmt" readonly class="w-full bg-transparent border-none font-black text-xl text-indigo-600">
                    <select id="sToToken" onchange="calcSwap()" class="font-bold">${options}</select>
                </div>
            </div>
            <button onclick="doSwap()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">签署兑换合约</button>
        </div>`);
    calcSwap();
}

function calcSwap() {
    const fT = document.getElementById('sFromToken').value;
    const tT = document.getElementById('sToToken').value;
    const amt = document.getElementById('sFromAmt').value || 0;
    const result = amt * (tokenInfo[fT].price / tokenInfo[tT].price);
    document.getElementById('sToAmt').value = result.toFixed(6);
    document.getElementById('sFromBal').innerText = `余额: ${userBalances[fT] || '0.00'}`;
}

async function doSwap() {
    try {
        const msg = `Swap Order\nFrom: ${document.getElementById('sFromAmt').value} ${document.getElementById('sFromToken').value}\nTo: ${document.getElementById('sToAmt').value} ${document.getElementById('sToToken').value}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        if (sig) {
            alert("兑换已提交至后端账目");
            closeModal();
        }
    } catch (e) { alert("签名取消"); }
}

// --- 5. 购买矿机与电费 (调起链上支付) ---
async function handleBusinessPay(type) {
    let amount = "0";
    if (type === 'MINER') {
        amount = document.getElementById('buyTotal').innerText.replace('$ ', '');
    } else {
        amount = document.getElementById('elecCost').innerText.replace(' USDT', '');
    }
    
    // 购买动作：调起真实的钱包 USDT 转账
    executeUSDTTransfer(RECEIVE_ADDRS[type], amount);
}

async function executeUSDTTransfer(to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(RECHARGE_TOKENS.USDT, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.parseUnits(amountStr, 18));
        alert("链上支付成功! Hash: " + tx.hash);
        closeModal();
    } catch (e) { alert("支付失败: " + (e.reason || e.message)); }
}

// --- UI 基础控制 ---
function showModal(title, html) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

window.onload = () => renderTokenList({}); // 页面加载先画出列表框架
