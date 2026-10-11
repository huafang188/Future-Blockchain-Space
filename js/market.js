// 市场页面逻辑（NEO 买卖挂单 + 算力挂单 + 订单簿模拟）
(function () {
    'use strict';

    // ---------- 工具 ----------
    function $(id) { return document.getElementById(id); }
    function fmt(n, d) { d = d == null ? 4 : d; return Number(n).toFixed(d); }
    function nowHM() {
        var d = new Date();
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    }
    function rand(min, max) { return Math.random() * (max - min) + min; }

    // ---------- 状态 ----------
    var state = {
        neoPrice: 0.325,
        balanceUSDT: 8642.50,
        balanceNEO: 326.18,
        side: 'buy',
        asks: [],
        bids: [],
        recent: [],
        powerList: []
    };

    // ---------- 初始化订单簿 ----------
    function initOrderBook() {
        state.asks = [];
        state.bids = [];
        for (var i = 0; i < 8; i++) {
            state.asks.push({
                price: state.neoPrice * (1 + 0.002 * (i + 1) + rand(0, 0.001)),
                amount: rand(10, 200)
            });
            state.bids.push({
                price: state.neoPrice * (1 - 0.002 * (i + 1) - rand(0, 0.001)),
                amount: rand(10, 200)
            });
        }
        state.asks.sort(function (a, b) { return b.price - a.price; });
        state.bids.sort(function (a, b) { return b.price - a.price; });
    }

    function initRecent() {
        state.recent = [];
        for (var i = 0; i < 10; i++) {
            state.recent.push({
                price: state.neoPrice * (1 + rand(-0.01, 0.01)),
                amount: rand(1, 80),
                time: nowHM()
            });
        }
    }

    function initPowerList() {
        var specs = [
            { spec: 'A100 ×8', type: 'GPU', provider: 'Yandex NCL', price: 8.6, duration: '24h' },
            { spec: 'H100 ×4', type: 'GPU', providerKey: 'market_provider_siberian', price: 12.4, duration: '12h' },
            { spec: 'RTX 4090 ×10', type: 'GPU', providerKey: 'market_provider_polaris', price: 3.2, duration: '6h' },
            { spec: 'ASIC S21 ×100', type: 'ASIC', providerKey: 'market_provider_clean', price: 1.8, duration: '24h' },
            { spec: 'A100 ×32', type: 'GPU', provider: 'Yandex Chervonenkis', price: 8.4, duration: '48h' },
            { spec: 'CPU Xeon ×256', type: 'CPU', providerKey: 'market_provider_neo_coop', price: 0.6, duration: '12h' },
            { spec: 'H100 ×16', type: 'GPU', providerKey: 'market_provider_aurora', price: 11.8, duration: '24h' },
            { spec: 'A100 ×2', type: 'GPU', providerKey: 'market_provider_individual', providerSuffix: ' · 0x7f3a', price: 9.2, duration: '4h' }
        ];
        state.powerList = specs;
    }

    function getProviderName(p) {
        if (p.providerKey) {
            var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
            var d = window.i18nData && window.i18nData[lang];
            var name = (d && d[p.providerKey]) || p.provider || p.providerKey;
            return name + (p.providerSuffix || '');
        }
        return p.provider || '';
    }

    // ---------- 渲染 ----------
    function renderPrice() {
        if ($('marketNeoPrice')) $('marketNeoPrice').textContent = fmt(state.neoPrice, 4) + ' USDT';
    }

    function renderBalance() {
        if ($('marketBalance')) $('marketBalance').textContent = fmt(state.balanceUSDT, 2);
    }

    function renderOrderBook() {
        var asksEl = $('marketAsksList');
        var bidsEl = $('marketBidsList');
        if (!asksEl || !bidsEl) return;
        asksEl.innerHTML = state.asks.map(function (o) {
            return '<div class="market-ob-row market-ob-ask">' +
                '<span class="market-ob-price">' + fmt(o.price, 4) + '</span>' +
                '<span class="market-ob-amt">' + fmt(o.amount, 2) + '</span>' +
                '</div>';
        }).join('');
        bidsEl.innerHTML = state.bids.map(function (o) {
            return '<div class="market-ob-row market-ob-bid">' +
                '<span class="market-ob-price">' + fmt(o.price, 4) + '</span>' +
                '<span class="market-ob-amt">' + fmt(o.amount, 2) + '</span>' +
                '</div>';
        }).join('');
    }

    function renderRecent() {
        var el = $('marketRecentList');
        if (!el) return;
        el.innerHTML = state.recent.slice(0, 10).map(function (r) {
            var cls = r.price >= state.neoPrice ? 'market-recent-up' : 'market-recent-down';
            return '<div class="market-recent-row ' + cls + '">' +
                '<span>' + fmt(r.price, 4) + '</span>' +
                '<span>' + fmt(r.amount, 2) + '</span>' +
                '<span class="market-recent-time">' + r.time + '</span>' +
                '</div>';
        }).join('');
    }

    function renderPowerList() {
        var el = $('marketPowerList');
        if (!el) return;
        var rentLabel = '租用';
        try {
            var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
            var d = window.i18nData && window.i18nData[lang];
            if (d && d.market_power_rent) rentLabel = d.market_power_rent;
        } catch (e) {}
        el.innerHTML = state.powerList.map(function (p, idx) {
            var typeClass = 'market-power-type-' + (p.type || '').toLowerCase();
            return '<div class="market-power-row">' +
                '<span class="market-power-spec-cell">' + p.spec + '</span>' +
                '<span class="market-power-type-cell ' + typeClass + '">' + p.type + '</span>' +
                '<span class="market-power-provider-cell">' + getProviderName(p) + '</span>' +
                '<span class="market-power-price-cell">' + fmt(p.price, 2) + ' USDT/h</span>' +
                '<span class="market-power-dur-cell">' + p.duration + '</span>' +
                '<button type="button" class="market-power-rent-btn" data-idx="' + idx + '">' + rentLabel + '</button>' +
                '</div>';
        }).join('');
    }

    function renderTotal() {
        var p = parseFloat($('marketOrderPrice').value) || 0;
        var a = parseFloat($('marketOrderAmount').value) || 0;
        if ($('marketOrderTotal')) $('marketOrderTotal').textContent = fmt(p * a, 2) + ' USDT';
    }

    // ---------- 交互 ----------
    function switchSide(side) {
        state.side = side;
        var buyBtn = document.querySelector('.market-tab-buy');
        var sellBtn = document.querySelector('.market-tab-sell');
        var placeBtn = $('marketPlaceOrder');
        var labelKey = side === 'buy' ? 'market_place_buy' : 'market_place_sell';
        var label = '挂单买入';
        try {
            var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
            var d = window.i18nData && window.i18nData[lang];
            if (d && d[labelKey]) label = d[labelKey];
        } catch (e) {}
        if (side === 'buy') {
            buyBtn.classList.add('active');
            sellBtn.classList.remove('active');
            placeBtn.classList.add('market-place-buy');
            placeBtn.classList.remove('market-place-sell');
        } else {
            sellBtn.classList.add('active');
            buyBtn.classList.remove('active');
            placeBtn.classList.add('market-place-sell');
            placeBtn.classList.remove('market-place-buy');
        }
        placeBtn.querySelector('span').textContent = label;
        renderBalanceForSide();
    }

    function renderBalanceForSide() {
        var balEl = $('marketBalance');
        if (!balEl) return;
        balEl.textContent = state.side === 'buy' ? fmt(state.balanceUSDT, 2) + ' USDT' : fmt(state.balanceNEO, 2) + ' NEO';
    }

    function placeOrder() {
        var p = parseFloat($('marketOrderPrice').value);
        var a = parseFloat($('marketOrderAmount').value);
        if (!p || p <= 0 || !a || a <= 0) {
            if (window.showModal) window.showModal('提示', '<div class="p-6 text-center">请输入有效的价格和数量</div>');
            return;
        }
        var side = state.side;
        var msg = (side === 'buy' ? '买入' : '卖出') + ' ' + fmt(a, 4) + ' NEO @ ' + fmt(p, 4) + ' USDT';
        if (window.showModal) window.showModal('挂单已提交', '<div class="p-6 text-center">' + msg + '<br><span class="text-xs text-slate-400">链上撮合中…</span></div>');
        state.recent.unshift({ price: p, amount: a, time: nowHM() });
        if (side === 'buy') {
            state.bids.unshift({ price: p, amount: a });
            state.bids.sort(function (x, y) { return y.price - x.price; });
        } else {
            state.asks.unshift({ price: p, amount: a });
            state.asks.sort(function (x, y) { return y.price - x.price; });
        }
        renderOrderBook();
        renderRecent();
        $('marketOrderPrice').value = '';
        $('marketOrderAmount').value = '';
        renderTotal();
    }

    function applyQuickPct(pct) {
        var price = parseFloat($('marketOrderPrice').value) || state.neoPrice;
        if (!$('marketOrderPrice').value) $('marketOrderPrice').value = fmt(price, 4);
        var maxAmt = state.side === 'buy' ? state.balanceUSDT / price : state.balanceNEO;
        $('marketOrderAmount').value = fmt(maxAmt * pct / 100, 4);
        renderTotal();
    }

    function rentPower(idx) {
        var p = state.powerList[idx];
        if (!p) return;
        var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
        var dict = window.i18nData && window.i18nData[lang] || {};
        var rentTitle = dict.market_power_rent_title || '租用算力';
        var providerLabel = dict.market_power_provider_label || '提供方：';
        var priceLabel = dict.market_power_price_label || '单价：';
        var durLabel = dict.market_power_dur_label || '时长：';
        var matchingMsg = dict.market_power_matching || '链上撮合交付中…';
        if (window.showModal) window.showModal(rentTitle,
            '<div class="p-6">' +
            '<div class="text-center mb-3"><b>' + p.spec + '</b></div>' +
            '<div class="text-xs text-slate-500 text-center">' + providerLabel + getProviderName(p) + '</div>' +
            '<div class="text-xs text-slate-500 text-center">' + priceLabel + fmt(p.price, 2) + ' USDT/h · ' + durLabel + p.duration + '</div>' +
            '<div class="text-xs text-orange-500 text-center mt-3">' + matchingMsg + '</div>' +
            '</div>');
    }

    function showRules() {
        if (!window.showModal) return;
        var t = window.i18nData && window.i18nCore && window.i18nCore.lang ? window.i18nCore.lang() : 'zh-CN';
        var d = window.i18nData[t] || window.i18nData['zh-CN'];
        window.showModal(d.market_rules_title || '算力交易规则',
            '<div class="p-5 text-sm leading-relaxed">' +
            '<p class="mb-2">' + (d.market_rules_1 || '1. 所有挂单、撮合、结算均在 NEO 链上完成，公开透明、不可篡改。') + '</p>' +
            '<p class="mb-2">' + (d.market_rules_2 || '2. NEO 买卖支持限价挂单，按价格优先、时间优先原则撮合。') + '</p>' +
            '<p class="mb-2">' + (d.market_rules_3 || '3. 算力交易按规格 × 时长计费，链上自动交付与结算。') + '</p>' +
            '<p class="mb-2">' + (d.market_rules_4 || '4. 提供算力方需质押一定 NRY 作为算力质量保证金。') + '</p>' +
            '<p>' + (d.market_rules_5 || '5. 所有算力均来自清洁能源节点，零碳排放、可追溯。') + '</p>' +
            '</div>');
    }

    // ---------- 模拟行情跳动 ----------
    function tick() {
        state.neoPrice += rand(-0.001, 0.001);
        if (state.neoPrice < 0.32) state.neoPrice = 0.32 + rand(0, 0.002);
        if (state.neoPrice > 0.33) state.neoPrice = 0.33 - rand(0, 0.002);
        renderPrice();
        if (Math.random() < 0.6) {
            state.recent.unshift({
                price: state.neoPrice * (1 + rand(-0.005, 0.005)),
                amount: rand(1, 80),
                time: nowHM()
            });
            if (state.recent.length > 20) state.recent.length = 20;
            renderRecent();
        }
    }

    // ---------- 初始化 ----------
    function init() {
        initOrderBook();
        initRecent();
        initPowerList();
        renderPrice();
        renderBalance();
        renderBalanceForSide();
        renderOrderBook();
        renderRecent();
        renderPowerList();
        renderTotal();

        var tabs = document.querySelectorAll('.market-tab');
        tabs.forEach(function (t) {
            t.addEventListener('click', function () {
                switchSide(t.getAttribute('data-side'));
            });
        });

        var placeBtn = $('marketPlaceOrder');
        if (placeBtn) placeBtn.addEventListener('click', placeOrder);

        var priceInput = $('marketOrderPrice');
        var amtInput = $('marketOrderAmount');
        if (priceInput) priceInput.addEventListener('input', renderTotal);
        if (amtInput) amtInput.addEventListener('input', renderTotal);

        var quickBtns = document.querySelectorAll('.market-form-quick button');
        quickBtns.forEach(function (b) {
            b.addEventListener('click', function () {
                applyQuickPct(parseInt(b.getAttribute('data-pct'), 10));
            });
        });

        var rentBtn = $('marketRentBtn');
        if (rentBtn) rentBtn.addEventListener('click', function () {
            var el = document.querySelector('.market-power-list-wrap');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        var learnBtn = $('marketLearnMoreBtn');
        if (learnBtn) learnBtn.addEventListener('click', showRules);

        var powerListEl = $('marketPowerList');
        if (powerListEl) powerListEl.addEventListener('click', function (e) {
            var btn = e.target.closest('.market-power-rent-btn');
            if (!btn) return;
            rentPower(parseInt(btn.getAttribute('data-idx'), 10));
        });

        window.addEventListener('onLanguageChanged', function () {
            renderPowerList();
            renderBalanceForSide();
            var placeBtn = $('marketPlaceOrder');
            if (placeBtn) {
                var labelKey = state.side === 'buy' ? 'market_place_buy' : 'market_place_sell';
                var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
                var d = window.i18nData && window.i18nData[lang];
                if (d && d[labelKey]) placeBtn.querySelector('span').textContent = d[labelKey];
            }
        });

        setInterval(tick, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();