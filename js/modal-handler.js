import { tokenInfo, CONTRACT_ADDRS } from './config.js';
import { submitBindInviter, postTransactionRecord } from './api-service.js';

/**
 * 挂载弹窗核心函数
 * 解决问题：防止点击刷新、对齐多语言Key、修复矿机转让与团队申请逻辑
 */
export function mountModalHandlers() {
    
    // --- 辅助：生成币种下拉选项 ---
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

    // --- 2. 矿机转让弹窗 (修复点：接收者地址 + 数量) ---
    window.openTransferMinerModal = function() {
        const max = document.getElementById('miner_count')?.innerText || "0";
        window.showModal("miner_transfer_title", `
            <div class="space-y-4 text-left">
                <p class="text-[10px] text-amber-500 font-bold px-1" data-i18n="sign_to_confirm">请在钱包中签名以确认身份</p>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="receiver_address">接收者钱包地址</label>
                    <input type="text" id="tmAddr" placeholder="0x..." class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none mt-1 outline-none focus:ring-2 focus:ring-blue-100">
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

    // --- 3. 申请团队数据弹窗 (修复点：提交邮箱) ---
    window.openTeamDetailModal = function() {
        window.showModal("modal_team_title", `
            <div class="space-y-4 text-left">
                <div class="p-4 bg-blue-50 rounded-2xl">
                    <p class="text-[11px] text-blue-600 font-medium" data-i18n="team_detail_desc">请提交您的邮箱账号，我们会将您的团队数据发送至您的邮箱</p>
                </div>
                <div>
                    <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="placeholder_email">请输入您的联系邮箱</label>
                    <input type="email" id="teamEmail" placeholder="example@mail.com" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none mt-1 outline-none focus:ring-2 focus:ring-blue-100">
                </div>
                <button type="button" onclick="doSubmitTeamEmail(event)" class="action-btn w-full mt-2" data-i18n="btn_submit_email">提交并申请</button>
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
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="receiver_address">接收者钱包地址</label>
                        <input type="text" id="transAddr" placeholder="0x..." class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none mt-1 outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="select_token">选择代币</label>
                        <select id="transToken" onchange="updateTransUI()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">${options}</select>
                    </div>
                    <input type="number" id="transAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-4 outline-none">
                    <button type="button" onclick="doInternalTransfer()" class="action-btn w-full mt-4" data-i18n="confirm_transfer">确认转账</button>
                </div>`);
            if(window.updateTransUI) window.updateTransUI();
        }
    };

    // --- 5. 执行逻辑 (彻底解决点击刷新) ---

    window.doTransferMinerAction = async function(e) {
        if(e) e.preventDefault(); // 拦截事件防止刷新
        const toAddr = document.getElementById('tmAddr')?.value.trim();
        const amount = document.getElementById('tmAmount')?.value;
        const sender = window.currentAddress || localStorage.getItem('fbs_address');

        if (!toAddr || !amount || amount <= 0) return alert("请检查地址和数量");

        window.showLoading(true);
        try {
            // 签名逻辑保持与提现一致
            const msg = `Transfer Miner: ${amount}\nTo: ${toAddr}\nTime: ${Date.now()}`;
            const sig = await window.ethereum.request({ method: 'personal_sign', params: [msg, sender] });
            
            const res = await postTransactionRecord("转让矿机", amount, "MINER", "miner_transfer", { 
                receiver: toAddr, 
                signature: sig 
            });
            
            if (res.success) {
                alert("申请已提交 (transfer_request_submitted)");
                window.closeModal();
            }
        } catch (err) {
            console.error("转让失败", err);
        } finally {
            window.showLoading(false);
        }
    };

    window.doSubmitTeamEmail = async function(e) {
        if(e) e.preventDefault(); // 拦截事件防止刷新
        const email = document.getElementById('teamEmail')?.value.trim();
        const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailReg.test(email)) return alert("请输入有效邮箱");

        window.showLoading(true);
        try {
            const res = await postTransactionRecord("申请团队数据", "0", "INFO", "request_team_data", { email: email });
            if (res.success) {
                alert("提交成功 (bind_success)");
                window.closeModal();
            }
        } finally {
            window.showLoading(false);
        }
    };

    // --- 6. 通用 UI 控制 ---
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

    window.submitBindInviter = submitBindInviter;
}
