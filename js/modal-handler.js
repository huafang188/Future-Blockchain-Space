import { tokenInfo, CONTRACT_ADDRS } from './config.js';
import { submitBindInviter, postTransactionRecord } from './api-service.js';

export function mountModalHandlers() {
    
    // --- 0. 辅助功能：生成币种下拉菜单 ---
    const getOptions = () => Object.keys(tokenInfo)
        .map(t => `<option value="${t.toUpperCase()}">${t.toUpperCase()}</option>`)
        .join('');

    // --- 1. 修复：绑定推荐人 (对应 HTML: openBindInviterModal) ---
    window.openBindInviterModal = function() {
        window.showModal("modal_register_title", `
            <div class="space-y-4 text-left">
                <div class="p-4 bg-amber-50 rounded-2xl"><p class="text-[11px] text-amber-600 font-medium" data-i18n="register_desc">请输入推荐人 ID 以绑定关系</p></div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="input_inviter_id">推荐人 ID</label>
                    <input type="text" id="input_inviter_id" placeholder="888888" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none focus:ring-2 focus:ring-amber-100">
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
        try { await submitBindInviter(); } catch (err) { console.error(err); } finally { window.showLoading(false); }
    };

    // --- 2. 修复：申请团队数据 (对应 HTML: openTeamDetailModal) ---
    window.openTeamDetailModal = function() {
        window.showModal("modal_team_title", `
            <div class="space-y-4 text-left">
                <div class="p-4 bg-blue-50 rounded-2xl"><p class="text-[11px] text-blue-600 font-medium" data-i18n="team_detail_desc">团队数据将发送至您的邮箱</p></div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="placeholder_email">联系邮箱</label>
                    <input type="email" id="teamEmail" placeholder="example@mail.com" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none mt-1 outline-none">
                </div>
                <button type="button" onclick="window.doSubmitTeamEmail(event)" class="action-btn w-full mt-2" data-i18n="btn_submit_email">提交申请</button>
            </div>
        `);
    };

    window.doSubmitTeamEmail = async function(e) {
        if(e) e.preventDefault();
        const email = document.getElementById('teamEmail')?.value.trim();
        if (!email || !email.includes('@')) return alert("请输入有效邮箱");
        window.showLoading(true);
        try {
            const res = await postTransactionRecord("申请团队数据", "0", "INFO", "request_team_data", { email: email });
            if (res.success) { alert("提交成功"); window.closeModal(); }
        } finally { window.showLoading(false); }
    };

    // --- 3. 修复：复制功能 (对应 HTML: copyInviteCode) ---
    window.copyInviteCode = function(text) {
        if (!text || text === '---') return alert("暂无数据");
        navigator.clipboard.writeText(text).then(() => alert("✅ 已复制: " + text))
            .catch(() => {
                const input = document.createElement('input');
                input.value = text; document.body.appendChild(input);
                input.select(); document.execCommand('copy');
                document.body.removeChild(input);
                alert("✅ 已复制");
            });
    };

    // --- 4. 矿机相关 (购买/电费/转让) ---
    window.openMinerModal = function(type) {
        const nums = [1, 5, 10, 15, 20, 25, 50, 100];
        if (type === 'buy') {
            window.showModal("buy_miner", `
                <div class="space-y-4">
                    <div class="grid grid-cols-4 gap-2">
                        ${nums.map(n => `<button type="button" onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-200 p-2 rounded-xl text-[10px] font-bold">${n}<span data-i18n="m_count">台</span></button>`).join('')}
                    </div>
                    <div class="p-4 bg-blue-50 rounded-2xl flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-600" data-i18n="expected_pay">预计支付</span>
                        <span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span>
                    </div>
                    <button type="button" onclick="doChainPay('MINER')" class="action-btn w-full mt-2" data-i18n="confirm_pay">确认支付</button>
                </div>`);
        } else {
            window.showModal("pay_fee", `
                <div class="space-y-4 text-left">
                    <select id="elecNum" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl">${nums.map(n => `<option value="${n}">${n} 台</option>`).join('')}</select>
                    <select id="elecDays" onchange="calcElec()" class="w-full p-3 bg-slate-50 rounded-xl"><option value="30">30天</option><option value="90">90天</option></select>
                    <div class="p-4 bg-slate-900 rounded-2xl flex justify-between"><span class="text-slate-400">所需电费</span><span id="elecCost" class="text-yellow-500 font-black">0.00 USDT</span></div>
                    <button type="button" onclick="doChainPay('ELECTRIC')" class="action-btn w-full mt-2" data-i18n="confirm_pay">确认支付</button>
                </div>`);
        }
    };

    window.openTransferMinerModal = function() {
        const max = document.getElementById('miner_count')?.innerText || "0";
        window.showModal("miner_transfer_title", `
            <div class="space-y-4 text-left">
                <input type="text" id="tmAddr" placeholder="接收地址" class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none outline-none">
                <input type="number" id="tmAmount" placeholder="数量 (MAX: ${max})" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button type="button" onclick="window.doTransferMinerAction(event)" class="action-btn w-full mt-4" data-i18n="btn_transfer_now">立即转让</button>
            </div>
        `);
    };

    window.doTransferMinerAction = async function(e) {
        if(e) e.preventDefault();
        const toAddr = document.getElementById('tmAddr')?.value.trim();
        const amount = document.getElementById('tmAmount')?.value;
        if (!toAddr || !amount) return alert("请填写完整");
        window.showLoading(true);
        try {
            const res = await postTransactionRecord("转让矿机", amount, "MINER", "transfer", { receiver: toAddr });
            if (res.success) { window.closeModal(); if(window.fetchUserData) window.fetchUserData(window.currentAddress); }
        } finally { window.showLoading(false); }
    };

    // --- 5. 金融相关 (充值/提现/兑换/内转) ---
    window.openFinanceModal = function(type) {
        const opt = getOptions();
        if (type === 'recharge') {
            window.showModal("recharge", `
                <div class="space-y-4 text-left">
                    <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold">${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t}">${t}</option>`).join('')}</select>
                    <input type="number" id="recAmount" placeholder="输入数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button type="button" onclick="doRecharge()" class="action-btn w-full mt-2" data-i18n="recharge">确认充值</button>
                </div>`);
        } else if (type === 'withdraw') {
            window.showModal("withdraw", `
                <div class="space-y-4 text-left">
                    <select id="witToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold">${opt}</select>
                    <input type="number" id="witAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button type="button" onclick="handleSignAction('WITHDRAW')" class="action-btn w-full mt-2 !from-red-500" data-i18n="withdraw">签名提现</button>
                </div>`);
        } else if (type === 'exchange') {
            window.showModal("exchange", `
                <div class="space-y-3">
                    <div class="p-4 bg-slate-50 rounded-2xl"><input type="number" id="sFromAmt" oninput="window.calcSwap()" placeholder="0.0" class="w-full bg-transparent font-black text-xl outline-none"><select id="sFromToken" onchange="window.calcSwap()">${opt}</select></div>
                    <div class="text-center">⇅</div>
                    <div class="p-4 bg-slate-50 rounded-2xl"><input type="number" id="sToAmt" readonly class="w-full bg-transparent font-black text-xl text-indigo-600 outline-none"><select id="sToToken" onchange="window.calcSwap()">${opt}</select></div>
                    <button type="button" onclick="handleSignAction('SWAP')" class="action-btn w-full mt-2" data-i18n="exchange">签名兑换</button>
                </div>`);
        } else if (type === 'transfer') {
            window.showModal("internal_transfer", `
                <div class="space-y-4 text-left">
                    <input type="text" id="transAddr" placeholder="接收者地址" class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none outline-none">
                    <select id="transToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold">${opt}</select>
                    <input type="number" id="transAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button type="button" onclick="doInternalTransfer()" class="action-btn w-full mt-4" data-i18n="confirm_transfer">确认转账</button>
                </div>`);
        }
    };

    // --- 6. 核心 UI 控制：防止数据消失 ---
    window.showModal = function(titleKey, html) {
        const titleEl = document.getElementById('modalTitle');
        const contentEl = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');
        if (titleEl && contentEl && overlay) {
            titleEl.setAttribute('data-i18n', titleKey);
            contentEl.innerHTML = html;
            overlay.classList.remove('hidden');
            // 局部多语言渲染
            if (window.allLangs) {
                const lang = localStorage.getItem('language') || 'en';
                overlay.querySelectorAll('[data-i18n]').forEach(el => {
                    const val = window.allLangs[lang][el.getAttribute('data-i18n')];
                    if (val) {
                        if (el.tagName === 'INPUT') el.placeholder = val;
                        else el.innerText = val;
                    }
                });
            }
        }
    };

    window.closeModal = () => document.getElementById('modalOverlay')?.classList.add('hidden');
    window.showLoading = (s) => s ? document.getElementById('loadingOverlay')?.classList.remove('hidden') : document.getElementById('loadingOverlay')?.classList.add('hidden');
}
