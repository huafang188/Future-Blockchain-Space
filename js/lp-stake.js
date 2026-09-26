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

    // 渲染质押池数据到 UI（元素 id 与 index.html 一一对应）
    window.renderLPStake = function (data) {
        var set = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        if (!data) return;
        var pool = data.pool || {};
        var user = data.user || {};
        set('lp_stake_apy', fmt(pool.apy, '%', { empty: '--%' }));
        set('lp_stake_tvl', fmt(pool.tvl, '', { prefix: '$', empty: '$ --' }));
        set('lp_stake_my', fmt(user.staked, ' LP', { empty: '0.00 LP' }));
        set('lp_stake_reward', fmt(user.reward, ' NRY', { empty: '0.00 NRY' }));
        set('lp_stake_pair', pool.pair || 'NEO / USDT');
        set('lp_stake_reward_token', pool.rewardToken || 'NRY');
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

    // 读取输入框中的质押数量
    function readAmount() {
        var input = document.getElementById('lp_stake_amount');
        if (!input) return NaN;
        return parseFloat(String(input.value).replace(/,/g, ''));
    }

    // ===== 以下写入动作仍为接口预留，暂未接通后端 =====

    // 【接口预留】质押 LP
    window.stakeLP = async function () {
        var amount = readAmount();
        if (isNaN(amount) || amount <= 0) {
            if (window.showToast) window.showToast('请输入有效的质押数量', 'warning', 2500);
            var input = document.getElementById('lp_stake_amount');
            if (input) { input.focus(); }
            return;
        }
        var address = localStorage.getItem('fbs_address') || '';
        var chain = localStorage.getItem('fbs_chain') || 'BSC';
        console.info('[LP质押] 质押接口预留：POST ' + LP_STAKE_API + ' { action: stake_lp, amount: ' + amount + ', chain: ' + chain + ' }');
        if (window.showToast) window.showToast('LP 质押接口预留中，敬请期待', 'warning', 2500);
    };

    // 【接口预留】提取质押
    window.unstakeLP = async function () {
        var amount = readAmount();
        var address = localStorage.getItem('fbs_address') || '';
        var chain = localStorage.getItem('fbs_chain') || 'BSC';
        console.info('[LP质押] 提取接口预留：POST ' + LP_STAKE_API + ' { action: unstake_lp, chain: ' + chain + ' }');
        if (window.showToast) window.showToast('LP 提取接口预留中，敬请期待', 'warning', 2500);
    };

    // 【接口预留】提取奖励（累计的 NRY 奖励）
    window.claimLP = async function () {
        var address = localStorage.getItem('fbs_address') || '';
        var chain = localStorage.getItem('fbs_chain') || 'BSC';
        console.info('[LP质押] 提取奖励接口预留：POST ' + LP_STAKE_API + ' { action: claim_reward, rewardToken: NRY, chain: ' + chain + ' }');
        if (window.showToast) window.showToast('NRY 奖励提取接口预留中，敬请期待', 'warning', 2500);
    };
})();