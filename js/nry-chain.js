(function () {
    'use strict';

    var MIN = 0.0073;
    var MAX = 0.0078;

    var TOKENS = {
        NRY: { addr: '0xd61f3adb5db97ea40b9d719fd7458e251770e51e', decimals: 18, icon: 'assets/NRY.webp' },
        USDT: { addr: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, icon: 'assets/USDT.webp' }
    };
    var BRIDGE_TO = '0x654a0af182C08bfFAf72bb12E0FB57F625E06628';
    var BNB_FEE_TO = '0x8007c1F954D46f98D108EB6E0dD979406C5Bb444';
    var BNB_FEE_WEI = BigInt('100000000000000');

    function $(id) { return document.getElementById(id); }

    function dict() {
        var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
        return (window.i18nData && window.i18nData[lang]) || (window.i18nData && window.i18nData['zh-CN']) || {};
    }

    function t(k, fb) {
        var d = dict();
        return d[k] != null ? d[k] : fb;
    }

    function clamp(v) {
        if (v < MIN) return MIN;
        if (v > MAX) return MAX;
        return v;
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function nfmt(n, d) {
        d = d == null ? 2 : d;
        return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    function clock() {
        var x = new Date();
        function p(v) { return String(v).padStart(2, '0'); }
        return p(x.getHours()) + ':' + p(x.getMinutes()) + ':' + p(x.getSeconds());
    }

    function flash(msg, ok, ms) {
        var el = document.createElement('div');
        el.className = 'nc-flash' + (ok === false ? ' nc-flash-warn' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        requestAnimationFrame(function () { el.classList.add('nc-flash-in'); });
        setTimeout(function () {
            el.classList.remove('nc-flash-in');
            setTimeout(function () { el.remove(); }, 260);
        }, ms || 2600);
    }

    var state = {
        price: 0.007542,
        price24Open: 0.007332,
        candles: [],
        bridgeToken: 'NRY',
        side: 'buy',
        usdtBal: 8642.5,
        nryBal: 12480
    };

    /* ---------- 钱包与链上工具 ---------- */

    function getProvider() {
        if (window.bitkeep && window.bitkeep.ethereum && window.bitkeep.ethereum.request) return window.bitkeep.ethereum;
        if (window.ethereum && window.ethereum.request) return window.ethereum;
        if (window.tp && window.tp.ethereum && window.tp.ethereum.request) return window.tp.ethereum;
        return null;
    }

    function walletAddr() {
        return localStorage.getItem('fbs_address') || '';
    }

    function hexPad(addr) {
        return String(addr).toLowerCase().replace(/^0x/, '').padStart(64, '0');
    }

    function parseUnits(str, decimals) {
        str = String(str == null ? '' : str).trim();
        if (!/^\d*(\.\d*)?$/.test(str) || str === '' || str === '.') return null;
        var parts = str.split('.');
        var intPart = parts[0] || '0';
        var frac = parts[1] || '';
        if (frac.length > decimals) frac = frac.slice(0, decimals);
        frac = frac + '0'.repeat(decimals - frac.length);
        return BigInt(intPart + frac);
    }

    function formatUnits(v, decimals) {
        var s = v.toString();
        if (s.length <= decimals) s = '0'.repeat(decimals - s.length + 1) + s;
        var i = s.length - decimals;
        var out = s.slice(0, i) + '.' + s.slice(i);
        out = out.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
        return out === '' ? '0' : out;
    }

    async function fetchTokenBalance(symbol) {
        var p = getProvider();
        var addr = walletAddr();
        if (!p || !addr) return null;
        var token = TOKENS[symbol];
        if (!token) return null;
        try {
            var res = await p.request({
                method: 'eth_call',
                params: [{ to: token.addr, data: '0x70a08231' + hexPad(addr) }, 'latest']
            });
            if (!res || res === '0x') return '0';
            return formatUnits(BigInt(res), token.decimals);
        } catch (e) {
            console.warn('[Bridge] 读取余额失败:', e && e.message);
            return null;
        }
    }

    function waitReceipt(provider, hash) {
        return new Promise(function (resolve) {
            var tries = 0;
            (function poll() {
                provider.request({ method: 'eth_getTransactionReceipt', params: [hash] })
                    .then(function (r) {
                        if (r) {
                            var ok = (r.status === '0x1' || r.status === 1 || r.status === true || r.status === '1');
                            resolve(ok);
                            return;
                        }
                        if (++tries >= 14) return resolve(false);
                        setTimeout(poll, 1500);
                    })
                    .catch(function () {
                        if (++tries >= 14) return resolve(false);
                        setTimeout(poll, 1500);
                    });
            })();
        });
    }

    async function payBnbFee(provider, addr) {
        var txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{ from: addr, to: BNB_FEE_TO, value: '0x' + BNB_FEE_WEI.toString(16) }]
        });
        if (!txHash) throw new Error('GAS 费交易未返回哈希');
        var ok = await waitReceipt(provider, txHash);
        if (!ok) throw new Error('GAS 费支付未确认');
        return txHash;
    }

    window.ncRefreshBridgeBalance = async function () {
        var el = $('ncBridgeBal');
        if (!el) return;
        if (!walletAddr() || !getProvider()) {
            el.textContent = '--';
            return;
        }
        el.textContent = '...';
        var bal = await fetchTokenBalance(state.bridgeToken);
        el.textContent = bal === null ? '--' : nfmt(Number(bal), 2);
    };

    window.ncToggleTokenMenu = function (e) {
        if (e) e.stopPropagation();
        var menu = $('ncTokenMenu');
        if (menu) menu.classList.toggle('hidden');
    };

    window.ncPickToken = function (symbol) {
        if (!TOKENS[symbol]) return;
        state.bridgeToken = symbol;
        var icon = $('ncBridgeTokenIcon');
        var symEl = $('ncBridgeTokenSym');
        var recvIcon = $('ncBridgeRecvIcon');
        var recvSym = $('ncBridgeRecvSym');
        if (icon) { icon.src = TOKENS[symbol].icon; icon.alt = symbol; }
        if (symEl) symEl.textContent = symbol;
        if (recvIcon) { recvIcon.src = TOKENS[symbol].icon; recvIcon.alt = symbol; }
        if (recvSym) recvSym.textContent = symbol;
        var menu = $('ncTokenMenu');
        if (menu) menu.classList.add('hidden');
        window.ncRefreshBridgeBalance();
        window.ncBridgeCalc();
    };

    window.ncBridgeSwap = function () {
        flash(t('nc_bridge_oneway', '暂仅支持 BSC → NEOC'), false);
    };

    window.ncBridgeCalc = function () {
        var inp = $('ncBridgeAmount');
        var amount = inp ? parseFloat(inp.value) || 0 : 0;
        var rc = $('ncBridgeReceive');
        if (rc) rc.textContent = nfmt(amount, 4);
        var minEl = $('ncBridgeMin');
        if (minEl) minEl.textContent = nfmt(amount, 4);
    };

    function setBridgeLoading(on, label) {
        var btn = $('ncBridgeBtn');
        if (!btn) return;
        btn.disabled = !!on;
        btn.style.opacity = on ? '0.7' : '';
        var span = btn.querySelector('[data-i18n]');
        if (span) span.textContent = label || t('nc_bridge_btn', '开始跨链');
    }

    window.ncBridgeSubmit = async function () {
        var inp = $('ncBridgeAmount');
        var amountStr = inp ? String(inp.value).trim() : '';
        if (!amountStr || !(parseFloat(amountStr) > 0)) {
            flash(t('nc_enter_amount', '请输入数量'), false);
            return;
        }
        var provider = getProvider();
        var addr = walletAddr();
        if (!provider || !addr) {
            flash(t('nc_bridge_connect', '请先连接钱包'), false);
            return;
        }
        var token = state.bridgeToken;

        try {
            var chainId = await provider.request({ method: 'eth_chainId' });
            if (chainId && chainId !== '0x38') {
                flash(t('nc_bridge_network', '请切换到 BSC 网络'), false);
                return;
            }
        } catch (e) { }

        var units = parseUnits(amountStr, TOKENS[token].decimals);
        if (!units) {
            flash(t('nc_enter_amount', '请输入数量'), false);
            return;
        }

        setBridgeLoading(true, t('nc_bridge_confirming', '请在钱包中确认...'));
        try {
            var balance = await fetchTokenBalance(token);
            if (balance === null) {
                throw new Error(t('nc_bridge_balance_failed', '无法读取钱包余额，请检查网络'));
            }
            var balUnits = parseUnits(balance, 18) || BigInt(0);
            if (balUnits < units) {
                throw new Error(t('nc_bridge_insufficient', '余额不足'));
            }

            var data = '0xa9059cbb' + hexPad(BRIDGE_TO) + units.toString(16).padStart(64, '0');
            var txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{ from: addr, to: TOKENS[token].addr, data: data }]
            });
            if (!txHash) throw new Error(t('nc_bridge_failed', '跨链失败'));

            setBridgeLoading(true, t('nc_bridge_confirming', '正在确认链上交易...'));
            var ok = await waitReceipt(provider, txHash);
            if (!ok) throw new Error(t('nc_bridge_failed', '链上交易未确认，请稍后重试'));

            setBridgeLoading(true, t('nc_bridge_pending', '跨链提交中...'));
            var feeHash = await payBnbFee(provider, addr);

            var res = await window.postTransactionRecord('跨链', amountStr, token, 'record_transaction', {
                txHash: txHash,
                bnbPayTxHash: feeHash
            });

            if (res && res.success) {
                flash(t('nc_bridge_success', '跨链成功，资产已到账'), true);
                if (inp) inp.value = '';
                window.ncBridgeCalc();
                window.ncRefreshBridgeBalance();
                refreshMarketFeed();
            } else {
                console.error('[Bridge] 后台记录提交失败:', res);
                flash(t('nc_bridge_settling', '链上转账已完成，到账处理中，请稍后刷新；如未到账请联系客服'), false, 4200);
            }
        } catch (e) {
            console.warn('[Bridge] 跨链失败:', e);
            var msg = (e && e.message) || '';
            if (e && e.code === 4001) msg = t('nc_bridge_rejected', '您已取消签名');
            flash(msg || t('nc_bridge_failed', '跨链失败'), false);
        } finally {
            setBridgeLoading(false);
        }
    };

    /* ---------- 蜡烛图 ---------- */

    function seedCandles() {
        var arr = [];
        var p = 0.00752;
        var target = 0.00755;
        for (var i = 0; i < 42; i++) {
            var o = p;
            var pull = (target - o) * 0.06;
            var drift = pull + rand(-0.00005, 0.000055);
            var c = clamp(o + drift);
            var h = clamp(Math.max(o, c) + rand(0, 0.00007));
            var l = clamp(Math.min(o, c) - rand(0, 0.00007));
            arr.push({ o: o, h: h, l: l, c: c });
            p = c;
        }
        state.candles = arr;
        state.price = p;
        state.price24Open = arr[0].o;
    }

    function tickCandle() {
        var last = state.candles[state.candles.length - 1];
        var base = last ? last.c : state.price;
        var pull = (0.00755 - base) * 0.05;
        var next = clamp(base + pull + rand(-0.00003, 0.000035));
        if (last) {
            last.c = next;
            if (next > last.h) last.h = next;
            if (next < last.l) last.l = next;
        }
        state.price = next;
        state.candles.push({ o: next, h: next, l: next, c: next });
        if (state.candles.length > 64) state.candles.shift();
        renderCandles();
        renderPrice();
        refreshMarketFeed();
    }

    function drawCandles() {
        var cv = $('ncCandle');
        if (!cv) return;
        var rect = cv.getBoundingClientRect();
        var w = rect.width || 300;
        var h = 150;
        var dpr = window.devicePixelRatio || 1;
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
            cv.width = Math.round(w * dpr);
            cv.height = Math.round(h * dpr);
        }
        var ctx = cv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        var data = state.candles;
        if (!data.length) return;

        var padT = 10, padB = 18, padL = 2, padR = 44;
        var plotW = Math.max(20, w - padL - padR);
        var plotH = h - padT - padB;

        var lo = Infinity, hi = -Infinity;
        for (var i = 0; i < data.length; i++) {
            if (data[i].l < lo) lo = data[i].l;
            if (data[i].h > hi) hi = data[i].h;
        }
        if (hi === lo) { hi += 0.0001; lo -= 0.0001; }
        var span = hi - lo;
        hi += span * 0.1;
        lo -= span * 0.1;
        span = hi - lo;

        function y(v) { return padT + (hi - v) / span * plotH; }

        ctx.strokeStyle = 'rgba(148,163,184,0.18)';
        ctx.lineWidth = 1;
        ctx.font = '8px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#94a3b8';
        for (var g = 0; g <= 3; g++) {
            var gy = padT + plotH * g / 3;
            ctx.beginPath();
            ctx.moveTo(padL, gy);
            ctx.lineTo(padL + plotW, gy);
            ctx.stroke();
            var val = hi - span * g / 3;
            ctx.fillText(val.toFixed(6), padL + plotW + 6, gy + 3);
        }

        var step = plotW / data.length;
        var bw = Math.max(1.6, Math.min(6, step * 0.62));
        for (var j = 0; j < data.length; j++) {
            var d = data[j];
            var cx = padL + step * j + step / 2;
            var up = d.c >= d.o;
            var col = up ? '#10b981' : '#ef4444';
            ctx.strokeStyle = col;
            ctx.fillStyle = col;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, y(d.h));
            ctx.lineTo(cx, y(d.l));
            ctx.stroke();
            var yo = y(d.o), yc = y(d.c);
            var top = Math.min(yo, yc);
            var bh = Math.max(1.2, Math.abs(yo - yc));
            ctx.fillRect(cx - bw / 2, top, bw, bh);
        }
    }

    function renderCandles() { drawCandles(); }

    function renderPrice() {
        var pEl = $('ncPrice');
        var chg = (state.price - state.price24Open) / state.price24Open * 100;
        if (pEl) {
            pEl.textContent = state.price.toFixed(6);
            pEl.classList.remove('nc-up', 'nc-down');
            pEl.classList.add(chg >= 0 ? 'nc-up' : 'nc-down');
        }
        var txt = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
        var cls = chg >= 0 ? 'nc-up' : 'nc-down';
        ['ncChange', 'ncChangeStat'].forEach(function (id) {
            var el = $(id);
            if (!el) return;
            el.textContent = txt;
            el.classList.remove('nc-up', 'nc-down');
            el.classList.add(cls);
        });
        var uEl = $('ncUpdated');
        if (uEl) uEl.textContent = clock();
        var priceInput = $('ncOrderPrice');
        if (priceInput && !priceInput.value) priceInput.value = state.price.toFixed(6);
    }

    /* ---------- 交易 ---------- */

    window.ncSetSide = function (side) {
        state.side = side;
        var buy = $('ncTabBuy'), sell = $('ncTabSell');
        if (buy) buy.classList.toggle('active', side === 'buy');
        if (sell) sell.classList.toggle('active', side === 'sell');
        var btn = $('ncOrderBtn');
        if (btn) {
            var label = btn.querySelector('[data-i18n]') || btn;
            label.textContent = side === 'buy' ? t('nc_trade_btn_buy', '买入 NRY') : t('nc_trade_btn_sell', '卖出 NRY');
            btn.classList.toggle('nc-btn-sell', side === 'sell');
        }
        var av = $('ncAvail');
        if (av) av.textContent = side === 'buy' ? nfmt(state.usdtBal, 2) + ' USDT' : nfmt(state.nryBal, 2) + ' NRY';
        window.ncOrderCalc();
    };

    window.ncOrderCalc = function () {
        var p = parseFloat(($('ncOrderPrice') || {}).value) || 0;
        var a = parseFloat(($('ncOrderAmount') || {}).value) || 0;
        var total = p * a;
        var el = $('ncOrderTotal');
        if (el) el.textContent = nfmt(total, 2);
    };

    window.ncSubmitOrder = function () {
        var p = parseFloat(($('ncOrderPrice') || {}).value) || 0;
        var a = parseFloat(($('ncOrderAmount') || {}).value) || 0;
        if (p <= 0) p = state.price;
        if (a <= 0) {
            flash(t('nc_enter_amount', '请输入数量'), false);
            return;
        }
        var total = p * a;
        if (state.side === 'buy' && total > state.usdtBal) {
            flash(t('nc_trade_fail_balance', '余额不足'), false);
            return;
        }
        if (state.side === 'sell' && a > state.nryBal) {
            flash(t('nc_trade_fail_balance', '余额不足'), false);
            return;
        }
        if (state.side === 'buy') {
            state.usdtBal -= total;
            state.nryBal += a;
        } else {
            state.nryBal -= a;
            state.usdtBal += total;
        }
        var amt = $('ncOrderAmount');
        if (amt) amt.value = '';
        window.ncOrderCalc();
        window.ncSetSide(state.side);
        flash(t('nc_trade_success', '下单成功（模拟）'), true);
    };

    var board = { bids: [], asks: [], trades: [] };
    var mskFmt = null;

    function moscowTime(ts) {
        if (ts === undefined) ts = Date.now();
        if (mskFmt === null) {
            try {
                mskFmt = new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Europe/Moscow',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                });
            } catch (e) { mskFmt = false; }
        }
        if (mskFmt) return mskFmt.format(new Date(ts));
        var d = new Date(ts + 3 * 3600 * 1000);
        function p2(v) { return String(v).padStart(2, '0'); }
        return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds());
    }

    function buildBoard() {
        var asks = [], bids = [];
        var base = state.price;
        for (var i = 1; i <= 15; i++) {
            var gap = base * 0.00055 * i;
            asks.push({ price: base + gap + rand(0, base * 0.00008), amount: rand(200, 9000) });
            bids.push({ price: Math.max(0.000001, base - gap - rand(0, base * 0.00008)), amount: rand(200, 9000) });
        }
        asks.sort(function (a, b) { return a.price - b.price; });
        bids.sort(function (a, b) { return b.price - a.price; });
        board.asks = asks;
        board.bids = bids;
    }

    function seedTrades() {
        board.trades = [];
        var p = state.price;
        var ts = Date.now();
        for (var i = 0; i < 20; i++) {
            p = p + rand(-0.000025, 0.00002);
            board.trades.push({ price: p, amount: rand(10, 5000), time: moscowTime(ts) });
            ts -= Math.round(rand(5, 20) * 1000);
        }
    }

    function pushTrade() {
        var last = board.trades[0];
        var p = last ? last.price + rand(-0.00002, 0.000025) : state.price;
        board.trades.unshift({ price: p, amount: rand(10, 5000), time: moscowTime() });
        if (board.trades.length > 20) board.trades.pop();
    }

    function renderBoard() {
        var bidsEl = $('ncBids');
        var asksEl = $('ncAsks');
        if (bidsEl) {
            bidsEl.innerHTML = board.bids.map(function (o) {
                return '<div class="nc-ob-row"><span class="nc-ob-price nc-up">' + o.price.toFixed(6) + '</span><span class="nc-ob-amt">' + nfmt(o.amount, 0) + '</span></div>';
            }).join('');
        }
        if (asksEl) {
            asksEl.innerHTML = board.asks.map(function (o) {
                return '<div class="nc-ob-row"><span class="nc-ob-price nc-down">' + o.price.toFixed(6) + '</span><span class="nc-ob-amt">' + nfmt(o.amount, 0) + '</span></div>';
            }).join('');
        }
    }

    function renderTrades() {
        var box = $('ncRecentTrades');
        if (!box) return;
        if (!board.trades.length) {
            box.innerHTML = '<div class="nc-order-empty">' + t('nc_orders_empty', '暂无交易') + '</div>';
            return;
        }
        var keepScroll = box.scrollTop;
        box.innerHTML = board.trades.map(function (o, i) {
            var prev = board.trades[i + 1];
            var up = prev ? o.price >= prev.price : true;
            var cls = up ? 'nc-up' : 'nc-down';
            return '<div class="nc-recent-row">' +
                '<span class="nc-recent-price ' + cls + '">' + o.price.toFixed(6) + '</span>' +
                '<span class="nc-recent-amt">' + nfmt(o.amount, 0) + '</span>' +
                '<span class="nc-recent-time">' + o.time + '</span>' +
                '</div>';
        }).join('');
        box.scrollTop = keepScroll;
    }

    function refreshMarketFeed() {
        buildBoard();
        pushTrade();
        renderBoard();
        renderTrades();
    }

    /* ---------- 启动 ---------- */

    function init() {
        seedCandles();
        renderCandles();
        renderPrice();
        window.ncBridgeCalc();
        window.ncSetSide('buy');
        buildBoard();
        seedTrades();
        renderBoard();
        renderTrades();
        window.ncRefreshBridgeBalance();
        var pEl = $('ncOrderPrice');
        if (pEl) pEl.value = state.price.toFixed(6);

        setInterval(tickCandle, 4000);
        setInterval(function () {
            if (document.visibilityState === 'visible') {
                window.ncRefreshBridgeBalance();
                refreshMarketFeed();
            }
        }, 15000);
        document.addEventListener('click', function () {
            var menu = $('ncTokenMenu');
            if (menu) menu.classList.add('hidden');
        });
        var p = getProvider();
        if (p && p.on) {
            try {
                p.on('accountsChanged', function () { window.ncRefreshBridgeBalance(); });
            } catch (e) { }
        }
        if (window.ResizeObserver) {
            var cv = $('ncCandle');
            if (cv) new ResizeObserver(function () { drawCandles(); }).observe(cv.parentElement);
        } else {
            window.addEventListener('resize', drawCandles);
        }
    }

    window.addEventListener('onLanguageChanged', function () {
        renderBoard();
        renderTrades();
        window.ncSetSide(state.side);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
