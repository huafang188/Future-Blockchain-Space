/**
 * 📊 计算模块：负责弹窗内的实时数值逻辑
 */
export function mountCalculationHandlers() {

    /**
     * 1. 购买矿机：点击按钮更新选中的数量和总价
     * @param {number} n - 矿机数量
     * @param {HTMLElement} btn - 点击的按钮对象
     */
    window.setBuyNum = function(n, btn) {
        // 更新按钮样式
        document.querySelectorAll('.buy-btn').forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            b.classList.add('border-slate-200');
        });
        btn.classList.remove('border-slate-200');
        btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');

        // 计算总价：每台 150 USDT/USD
        const unitPrice = 150;
        const total = (n * unitPrice).toFixed(2);
        
        const totalEl = document.getElementById('buyTotal');
        if (totalEl) totalEl.innerText = `$ ${total}`;
    };

    /**
     * 1.1 购买矿机：输入框方式更新数量和总价
     * @param {HTMLElement} input - 输入框对象
     */
    window.setBuyNumInput = function(input) {
        let value = parseInt(input.value);
        
        // 只限制最大值为 100
        if (!isNaN(value) && value > 100) {
            input.value = 100;
            value = 100;
        }
        
        // 计算总价：每台 150 USDT/USD
        const unitPrice = 150;
        // 只有当值有效时才计算总价
        if (!isNaN(value) && value >= 1 && value <= 100) {
            const total = (value * unitPrice).toFixed(2);
            const totalEl = document.getElementById('buyTotal');
            if (totalEl) totalEl.innerText = `$ ${total}`;
        }
    };

    /**
     * 1.2 购买矿机：快捷按钮设置输入框值
     * @param {number} n - 矿机数量
     */
    window.setBuyNumInputValue = function(n) {
        const input = document.getElementById('buyNumInput');
        if (input) {
            input.value = n;
            window.setBuyNumInput(input);
        }
    };

    /**
     * 2. 缴纳电费：实时计算所需 USDT
     * 公式：数量 * 天数 * 1.00 (即 1美元/台/天)
     */
    window.calcElec = function() {
        const numInput = document.getElementById('elecNum');
        const daysSelect = document.getElementById('elecDays');
        const costEl = document.getElementById('elecCost');

        if (!numInput || !daysSelect || !costEl) return;

        const n = parseFloat(numInput.value) || 0;
        const d = parseFloat(daysSelect.value) || 0;
        
        const total = (n * d * 1.00).toFixed(2);
        costEl.innerText = `${total} USDT`;
    };

    /**
     * 3. 兑换计算：根据实时汇率计算兑入数量
     * 公式：(兑出数量 * 兑出币单价) / 兑入币单价
     */
    window.calcSwap = function() {
        const fromToken = document.getElementById('sFromToken')?.value;
        const toToken = document.getElementById('sToToken')?.value;
        const fromAmtInput = document.getElementById('sFromAmt');
        const toAmtInput = document.getElementById('sToAmt');

        if (!fromToken || !toToken || !fromAmtInput || !toAmtInput) return;

        const amount = parseFloat(fromAmtInput.value) || 0;
        
        // 从全局变量获取 Worker 抓取的实时价格
        const prices = window.currentPrices || {};
        const fromPrice = parseFloat(prices[fromToken]) || 0;
        const toPrice = parseFloat(prices[toToken]) || 0;

        // 更新余额提示 (可选)
        window.updateMaxHint('sFromToken', 'swapMaxBalance');

        if (fromPrice > 0 && toPrice > 0) {
            const result = (amount * (fromPrice / toPrice)).toFixed(6);
            toAmtInput.value = result;
        } else {
            toAmtInput.value = "0.000000";
        }
    };

    /**
     * 4. 辅助：更新弹窗内的“可用余额”提示
     * @param {string} selectId - 币种选择框 ID
     * @param {string} spanId - 余额展示标签 ID
     */
    window.updateMaxHint = function(selectId, spanId) {
        const symbol = document.getElementById(selectId)?.value;
        const spanEl = document.getElementById(spanId);
        
        if (symbol && spanEl) {
            // window.userBalances 由 api-service.js 更新
            const balances = window.userBalances || {};
            const balance = parseFloat(balances[symbol] || 0);
            spanEl.innerText = balance.toFixed(4);
        }
    };

    /**
     * 5. 提币/转账最大值点击事件
     * 用于点击"最大"按钮时自动填满输入框
     */
    window.fillMax = function(selectId, inputId) {
        const symbol = document.getElementById(selectId)?.value;
        const inputEl = document.getElementById(inputId);
        const balances = window.userBalances || {};

        if (symbol && inputEl) {
            inputEl.value = parseFloat(balances[symbol] || 0);
            // 如果是兑换，填满后触发一次计算
            if (inputId === 'sFromAmt') window.calcSwap();
        }
    };

    /**
     * 6. 滑点/买卖税滑块更新
     * @param {string} value - 滑块值 (3-5)
     */
    window.updateSlippage = function(value) {
        const displayEl = document.getElementById('slippageValue');
        if (displayEl) {
            displayEl.innerText = value + '%';
        }
    };

    /**
     * 7. 公告折叠/展开切换
     */
    window.toggleAnnouncement = function() {
        const content = document.getElementById('announcement-content');
        const icon = document.getElementById('announcement-toggle-icon');
        
        if (content && icon) {
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                icon.style.transform = 'rotate(180deg)';
            } else {
                content.classList.add('hidden');
                icon.style.transform = 'rotate(0deg)';
            }
        }
    };

    /**
     * 8. 新闻列表折叠/展开切换
     */
    window.toggleNewsList = function() {
        const content = document.getElementById('news-list-content');
        const icon = document.getElementById('news-toggle-icon');
        
        if (content && icon) {
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                icon.style.transform = 'rotate(180deg)';
            } else {
                content.classList.add('hidden');
                icon.style.transform = 'rotate(0deg)';
            }
        }
    };

    /**
     * 9. 公告/新闻标签切换
     */
    window.switchNewsTab = function(tab) {
        const announcementPanel = document.getElementById('announcement-panel');
        const newsPanel = document.getElementById('news-panel');
        const tabAnnouncement = document.getElementById('tab-announcement');
        const tabNews = document.getElementById('tab-news');
        
        if (tab === 'announcement') {
            if (announcementPanel) announcementPanel.classList.remove('hidden');
            if (newsPanel) newsPanel.classList.add('hidden');
            if (tabAnnouncement) {
                tabAnnouncement.classList.remove('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
                tabAnnouncement.classList.add('bg-purple-500', 'text-white', 'shadow-sm');
            }
            if (tabNews) {
                tabNews.classList.remove('bg-purple-500', 'text-white', 'shadow-sm');
                tabNews.classList.add('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
            }
        } else if (tab === 'news') {
            if (announcementPanel) announcementPanel.classList.add('hidden');
            if (newsPanel) newsPanel.classList.remove('hidden');
            if (tabAnnouncement) {
                tabAnnouncement.classList.remove('bg-purple-500', 'text-white', 'shadow-sm');
                tabAnnouncement.classList.add('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
            }
            if (tabNews) {
                tabNews.classList.remove('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
                tabNews.classList.add('bg-purple-500', 'text-white', 'shadow-sm');
            }
        }
    };

    /**
     * 10. 交易历史/转账流水标签切换
     */
    window.switchHistoryTab = function(tab) {
        const historyPanel = document.getElementById('history-panel');
        const transferPanel = document.getElementById('transfer-panel');
        const tabHistory = document.getElementById('tab-history');
        const tabTransfer = document.getElementById('tab-transfer');

        if (tab === 'history') {
            if (historyPanel) historyPanel.classList.remove('hidden');
            if (transferPanel) transferPanel.classList.add('hidden');
            if (tabHistory) {
                tabHistory.classList.remove('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
                tabHistory.classList.add('bg-purple-500', 'text-white', 'shadow-sm');
            }
            if (tabTransfer) {
                tabTransfer.classList.remove('bg-purple-500', 'text-white', 'shadow-sm');
                tabTransfer.classList.add('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
            }
        } else if (tab === 'transfer') {
            if (historyPanel) historyPanel.classList.add('hidden');
            if (transferPanel) transferPanel.classList.remove('hidden');
            if (tabHistory) {
                tabHistory.classList.remove('bg-purple-500', 'text-white', 'shadow-sm');
                tabHistory.classList.add('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
            }
            if (tabTransfer) {
                tabTransfer.classList.remove('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
                tabTransfer.classList.add('bg-purple-500', 'text-white', 'shadow-sm');
            }
        }
    };

    console.log("[Calculations] 计算逻辑挂载成功");
}
