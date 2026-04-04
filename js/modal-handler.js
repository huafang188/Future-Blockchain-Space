import { tokenInfo, CONTRACT_ADDRS } from './config.js';
import { submitBindInviter, postTransactionRecord } from './api-service.js';

/**
 * 挂载弹窗核心函数
 * 彻底修复：1. 局部语言渲染（不再清空全局数据） 2. 绑定推荐人逻辑 3. 防止表单刷新
 */
export function mountModalHandlers() {
    
    // --- 辅助：生成币种下拉选项 ---
    const options = Object.keys(tokenInfo)
        .map(t => `<option value="${t.toUpperCase()}">${t.toUpperCase()}</option>`)
        .join('');

    // --- 1. 注册/绑定推荐人弹窗 (核心修复) ---
    window.showRegisterModal = function() {
        window.showModal("modal_register_title", `
            <div class="space-y-4 text-left">
                <div class="p-4 bg-amber-50 rounded-2xl">
                    <p class="text-[11px] text-amber-600 font-medium" data-i18n="register_desc">检测到新用户，请输入推荐人ID以激活账户</p>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="input_inviter_id">推荐人 ID</label>
                    <input type="text" id="input_inviter_id" placeholder="888888" 
                           class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none focus:ring-2 focus:ring-amber-100">
                </div>
                <button type="button" onclick="window.doSubmitBindInviter(event)" class="action-btn w-full mt-2 !from-amber-500 !to-orange-500" data-i18n="btn_confirm_bind">确认绑定</button>
            </div>
        `);
    };

    window.doSubmitBindInviter = async function(e) {
        if(e) e.preventDefault();
        const inviterId = document.getElementById('input_inviter_id')?.value.trim();
        if (!inviterId) return alert("请输入推荐码");
        
        window.showLoading(true);
        try {
            // 调用 api-service.js 中的方法
            await submitBindInviter(); 
        } finally {
            window.showLoading(false);
        }
    };

    // --- 2. 矿机/电费弹窗 ---
    window.openMinerModal = function(type) {
        const nums = [1, 5, 10, 15, 20, 25, 50, 100];
        if (type === 'buy') {
            window.showModal("buy_miner", `
                <div class="space-y-4">
                    <div class="grid grid-cols-4 gap-2">
                        ${nums.map(n => `
                            <button type="button" onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-200 p-2 rounded-xl text-[10px] font-bold hover:bg-blue-50 transition-all">
                                ${n}<span data-i18n="m_count">台</span>
                            </button>`).join('')}
                    </div>
                    <div class="p-4 bg-blue-50 rounded-2xl flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-600" data-i18n="expected_pay">预计支付</span>
                        <span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span>
                    </div>
                    <button type="button" onclick="doChainPay('MINER')" class="action-btn w-full mt-2" data-i18n="confirm_pay">确认支付</button>
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
                    <button type="button" onclick="doChainPay('ELECTRIC')" class="action-btn w-full mt-2" data-i18n="confirm_pay">确认支付</button>
                </div>`);
            if(window.calcElec) window.calcElec();
        }
    };

    // --- 3. 矿机转让 ---
    window.openTransferMinerModal = function() {
        const max = document.getElementById('miner_count')?.innerText || "0";
        window.showModal("miner_transfer_title", `
            <div class="space-y-4 text-left">
                <p class="text-[10px] text-amber-500 font-bold px-1" data-i18n="sign_to_confirm">请在钱包中签名以确认身份</p>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="receiver_address">接收者钱包地址</label>
                    <input type="text" id="tmAddr" placeholder="0x..." class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none mt-1 outline-none">
                </div>
                <div>
                    <div class="flex justify-between px-1">
                        <label class="text-[10px] font-bold text-slate-400" data-i18n="miner_count">转让数量</label>
                        <span class="text-[10px] text-blue-500 font-bold">MAX: ${max}</span>
                    </div>
                    <input type="number" id="tmAmount" placeholder="0" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none">
                </div>
                <button type="button" onclick="window.doTransferMinerAction(event)" class="action-btn w-full mt-4" data-i18n="btn_transfer_now">立即转让矿机</button>
            </div>
        `);
    };

    // --- 4. 资产金融弹窗 ---
    window.openFinanceModal = function(type) {
        if (type === 'recharge') {
            window.showModal("recharge", `
                <div class="space-y-4 text-left">
                    <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                        ${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t.toUpperCase()}">${t.toUpperCase()}</option>`).join('')}
                    </select>
                    <input type="number" id="recAmount" data-i18n="input_amount" placeholder="输入数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button type="button" onclick="doRecharge()" class="action-btn w-full mt-2" data-i18n="recharge">确认充值</button>
                </div>`);
        } else if (type === 'withdraw') {
            window.showModal("withdraw", `
                <div class="space-y-4 text-left">
                    <select id="witToken" onchange="updateMax()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">${options}</select>
                    <div class="text-[10px] font-bold text-blue-500 px-1"><span data-i18n="available_balance">可用</span>: <span id="maxWit">0.00</span></div>
                    <input type="number" id="witAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button type="button" onclick="handleSignAction('WITHDRAW')" class="action-btn w-full mt-2 !from-red-500 !to-orange-500" data-i18n="withdraw">签名提现</button>
                </div>`);
            if(window.updateMax) window.updateMax();
        } else if (type === 'exchange') {
            window.showModal("exchange", `
                <div class="space-y-3">
                    <div class="p-4 bg-slate-50 rounded-2xl text-left">
                        <div class="flex justify-between text-[10px] font-bold text-slate-400">
                            <span data-i18n="balance">余额</span><span id="maxSwap">0</span>
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
                    <button type="button" onclick="handleSignAction('SWAP')" class="action-btn w-full mt-2" data-i18n="exchange">签名兑换</button>
                </div>`);
            if(window.calcSwap) window.calcSwap();
        } else if (type === 'transfer') {
            window.showModal("internal_transfer", `
                <div class="space-y-4 text-left">
                    <input type="text" id="transAddr" placeholder="接收者地址" class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none outline-none">
                    <select id="transToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">${options}</select>
                    <input type="number" id="transAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button type="button" onclick="doInternalTransfer()" class="action-btn w-full mt-4" data-i18n="confirm_transfer">确认转账</button>
                </div>`);
        }
    };

    // --- 5. 通用 UI 控制 (修复数据消失的关键) ---
    window.showModal = function(titleKey, html) {
        const titleEl = document.getElementById('modalTitle');
        const contentEl = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');
        
        if (titleEl && contentEl && overlay) {
            titleEl.setAttribute('data-i18n', titleKey);
            contentEl.innerHTML = html;
            overlay.classList.remove('hidden');

            // --- 核心修复：局部翻译 ---
            // 不要直接调用 window.i18nRender()，那会导致全身重绘
            if (typeof window.i18nRender === 'function') {
                // 仅翻译弹窗内的 [data-i18n] 元素
                const modalItems = overlay.querySelectorAll('[data-i18n]');
                modalItems.forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    // 假设你的翻译数据存在 window.langData 中
                    const translation = window.allLangs ? window.allLangs[localStorage.getItem('language') || 'en'][key] : null;
                    if (translation) {
                        if (el.tagName === 'INPUT') el.placeholder = translation;
                        else el.innerText = translation;
                    }
                });
            }
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

    // 将方法显式挂载到 window 供 onclick 调用
    window.doTransferMinerAction = async function(e) {
        if(e) e.preventDefault();
        const toAddr = document.getElementById('tmAddr')?.value.trim();
        const amount = document.getElementById('tmAmount')?.value;
        const sender = window.currentAddress || localStorage.getItem('fbs_address');
        if (!toAddr || !amount || amount <= 0) return alert("Check Input");
        window.showLoading(true);
        try {
            const msg = `Transfer: ${amount} to ${toAddr}`;
            const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, sender] });
            const res = await postTransactionRecord("转让矿机", amount, "MINER", "transfer", { receiver: toAddr, signature: sig });
            if (res.success) { alert("Success"); window.closeModal(); }
        } finally { window.showLoading(false); }
    };
}
