import { tokenConfig, CONTRACT_ADDRS } from './config.js';

/**
 * 🛠️ 弹窗模块：负责生成动态 HTML 并展示
 */
export function mountModalHandlers() {

    // --- 0. 辅助功能：获取带 Logo 的币种选项 ---
    const getLogoOptions = (selectedSymbol) => {
        return Object.keys(tokenConfig)
            .map(symbol => `<option value="${symbol}" ${symbol === selectedSymbol ? 'selected' : ''}>${symbol}</option>`)
            .join('');
    };

    // --- 0. 辅助功能：更新弹窗内的代币图片 ---
    window.updateModalLogo = function(selectId, imgId) {
        const symbol = document.getElementById(selectId)?.value;
        const imgEl = document.getElementById(imgId);
        if (symbol && imgEl && tokenConfig[symbol]) {
            imgEl.src = tokenConfig[symbol].logo;
        }
        // 如果是兑换弹窗，切换币种时也触发汇率计算
        if (selectId.startsWith('s')) {
            if (window.calcSwap) window.calcSwap();
        }
    };

    // --- 1. 矿机相关弹窗 (购买/缴费) ---
    window.openMinerModal = function(type) {
        if (type === 'buy') {
            const nums = [1, 5, 10, 20, 50, 100];
            window.showModal("buy_miner", `
                <div class="space-y-4">
                    <div class="grid grid-cols-3 gap-2">
                        ${nums.map(n => `
                            <button type="button" onclick="window.setBuyNum(${n}, this)" class="buy-btn border border-slate-200 p-3 rounded-2xl text-[11px] font-bold transition-all">
                                ${n}<span data-i18n="m_count">台</span>
                            </button>`).join('')}
                    </div>
                    <div class="p-5 bg-blue-50 rounded-[2rem] flex justify-between items-center border border-blue-100">
                        <span class="text-xs font-bold text-blue-600" data-i18n="expected_pay">预计支付</span>
                        <span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span>
                    </div>
                    <button type="button" onclick="window.doChainPay('MINER')" class="action-btn w-full mt-2" data-i18n="confirm_pay">确认支付 (BSC)</button>
                </div>`);
        } else {
            // 缴纳电费
            window.showModal("pay_fee", `
                <div class="space-y-4 text-left">
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 ml-1">矿机台数</label>
                        <input type="number" id="elecNum" oninput="window.calcElec()" placeholder="输入矿机数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-400 ml-1">续费周期</label>
                        <select id="elecDays" onchange="window.calcElec()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none">
                            <option value="30">30 天 (1个月)</option>
                            <option value="60">60 天 (2个月)</option>
                            <option value="90">90 天 (3个月)</option>
                            <option value="180">180 天 (半年)</option>
                            <option value="360">360 天 (一年)</option>
                        </select>
                    </div>
                    <div class="p-5 bg-slate-900 rounded-[2rem] flex justify-between items-center shadow-lg">
                        <span class="text-slate-400 text-xs font-bold" data-i18n="elec_cost">所需电费</span>
                        <span id="elecCost" class="text-yellow-500 font-black text-lg">0.00 USDT</span>
                    </div>
                    <button type="button" onclick="window.doChainPay('ELECTRIC')" class="action-btn w-full mt-2" data-i18n="confirm_pay">确认支付 (BSC)</button>
                </div>`);
        }
    };

    // --- 2. 矿机转让弹窗 ---
    window.openTransferMinerModal = function() {
        const max = document.getElementById('miner_count')?.innerText || "0";
        window.showModal("miner_transfer_title", `
            <div class="space-y-4 text-left">
                <input type="text" id="minerT_Addr" placeholder="接收者钱包地址" class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-[10px] border-none outline-none">
                <input type="number" id="minerT_Amount" placeholder="转让数量 (MAX: ${max})" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button type="button" onclick="window.doMinerTransfer()" class="action-btn w-full mt-4" data-i18n="btn_transfer_now">立即提交签名</button>
            </div>
        `);
    };

    // --- 3. 充值弹窗 ---
    window.openRechargeModal = function() {
        window.showModal("recharge", `
            <div class="space-y-4 text-left">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 ml-1">选择充值币种</label>
                    <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none">
                        <option value="USDT">USDT (BSC-BEP20)</option>
                        <option value="BNB">BNB (Native)</option>
                        <option value="ETH">ETH (Pegged)</option>
                        <option value="BTC">BTC (Pegged)</option>
                    </select>
                </div>
                <input type="number" id="recAmount" placeholder="输入充值数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button type="button" onclick="window.doRecharge()" class="action-btn w-full mt-2" data-i18n="recharge">确认支付</button>
            </div>`);
    };

    // --- 4. 提现弹窗 (带 Logo) ---
    window.openWithdrawModal = function() {
        window.showModal("withdraw", `
            <div class="space-y-4 text-left">
                <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:border-blue-100 transition-all">
                    <img id="witLogo" src="${tokenConfig['NEO'].logo}" class="w-8 h-8 object-contain">
                    <select id="witToken" onchange="window.updateModalLogo('witToken','witLogo')" class="bg-transparent font-black text-sm outline-none flex-1">
                        ${getLogoOptions('NEO')}
                    </select>
                </div>
                <input type="number" id="witAmount" placeholder="输入提现数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button type="button" onclick="window.doWithdrawSignature()" class="action-btn w-full mt-2 !from-red-500 !to-pink-500" data-i18n="withdraw">确认提现签名</button>
            </div>`);
    };

    // --- 5. 兑换弹窗 (带 Logo 和 实时汇率) ---
    window.openExchangeModal = function() {
        window.showModal("exchange", `
            <div class="space-y-3">
                <div class="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div class="flex justify-between mb-2">
                        <span class="text-[10px] font-black text-slate-400 uppercase">From (兑出)</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <img id="swapFromLogo" src="${tokenConfig['USDT'].logo}" class="w-8 h-8 object-contain">
                        <input type="number" id="sFromAmt" oninput="window.calcSwap()" placeholder="0.0" class="flex-1 bg-transparent font-black text-xl outline-none">
                        <select id="sFromToken" onchange="window.updateModalLogo('sFromToken','swapFromLogo')" class="font-bold bg-white px-2 py-1 rounded-lg border border-slate-100">
                            ${getLogoOptions('USDT')}
                        </select>
                    </div>
                </div>
                <div class="flex justify-center -my-4 relative z-10">
                    <div class="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-slate-50 text-indigo-500">
                        <i class="fa-solid fa-arrow-down"></i>
                    </div>
                </div>
                <div class="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div class="flex justify-between mb-2">
                        <span class="text-[10px] font-black text-slate-400 uppercase">To (兑入)</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <img id="swapToLogo" src="${tokenConfig['NEO'].logo}" class="w-8 h-8 object-contain">
                        <input type="number" id="sToAmt" readonly placeholder="0.00" class="flex-1 bg-transparent font-black text-xl text-indigo-600 outline-none">
                        <select id="sToToken" onchange="window.updateModalLogo('sToToken','swapToLogo')" class="font-bold bg-white px-2 py-1 rounded-lg border border-slate-100">
                            ${getLogoOptions('NEO')}
                        </select>
                    </div>
                </div>
                <button type="button" onclick="window.doExchangeSignature()" class="action-btn w-full mt-4" data-i18n="exchange">确认兑换签名</button>
            </div>`);
    };

    // --- 6. 绑定推荐人弹窗 ---
    window.openBindInviterModal = function() {
        window.showModal("modal_register_title", `
            <div class="space-y-4 text-left">
                <div class="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p class="text-[11px] text-amber-600 font-medium" data-i18n="register_desc">请输入推荐人 ID 以激活您的挖矿账户</p>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 ml-1">推荐人 ID / 邀请码</label>
                    <input type="text" id="input_inviter_id" placeholder="例如: 888888" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none focus:ring-2 focus:ring-amber-200">
                </div>
                <button type="button" onclick="window.doSubmitBindInviter()" class="action-btn w-full mt-2 !from-amber-500 !to-orange-500" data-i18n="btn_confirm_bind">立即绑定签名</button>
            </div>
        `);
    };

    // --- 7. 申请团队弹窗 ---
    window.openTeamDetailModal = function() {
        window.showModal("modal_team_title", `
            <div class="space-y-4 text-left">
                <div class="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p class="text-[11px] text-indigo-600 font-medium" data-i18n="team_detail_desc">团队详细报表（Excel）将发送至您的邮箱</p>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 ml-1">联系邮箱地址</label>
                    <input type="email" id="team_email" placeholder="example@mail.com" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-100">
                </div>
                <button type="button" onclick="window.doTeamEmailSubmit()" class="action-btn w-full mt-2" data-i18n="btn_submit_email">提交签名申请</button>
            </div>
        `);
    };

    // --- 8. 内部转账弹窗 ---
    window.openInternalTransferModal = function() {
        window.showModal("internal_transfer", `
            <div class="space-y-4 text-left">
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 ml-1">接收者钱包地址</label>
                    <input type="text" id="transAddr" placeholder="0x..." class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-[10px] outline-none">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 ml-1">转账资产</label>
                    <select id="transToken" class="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none">
                        ${getLogoOptions('USDT')}
                    </select>
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 ml-1">数量</label>
                    <input type="number" id="transAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none">
                </div>
                <button type="button" onclick="window.doInternalTransfer()" class="action-btn w-full mt-4" data-i18n="confirm_transfer">确认内部转账签名</button>
            </div>`);
    };

    // --- 全局弹窗基础逻辑 (已集成多语言) ---
    window.showModal = function(titleKey, html) {
        const titleEl = document.getElementById('modalTitle');
        const contentEl = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');
        
        if (titleEl && contentEl && overlay) {
            titleEl.setAttribute('data-i18n', titleKey);
            contentEl.innerHTML = html;
            overlay.classList.remove('hidden');
            overlay.classList.add('flex'); // 确保居中显示
            
            // 触发局部多语言渲染
            if (window.i18nRender) {
                const currentLang = localStorage.getItem('fbs_lang') || 'en';
                // 这里调用 i18nRender 可以重新扫描 DOM
                window.i18nRender(currentLang);
            }
        }
    };

    window.closeModal = () => {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
    };
}
