/**
 * NRY 算力挖矿模块
 * ------------------------------------------------------------------
 * 数据对接说明：
 *   读取：GET {NRY_MINING_API}?address=<钱包地址>
 *         后端从 Google Sheets「NRY算力挖矿」表按「用户」列匹配，返回：
 *         { user: { identity, stake, hashrate, income, pending, direct, indirect } }
 *         - 数字字段单位统一为 NRY
 * ------------------------------------------------------------------
 */
(function () {
    'use strict';

    var NRY_MINING_API = 'https://api.neoneo.ink/api/nry-mining';

    // 复制地址到剪贴板
    window.copyAddress = function (addr, el) {
        try {
            navigator.clipboard.writeText(addr).then(function () {
                showCopyFeedback(el);
            }).catch(function () {
                fallbackCopy(addr);
                showCopyFeedback(el);
            });
        } catch (e) {
            fallbackCopy(addr);
            showCopyFeedback(el);
        }
    };
    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }
    function showCopyFeedback(el) {
        if (!el) return;
        var icon = el.querySelector('.fa-copy');
        if (!icon) return;
        var origClass = icon.className;
        icon.className = 'fa-solid fa-check text-green-500 text-[9px]';
        setTimeout(function () { icon.className = origClass; }, 1500);
    }

    // 查询 NRY 算力挖矿数据
    window.fetchNryMiningInfo = async function (address) {
        if (!address) return null;
        var url = NRY_MINING_API + '?address=' + encodeURIComponent(address) + '&t=' + Date.now();
        try {
            var res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var data = await res.json();
            if (!data || data.success === false) return null;
            return data;
        } catch (e) {
            console.error('[NRY算力挖矿] 查询数据失败:', e.message);
            return null;
        }
    };

    // 数值格式化：解析「19387423NRY」这类数字+单位，转「19,387,423 NRY」
    function fmtNum(val) {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        if (!s) return '--';
        var num = s.replace(/[^0-9.]/g, '');
        var unit = s.replace(/[0-9.,\s]/g, '');
        var n = parseFloat(num);
        if (isNaN(n)) return s;
        var out = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
        var u = unit || 'NRY';
        return out + ' ' + u;
    }

    // NRY 数值格式化（始终带 NRY 单位）
    function fmtNry(val) {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        if (!s) return '--';
        var num = s.replace(/[^0-9.\-]/g, '');
        var n = parseFloat(num);
        if (isNaN(n)) return s;
        return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' NRY';
    }

    // 美元格式化（业绩数据，$ 前缀）
    function fmtUSD(val) {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        if (!s) return '$--';
        var num = s.replace(/[^0-9.\-]/g, '');
        var n = parseFloat(num);
        if (isNaN(n)) return '$--';
        return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }

    // 纯数字格式化（人数等）
    function fmtInt(val) {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        if (!s) return '--';
        var num = s.replace(/[^0-9.\-]/g, '');
        var n = parseInt(num, 10);
        if (isNaN(n)) return s;
        return String(n);
    }

    // 文本格式化（身份等）
    function fmtText(val) {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        return s || '--';
    }

    // 数字从 0 动态滚动到目标值（iOS WebView 兜底：先设最终值再动画）
    function animateValue(id, targetStr, formatter, duration) {
        var el = document.getElementById(id);
        if (!el) return;
        var num = parseFloat(String(targetStr).replace(/[^0-9.\-]/g, '')) || 0;
        var finalText = formatter(String(num));
        el.textContent = finalText;
        if (num === 0) return;
        var start = 0, t0 = null, dur = duration || 800;
        function step(ts) {
            if (!t0) t0 = ts;
            var p = Math.min((ts - t0) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var cur = start + (num - start) * eased;
            el.textContent = formatter(String(cur));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // 渲染 NRY 算力挖矿数据到 UI
    window.renderNryMining = function (data) {
        var set = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        window.nryMiningData = data || null;
        if (!data || !data.user) {
            set('nry_identity', '--');
            set('nry_stake', '$--');
            set('nry_hashrate', '--');
            set('nry_income', '--');
            set('nry_withdrawn', '--');
            set('nry_pending', '--');
            set('nry_direct_volume', '$--');
            set('nry_indirect_volume', '$--');
            set('nry_direct_count', '--');
            set('nry_team_volume', '$--');
            set('nry_my_nry', '--');
            set('nry_my_usdt', '--');
            set('nry_my_lp', '--');
            set('nry_my_dividend', '--');
            return;
        }
        var u = data.user || {};
        var idEl = document.getElementById('nry_identity');
        if (idEl) {
            var idVal = fmtText(u.identity);
            idEl.textContent = idVal;
            idEl.className = 'stat-value nry-identity-badge';
            var vMatch = idVal.match(/N([0-4])/i);
            if (vMatch) idEl.classList.add('v' + vMatch[1].toLowerCase());
            else idEl.classList.add('v0');
        }
        animateValue('nry_stake', u.stake, fmtUSD);
        animateValue('nry_hashrate', u.hashrate, fmtNry);
        animateValue('nry_income', u.income, fmtNry);
        animateValue('nry_withdrawn', u.withdrawn, fmtNry);
        animateValue('nry_pending', u.pending, fmtNry);
        animateValue('nry_direct_volume', u.directVolume, fmtUSD);
        animateValue('nry_indirect_volume', u.indirectVolume, fmtUSD);
        animateValue('nry_direct_count', u.directCount, fmtInt);
        animateValue('nry_team_volume', u.teamVolume, fmtUSD);
        set('nry_my_nry', fmtNum(u.myNry));
        set('nry_my_usdt', fmtNum(u.myUsdt));
        set('nry_my_lp', fmtNum(u.myLp));
        set('nry_my_dividend', fmtNum(u.pendingDividend));

        renderDistribution(data.distribution);
    };

    // 渲染代币分配与扇形图
    function renderDistribution(dist) {
        var colors = ['#f97316', '#fb923c', '#94a3b8', '#22c55e'];
        var defaultData = [
            { name: '矿池', ratio: '50%', poolLevel: 'N1', poolAmount: '' },
            { name: '底池', ratio: '20%', poolLevel: 'N2', poolAmount: '' },
            { name: '黑洞', ratio: '0%', poolLevel: 'N3', poolAmount: '' },
            { name: '流通', ratio: '20%', poolLevel: 'N4', poolAmount: '' }
        ];
        var list = (dist && dist.length) ? dist : defaultData;

        // 更新扇形图
        var pieEl = document.getElementById('nryPieChart');
        if (pieEl) {
            var acc = 0;
            var stops = [];
            for (var i = 0; i < list.length; i++) {
                var pct = parseFloat(String(list[i].ratio || '0').replace(/[^0-9.]/g, '')) || 0;
                var color = colors[i] || '#e2e8f0';
                stops.push(color + ' ' + acc + '% ' + (acc + pct) + '%');
                acc += pct;
            }
            if (acc < 100) stops.push('#e2e8f0 ' + acc + '% 100%');
            pieEl.style.background = 'conic-gradient(' + stops.join(', ') + ')';
        }

        // 更新明细
        for (var j = 0; j < 4; j++) {
            var item = list[j] || {};
            var ratioEl = document.getElementById('nry_dist_ratio_' + j);
            var poolEl = document.getElementById('nry_dist_pool_' + j);
            var amtEl = document.getElementById('nry_dist_amount_' + j);
            if (ratioEl) ratioEl.textContent = item.ratio || '--';
            if (poolEl) {
                var level = item.poolLevel || '';
                poolEl.textContent = level ? level + '分红池' : '分红池';
            }
            if (amtEl) {
                var raw = String(item.poolAmount || '').trim();
                var amt = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
                amtEl.textContent = amt.toLocaleString('en-US') + ' NRY';
            }
        }
    }

    // 从 localStorage 读取地址并刷新 NRY 算力挖矿数据
    window.refreshNryMining = async function (address) {
        var addr = address || localStorage.getItem('fbs_address') || '';
        if (!addr) { window.renderNryMining(null); return; }
        var data = await window.fetchNryMiningInfo(addr);
        window.renderNryMining(data);
    };

    // 钱包地址/链变化时刷新
    var refreshTimer = null;
    window.addEventListener('fbs-storage-change', function () {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            window.refreshNryMining();
            refreshTimer = null;
        }, 600);
    });

    // 页面加载后主动刷一次
    window.addEventListener('load', function () {
        setTimeout(function () { window.refreshNryMining(); }, 800);
    });

    // ===== NRY 操作按钮 =====
    var NRY_CONTRACT = '0x8864e3301Aa3c3a9dD22e83a3F4845AA4799fa42';
    var NRY_STAKE_ADDR = '0x8007c1F954D46f98D108EB6E0dD979406C5Bb444';
    var USDT_BSC = '0x55d398326f99059ff775485246999027b3197955';
    var PRIVATE_POOL_ADDR = '0xa59Ee12770664e002E6e0dDcAC447707AD873F33';
    var SWAP_PROXY = 'https://api.neoneo.ink/api/swap-proxy'; // 后端代理（绕过 CORS，转发到 bopenapi.bgwapi.io）


    // 获取 EVM Provider（Bitget/TP/MetaMask）
    function getNryProvider() {
        try { if (window.ethereum && typeof window.ethereum.request === 'function') return window.ethereum; } catch (e) {}
        try { if (window.bitkeep && window.bitkeep.ethereum && typeof window.bitkeep.ethereum.request === 'function') return window.bitkeep.ethereum; } catch (e) {}
        try { if (window.tokenpocket && window.tokenpocket.ethereum && typeof window.tokenpocket.ethereum.request === 'function') return window.tokenpocket.ethereum; } catch (e) {}
        return null;
    }

    // NRY logo HTML
    function nryLogo(cls) {
        return '<img src="assets/NRY.webp" alt="NRY" class="' + (cls || 'w-5 h-5 object-contain rounded-full') + '" onerror="this.src=\'assets/head_logo.webp\'">';
    }

    // 读取用户 NRY 字段原始值
    function getNryUser(key) {
        var d = (window.nryMiningData && window.nryMiningData.user) || {};
        var v = d[key];
        return (v === null || v === undefined) ? '' : String(v).trim();
    }

    function parseNum(val) {
        var s = String(val || '').replace(/[^0-9.]/g, '');
        var n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    // 添加 NRY 到钱包（EIP-747）
    window.addNry = async function () {
        var provider = getNryProvider();
        if (!provider) { alert('未检测到钱包，请在钱包浏览器中打开'); return; }
        // 生产环境用实际域名，本地开发用生产图片 URL（钱包 DApp 浏览器无法访问 127.0.0.1）
        var imageUrl = location.hostname === '127.0.0.1' || location.hostname === 'localhost'
            ? 'https://neoneo.ink/assets/NRY.webp'
            : location.origin + '/assets/NRY.webp';
        console.log('[NRY添加] provider=', provider.constructor && provider.constructor.name || 'unknown', 'image=', imageUrl);
        try {
            var result = await provider.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: NRY_CONTRACT,
                        symbol: 'NRY',
                        decimals: 18,
                        image: imageUrl
                    }
                }
            });
            console.log('[NRY添加] wallet_watchAsset 结果:', result);
            if (result === false || result === null) {
                alert('钱包未添加该代币（可能已存在或不支持）');
            } else {
                alert('NRY 已添加到钱包');
            }
        } catch (e) {
            console.error('[NRY添加] wallet_watchAsset 失败:', e.code, e.message, JSON.stringify(e));
            if (e.code === 4001) {
                alert('已取消添加代币');
            } else if (e.code === -32601) {
                alert('当前钱包不支持 wallet_watchAsset 方法，请手动添加代币');
            } else if (e.code === -32603) {
                // 内部错误：可能是 image URL 不可达、钱包 bug 等，尝试不带 image 重试
                console.warn('[NRY添加] code=-32603，尝试不带 image 参数重试');
                try {
                    var result2 = await provider.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20',
                            options: {
                                address: NRY_CONTRACT,
                                symbol: 'NRY',
                                decimals: 18
                            }
                        }
                    });
                    if (result2 === false || result2 === null) {
                        alert('钱包未添加该代币（可能已存在）');
                    } else {
                        alert('NRY 已添加到钱包');
                    }
                    return;
                } catch (e2) {
                    console.error('[NRY添加] 不带image重试也失败:', e2.code, e2.message);
                }
                alert('钱包内部错误，请手动添加代币\n合约地址: ' + NRY_CONTRACT + '\n精度: 18');
            } else {
                alert('添加失败：' + (e.message || '未知错误') + ' (code=' + (e.code || 'N/A') + ')');
            }
        }
    };

    // USDT logo HTML
    function usdtLogo(cls) {
        return '<img src="assets/USDT.webp" alt="USDT" class="' + (cls || 'w-5 h-5 object-contain rounded-full') + '" onerror="this.src=\'assets/head_logo.webp\'">';
    }

    // 获取 NRY 价格（USDT 计价）
    function getNryPrice() {
        var prices = window.currentPrices || {};
        return parseFloat(prices['NRY']) || 0;
    }

    // 质押 NRY 弹窗（输入 USDT 金额，实时显示对应 NRY 数量）
    window.stakeNry = function () {
        var price = getNryPrice();
        var priceText = price > 0 ? ('1 NRY ≈ $' + price.toFixed(4)) : 'NRY 价格加载中...';
        window.showModal('nry_btn_stake', `
            <div class="space-y-3 text-left">
                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                    <i class="fa-solid fa-circle-info text-slate-400 text-[10px]"></i>
                    <span class="text-[9px] font-bold text-slate-500" id="nryPriceInfo">${priceText}</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="nry_stake_label">质押价值 (USDT)</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="nryStakeAmount" placeholder="100" step="any" min="100" class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none" oninput="updateStakeNryDisplay()">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">${usdtLogo()}<span class="text-xs font-black">USDT</span></div>
                    </div>
                </div>
                <div id="nryStakeNryDisplay" class="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="nry_stake_nry_amount">对应 NRY 数量</span>
                    <div class="flex items-center gap-1.5">${nryLogo('w-4 h-4 object-contain rounded-full')}<span id="nryStakeNryValue" class="text-sm font-black text-orange-400">--</span></div>
                </div>
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="nry_fee_dividend_label">费率（分红）</span>
                    <span class="text-sm font-black text-orange-400">5%</span>
                </div>
                <div class="grid grid-cols-5 gap-1.5">
                    <button type="button" onclick="setNryStakeAmount('100')" class="flex flex-col items-center py-2 bg-slate-100 rounded-xl">
                        <span class="text-[10px] font-black text-slate-600">100</span>
                        <span class="text-[7px] text-slate-400">USDT</span>
                    </button>
                    <button type="button" onclick="setNryStakeAmount('500')" class="flex flex-col items-center py-2 bg-slate-100 rounded-xl">
                        <span class="text-[10px] font-black text-slate-600">500</span>
                        <span class="text-[7px] text-slate-400">USDT</span>
                    </button>
                    <button type="button" onclick="setNryStakeAmount('1000')" class="flex flex-col items-center py-2 bg-slate-100 rounded-xl">
                        <span class="text-[10px] font-black text-slate-600">1K</span>
                        <span class="text-[7px] text-slate-400">USDT</span>
                    </button>
                    <button type="button" onclick="setNryStakeAmount('5000')" class="flex flex-col items-center py-2 bg-slate-100 rounded-xl">
                        <span class="text-[10px] font-black text-slate-600">5K</span>
                        <span class="text-[7px] text-slate-400">USDT</span>
                    </button>
                    <button type="button" onclick="setNryStakeAmount('10000')" class="flex flex-col items-center py-2 bg-slate-100 rounded-xl">
                        <span class="text-[10px] font-black text-slate-600">10K</span>
                        <span class="text-[7px] text-slate-400">USDT</span>
                    </button>
                </div>
                <button type="button" onclick="window.doStakeNry()" class="action-btn w-full mt-1">
                    <span data-i18n="nry_stake_confirm">确认质押</span>
                </button>
            </div>`);
        setTimeout(updateStakeNryDisplay, 100);
    };
    window.updateStakeNryDisplay = function () {
        var usdtAmount = parseFloat(document.getElementById('nryStakeAmount') && document.getElementById('nryStakeAmount').value) || 0;
        var price = getNryPrice();
        var nryEl = document.getElementById('nryStakeNryValue');
        if (nryEl) {
            if (price > 0 && usdtAmount > 0) {
                var nryAmount = usdtAmount / price;
                nryEl.textContent = nryAmount.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' NRY';
            } else {
                nryEl.textContent = '--';
            }
        }
    };
    window.setNryStakeAmount = function (v) {
        var el = document.getElementById('nryStakeAmount');
        if (el) { el.value = v; updateStakeNryDisplay(); }
    };
    window.doStakeNry = async function () {
        var usdtAmount = parseFloat(document.getElementById('nryStakeAmount') && document.getElementById('nryStakeAmount').value);
        if (!usdtAmount || usdtAmount <= 0) { alert('请输入质押价值'); return; }
        if (usdtAmount < 100) { alert('最低质押价值为 100 USDT'); return; }
        var price = getNryPrice();
        if (price <= 0) { alert('NRY 价格未加载，请稍后重试'); return; }
        var nryAmount = usdtAmount / price;
        if (!window.executeOnChainTransfer) { alert('提交模块未加载，请刷新页面重试'); return; }
        await window.executeOnChainTransfer('质押NRY', 'NRY', String(nryAmount), NRY_STAKE_ADDR, { remark: usdtAmount + ' USDT' });
        setTimeout(function () { window.refreshNryMining && window.refreshNryMining(); }, 2000);
    };

    // 提取 NRY 弹窗（待提取收益，签名提交）
    window.withdrawNry = function () {
        var pending = parseNum(getNryUser('pending'));
        var display = pending.toLocaleString('en-US', { maximumFractionDigits: 2 });
        window.showModal('nry_btn_withdraw', `
            <div class="space-y-3 text-left">
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="nry_withdraw_balance">可提取收益</span>
                    <div class="flex items-center gap-1.5">${nryLogo()}<span class="text-sm font-black text-purple-600">${display} NRY</span></div>
                </div>
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="nry_fee_dividend_label">费率（分红）</span>
                    <span class="text-sm font-black text-orange-400">5%</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="nry_withdraw_label">提取数量 (NRY)</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="nryWithdrawAmount" placeholder="0" step="any" min="0" max="${display}" class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">${nryLogo()}<span class="text-xs font-black">NRY</span></div>
                    </div>
                </div>
                <button type="button" onclick="window.doWithdrawNry()" class="action-btn w-full mt-1">
                    <span data-i18n="nry_withdraw_confirm">确认提取</span>
                </button>
            </div>`);
    };
    window.doWithdrawNry = async function () {
        var amount = document.getElementById('nryWithdrawAmount') && document.getElementById('nryWithdrawAmount').value;
        if (!amount || parseFloat(amount) <= 0) { alert('请输入提取数量'); return; }
        var pending = parseNum(getNryUser('pending'));
        if (parseFloat(amount) > pending) { alert('提取数量超过可提取收益'); return; }
        if (!window.executeSignatureAction) { alert('提交模块未加载，请刷新页面重试'); return; }
        await window.executeSignatureAction('提取NRY', amount, 'NRY', 'claim_nry', {});
        setTimeout(function () { window.refreshNryMining && window.refreshNryMining(); }, 2000);
    };

    // 购买 NRY 弹窗（USDT → NRY）
    window.buyNry = function () {
        window.showModal('nry_btn_buy', `
            <div class="space-y-3 text-left">
                <div class="flex items-start gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <i class="fa-solid fa-circle-info text-slate-400 text-[10px] mt-0.5"></i>
                    <span class="text-[9px] font-bold text-slate-500 leading-relaxed" data-i18n="nry_buy_desc">使用 USDT 兑换 NRY（BSC 链）</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="nry_buy_label">支付数量 (USDT)</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="nryBuyAmount" placeholder="0" step="any" min="0" class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0"><span class="text-xs font-black">USDT</span></div>
                    </div>
                </div>
                <button type="button" onclick="window.doBuyNry()" class="action-btn w-full mt-1">
                    <span data-i18n="nry_buy_confirm">确认兑换</span>
                </button>
            </div>`);
    };

    // 购买 NRY：Bitget SwapX 兑换三步链路
    window.doBuyNry = async function () {
        var amount = document.getElementById('nryBuyAmount') && document.getElementById('nryBuyAmount').value;
        if (!amount || parseFloat(amount) <= 0) { alert('请输入兑换数量'); return; }
        var provider = getNryProvider();
        if (!provider) { alert('未检测到钱包，请在钱包浏览器中打开'); return; }
        if (!SWAP_PROXY) { alert('兑换接口域名未配置，请稍后重试'); return; }

        var address = '';
        try {
            var accounts = await provider.request({ method: 'eth_accounts' });
            if (!accounts || !accounts.length) accounts = await provider.request({ method: 'eth_requestAccounts' });
            address = accounts && accounts[0];
        } catch (e) {
            console.error('[NRY购买] 获取地址失败:', e.message);
        }
        if (!address) { alert('无法获取钱包地址'); return; }

        try {
            window.showModal('modal_processing', '正在构建兑换订单...');
            var makeBody = {
                fromChain: 'bnb',
                fromContract: USDT_BSC,
                fromAmount: String(amount),
                toChain: 'bnb',
                toContract: NRY_CONTRACT,
                fromAddress: address,
                toAddress: address,
                market: 'bkbridgev3.liqbridge',
                slippage: '0.03',
                feeRate: '0.01'
            };
            var makeRes = await fetch(SWAP_PROXY + '?path=/bgw-pro/swapx/order/makeSwapOrder', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(makeBody)
            });
            var makeText = await makeRes.text();
            var makeData;
            try { makeData = JSON.parse(makeText); } catch (pe) {
                throw new Error('构建订单失败（上游返回非JSON）: ' + makeText.slice(0, 200));
            }
            console.log('[NRY购买] makeSwapOrder 响应:', makeText.slice(0, 500));
            var order = makeData && makeData.data;
            if (!order || !order.orderId || !order.txs || !order.txs.length) {
                throw new Error((makeData && makeData.msg) || '构建订单失败');
            }

            window.showModal('modal_processing', '请在钱包中签名...');
            var signedTxs = [];
            for (var i = 0; i < order.txs.length; i++) {
                var t = order.txs[i].data || {};
                var txParams = {
                    from: address,
                    to: t.to,
                    data: t.calldata,
                    value: t.value || '0',
                    gas: t.gasLimit,
                    nonce: t.nonce
                };
                if (t.supportEIP1559 && (t.maxFeePerGas || t.maxPriorityFeePerGas)) {
                    if (t.maxFeePerGas) txParams.maxFeePerGas = t.maxFeePerGas;
                    if (t.maxPriorityFeePerGas) txParams.maxPriorityFeePerGas = t.maxPriorityFeePerGas;
                } else if (t.gasPrice) {
                    txParams.gasPrice = t.gasPrice;
                }
                var raw = await provider.request({ method: 'eth_signTransaction', params: [txParams] });
                signedTxs.push(raw);
            }

            window.showModal('modal_processing', '正在提交兑换...');
            var subBody = { orderId: order.orderId, signedTxs: signedTxs };
            var subRes = await fetch(SWAP_PROXY + '?path=/bgw-pro/swapx/order/submitSwapOrder', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subBody)
            });
            var subText = await subRes.text();
            var subData;
            try { subData = JSON.parse(subText); } catch (pe) {
                throw new Error('提交兑换失败（上游返回非JSON）: ' + subText.slice(0, 200));
            }
            console.log('[NRY购买] submitSwapOrder 响应:', subText.slice(0, 500));
            if (subData && subData.status === 0) {
                alert('兑换申请已提交成功');
            } else {
                alert('兑换提交失败：' + ((subData && subData.msg) || '未知错误'));
            }
            if (window.closeModal) window.closeModal();
        } catch (e) {
            console.error('[NRY购买] 兑换失败:', e.message);
            if (window.closeModal) window.closeModal();
            if (e.code === 4001) alert('已取消签名');
            else alert('兑换失败：' + (e.message || e));
        }
    };

    window.addLiquidity = function () {
        if (typeof window.showModal !== 'function') return alert('页面正在加载中，请稍后重试');
        var amounts = [1000, 3000, 5000, 8000, 10000, 15000, 30000, 50000, 80000, 100000];
        var btns = amounts.map(function (v) {
            var label = v >= 1000 ? (v / 1000) + 'K' : String(v);
            return '<button type="button" onclick="window.setNryLiquidityAmount(\'' + v + '\')" class="flex flex-col items-center py-2 bg-slate-100 rounded-xl">' +
                '<span class="text-[10px] font-black text-slate-600">' + label + '</span>' +
                '<span class="text-[7px] text-slate-400">USDT</span></button>';
        }).join('');
        window.showModal('nry_add_liquidity_title', `
            <div class="space-y-3 text-left">
                <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                    <i class="fa-solid fa-circle-info text-slate-400 text-[10px]"></i>
                    <span class="text-[9px] font-bold text-slate-500">USDT → ${PRIVATE_POOL_ADDR.slice(0, 8)}...${PRIVATE_POOL_ADDR.slice(-4)}</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="nry_add_liquidity_label">选择 USDT 数量</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="liquidityAmount" placeholder="1000" step="any" min="1000" class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0"><span class="text-xs font-black">USDT</span></div>
                    </div>
                </div>
                <div class="grid grid-cols-5 gap-1.5">${btns}</div>
                <button type="button" onclick="window.doAddNryLiquidity()" class="action-btn w-full mt-1">
                    <span data-i18n="nry_add_liquidity_confirm">确认添加</span>
                </button>
            </div>`);
    };
    window.setNryLiquidityAmount = function (v) {
        var el = document.getElementById('liquidityAmount');
        if (el) el.value = v;
    };
    window.doAddNryLiquidity = async function () {
        var amount = document.getElementById('liquidityAmount') && document.getElementById('liquidityAmount').value;
        if (!amount || parseFloat(amount) <= 0) { alert('请输入 USDT 数量'); return; }
        if (parseFloat(amount) < 1000) { alert('最低数量为 1000 USDT'); return; }
        if (!window.executeOnChainTransfer) { alert('提交模块未加载，请刷新页面重试'); return; }
        await window.executeOnChainTransfer('添加流动性', 'USDT', String(amount), PRIVATE_POOL_ADDR);
        if (window.closeModal) window.closeModal();
        setTimeout(function () { window.refreshNryMining && window.refreshNryMining(); }, 2000);
    };

    window.withdrawLiquidity = function () {
        if (typeof window.showModal !== 'function') return alert('页面正在加载中，请稍后重试');
        window.showModal("nry_btn_withdraw_liquidity", `
            <div class="space-y-3 text-center py-4">
                <i class="fa-solid fa-lock text-slate-300 text-2xl"></i>
                <p class="text-[11px] font-bold text-slate-400 leading-relaxed" data-i18n="nry_liquidity_coming_soon">即将开放</p>
            </div>`);
    };
})();