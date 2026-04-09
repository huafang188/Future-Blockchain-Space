import { tokenConfig, CONTRACT_ADDRS } from './config.js';

/**
 * 🛠️ 弹窗模块：管理所有动态 UI 交互
 */
export function mountModalHandlers() {

    // --- 0. 辅助功能：获取带 Logo 的币种选项 ---
    const getLogoOptions = (selectedSymbol) => {
        return Object.keys(tokenConfig)
            .map(symbol => `<option value="${symbol}" ${symbol === selectedSymbol ? 'selected' : ''}>${symbol}</option>`)
            .join('');
    };

    // --- 1. 复制功能 (兼容移动端钱包) ---
    window.copyInviteCode = function(text) {
        if (!text || text === '---') {
            alert("暂无数据可复制");
            return;
        }
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert("✅ 已复制: " + text);
        } catch (err) {
            alert("复制失败，请长按手动复制");
        }
        document.body.removeChild(textArea);
    };

    // --- 2. 更新弹窗内的 Logo ---
    window.updateModalLogo = function(selectId, imgId) {
        const symbol = document.getElementById(selectId)?.value;
        const imgEl = document.getElementById(imgId);
        if (symbol && imgEl && tokenConfig[symbol]) {
            imgEl.src = tokenConfig[symbol].logo;
        }
        // 如果是兑换弹窗，联动计算
        if (selectId.startsWith('s') && window.calcSwap) {
            window.calcSwap();
        }
    };

    // --- 3. 矿机模块 (购买/电费) ---
    window.openMinerModal = function(type) {
        if (type === 'buy') {
            const nums = [1, 5, 10, 20, 50, 100];
            window.showModal("buy_miner", `
                <div class="space-y-4">
                    <div class="grid grid-cols-3 gap-2">
                        ${nums.map(n => `
                            <button type="button" onclick="window.setBuyNum(${n}, this)" class="buy-btn border border-slate-200 p-3 rounded-2xl text-[11px] font-bold">
                                ${n}台
                            </button>`).join('')}
                    </div>
                    <div class="p-5 bg-blue-50 rounded-[2rem] flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-600" data-i18n="expected_pay">预计支付</span>
                        <span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span>
                    </div>
                    <button type="button" onclick="window.doChainPay('MINER')" class="action-btn w-full mt-2">确认支付 (BSC)</button>
                </div>`);
        } else {
            window.showModal("pay_fee", `
                <div class="space-y-4 text-left">
                    <input type="number" id="elecNum" oninput="window.calcElec()" placeholder="矿机数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none">
                    <select id="elecDays" onchange="window.calcElec()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none">
                        <option value="30">30 天</option>
                        <option value="90">90 天</option>
                        <option value="180">180 天</option>
                        <option value="360">360 天</option>
                    </select>
                    <div class="p-5 bg-slate-900 rounded-[2rem] flex justify-between items-center">
                        <span class="text-slate-400 text-xs font-bold" data-i18n="elec_cost">所需电费</span>
                        <span id="elecCost" class="text-yellow-500 font-black text-lg">0.00 USDT</span>
                    </div>
                    <button type="button" onclick="window.doChainPay('ELECTRIC')" class="action-btn w-full mt-2">确认支付 (BSC)</button>
                </div>`);
        }
    };

    // --- 4. 矿机转让 ---
    window.openTransferMinerModal = function() {
        const max = document.getElementById('miner_count')?.innerText || "0";
        window.showModal("miner_transfer_title", `
            <div class="space-y-4 text-left">
                <input type="text" id="minerT_Addr" placeholder="接收者地址 (0x...)" data-i18n-placeholder="receiver_address_placeholder" class="w-full p-4 bg-slate-50 rounded-2xl font-mono text-[11px] border-none outline-none">
                <input type="number" id="minerT_Amount" placeholder="数量 (最多 ${max})" data-i18n-placeholder="amount_max_placeholder" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button type="button" onclick="window.doMinerTransfer()" class="action-btn w-full mt-2">提交转让签名</button>
            </div>
        `);
    };

    // --- 5. 金融模块 (充值/提现/兑换/内转) ---
window.openRechargeModal = function() {
        window.showModal("recharge", `
            <div class="space-y-4">
                <!-- 1. 选择充值资产区块 (上方) -->
                <div class="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 text-left">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-3 ml-1" data-i18n="select_recharge_asset">选择充值资产</p>
                    <div class="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <!-- 这里的 recLogo 会随着下拉框选择而自动切换 -->
                        <img id="recLogo" src="${tokenConfig['USDT'].logo}" class="w-8 h-8 object-contain shrink-0">
                        <select id="recToken" onchange="window.updateModalLogo('recToken','recLogo')" 
                                class="flex-1 bg-transparent font-black text-base outline-none border-none cursor-pointer appearance-none">
                            <option value="USDT">USDT (BSC)</option>
                            <option value="BNB">BNB (Native)</option>
                            <option value="ETH">ETH (BSC-Wrapped)</option>
                            <option value="BTC">BTC (BSC-Wrapped)</option>
                        </select>
                        <i class="fa-solid fa-chevron-down text-[10px] text-slate-300"></i>
                    </div>
                </div>

                <!-- 2. 数量输入区块 (下方) -->
                <div class="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 text-left">
                    <div class="flex justify-between items-center mb-2 ml-1">
                        <p class="text-[10px] font-bold text-slate-400 uppercase" data-i18n="recharge_amount">充值数量</p>
                    </div>
                    <input type="number" id="recAmount" placeholder="0.00" 
                           class="w-full bg-transparent font-black text-2xl outline-none border-none p-0 text-slate-800">
                </div>

                <button type="button" onclick="window.doRecharge()" class="action-btn w-full mt-2">确认前往钱包支付</button>
            </div>`);
    };

    window.openWithdrawModal = function() {
        window.showModal("withdraw", `
            <div class="space-y-4 text-left">
                <div class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                    <img id="witLogo" src="${tokenConfig['NEO'].logo}" class="w-8 h-8 object-contain">
                    <select id="witToken" onchange="window.updateModalLogo('witToken','witLogo')" class="bg-transparent font-black outline-none flex-1">
                        ${getLogoOptions('NEO')}
                    </select>
                </div>
                <input type="number" id="witAmount" placeholder="提现数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button type="button" onclick="window.doWithdrawSignature()" class="action-btn w-full mt-2 !from-red-500">确认提现签名</button>
            </div>`);
    };

window.openExchangeModal = function() {
        window.showModal("exchange", `
            <div class="space-y-3">
                <!-- 兑出区域 -->
                <div class="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase ml-1" data-i18n="swap_from">兑出资产</span>
                        <span class="text-[10px] font-bold text-indigo-500 mr-1 cursor-pointer" onclick="window.fillMax('sFromToken','sFromAmt')" data-i18n="max_available">最大可用</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <!-- 左侧：Logo 和 下拉框合并成一个“币种选择按钮” -->
                        <div class="flex items-center gap-2 bg-white py-2 px-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                            <img id="swapFromLogo" src="${tokenConfig['USDT'].logo}" class="w-6 h-6 object-contain">
                            <select id="sFromToken" onchange="window.updateModalLogo('sFromToken','swapFromLogo')" 
                                    class="bg-transparent font-bold text-sm outline-none border-none cursor-pointer appearance-none">
                                ${getLogoOptions('USDT')}
                            </select>
                            <i class="fa-solid fa-chevron-down text-[8px] text-slate-300"></i>
                        </div>
                        
                        <!-- 右侧：宽大的输入框，文字右对齐 -->
                        <input type="number" id="sFromAmt" oninput="window.calcSwap()" placeholder="0" 
                               class="flex-1 min-w-0 bg-transparent font-black text-2xl text-right outline-none border-none p-0 text-slate-800">
                    </div>
                </div>

                <!-- 中间装饰箭头 -->
                <div class="flex justify-center -my-6 relative z-10">
                    <div class="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-slate-50 text-indigo-500">
                        <i class="fa-solid fa-arrow-down"></i>
                    </div>
                </div>

                <!-- 兑入区域 -->
                <div class="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase ml-1" data-i18n="expected_receive">预计兑入</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <!-- 左侧：Logo 和 下拉框合并 -->
                        <div class="flex items-center gap-2 bg-white py-2 px-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                            <img id="swapToLogo" src="${tokenConfig['NEO'].logo}" class="w-6 h-6 object-contain">
                            <select id="sToToken" onchange="window.updateModalLogo('sToToken','swapToLogo')" 
                                    class="bg-transparent font-bold text-sm outline-none border-none cursor-pointer appearance-none">
                                ${getLogoOptions('NEO')}
                            </select>
                            <i class="fa-solid fa-chevron-down text-[8px] text-slate-300"></i>
                        </div>
                        
                        <!-- 右侧：展示框，文字右对齐 -->
                        <input type="number" id="sToAmt" readonly placeholder="0" 
                               class="flex-1 min-w-0 bg-transparent font-black text-2xl text-right outline-none border-none p-0 text-indigo-600">
                    </div>
                </div>
                
                <button type="button" onclick="window.doExchangeSignature()" class="action-btn w-full mt-4">提交兑换签名</button>
            </div>`);
    };

window.openInternalTransferModal = function() {
        window.showModal("internal_transfer", `
            <div class="space-y-4">
                <!-- 1. 接收地址区块 -->
                <div class="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 text-left">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">接收者地址</p>
                    <input type="text" id="transAddr" placeholder="请输入 0x 地址" 
                           class="w-full bg-transparent font-mono text-[11px] outline-none border-none p-0 text-slate-800">
                </div>

                <!-- 2. 选择资产区块 (上方) -->
                <div class="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 text-left">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-3 ml-1">转账资产</p>
                    <div class="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <!-- 这里的 transLogo 会随下拉框改变 -->
                        <img id="transLogo" src="${tokenConfig['USDT'].logo}" class="w-8 h-8 object-contain shrink-0">
                        <select id="transToken" onchange="window.updateModalLogo('transToken','transLogo')" 
                                class="flex-1 bg-transparent font-black text-base outline-none border-none cursor-pointer appearance-none">
                            ${getLogoOptions('USDT')}
                        </select>
                        <i class="fa-solid fa-chevron-down text-[10px] text-slate-300"></i>
                    </div>
                </div>

                <!-- 3. 数量输入区块 (下方) -->
                <div class="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 text-left">
                    <div class="flex justify-between items-center mb-2 ml-1">
                        <p class="text-[10px] font-bold text-slate-400 uppercase">转账数量</p>
                        <span class="text-[10px] font-bold text-indigo-500 cursor-pointer" onclick="window.fillMax('transToken','transAmount')">全部转出</span>
                    </div>
                    <input type="number" id="transAmount" placeholder="0.00" 
                           class="w-full bg-transparent font-black text-2xl outline-none border-none p-0 text-slate-800">
                </div>

                <button type="button" onclick="window.doInternalTransfer()" class="action-btn w-full mt-2">确认提交签名</button>
            </div>`);
    };

    // --- 6. 绑定与申请 ---
    window.openBindInviterModal = function() {
        window.showModal("modal_register_title", `
            <div class="space-y-4">
                <p class="text-xs text-amber-600 bg-amber-50 p-4 rounded-2xl" data-i18n="register_desc">请输入邀请码以激活账户</p>
                <input type="text" id="input_inviter_id" placeholder="推荐人 ID" class="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none">
                <button type="button" onclick="window.doSubmitBindInviter()" class="action-btn w-full !from-amber-500">立即绑定签名</button>
            </div>`);
    };

    window.openTeamDetailModal = function() {
        window.showModal("modal_team_title", `
            <div class="space-y-4">
                <p class="text-xs text-blue-600 bg-blue-50 p-4 rounded-2xl" data-i18n="team_email_desc">团队详情将通过邮件发送</p>
                <input type="email" id="team_email" placeholder="您的邮箱" class="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none">
                <button type="button" onclick="window.doTeamEmailSubmit()" class="action-btn w-full">提交申请签名</button>
            </div>`);
    };

    // --- 核心：弹窗展示逻辑 ---
    window.showModal = function(titleKey, html) {
        const overlay = document.getElementById('modalOverlay');
        const titleEl = document.getElementById('modalTitle');
        const contentEl = document.getElementById('modalContent');
        
        if (overlay && titleEl && contentEl) {
            titleEl.setAttribute('data-i18n', titleKey);
            contentEl.innerHTML = html;
            
            // 使用 flex 并强制覆盖 display
            overlay.style.setProperty('display', 'flex', 'important');
            
            // 触发局部语言渲染
            if (window.i18nRender) {
                const currentLang = localStorage.getItem('fbs_lang') || 'zh-CN';
                window.i18nRender(currentLang);
            }
        }
    };

    // --- 辅助：创建带Logo的币种选择器 ---
    function createTokenSelector(selectId, imgId, selectedSymbol) {
        return `
            <div class="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <img id="${imgId}" src="${tokenConfig[selectedSymbol].logo}" class="w-8 h-8 object-contain shrink-0">
                <select id="${selectId}" onchange="window.updateModalLogo('${selectId}','${imgId}')" 
                        class="flex-1 bg-transparent font-black text-base outline-none border-none cursor-pointer appearance-none">
                    ${getLogoOptions(selectedSymbol)}
                </select>
                <i class="fa-solid fa-chevron-down text-[10px] text-slate-300"></i>
            </div>
        `;
    }

    window.closeModal = () => {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    };

    console.log("[Modal] 弹窗管理模块挂载成功");
}
