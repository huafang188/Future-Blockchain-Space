/**
 * Future Blockchain Space - 逻辑控制中心 (正式终极版)
 * 修复内容：
 * 1. 强制 BSC 网络切换逻辑
 * 2. Ethers.js v6 地址 Checksum 自动格式化
 * 3. 登录成功后自动拉取飞书后端数据
 * 4. 资产列表图标 img 渲染及容错处理
 */

// 1. 核心地址与 API 配置
const API_BASE = "https://api.fbsfbs.fit"; 

const RECEIVE_ADDRESSES = {
    MINER: "0x8922A66C6898d9e26D9747206466795880482937",    
    ELECTRIC: "0x8922A66C6898d9e26D9747206466795880482937", 
    DEPOSIT: "0x8922A66C6898d9e26D9747206466795880482937"    
};

const USDT_ADDR = "0x55d398326f99059fF775485246999027B3197955"; 

// BSC 网络参数 (强制切换使用)
const BSC_CHAIN_ID = '0x38'; // 56 的十六进制
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

// --- 辅助函数：地址 Checksum 修复 (解决 INVALID_ARGUMENT 报错) ---
function getSafeAddr(addr) {
    try {
        // Ethers v6 必须使用 getAddress 转换全小写地址
        return ethers.getAddress(addr);
    } catch (e) {
        console.error("Address Error:", addr);
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

// --- 3. 弹窗与支付逻辑 ---
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

async function handleContractPay(businessType) {
    if(!window.ethereum) return alert("Please use a Web3 browser or Wallet");
    
    // 发起支付前强制再次检查网络
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== BSC_CHAIN_ID) {
        alert("请切换到 BSC 网络后再支付");
        return connectWallet(); 
    }

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

async function executeTransfer(signer, to, amountStr) {
    try {
        const usdtAbi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        // 关键：对合约和目标地址应用 getSafeAddr 解决 Checksum 报错
        const usdtContract = new ethers.Contract(getSafeAddr(USDT_ADDR), usdtAbi, signer);
        const amount = ethers.parseUnits(amountStr, 18);
        
        const tx = await usdtContract.transfer(getSafeAddr(to), amount);
        alert("Success! Tx Hash: " + tx.hash);
        closeModal();
    } catch (e) {
        alert("Transaction Error: " + (e.reason || e.message));
    }
}

// --- 6. 核心连接逻辑：强制 BSC 网络 + 自动同步飞书 ---
let currentAddress = null;

async function connectWallet() {
    if (!window.ethereum) return alert("请使用 Web3 浏览器或安装钱包插件");
    
    try {
        // 1. 强制检查并提示切换到 BSC 网络
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId !== BSC_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BSC_CHAIN_ID }],
                });
            } catch (switchError) {
                // 如果用户没配置过 BSC，自动帮他添加
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BSC_RPC_PARAMS],
                    });
                } else throw switchError;
            }
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        // 2. 签名确认 (确保飞书后端识别该用户)
        const message = `Welcome to Future Blockchain Space!\n\nTimestamp: ${Date.now()}\nWallet: ${address}`;
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, address],
        });

        if (signature) {
            currentAddress = address;
            updateWalletUI(address);
            // 3. 登录成功自动调用飞书后端
            await fetchUserData(address); 
        }
    } catch (error) {
        console.error("Connect Error:", error);
        alert("授权取消或失败");
    }
}

async function fetchUserData(address) {
    try {
        // 调用 Cloudflare Worker API
        const res = await fetch(`${API_BASE}/api/user?address=${address.toLowerCase()}`);
        if (!res.ok) throw new Error("Server Error 500");
        const data = await res.json();

        if (data.newUser) {
            showRegisterModal(address);
        } else {
            syncUIData(data); // 渲染飞书返回的资产和邀请数
        }
    } catch (err) {
        console.warn("飞书同步失败，请检查 API 状态:", err);
    }
}

function syncUIData(data) {
    if (data.balances) renderTokens(data.balances);
    const inviteEl = document.getElementById('inviteCount');
    if (inviteEl && data.inviteCount) inviteEl.innerText = data.inviteCount;
}

// --- 7. UI 与 注册逻辑 ---
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

function showRegisterModal(address) {
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    title.innerText = "新用户注册";
    content.innerHTML = `
        <div class="space-y-4">
            <p class="text-[11px] text-slate-500 font-bold uppercase text-center">绑定推荐人开启挖矿之旅</p>
            <input type="text" id="inviteCodeInput" placeholder="请输入邀请码" 
                   class="w-full p-4 bg-slate-50 rounded-2xl border-none font-black text-center focus:ring-2 focus:ring-blue-500">
            <button onclick="submitRegister('${address}')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200">
                立即绑定并开启
            </button>
        </div>`;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

async function submitRegister(address) {
    const code = document.getElementById('inviteCodeInput').value;
    if (!code) return alert("请输入邀请码");
    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: address.toLowerCase(), inviteCode: code })
        });
        const result = await res.json();
        if (result.success) {
            alert("绑定成功！");
            closeModal();
            fetchUserData(address); 
        } else alert("绑定失败: " + (result.error || "邀请码无效"));
    } catch (err) { alert("注册请求失败"); }
}

function disconnectWallet() {
    if (confirm("确定要退出连接吗？")) {
        currentAddress = null;
        updateWalletUI(null);
        renderTokens({}); // 清空资产显示
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
    renderTokens(); // 初始渲染空列表
});
