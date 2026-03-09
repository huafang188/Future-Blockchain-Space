/**
 * Future Blockchain Space - 逻辑控制中心
 * 1. 自动适配 BNB 网络 (ChainId: 56)
 * 2. 处理多表飞书映射
 * 3. 唤起钱包转账功能
 */

const RECEIVER_ADDR = "0x你的指定收币地址"; 
const USDT_ADDR = "0x55d398326f99059fF775485246999027B3197955"; // BSC 网络 USDT 地址
const tokenList = ['FBS', 'FBST', 'FBSP', 'PBSU', 'USDT', 'BNB', 'BTC', 'ETH'];

// --- 弹窗逻辑：购买矿机 ---
function openMinerModal(type) {
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    
    if (type === 'buy') {
        title.innerText = "购买矿机 (Buy Miner)";
        content.innerHTML = `
            <div class="space-y-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase">选择数量 (每台 150 USDT)</label>
                <div class="grid grid-cols-3 gap-2">
                    ${[1, 5, 10, 20, 50, 100].map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-blue-50">${n}台</button>`).join('')}
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-500">支付总计:</span>
                    <span class="text-lg font-black text-blue-600" id="buyTotal">$ 0.00</span>
                </div>
                <button onclick="handlePayMiner()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200">立即支付</button>
            </div>
        `;
    } else {
        title.innerText = "缴纳电费 (Electricity)";
        content.innerHTML = `
            <div class="space-y-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase">缴纳周期 (每台 $60/30天)</label>
                <select id="feeDays" class="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm">
                    <option value="30">30 天 ($60/台)</option>
                    <option value="60">60 天 ($120/台)</option>
                    <option value="90">90 天 ($180/台)</option>
                    <option value="180">180 天 ($360/台)</option>
                </select>
                <button onclick="handlePayFee()" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">确认缴纳</button>
            </div>
        `;
    }
    document.getElementById('modalOverlay').classList.remove('hidden');
}

// --- 弹窗逻辑：金融操作 (充提兑) ---
function openFinanceModal(type) {
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    document.getElementById('modalOverlay').classList.remove('hidden');

    if (type === 'recharge') {
        title.innerText = "充值 (Deposit)";
        content.innerHTML = `
            <div class="space-y-4">
                <select id="recType" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm">
                    ${tokenList.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <input id="recAmount" type="number" placeholder="输入充值数量" class="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm outline-none">
                <button onclick="handleRecharge()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">立即转账</button>
            </div>
        `;
    } else if (type === 'withdraw') {
        title.innerText = "提币 (Withdraw)";
        content.innerHTML = `
            <div class="space-y-4">
                <select id="wdType" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm">
                    ${tokenList.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <div class="relative">
                    <input id="wdAmount" type="number" placeholder="输入提现数量" class="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm outline-none">
                    <span class="absolute right-4 top-4 text-[10px] text-slate-400 font-bold">余额: <b id="wdBalance">0.00</b></span>
                </div>
                <button class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">提交审核</button>
            </div>
        `;
    } else if (type === 'exchange') {
        title.innerText = "兑换 (Exchange)";
        content.innerHTML = `
            <div class="space-y-4">
                <div class="flex gap-2">
                    <select class="flex-1 p-3 bg-slate-50 rounded-xl border-none text-xs font-bold"><option>USDT</option></select>
                    <div class="flex items-center">➡️</div>
                    <select class="flex-1 p-3 bg-slate-50 rounded-xl border-none text-xs font-bold"><option>FBS</option></select>
                </div>
                <input type="number" placeholder="兑出数量" class="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm outline-none">
                <div class="text-center text-blue-600 font-bold text-xs italic">实时汇率: 1 USDT = 10 FBS</div>
                <button class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">确认兑换</button>
            </div>
        `;
    }
}

// --- 钱包转账核心函数 (基于 Ethers.js) ---
async function handlePayMiner() {
    if(!window.ethereum) return alert("请先连接钱包");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // USDT 转账逻辑 (需定义 ABI)
    const usdtAbi = ["function transfer(address to, uint256 amount) public returns (bool)"];
    const usdtContract = new ethers.Contract(USDT_ADDR, usdtAbi, signer);
    
    const amountStr = document.getElementById('buyTotal').innerText.replace('$ ', '');
    const amount = ethers.parseUnits(amountStr, 18);

    try {
        const tx = await usdtContract.transfer(RECEIVER_ADDR, amount);
        alert("交易已提交，等待上链记录...");
        // 记录到飞书逻辑...
        logToFeishu(tx.hash, '购买矿机', amountStr);
    } catch (e) {
        console.error(e);
        alert("支付失败");
    }
}

// 关闭弹窗
function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

// 设置购买数量
function setBuyNum(num, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.add('bg-blue-600', 'text-white');
    document.getElementById('buyTotal').innerText = `$ ${(num * 150).toFixed(2)}`;
}
