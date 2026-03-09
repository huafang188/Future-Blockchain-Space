/**
 * Future Blockchain Space - 核心逻辑 (含新用户引导)
 */

const WORKER_URL = "https://futureblockchainspace.nicaihongaobama.workers.dev";
let userAddr = "";
let myInviteCode = "";

// 1. 钱包连接
async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddr = accounts[0];
            document.getElementById('walletAddr').innerText = userAddr.substring(0,2) + "..." + userAddr.substring(userAddr.length-6);
            document.getElementById('connectBtn').innerText = "已连接";
            
            // 核心：检查用户是否存在
            checkUserStatus(userAddr);
        } catch (err) {
            console.error("连接失败");
        }
    } else {
        alert("请安装钱包");
    }
}

// 2. 检查状态
async function checkUserStatus(address) {
    const res = await fetch(`${WORKER_URL}/api/user?address=${address}`);
    const data = await res.json();

    if (data.newUser) {
        showRegisterModal();
    } else {
        myInviteCode = data.info["推荐码"];
        // 渲染数据
        if(data.balance) updateUI(data.balance);
    }
}

// 3. 注册弹窗
function showRegisterModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');
    document.getElementById('modalTitle').innerText = "新用户注册 (Register)";
    
    // 自动从 URL 获取 ?ref=XXXX
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref') || "";

    document.getElementById('modalContent').innerHTML = `
        <div class="space-y-4">
            <p class="text-[10px] text-slate-400">检测到您是新用户，请绑定推荐人以激活账户</p>
            <input id="refInput" type="text" value="${refCode}" placeholder="输入推荐码" class="w-full p-3 bg-slate-50 rounded-xl border-none text-sm outline-none">
            <button onclick="submitRegister()" class="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">立即绑定并注册</button>
        </div>
    `;
}

// 4. 提交注册
async function submitRegister() {
    const code = document.getElementById('refInput').value;
    if(!code) return alert("请填写推荐码");

    const res = await fetch(`${WORKER_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: userAddr, inviteCode: code })
    });

    if (res.ok) {
        alert("注册成功，正在初始化您的资产...");
        location.reload();
    } else {
        alert("注册失败：请检查推荐码是否正确");
    }
}

// 5. 生成邀请链接并复制
function copyInviteLink() {
    if(!myInviteCode) return alert("请先连接钱包获取推荐码");
    const link = `${window.location.origin}${window.location.pathname}?ref=${myInviteCode}`;
    
    const tempInput = document.createElement("input");
    document.body.appendChild(tempInput);
    tempInput.value = link;
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    
    alert("邀请链接已复制: " + myInviteCode);
}

function updateUI(balance) {
    document.getElementById('totalBalance').innerText = balance["USDT"] || "0.00";
    // 其他字段更新...
}

document.addEventListener('DOMContentLoaded', () => {
    // 初始渲染逻辑...
});
