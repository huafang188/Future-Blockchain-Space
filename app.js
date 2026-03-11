/**
 * Future Blockchain Space - 核心业务逻辑 (全功能修复版)
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
    'FBSU': { price: 1.0, logo: 'assets/fbsu_logo.png' },
    'USDT': { price: 1.0, logo: 'assets/USDT.png' },
    'BNB': { price: 600, logo: 'assets/BNB.png' },
    'BTC': { price: 65000, logo: 'assets/BTC.png' },
    'ETH': { price: 3500, logo: 'assets/ETH.png' }
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

/**
 * 向后台记录用户的操作行为
 * @param {string} type - 交易类型 (如: 购买矿机)
 * @param {number|string} amount - 数量
 * @param {string} symbol - 币种 (如: FBS)
 */
async function postTransactionRecord(type, amount, symbol) {
    const address = window.userAddress; // 确保你全局存储了当前登录地址
    if (!address) return;

    try {
        const response = await fetch("你的WorkerAPI地址", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                address: address,
                type: type,
                amount: amount,
                symbol: symbol,
                status: "已提交" // 初始状态
            })
        });

        if (response.ok) {
            console.log(`${type} 记录已提交`);
            // 提交后立即刷新数据，让用户看到“已提交”出现在列表顶部
            fetchUserData(address); 
        }
    } catch (error) {
        console.error("提交记录失败:", error);
    }
}

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
            window.userBalances = data.balances; // 提升至全局作用域
            
            // 渲染代币列表行
            if (typeof renderTokenList === 'function') {
                renderTokenList(data.balances);
            }
            
            // 更新首页总资产 (如果有计算好的 total_usd 使用后端数据)
            updateText('totalValue', data.total_usd || "0.00");

            // 单个代币余额更新 (例如页面上有 id="bal_USDT")
            Object.keys(data.balances).forEach(token => {
                updateText(`bal_${token}`, data.balances[token]);
            });
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
                <input type="number" id="recAmount" placeholder="输入数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none">
                <button onclick="doRecharge()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">确认充值</button>
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
                    <div class="flex items-center gap-2"><input type="number" id="sFromAmt" oninput="calcSwap()" placeholder="0.0" class="w-full bg-transparent border-none font-black text-xl"><select id="sFromToken" onchange="calcSwap()">${options}</select></div>
                </div>
                <div class="text-center">⇅</div>
                <div class="p-4 bg-slate-50 rounded-2xl text-left">
                    <div class="flex items-center gap-2"><input type="number" id="sToAmt" readonly class="w-full bg-transparent border-none font-black text-xl text-indigo-600"><select id="sToToken" onchange="calcSwap()">${options}</select></div>
                </div>
                <button onclick="handleSignAction('SWAP')" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">签名兑换</button>
            </div>`);
        calcSwap();
    } else if (type === 'transfer') {
        showModal("内部转账", `
            <div class="space-y-4 text-left">
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1">接收者钱包地址</label>
                    <input type="text" id="transAddr" placeholder="0x..." class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none mt-1">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1">选择代币</label>
                    <div class="token-select-wrapper mt-1">
                        <img id="transTokenLogo" src="./assets/fbs.png" class="token-logo-sm">
                        <select id="transToken" onchange="updateTransUI()" class="flex-1 bg-transparent border-none font-bold">
                            ${options}
                        </select>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between px-1">
                        <label class="text-[10px] font-bold text-slate-400">转账数量</label>
                        <span class="text-[10px] text-blue-500 font-bold">可用: <span id="transMax">0.0000</span></span>
                    </div>
                    <input type="number" id="transAmount" step="0.0001" placeholder="0.0000" 
                           oninput="validateTransferAmount(this)"
                           class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1">
                </div>
                <button onclick="doInternalTransfer()" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">确认转账</button>
            </div>`);
        updateTransUI(); // 初始化显示
    }
}

function updateTransUI() {
    const symbol = document.getElementById('transToken').value;
    const config = tokenInfo[symbol];

    // 1. 获取 Logo：直接使用配置中定义的路径
    const logoEl = document.getElementById('transTokenLogo');
    if (logoEl && config) {
        logoEl.src = config.logo;
    }

    // 2. 获取余额：从全局变量 window.userBalances 中读取实时数据
    // 之前 data.balances 已被存入 window.userBalances
    const balance = window.userBalances ? (window.userBalances[symbol] || 0) : 0;
    
    const maxEl = document.getElementById('transMax');
    if (maxEl) {
        maxEl.innerText = parseFloat(balance).toFixed(4);
    }
}

// --- 7. 执行动作 ---

// 充值记录
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
        // 核心：上链成功或启动后，向飞书记录
        await postTransactionRecord('充值', amount, symbol);
        closeModal();
    } catch (e) {
        console.error(e);
    }
}

// 购买矿机 & 缴纳电费记录
async function doChainPay(bizType) {
    let rawAmt = (bizType === 'MINER') 
        ? document.getElementById('buyTotal').innerText.replace('$ ', '') 
        : document.getElementById('elecCost').innerText.replace(' USDT', '');
    
    try {
        await executeTokenTransfer(CONTRACT_ADDRS.USDT, RECEIVE_ADDRS[bizType], rawAmt);
        
        // 核心：记录到飞书 (区分类型)
        const typeName = (bizType === 'MINER') ? '购买矿机' : '缴纳电费';
        await postTransactionRecord(typeName, rawAmt, 'USDT');
        closeModal();
    } catch (e) {
        console.error(e);
    }
}

// 提币 & 兑换 签名记录
async function handleSignAction(type) {
    try {
        const msg = `${type} Request\nTime: ${Date.now()}`;
        const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, currentAddress] });
        
        if (sig) {
            // 根据业务类型准备数据
            let actionName = "";
            let amount = "0";
            let symbol = "FBS";

            if (type === 'WITHDRAW') {
                actionName = "提币";
                amount = document.getElementById('witAmount').value;
                symbol = document.getElementById('witToken').value;
            } else if (type === 'SWAP') {
                actionName = "兑换";
                amount = document.getElementById('sFromAmt').value;
                symbol = `${document.getElementById('sFromToken').value} -> ${document.getElementById('sToToken').value}`;
            }

            // 核心：记录到飞书
            await postTransactionRecord(actionName, amount, symbol);
            
            alert("申请已提交"); 
            closeModal();
        }
    } catch (e) { 
        alert("已取消"); 
    }
}
async function doInternalTransfer() {
    const toAddr = document.getElementById('transAddr').value;
    const symbol = document.getElementById('transToken').value;
    const amount = parseFloat(document.getElementById('transAmount').value);
    const balance = parseFloat(tokenInfo[symbol]?.balance || 0);
    const finalAmount = amount.toFixed(4); 

    // 1. 基础校验
    if (!toAddr.startsWith('0x') || toAddr.length < 42) return alert("请输入正确的钱包地址");
    if (isNaN(amount) || amount <= 0) return alert("请输入转账数量");
    
    // 2. 余额检查
    if (amount > balance) {
        return alert(`余额不足！当前 ${symbol} 余额为 ${balance.toFixed(4)}`);
    }

    try {
        // 3. 构造符合飞书“转账记录”表格式的数据
        // 接收者, 接收类型(币种), 接收数量, 状态, 转账时间
        const response = await fetch("你的WorkerAPI地址", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                address: currentAddress, // 发起者
                receiver: toAddr,        // 接收者
                type: symbol,            // 接收类型 (如: FBS)
                amount: amount.toFixed(4), // 接收数量
                status: "已提交",         // 初始状态
                time: new Date().toISOString().split('T')[0] // 转账时间 (YYYY-MM-DD)
            })
        });

        if (response.ok) {
            alert("转账请求已提交");
            closeModal();
            fetchUserData(currentAddress); // 刷新历史记录查看状态
        }
    } catch (e) {
        console.error("转账失败:", e);
        alert("网络请求失败");
    }
}
// --- 8. UI 辅助逻辑 ---
function showModal(title, html) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.remove('hidden');
    if (typeof i18nRender === 'function') i18nRender();
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
    document.getElementById('maxWit').innerText = (userBalances[t] || 0);
}

/**
 * 实时校验转账数量输入
 * 允许正常输入，但限制小数点后最多 4 位，防止 toFixed(4) 锁死输入
 */
function validateTransferAmount(input) {
    let val = input.value;
    
    // 1. 如果包含小数点
    if (val.indexOf('.') !== -1) {
        const parts = val.split('.');
        // 2. 如果小数部分超过 4 位，截断它
        if (parts[1].length > 4) {
            input.value = parts[0] + '.' + parts[1].slice(0, 4);
        }
    }
    
    // 3. 实时检查余额并变色提醒（可选增强）
    const symbol = document.getElementById('transToken').value;
    const balance = window.userBalances ? (window.userBalances[symbol] || 0) : 0;
    if (parseFloat(input.value) > balance) {
        input.classList.add('text-red-500'); // 余额不足变红
    } else {
        input.classList.remove('text-red-500');
    }
}
