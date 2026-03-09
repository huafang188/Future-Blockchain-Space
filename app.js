/**
 * Future Blockchain Space - 逻辑控制中心 (增强版)
 */

// 1. 核心地址配置 (在这里修改你的收款地址)
const RECEIVE_ADDRESSES = {
    MINER: "0x矿机收款专用地址...",
    ELECTRIC: "0x电费收款专用地址...",
    DEPOSIT: "0x账户充值专用地址..."
};

const USDT_ADDR = "0x55d398326f99059fF775485246999027B3197955"; // BSC USDT
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

// --- 获取当前语言文本的辅助函数 ---
function getT(key) {
    const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    return (i18n[lang] && i18n[lang][key]) ? i18n[lang][key] : key;
}

// --- 2. 渲染代币列表 ---
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
            <div class="flex items-center justify-between p-4 hover:bg-slate-50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold">${tokenData[symbol].logo}</div>
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
    document.getElementById('totalValue').innerText = totalAssetsValue.toFixed(2);
}

// --- 3. 弹窗逻辑 (已整合多收款地址与多语言) ---
function openMinerModal(type) {
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    
    if (type === 'buy') {
        title.innerText = getT('buy_miner');
        content.innerHTML = `
            <div class="space-y-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase">SELECT QTY (150 USDT/Unit)</label>
                <div class="grid grid-cols-3 gap-2">
                    ${[1, 5, 10, 20, 50, 100].map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-blue-50">${n}</button>`).join('')}
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl flex justify-between">
                    <span class="text-xs font-bold text-slate-500 italic">Target: ${RECEIVE_ADDRESSES.MINER.slice(0,6)}...${RECEIVE_ADDRESSES.MINER.slice(-4)}</span>
                    <span class="text-lg font-black text-blue-600" id="buyTotal">$ 0.00</span>
                </div>
                <button onclick="handleContractPay('MINER')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200">${getT('confirm_pay')}</button>
            </div>`;
    } else {
        title.innerText = getT('pay_fee');
        content.innerHTML = `
            <div class="space-y-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase">PERIOD ($60/30 Days)</label>
                <select id="feeDays" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm">
                    <option value="30">30 Days ($60)</option>
                    <option value="60">60 Days ($120)</option>
                    <option value="180">180 Days ($360)</option>
                </select>
                <button onclick="handleContractPay('ELECTRIC')" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">${getT('confirm_pay')}</button>
            </div>`;
    }
    document.getElementById('modalOverlay').classList.remove('hidden');
}

// --- 4. 统一转账处理函数 ---
async function handleContractPay(businessType) {
    if(!window.ethereum) return alert("Please connect wallet");
    
    const targetAddr = RECEIVE_ADDRESSES[businessType]; // 根据业务类型自动获取不同地址
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // 获取支付金额
    let rawAmount = "0";
    if(businessType === 'MINER') {
        rawAmount = document.getElementById('buyTotal').innerText.replace('$ ', '');
    } else if(businessType === 'ELECTRIC') {
        const days = document.getElementById('feeDays').value;
        rawAmount = (days / 30 * 60).toString();
    }

    try {
        const usdtAbi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const usdtContract = new ethers.Contract(USDT_ADDR, usdtAbi, signer);
        const amount = ethers.parseUnits(rawAmount, 18);
        
        const tx = await usdtContract.transfer(targetAddr, amount);
        alert("Transaction Sent! Hash: " + tx.hash);
        // 这里调用你的飞书 API 记录 tx.hash, businessType, rawAmount
    } catch (e) {
        alert("Payment Failed: " + e.message);
    }
}

// --- 5. 语言切换逻辑 ---
function switchLang(lang) {
    localStorage.setItem('fbs_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang] && i18n[lang][key]) el.innerText = i18n[lang][key];
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    renderTokens();
    const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
    document.getElementById('langSelect').value = savedLang;
    switchLang(savedLang);
});

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
function setBuyNum(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.add('bg-blue-600', 'text-white');
    document.getElementById('buyTotal').innerText = `$ ${(n * 150).toFixed(2)}`;
}
