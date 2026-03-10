/**
 * Future Blockchain Space - 逻辑控制中心 (正式终极版)
 */

// 1. 核心地址与 API 配置
const API_BASE = "https://api.fbsfbs.fit"; 

const RECEIVE_ADDRESSES = {
    MINER: "0x8922A66C6898d9e26D9747206466795880482937",    
    ELECTRIC: "0x8922A66C6898d9e26D9747206466795880482937", 
    DEPOSIT: "0x8922A66C6898d9e26D9747206466795880482937"    
};

const USDT_ADDR = "0x55d398326f99059fF775485246999027B3197955"; 

// BSC 网络参数配置
const BSC_CHAIN_ID = '0x38'; // 56
const BSC_RPC_PARAMS = {
    chainId: BSC_CHAIN_ID,
    chainName: 'Binance Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com/']
};

const tokenData = {
    'FBS': { price: 0.1, logo: 'assets/fbs_logo.png' },
    'FBST': { price: 0.05, logo: 'assets/fbst_logo.png' },
    'FBSP': { price: 1.2, logo: 'assets/fbsp_logo.png' },
    'PBSU': { price: 1.0, logo: 'assets/fbsu_logo.png' }, 
    'USDT': { price: 1.0, logo: 'assets/USDT.png' },
    'BNB': { price: 600, logo: 'assets/BNB.png' },
    'BTC': { price: 65000, logo: 'assets/BTC.png' },
    'ETH': { price: 3500, logo: 'assets/ETH.png' }
};

// --- 辅助函数：地址格式校验 (修复 Checksum 报错的关键) ---
function getSafeAddr(addr) {
    try {
        return ethers.getAddress(addr);
    } catch (e) {
        console.error("Invalid Address Checksum:", addr);
        return addr;
    }
}

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
                    <div class="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-100 overflow-hidden shadow-sm shrink-0">
                        <img src="${tokenData[symbol].logo}" 
                             class="w-full h-full object-cover" 
                             alt="${symbol}"
                             onerror="this.src='https://ui-avatars.com/api/?name=${symbol}&background=random'">
                    </div>
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

// --- 3. 弹窗逻辑 ---
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
                <button onclick="handleFinanceAction('recharge')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200">
                    ${getT('confirm_pay')}
                </button>
            </div>`;
    } else {
        title.innerText = "Coming Soon";
        content.innerHTML = `<div class="p-8 text-center text-slate-500 font-bold">🚧 功能开发中...</div>`;
    }
    if (overlay) overlay.classList.remove('hidden');
}

// --- 5. Web3 转账执行 ---
async function handleContractPay(businessType) {
    if(!window.ethereum) return alert("Please use a Web3 browser or Wallet");
    
    // 强制检查 BSC 网络
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== BSC_CHAIN_ID) return connectWallet(); // 若网络不对，引导重新连接/切换

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

async function handleFinanceAction(action) {
    if (action === 'recharge') {
        const amt = document.getElementById('rechargeAmount').value;
        if (!amt || parseFloat(amt) < 10) return alert("Min deposit: 10 USDT");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        await executeTransfer(signer, RECEIVE_ADDRESSES.DEPOSIT, amt);
    }
}

async function executeTransfer(signer, to, amountStr) {
    try {
        const usdtAbi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        // 关键：对合约地址和目标地址都使用 getSafeAddr
        const usdtContract = new ethers.Contract(getSafeAddr(USDT_ADDR), usdtAbi, signer);
        const amount = ethers.parseUnits(amountStr, 18);
        
        const tx = await usdtContract.transfer(getSafeAddr(to), amount);
        alert("Success! Tx Hash: " + tx.hash);
        closeModal();
    } catch (e) {
        alert("Transaction Error: " + (e.reason || e.message));
    }
}

// --- 6. 核心连接逻辑：钱包 + 强制网络 + 自动数据同步 ---
let currentAddress = null;

async function connectWallet() {
    if (!window.ethereum) return alert("请使用 Web3 浏览器或安装钱包插件");
    
    try {
        // 1. 强制切换到 BSC 网络
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId !== BSC_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BSC_CHAIN_ID }],
                });
            } catch (err) {
                if (err.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BSC_RPC_PARAMS],
                    });
                } else throw err;
            }
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        const message = `Welcome to Future Blockchain Space!\n\nTimestamp: ${Date.now()}\nWallet: ${address}`;
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, address],
        });

        if (signature) {
            currentAddress = address;
            updateWalletUI(address);
            fetchUserData(address); // 登录成功后拉取数据
        }
    } catch (error) {
        console.error(error);
        alert("授权失败: " + (error.message || "User Cancelled"));
    }
}

async function fetchUserData(address) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${address.toLowerCase()}`);
        if (!res.ok) throw new Error("Server Error 500");
        const data = await res.json();

        if (data.newUser) {
            showRegisterModal(address);
        } else {
            syncUIData(data); 
        }
    } catch (err) {
        console.warn("Data Fetch Failed:", err);
    }
}

function syncUIData(data) {
    if (data.balances) renderTokens(data.balances);
    const inviteEl = document.getElementById('inviteCount');
    if (inviteEl && data.inviteCount) inviteEl.innerText = data.inviteCount;
}

// --- 7. UI 辅助逻辑 ---
function updateWalletUI(address) {
    const btn = document.getElementById('walletAddr');
    if (address) {
        btn.innerText = address.slice(0, 6) + "..." + address.slice(-4);
        btn.onclick = disconnectWallet;
    } else {
        btn.innerText = "连接钱包";
        btn.onclick = connectWallet;
    }
}

function disconnectWallet() {
    if (confirm("确定要退出连接吗？")) {
        currentAddress = null;
        updateWalletUI(null);
        renderTokens({});
        document.getElementById('totalValue').innerText = "0.00";
    }
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

function setBuyNum(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600'));
    btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
    document.getElementById('buyTotal').innerText = `$ ${(n * 150).toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    renderTokens();
    const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
    if (document.getElementById('langSelect')) document.getElementById('langSelect').value = savedLang;
});
