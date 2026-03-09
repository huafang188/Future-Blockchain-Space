/**
 * Future Blockchain Space - 核心逻辑 (V3 完整同步版)
 */

const WORKER_URL = "https://futureblockchainspace.nicaihongaobama.workers.dev";
const tokens = ['FBS', 'FBST', 'FBSP', 'PBSU', 'USDT', 'BNB', 'BTC', 'ETH'];
let userAddr = "";
let myInviteCode = "";
let currentHistoryTab = 'tx'; // 默认为交易记录

// 1. 钱包连接
async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddr = accounts[0];
            document.getElementById('walletAddr').innerText = userAddr.substring(0,2) + "..." + userAddr.substring(userAddr.length-6);
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
            // 保存推荐码
            myInviteCode = data.info["推荐码"] || "";
            document.getElementById('myInviteCodeDisplay').innerText = myInviteCode || "----";

            // 1. 更新资产和矿机 UI
            if(data.balance) updateUI(data.balance);
            
            // 2. 更新团队 UI
            if(data.team) {
                document.getElementById('directNum').innerText = data.team["直推人数"] || "0";
            }

            // 3. 加载默认历史记录 (交易记录)
            fetchHistory('tx');
        }
    } catch (err) {
        console.error("数据抓取异常", err);
    }
}

// 3. 历史记录 Tab 切换逻辑
async function switchHistory(type) {
    if (currentHistoryTab === type) return;
    currentHistoryTab = type;

    // 切换 UI 样式
    const txBtn = document.getElementById('tab-tx');
    const tfBtn = document.getElementById('tab-transfer');
    
    if (type === 'tx') {
        txBtn.classList.add('tab-active');
        tfBtn.classList.remove('tab-active');
        tfBtn.classList.add('text-slate-400');
    } else {
        tfBtn.classList.add('tab-active');
        txBtn.classList.remove('tab-active');
        txBtn.classList.add('text-slate-400');
    }

    fetchHistory(type);
}

// 4. 从后端获取历史记录
async function fetchHistory(type) {
    const listContainer = document.getElementById('historyList');
    listContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-slate-400">
            <div class="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
            <p class="text-[9px] uppercase tracking-widest">Loading Records...</p>
        </div>
    `;

    try {
        // 请求对应的 API 路由 (后端需支持此路径)
        const res = await fetch(`${WORKER_URL}/api/history?address=${userAddr}&type=${type}`);
        const records = await res.json();

        if (!records || records.length === 0) {
            listContainer.innerHTML = `<div class="py-10 text-center text-slate-400 text-xs">暂无相关记录</div>`;
            return;
        }

        listContainer.innerHTML = records.map(item => `
            <div class="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                <div>
                    <div class="font-bold text-xs text-slate-800">${item.type || item.action}</div>
                    <div class="text-[10px] text-slate-400">${item.time || ''}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-xs ${item.amount.toString().includes('-') ? 'text-red-500' : 'text-green-500'}">
                        ${item.amount} ${item.asset || 'USDT'}
                    </div>
                    <div class="text-[10px] text-slate-400 italic">${item.status || '已完成'}</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listContainer.innerHTML = `<div class="py-10 text-center text-red-400 text-xs">记录加载失败</div>`;
    }
}

// 5. 资产列表与矿机 UI 更新
function updateUI(balance) {
    // 总余额
    document.getElementById('totalBalance').innerText = balance["USDT"] || "0.00";
    
    // 矿机信息
    document.getElementById('mCount').innerText = balance["矿机数量"] || "0";
    document.getElementById('mYield').innerText = balance["日产量"] || "0.00";
    document.getElementById('mTerm').innerText = balance["到期时间"] || "--";
    document.getElementById('mLocked').innerText = balance["锁仓资产"] || "0.00";

    // 代币列表渲染
    const container = document.getElementById('tokenRows');
    container.innerHTML = tokens.map(t => {
        const val = balance[t] || "0.0000";
        return `
            <div class="flex items-center justify-between p-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 logo-circle border border-slate-100 text-[10px] font-bold text-blue-600 bg-white">
                        ${t[0]}
                    </div>
                    <div class="font-bold text-xs text-slate-800">${t}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-xs text-slate-800">${val}</div>
                </div>
            </div>
        `;
    }).join('');
}

// 6. 注册弹窗与提交 (保持不变)
function showRegisterModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');
    document.getElementById('modalTitle').innerText = "新用户注册 (Register)";
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref') || "";

    document.getElementById('modalContent').innerHTML = `
        <div class="space-y-4">
            <p class="text-[10px] text-slate-400 text-center">绑定推荐码激活 Future Blockchain Space 账户</p>
            <input id="refInput" type="text" value="${refCode}" placeholder="请输入推荐码" class="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm outline-none focus:border-blue-500">
            <button onclick="submitRegister()" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition">立即绑定并注册</button>
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

// 7. 邀请链接生成
function copyInviteLink() {
    if(!myInviteCode) return alert("请先连接钱包获取推荐码");
    const link = `${window.location.origin}${window.location.pathname}?ref=${myInviteCode}`;
    
    navigator.clipboard.writeText(link).then(() => {
        alert("邀请链接已复制！\n推荐码: " + myInviteCode);
    });
}

// 启动渲染
document.addEventListener('DOMContentLoaded', () => {
    // 默认可以先渲染一个 0 数据列表
    updateUI({});
});
