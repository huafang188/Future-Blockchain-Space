/**
 * Future Blockchain Space - 核心逻辑控制
 * 功能：代币渲染、地址缩略、弹窗交互、Web3 签名与转账
 */

const tokens = ['FBS', 'FBST', 'FBSP', 'PBSU', 'USDT', 'BNB', 'BTC', 'ETH'];
let userAddr = "";
let selectedBuyCount = 0;

// 1. 初始化代币列表 UI
function renderTokens() {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    container.innerHTML = tokens.map(t => `
        <div class="flex items-center justify-between p-4 hover:bg-slate-50 transition">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 logo-circle border border-slate-100 text-[10px] font-bold text-blue-600 bg-white">
                    ${t[0]}
                </div>
                <div>
                    <div class="font-bold text-sm text-slate-800">${t}</div>
                    <div class="text-[10px] text-slate-400">$0.00</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-bold text-sm text-slate-800">0.0000</div>
                <div class="text-[10px] text-slate-400">≈ $0.00</div>
            </div>
        </div>
    `).join('');
}

// 2. 地址显示处理 (前32后6)
function formatAddr(addr) {
    if (!addr) return "未连接钱包";
    return addr.substring(0, 32) + "..." + addr.substring(addr.length - 6);
}

// 3. 钱包连接与状态更新
async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddr = accounts[0];
            document.getElementById('walletAddr').innerText = formatAddr(userAddr);
            document.getElementById('connectBtn').innerText = "已连接";
            
            // 连上钱包后，显示用户数据板块（如果有隐藏逻辑）
            console.log("Connected:", userAddr);
            // 此处后续接入：fetchFeishuData(userAddr);
        } catch (err) {
            console.error("User denied account access");
        }
    } else {
        alert("请安装 Web3 钱包");
    }
}

// 4. 弹窗交互逻辑 (购买矿机 & 缴纳电费)
function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');
    overlay.classList.remove('hidden');

    if (type === 'buy') {
        title.innerText = "购买矿机 (Buy Miner)";
        content.innerHTML = `
            <div class="space-y-4">
                <p class="text-xs text-slate-500 text-center">每台矿机价格: 150 USDT</p>
                <div class="grid grid-cols-3 gap-2">
                    ${[1, 5, 10, 20, 50, 100].map(num => `
                        <button onclick="selectBuyAmount(${num}, this)" class="amount-btn border border-slate-200 py-2 rounded-lg text-xs hover:border-blue-500 transition">
                            ${num} 台
                        </button>
                    `).join('')}
                </div>
                <div class="pt-4 border-t border-slate-50">
                    <div class="flex justify-between text-sm font-bold text-slate-700">
                        <span>总金额:</span>
                        <span class="text-blue-600"><span id="payAmount">0</span> USDT</span>
                    </div>
                </div>
                <button onclick="executeAction('buy')" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-2 shadow-lg active:scale-95 transition">确认购买</button>
            </div>
        `;
    } else if (type === 'fee') {
        title.innerText = "缴纳电费 (Pay Fee)";
        content.innerHTML = `
            <div class="space-y-4">
                <p class="text-xs text-slate-500">费用: 60 USDT / 30天 (每台)</p>
                <select id="feeDays" class="w-full p-3 bg-slate-50 rounded-xl border-none text-sm outline-none">
                    <option value="30">30 天 (60 USDT)</option>
                    <option value="60">60 天 (120 USDT)</option>
                    <option value="90">90 天 (180 USDT)</option>
                    <option value="180">180 天 (360 USDT)</option>
                </select>
                <button onclick="executeAction('fee')" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold mt-2 active:scale-95 transition">立即支付</button>
            </div>
        `;
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

// 5. 购买数量选择逻辑
function selectBuyAmount(num, el) {
    selectedBuyCount = num;
    document.getElementById('payAmount').innerText = num * 150;
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('bg-blue-50', 'border-blue-500', 'text-blue-600'));
    el.classList.add('bg-blue-50', 'border-blue-500', 'text-blue-600');
}

// 6. 核心支付与签名流程
async function executeAction(actionType) {
    if (!userAddr) {
        alert("请先连接钱包");
        return;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // A. 安全签名：保障数据不被篡改
        const message = `Future Blockchain Space\n动作: ${actionType}\n钱包: ${userAddr}\n日期: ${new Date().toLocaleDateString()}`;
        const signature = await signer.signMessage(message);
        console.log("签名成功:", signature);

        // B. 唤起转账 (此处为逻辑占位，需填入你的合约调用或收款地址)
        // const tx = await signer.sendTransaction({ to: "你的收款地址", value: ethers.parseEther("0") });
        
        alert("请求已提交，请等待后台确认并更新飞书数据。");
        closeModal();
        
        // C. 后续：调用 Worker API 将 (actionType, userAddr, signature) 写入飞书
    } catch (err) {
        console.error("Action Failed:", err);
        alert("操作已取消");
    }
}

// 启动渲染
document.addEventListener('DOMContentLoaded', () => {
    renderTokens();
});
