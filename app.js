/**
 * Future Blockchain Space - 核心业务逻辑 (强制唤起收银台版)
 */

const API_BASE = "https://api.fbsfbs.fit/api/user";
const BSC_CHAIN_ID = '0x38';

// --- 1. 配置信息 ---
const RECEIVE_ADDRS = {
    RECHARGE: "0xCfd8e926623e46fB8F54baaB9c7609808daFf9B4",
    ELECTRIC: "0xFf27899526FDA4A30411A8e2778d7F7BCb837568",
    MINER: "0xBdfFB96E30d2d5858c46374a213ee819A005256c"
};

const CONTRACT_ADDRS = {
    'USDT': "0x55d398326f99059ff775485246999027b3197955",
    'ETH': "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    'BTC': "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    'BNB': "NATIVE"
};

const tokenInfo = {
    'FBS': { price: 0.1, logo: 'assets/fbs_logo.png' },
    'FBST': { price: 0.05, logo: 'assets/fbst_logo.png' },
    'FBSP': { price: 1.2, logo: 'assets/fbsp_logo.png' },
    'PBSU': { price: 1.0, logo: 'assets/fbsu_logo.png' },
    'USDT': { price: 1.0, logo: 'assets/USDT.png' },
    'BNB': { price: 600, logo: 'assets/BNB.png' },
    'BTC': { price: 65000, logo: 'assets/BTC.png' },
    'ETH': { price: 3500, logo: 'assets/ETH.png' }
};

let currentAddress = localStorage.getItem('fbs_address'); 
let userBalances = {};

// --- 2. 初始化与列表渲染 ---
window.onload = () => {
    // 💡 新增：如果本地有地址，直接更新 UI 并拉取数据
    if (currentAddress) {
        const el = document.getElementById('walletAddr');
        if (el) el.innerText = currentAddress.slice(0, 6) + '...' + currentAddress.slice(-4);
                el.removeAttribute('data-i18n'); 
        fetchUserData(currentAddress);
    }
    renderTokenList({}); 
};

function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let totalVal = 0;
    const html = Object.keys(tokenInfo).map(symbol => {
        const bal = parseFloat(balances[symbol] || 0);
        const price = tokenInfo[symbol].price;
        const val = bal * price;
        totalVal += val;
        return `
            <div class="flex items-center justify-between p-4 border-b border-slate-50">
                <div class="flex items-center gap-3">
                    <img src="${tokenInfo[symbol].logo}" class="w-8 h-8 rounded-full" onerror="this.src='https://ui-avatars.com/api/?name=${symbol}'">
                    <div>
                        <div class="font-bold text-slate-800 text-sm">${symbol}</div>
                        <div class="text-[10px] text-slate-400 font-bold">$ ${price.toLocaleString()}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black text-slate-800 text-sm">${bal.toFixed(4)}</div>
                    <div class="text-[10px] text-blue-600 font-bold italic">$ ${val.toFixed(2)}</div>
                </div>
            </div>`;
    }).join('');
    container.innerHTML = html;
    if (document.getElementById('totalValue')) document.getElementById('totalValue').innerText = totalVal.toFixed(2);
}

// --- 3. 钱包操作 ---
async function connectWallet() {
    if (!window.ethereum) return alert("请在钱包内打开");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];

        // 💡 检查本地是否已经有这个地址的缓存，如果有，直接登录，不再签名
        const savedAddr = localStorage.getItem('fbs_address');
        if (savedAddr && savedAddr.toLowerCase() === address.toLowerCase()) {
            currentAddress = address;
            finishLogin(); // 执行登录后的 UI 更新
            return;
        }

        // 只有新用户或更换账号才强制签名
        const msg = `FBS Login\nAddress: ${address}\nTime: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, address] });
        
        if (sig) {
            currentAddress = address;
            localStorage.setItem('fbs_address', address);
            finishLogin();
        }
    } catch (e) { console.error("Login Cancelled"); }
}

// 提取一个通用的登录成功 UI 更新函数
function finishLogin() {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = currentAddress.slice(0, 6) + '...' + currentAddress.slice(-4);
        el.removeAttribute('data-i18n'); // 防止多语言包把地址翻译回去
    }
    fetchUserData(currentAddress);
    closeModal();
}
// 插入到 connectWallet 函数附近
function handleWalletClick() {
    if (currentAddress) {
        // 如果已经登录，弹出确认框
        showModal("账号管理", `
            <div class="space-y-4 text-center">
                <p class="text-sm text-slate-500">当前地址: ${currentAddress}</p>
                <button onclick="logout()" class="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-black">退出登录 (Logout)</button>
                <button onclick="closeModal()" class="w-full bg-slate-100 py-4 rounded-2xl font-bold">取消</button>
            </div>
        `);
        
        // 记得触发你的多语言渲染
        if (typeof i18nRender === 'function') i18nRender();
    } else {
        // 如果没登录，去执行链接逻辑
        connectWallet();
    }
}

// 退出登录逻辑
function logout() {
    localStorage.removeItem('fbs_address'); // 清除本地缓存
    currentAddress = null; // 重置变量
    location.reload(); // 刷新页面清空所有状态
}

async function fetchUserData(address) {
    try {
        const res = await fetch(`${API_BASE}/api/user?address=${address.toLowerCase()}`);
        const data = await res.json();

        if (data.newUser) {
            showRegisterModal(address);
            return;
        }

        // --- 1. 映射【推荐关系】数据 ---
        if (data.info) {
            updateText('info_inviteCode', data.info["推荐码"]);
            updateText('info_inviter', data.info["推荐人"]);
            updateText('info_regTime', data.info["注册时间"]);
        }

        // --- 2. 映射【用户团队】数据 ---
        if (data.team) {
            updateText('team_directCount', data.team["直推人数"]);
            updateText('team_directSales', data.team["直推业绩"]);
            updateText('team_totalCount', data.team["团队人数"]);
            updateText('team_totalSales', data.team["团队业绩"]);
            updateText('team_totalReward', data.team["累计奖励"]);
        }

        // --- 3. 映射【用户矿机】数据 ---
        if (data.miner) {
            updateText('miner_count', data.miner["矿机数量"]);
            updateText('miner_deadline', data.miner["挖矿期限"]);
            updateText('miner_daily', data.miner["日产量"]);
            updateText('miner_locked', data.miner["锁仓数量"]);
        }

        // --- 4. 映射【用户余额】数据 ---
        if (data.balances) {
            userBalances = data.balances;
            renderTokenList(data.balances); // 渲染列表
            // 同时更新页面上可能存在的固定余额标签
            Object.keys(data.balances).forEach(token => {
                updateText(`bal_${token}`, data.balances[token]);
            });
        }

    } catch (e) {
        console.error("数据精准加载失败:", e);
    }
}

// 通用更新函数：确保数据不存在时显示 0
function updateText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        // 如果是数字则格式化，如果是 null 则显示 0
        el.innerText = (value !== undefined && value !== null) ? value : "0";
    }
}

// --- 4. 路由逻辑 (匹配 UI 按钮) ---
function openMinerModal(type) {
    const nums = [1, 5, 10, 15, 20, 25, 50, 100];
    if (type === 'buy') {
        showModal("购买矿机", `
            <div class="space-y-4">
                <div class="grid grid-cols-4 gap-2">${nums.map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border p-2 rounded-xl text-[10px] font-bold">${n}台</button>`).join('')}</div>
                <div class="p-4 bg-blue-50 rounded-2xl flex justify-between"><span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span></div>
                <button onclick="doChainPay('MINER')" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">确认支付</button>
            </div>`);
    } else {
        const days = [30, 60, 90, 180, 360];
        showModal("缴纳电费", `
            <div class="space-y-4 text-left">
                <select id="elecNum" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none">${nums.map(n => `<option value="${n}">${n} 台</option>`).join('')}</select>
                <select id="elecDays" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none">${days.map(d => `<option value="${d}">${d} 天</option>`).join('')}</select>
                <div class="p-4 bg-slate-900 rounded-2xl flex justify-between items-center"><span id="elecCost" class="text-xl font-black text-yellow-500">30.00 USDT</span></div>
                <button onclick="doChainPay('ELECTRIC')" class="w-full bg-slate-800 text-white py-4 rounded-2xl font-black shadow-lg">确认支付</button>
            </div>`);
    }
}

function openFinanceModal(type) {
    const options = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
    if (type === 'recharge') {
        showModal("充值资产", `
            <div class="space-y-4 text-left">
                <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none">${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t}">${t}</option>`).join('')}</select>
                <input type="number" id="recAmount" placeholder="输入充值数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none">
                <button onclick="doRecharge()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">确认</button>
            </div>`);
    } else if (type === 'withdraw') {
        showModal("提币申请", `
            <div class="space-y-4 text-left">
                <select id="witToken" onchange="updateMax()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none">${options}</select>
                <div class="text-[10px] font-bold text-blue-500">可用: <span id="maxWit">0.00</span></div>
                <input type="number" id="witAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none">
                <button onclick="handleSignAction('WITHDRAW')" class="w-full bg-red-500 text-white py-4 rounded-2xl font-black">签名提交</button>
            </div>`);
        updateMax();
    } else if (type === 'exchange') {
        showModal("资产兑换", `
            <div class="space-y-3">
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                    <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>支付</span><span id="maxSwap">余额: 0</span></div>
                    <div class="flex items-center gap-2">
                        <input type="number" id="sFromAmt" oninput="calcSwap()" placeholder="0.0" class="w-full bg-transparent border-none font-black text-xl">
                        <select id="sFromToken" onchange="calcSwap()" class="font-bold border-none">${options}</select>
                    </div>
                </div>
                <div class="text-center">⇅</div>
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                    <div class="flex justify-between text-[10px] font-bold text-slate-400"><span>预估收到</span></div>
                    <div class="flex items-center gap-2"><input type="number" id="sToAmt" readonly class="w-full bg-transparent border-none font-black text-xl text-indigo-600">
                    <select id="sToToken" onchange="calcSwap()" class="font-bold border-none">${options}</select></div>
                </div>
                <button onclick="handleSignAction('SWAP')" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">签名兑换</button>
            </div>`);
        calcSwap();
    }
}

// --- 5. 核心：真正执行转账并等待确认 ---
async function executeTokenTransfer(contractAddr, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        console.log("正在唤起收银台...");
        
        // 1. 发起请求并手动指定 Gas 限制 (强制唤起)
        const tx = await contract.transfer(to, ethers.parseUnits(amountStr, 18), {
            gasLimit: 100000 
        });
        
        // 💡 关键修改：显示等待状态
        document.getElementById('modalContent').innerHTML = `
            <div class="text-center py-10">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="font-bold text-slate-800">交易已广播，等待链上确认...</p>
                <p class="text-[10px] text-slate-400 mt-2">Hash: ${tx.hash.slice(0,10)}...</p>
            </div>`;

        // 2. 💡 真正等待区块链打包确认 (通常 BSC 需要 3-6 秒)
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            alert("✅ 支付成功！交易已记录在案。");
            closeModal();
            fetchUserData(currentAddress); // 支付成功后刷新一下余额
        } else {
            alert("❌ 链上执行失败（可能是余额不足或合约限制）");
        }

    } catch (e) {
        console.error("交易详情:", e);
        if (e.code === 'ACTION_REJECTED' || e.message.includes("user rejected")) {
            alert("🚫 您已取消支付");
        } else {
            alert("⚠️ 交易异常: " + (e.reason || "请检查余额是否充足"));
        }
        // 如果失败了，关闭加载动画回到初始状态
        closeModal();
    }
}

// --- 原生 BNB 转账同步修改 ---
async function executeNativeTransfer(to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const tx = await signer.sendTransaction({
            to: to,
            value: ethers.parseEther(amountStr),
            gasLimit: 21000
        });

        // 等待打包
        const receipt = await tx.wait();
        if (receipt.status === 1) {
            alert("✅ 充值成功！");
            closeModal();
            fetchUserData(currentAddress);
        }
    } catch (e) {
        alert("充值未完成或被拒绝");
        closeModal();
    }
}

// --- 后续业务逻辑 ---
async function doRecharge() {
    const symbol = document.getElementById('recToken').value;
    const amount = document.getElementById('recAmount').value;
    if (symbol === 'BNB') await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
    else await executeTokenTransfer(CONTRACT_ADDRS[symbol], RECEIVE_ADDRS.RECHARGE, amount);
}

async function doChainPay(bizType) {
    let rawAmt = (bizType === 'MINER') 
        ? document.getElementById('buyTotal').innerText.replace('$ ', '') 
        : document.getElementById('elecCost').innerText.replace(' USDT', '');
    
    // 确保是干净的数字字符串，且最多保留 18 位小数
    let safeAmt = parseFloat(rawAmt).toFixed(18).replace(/\.?0+$/, ""); 
    await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], safeAmt);
}

async function handleSignAction(type) {
    try {
        const msg = `${type} Request\nTime: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        if (sig) { alert("申请已签名提交"); closeModal(); }
    } catch (e) { alert("已取消签名"); }
}

// --- 辅助 UI ---
function showModal(title, html) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.remove('hidden');

    // 💡 新增：调用你外部的多语言重新渲染函数（假设函数名为 i18nRender）
    // 这样弹窗里新生成的 HTML 才能被翻译成当前语言
    if (typeof i18nRender === 'function') {
        i18nRender(); 
    }
}
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }
function setBuyNum(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.add('bg-blue-600', 'text-white');
    document.getElementById('buyTotal').innerText = `$ ${(n * 150).toFixed(2)}`;
}
function calcElec() {
    const n = document.getElementById('elecNum').value;
    const d = document.getElementById('elecDays').value;
    document.getElementById('elecCost').innerText = (n * (d / 30) * 30).toFixed(2) + " USDT";
}
function calcSwap() {
    const fT = document.getElementById('sFromToken').value, tT = document.getElementById('sToToken').value;
    const amt = document.getElementById('sFromAmt').value || 0;
    document.getElementById('sToAmt').value = (amt * (tokenInfo[fT].price / tokenInfo[tT].price)).toFixed(6);
    document.getElementById('maxSwap').innerText = "余额: " + (userBalances[fT] || 0);
}
function updateMax() {
    const t = document.getElementById('witToken').value;
    document.getElementById('maxWit').innerText = (userBalances[t] || 0).toFixed(4);
}
