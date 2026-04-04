import { tokenInfo, CONTRACT_ADDRS } from './config.js';
import { submitBindInviter, postTransactionRecord } from './api-service.js';

export function mountModalHandlers() {
    
    // --- 1. 统一生成大写的币种选项 ---
    const options = Object.keys(tokenInfo)
        .map(t => `<option value="${t.toUpperCase()}">${t.toUpperCase()}</option>`)
        .join('');

    // --- 2. 矿机相关弹窗 ---
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

    // --- 3. 矿机转让 (修复 receiver_address / miner_count) ---
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
                <button type="button" onclick="doTransferMinerAction(event)" class="action-btn w-full mt-4" data-i18n="btn_transfer_now">立即转让矿机</button>
            </div>
        `);
    };

    // --- 4. 申请团队数据 (修复邮箱提交逻辑) ---
    window.openTeamDetailModal = function() {
        window.showModal("modal_team_title", `
            <div class="space-y-4 text-left">
                <div class="p-4 bg-blue-50 rounded-2xl">
                    <p class="text-[11px] text-blue-600 font-medium" data-i18n="team_detail_desc">请提交邮箱，我们会将数据发送至您的邮箱</p>
                </div>
                <input type="email" id="teamEmail" placeholder="example@mail.com" data-i18n="placeholder_email"
                       class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                <button type="button" onclick="doSubmitTeamEmail(event)" class="action-btn w-full mt-2" data-i18n="btn_submit_email">提交并申请</button>
            </div>
        `);
    };

    // --- 5. 核心动作执行 (添加 event.preventDefault 防止数据消失) ---
    
    window.doTransferMinerAction = async function(e) {
        if(e) e.preventDefault(); // 关键：阻止按钮刷新页面
        const toAddr = document.getElementById('tmAddr')?.value.trim();
        const amount = document.getElementById('tmAmount')?.value;
        const sender = window.currentAddress || localStorage.getItem('fbs_address');

        if (!toAddr || !amount || parseInt(amount) <= 0) return alert("信息不完整");

        window.showLoading(true);
        try {
            // 内部转让逻辑
            const res = await postTransactionRecord("矿机转让", amount, "MINER", "miner_transfer", { receiver: toAddr });
            if (res.success) {
                alert("转让申请已提交");
                window.closeModal();
            }
        } catch (err) {
            console.error(err);
        } finally {
            window.showLoading(false);
        }
    };

    window.doSubmitTeamEmail = async function(e) {
        if(e) e.preventDefault(); // 关键：阻止按钮刷新页面
        const email = document.getElementById('teamEmail')?.value.trim();
        if (!email.includes('@')) return alert("格式错误");

        window.showLoading(true);
        try {
            const res = await postTransactionRecord("申请团队数据", "0", "INFO", "request_team", { email: email });
            if (res.success) {
                alert("提交成功，请查收邮件");
                window.closeModal();
            }
        } finally {
            window.showLoading(false);
        }
    };

    // --- 6. 提现/兑换/充值逻辑 ---
    window.openFinanceModal = function(type) {
        if (type === 'withdraw') {
            window.showModal("withdraw", `
                <div class="space-y-4 text-left">
                    <select id="witToken" onchange="updateMax()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">${options}</select>
                    <div class="text-[10px] font-bold text-blue-500 px-1"><span data-i18n="available_balance">可用</span>: <span id="maxWit">0.00</span></div>
                    <input type="number" id="witAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button type="button" onclick="handleSignAction('WITHDRAW')" class="action-btn w-full mt-2 !from-red-500 !to-orange-500" data-i18n="withdraw">签名提现</button>
                </div>`);
            window.updateMax();
        }
        // ... 其他 finance 弹窗 (确保 button 都有 type="button")
    };

    // --- 通用弹窗方法 (确保渲染 i18n) ---
    window.showModal = function(titleKey, html) {
        const titleEl = document.getElementById('modalTitle');
        const contentEl = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');
        if (titleEl && contentEl && overlay) {
            titleEl.setAttribute('data-i18n', titleKey);
            contentEl.innerHTML = html;
            overlay.classList.remove('hidden');
            if (window.i18nRender) window.i18nRender();
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
}
