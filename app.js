/**
 * Future Blockchain Space - 业务逻辑控制中心 (2026 增强版)
 */

// --- 1. 核心配置 ---
const API_BASE = "https://api.fbsfbs.fit";
const BSC_CHAIN_ID = '0x38';

// 业务收款地址
const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};

// 代币合约配置
const TOKENS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'ETH': "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    'BTC': "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    'BNB': "NATIVE" // BNB 是原生代币
};

let currentAddress = null;

// --- 2. 链接钱包与登录签名 ---
async function connectWallet() {
    if (!window.ethereum) return alert("请在 Web3 钱包（Bitget/TP/MetaMask）内打开");

    try {
        // A. 切换网络
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BSC_CHAIN_ID }],
            });
        } catch (e) { console.warn("Network switch skipped"); }

        // B. 获取账户
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        // C. 登录签名 (必须输入密码后才算连接成功)
        const msg = `Future Blockchain Space Login\nVerify: ${address}\nTime: ${Date.now()}`;
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [msg, address],
        });

        if (signature) {
            currentAddress = address;
            updateWalletUI(address);
            fetchUserData(address); // 调用飞书后端
            console.log("登录签名成功:", signature);
        }
    } catch (err) {
        alert("用户取消或链接失败: " + err.message);
    }
}

// --- 3. 业务弹窗模块 ---

// A. 充值弹窗
function openRechargeModal() {
    const content = document.getElementById('modalContent');
    document.getElementById('modalTitle').innerText = "资产充值 (Recharge)";
    content.innerHTML = `
        <div class="space-y-4">
            <label class="block text-xs font-bold text-slate-400">选择币种 (Select Token)</label>
            <select id="rechargeToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500">
                <option value="USDT">USDT (BSC)</option>
                <option value="BNB">BNB (Native)</option>
                <option value="BTC">BTC (Chain-B)</option>
                <option value="ETH">ETH (Chain-B)</option>
            </select>
            <label class="block text-xs font-bold text-slate-400">输入数量 (Amount)</label>
            <input type="number" id="rechargeAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black text-xl border-none">
            <button onclick="handleRecharge()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">确认充值</button>
        </div>`;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

// B. 购买矿机弹窗
function openMinerModal() {
    const content = document.getElementById('modalContent');
    document.getElementById('modalTitle').innerText = "购买矿机 (Buy Miner)";
    const nums = [1, 5, 10, 15, 20, 25, 50, 100];
    content.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-4 gap-2">
                ${nums.map(n => `<button onclick="updateMinerBuyUI(${n}, this)" class="buy-btn border p-2 rounded-xl text-xs font-bold">${n}台</button>`).join('')}
            </div>
            <div class="p-4 bg-blue-50 rounded-2xl flex justify-between items-center">
                <span class="text-xs font-bold text-blue-400">支付代币: USDT</span>
                <span id="buyCost" class="text-xl font-black text-blue-700">$ 0.00</span>
            </div>
            <button onclick="handleBuyMiner()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">立即购买</button>
        </div>`;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

// C. 缴纳电费弹窗
function openElectricModal() {
    const content = document.getElementById('modalContent');
    document.getElementById('modalTitle').innerText = "缴纳电费 (Electric Fee)";
    const nums = [1, 5, 10, 15, 20, 25, 50, 100];
    const days = [30, 60, 90, 180, 360];
    content.innerHTML = `
        <div class="space-y-4">
            <label class="text-[10px] font-bold text-slate-400">矿机数量 (Miners)</label>
            <select id="elecNum" onchange="calcElectric()" class="w-full p-3 bg-slate-50 rounded-xl border-none">
                ${nums.map(n => `<option value="${n}">${n} 台</option>`).join('')}
            </select>
            <label class="text-[10px] font-bold text-slate-400">缴纳天数 (Days)</label>
            <select id="elecDays" onchange="calcElectric()" class="w-full p-3 bg-slate-50 rounded-xl border-none">
                ${days.map(d => `<option value="${d}">${d} 天</option>`).join('')}
            </select>
            <div class="p-4 bg-slate-900 rounded-2xl flex justify-between items-center">
                <span class="text-xs text-slate-400">总费用 (USDT)</span>
                <span id="elecCost" class="text-xl font-black text-yellow-500">30.00</span>
            </div>
            <button onclick="handlePayElectric()" class="w-full bg-slate-800 text-white py-4 rounded-2xl font-black">确认缴纳</button>
        </div>`;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

// --- 4. 支付执行逻辑 ---

// 执行充值
async function handleRecharge() {
    const symbol = document.getElementById('rechargeToken').value;
    const amount = document.getElementById('rechargeAmount').value;
    if (!amount || amount <= 0) return alert("请输入正确数量");

    if (symbol === 'BNB') {
        await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
    } else {
        await executeTokenTransfer(TOKENS[symbol], RECEIVE_ADDRS.RECHARGE, amount);
    }
}

// 执行购买矿机
async function handleBuyMiner() {
    const cost = document.getElementById('buyCost').innerText.replace('$ ', '');
    if (parseFloat(cost) <= 0) return alert("请选择购买数量");
    await executeTokenTransfer(TOKENS.USDT, RECEIVE_ADDRS.MINER, cost);
}

// 执行缴纳电费
async function handlePayElectric() {
    const cost = document.getElementById('elecCost').innerText;
    await executeTokenTransfer(TOKENS.USDT, RECEIVE_ADDRS.ELECTRIC, cost);
}

// --- 5. Web3 交易底层封装 ---

// 原生 BNB 转账
async function executeNativeTransfer(to, amount) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
            to: to,
            value: ethers.parseEther(amount.toString())
        });
        alert("交易已提交: " + tx.hash);
        closeModal();
    } catch (e) { alert("交易失败: " + e.message); }
}

// 合约代币转账 (USDT/BTC/ETH)
async function executeTokenTransfer(contractAddr, to, amount) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(contractAddr, abi, signer);
        
        // 注意：BSC 上的这些代币一般都是 18 位小数，如有特殊需调整
        const parsedAmount = ethers.parseUnits(amount.toString(), 18);
        
        const tx = await contract.transfer(to, parsedAmount);
        alert("支付成功! Hash: " + tx.hash);
        closeModal();
    } catch (e) {
        alert("支付中止: " + (e.reason || e.message));
    }
}

// --- 6. 辅助 UI 计算 ---

function updateMinerBuyUI(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.add('bg-blue-600', 'text-white');
    document.getElementById('buyCost').innerText = `$ ${(n * 150).toFixed(2)}`;
}

function calcElectric() {
    const num = document.getElementById('elecNum').value;
    const days = document.getElementById('elecDays').value;
    // 费用 = 台数 * (天数 / 30) * 30
    const total = num * (days / 30) * 30;
    document.getElementById('elecCost').innerText = total.toFixed(2);
}

function updateWalletUI(addr) {
    const btn = document.getElementById('walletAddr');
    if (btn) btn.innerText = addr.slice(0, 6) + '...' + addr.slice(-4);
}

// 模拟飞书后端调用
async function fetchUserData(address) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${address.toLowerCase()}`);
        const data = await res.json();
        // 此处渲染你的资产列表
        console.log("飞书数据同步成功:", data);
    } catch (e) { console.warn("后端同步超时"); }
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

document.addEventListener('DOMContentLoaded', () => {
    // 初始渲染资产列表等逻辑
});
