import { tokenInfo, STATUS_CLASS_MAP } from './config.js';

// 格式化时间
export function formatTime(timestamp) {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// 渲染资产代币列表
export function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;

    let totalVal = 0;
    let html = '';

    Object.keys(tokenInfo).forEach(symbol => {
        const token = tokenInfo[symbol];
        const balance = parseFloat(balances[symbol] || 0);
        const price = token.price || 0;
        const value = (balance * price).toFixed(2);
        totalVal += parseFloat(value);

        html += `
        <div class="flex justify-between items-center p-4">
            <div class="flex items-center gap-3">
                <img src="assets/${symbol.toLowerCase()}.png" alt="${symbol}" class="w-8 h-8 rounded-full object-contain" onerror="this.src='https://picsum.photos/40/40'">
                <div>
                    <div class="font-bold text-sm text-slate-800">${symbol}</div>
                    <div class="text-[9px] text-slate-400">${balance.toFixed(4)}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-bold text-sm text-slate-800">$${value}</div>
                <div class="text-[9px] text-slate-400">≈ ${price > 0 ? '$' + price : '--'}</div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    const totalEl = document.getElementById('totalValue');
    if (totalEl) totalEl.innerText = totalVal.toFixed(2);
}

// 渲染交易历史
export function renderHistory(history) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!history || history.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-300 text-[10px] italic" data-i18n="no_data">暂无数据</div>`;
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="flex justify-between items-center p-3 rounded-xl bg-white/50 border border-slate-50">
            <div class="flex items-center gap-2">
                <i class="fas fa-arrow-${['充值', '兑换'].includes(item.type) ? 'down' : 'up'} text-${['充值', '兑换'].includes(item.type) ? 'emerald' : 'blue'}-500 text-xs"></i>
                <span class="text-xs font-bold text-slate-700">${item.type}</span>
            </div>
            <span class="text-xs font-bold text-slate-800">${item.amount} ${item.symbol}</span>
            <span class="text-[10px] text-slate-400">${item.time}</span>
        </div>
    `).join('');
}

// 渲染转账流水
export function renderTransfers(transfers) {
    const container = document.getElementById('transferList');
    if (!container) return;

    if (!transfers || transfers.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-300 text-[10px] italic" data-i18n="no_data">暂无数据</div>`;
        return;
    }

    container.innerHTML = transfers.map(item => `
        <div class="p-3 rounded-xl bg-white/50 border border-slate-50">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-bold text-slate-700">${item.type}</span>
                <span class="text-xs font-bold text-slate-800">${item.amount}</span>
            </div>
            <div class="flex justify-between items-center text-[10px] text-slate-400">
                <span>${item.to.slice(0, 8)}...${item.to.slice(-6)}</span>
                <span>${item.time}</span>
            </div>
        </div>
    `).join('');
}

// 渲染看板代币详情（完整修复：Logo + 数据 + K线位置）
export function renderStatsPage(lang) {
    const container = document.getElementById('token-detail-list');
    if (!container) return;

    const tokens = [
        { symbol: 'NEO', name: 'NEO Token', logo: 'assets/neo_logo.webp', desc: '治理代币', total: '100,000,000', price: '$0.152' },
        { symbol: 'NEX', name: 'NEX Exchange', logo: 'assets/nex_logo.webp', desc: '兑换权益', total: '200,000,000', price: '$0.00' },
        { symbol: 'NET', name: 'NET Energy', logo: 'assets/net_logo.webp', desc: '能源代币', total: '300,000,000', price: '$0.00' },
        { symbol: 'NEA', name: 'NEA Asset', logo: 'assets/nea_logo.webp', desc: '资产权益', total: '400,000,000', price: '$0.00' },
        { symbol: 'NRY', name: 'NRY Royalty', logo: 'assets/nry_logo.webp', desc: '分红权益', total: '500,000,000', price: '$0.00' },
        { symbol: 'NCL', name: 'NCL Capital', logo: 'assets/ncl_logo.webp', desc: '资本权益', total: '600,000,000', price: '$0.00' },
    ];

    container.innerHTML = tokens.map(t => `
        <div class="glass-card rounded-2xl p-5 border-l-4 border-blue-500">
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-3">
                    <img src="${t.logo}" alt="${t.symbol}" class="w-10 h-10 rounded-full object-contain" onerror="this.src='https://picsum.photos/40/40'">
                    <div>
                        <div class="font-bold text-sm text-slate-800">${t.symbol}</div>
                        <div class="text-[9px] text-slate-400">${t.desc}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-sm text-blue-600">${t.price}</div>
                    <div class="text-[9px] text-slate-400">Market Price</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-500 mt-3 pt-3 border-t border-slate-100">
                <div><span class="opacity-50">总发行量</span><div class="text-slate-800 text-sm mt-0.5">${t.total}</div></div>
                <div><span class="opacity-50">K线图表</span><div class="text-slate-800 text-sm mt-0.5 bg-slate-50 p-2 rounded">K线预览区域</div></div>
            </div>
        </div>
    `).join('');
}

// 渲染首页公告
export function renderNews() {
    const container = document.getElementById('news-container');
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white/50 p-3 rounded-xl border border-slate-50">
            <p class="text-xs font-bold text-slate-800">NEO生态挖矿矩阵正式上线</p>
            <p class="text-[10px] text-slate-400">2026-04-01</p>
        </div>
        <div class="bg-white/50 p-3 rounded-xl border border-slate-50">
            <p class="text-xs font-bold text-slate-800">矿机限时折扣活动开启</p>
            <p class="text-[10px] text-slate-400">2026-04-02</p>
        </div>
    `;
}
