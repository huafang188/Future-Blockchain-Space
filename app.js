/**
 * Future Blockchain Space - 逻辑控制中心 (正式终极版)
 */

// 1. 核心地址与 API 配置
const API_BASE = "https://api.fbsfbs.fit"; // 统一使用自定义域名

const RECEIVE_ADDRESSES = {
    MINER: "0x8922A66C6898d9e26D9747206466795880482937",    // 矿机收款地址
    ELECTRIC: "0x8922A66C6898d9e26D9747206466795880482937", // 电费收款地址
    DEPOSIT: "0x8922A66C6898d9e26D9747206466795880482937"    // 账户充值地址
};

const USDT_ADDR = "0x55d398326f99059fF775485246999027B3197955"; // BSC-USDT 合约地址

const tokenData = {
    'FBS': { price: 0.1, logo: 'assets/fbs_logo.png' },
    'FBST': { price: 0.05, logo: 'assets/fbst_logo.png' },
    'FBSP': { price: 1.2, logo: 'assets/fbsp_logo.png' },
    'PBSU': { price: 1.0, logo: 'assets/fbsu_logo.png' }, // 对应你截图中的 fbsu_logo.png
    'USDT': { price: 1.0, logo: 'assets/USDT.png' },    // 注意这里是大写
    'BNB': { price: 600, logo: 'assets/BNB.png' },      // 对应 BNB.png
    'BTC': { price: 65000, logo: 'assets/BTC.png' },    // 对应 BTC.png
    'ETH': { price: 3500, logo: 'assets/ETH.png' }      // 对应 ETH.png
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

// --- 3. 矿机与电费弹窗逻辑 ---
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

// --- 4. 财务操作弹窗 ---
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
        content.innerHTML = `<div class="p-6 text-center"><div class="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🚧</div><p class="text-sm font-bold text-slate-700">Withdrawal System Update</p><button onclick="closeModal()" class="mt-6 w-full bg-slate-100 py-3 rounded-xl font-bold text-slate-600 text-sm">Close</button></div>`;
    } 
    else if (type === 'exchange') {
        title.innerText = getT('exchange');
        content.innerHTML = `<div class="p-6 text-center"><p class="text-sm font-bold text-slate-700">Exchange Coming Soon</p><button onclick="closeModal()" class="mt-4 w-full bg-slate-100 py-2 rounded-xl font-bold">Close</button></div>`;
    }

    if (overlay) overlay.classList.remove('hidden');
}

// --- 5. Web3 转账执行 ---
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
        const usdtContract = new ethers.Contract(USDT_ADDR, usdtAbi, signer);
        const amount = ethers.parseUnits(amountStr, 18);
        const tx = await usdtContract.transfer(to, amount);
        alert("Success! Tx Hash: " + tx.hash);
        closeModal();
    } catch (e) {
        alert("Transaction Error: " + e.message);
    }
}

// --- 6. 核心连接逻辑：钱包 + 飞书后端 ---
let currentAddress = null;

async function connectWallet() {
    if (!window.ethereum) return alert("请使用 Web3 浏览器或安装钱包插件");
    try {
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
        alert("授权失败或用户取消");
    }
}

// 检索飞书数据 (修正路径)
async function fetchUserData(address) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${address.toLowerCase()}`);
        const data = await res.json();

        if (data.newUser) {
            showRegisterModal(address);
        } else {
            syncUIData(data); // 补全：同步老用户数据
        }
    } catch (err) {
        console.error("API Error:", err);
        alert("系统数据检索失败，请检查网络");
    }
}

// 同步数据到 UI (修正：补全缺失函数)
function syncUIData(data) {
    if (data.balances) {
        renderTokens(data.balances);
    }
    // 更新邀请人数或其他信息
    const inviteEl = document.getElementById('inviteCount');
    if (inviteEl && data.inviteCount) inviteEl.innerText = data.inviteCount;
}

// 注册弹窗
function showRegisterModal(address) {
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    title.innerText = "新用户注册";
    content.innerHTML = `
        <div class="space-y-4">
            <p class="text-[11px] text-slate-500 font-bold uppercase">检测到新地址，请输入邀请码绑定关系</p>
            <input type="text" id="inviteCodeInput" placeholder="请输入推荐人邀请码" 
                   class="w-full p-4 bg-slate-50 rounded-2xl border-none font-black text-center focus:ring-2 focus:ring-blue-500">
            <button onclick="submitRegister('${address}')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200">
                立即绑定并开启
            </button>
        </div>`;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

// 提交注册 (修正：添加 Headers 和 JSON 格式)
async function submitRegister(address) {
    const code = document.getElementById('inviteCodeInput').value;
    if (!code) return alert("请输入邀请码");

    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                address: address.toLowerCase(), 
                inviteCode: code 
            })
        });

        const result = await res.json();
        if (result.success) {
            alert("绑定成功！");
            closeModal();
            fetchUserData(address); 
        } else {
            alert("绑定失败: " + (result.error || "邀请码无效"));
        }
    } catch (err) {
        alert("注册请求失败，请检查网络");
    }
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

function switchLang(lang) {
    localStorage.setItem('fbs_lang', lang);
    location.reload(); // 语言切换通常建议刷新以确保所有占位符更新
}

document.addEventListener('DOMContentLoaded', () => {
    renderTokens();
    const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
    if (document.getElementById('langSelect')) document.getElementById('langSelect').value = savedLang;
});
