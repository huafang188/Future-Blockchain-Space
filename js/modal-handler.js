import { tokenInfo, CONTRACT_ADDRS } from './config.js';
import { submitBindInviter } from './api-service.js';

/**
 * 挂载弹窗核心函数
 * 所有的中文死文字已替换为 window.i18nData 中的 Key
 */
export function mountModalHandlers() {
    
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
        const options = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
        
        if (type === 'recharge') {
            window.showModal("recharge", `
                <div class="space-y-4 text-left">
                    <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                        ${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t}">${t}</option>`).join('')}
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
                    <button onclick="handleSignAction('SWAP')" class="action-btn w-full mt-2" data-i18n="exchange">签名兑换</button>
                </div>`);
            window.calcSwap();
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

    // --- 3. 绑定推荐人弹窗 ---
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
                    <input type="text" id="input_inviter_id" data-i18n="placeholder_inviter_id" placeholder="输入推荐人 ID" 
                           class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none focus:ring-2 focus:ring-blue-100 transition-all">
                </div>
                <button onclick="submitBindInviter()" class="action-btn w-full mt-2" data-i18n="btn_confirm">确认提交绑定</button>
            </div>
        `);
    };

    // 在 mountModalHandlers 函数内部添加

// --- 4. 转让矿机弹窗 ---
window.openTransferMinerModal = function() {
    window.showModal("miner_transfer_title", `
        <div class="space-y-4 text-left">
            <div>
                <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="receiver_address">接收者钱包地址</label>
                <input type="text" id="minerT_Addr" placeholder="0x..." 
                       class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-xs border-none mt-1 outline-none">
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="miner_count">转让数量</label>
                <input type="number" id="minerT_Amount" step="1" placeholder="1" 
                       class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none mt-1 outline-none">
            </div>
            <p class="text-[9px] text-orange-500 font-bold px-1" data-i18n="sign_to_confirm">请在钱包中签名以确认身份</p>
            <button onclick="doMinerTransfer()" class="action-btn w-full mt-2" data-i18n="btn_transfer_now">立即转让矿机</button>
        </div>
    `);
};

// --- 5. 团队详情/激活邮箱弹窗 ---
window.openTeamDetailModal = function() {
    window.showModal("modal_team_title", `
        <div class="space-y-4 text-left">
            <div class="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p class="text-xs text-indigo-700 leading-relaxed" data-i18n="team_detail_desc">绑定邮箱后即可解锁团队详细报表与实时通知功能。</p>
            </div>
            <div>
                <label class="text-[10px] font-bold text-slate-400 ml-1" data-i18n="placeholder_email">电子邮箱</label>
                <input type="email" id="team_email" placeholder="example@mail.com" 
                       class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none mt-1 outline-none">
            </div>
            <button onclick="doTeamEmailSubmit()" class="action-btn w-full mt-2 !from-indigo-600 !to-blue-600" data-i18n="btn_submit_email">提交并激活</button>
        </div>
    `);
};

    
    // --- 4. 弹窗基础控制 (核心修改) ---
    window.showModal = function(titleKey, html) {
        const titleEl = document.getElementById('modalTitle');
        const contentEl = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');
        
        if (titleEl && contentEl && overlay) {
            // 设置标题的 i18n key 并初始赋值（防止闪烁）
            titleEl.setAttribute('data-i18n', titleKey);
            
            // 写入 HTML
            contentEl.innerHTML = html;
            
            // 显示弹窗
            overlay.classList.remove('hidden');
            
            // 立即触发全局翻译函数渲染新插入的内容
            if (typeof window.i18nRender === 'function') {
                window.i18nRender();
            }
        }
    };

    window.closeModal = function() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.add('hidden');
    };

    // --- 5. 辅助功能 ---
    window.copyInviteCode = function(text) {
        if (!text || text === '--') return;
        const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
        const msg = window.i18nData[lang].copy_success;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => alert(msg));
        }
    };

    window.showLoading = function(show) {
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            show ? loader.classList.remove('hidden') : loader.classList.add('hidden');
        }
    };

    // 全局挂载 API 动作
    window.submitBindInviter = submitBindInviter;
}
