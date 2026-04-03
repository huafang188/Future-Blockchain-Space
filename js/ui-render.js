import { tokenInfo, STATUS_CLASS_MAP } from './config.js';

// 格式化时间
export function formatTime(timestamp) {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// 渲染代币列表
export function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;
    let totalVal = 0;

    const html = Object.keys(tokenInfo).map(symbol => {
        const bal = parseFloat(balances[symbol] || 0);
        const price = tokenInfo[symbol].price || 0;
        const val = bal * price;
        totalVal += val;
        return `
            <div class="flex items-center justify-between p-4 border-b border-slate-50">
                <div class="flex items-center gap-3">
                    <img src="${tokenInfo[symbol].logo}" class="w-8 h-8 rounded-full" onerror="this.src='https://ui-avatars.com/api/?name=${symbol}'">
                    <div>
                        <div class="font-bold text-slate-800 text-sm">${symbol}</div>
                        <div class="text-[10px] text-slate-400 font-bold">$ ${price.toLocaleString()}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black text-slate-800 text-sm">${bal.toFixed(4)}</div>
                    <div class="text-[10px] text-blue-600 font-bold italic">$ ${val.toFixed(2)}</div>
                </div>
            </div>`;
    }).join('');
    container.innerHTML = html;
    const totalEl = document.getElementById('totalValue');
    if (totalEl) totalEl.innerText = totalVal.toFixed(2);
}

// 渲染交易历史
export function renderHistory(history) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!history || history.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-300 text-xs" data-i18n="no_data">暂无交易记录</div>`;
        if (window.i18nRender) window.i18nRender();
        return;
    }

    const html = history.map(item => {
        const type = item['交易类型'] || 'SYSTEM';
        const amount = item['交易数量'] || '0';
        const symbol = item['交易代币'] || 'FBS';
        const time = item['交易时间'] || '';
        const status = item['交易状态'] || '已提交';

        const statusClass = STATUS_CLASS_MAP[status] || "status-submitted";
        const isNegative = ['提现', '缴纳电费', '购买矿机'].includes(type);
        const amountColor = isNegative ? 'text-red-500' : 'text-emerald-500';
        const prefix = isNegative ? '-' : '+';

        return `
            <div class="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 mb-2">
                <div class="flex flex-col text-left">
                    <span class="font-bold text-slate-800 text-sm" data-i18n="${type}">${type}</span>
                    <div class="flex items-center space-x-2 mt-1">
                        <span class="text-[10px] text-slate-400">${time}</span>
                        <span class="mx-1 text-slate-300">|</span>
                        <span class="status-tag ${statusClass}" data-i18n="${status}">${status}</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black ${amountColor}">${prefix}${amount}</div>
                    <div class="text-[9px] text-slate-400 font-bold uppercase">${symbol}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    if (window.i18nRender) window.i18nRender();
}

// 渲染转账流水
export function renderTransfers(transfers) {
    const container = document.getElementById('transferList');
    if (!container) return;

    if (!transfers || transfers.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-300 text-xs" data-i18n="no_data">暂无转账流水</div>`;
        if (window.i18nRender) window.i18nRender();
        return;
    }

    const html = transfers.map(item => {
        const toAddr = item['接收者'] || '---';
        const amount = item['接收数量'] || '0';
        const type = item['接收类型'] || 'FBS';
        const status = item['状态'] || '';
        const time = item['转账时间'] || '';

        return `
            <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm mb-2">
                <div class="flex justify-between items-start mb-2 text-left">
                    <span class="bg-blue-50 text-blue-600 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase" data-i18n="${type}">
                        ${type}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">${toAddr.slice(0, 8)}...${toAddr.slice(-4)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <div class="text-[10px] text-slate-500 font-medium">
                        ${time} | <span class="text-blue-500" data-i18n="${status}">${status}</span>
                    </div>
                    <div class="text-slate-800 font-black text-sm">${amount}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    if (window.i18nRender) window.i18nRender();
}
