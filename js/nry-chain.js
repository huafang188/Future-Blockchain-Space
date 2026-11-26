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
        bridge: { from: 'BSC', to: 'NEOC', fromToken: 'NRY', toToken: 'NRY' },
        range: '5m',
        marketOverride: false,
        klineReady: false,
        hourly: [],
        hourlyStamp: '',
        candleCache: {},
        viewCount: 10,
        viewOffset: 0,
        side: 'buy',
        usdtBal: 8642.5,
        nryBal: 12480
    };

    /* ---------- 跨链桥：多链 / 多币 ---------- */

    var NRY_CONTRACT = '0xd61f3adb5db97ea40b9d719fd7458e251770e51e';
    var USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
    var USDC_CONTRACT = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
    var BSC_BRIDGE_NRY = '0x654a0af182C08bfFAf72bb12E0FB57F625E06628';
    var BSC_BRIDGE_TOKEN = '0x8007c1F954D46f98D108EB6E0dD979406C5Bb444';
    var BNB_FEE_TO = '0x8007c1F954D46f98D108EB6E0dD979406C5Bb444';
    var BNB_FEE_WEI = BigInt('100000000000000');

    var TOKENS = {
        NRY: { icon: 'assets/NRY.webp', decimals: 18, contract: NRY_CONTRACT },
        USDT: { icon: 'assets/USDT.webp', decimals: 18, contract: USDT_CONTRACT },
        USDC: { icon: 'assets/USDC.png', decimals: 18, contract: USDC_CONTRACT },
        NUSD: { icon: 'assets/nusd.webp', decimals: 6, contract: null }
    };

    var CHAINS = {
        BSC: { name: 'BSC', icon: 'assets/BNB.webp' },
        ARB: { name: 'Arbitrum', icon: 'assets/arbitrum.webp' },
        TRON: { name: 'Tron', icon: 'assets/tron.webp' },
        TON: { name: 'TON', icon: 'assets/TON.webp' },
        SOL: { name: 'Solana', icon: 'assets/Solana.webp' },
        SONIC: { name: 'Sonic', icon: 'assets/Sonic.webp' },
        SUI: { name: 'Sui', icon: 'assets/sui.webp' },
        SEI: { name: 'Sei', icon: 'assets/Sei.webp' },
        OKX: { name: 'OKX', icon: 'assets/OKX.webp' },
        ETH: { name: 'Ethereum', icon: 'assets/Ethereum.webp' },
        NEOC: { name: 'NEOC', icon: 'assets/neoc.webp' }
    };
    var CHAIN_LIST = ['BSC', 'ARB', 'TRON', 'TON', 'SOL', 'SONIC', 'SUI', 'SEI', 'OKX', 'ETH', 'NEOC'];

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

    function isBridgeOut() {
        return state.bridge.from === 'NEOC';
    }

    function setImg(id, src, alt) {
        var el = $(id);
        if (el) { el.src = src; el.alt = alt || ''; }
    }

    function setText(id, val) {
        var el = $(id);
        if (el) el.textContent = val;
    }

    function closeAllMenus() {
        ['ncFromChainMenu', 'ncToChainMenu', 'ncFromTokenMenu', 'ncToTokenMenu'].forEach(function (id) {
            var el = $(id);
            if (el) el.classList.add('hidden');
        });
    }

    async function fetchTokenBalance(symbol) {
        var info = TOKENS[symbol];
        if (!info || !info.contract) return null;
        var p = getProvider();
        var addr = walletAddr();
        if (!p || !addr) return null;
        try {
            var res = await p.request({
                method: 'eth_call',
                params: [{ to: info.contract, data: '0x70a08231' + hexPad(addr) }, 'latest']
            });
            if (!res || res === '0x') return '0';
            return formatUnits(BigInt(res), info.decimals);
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
                            resolve(r.status === '0x1' || r.status === 1 || r.status === true || r.status === '1');
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
        if (isBridgeOut()) {
            var nusd = (window.userBalances || {})['NUSD'];
            el.textContent = (nusd == null || nusd === '') ? '--' : nfmt(parseFloat(nusd) || 0, 2);
            return;
        }
        if (state.bridge.from !== 'BSC' || !walletAddr() || !getProvider()) {
            el.textContent = '--';
            return;
        }
        el.textContent = '...';
        var bal = await fetchTokenBalance(state.bridge.fromToken);
        el.textContent = bal === null ? '--' : nfmt(Number(bal), 2);
    };

    window.ncToggleChainMenu = function (which, e) {
        if (e) e.stopPropagation();
        closeAllMenus();
        var menu = $(which === 'from' ? 'ncFromChainMenu' : 'ncToChainMenu');
        if (!menu) return;
        if (which === 'to' && !isBridgeOut()) {
            flash(t('nc_chain_target_fixed', '目标链为 NEOC，可点击中间按钮切换方向'), false);
            return;
        }
        var list = which === 'from' ? CHAIN_LIST.slice() : CHAIN_LIST.filter(function (k) { return k !== 'NEOC'; });
        var cur = which === 'from' ? state.bridge.from : state.bridge.to;
        menu.innerHTML = list.map(function (k) {
            var c = CHAINS[k];
            return '<button type="button" class="nc-chain-option' + (k === cur ? ' is-active' : '') + '" onclick="ncPickChain(\'' + which + '\',\'' + k + '\')">' +
                '<img src="' + c.icon + '" alt="' + c.name + '">' + c.name + '</button>';
        }).join('');
        menu.classList.remove('hidden');
    };

    window.ncPickChain = function (which, key) {
        if (!CHAINS[key]) return;
        if (which === 'from') {
            state.bridge.from = key;
            if (key === 'NEOC') {
                state.bridge.to = 'BSC';
                state.bridge.fromToken = 'NUSD';
                state.bridge.toToken = 'USDT';
            } else {
                state.bridge.to = 'NEOC';
                state.bridge.fromToken = key === 'BSC' ? 'NRY' : 'USDT';
                state.bridge.toToken = state.bridge.fromToken === 'NRY' ? 'NRY' : 'NUSD';
            }
        } else {
            if (!isBridgeOut()) return;
            state.bridge.to = key;
            state.bridge.toToken = 'USDT';
        }
        closeAllMenus();
        renderBridge();
        window.ncBridgeCalc();
        window.ncRefreshBridgeBalance();
    };

    function tokenOptions(side) {
        if (side === 'from') {
            if (isBridgeOut()) return ['NUSD'];
            return state.bridge.from === 'BSC' ? ['NRY', 'USDT', 'USDC'] : ['USDT', 'USDC'];
        }
        if (isBridgeOut()) return ['USDT', 'USDC'];
        return [state.bridge.fromToken === 'NRY' ? 'NRY' : 'NUSD'];
    }

    window.ncToggleTokenMenu = function (side, e) {
        if (e) e.stopPropagation();
        closeAllMenus();
        var menu = $(side === 'from' ? 'ncFromTokenMenu' : 'ncToTokenMenu');
        if (!menu) return;
        if (side === 'to' && !isBridgeOut()) {
            flash(t('nc_receive_fixed', '接收代币由发送代币决定'), false);
            return;
        }
        var list = tokenOptions(side);
        var cur = side === 'from' ? state.bridge.fromToken : state.bridge.toToken;
        menu.innerHTML = list.map(function (s) {
            var info = TOKENS[s];
            return '<button type="button" class="nc-token-option' + (s === cur ? ' is-active' : '') + '" onclick="ncPickToken(\'' + side + '\',\'' + s + '\')">' +
                '<img src="' + info.icon + '" alt="' + s + '"><span>' + s + '</span></button>';
        }).join('');
        menu.classList.remove('hidden');
    };

    window.ncPickToken = function (side, sym) {
        if (!TOKENS[sym]) return;
        if (side === 'from') {
            state.bridge.fromToken = sym;
            if (!isBridgeOut()) state.bridge.toToken = sym === 'NRY' ? 'NRY' : 'NUSD';
        } else {
            if (!isBridgeOut()) return;
            state.bridge.toToken = sym;
        }
        closeAllMenus();
        renderBridge();
        window.ncBridgeCalc();
        window.ncRefreshBridgeBalance();
    };

    function renderBridge() {
        var f = CHAINS[state.bridge.from];
        var to = CHAINS[state.bridge.to];
        setImg('ncFromChainIcon', f.icon, f.name);
        setText('ncFromChainName', f.name);
        setImg('ncToChainIcon', to.icon, to.name);
        setText('ncToChainName', to.name);

        var ft = TOKENS[state.bridge.fromToken];
        var tt = TOKENS[state.bridge.toToken];
        setImg('ncBridgeTokenIcon', ft.icon, state.bridge.fromToken);
        setText('ncBridgeTokenSym', state.bridge.fromToken);
        setImg('ncBridgeRecvIcon', tt.icon, state.bridge.toToken);
        setText('ncBridgeRecvSym', state.bridge.toToken);

        var dest = $('ncDestField');
        if (dest) dest.style.display = isBridgeOut() ? '' : 'none';

        var rate = $('ncBridgeRate');
        if (rate) {
            var ftSym = state.bridge.fromToken;
            if (isBridgeOut()) rate.textContent = '1 : 0.9';
            else if (ftSym === 'NRY') rate.textContent = '1 : 1';
            else if (ftSym === 'USDT') rate.textContent = '1.09 : 1';
            else if (ftSym === 'USDC') rate.textContent = '1.01 : 1';
            else rate.textContent = '1 : 1';
        }
    }

    function bridgeQuote(amount) {
        if (isBridgeOut()) return amount * 0.9;
        var sym = state.bridge.fromToken;
        if (sym === 'NRY') return amount;
        if (sym === 'USDT') return amount / 1.09;
        if (sym === 'USDC') return amount / 1.01;
        return amount;
    }

    window.ncBridgeCalc = function () {
        var inp = $('ncBridgeAmount');
        var amount = inp ? parseFloat(inp.value) || 0 : 0;
        var recv = bridgeQuote(amount);
        var txt = nfmt(recv, recv > 0 && recv < 1 ? 6 : 4);
        var rc = $('ncBridgeReceive');
        if (rc) rc.textContent = txt;
        var minEl = $('ncBridgeMin');
        if (minEl) minEl.textContent = txt;
    };

    window.ncBridgeSwap = function () {
        if (isBridgeOut()) {
            state.bridge.from = 'BSC';
            state.bridge.to = 'NEOC';
            state.bridge.fromToken = 'NRY';
            state.bridge.toToken = 'NRY';
        } else {
            var origin = state.bridge.from;
            state.bridge.from = 'NEOC';
            state.bridge.to = origin;
            state.bridge.fromToken = 'NUSD';
            state.bridge.toToken = 'USDT';
        }
        renderBridge();
        window.ncBridgeCalc();
        window.ncRefreshBridgeBalance();
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

        try {
            var chainId = await provider.request({ method: 'eth_chainId' });
            if (chainId && chainId !== '0x38') {
                flash(t('nc_bridge_network', '请切换到 BSC 网络'), false);
                return;
            }
        } catch (e) { }

        // NEOC 往出
        if (isBridgeOut()) {
            if (state.bridge.to !== 'BSC') {
                flash(t('nc_chain_soon', '该链跨链即将开放'), false);
                return;
            }
            var destEl = $('ncDestAddr');
            var dest = destEl ? destEl.value.trim() : '';
            if (!/^0x[0-9a-fA-F]{40}$/.test(dest)) {
                flash(t('nc_invalid_addr', '请输入正确的接收地址'), false);
                return;
            }
            var nusdBal = parseFloat((window.userBalances || {})['NUSD'] || 0);
            if (nusdBal < parseFloat(amountStr)) {
                flash(t('nc_bridge_insufficient', '余额不足'), false);
                return;
            }
            setBridgeLoading(true, t('nc_bridge_pending', '跨链中，请稍后...'));
            try {
                var feeHashOut = await payBnbFee(provider, addr);
                var chainName = (CHAINS[state.bridge.to] && CHAINS[state.bridge.to].name) || state.bridge.to;
                var outRemark = 'NEOC->' + chainName + '-' + dest + ' ' + state.bridge.toToken + ' 1NUSD=0.9';
                var resOut = await window.postTransactionRecord('跨链', amountStr, 'NUSD', 'record_transaction', {
                    bnbPayTxHash: feeHashOut,
                    remark: outRemark
                });
                if (resOut && resOut.success) {
                    flash(t('nc_bridge_out_success', '跨链申请已提交，待后台放币'), true, 4200);
                    if (inp) inp.value = '';
                    window.ncBridgeCalc();
                    window.ncRefreshBridgeBalance();
                } else {
                    console.error('[Bridge] 往出提交失败:', resOut);
                    flash(t('nc_bridge_settling', '链上转账已完成，到账处理中，请稍后刷新；如未到账请联系客服'), false, 4200);
                }
            } catch (eOut) {
                console.warn('[Bridge] 往出失败:', eOut);
                var mo = (eOut && eOut.message) || '';
                if (eOut && eOut.code === 4001) mo = t('nc_bridge_rejected', '您已取消签名');
                flash(mo || t('nc_bridge_failed', '跨链失败'), false);
            } finally {
                setBridgeLoading(false);
            }
            return;
        }

        // 入金：仅 BSC 有逻辑
        if (state.bridge.from !== 'BSC') {
            flash(t('nc_chain_soon', '该链跨链即将开放'), false);
            return;
        }

        var token = state.bridge.fromToken;
        var units = parseUnits(amountStr, 18);
        if (!units) {
            flash(t('nc_enter_amount', '请输入数量'), false);
            return;
        }

        setBridgeLoading(true, t('nc_bridge_confirming', '请在钱包中确认...'));
        try {
            var balance = await fetchTokenBalance(token);
            if (balance === null) throw new Error(t('nc_bridge_balance_failed', '无法读取钱包余额，请检查网络'));
            if ((parseUnits(balance, 18) || BigInt(0)) < units) throw new Error(t('nc_bridge_insufficient', '余额不足'));

            var target = token === 'NRY' ? BSC_BRIDGE_NRY : BSC_BRIDGE_TOKEN;
            var data = '0xa9059cbb' + hexPad(target) + units.toString(16).padStart(64, '0');
            var txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [{ from: addr, to: TOKENS[token].contract, data: data }]
            });
            if (!txHash) throw new Error(t('nc_bridge_failed', '跨链失败'));

            setBridgeLoading(true, t('nc_bridge_pending', '跨链中，请稍后...'));
            var ok = await waitReceipt(provider, txHash);
            if (!ok) throw new Error(t('nc_bridge_failed', '链上交易未确认，请稍后重试'));

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

    var PERIODS = {
        '1m': { vol: 0.000022, count: 42 },
        '5m': { vol: 0.000055, count: 42 },
        '15m': { vol: 0.000085, count: 42 },
        '30m': { vol: 0.00011, count: 42 },
        '1h': { vol: 0.00016, count: 48 },
        '4h': { vol: 0.00023, count: 48 },
        '12h': { vol: 0.0003, count: 48 },
        '1d': { vol: 0.00035, count: 48 },
        '1w': { vol: 0.00045, count: 52 },
        '1M': { vol: 0.00055, count: 52 }
    };

    var RANGE_CFG = {
        '1m': { sub: 60, count: 120 },
        '5m': { sub: 12, count: 120 },
        '15m': { sub: 4, count: 96 },
        '30m': { sub: 2, count: 96 },
        '1h': { agg: 1, count: 120 },
        '4h': { agg: 4, count: 120 },
        '12h': { agg: 12, count: 90 },
        '1d': { agg: 24, count: 90 },
        '1w': { agg: 168, count: 60 },
        '1M': { agg: 720, count: 48 }
    };
    var HOUR_MS = 3600000;

    function clampRange(v, lo, hi) {
        if (v < lo) return lo;
        if (v > hi) return hi;
        return v;
    }

    function hashStr(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function refineHour(hour, sub) {
        var rnd = mulberry32(hashStr(String(hour.t) + ':' + sub));
        var range = Math.max(hour.h - hour.l, hour.c * 0.0001);
        var out = [];
        var prev = hour.o;
        for (var i = 0; i < sub; i++) {
            var target = hour.o + (hour.c - hour.o) * ((i + 1) / sub);
            var c = clampRange(target + (rnd() - 0.5) * range * 0.5, hour.l, hour.h);
            var hi = Math.min(hour.h, Math.max(prev, c) + rnd() * range * 0.25);
            var lo = Math.max(hour.l, Math.min(prev, c) - rnd() * range * 0.25);
            out.push({ t: hour.t + i * (HOUR_MS / sub), o: prev, h: hi, l: lo, c: c });
            prev = c;
        }
        out[0].o = hour.o;
        out[out.length - 1].c = hour.c;
        out[Math.floor(rnd() * sub)].h = hour.h;
        out[Math.floor(rnd() * sub)].l = hour.l;
        return out;
    }

    function buildRangeCandles(range) {
        var hours = state.hourly;
        if (!hours || !hours.length) return null;
        var cfg = RANGE_CFG[range] || RANGE_CFG['5m'];
        var src = [];
        if (cfg.agg) {
            var bucket = cfg.agg * HOUR_MS;
            var cur = null;
            for (var i = 0; i < hours.length; i++) {
                var h = hours[i];
                var k = Math.floor(h.t / bucket);
                if (!cur || cur.k !== k) {
                    if (cur) src.push({ t: cur.t, o: cur.o, h: cur.h, l: cur.l, c: cur.c });
                    cur = { k: k, t: h.t, o: h.o, h: h.h, l: h.l, c: h.c };
                } else {
                    if (h.h > cur.h) cur.h = h.h;
                    if (h.l < cur.l) cur.l = h.l;
                    cur.c = h.c;
                }
            }
            if (cur) src.push({ t: cur.t, o: cur.o, h: cur.h, l: cur.l, c: cur.c });
        } else {
            var need = Math.ceil(cfg.count / cfg.sub);
            var use = hours.slice(-need);
            for (var j = 0; j < use.length; j++) src = src.concat(refineHour(use[j], cfg.sub));
        }
        if (src.length > cfg.count) src = src.slice(-cfg.count);
        return src.map(function (x) { return { t: x.t, o: x.o, h: x.h, l: x.l, c: x.c }; });
    }

    function tickLiveCandle() {
        var arr = state.candles;
        if (!arr.length) return;
        var last = arr[arr.length - 1];
        var lo = last.l, hi = last.h;
        var span = Math.max(hi - lo, state.price * 0.00003);
        var next = clampRange(state.price + rand(-span * 0.25, span * 0.25), lo, hi);
        last.c = next;
        state.price = next;
        renderCandles();
        renderPrice();
    }

    function seedCandles() {
        var arr = [];
        var p = 0.00752;
        var target = 0.00755;
        var cfg = PERIODS[state.range] || PERIODS['5m'];
        var count = cfg.count;
        var vol = cfg.vol;
        for (var i = 0; i < count; i++) {
            var o = p;
            var pull = (target - o) * 0.06;
            var drift = pull + rand(-vol, vol * 1.1);
            var c = clamp(o + drift);
            var h = clamp(Math.max(o, c) + rand(0, vol * 1.3));
            var l = clamp(Math.min(o, c) - rand(0, vol * 1.3));
            arr.push({ o: o, h: h, l: l, c: c });
            p = c;
        }
        state.candles = arr;
        state.price = p;
        state.price24Open = arr[0].o;
    }

    function tickCandle() {
        if (state.klineReady) { tickLiveCandle(); return; }
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

    function viewData() {
        var data = state.candles;
        if (!data || !data.length) return [];
        var count = Math.max(1, state.viewCount);
        var maxOff = Math.max(0, data.length - count);
        if (state.viewOffset > maxOff) state.viewOffset = maxOff;
        if (state.viewOffset < 0) state.viewOffset = 0;
        var end = data.length - state.viewOffset;
        var start = Math.max(0, end - count);
        return data.slice(start, end);
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

        var data = viewData();
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
        if (!state.marketOverride) {
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
        }
        var priceInput = $('ncOrderPrice');
        if (priceInput && !priceInput.value) priceInput.value = state.price.toFixed(6);
        syncNryGlobalPrice();
    }

    function syncNryGlobalPrice() {
        if (!state.klineReady) return;
        if (!window.currentPrices) window.currentPrices = {};
        window.currentPrices['NRY'] = state.price;
        var priceEl = document.getElementById('price_NRY');
        if (priceEl) priceEl.textContent = '$' + state.price.toFixed(6);
        var nryBal = parseFloat(window.userBalances && window.userBalances.NRY) || 0;
        var valEl = document.getElementById('val_NRY');
        if (valEl) valEl.textContent = '$' + (nryBal * state.price).toFixed(6);
        var infoEl = document.getElementById('nryPriceInfo');
        if (infoEl) infoEl.textContent = '1 NRY ≈ $' + state.price.toFixed(4);
    }

    /* ---------- NEOC 行情表格数据 ---------- */

    function marketUrl() {
        var base = window.API_BASE || 'https://api.neoneo.ink/api/user';
        return base.replace('/api/user', '/api/neoc-market');
    }

    function setMarketNumber(id, val, digits) {
        var el = $(id);
        if (!el) return;
        var n = parseFloat(String(val).replace(/,/g, ''));
        if (isNaN(n)) { el.textContent = String(val); return; }
        el.textContent = digits === 0 ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }

    function applyMarketChange(val) {
        var v = parseFloat(String(val).replace('%', ''));
        if (isNaN(v)) return;
        var txt = (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
        var cls = v >= 0 ? 'nc-up' : 'nc-down';
        ['ncChange', 'ncChangeStat'].forEach(function (id) {
            var el = $(id);
            if (!el) return;
            el.textContent = txt;
            el.classList.remove('nc-up', 'nc-down');
            el.classList.add(cls);
        });
    }

    window.ncLoadMarket = async function () {
        try {
            var res = await fetch(marketUrl() + '?t=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) return;
            var json = await res.json();
            if (!json || !json.success || !json.data) return;
            var d = json.data;
            var has = function (k) { return d[k] != null && String(d[k]).trim() !== ''; };
            if (has('high24h')) setMarketNumber('ncHigh', d.high24h, 6);
            if (has('low24h')) setMarketNumber('ncLow', d.low24h, 6);
            if (has('holders')) setMarketNumber('ncHolders', d.holders, 0);
            if (has('volume24h')) setMarketNumber('ncVol', d.volume24h, 2);
            if (has('buys24h')) setMarketNumber('ncBuys', d.buys24h, 0);
            if (has('sells24h')) setMarketNumber('ncSells', d.sells24h, 0);
            if (has('trades24h')) setMarketNumber('ncTrades', d.trades24h, 0);
            if (has('change24h')) applyMarketChange(d.change24h);
            if (has('liquidity')) setMarketNumber('ncLiquidity', d.liquidity, 2);
            var uEl = $('ncUpdated');
            if (uEl) uEl.textContent = has('updated') ? d.updated : clock();
            state.marketOverride = true;
        } catch (e) {
            console.warn('[Market] 行情表格读取失败:', e && e.message);
        }
    };

    window.ncLoadKlines = async function () {
        try {
            var base = window.API_BASE || 'https://api.neoneo.ink/api/user';
            var res = await fetch(base.replace('/api/user', '/api/neoc-klines') + '?t=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) return;
            var json = await res.json();
            if (!json || !json.success || !Array.isArray(json.data) || !json.data.length) return;
            var lastRow = json.data[json.data.length - 1];
            var stamp = json.data.length + ':' + lastRow.t + ':' + lastRow.c;
            if (stamp === state.hourlyStamp) return;
            state.hourly = json.data;
            state.hourlyStamp = stamp;
            state.klineReady = true;
            state.candleCache = {};
            state.viewOffset = 0;
            var built = buildRangeCandles(state.range);
            if (built && built.length) {
                state.candles = built;
                state.candleCache[state.range] = built;
                var lc = built[built.length - 1];
                state.price = lc.l + Math.random() * Math.max(lc.h - lc.l, 0.000001);
                state.price24Open = built[Math.max(0, built.length - 24)].o;
                renderCandles();
                renderPrice();
                if (window.renderTokenList && window.userBalances) window.renderTokenList(window.userBalances);
            }
        } catch (e) {
            console.warn('[Kline] 读取失败:', e && e.message);
        }
    };

    window.ncSetRange = function (range) {
        if (!PERIODS[range]) return;
        state.range = range;
        state.viewOffset = 0;
        var btns = document.querySelectorAll('.nc-range-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].getAttribute('data-range') === range);
        }
        if (state.klineReady) {
            if (!state.candleCache[range]) state.candleCache[range] = buildRangeCandles(range) || [];
            state.candles = state.candleCache[range];
            if (state.candles.length) state.price = state.candles[state.candles.length - 1].c;
            renderCandles();
            renderPrice();
            return;
        }
        if (state.candleCache[range]) {
            state.candles = state.candleCache[range];
        } else {
            seedCandles();
            state.candleCache[range] = state.candles;
        }
        renderCandles();
        renderPrice();
    };

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
        flash(t('nc_trade_success', '下单成功'), true);
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

    /* ---------- 首页公链入口弹窗 ---------- */

    window.openChainMenu = function () {
        var m = $('chainMenuModal');
        if (m) m.classList.remove('hidden');
    };

    window.closeChainMenu = function () {
        var m = $('chainMenuModal');
        if (m) m.classList.add('hidden');
    };

    window.chainFeatureSoon = function () {
        flash(t('cm_soon', '即将开放'), false);
    };

    function bindCandleSwipe() {
        var cv = $('ncCandle');
        if (!cv) return;
        var dragging = false, startX = 0, startOff = 0;
        cv.addEventListener('pointerdown', function (e) {
            dragging = true;
            startX = e.clientX;
            startOff = state.viewOffset;
            try { cv.setPointerCapture(e.pointerId); } catch (err) {}
            cv.classList.add('nc-dragging');
            e.preventDefault();
        });
        cv.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            var rect = cv.getBoundingClientRect();
            var plotW = Math.max(20, rect.width - 46);
            var candleW = plotW / Math.max(1, state.viewCount);
            var dx = e.clientX - startX;
            var delta = Math.round(-dx / candleW);
            var maxOff = Math.max(0, state.candles.length - state.viewCount);
            state.viewOffset = Math.max(0, Math.min(maxOff, startOff + delta));
            renderCandles();
        });
        function endDrag() {
            if (dragging) { dragging = false; cv.classList.remove('nc-dragging'); }
        }
        cv.addEventListener('pointerup', endDrag);
        cv.addEventListener('pointercancel', endDrag);
    }

    /* ---------- 启动 ---------- */

    function init() {
        seedCandles();
        state.candleCache[state.range] = state.candles;
        renderCandles();
        renderPrice();
        window.ncLoadMarket();
        window.ncLoadKlines();
        renderBridge();
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
            if (document.visibilityState === 'visible') window.ncLoadMarket();
        }, 60000);
        setInterval(function () {
            if (document.visibilityState === 'visible') window.ncLoadKlines();
        }, 300000);
        setInterval(function () {
            if (document.visibilityState === 'visible') {
                window.ncRefreshBridgeBalance();
                refreshMarketFeed();
            }
        }, 15000);
        document.addEventListener('click', function () {
            closeAllMenus();
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
        bindCandleSwipe();
    }

    window.addEventListener('onLanguageChanged', function () {
        renderBridge();
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
