import { tokenInfo, STATUS_CLASS_MAP } from './config.js';

// 格式化时间
export function formatTime(timestamp) {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// 渲染代币列表
export function renderTokenList(balances = {}) {
    // 原有代码保持不变...
}

// 渲染交易历史
export function renderHistory(history) {
    // 原有代码保持不变...
}

// 渲染转账流水
export function renderTransfers(transfers) {
    // 原有代码保持不变...
}

// 👇 新增/确保存在的看板渲染函数
export function renderStatsPage(lang) {
    const container = document.getElementById('token-detail-list');
    if (!container) return;

    const tokens = [
        { symbol: 'NEO', name: 'Neo Token', desc: '生态治理代币', total: '100,000,000', price: '$0.152' },
        { symbol: 'NEX', name: 'Neo Exchange', desc: '兑换权益代币', total: '200,000,000', price: '$0.000' },
        { symbol: 'NET', name: 'Neo Energy', desc: '能源代币', total: '300,000,000', price: '$0.000' },
        { symbol: 'NEA', name: 'Neo Asset', desc: '资产权益', total: '400,000,000', price: '$0.000' },
        { symbol: 'NRY', name: 'Neo Royalty', desc: '分红权益', total: '500,000,000', price: '$0.000' },
        { symbol: 'NCL', name: 'Neo Capital', desc: '资本权益', total: '600,000,000', price: '$0.000' },
        { symbol: 'USDT', name: 'Tether USD', desc: '稳定币', total: 'Unlimited', price: '$1.000' },
    ];

    container.innerHTML = tokens.map(item => `
        <div class="glass-card rounded-2xl p-5 border-l-4 border-blue-500">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center font-bold text-blue-600">${item.symbol.substring(0,1)}</div>
                    <div>
                        <div class="font-bold text-sm text-slate-800">${item.symbol}</div>
                        <div class="text-[10px] text-slate-400">${item.name}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-black text-sm text-blue-600">${item.price}</div>
                    <div class="text-[9px] text-slate-400">Market Price</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-500 mt-3 pt-3 border-t border-slate-100">
                <div>
                    <span class="opacity-50">总发行量</span>
                    <div class="text-slate-800 text-sm mt-0.5">${item.total}</div>
                </div>
                <div>
                    <span class="opacity-50">代币描述</span>
                    <div class="text-slate-800 text-sm mt-0.5">${item.desc}</div>
                </div>
            </div>
        </div>
    `).join('');
}
