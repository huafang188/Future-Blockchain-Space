const tokens = ['FBS', 'FBST', 'FBSP', 'PBSU', 'USDT', 'BNB', 'BTC', 'ETH'];
let userAddr = "";

// 1. 初始化代币列表 UI
function renderTokens() {
    const container = document.getElementById('tokenRows');
    container.innerHTML = tokens.map(t => `
        <div class="flex items-center justify-between p-4 hover:bg-slate-50 transition">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 logo-circle border border-slate-100 text-[10px] font-bold text-blue-600 bg-white">
                    ${t[0]}
                </div>
                <div class="font-bold text-sm text-slate-800">${t}</div>
            </div>
            <div class="text-right">
                <div class="font-bold text-sm text-slate-800">0.0000</div>
                <div class="text-[10px] text-slate-400">≈ $0.00</div>
            </div>
        </div>
    `).join('');
}

// 2. 地址缩略逻辑 (前32后6)
function formatAddr(addr) {
    if(!addr) return "未连接";
    return addr.substring(0, 32) + "..." + addr.substring(addr.length - 6);
}

// 3. 钱包连接
async function connectWallet() {
    if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddr = accounts[0];
        document.getElementById('walletAddr').innerText = formatAddr(userAddr);
        document.getElementById('connectBtn').innerText = "已连接";
        // 这里后续可以触发飞书 API 数据抓取
    }
}

// 初始化执行
renderTokens();
