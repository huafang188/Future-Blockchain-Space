import { tokenInfo } from './config.js';

function getI18nLabels(lang) {
    const currentLang = lang || localStorage.getItem('fbs_lang') || 'en';
    if (window.i18nData && window.i18nData[currentLang]) {
        return window.i18nData[currentLang];
    }
    if (window.i18nData) {
        const availableLangs = Object.keys(window.i18nData);
        if (availableLangs.length > 0) return window.i18nData[availableLangs[0]];
    }
    return null;
}


export function renderNews(lang) {
    const container = document.getElementById('news-container');
    if (!container) return;

    const labels = getI18nLabels(lang);
    if (!labels) {
        container.innerHTML = `<div class="animate-pulse flex flex-col gap-2"><div class="h-3 bg-slate-100 rounded w-3/4"></div></div>`;
        return;
    }

    const newsList = labels.news_list || [];
    if (newsList.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-400 text-[10px] italic">暂无公告 / No News</div>`;
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
 * 2. 渲染行情/详情页
 */
export function renderStatsPage(lang) {
    const container = document.getElementById('token-detail-list');
    if (!container) return;

    const labels = getI18nLabels(lang);
    if (!labels || !labels.tokens) return;

    const tokens = labels.tokens;
    const tLabels = labels.token_labels || {};

    container.innerHTML = tokens.map(token => {
        const configLogo = tokenInfo[token.symbol]?.logo || `assets/${token.symbol.toLowerCase()}_logo.webp`;
        
        return `
        <div class="glass-card p-5 mb-6 transition-all">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-white p-1">
                        <img src="${configLogo}" alt="${token.symbol}" class="w-full h-full object-contain" onerror="this.src='assets/head_logo.png'">
                    </div>
                    <div>
                        <h3 class="font-black text-slate-800 text-base tracking-tighter leading-none">${token.symbol}</h3>
                        <p class="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1">${token.name}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                    <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span class="text-[8px] font-black text-slate-400 uppercase">Live</span>
                </div>
            </div>

            <div class="relative w-full h-32 bg-slate-900/5 rounded-2xl mb-5 border border-white/50 overflow-hidden flex items-center justify-center group">
                <div id="chart-${token.symbol}" class="absolute inset-0 w-full h-full"></div>
                <div class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors cursor-pointer">
                    <i class="fa-solid fa-chart-line mr-1"></i> Market Chart
                </div>
            </div>

            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3 bg-white/40 rounded-2xl p-4 border border-white/60 shadow-sm">
                    <div class="flex flex-col gap-0.5">
                        <span class="text-slate-400 uppercase text-[8px] font-black tracking-tight">${tLabels.position || 'Position'}</span>
                        <span class="text-slate-800 text-[10px] font-bold leading-tight">${token.desc}</span>
                    </div>
                    <div class="flex flex-col gap-0.5 text-right border-l border-white/60 pl-3">
                        <span class="text-slate-400 uppercase text-[8px] font-black tracking-tight">${tLabels.supply || 'Total Supply'}</span>
                        <span class="text-slate-800 text-xs font-black tracking-tighter">${token.total}</span>
                    </div>
                </div>
                
                <div class="px-1 space-y-3">
                    <div class="group">
                        <span class="text-slate-400 uppercase text-[8px] font-black tracking-widest flex items-center gap-1">
                            <i class="fa-solid fa-gears text-[7px]"></i> ${tLabels.mechanism || 'Mechanism'}
                        </span>
                        <p class="text-[10px] text-slate-600 mt-1 font-medium leading-relaxed">${token.mech}</p>
                    </div>
                    <div class="pt-2 border-t border-slate-100/50">
                        <span class="text-slate-400 uppercase text-[8px] font-black tracking-widest">${tLabels.distribution || 'Distribution'}</span>
                        <p class="text-[10px] text-slate-500 mt-1 font-medium italic opacity-70 leading-relaxed">${token.dist}</p>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

/**
 * 3. 渲染资产代币列表
 */
export function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;

    let totalVal = 0;
    let html = '';

    Object.keys(tokenInfo).forEach(symbol => {
        const config = tokenInfo[symbol];
        const unitPrice = config.price || 0;
        const balance = parseFloat(balances[symbol] || 0);
        const currentTokenValue = balance * unitPrice;
        totalVal += currentTokenValue;

        html += `
        <div class="flex justify-between items-center p-4 hover:bg-slate-50/50 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 p-1">
                    <img src="${config.logo}" alt="${symbol}" class="w-full h-full object-contain" onerror="this.src='assets/head_logo.png'">
                </div>
                <div>
                    <div class="font-bold text-sm text-slate-800">${symbol}</div>
                    <div class="text-[10px] text-slate-400 font-black tracking-tight">$${unitPrice.toFixed(unitPrice < 1 ? 4 : 2)}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-black text-sm text-slate-800">${balance.toFixed(4)}</div>
                <div class="text-[9px] text-slate-400 font-bold">$${currentTokenValue.toFixed(2)}</div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    const totalEl = document.getElementById('totalValue');
    if (totalEl) {
        totalEl.innerText = totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

/**
 * 4. 渲染交易历史 (核心修复版)
 */
export function renderHistory(history = []) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!Array.isArray(history) || history.length === 0) {
        const lang = localStorage.getItem('fbs_lang') || 'en';
        const noDataText = (window.i18nData && window.i18nData[lang]) ? (window.i18nData[lang].no_data || 'No Records') : 'No Records';
        container.innerHTML = `<div class="p-12 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest">${noDataText}</div>`;
        return;
    }

    container.innerHTML = history.map(item => {
        // 自动适配中文/英文键名
        const type = item['交易类型'] || item.type || 'Transaction';
        const amount = parseFloat(item['交易数量'] || item.amount || 0);
        const symbol = item['交易代币'] || item.symbol || '';
        const status = item['交易状态'] || item.status || 'Success';
        const time = item['交易时间'] || item.time || item.date || '--';
        
        const isIn = amount > 0 || type.includes('充值') || type.includes('奖励');

        return `
        <div class="list-item mb-3 group hover:border-blue-200 transition-all cursor-pointer">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 ${isIn ? 'bg-emerald-50' : 'bg-blue-50'} rounded-2xl flex items-center justify-center shadow-sm border border-white/50">
                    <i class="fa-solid ${isIn ? 'fa-arrow-down-left text-emerald-500' : 'fa-arrow-up-right text-blue-500'} text-xs"></i>
                </div>
                <div>
                    <p class="text-xs font-black text-slate-800 tracking-tight">${type}</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase">${time}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm font-black ${isIn ? 'text-emerald-500' : 'text-slate-800'}">${isIn ? '+' : ''}${amount} ${symbol}</p>
                <p class="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">${status}</p>
            </div>
        </div>`;
    }).join('');
}

/**
 * 5. 渲染转账记录
 */
export function renderTransfers(transfers = []) {
    const container = document.getElementById('transferList');
    if (!container) return;

    if (!Array.isArray(transfers) || transfers.length === 0) {
        container.innerHTML = `<div class="p-10 text-center opacity-50 text-[9px] text-slate-400 uppercase font-black">Empty Stream</div>`;
        return;
    }

    container.innerHTML = transfers.map(tx => {
        const addr = tx['接收者'] || tx.address || tx.receiver || 'Unknown';
        const amount = tx['接收数量'] || tx.amount || '0';
        const symbol = tx['接收类型'] || tx.symbol || '';
        const time = tx['转账时间'] || tx.time || '--';

        return `
        <div class="flex justify-between items-center p-4 rounded-2xl hover:bg-slate-50/50 transition-colors border-b border-slate-50/50 last:border-none">
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                    <span class="text-[10px] font-black text-slate-700 tracking-tighter">
                        ${addr.length > 10 ? (addr.substring(0, 6) + '...' + addr.slice(-4)) : addr}
                    </span>
                </div>
                <span class="text-[9px] text-slate-400 uppercase font-black pl-3.5">${time}</span>
            </div>
            <div class="text-right">
                <span class="text-xs font-black text-blue-600">${amount} ${symbol}</span>
                <div class="flex items-center justify-end gap-1 mt-0.5">
                    <i class="fa-solid fa-circle-check text-[8px] text-emerald-400"></i>
                    <p class="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">Confirmed</p>
                </div>
            </div>
        </div>`;
    }).join('');
}


window.renderNews = renderNews;
window.renderStatsPage = renderStatsPage;
window.renderTokenList = renderTokenList;
window.renderHistory = renderHistory;
window.renderTransfers = renderTransfers;
