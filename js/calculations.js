
export function mountCalculationHandlers() {

    window.setBuyNum = function(n, btn) {

        document.querySelectorAll('.buy-btn').forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            b.classList.add('border-slate-200');
        });
        btn.classList.remove('border-slate-200');
        btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');

        const unitPrice = 150;
        const total = (n * unitPrice).toFixed(2);

        const totalEl = document.getElementById('buyTotal');
        if (totalEl) totalEl.innerText = `$ ${total}`;
    };

    window.setBuyNumInput = function(input) {
        let value = parseInt(input.value);

        if (!isNaN(value) && value > 100) {
            input.value = 100;
            value = 100;
        }

        const unitPrice = 150;

        if (!isNaN(value) && value >= 1 && value <= 100) {
            const total = (value * unitPrice).toFixed(2);
            const totalEl = document.getElementById('buyTotal');
            if (totalEl) totalEl.innerText = `$ ${total}`;
        }
    };

    window.setBuyNumInputValue = function(n) {
        const input = document.getElementById('buyNumInput');
        if (input) {
            input.value = n;
            window.setBuyNumInput(input);
        }
    };

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

    window.calcSwap = function() {
        const fromToken = document.getElementById('sFromToken')?.value;
        const toToken = document.getElementById('sToToken')?.value;
        const fromAmtInput = document.getElementById('sFromAmt');
        const toAmtInput = document.getElementById('sToAmt');

        if (!fromToken || !toToken || !fromAmtInput || !toAmtInput) return;

        const amount = parseFloat(fromAmtInput.value) || 0;

        const prices = window.currentPrices || {};
        const fromPrice = parseFloat(prices[fromToken]) || 0;
        const toPrice = parseFloat(prices[toToken]) || 0;

        window.updateMaxHint('sFromToken', 'swapMaxBalance');

        if (fromPrice > 0 && toPrice > 0) {

            const result = (amount * (fromPrice / toPrice) * 0.9).toFixed(6);
            toAmtInput.value = result;
        } else {
            toAmtInput.value = "0.000000";
        }
    };

    window.updateMaxHint = function(selectId, spanId) {
        const symbol = document.getElementById(selectId)?.value;
        const spanEl = document.getElementById(spanId);

        if (symbol && spanEl) {

            const balances = window.userBalances || {};
            const balance = parseFloat(balances[symbol] || 0);
            spanEl.innerText = balance.toFixed(4);
        }
    };

    window.fillMax = function(selectId, inputId) {
        const symbol = document.getElementById(selectId)?.value;
        const inputEl = document.getElementById(inputId);
        const balances = window.userBalances || {};

        if (symbol && inputEl) {
            inputEl.value = parseFloat(balances[symbol] || 0);

            if (inputId === 'sFromAmt') window.calcSwap();
        }
    };

    window.updateSlippage = function(value) {
        const displayEl = document.getElementById('slippageValue');
        if (displayEl) {
            displayEl.innerText = value + '%';
        }
    };

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

    window.switchHistoryTab = function(tab) {
        const historyPanel = document.getElementById('history-panel');
        const tabHistory = document.getElementById('tab-history');

        if (historyPanel) historyPanel.classList.remove('hidden');
        if (tabHistory) {
            tabHistory.classList.remove('bg-slate-100', 'text-slate-500', 'hover:bg-slate-200');
            tabHistory.classList.add('bg-purple-500', 'text-white', 'shadow-sm');
        }
    };

    console.log("[Calculations] 计算逻辑挂载成功");
}
