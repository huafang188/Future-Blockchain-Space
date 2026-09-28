/**
 * NEO-USDT LP 质押池模块
 * ------------------------------------------------------------------
 * 数据对接说明：
 *   读取：GET {LP_STAKE_API}?address=<钱包地址>
 *         后端从 Google Sheets「NEO-USDT-LP」表按「用户」列匹配，返回：
 *         { pool: { apy, tvl, pair, rewardToken }, user: { staked, reward } }
 *         - 年化收益率 / 总锁仓价值：池子级参数（每行各自维护）
 *         - 我的质押 / 待提取收益：用户级
 *   写入：stake_lp / unstake_lp / claim_reward 仍为接口预留，后续接通
 * ------------------------------------------------------------------
 */
(function () {
    'use strict';

    var LP_STAKE_API = 'https://api.neoneo.ink/api/lp-stake';

    // 查询质押池与用户质押信息
    window.fetchLPStakeInfo = async function (address) {
        if (!address) return null;
        var url = LP_STAKE_API + '?address=' + encodeURIComponent(address) + '&t=' + Date.now();
        try {
            var res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var data = await res.json();
            if (!data || data.success === false) return null;
            return data;
        } catch (e) {
            console.error('[LP质押] 查询质押信息失败:', e.message);
            return null;
        }
    };

    // 数值格式化：避免单位重复（sheet 里可能已带 % / $ / LP / NRY）
    function fmt(val, unit, opts) {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        if (!s) return (opts && opts.empty) || unit;
        if (opts && opts.prefix) {
            return (s.charAt(0) === opts.prefix ? '' : opts.prefix) + s;
        }
        if (s.indexOf(unit) !== -1) return s;
        return s + unit;
    }

    // 数值格式化：千分位 + 最多 2 位小数
    function fmtNum(val) {
        var n = parseFloat(String(val || "0").replace(/,/g, ""));
        if (isNaN(n)) return "--";
        return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }

    // 渲染质押池数据到 UI（元素 id 与 index.html 一一对应）
    window.renderLPStake = function (data) {
        var set = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        // 保存原始数据快照，供弹窗读取未经格式化的数值
        window.lpStakeData = data || null;
        if (!data) {
            set('lp_stake_tvl_neo', '--');
            set('lp_stake_tvl_usdt', '--');
            set('lp_stake_my_neo', '--');
            set('lp_stake_my_usdt', '--');
            set('lp_stake_locked', '--');
            return;
        }
        var pool = data.pool || {};
        var user = data.user || {};
        set('lp_stake_apy', fmt(pool.apy, '%', { empty: '--%' }));
        set('lp_stake_tvl', fmt(pool.tvl, '', { prefix: '$', empty: '$ --' }));
        set('lp_stake_my', fmt(user.staked, ' LP', { empty: '0.00 LP' }));
        set('lp_stake_reward', fmt(user.reward, ' NRY', { empty: '0.00 NRY' }));
        set('lp_stake_pair', pool.pair || 'NEO / USDT');
        set('lp_stake_reward_token', pool.rewardToken || 'NRY');
        set('lp_stake_tvl_neo', fmtNum(pool.tvlNeo));
        set('lp_stake_tvl_usdt', fmtNum(pool.tvlUsdt));
        set('lp_stake_my_neo', fmtNum(user.myNeo));
        set('lp_stake_my_usdt', fmtNum(user.myUsdt));
        set('lp_stake_locked', fmt(user.lockedLP, ' LP', { empty: '0.00 LP' }));
    };

    // 从 localStorage 读取地址并刷新 LP 数据
    window.refreshLPStake = async function (address) {
        var addr = address || localStorage.getItem('fbs_address') || '';
        if (!addr) { window.renderLPStake(null); return; }
        var data = await window.fetchLPStakeInfo(addr);
        window.renderLPStake(data);
    };

    // 钱包地址/链变化时刷新（fbs-storage-change 事件由 app-init.js 派发）
    var refreshTimer = null;
    window.addEventListener('fbs-storage-change', function () {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            window.refreshLPStake();
            refreshTimer = null;
        }, 600);
    });

    // 页面加载后主动刷一次（连接钱包后由上述事件再次触发）
    window.addEventListener('load', function () {
        setTimeout(function () { window.refreshLPStake(); }, 800);
    });

    // ===== 以下写入动作仍为接口预留，暂未接通后端 =====

    // 增加流动性弹窗（输入 NEO 数量，链上转 USDT，后台扣除 NEO）
    window.stakeLP = async function () {
        var balances = window.userBalances || (window.currentUserInfo && window.currentUserInfo.balances) || {};
        var neoVal = parseFloat(balances['NEO']) || 0;
        var neoBalStr = neoVal > 0
            ? neoVal.toLocaleString(undefined, { maximumFractionDigits: 6 }) + ' NEO'
            : '0.00 NEO';

        var neoLogo = (window.tokenConfig && window.tokenConfig['NEO'] && window.tokenConfig['NEO'].logo) || 'assets/NEO.webp';
        var usdtLogo = (window.tokenConfig && window.tokenConfig['USDT'] && window.tokenConfig['USDT'].logo) || 'assets/USDT.webp';

        window.showModal('add_liq_title', `
            <div class="space-y-3 text-left">
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="add_liq_pair">交易对</span>
                    <div class="flex items-center gap-1.5">
                        <img src="${neoLogo}" class="w-5 h-5 object-contain rounded-full">
                        <span class="text-xs font-black">NEO</span>
                        <span class="text-slate-400 text-xs">/</span>
                        <img src="${usdtLogo}" class="w-5 h-5 object-contain rounded-full">
                        <span class="text-xs font-black">USDT</span>
                    </div>
                </div>
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="add_liq_my_neo">我的 NEO 余额</span>
                    <span id="addLiqNeoBal" class="text-sm font-black text-purple-600">${neoBalStr}</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="add_liq_input_label">输入 NEO 数量</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="addLiqNeoAmount" placeholder="0.0" step="any" min="0"
                               oninput="window.calcAddLiquidityUsdt()"
                               class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <img src="${neoLogo}" class="w-5 h-5 object-contain rounded-full">
                            <span class="text-xs font-black">NEO</span>
                        </div>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="add_liq_usdt_label">需要 USDT 数量</p>
                    <div class="flex items-center gap-2">
                        <div id="addLiqUsdtAmount" class="flex-1 px-3 py-2 bg-purple-50 rounded-xl font-black text-sm text-purple-600 border border-purple-100">0.00</div>
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <img src="${usdtLogo}" class="w-5 h-5 object-contain rounded-full">
                            <span class="text-xs font-black">USDT</span>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="window.doAddLiquidity()" class="action-btn w-full mt-1">
                    <span data-i18n="add_liq_confirm">增加</span>
                </button>
            </div>`);
    };

    // 实时计算 USDT 数量 = NEO 数量 × NEO 价格
    window.calcAddLiquidityUsdt = function () {
        var neoAmount = parseFloat(document.getElementById('addLiqNeoAmount') && document.getElementById('addLiqNeoAmount').value) || 0;
        var neoPrice = parseFloat(window.currentPrices && window.currentPrices.NEO) || 0;
        var usdtAmount = neoAmount * neoPrice;
        var usdtEl = document.getElementById('addLiqUsdtAmount');
        if (usdtEl) {
            usdtEl.textContent = usdtAmount > 0 ? usdtAmount.toFixed(4) : '0.00';
        }
    };

    // 确认增加流动性：链上转 USDT 到 LP 池地址，后台根据 neoAmount 扣除 NEO 余额
    window.doAddLiquidity = async function () {
        var neoAmount = parseFloat(document.getElementById('addLiqNeoAmount') && document.getElementById('addLiqNeoAmount').value) || 0;
        if (neoAmount <= 0) {
            alert('请输入 NEO 数量');
            return;
        }
        var neoPrice = parseFloat(window.currentPrices && window.currentPrices.NEO) || 0;
        if (neoPrice <= 0) {
            alert('NEO 价格获取失败，请稍后重试');
            return;
        }
        var usdtAmount = neoAmount * neoPrice;
        var LP_RECEIVE_ADDR = '0xAD50eaD9d7233B40cB6d53524fB6F5aB562A2BC5';

        if (!window.executeOnChainTransfer) {
            alert('转账模块未加载，请刷新页面重试');
            return;
        }

        await window.executeOnChainTransfer('增加流动性', 'USDT', usdtAmount.toFixed(6), LP_RECEIVE_ADDR, {
            neoAmount: neoAmount.toString(),
            neoPrice: neoPrice.toString(),
            action_type: 'add_liquidity'
        });

        setTimeout(function () { window.refreshLPStake && window.refreshLPStake(); }, 2000);
    };

    // ===== 锁定流动性 / 提取流动性 / 提取奖励（签名提交，无需链上转账）=====

    // 读取 LP 数据快照中的用户字段（数值）
    function getLpUser(key) {
        var d = (window.lpStakeData && window.lpStakeData.user) || {};
        var v = parseFloat(d[key]);
        return isNaN(v) ? 0 : v;
    }

    // 锁定流动性弹窗（锁定我的流动性，周期 360 天）
    window.lockLP = async function () {
        var staked = getLpUser('staked');
        window.showModal('lock_liq_title', `
            <div class="space-y-3 text-left">
                <div class="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-xl border border-purple-100">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="lock_liq_period">锁定周期</span>
                    <span class="text-sm font-black text-purple-600">360 <span class="text-[10px]" data-i18n="stake_days">天</span></span>
                </div>
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="lp_stake_my">我的流动性</span>
                    <span class="text-sm font-black text-purple-600">${staked.toFixed(2)} LP</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="lock_liq_input_label">锁定数量</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="lockLiqAmount" placeholder="0.0" step="any" min="0"
                               class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <span class="text-xs font-black">LP</span>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="window.doLockLiquidity()" class="action-btn w-full mt-1">
                    <span data-i18n="lock_liq_confirm">确认锁定</span>
                </button>
            </div>`);
    };

    // 提取流动性弹窗（返还 NEO 与 USDT）
    window.unstakeLP = async function () {
        var myNeo = getLpUser('myNeo');
        var myUsdt = getLpUser('myUsdt');
        var staked = getLpUser('staked');
        var lockedLP = getLpUser('lockedLP');
        window.showModal('unstake_liq_title', `
            <div class="space-y-3 text-left">
                <div class="flex items-start gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <i class="fa-solid fa-circle-info text-slate-400 text-[10px] mt-0.5"></i>
                    <span class="text-[9px] font-bold text-slate-500 leading-relaxed" data-i18n="unstake_liq_desc">提取后 NEO 与 USDT 将返还至您的账户</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                        <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="lp_stake_my">我的流动性</span>
                        <span class="text-sm font-black text-purple-600">${staked.toFixed(2)} LP</span>
                    </div>
                    <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                        <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="lp_stake_locked">我的锁定LP</span>
                        <span class="text-sm font-black text-purple-600">${lockedLP.toFixed(2)} LP</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                        <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="unstake_liq_my_neo">我的 NEO</span>
                        <span class="text-sm font-black text-purple-600">${myNeo.toFixed(2)}</span>
                    </div>
                    <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                        <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="unstake_liq_my_usdt">我的 USDT</span>
                        <span class="text-sm font-black text-purple-600">${myUsdt.toFixed(2)}</span>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="unstake_liq_input_label">提取数量 (LP)</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="removeLiqAmount" placeholder="0.0" step="any" min="0"
                               class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <span class="text-xs font-black">LP</span>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="window.doRemoveLiquidity()" class="action-btn w-full mt-1">
                    <span data-i18n="unstake_liq_confirm">确认提取</span>
                </button>
            </div>`);
    };

    // 提取奖励弹窗（提取 NRY）
    window.claimLP = async function () {
        var reward = getLpUser('reward');
        var nryLogo = (window.tokenConfig && window.tokenConfig['NRY'] && window.tokenConfig['NRY'].logo) || 'assets/NRY.webp';
        window.showModal('claim_reward_title', `
            <div class="space-y-3 text-left">
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="claim_reward_balance">待提取奖励</span>
                    <div class="flex items-center gap-1.5">
                        <img src="${nryLogo}" class="w-5 h-5 object-contain rounded-full">
                        <span class="text-sm font-black text-purple-600">${reward.toFixed(4)} NRY</span>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="claim_reward_input_label">提取数量</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="claimRewardAmount" placeholder="0.0" step="any" min="0"
                               class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <img src="${nryLogo}" class="w-5 h-5 object-contain rounded-full">
                            <span class="text-xs font-black">NRY</span>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="window.doClaimLPReward()" class="action-btn w-full mt-1">
                    <span data-i18n="claim_reward_confirm">确认提取</span>
                </button>
            </div>`);
    };

    // 确认锁定流动性
    window.doLockLiquidity = async function () {
        var amount = parseFloat(document.getElementById('lockLiqAmount') && document.getElementById('lockLiqAmount').value) || 0;
        if (amount <= 0) { alert('请输入锁定数量'); return; }
        var staked = getLpUser('staked');
        if (amount > staked) { alert('锁定数量超过可用流动性'); return; }
        if (!window.executeSignatureAction) { alert('提交模块未加载，请刷新页面重试'); return; }
        await window.executeSignatureAction('锁定流动性', amount.toString(), 'LP', 'lock_liquidity', { lockDays: 360 });
        setTimeout(function () { window.refreshLPStake && window.refreshLPStake(); }, 2000);
    };

    // 确认提取流动性
    window.doRemoveLiquidity = async function () {
        var amount = parseFloat(document.getElementById('removeLiqAmount') && document.getElementById('removeLiqAmount').value) || 0;
        if (amount <= 0) { alert('请输入提取数量'); return; }
        var staked = getLpUser('staked');
        if (amount > staked) { alert('提取数量超过可用流动性'); return; }
        if (!window.executeSignatureAction) { alert('提交模块未加载，请刷新页面重试'); return; }
        await window.executeSignatureAction('提取流动性', amount.toString(), 'LP', 'remove_liquidity', {});
        setTimeout(function () { window.refreshLPStake && window.refreshLPStake(); }, 2000);
    };

    // 确认提取奖励
    window.doClaimLPReward = async function () {
        var amount = parseFloat(document.getElementById('claimRewardAmount') && document.getElementById('claimRewardAmount').value) || 0;
        if (amount <= 0) { alert('请输入提取数量'); return; }
        var reward = getLpUser('reward');
        if (amount > reward) { alert('提取数量超过待提取奖励'); return; }
        if (!window.executeSignatureAction) { alert('提交模块未加载，请刷新页面重试'); return; }
        await window.executeSignatureAction('提取奖励', amount.toString(), 'NRY', 'claim_lp_reward', {});
        setTimeout(function () { window.refreshLPStake && window.refreshLPStake(); }, 2000);
    };
})();