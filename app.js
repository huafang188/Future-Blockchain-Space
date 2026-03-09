/**
 * Future Blockchain Space - 核心逻辑控制 (完整对接版)
 * 功能：代币渲染、数据同步(飞书)、弹窗交互、Web3 签名与转账上报
 */

// 配置信息
const WORKER_URL = "https://futureblockchainspace.nicaihongaobama.workers.dev";
const tokens = ['FBS', 'FBST', 'FBSP', 'PBSU', 'USDT', 'BNB', 'BTC', 'ETH'];
let userAddr = "";
let selectedBuyCount = 0;

// 1. 初始化代币列表 UI
function renderTokens(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    
    container.innerHTML = tokens.map(t => {
        // 从飞书返回的 balance 对象中匹配对应代币余额
        const val = balances[t] || "0.0000";
        return `
            <div class="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 logo-circle border border-slate-100 text-[10px] font-bold text-blue-600 bg-white">
                        ${t[0]}
                    </div>
                    <div>
                        <div class="font-bold text-sm text-slate-800">${t}</div>
                        <div class="text-[10px] text-slate-400">$${t === 'USDT' ? '1.00' : '0.00'}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-sm text-slate-800">${val}</div>
                    <div class="text-[10px] text-slate-400">≈ $${t === 'USDT' ? val : '0.00'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// 2. 地址显示处理 (前2后6)
function formatAddr(addr) {
    if (!addr) return "未连接钱包";
    return addr.substring(0, 2) + "..." + addr.substring(addr.length - 6);
}

// 3. 核心功能：同步飞书数据
async function fetchFeishuData(address) {
    if (!address) return;
    console.log("正在同步飞书数据...");
    
    try {
        const response = await fetch(`${WORKER_URL}/api/user?address=${address}`);
        if (!response.ok) throw new Error('网络请求失败');
        const data = await response.json();

        // A. 更新资产余额板块
        if (data.balance) {
            // 更新总价值 (假设以 USDT 余额作为展示)
            const usdtVal = data.balance["USDT"] || "0.00";
            document.getElementById('totalBalance').innerText = usdtVal;
            
            // 更新矿机信息
            document.getElementById('mCount').innerText = data.balance["矿机数量"] || "0";
            document.getElementById('mYield').innerText = data.balance["日产量"] || "0.00";
            document.getElementById('mTerm').innerText = data.balance["到期时间"] || "--";
            document.getElementById('mLocked').innerText = data.balance["锁仓资产"] || "0.00";
            
            // 重新渲染代币列表以显示真实余额
            renderTokens(data.balance);
        }

        // B. 更新团队信息 (如果 HTML 中有对应 ID)
        if (data.team) {
            console.log("团队数据已加载:", data.team);
            // 示例：document.getElementById('teamSize').innerText = data.team["团队人数"];
        }
    } catch (err) {
        console.error("同步数据异常:", err);
    }
}

// 4. 核心功能：上报记录到飞书
async function postToFeishu(type, amount, signature) {
    try {
        const response = await fetch(`${WORKER_URL}/api/record`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                address: userAddr,
                type: type === 'buy' ? '购买矿机' : '缴纳电费',
                amount: amount,
                signature: signature,
                note: `WEB端发起 - 数量: ${amount}`
            })
        });
        const result = await response.json();
        console.log("飞书上报结果:", result);
    } catch (err) {
        console.error("上报记录失败:", err);
    }
}

// 5. 钱包连接与状态更新
async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddr = accounts[0];
            document.getElementById('walletAddr').innerText = formatAddr(userAddr);
            document.getElementById('connectBtn').innerText = "已连接";
            
            // 连接成功后立即拉取飞书数据
            fetchFeishuData(userAddr);
        } catch (err) {
            console.error("User denied account access");
        }
    } else {
        alert("请安装 Web3 钱包");
    }
}

// 6. 弹窗控制
function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');
    overlay.classList.remove('hidden');

    if (type === 'buy') {
        title.innerText = "购买矿机 (Buy Miner)";
        content.innerHTML = `
            <div class="space-y-4">
                <p class="text-xs text-slate-500 text-center">价格: 150 USDT / 台</p>
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
                <p class="text-xs text-slate-500">单价: 60 USDT / 30天 (每台)</p>
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

function selectBuyAmount(num, el) {
    selectedBuyCount = num;
    document.getElementById('payAmount').innerText = num * 150;
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('bg-blue-50', 'border-blue-500', 'text-blue-600'));
    el.classList.add('bg-blue-50', 'border-blue-500', 'text-blue-600');
}

// 7. 核心执行流程：签名并上报
async function executeAction(actionType) {
    if (!userAddr) return alert("请先连接钱包");

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // A. 准备签名
        const amount = actionType === 'buy' ? selectedBuyCount * 150 : document.getElementById('feeDays').value * 2; // 简易计算
        const message = `Future Blockchain Space\n动作: ${actionType}\n钱包: ${userAddr}\n日期: ${new Date().toLocaleString()}`;
        
        const signature = await signer.signMessage(message);
        console.log("签名成功:", signature);

        // B. 上报至飞书记录表
        await postToFeishu(actionType, amount, signature);
        
        alert("操作已上报，请等待后台确认。");
        closeModal();
    } catch (err) {
        console.error("Action Failed:", err);
        alert("操作已取消或失败");
    }
}

// 启动渲染
document.addEventListener('DOMContentLoaded', () => {
    renderTokens();
});
