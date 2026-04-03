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
        const symbol = document.getElementById('witToken')?.value;
        const balance = window.userBalances ? (window.userBalances[symbol] || 0) : 0;
        document.getElementById('maxWit').innerText = parseFloat(balance).toFixed(4);
    };

    // 兑换计算
    window.calcSwap = function() {
        const from = document.getElementById('sFromToken')?.value;
        const to = document.getElementById('sToToken')?.value;
        const amt = parseFloat(document.getElementById('sFromAmt')?.value) || 0;
        const balance = window.userBalances ? (window.userBalances[from] || 0) : 0;
        
        document.getElementById('maxSwap').innerText = "余额: " + parseFloat(balance).toFixed(4);
        
        if (tokenInfo[from] && tokenInfo[to]) {
            const res = (amt * (tokenInfo[from].price / tokenInfo[to].price)).toFixed(6);
            document.getElementById('sToAmt').value = res;
        }
    };

    // 转账UI更新
    window.updateTransUI = function() {
        const symbol = document.getElementById('transToken')?.value;
        const balance = window.userBalances ? (window.userBalances[symbol] || 0) : 0;
        document.getElementById('transMax').innerText = parseFloat(balance).toFixed(4);
    };
}
