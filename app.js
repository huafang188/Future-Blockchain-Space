/**
 * Future Blockchain Space - 核心业务逻辑 (全功能整合版)
 */

const API_BASE = "https://api.fbsfbs.fit";
const BSC_CHAIN_ID = '0x38';

// --- 1. 配置信息 ---
// 外部收币地址 (仅用于充值/购买/缴费)
const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};

// 合约地址 (仅用于链上支付)
const CONTRACT_ADDRS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'ETH': "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    'BTC': "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    'BNB': "NATIVE"
};

// 代币基础信息 (用于 UI 显示与汇率计算)
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
let userBalances = {}; // 存储从飞书获取的余额

// --- 2. 页面初始化 ---
window.onload = () => {
    console.log("FBS App Initialized");
    renderTokenList({}); // 即使没登录也先画出列表框架
};

// --- 3. 钱包连接与身份签名 ---
async function connectWallet() {
    if (!window.ethereum) return alert("请在 Web3 钱包内打开");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        
        const msg = `FBS Login\nAddress: ${address}\nTimestamp: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, address] });
        
        if (sig) {
            currentAddress = address;
            document.getElementById('walletAddr').innerText = address.slice(0, 6) + '...' + address.slice(-4);
            fetchUserData(address);
        }
    } catch (e) { alert("连接已取消"); }
}

async function fetchUserData(address) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${address.toLowerCase()}`);
        const data = await res.json();
        if (data.balances) {
            userBalances = data.balances;
            renderTokenList(data.balances);
        }
    } catch (e) {
        console.warn("无法同步后台数据，使用本地模拟展示");
        renderTokenList({});
    }
}

// --- 4. 渲染代币列表 (解决显示消失问题) ---
function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let totalVal = 0;

    const html = Object.keys(tokenInfo).map(symbol => {
        const bal = parseFloat(balances[symbol] || 0);
        const price = tokenInfo[symbol].price;
        const val = bal * price;
        totalVal += val;

        return `
            <div class="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50">
                <div class="flex items-center gap-3">
                    <img src="${tokenInfo[symbol].logo}" class="w-8 h-8 rounded-full" onerror="this.src='https://ui-avatars.com/api/?name=${symbol}'">
                    <div>
                        <div class="font-bold text-slate-800 text-sm">${symbol}</div>
                        <div class="text-[10px] text-slate-400 font-bold">$ ${price.toLocaleString()}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black text-slate-800 text-sm">${bal.toFixed(4)}</div>
                    <div class="text-[10px] text-blue-600 font-bold italic">$ ${val.toFixed(2)}</div>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = html;
    if (document.getElementById('totalValue')) {
        document.getElementById('totalValue').innerText = totalVal.toFixed(2);
    }
}

// --- 5. 路由路由逻辑 (匹配你的 HTML 按钮) ---

// 矿机模块入口
function openMinerModal(type) {
    if (type === 'buy') {
        const nums = [1, 5, 10, 15, 20, 25, 50, 100];
        showModal("购买矿机", `
            <div class="space-y-4">
                <div class="grid grid-cols-4 gap-2">
                    ${nums.map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border p-2 rounded-xl text-[10px] font-bold">${n}台</button>`).join('')}
                </div>
                <div class="p-4 bg-blue-50 rounded-2xl flex justify-between"><span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span></div>
                <button onclick="doChainPay('MINER')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">确认链上支付</button>
            </div>`);
    } else {
        const nums = [1, 5, 10, 15, 20, 25, 50, 100];
        const days = [30, 60, 90, 180, 360];
        showModal("缴纳电费", `
            <div class="space-y-4 text-left">
                <select id="elecNum" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none">${nums.map(n => `<option value="${n}">${n} 台</option>`).join('')}</select>
                <select id="elecDays" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none">${days.map(d => `<option value="${d}">${d} 天</option>`).join('')}</select>
                <div class="p-4 bg-slate-900 rounded-2xl flex justify-between items-center"><span id="elecCost" class="text-xl font-black text-yellow-500">30.00 USDT</span></div>
                <button onclick="doChainPay('ELECTRIC')" class="w-full bg-slate-800 text-white py-4 rounded-2xl font-black shadow-lg">确认链上支付</button>
            </div>`);
    }
}

// 财务模块入口
function openFinanceModal(type) {
    const options = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
    if (type === 'recharge') {
        showModal("充值资产", `
            <div class="space-y-4 text-left">
                <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none">${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t}">${t}</option>`).join('')}</select>
                <input type="number" id="recAmount" placeholder="输入充值数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none">
                <button onclick="doRecharge()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">调起钱包支付</button>
            </div>`);
    } else if (type === 'withdraw') {
        showModal("提币至钱包", `
            <div class="space-y-4 text-left">
                <select id="witToken" onchange="updateMax('wit')" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none">${options}</select>
                <div class="text-[10px] font-bold text-blue-500">当前后台余额: <span id="maxWit">0.00</span></div>
                <input type="number" id="witAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none">
                <button onclick="handleSignAction('WITHDRAW')" class="w-full bg-red-500 text-white py-4 rounded-2xl font-black">签名并提取</button>
            </div>`);
        updateMax('wit');
    } else if (type === 'exchange') {
        showModal("资产兑换", `
            <div class="space-y-3">
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                    <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>支付</span><span id="maxSwap">余额: 0</span></div>
                    <div class="flex items-center gap-2">
                        <input type="number" id="sFromAmt" oninput="calcSwap()" placeholder="0.0" class="w-full bg-transparent border-none font-black text-xl">
                        <select id="sFromToken" onchange="calcSwap()" class="font-bold border-none">${options}</select>
                    </div>
                </div>
                <div class="text-center">⇅</div>
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                    <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>收到 (预估)</span></div>
                    <div class="flex items-center gap-2">
                        <input type="number" id="sToAmt" readonly class="w-full bg-transparent border-none font-black text-xl text-indigo-600">
                        <select id="sToToken" onchange="calcSwap()" class="font-bold border-none">${options}</select>
                    </div>
                </div>
                <button onclick="handleSignAction('SWAP')" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">签名兑换</button>
            </div>`);
        updateMax('swap');
    }
}

// --- 6. 业务执行函数 ---

async function doRecharge() {
    const symbol = document.getElementById('recToken').value;
    const amount = document.getElementById('recAmount').value;
    if (symbol === 'BNB') {
        await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
    } else {
        await executeTokenTransfer(CONTRACT_ADDRS[symbol], RECEIVE_ADDRS.RECHARGE, amount);
    }
}

async function handleSignAction(actionType) {
    try {
        const msg = `${actionType} Request\nWallet: ${currentAddress}\nTime: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        if (sig) {
            alert("签名提交成功，请等待系统处理");
            closeModal();
        }
    } catch (e) { alert("操作已取消"); }
}

async function doChainPay(bizType) {
    let amountStr = "0";
    if (bizType === 'MINER') amountStr = document.getElementById('buyTotal').innerText.replace('$ ', '');
    else amountStr = document.getElementById('elecCost').innerText.replace(' USDT', '');
    
    await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], amountStr);
}

// --- 7. 底层 Web3 转账封装 ---
async function executeTokenTransfer(contract, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const busd = new ethers.Contract(contract, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        const tx = await busd.transfer(to, ethers.parseUnits(amountStr, 18));
        alert("交易已发送: " + tx.hash);
        closeModal();
    } catch (e) { alert("支付失败: " + (e.reason || e.message)); }
}

async function executeNativeTransfer(to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({ to: to, value: ethers.parseEther(amountStr) });
        alert("充值成功: " + tx.hash);
        closeModal();
    } catch (e) { alert("交易失败"); }
}

// --- 8. 辅助计算 ---
function showModal(title, html) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

function setBuyNum(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.add('bg-blue-600', 'text-white');
    document.getElementById('buyTotal').innerText = `$ ${(n * 150).toFixed(2)}`;
}

function calcElec() {
    const n = document.getElementById('elecNum').value;
    const d = document.getElementById('elecDays').value;
    document.getElementById('elecCost').innerText = (n * (d / 30) * 30).toFixed(2) + " USDT";
}

function calcSwap() {
    const fT = document.getElementById('sFromToken').value;
    const tT = document.getElementById('sToToken').value;
    const amt = document.getElementById('sFromAmt').value || 0;
    const res = amt * (tokenInfo[fT].price / tokenInfo[tT].price);
    document.getElementById('sToAmt').value = res.toFixed(6);
}

function updateMax(type) {
    const t = type === 'wit' ? document.getElementById('witToken').value : document.getElementById('sFromToken').value;
    const val = userBalances[t] || 0;
    if (type === 'wit') document.getElementById('maxWit').innerText = val;
    else document.getElementById('maxSwap').innerText = "余额: " + val;
}
