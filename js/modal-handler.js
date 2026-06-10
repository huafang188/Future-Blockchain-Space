import { tokenConfig, CONTRACT_ADDRS } from './config.js';

// 将 tokenConfig 暴露为全局变量
window.tokenConfig = tokenConfig;

/**
 * 🛠️ 弹窗模块：管理所有动态 UI 交互
 */
export function mountModalHandlers() {

    // --- 0. 辅助功能：获取带 Logo 的币种选项 (原生 select) ---
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
                    <input type="number" id="buyNumInput" oninput="window.setBuyNumInput(this)" data-i18n-placeholder="buy_num_placeholder" placeholder="输入数量 (1-100)" min="1" max="100" class="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border border-slate-200 text-center" style="appearance: textfield;">
                    <div class="flex gap-2 justify-center">
                        <button type="button" onclick="window.setBuyNumInputValue(1)" class="px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-bold">1</button>
                        <button type="button" onclick="window.setBuyNumInputValue(10)" class="px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-bold">10</button>
                        <button type="button" onclick="window.setBuyNumInputValue(50)" class="px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-bold">50</button>
                        <button type="button" onclick="window.setBuyNumInputValue(100)" class="px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-bold">100</button>
                    </div>
                    <div class="p-5 bg-blue-50 rounded-[2rem] flex justify-between items-center">
                        <span class="text-xs font-bold text-blue-600" data-i18n="expected_pay">预计支付</span>
                        <span id="buyTotal" class="text-xl font-black text-blue-700">$ 0.00</span>
                    </div>
                    <button type="button" onclick="window.doChainPay('MINER')" class="action-btn w-full mt-2" data-i18n="confirm_pay_bsc">确认支付 (BSC)</button>
                </div>`);
        } else {
            window.showModal("pay_fee", `
                <div class="space-y-4 text-left">
                    <input type="number" id="elecNum" oninput="window.calcElec()" data-i18n-placeholder="elec_num_placeholder" placeholder="矿机数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none border-none">
                    <select id="elecDays" onchange="window.calcElec()" class="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none">
                        <option value="30" data-i18n="days_30">30 天</option>
                        <option value="90" data-i18n="days_90">90 天</option>
                        <option value="180" data-i18n="days_180">180 天</option>
                        <option value="360" data-i18n="days_360">360 天</option>
                    </select>
                    <div class="p-5 bg-slate-900 rounded-[2rem] flex justify-between items-center">
                        <span class="text-slate-400 text-xs font-bold" data-i18n="elec_cost">所需电费</span>
                        <span id="elecCost" class="text-yellow-500 font-black text-lg">0.00 USDT</span>
                    </div>
                    <button type="button" onclick="window.doChainPay('ELECTRIC')" class="action-btn w-full mt-2" data-i18n="confirm_pay_bsc">确认支付 (BSC)</button>
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

    // --- 5. 金融模块 (提现/兑换) ---

    // 各链支持的代币
    const CHAIN_TOKENS = {
        'BSC': {
            withdraw: ['USDT', 'BNB', 'TON', 'SOL', 'NCL'],
            swap: ['NEO', 'USDT', 'BNB', 'TON', 'SOL', 'NCL']
        },
        'TON': {
            withdraw: ['USDT', 'TON', 'NCL'],
            swap: ['NEO', 'USDT', 'TON', 'NCL']
        },
        'SOL': {
            withdraw: ['USDT', 'SOL', 'NCL'],
            swap: ['NEO', 'USDT', 'SOL', 'NCL']
        }
    };

    function getChainTokens() {
        const chain = window.currentChain || 'BSC';
        return CHAIN_TOKENS[chain] || CHAIN_TOKENS['BSC'];
    }

    window.openWithdrawModal = function() {
        const tokens = getChainTokens().withdraw;
        window.showModal("withdraw", `
            <div class="space-y-4 text-left">
                <div class="flex items-center gap-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <img id="witLogo" src="${tokenConfig['USDT'].logo}" class="w-8 h-8 object-contain">
                    <select id="witToken" class="flex-1 font-black text-base text-left bg-transparent outline-none cursor-pointer"
                            onchange="document.getElementById('witLogo').src = tokenConfig[this.value].logo; window.updateWitBalanceHint();">
                        ${tokens.map(symbol => 
                            `<option value="${symbol}" ${symbol === 'USDT' ? 'selected' : ''}>${symbol}</option>`
                        ).join('')}
                    </select>
                    <i class="fa-solid fa-chevron-down text-[10px] text-slate-300"></i>
                </div>
                <div class="px-1 -mb-2">
                    <span class="text-[9px] font-bold text-amber-500" data-i18n="withdraw_fee">手续费：0.5USDT</span>
                </div>
                <div class="px-1">
                    <span id="witBalanceHint" class="text-[9px] font-bold text-slate-400">可用余额：0.00 USDT</span>
                </div>
                <input type="number" id="witAmount" placeholder="提现数量" class="w-full p-4 bg-slate-50 rounded-2xl font-black border-none outline-none">
                <button type="button" onclick="window.doWithdrawSignature()" class="action-btn w-full mt-2 !from-red-500">确认提现签名</button>
            </div>`);
        // 延迟执行以确保 DOM 已渲染
        setTimeout(() => window.updateWitBalanceHint(), 50);
    };

    window.updateWitBalanceHint = function() {
        const symbol = document.getElementById('witToken')?.value || 'USDT';
        const balances = window.userBalances || {};
        const balance = parseFloat(balances[symbol] || 0).toFixed(4);
        const hintEl = document.getElementById('witBalanceHint');
        if (hintEl) {
            hintEl.textContent = `可用余额：${balance} ${symbol}`;
        }
    };

window.openExchangeModal = function() {
        const tokens = getChainTokens().swap;
        window.showModal("exchange", `
            <div class="space-y-3">
                <!-- 兑出区域 -->
                <div class="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase ml-1" data-i18n="swap_from">兑出资产</span>
                        <span class="text-[10px] font-bold text-indigo-500 mr-1 cursor-pointer" onclick="window.fillMax('sFromToken','sFromAmt')" data-i18n="max_available">最大可用</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <!-- 左侧：Logo 和下拉框 -->
                        <div class="flex items-center gap-2 bg-white py-2 px-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                            <img id="swapFromLogo" src="${tokenConfig['NEO'].logo}" class="w-6 h-6 object-contain">
                            <select id="sFromToken" class="font-bold text-sm bg-transparent outline-none cursor-pointer"
                                    onchange="document.getElementById('swapFromLogo').src = tokenConfig[this.value].logo; window.calcSwap();">
                                ${tokens.map(symbol => 
                                    `<option value="${symbol}" ${symbol === 'NEO' ? 'selected' : ''}>${symbol}</option>`
                                ).join('')}
                            </select>
                            <i class="fa-solid fa-chevron-down text-[8px] text-slate-300"></i>
                        </div>
                        
                        <!-- 右侧：宽大的输入框，文字右对齐 -->
                        <input type="number" id="sFromAmt" oninput="window.calcSwap()" placeholder="0" 
                               class="flex-1 min-w-0 bg-transparent font-black text-2xl text-right outline-none border-none p-0 text-slate-800">
                    </div>
                </div>

                <!-- 中间装饰箭头 + 滑点控制 -->
                <div class="flex flex-col items-center -my-4 relative z-10">
                    <!-- 滑点/买卖税滑块 -->
                    <div class="w-full px-2 py-2 bg-indigo-50 rounded-xl border border-indigo-100 mb-2">
                        <div class="flex justify-between items-center mb-1 px-1">
                            <span class="text-[9px] font-bold text-indigo-600" data-i18n="swap_slippage">滑点/买卖税</span>
                            <span id="slippageValue" class="text-[9px] font-black text-indigo-500">10%</span>
                        </div>
                        <input type="range" id="slippageSlider" min="3" max="20" step="1" value="10" 
                               oninput="window.updateSlippage(this.value)"
                               class="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-500">
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-slate-50 text-indigo-500">
                            <i class="fa-solid fa-arrow-down"></i>
                        </div>
                        <button type="button" onclick="window.swapTokens()" class="w-10 h-10 bg-indigo-500 rounded-full shadow-md flex items-center justify-center text-white hover:bg-indigo-600 transition-colors">
                            <i class="fa-solid fa-arrows-rotate text-sm"></i>
                        </button>
                    </div>
                </div>

                <!-- 兑入区域 -->
                <div class="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase ml-1" data-i18n="expected_receive">预计兑入</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <!-- 左侧：Logo 和下拉框 -->
                        <div class="flex items-center gap-2 bg-white py-2 px-3 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                            <img id="swapToLogo" src="${tokenConfig['USDT'].logo}" class="w-6 h-6 object-contain">
                            <select id="sToToken" class="font-bold text-sm bg-transparent outline-none cursor-pointer"
                                    onchange="document.getElementById('swapToLogo').src = tokenConfig[this.value].logo; window.calcSwap();">
                                ${tokens.map(symbol => 
                                    `<option value="${symbol}" ${symbol === 'USDT' ? 'selected' : ''}>${symbol}</option>`
                                ).join('')}
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

    window.swapTokens = function() {
        const fromEl = document.getElementById('sFromToken');
        const toEl = document.getElementById('sToToken');
        if (!fromEl || !toEl) return;
        
        const fromVal = fromEl.value;
        const toVal = toEl.value;
        
        fromEl.value = toVal;
        toEl.value = fromVal;
        
        // 更新 logo
        document.getElementById('swapFromLogo').src = tokenConfig[toVal].logo;
        document.getElementById('swapToLogo').src = tokenConfig[fromVal].logo;
        
        window.calcSwap();
    };

    // 链切换时更新弹窗代币选项
    window.updateWithdrawTokens = function() {
        const select = document.getElementById('witToken');
        if (!select) return;
        const tokens = getChainTokens().withdraw;
        const currentVal = select.value;
        select.innerHTML = tokens.map(symbol => 
            `<option value="${symbol}" ${symbol === currentVal ? 'selected' : ''}>${symbol}</option>`
        ).join('');
        // 如果当前选中的代币不在新列表中，默认选第一个
        if (!tokens.includes(currentVal)) {
            select.value = tokens[0];
            document.getElementById('witLogo').src = tokenConfig[tokens[0]].logo;
        }
        window.updateWitBalanceHint();
    };

    window.updateSwapTokens = function() {
        const fromSelect = document.getElementById('sFromToken');
        const toSelect = document.getElementById('sToToken');
        if (!fromSelect || !toSelect) return;
        const tokens = getChainTokens().swap;
        const fromVal = fromSelect.value;
        const toVal = toSelect.value;
        
        fromSelect.innerHTML = tokens.map(symbol => 
            `<option value="${symbol}" ${symbol === fromVal ? 'selected' : ''}>${symbol}</option>`
        ).join('');
        toSelect.innerHTML = tokens.map(symbol => 
            `<option value="${symbol}" ${symbol === toVal ? 'selected' : ''}>${symbol}</option>`
        ).join('');
        
        // 如果当前选中的代币不在新列表中，默认选第一个和第二个
        if (!tokens.includes(fromVal)) {
            fromSelect.value = tokens[0];
            document.getElementById('swapFromLogo').src = tokenConfig[tokens[0]].logo;
        }
        if (!tokens.includes(toVal)) {
            toSelect.value = tokens[1] || tokens[0];
            document.getElementById('swapToLogo').src = tokenConfig[tokens[1] || tokens[0]].logo;
        }
        window.calcSwap();
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

    // --- 辅助：创建带Logo的自定义币种选择器 ---
    function createTokenSelector(selectId, imgId, selectedSymbol) {
        return `
            <div class="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <img id="${imgId}" src="${tokenConfig[selectedSymbol].logo}" class="w-8 h-8 object-contain shrink-0">
                <select id="${selectId}" class="flex-1 font-black text-base text-left bg-transparent outline-none cursor-pointer" 
                        onchange="document.getElementById('${imgId}').src = tokenConfig[this.value].logo; if(this.id.startsWith('s') && window.calcSwap) window.calcSwap();">
                    ${Object.keys(tokenConfig).map(symbol => 
                        `<option value="${symbol}" ${symbol === selectedSymbol ? 'selected' : ''}>${symbol}</option>`
                    ).join('')}
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
