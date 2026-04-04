import { tokenInfo } from './config.js';

export function mountCalculationHandlers() {
    // 购买矿机数量
    window.setBuyNum = function(n, btn) {
        document.querySelectorAll('.buy-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
        btn.classList.add('bg-blue-600', 'text-white');
        const total = (n * 150).toFixed(2);
        document.getElementById('buyTotal').innerText = `$ ${total}`;
    };

    // 计算电费
    window.calcElec = function() {
        const n = document.getElementById('elecNum')?.value || 1;
        const d = document.getElementById('elecDays')?.value || 30;
        const cost = (n * d * 1.0).toFixed(2);
        document.getElementById('elecCost').innerText = `${cost} USDT`;
    };

    // 更新提币最大金额
    window.updateMax = function() {
        // 关键点：强制转大写匹配
        const symbol = document.getElementById('witToken')?.value?.toUpperCase();
        const balance = window.userBalances ? (window.userBalances[symbol] || window.userBalances[symbol.toLowerCase()] || 0) : 0;
        document.getElementById('maxWit').innerText = parseFloat(balance).toFixed(4);
    };

    // 兑换计算 (核心修复)
    window.calcSwap = function() {
        // 1. 获取并格式化币种名称
        const from = document.getElementById('sFromToken')?.value?.toUpperCase();
        const to = document.getElementById('sToToken')?.value?.toUpperCase();
        const amt = parseFloat(document.getElementById('sFromAmt')?.value) || 0;
        
        // 2. 余额显示修复
        const balance = window.userBalances ? (window.userBalances[from] || window.userBalances[from.toLowerCase()] || 0) : 0;
        const maxSwapEl = document.getElementById('maxSwap');
        if (maxSwapEl) maxSwapEl.innerText = parseFloat(balance).toFixed(4);
        
        // 3. 使用实时价格计算汇率
        const prices = window.currentPrices || {};
        const fromPrice = parseFloat(prices[from]) || 0;
        const toPrice = parseFloat(prices[to]) || 0;

        const toAmtInput = document.getElementById('sToAmt');
        if (toAmtInput) {
            if (fromPrice > 0 && toPrice > 0) {
                // 计算逻辑：(来源数量 * 来源单价) / 目标单价
                const res = (amt * (fromPrice / toPrice)).toFixed(6);
                toAmtInput.value = isNaN(res) ? "0.000000" : res;
            } else {
                toAmtInput.value = "0.000000";
            }
        }
    };

    // 转账UI更新
    window.updateTransUI = function() {
        const symbol = document.getElementById('transToken')?.value?.toUpperCase(); // 强制大写
        const balance = window.userBalances ? (window.userBalances[symbol] || window.userBalances[symbol.toLowerCase()] || 0) : 0;
        const transMaxEl = document.getElementById('transMax');
        if (transMaxEl) transMaxEl.innerText = parseFloat(balance).toFixed(4);
    };
}
