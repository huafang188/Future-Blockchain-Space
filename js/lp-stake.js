/**
 * NEO-USDT LP 质押池模块
 * ------------------------------------------------------------------
 * 数据接口预留说明：
 *  LP 质押池后端接口尚未实现，本模块只负责前端交互与数据渲染骨架，
 *  接口地址、请求/响应结构已在下方预留，后端就绪后取消注释即可接通。
 *
 *  预留端点：
 *    GET  {LP_STAKE_API}?address=<钱包地址>          查询质押池与用户质押信息
 *    POST {LP_STAKE_API}  { action: "stake_lp" | "unstake_lp", amount, address, chain }
 * ------------------------------------------------------------------
 */
(function () {
    'use strict';

    // 【接口预留】LP 质押池 API 端点（与 config.js 中 API_BASE 同域）
    var LP_STAKE_API = 'https://api.neoneo.ink/api/lp-stake';

    // 【接口预留】查询质押池与用户质押信息
    // 返回结构参考：
    // {
    //   pool: { apy: "24.50", tvl: "1,234,567.00", pair: "NEO/USDT", rewardToken: "NEO" },
    //   user: { staked: "0.00", reward: "0.00" }
    // }
    window.fetchLPStakeInfo = async function (address) {
        if (!address) return null;

        // TODO(接口预留): 后端 /api/lp-stake GET 就绪后取消注释
        // const url = LP_STAKE_API + '?address=' + encodeURIComponent(address) + '&t=' + Date.now();
        // try {
        //     const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        //     if (!res.ok) throw new Error('HTTP ' + res.status);
        //     return await res.json();
        // } catch (e) {
        //     console.error('[LP质押] 查询质押信息失败:', e.message);
        //     return null;
        // }
        console.info('[LP质押] 数据接口预留：GET ' + LP_STAKE_API);
        return null;
    };

    // 渲染质押池数据到 UI（数值元素 id 与 index.html 中一一对应）
    window.renderLPStake = function (data) {
        var set = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        if (!data) return;
        var pool = (data && data.pool) || {};
        var user = (data && data.user) || {};
        set('lp_stake_apy', (pool.apy !== undefined ? pool.apy : '--') + '%');
        set('lp_stake_tvl', '$ ' + (pool.tvl !== undefined ? pool.tvl : '--'));
        set('lp_stake_my', (user.staked !== undefined ? user.staked : '0.00') + ' LP');
        set('lp_stake_reward', (user.reward !== undefined ? user.reward : '0.00') + ' NRY');
        set('lp_stake_pair', pool.pair || 'NEO / USDT');
        set('lp_stake_reward_token', pool.rewardToken || 'NRY');
    };

    // 读取输入框中的质押数量
    function readAmount() {
        var input = document.getElementById('lp_stake_amount');
        if (!input) return NaN;
        return parseFloat(String(input.value).replace(/,/g, ''));
    }

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

        // TODO(接口预留): 后端 /api/lp-stake POST 就绪后取消注释
        // try {
        //     const res = await fetch(LP_STAKE_API, {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ action: 'stake_lp', amount: String(amount), address: address, chain: chain, pool: 'NEO-USDT' })
        //     });
        //     const result = await res.json();
        //     if (result.success || result.code === 0) {
        //         if (window.showToast) window.showToast('质押成功', 'success', 2500);
        //         window.fetchLPStakeInfo(address).then(window.renderLPStake);
        //     } else {
        //         if (window.showToast) window.showToast(result.msg || '质押失败', 'warning', 3000);
        //     }
        // } catch (e) {
        //     console.error('[LP质押] 质押请求异常:', e.message);
        //     if (window.showToast) window.showToast('质押请求异常，请稍后重试', 'warning', 3000);
        // }
        console.info('[LP质押] 质押接口预留：POST ' + LP_STAKE_API + ' { action: stake_lp, amount: ' + amount + ', chain: ' + chain + ' }');
        if (window.showToast) window.showToast('LP 质押接口预留中，敬请期待', 'warning', 2500);
    };

    // 【接口预留】提取质押
    window.unstakeLP = async function () {
        var amount = readAmount();
        var address = localStorage.getItem('fbs_address') || '';
        var chain = localStorage.getItem('fbs_chain') || 'BSC';

        // TODO(接口预留): 后端 /api/lp-stake POST 就绪后取消注释
        // try {
        //     const res = await fetch(LP_STAKE_API, {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ action: 'unstake_lp', amount: isNaN(amount) || amount <= 0 ? '' : String(amount), address: address, chain: chain, pool: 'NEO-USDT' })
        //     });
        //     const result = await res.json();
        //     if (result.success || result.code === 0) {
        //         if (window.showToast) window.showToast('提取成功', 'success', 2500);
        //         window.fetchLPStakeInfo(address).then(window.renderLPStake);
        //     } else {
        //         if (window.showToast) window.showToast(result.msg || '提取失败', 'warning', 3000);
        //     }
        // } catch (e) {
        //     console.error('[LP质押] 提取请求异常:', e.message);
        //     if (window.showToast) window.showToast('提取请求异常，请稍后重试', 'warning', 3000);
        // }
        console.info('[LP质押] 提取接口预留：POST ' + LP_STAKE_API + ' { action: unstake_lp, chain: ' + chain + ' }');
        if (window.showToast) window.showToast('LP 提取接口预留中，敬请期待', 'warning', 2500);
    };

    // 【接口预留】提取奖励（累计的 NRY 奖励）
    window.claimLP = async function () {
        var address = localStorage.getItem('fbs_address') || '';
        var chain = localStorage.getItem('fbs_chain') || 'BSC';

        // TODO(接口预留): 后端 /api/lp-stake POST 就绪后取消注释
        // try {
        //     const res = await fetch(LP_STAKE_API, {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ action: 'claim_reward', address: address, chain: chain, pool: 'NEO-USDT', rewardToken: 'NRY' })
        //     });
        //     const result = await res.json();
        //     if (result.success || result.code === 0) {
        //         if (window.showToast) window.showToast('奖励已提取', 'success', 2500);
        //         window.fetchLPStakeInfo(address).then(window.renderLPStake);
        //     } else {
        //         if (window.showToast) window.showToast(result.msg || '提取失败', 'warning', 3000);
        //     }
        // } catch (e) {
        //     console.error('[LP质押] 提取奖励请求异常:', e.message);
        //     if (window.showToast) window.showToast('提取奖励请求异常，请稍后重试', 'warning', 3000);
        // }
        console.info('[LP质押] 提取奖励接口预留：POST ' + LP_STAKE_API + ' { action: claim_reward, rewardToken: NRY, chain: ' + chain + ' }');
        if (window.showToast) window.showToast('NRY 奖励提取接口预留中，敬请期待', 'warning', 2500);
    };
})();