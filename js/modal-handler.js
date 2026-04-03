import { tokenInfo, CONTRACT_ADDRS } from './config.js';
import { submitBindInviter } from './api-service.js';

// 挂载弹窗核心函数
export function mountModalHandlers() {
    // 矿机/电费弹窗
    window.openMinerModal = function(type) {
        const nums = [1,5,10,15,20,25,50,100];
        if (type === 'buy') {
            window.showModal("购买矿机", `
                <div class="space-y-4">
                    <div class="grid grid-cols-4 gap-2">
                        ${nums.map(n => `<button onclick="setBuyNum(${n}, this)" class="buy-btn border border-slate-200 p-2 rounded-xl text-[10px] font-bold hover:bg-blue-50 transition-all">${n}台</button>`).join('')}
                    </div>
                    <div class="p-4 bg-blue-50 rounded-2xl flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-600">预计支付</span>
                        <span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span>
                    </div>
                    <button onclick="doChainPay('MINER')" class="action-btn w-full mt-2">确认支付</button>
                </div>`);
        } else {
            const days = [30,60,90,180,360];
            window.showModal("缴纳电费", `
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
                    <button onclick="doChainPay('ELECTRIC')" class="action-btn w-full mt-2">确认支付</button>
                </div>`);
            window.calcElec();
        }
    };

    // 资产相关弹窗
    window.openFinanceModal = function(type) {
        const options = Object.keys(tokenInfo).map(t => `<option value="${t}">${t}</option>`).join('');
        
        if (type === 'recharge') {
            window.showModal("充值资产", `
                <div class="space-y-4 text-left">
                    <select id="recToken" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                        ${Object.keys(CONTRACT_ADDRS).map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                    <input type="number" id="recAmount" placeholder="输入数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button onclick="doRecharge()" class="action-btn w-full mt-2">确认充值</button>
                </div>`);
        } else if (type === 'withdraw') {
            window.showModal("提币申请", `
                <div class="space-y-4 text-left">
                    <select id="witToken" onchange="updateMax()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none">
                        ${options}
                    </select>
                    <div class="text-[10px] font-bold text-blue-500 px-1">可用: <span id="maxWit">0.00</span></div>
                    <input type="number" id="witAmount" placeholder="0.00" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                    <button onclick="handleSignAction('WITHDRAW')" class="action-btn w-full mt-2 !from-red-500 !to-orange-500">签名提交</button>
                </div>`);
            window.updateMax();
        } else if (type === 'exchange') {
            window.showModal("资产兑换", `
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
                    <button onclick="handleSignAction('SWAP')" class="action-btn w-full mt-2">签名兑换</button>
                </div>`);
            window.calcSwap();
        } else if (type === 'transfer') {
            window.showModal("内部转账", `
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
                    <button onclick="doInternalTransfer()" class="action-btn w-full mt-4">确认转账</button>
                </div>`);
            window.updateTransUI();
        }
    };

    // 绑定推荐人弹窗
    window.openBindInviterModal = function() {
        const displayAddress = window.currentAddress || localStorage.getItem('fbs_address');
        window.showModal("绑定推荐关系", `
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
                <button onclick="submitBindInviter()" class="action-btn w-full mt-2">确认提交绑定</button>
            </div>
        `);
    };

    // 弹窗基础控制
    window.showModal = function(title, html) {
        const titleEl = document.getElementById('modalTitle');
        const contentEl = document.getElementById('modalContent');
        const overlay = document.getElementById('modalOverlay');
        if (titleEl && contentEl && overlay) {
            titleEl.innerText = title;
            contentEl.innerHTML = html;
            overlay.classList.remove('hidden');
            if (typeof window.i18nRender === 'function') window.i18nRender();
        }
    };

    window.closeModal = function() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.add('hidden');
    };

    // 复制邀请码
    window.copyInviteCode = function(text) {
        if (!text || text === '--') return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => alert("复制成功！"));
        }
    };

    // 加载动画
    window.showLoading = function(show) {
        const loader = document.getElementById('loadingOverlay');
        if (!loader) return;
        show ? loader.classList.remove('hidden') : loader.classList.add('hidden');
    };

    // 全局挂载
    window.submitBindInviter = submitBindInviter;
}
