// js/ui-render.js
import { tokenInfo } from './config.js';

/**
 * 基础工具：格式化时间
 */
export function formatTime(timestamp) {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

/**
 * 1. 渲染首页公告 (从 i18nData 调用数组)
 */
export function renderNews(lang = 'zh-CN') {
    const container = document.getElementById('news-container');
    if (!container) return;

    const labels = (window.i18nData && window.i18nData[lang]) ? window.i18nData[lang] : {};
    const newsList = labels.news_list || [];

    if (newsList.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-400 text-[10px] italic">暂无公告</div>`;
        return;
    }

    container.innerHTML = newsList.map(newsText => `
        <div class="bg-white/50 p-3 rounded-xl border border-slate-50 hover:bg-white transition-colors shadow-sm">
            <p class="text-xs font-bold text-slate-800 leading-relaxed">${newsText}</p>
            <div class="flex items-center gap-2 mt-2">
                <span class="w-1 h-1 bg-indigo-400 rounded-full"></span>
                <p class="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Official Update</p>
            </div>
        </div>
    `).join('');
}

/**
 * 2. 渲染看板代币详情 (完全从 i18nData 调用结构化数组)
 */
export function renderStatsPage(lang = 'zh-CN') {
    const container = document.getElementById('token-detail-list');
    if (!container) return;

    const labels = (window.i18nData && window.i18nData[lang]) ? window.i18nData[lang] : {};
    const tokens = labels.tokens || [];
    const tLabels = labels.token_labels || {
        fullname: "Full Name",
        position: "Position",
        supply: "Total Supply",
        distribution: "Distribution",
        mechanism: "Mechanism"
    };

    if (tokens.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-400">Loading Market Data...</div>`;
        return;
    }

    container.innerHTML = tokens.map(token => `
        <div class="glass-card rounded-[2rem] p-6 border-l-4 border-blue-500 shadow-sm mb-4">
            <div class="flex justify-between items-start mb-5">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
                        <img src="assets/${token.symbol.toLowerCase()}_logo.webp" 
                             alt="${token.symbol}" 
                             class="w-full h-full object-cover"
                             onerror="this.src='https://picsum.photos/80/80'">
                    </div>
                    <div>
                        <h3 class="font-black text-slate-800 text-lg tracking-tighter">${token.symbol}</h3>
                        <p class="text-[10px] text-blue-600 font-bold uppercase tracking-widest">${token.name}</p>
                    </div>
                </div>
            </div>

            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4 text-[11px] font-bold">
                    <div class="flex flex-col gap-1">
                        <span class="text-slate-400 uppercase text-[9px] font-black">${tLabels.position}</span>
                        <span class="text-slate-800 leading-tight">${token.desc}</span>
                    </div>
                    <div class="flex flex-col gap-1 text-right">
                        <span class="text-slate-400 uppercase text-[9px] font-black">${tLabels.supply}</span>
                        <span class="text-slate-800">${token.total}</span>
                    </div>
                </div>
                
                <div class="pt-3 border-t border-slate-50">
                    <span class="text-slate-400 uppercase text-[9px] font-black">${tLabels.mechanism}</span>
                    <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">${token.mech}</p>
                </div>

                <div class="pt-3 border-t border-slate-50">
                    <span class="text-slate-400 uppercase text-[9px] font-black">${tLabels.distribution}</span>
                    <p class="text-[11px] text-slate-500 mt-1 leading-relaxed italic opacity-80">${token.dist}</p>
                </div>
            </div>

            <div class="mt-5 h-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
                <div class="text-slate-300 text-xl animate-pulse">📊</div>
                <p class="text-[8px] text-slate-400 font-black uppercase mt-1 tracking-widest">Chart Data Loading</p>
            </div>
        </div>
    `).join('');
}

/**
 * 3. 渲染个人中心：资产代币列表
 */
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
        <div class="flex justify-between items-center p-4 hover:bg-slate-50/50 transition-colors">
            <div class="flex items-center gap-3">
                <img src="assets/${symbol.toLowerCase()}_logo.webp" alt="${symbol}" class="w-8 h-8 rounded-full object-contain" onerror="this.src='https://picsum.photos/40/40'">
                <div>
                    <div class="font-bold text-sm text-slate-800">${symbol}</div>
                    <div class="text-[9px] text-slate-400 font-medium">${balance.toFixed(4)}</div>
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
    if (totalEl) totalEl.innerText = totalVal.toLocaleString(undefined, {minimumFractionDigits: 2});
}

/**
 * 4. 渲染交易历史
 */
export function renderHistory(history) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!history || history.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-300 text-[10px] italic">No Transaction History</div>`;
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="flex justify-between items-center p-3 rounded-xl bg-white/50 border border-slate-50 shadow-sm">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center bg-${['充值', '兑换'].includes(item.type) ? 'emerald' : 'blue'}-50 text-${['充值', '兑换'].includes(item.type) ? 'emerald' : 'blue'}-500 text-[10px]">
                    <i class="fas fa-arrow-${['充值', '兑换'].includes(item.type) ? 'down' : 'up'}"></i>
                </div>
                <span class="text-xs font-bold text-slate-700">${item.type}</span>
            </div>
            <div class="text-right">
                <div class="text-xs font-black text-slate-800">${item.amount} ${item.symbol}</div>
                <div class="text-[9px] text-slate-400">${item.time}</div>
            </div>
        </div>
    `).join('');
}

/**
 * 5. 渲染转账流水
 */
export function renderTransfers(transfers) {
    const container = document.getElementById('transferList');
    if (!container) return;

    if (!transfers || transfers.length === 0) {
        container.innerHTML = `<div class="p-10 text-center text-slate-300 text-[10px] italic">No Transfer Records</div>`;
        return;
    }

    container.innerHTML = transfers.map(item => `
        <div class="p-3 rounded-xl bg-white/50 border border-slate-50 shadow-sm">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-black text-slate-700">${item.type}</span>
                <span class="text-xs font-black text-blue-600">${item.amount}</span>
            </div>
            <div class="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span class="font-mono">${item.to.slice(0, 8)}...${item.to.slice(-6)}</span>
                <span>${item.time}</span>
            </div>
        </div>
    `).join('');
}

/**
 * 6. 多语言 UI 翻译渲染
 */
export function i18nRender(lang) {
    const currentLang = lang || localStorage.getItem('fbs_lang') || 'zh-CN';
    const labels = (window.i18nData && window.i18nData[currentLang]) ? window.i18nData[currentLang] : {};

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (labels[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = labels[key];
            } else {
                el.innerText = labels[key];
            }
        }
    });
}

// --- 关键：全局挂载，确保 navigation.js 和 HTML onclick 可调用 ---
window.renderNews = renderNews;
window.renderStatsPage = renderStatsPage;
window.renderTokenList = renderTokenList;
window.renderHistory = renderHistory;
window.renderTransfers = renderTransfers;
window.i18nRender = i18nRender;
