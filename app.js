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
    'NEO': { price: 0.152, logo: 'assets/neo_logo.png' },
    'NEX': { price: 0.00,  logo: 'assets/nex_logo.png' },
    'NET': { price: 0.00,  logo: 'assets/net_logo.png' },
    'NEA': { price: 0.00,  logo: 'assets/nea_logo.png' },
    'NRY': { price: 0.00,  logo: 'assets/nry_logo.png' },
    'NCL': { price: 0.00,  logo: 'assets/ncl_logo.png' },
    'USDT': { price: 1.0,   logo: 'assets/USDT.png' },
    'BNB': { price: 600.0, logo: 'assets/BNB.png' },
    'ETH': { price: 3500.0, logo: 'assets/ETH.png' },
    'BTC': { price: 65000.0, logo: 'assets/BTC.png' }
};


let currentAddress = localStorage.getItem('fbs_address'); 
let userBalances = {};

// --- 2. 立即挂载全局函数 (解决 ReferenceError 的关键) ---
// 将此部分移到文件最上方，确保 HTML 哪怕在脚本报错前也能识别到函数
window.handleWalletClick = function() {
    console.log("Wallet button clicked");
    const savedAddr = localStorage.getItem('fbs_address');
    if (savedAddr) {
        logout();
    } else {
        connectWallet();
    }
};

// --- 3. 初始化与生命周期 ---
window.onload = () => {
    // 1. 优先初始化语言 (新增)
    if (typeof window.i18nRender === 'function') {
        window.i18nRender();
    }

    const isManualLogout = localStorage.getItem('user_logout_manual');
    if (currentAddress && isManualLogout !== 'true') {
        updateWalletUI(currentAddress);
        if (typeof fetchUserData === 'function') fetchUserData(currentAddress);
    } else {
        resetWalletUI(); // 注意：resetWalletUI 内部也需要调用 i18nRender
    }
    
    // 渲染初始代币列表（空数据或默认样式）
    renderTokenList({}); 
    
    // 2. 再次确保页面所有标记了 data-i18n 的地方都被翻译 (加固)
    if (window.i18nRender) window.i18nRender();
};

// --- 4. 钱包逻辑 ---
async function connectWallet() {
    if (!window.ethereum) return alert("请在钱包内打开");
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0]; 
        
        // 签名逻辑
        const msg = `FBS Login\nAddress: ${address}\nTime: ${Date.now()}`;
        await window.ethereum.request({ method: 'personal_sign', params: [msg, address] });
        
        localStorage.setItem('fbs_address', address);
        localStorage.removeItem('user_logout_manual'); // 允许下次自动重连
        currentAddress = address;
        
        finishLogin();
    } catch (e) { 
        console.error("Login Cancelled", e); 
    }
}


window.postTransactionRecord = async function(type, amount, symbol) {
    const address = typeof currentAddress !== 'undefined' ? currentAddress : (window.userAddress || localStorage.getItem('fbs_address'));
    
    if (!address) {
        console.error("未连接钱包，无法提交记录");
        return;
    }

    // 获取当前日期，格式化为 2026/03/12，匹配你截图中的显示
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;

    const payload = {
        action: "record_transaction", 
        address: address,  
        type: type,        
        amount: String(amount), // 强制转为字符串，防止飞书 API 报错
        symbol: symbol,    
        status: "已提交",     
        time: formattedDate 
    };

    console.log("🚀 准备提交交易记录:", payload);

    try {
        const response = await fetch('https://api.fbsfbs.fit/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        console.log("📥 后端响应:", result);
        
        if (result.success && typeof fetchUserData === 'function') {
            fetchUserData(address); // 提交后刷新界面数据
        }
    } catch (e) {
        console.error("提交失败:", e);
    }
};
function finishLogin() {
    updateWalletUI(currentAddress);
    if (typeof fetchUserData === 'function') fetchUserData(currentAddress);
    if (typeof closeModal === 'function') closeModal();
}

function updateWalletUI(addr) {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = addr.slice(0, 6) + '...' + addr.slice(-4);
        el.removeAttribute('data-i18n');
        el.className = "cursor-pointer font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] border border-emerald-100 mb-4 inline-block";
    }
}

function resetWalletUI() {
    const el = document.getElementById('walletAddr');
    if (el) {
        el.innerText = '连接钱包';
        el.className = "cursor-pointer font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] border border-blue-100 mb-4 inline-block";
    }
}

function logout() {
    if (confirm("确定要退出登录并断开连接吗？")) {
        localStorage.setItem('user_logout_manual', 'true');
        localStorage.removeItem('fbs_address');
        location.reload();
    }
}

// 格式化函数
function formatTime(timestamp) {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// 渲染函数
function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let totalVal = 0;
    
    // 检查 tokenInfo 是否存在，不存在则跳过渲染防止崩溃
    if (typeof tokenInfo === 'undefined') return console.error("tokenInfo is not defined");

    const html = Object.keys(tokenInfo).map(symbol => {
        const bal = parseFloat(balances[symbol] || 0);
        const price = tokenInfo[symbol].price || 0;
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
    const totalEl = document.getElementById('totalValue');
    if (totalEl) totalEl.innerText = totalVal.toFixed(2);
}
// --- 4. 核心：读取后端数据 ---
async function fetchUserData(address) {
    console.log("正在请求地址:", address);
    try {
        const res = await fetch(`${API_BASE}?address=${address}`);
        if (!res.ok) throw new Error('网络请求失败');
        
        const data = await res.json();
        console.log("收到后端原始数据:", data);

        // 0. 处理新用户逻辑
        if (data.newUser) {
            console.log("新用户，准备弹窗注册...");
            if (typeof window.showRegisterModal === 'function') {
                window.showRegisterModal(address);
            }
            return;
        }

        // 1. 渲染【基础信息】
        const info = data.info || {};
        updateText('info_inviteCode', info["推荐码"] || "---");
        updateText('info_inviter', info["推荐人"] || "---");
        updateText('info_regTime', info["注册时间"] || "--");

        // 2. 渲染【矿机数据】
        const miner = data.miner || {};
        updateText('miner_count', miner["矿机数量"]);
        updateText('miner_daily', miner["日产量"]);
        updateText('miner_deadline', miner["挖矿期限"] || "--");
        updateText('miner_locked', miner["锁仓数量"]);

        // 3. 渲染【团队数据】 - 即使 data.team 为 null 也能安全运行
        const t = data.team || {}; 
        updateText('team_directCount', t["直推人数"]);
        updateText('team_directSales', t["直推业绩"]);
        updateText('team_totalCount', t["团队人数"]);
        updateText('team_totalSales', t["团队业绩"]);
        updateText('team_totalReward', t["累计奖励"]);

// 4. 渲染【资产列表】与计算总价值
        if (data.balances) {
            window.userBalances = data.balances; 
            
            // 渲染列表行
            if (typeof renderTokenList === 'function') {
                renderTokenList(data.balances);
            }
            
            // --- 核心修改：前端实时计算总价值 ---
            let calculatedTotal = 0;
            const prices = window.TOKEN_PRICES || { "USDT": 1, "FBS": 0.5, "BNB": 600 }; // 确保你有定义单价

            Object.keys(data.balances).forEach(token => {
                const balance = parseFloat(data.balances[token]) || 0;
                const price = prices[token] || 0;
                calculatedTotal += (balance * price);
                
                // 更新单个代币余额显示
                updateText(`bal_${token}`, balance.toFixed(2));
            });

            // 更新首页大数字的总资产价值
            updateText('totalValue', calculatedTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }));
        }
        renderHistory(data.history);     // 对应后端返回的 history
        renderTransfers(data.transfers); // 对应后端返回的 transfers
        

    } catch (e) {
        console.error("前端渲染逻辑报错:", e);
        // 如果报错了，可以给用户一个友好的提示
        // if (typeof showModal === 'function') showModal('错误', '数据加载失败，请刷新页面');
    }
}

/**
 * 状态与 CSS 类名的映射字典 (需与飞书表中的状态文字完全一致)
 */
const STATUS_CLASS_MAP = {
    "已提交": "status-submitted",
    "处理中": "status-processing",
    "成功": "status-success",
    "失败": "status-failed"
};

function renderHistory(history) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!history || history.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-300 text-xs" data-i18n="no_data">暂无交易记录</div>`;
        if (window.i18nRender) i18nRender();
        return;
    }

    const html = history.map(item => {
        const type = item['交易类型'] || 'SYSTEM';
        const amount = item['交易数量'] || '0';
        const symbol = item['交易代币'] || 'FBS';
        const time = item['交易时间'] || '';
        const status = item['交易状态'] || '已提交';

        // 1. 获取状态颜色类名
        const statusClass = STATUS_CLASS_MAP[status] || "status-submitted";

        // 2. 处理金额正负色逻辑（提现、电费等支出显示红色）
        const isNegative = ['提现', '缴纳电费', '购买矿机'].includes(type);
        const amountColor = isNegative ? 'text-red-500' : 'text-emerald-500';
        const prefix = isNegative ? '-' : '+';

        return `
            <div class="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 mb-2">
                <div class="flex flex-col text-left">
                    <span class="font-bold text-slate-800 text-sm" data-i18n="${type}">${type}</span>
                    <div class="flex items-center space-x-2 mt-1">
                        <span class="text-[10px] text-slate-400">${time}</span>
                        <span class="mx-1 text-slate-300">|</span>
                        <span class="status-tag ${statusClass}" data-i18n="${status}">${status}</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black ${amountColor}">${prefix}${amount}</div>
                    <div class="text-[9px] text-slate-400 font-bold uppercase">${symbol}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    if (window.i18nRender) i18nRender(); // 渲染后执行多语言翻译
}
/**
 * 渲染转账流水 (对应飞书：转账记录表)
 */
function renderTransfers(transfers) {
    const container = document.getElementById('transferList');
    if (!container) return;

    if (!transfers || transfers.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-300 text-xs" data-i18n="no_data">暂无转账流水</div>`;
        if (window.i18nRender) i18nRender();
        return;
    }

    const html = transfers.map(item => {
        // --- 核心修正：匹配飞书截图列名 ---
        const toAddr = item['接收者'] || '---';
        const amount = item['接收数量'] || '0';
        const type = item['接收类型'] || 'FBS';
        const status = item['状态'] || '';
        const time = item['转账时间'] || '';

        return `
            <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm mb-2">
                <div class="flex justify-between items-start mb-2 text-left">
                    <span class="bg-blue-50 text-blue-600 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase" data-i18n="${type}">
                        ${type}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">${toAddr.slice(0, 8)}...${toAddr.slice(-4)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <div class="text-[10px] text-slate-500 font-medium">
                        ${time} | <span class="text-blue-500" data-i18n="${status}">${status}</span>
                    </div>
                    <div class="text-slate-800 font-black text-sm">${amount}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    if (window.i18nRender) i18nRender(); // 渲染后触发翻译
}

/**
 * 辅助更新函数：增强容错
 */
function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // 如果是 null/undefined 显示默认值
    if (value === undefined || value === null) {
        el.innerText = (id.includes('Sales') || id.includes('Reward')) ? "0.00" : "0";
    } else {
        el.innerText = value;
    }
}

// --- 5. 核心交互：转账与支付逻辑 ---
async function executeTokenTransfer(contractAddr, to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddr, ["function transfer(address to, uint256 amount) public returns (bool)"], signer);
        
        showModal("正在处理", `<div class="p-10 text-center"><div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>请在钱包确认交易并等待...</div>`);

        const tx = await contract.transfer(to, ethers.parseUnits(amountStr.toString(), 18));
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            alert("✅ 支付成功！数据同步约需1-2分钟。");
            location.reload(); 
        }
    } catch (e) {
        alert("⚠️ 交易未完成: " + (e.reason || "用户拒绝或余额不足"));
        closeModal();
    }
}

async function executeNativeTransfer(to, amountStr) {
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({ to, value: ethers.parseEther(amountStr.toString()) });
        await tx.wait();
        alert("✅ 充值成功！");
        location.reload();
    } catch (e) { alert("充值失败"); closeModal(); }
}

// --- 6. 业务路由 (弹窗逻辑) ---

/**
 * 矿机与电费弹窗
 */
window.openMinerModal = function(type) {
    const nums = [1, 5, 10, 15, 20, 25, 50, 100];
    if (type === 'buy') {
        showModal("购买矿机", `
            <div class="space-y-4">
                <div class="grid grid-cols-4 gap-2">
                    ${nums.map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-200 p-2 rounded-xl text-[10px] font-bold hover:bg-blue-50 transition-all">${n}台</button>`).join('')}
                </div>
                <div class="p-4 bg-blue-50 rounded-2xl flex justify-between items-center">
                    <span class="text-xs font-bold text-blue-600">预计支付</span>
                    <span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span>
                </div>
                <button onclick="doChainPay('MINER')" class="action-btn w-full mt-2">
                    <span>确认支付</span>
                </button>
            </div>`);
    } else {
        const days = [30, 60, 90, 180, 360];
        showModal("缴纳电费", `
            <div class="space-y-4 text-left">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 ml-1">矿机台数</label>
                    <select id="elecNum" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none outline-none">
                        ${nums.map(n => `<option value="${n}">${n} 台</option>`).join('')}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 ml-1">缴纳天数</label>
                    <select id="elecDays" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none outline-none">
                        ${days.map(d => `<option value="${d}">${d} 天</option>`).join('')}
                    </select>
                </div>
                <div class="p-4 bg-slate-900 rounded-2xl flex justify-between items-center">
                    <span class="text-xs font-bold text-slate-400">所需电费</span>
                    <span id="elecCost" class="text-xl font-black text-yellow-500">30.00 USDT</span>
                </div>
                <button onclick="doChainPay('ELECTRIC')" class="action-btn w-full mt-2">
                    <span>确认支付</span>
                </button>
            </div>`);
        calcElec(); // 初始化显示
    }
}

/**
 * 资产相关弹窗 (充值/提币/兑换/转账)
 */
window.openFinanceModal = function(type) {
    const options = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
    
    if (type === 'recharge') {
        showModal("充值资产", `
            <div class="space-y-4 text-left">
                <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                    ${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <input type="number" id="recAmount" placeholder="输入数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button onclick="doRecharge()" class="action-btn w-full mt-2">
                    <span>确认充值</span>
                </button>
            </div>`);
    } else if (type === 'withdraw') {
        showModal("提币申请", `
            <div class="space-y-4 text-left">
                <select id="witToken" onchange="updateMax()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                    ${options}
                </select>
                <div class="text-[10px] font-bold text-blue-500 px-1">可用: <span id="maxWit">0.00</span></div>
                <input type="number" id="witAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button onclick="handleSignAction('WITHDRAW')" class="action-btn w-full mt-2 !from-red-500 !to-orange-500">
                    <span>签名提交</span>
                </button>
            </div>`);
        updateMax();
    } else if (type === 'exchange') {
        showModal("资产兑换", `
            <div class="space-y-3">
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                    <div class="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>支付</span>
                        <span id="maxSwap">余额: 0</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="number" id="sFromAmt" oninput="calcSwap()" placeholder="0.0" class="w-full bg-transparent border-none font-black text-xl outline-none">
                        <select id="sFromToken" onchange="calcSwap()" class="bg-transparent border-none font-bold outline-none">${options}</select>
                    </div>
                </div>
                <div class="text-center text-slate-300 font-bold">⇅</div>
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                    <div class="flex items-center gap-2">
                        <input type="number" id="sToAmt" readonly class="w-full bg-transparent border-none font-black text-xl text-indigo-600 outline-none">
                        <select id="sToToken" onchange="calcSwap()" class="bg-transparent border-none font-bold outline-none">${options}</select>
                    </div>
                </div>
                <button onclick="handleSignAction('SWAP')" class="action-btn w-full mt-2">
                    <span>签名兑换</span>
                </button>
            </div>`);
        calcSwap();
    } else if (type === 'transfer') {
        showModal("内部转账", `
            <div class="space-y-4 text-left">
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1">接收者钱包地址</label>
                    <input type="text" id="transAddr" placeholder="0x..." class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none mt-1 outline-none">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1">选择代币</label>
                    <select id="transToken" onchange="updateTransUI()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                        ${options}
                    </select>
                </div>
                <div>
                    <div class="flex justify-between px-1">
                        <label class="text-[10px] font-bold text-slate-400">转账数量</label>
                        <span class="text-[10px] text-blue-500 font-bold">可用: <span id="transMax">0.0000</span></span>
                    </div>
                    <input type="number" id="transAmount" step="0.0001" placeholder="0.0000" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none">
                </div>
                <button onclick="doInternalTransfer()" class="action-btn w-full mt-4">
                    <span>确认转账</span>
                </button>
            </div>`);
        updateTransUI(); 
    }
}

// --- 7. 辅助计算与 UI 刷新 ---

window.setBuyNum = function(n, btn) {
    document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.add('bg-blue-600', 'text-white');
    const total = (n * 150).toFixed(2); // 单价150
    document.getElementById('buyTotal').innerText = `$ ${total}`;
};

window.calcElec = function() {
    const n = document.getElementById('elecNum')?.value || 1;
    const d = document.getElementById('elecDays')?.value || 30;
    const cost = (n * d * 1.0).toFixed(2); // 假设1台1天1USDT
    document.getElementById('elecCost').innerText = `${cost} USDT`;
};

window.updateMax = function() {
    const symbol = document.getElementById('witToken')?.value;
    const balance = window.userBalances ? (window.userBalances[symbol] || 0) : 0;
    document.getElementById('maxWit').innerText = parseFloat(balance).toFixed(4);
};

window.calcSwap = function() {
    const from = document.getElementById('sFromToken')?.value;
    const to = document.getElementById('sToToken')?.value;
    const amt = parseFloat(document.getElementById('sFromAmt')?.value) || 0;
    const balance = window.userBalances ? (window.userBalances[from] || 0) : 0;
    
    document.getElementById('maxSwap').innerText = "余额: " + parseFloat(balance).toFixed(4);
    
    if (tokenInfo[from] && tokenInfo[to]) {
        const res = (amt * (tokenInfo[from].price / tokenInfo[to].price)).toFixed(6);
        document.getElementById('sToAmt').value = res;
    }
};

window.updateTransUI = function() {
    const symbol = document.getElementById('transToken')?.value;
    const balance = window.userBalances ? (window.userBalances[symbol] || 0) : 0;
    document.getElementById('transMax').innerText = parseFloat(balance).toFixed(4);
};

// --- 8. 执行动作与接口提交 ---

/**
 * 修改后：内部转账逻辑（增加签名校验）
 */
window.doInternalTransfer = async function() {
    const symbol = document.getElementById('transToken')?.value;
    const toAddr = document.getElementById('transAddr')?.value.trim();
    const amount = document.getElementById('transAmount')?.value;
    const senderAddr = typeof currentAddress !== 'undefined' ? currentAddress : localStorage.getItem('fbs_address');

    if (!toAddr || !amount || parseFloat(amount) <= 0) {
        alert("请输入有效的地址和数量");
        return;
    }

    try {
        // --- 1. 签名校验 (内部转账不耗 Gas) ---
        const message = `确认内部转账\n转出资产: ${amount} ${symbol}\n接收地址: ${toAddr}\n时间: ${new Date().toLocaleString()}`;
        const hexMsg = '0x' + Array.from(new TextEncoder().encode(message))
                              .map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log("正在请求签名授权...");
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [hexMsg, senderAddr],
        });

        // --- 2. 签名成功后发送数据 ---
        const response = await fetch('https://api.fbsfbs.fit/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "transfer",
                address: senderAddr,
                receiver: toAddr,   // 对应 Worker 解构的 receiver
                type: symbol,       // 根据截图，飞书“接收类型”填的是币种名
                amount: String(amount),
                symbol: symbol,
                status: "已提交"      
            })
        });

        const result = await response.json();
        if (result.success) {
            alert("内部转账成功");
            closeModal();
            if (typeof fetchUserData === 'function') fetchUserData(senderAddr);
        }
    } catch (e) {
        console.error("转账失败:", e);
        if (e.code === 4001) alert("用户取消了签名");
    }
};

async function doRecharge() {
    const symbol = document.getElementById('recToken').value;
    const amount = document.getElementById('recAmount').value;
    if (!amount || amount <= 0) return alert("请输入金额");
    try {
        if (symbol === 'BNB') {
            await executeNativeTransfer(RECEIVE_ADDRS.RECHARGE, amount);
        } else {
            await executeTokenTransfer(CONTRACT_ADDRS[symbol], RECEIVE_ADDRS.RECHARGE, amount);
        }
        await postTransactionRecord('充值', amount, symbol);
        closeModal();
    } catch (e) { console.error(e); }
}

async function doChainPay(bizType) {
    const totalText = (bizType === 'MINER') 
        ? document.getElementById('buyTotal').innerText.replace('$ ', '') 
        : document.getElementById('elecCost').innerText.replace(' USDT', '');
    
    try {
        await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], totalText);
        const typeName = (bizType === 'MINER') ? '购买矿机' : '缴纳电费';
        await postTransactionRecord(typeName, totalText, 'USDT');
        closeModal();
    } catch (e) { console.error(e); }
}

async function handleSignAction(type) {
    try {
        const msg = `${type} Request at ${new Date().toISOString()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        if (sig) {
            let actionName = "", amount = "0", symbol = "";
            if (type === 'WITHDRAW') {
                actionName = "提币";
                amount = document.getElementById('witAmount').value;
                symbol = document.getElementById('witToken').value;
            } else {
                actionName = "兑换";
                amount = document.getElementById('sFromAmt').value;
                symbol = `${document.getElementById('sFromToken').value}->${document.getElementById('sToToken').value}`;
            }
            await postTransactionRecord(actionName, amount, symbol);
            alert("申请已提交");
            closeModal();
        }
    } catch (e) { alert("已取消或签名失败"); }
}

/**
 * 2. 绑定推荐人函数
 */
window.submitBindInviter = async function() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    const walletAddr = (typeof currentAddress !== 'undefined' && currentAddress) ? currentAddress : localStorage.getItem('fbs_address');
    
    if (!inviterId) {
        alert("请输入推荐人 ID");
        return;
    }
    if (!walletAddr) {
        alert("请先连接钱包");
        return;
    }

    const now = new Date();
    const formattedTime = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;

    try {
        const response = await fetch('https://api.fbsfbs.fit/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "bind_relationship", // 关键：交给 Worker 分流到推荐表
                user: walletAddr,
                inviter: inviterId,
                regTime: formattedTime
            })
        });

        const result = await response.json();
        if (result.success || result.data) {
            if(document.getElementById('info_inviter')) document.getElementById('info_inviter').innerText = inviterId;
            if(document.getElementById('info_regTime')) document.getElementById('info_regTime').innerText = formattedTime;
            showModal("绑定成功", "推荐关系已记录");
        } else {
            alert("绑定失败: " + (result.message || "请求未成功"));
        }
    } catch (error) {
        console.error("绑定异常:", error);
        alert("网络连接失败");
    }
};

// ==================== UI 核心控制补丁 (直接粘到底部) ====================

/**
 * 核心弹窗函数：修复 "showModal is not defined"
 */
window.showModal = function(title, html) {
    const titleEl = document.getElementById('modalTitle');
    const contentEl = document.getElementById('modalContent');
    const overlay = document.getElementById('modalOverlay');

    if (titleEl && contentEl && overlay) {
        titleEl.innerText = title;
        contentEl.innerHTML = html;
        overlay.classList.remove('hidden');
        // 如果有国际化渲染函数则调用
        if (typeof i18nRender === 'function') i18nRender();
    } else {
        console.error("找不到弹窗 HTML 元素，请检查 index.html 是否包含 modalOverlay");
    }
};

/**
 * 关闭弹窗
 */
window.closeModal = function() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.add('hidden');
};

/**
 * 绑定推荐人入口：修复 "openBindInviterModal is not defined"
 */
window.openBindInviterModal = function() {
    const displayAddress = typeof currentAddress !== 'undefined' ? currentAddress : localStorage.getItem('fbs_address');
    
    showModal("绑定推荐关系", `
        <div class="space-y-4 text-left">
            <div class="p-4 bg-blue-50 rounded-2xl">
                <p class="text-[10px] font-bold text-blue-600 mb-1">您的当前地址</p>
                <p class="text-[10px] font-mono text-slate-500 break-all">${displayAddress || '未连接钱包'}</p>
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 ml-1">推荐人 ID (推荐码)</label>
                <input type="text" id="input_inviter_id" placeholder="输入推荐人 ID" 
                       class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none focus:ring-2 focus:ring-blue-100 transition-all">
            </div>
            <button onclick="submitBindInviter()" class="action-btn w-full mt-2">
                <span>确认提交绑定</span>
            </button>
        </div>
    `);
};

/**
 * 通用加载动画控制
 */
window.showLoading = function(show) {
    const loader = document.getElementById('loadingOverlay'); // 确保 HTML 有这个 ID
    if (!loader) return;
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
};

/**
 * 修复：复制邀请码功能
 * @param {string} text 要复制的文本内容
 */
window.copyInviteCode = function(text) {
    if (!text || text === '--') return;

    // 使用现代剪贴板 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert("邀请码已复制: " + text);
        }).catch(err => {
            console.error('复制失败', err);
            // 备用方案
            fallbackCopyText(text);
        });
    } else {
        fallbackCopyText(text);
    }
};

// 备用复制方法（针对兼容性）
function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert("邀请码已复制: " + text);
    } catch (err) {
        alert("复制失败，请手动复制");
    }
    document.body.removeChild(textArea);
}


/**
 * 全局函数：强制确保当前处于币安智能链 (BSC)
 * 供购买矿机、电费、充值等真实上链业务调用，这部分为新增内容
 */
window.ensureBSCChain = async function() {
    if (!window.ethereum) {
        alert("未检测到环境，请在支持 Web3 的浏览器中打开");
        return false;
    }

    const BSC_CHAIN_ID = '0x38'; // 56 的十六进制

    try {
        // 获取当前链 ID
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (currentChainId !== BSC_CHAIN_ID) {
            console.log("正在强制切换到 BSC 网络...");
            try {
                // 请求切换
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BSC_CHAIN_ID }],
                });
            } catch (switchError) {
                // 如果用户钱包没有配置 BSC，则自动添加
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: BSC_CHAIN_ID,
                            chainName: 'BNB Smart Chain Mainnet',
                            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                            rpcUrls: ['https://bsc-dataseed.binance.org/'],
                            blockExplorerUrls: ['https://bscscan.com/']
                        }]
                    });
                } else {
                    throw switchError;
                }
            }
        }
        return true;
    } catch (error) {
        console.error("切换网络失败:", error);
        alert("请手动将钱包网络切换为币安智能链 (BSC)");
        return false;
    }
};

/**
 * SPA 页面切换逻辑
 */
window.switchPage = function(pageId) {
    // 1. 隐藏所有页面视图
    document.querySelectorAll('.page-view').forEach(view => {
        view.classList.add('hidden');
    });

    // 2. 显示选中的页面
    const activePage = document.getElementById('page-' + pageId);
    if (activePage) {
        activePage.classList.remove('hidden');
        // 只有切换到对应页面时才滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 3. 更新导航栏 UI 状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'text-blue-600');
        item.classList.add('text-slate-400');
    });
    
    const activeNav = document.getElementById('nav-' + pageId);
    if (activeNav) {
        activeNav.classList.add('active', 'text-blue-600');
        activeNav.classList.remove('text-slate-400');
    }

    // 4. 特殊页面逻辑：如果切换到“我的”，刷新数据
    if (pageId === 'user') {
        if (typeof fetchUserData === 'function') fetchUserData();
    }
};

// 页面加载时默认显示首页
window.addEventListener('DOMContentLoaded', () => {
    switchPage('home');
});
