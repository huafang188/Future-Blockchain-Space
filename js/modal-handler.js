import { tokenInfo, CONTRACT_ADDRS } from './config.js';
import { submitBindInviter } from './api-service.js';

/**
 * 挂载弹窗核心函数
 * 修复了大小写敏感导致的 NaN 和数据提交错误问题
 */
export function mountModalHandlers() {
    
    // --- 辅助：统一生成大写的币种选项 ---
    // 确保 value 始终是大写，以匹配 Worker 的 allPrices 键名
    const options = Object.keys(tokenInfo)
        .map(t => `<option value="${t.toUpperCase()}">${t.toUpperCase()}</option>`)
        .join('');

    // --- 1. 矿机/电费弹窗 ---
    window.openMinerModal = function(type) {
        const nums = [1, 5, 10, 15, 20, 25, 50, 100];
        if (type === 'buy') {
            window.showModal("buy_miner", `
                <div class="space-y-4">
                    <div class="grid grid-cols-4 gap-2">
                        ${nums.map(n => `
                            <button onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-200 p-2 rounded-xl text-[10px] font-bold hover:bg-blue-50 transition-all">
                                ${n}<span data-i18n="m_count">台</span>
                            </button>`).join('')}
                    </div>
                    <div class="p-4 bg-blue-50 rounded-2xl flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-600" data-i18n="expected_pay">预计支付</span>
                        <span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span>
                    </div>
                    <button onclick="doChainPay('MINER')" class="action-btn w-full mt-2" data-i18n="confirm_pay">确认支付</button>
                </div>`);
        } else {
            const days = [30, 60, 90, 180, 360];
            window.showModal("pay_fee", `
                <div class="space-y-4 text-left">
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="m_count">矿机台数</label>
                        <select id="elecNum" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none outline-none">
                            ${nums.map(n => `<option value="${n}">${n}</option>`).join('')}
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="m_term">缴纳天数</label>
                        <select id="elecDays" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl border-none outline-none">
                            ${days.map(d => `<option value="${d}">${d}</option>`).join('')}
                        </select>
                    </div>
                    <div class="p-4 bg-slate-900 rounded-2xl flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-400" data-i18n="pay_fee">所需电费</span>
                        <span id="elecCost" class="text-xl font-black text-yellow-500">30.00 USDT</span>
                    </div>
                    <button onclick="doChainPay('ELECTRIC')" class="action-btn w-full mt-2" data-i18n="confirm_pay">确认支付</button>
                </div>`);
            window.calcElec();
        }
    };

    // --- 2. 资产相关弹窗 ---
    window.openFinanceModal = function(type) {
        if (type === 'recharge') {
            window.showModal("recharge", `
                <div class="space-y-4 text-left">
                    <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                        ${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t.toUpperCase()}">${t.toUpperCase()}</option>`).join('')}
                    </select>
                    <input type="number" id="recAmount" data-i18n="input_amount" placeholder="输入数量" 
                           class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button onclick="doRecharge()" class="action-btn w-full mt-2" data-i18n="recharge">确认充值</button>
                </div>`);
        } else if (type === 'withdraw') {
            window.showModal("withdraw", `
                <div class="space-y-4 text-left">
                    <select id="witToken" onchange="updateMax()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                        ${options}
                    </select>
                    <div class="text-[10px] font-bold text-blue-500 px-1">
                        <span data-i18n="available_balance">可用</span>: <span id="maxWit">0.00</span>
                    </div>
                    <input type="number" id="witAmount" placeholder="0.00" 
                           class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button onclick="handleSignAction('WITHDRAW')" class="action-btn w-full mt-2 !from-red-500 !to-orange-500" data-i18n="withdraw">签名提交</button>
                </div>`);
            window.updateMax();
        } else if (type === 'exchange') {
            window.showModal("exchange", `
                <div class="space-y-3">
                    <div class="p-4 bg-slate-50 rounded-2xl text-left">
                        <div class="flex justify-between text-[10px] font-bold text-slate-400">
                            <span data-i18n="balance">余额</span>
                            <span id="maxSwap">0</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="number" id="sFromAmt" oninput="window.calcSwap()" placeholder="0.0" class="w-full bg-transparent border-none font-black text-xl outline-none">
                            <select id="sFromToken" onchange="window.calcSwap()" class="bg-transparent border-none font-bold outline-none">${options}</select>
                        </div>
                    </div>
                    <div class="text-center text-slate-300 font-bold">⇅</div>
                    <div class="p-4 bg-slate-50 rounded-2xl text-left">
                        <div class="flex items-center gap-2">
                            <input type="number" id="sToAmt" readonly class="w-full bg-transparent border-none font-black text-xl text-indigo-600 outline-none">
                            <select id="sToToken" onchange="window.calcSwap()" class="bg-transparent border-none font-bold outline-none">${options}</select>
                        </div>
                    </div>
                    <button onclick="handleSignAction('SWAP')" class="action-btn w-full mt-2" data-i18n="exchange">签名兑换</button>
                </div>`);
            // 确保 calcSwap 已定义后再调用
            if(window.calcSwap) window.calcSwap();
        } else if (type === 'transfer') {
            window.showModal("internal_transfer", `
                <div class="space-y-4 text-left">
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="receiver_address">接收者钱包地址</label>
                        <input type="text" id="transAddr" placeholder="0x..." class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none mt-1 outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="select_token">选择代币</label>
                        <select id="transToken" onchange="updateTransUI()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                            ${options}
                        </select>
                    </div>
                    <div>
                        <div class="flex justify-between px-1">
                            <label class="text-[10px] font-bold text-slate-400" data-i18n="transfer_amount">转账数量</label>
                            <span class="text-[10px] text-blue-500 font-bold"><span data-i18n="available_balance">可用</span>: <span id="transMax">0.0000</span></span>
                        </div>
                        <input type="number" id="transAmount" step="0.0001" placeholder="0.0000" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none">
                    </div>
                    <button onclick="doInternalTransfer()" class="action-btn w-full mt-4" data-i18n="confirm_transfer">确认转账</button>
                </div>`);
            window.updateTransUI();
        }
    };

    // --- 3. 内部转账逻辑修复 (确保 symbol 大写提交) ---
    window.doInternalTransfer = async function() {
        const toAddr = document.getElementById('transAddr')?.value.trim();
        const symbol = document.getElementById('transToken')?.value.toUpperCase(); // 关键修复：转大写
        const amount = document.getElementById('transAmount')?.value;

        if (!toAddr || !amount || parseFloat(amount) <= 0) {
            alert("请输入正确的地址和数量");
            return;
        }

        window.showLoading(true);
        try {
            // 注意：这里需要调用你实际的 API 提交逻辑，确保 symbol 是大写的
            const response = await fetch('https://api.neoneo.ink/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'transfer', 
                    address: window.currentAddress,
                    to: toAddr,
                    symbol: symbol, // 发送大写的 BTC/ETH 等
                    amount: amount
                })
            });
            const res = await response.json();
            if (res.success) {
                alert("转账提交成功");
                window.closeModal();
            } else {
                alert("转账失败: " + (res.error || "未知错误"));
            }
        } catch (e) {
            console.error(e);
        } finally {
            window.showLoading(false);
        }
    };

    // --- 4. 兑换计算逻辑修复 (处理 NaN) ---
    window.calcSwap = function() {
        const fromToken = document.getElementById('sFromToken')?.value?.toUpperCase();
        const toToken = document.getElementById('sToToken')?.value?.toUpperCase();
        const fromInput = document.getElementById('sFromAmt');
        const toInput = document.getElementById('sToAmt');
        
        // window.currentPrices 来源于 Worker 的 allPrices
        const prices = window.currentPrices || {}; 

        if (!fromToken || !toToken || !prices[fromToken] || !prices[toToken]) {
            if (toInput) toInput.value = "0.00";
            return;
        }

        const amount = parseFloat(fromInput.value) || 0;
        // 公式：(输入的数量 * 来源币价格) / 目标币价格
        const result = (amount * prices[fromToken]) / prices[toToken];
        
        if (toInput) {
            // 修复 NaN，如果计算失败则显示 0.0000
            toInput.value = isNaN(result) ? "0.0000" : result.toFixed(4); 
        }
    };

    // --- 5. 其他弹窗保持不变 (仅确保 ID 和逻辑一致) ---
    window.openBindInviterModal = function() {
        const displayAddress = window.currentAddress || localStorage.getItem('fbs_address');
        window.showModal("modal_bind_title", `
            <div class="space-y-4 text-left">
                <div class="p-4 bg-blue-50 rounded-2xl">
                    <p class="text-[10px] font-bold text-blue-600 mb-1" data-i18n="copy_addr">您的当前地址</p>
                    <p class="text-[10px] font-mono text-slate-500 break-all">${displayAddress || 'Disconnected'}</p>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="placeholder_inviter_id">推荐人 ID (推荐码)</label>
                    <input type="text" id="input_inviter_id" placeholder="输入推荐人 ID" 
                           class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none focus:ring-2 focus:ring-blue-100 transition-all">
                </div>
                <button onclick="submitBindInviter()" class="action-btn w-full mt-2" data-i18n="btn_confirm">确认提交绑定</button>
            </div>
        `);
    };

    window.showModal = function(titleKey, html) {
        const titleEl = document.getElementById('modalTitle');
        const contentEl = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');
        if (titleEl && contentEl && overlay) {
            titleEl.setAttribute('data-i18n', titleKey);
            contentEl.innerHTML = html;
            overlay.classList.remove('hidden');
            if (typeof window.i18nRender === 'function') window.i18nRender();
        }
    };

    window.closeModal = function() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.add('hidden');
    };

    window.showLoading = function(show) {
        const loader = document.getElementById('loadingOverlay');
        if (loader) show ? loader.classList.remove('hidden') : loader.classList.add('hidden');
    };

    window.submitBindInviter = submitBindInviter;
}
