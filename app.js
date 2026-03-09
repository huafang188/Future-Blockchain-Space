/**
 * Future Blockchain Space - 核心逻辑 (V3.1 交互修复版)
 */

const WORKER_URL = "https://futureblockchainspace.nicaihongaobama.workers.dev";
const tokens = ['FBS', 'FBST', 'FBSP', 'PBSU', 'USDT', 'BNB', 'BTC', 'ETH'];
let userAddr = "";
let myInviteCode = "";
let currentHistoryTab = 'tx'; 

// 1. 钱包连接
async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddr = accounts[0];
            document.getElementById('walletAddr').innerText = userAddr.substring(0,6) + "..." + userAddr.substring(userAddr.length-4);
            document.getElementById('connectBtn').innerText = "已连接";
            
            // 核心：检查状态并获取数据
            checkUserStatus(userAddr);
        } catch (err) {
            console.error("连接失败", err);
        }
    } else {
        alert("请安装钱包");
    }
}

// 2. 检查用户状态并拉取所有数据
async function checkUserStatus(address) {
    try {
        const res = await fetch(`${WORKER_URL}/api/user?address=${address}`);
        const data = await res.json();

        if (data.newUser) {
            showRegisterModal();
        } else {
            // 保存推荐码并显示
            myInviteCode = data.info["推荐码"] || "";
            document.getElementById('myInviteCodeDisplay').innerText = myInviteCode || "----";

            // 更新资产、矿机、团队 UI
            updateUI(data.balance, data.miner, data.team);
            
            // 加载初始历史记录 (交易记录)
            fetchHistory('tx');
        }
    } catch (err) {
        console.error("数据抓取异常", err);
    }
}

// 3. 统一 UI 渲染函数 (确保所有板块显示完整)
function updateUI(balance = {}, miner = {}, team = {}) {
    // A. 总资产
    document.getElementById('totalBalance').innerText = balance["USDT"] || "0.00";
    
    // B. 矿机信息
    document.getElementById('mCount').innerText = miner["矿机数量"] || "0";
    document.getElementById('mYield').innerText = miner["日产量"] || "0.00";
    document.getElementById('mTerm').innerText = miner["挖矿期限"] || "--";
    document.getElementById('mLocked').innerText = miner["锁仓数量"] || "0.00";

    // C. 团队信息
    document.getElementById('directNum').innerText = team["直推人数"] || "0";

    // D. 代币列表渲染
    const container = document.getElementById('tokenRows');
    container.innerHTML = tokens.map(t => {
        const val = balance[t] || "0.0000";
        return `
            <div class="flex items-center justify-between p-4 border-b border-slate-50">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 flex items-center justify-center rounded-full border border-slate-100 text-[10px] font-bold text-blue-600 bg-white">${t[0]}</div>
                    <div class="font-bold text-xs text-slate-800">${t}</div>
                </div>
                <div class="font-bold text-xs text-slate-800">${val}</div>
            </div>
        `;
    }).join('');
}

// 4. 历史记录 Tab 切换 (修复按钮点击)
async function switchHistory(type) {
    currentHistoryTab = type;

    const txBtn = document.getElementById('tab-tx');
    const tfBtn = document.getElementById('tab-transfer');
    
    if (type === 'tx') {
        txBtn.className = "flex-1 py-4 text-xs font-bold tab-active";
        tfBtn.className = "flex-1 py-4 text-xs font-bold text-slate-400";
    } else {
        tfBtn.className = "flex-1 py-4 text-xs font-bold tab-active";
        txBtn.className = "flex-1 py-4 text-xs font-bold text-slate-400";
    }

    fetchHistory(type);
}

// 5. 获取历史记录数据
async function fetchHistory(type) {
    const listContainer = document.getElementById('historyList');
    listContainer.innerHTML = `<div class="py-10 text-center text-slate-400 text-xs animate-pulse">数据加载中...</div>`;

    try {
        const res = await fetch(`${WORKER_URL}/api/history?address=${userAddr}&type=${type}`);
        const records = await res.json();

        if (!records || records.length === 0) {
            listContainer.innerHTML = `<div class="py-10 text-center text-slate-400 text-xs">暂无记录</div>`;
            return;
        }

        listContainer.innerHTML = records.map(item => `
            <div class="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                <div>
                    <div class="font-bold text-xs text-slate-800">${item.type}</div>
                    <div class="text-[9px] text-slate-400">${item.time}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-xs text-blue-600">${item.amount} ${item.asset}</div>
                    <div class="text-[9px] text-slate-400">${item.status}</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listContainer.innerHTML = `<div class="py-10 text-center text-red-400 text-xs">记录同步失败</div>`;
    }
}

// 6. 弹窗控制逻辑
function openModal(action) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');
    
    overlay.classList.remove('hidden');
    
    if (action === 'buy') {
        title.innerText = "购买矿机 (Buy Miner)";
        content.innerHTML = `<div class="space-y-4">
            <p class="text-xs text-slate-500">确认购买新一代智能矿机？</p>
            <button class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">立即支付 100 USDT</button>
        </div>`;
    } else if (action === 'fee') {
        title.innerText = "缴纳电费 (Pay Fee)";
        content.innerHTML = `<p class="text-xs text-slate-500">当前矿机运行良好，无需缴费。</p>`;
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

// 7. 注册逻辑
function showRegisterModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');
    document.getElementById('modalTitle').innerText = "新用户注册";
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref') || "";

    document.getElementById('modalContent').innerHTML = `
        <div class="space-y-4">
            <input id="refInput" type="text" value="${refCode}" placeholder="请输入推荐码" class="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm outline-none">
            <button onclick="submitRegister()" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-95 transition">激活账户</button>
        </div>
    `;
}

async function submitRegister() {
    const code = document.getElementById('refInput').value;
    if(!code) return alert("请填写推荐码");

    const res = await fetch(`${WORKER_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: userAddr, inviteCode: code })
    });

    if (res.ok) {
        alert("注册成功！");
        location.reload();
    } else {
        alert("注册失败：无效的推荐码");
    }
}

// 8. 复制邀请链接
function copyInviteLink() {
    if(!myInviteCode) return alert("请先连接钱包获取推荐码");
    const link = `${window.location.origin}${window.location.pathname}?ref=${myInviteCode}`;
    navigator.clipboard.writeText(link).then(() => alert("邀请链接已复制！"));
}
