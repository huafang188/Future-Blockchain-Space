import { tokenInfo } from './config.js';

function getI18nLabels(lang) {
    const currentLang = lang || localStorage.getItem('fbs_lang') || 'ru';
    
    if (window.i18nData && window.i18nData[currentLang]) {
        return window.i18nData[currentLang];
    }

    if (window.i18nData) {
        const availableLangs = Object.keys(window.i18nData);
        if (availableLangs.length > 0) {
            return window.i18nData[availableLangs[0]];
        }
    }
    return null; 
}

/**
 * 1. 渲染首页公告
 */
export function renderNews(lang) {
    const container = document.getElementById('news-container');
    if (!container) return;

    const labels = getI18nLabels(lang);
    
    // 如果数据还没准备好，显示加载中，不要报错
    if (!labels) {
        container.innerHTML = `<div class="animate-pulse flex flex-col gap-2"><div class="h-3 bg-slate-100 rounded w-3/4"></div></div>`;
        return;
    }

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
                    <i class="fa-solid fa-chart-line mr-1"></i> Click to Load Market Chart
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
 * 3. 渲染个人中心：资产代币列表
 */
export function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;

    let totalVal = 0;
    let html = '';

    // 遍历 config.js 中定义的代币信息
    Object.keys(tokenInfo).forEach(symbol => {
        const config = tokenInfo[symbol];
        
        // --- 1. 数据计算 ---
        const unitPrice = config.price || 0; // 单价
        const balance = parseFloat(balances[symbol] || 0); // 数量
        const currentTokenValue = balance * unitPrice; // 总价值
        
        totalVal += currentTokenValue;

        // 格式化处理
        const priceDisplay = unitPrice.toFixed(unitPrice < 1 ? 4 : 2); // 单价精度
        const balanceDisplay = balance.toFixed(4); // 数量显示4位小数
        const valueDisplay = currentTokenValue.toFixed(2); // 总价值显示2位小数

        // --- 2. HTML 结构 (严格对应位置) ---
        html += `
        <div class="flex justify-between items-center p-4 hover:bg-slate-50/50 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 p-1">
                    <img src="${config.logo}" alt="${symbol}" class="w-full h-full object-contain" onerror="this.src='assets/head_logo.png'">
                </div>
                <div>
                    <div class="font-bold text-sm text-slate-800">${symbol}</div>
                    
                    <div class="text-[10px] text-slate-400 font-black tracking-tight">
                        $${priceDisplay}
                    </div>
                </div>
            </div>

            <div class="text-right">
                <div class="font-black text-sm text-slate-800">
                    ${balanceDisplay}
                </div>
                
                <div class="text-[9px] text-slate-400 font-bold">
                    $${valueDisplay}
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    
    // 更新顶部总资产 (Total Asset 依然显示所有币种的总美元价值)
    const totalEl = document.getElementById('totalValue');
    if (totalEl) {
        totalEl.innerText = totalVal.toLocaleString(undefined, {
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2
        });
    }
}

export function renderHistory(history = []) {
    const container = document.getElementById('historyList');
    if (!container) return;

    // --- 核心修复：增加数组检查 ---
    // 如果 history 根本不是数组，或者数组长度为 0
    if (!Array.isArray(history) || history.length === 0) {
        // 获取当前语言下的“无数据”翻译，如果没有则用默认文字
        const lang = localStorage.getItem('fbs_lang') || 'en';
        const noDataText = (window.i18nData && window.i18nData[lang]) 
                           ? (window.i18nData[lang].no_data || 'No Records Found') 
                           : 'No Records Found';

        container.innerHTML = `
            <div class="p-12 text-center">
                <div class="text-slate-200 mb-2"><i class="fa-solid fa-clock-rotate-left text-3xl"></i></div>
                <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest">${noDataText}</p>
            </div>`;
        return;
    }

    // 只有确定是数组了，才执行 map
    container.innerHTML = history.map(item => {
        const isIn = item.type === 'in' || item.amount > 0;
        const icon = isIn ? 'fa-arrow-down-left' : 'fa-arrow-up-right';
        const colorClass = isIn ? 'text-emerald-500' : 'text-slate-800';
        const bgColor = isIn ? 'bg-emerald-50' : 'bg-slate-50';

        return `
        <div class="list-item mb-3 group hover:border-blue-200 transition-all cursor-pointer">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 ${bgColor} rounded-2xl flex items-center justify-center shadow-sm border border-white/50">
                    <i class="fa-solid ${icon} ${isIn ? 'text-emerald-500' : 'text-blue-500'} text-xs"></i>
                </div>
                <div>
                    <p class="text-xs font-black text-slate-800 tracking-tight">${item.title || 'Transaction'}</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase">${item.date || 'Just now'}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm font-black ${colorClass}">
                    ${isIn ? '+' : '-'}${Math.abs(item.amount)}
                </p>
                <p class="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">${item.status || 'Confirmed'}</p>
            </div>
        </div>`;
    }).join('');
}

export function renderTransfers(transfers = []) {
    const container = document.getElementById('transferList');
    if (!container) return;

    // --- 核心修复：增加数组检查 ---
    if (!Array.isArray(transfers) || transfers.length === 0) {
        const lang = localStorage.getItem('fbs_lang') || 'en';
        const emptyText = (window.i18nData && window.i18nData[lang]) 
                          ? (window.i18nData[lang].no_data || 'Empty Transfer Stream') 
                          : 'Empty Transfer Stream';

        container.innerHTML = `
            <div class="p-10 text-center opacity-50">
                <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest italic">${emptyText}</p>
            </div>`;
        return;
    }

    container.innerHTML = transfers.map(tx => `
        <div class="flex justify-between items-center p-4 rounded-2xl hover:bg-slate-50/50 transition-colors border-b border-slate-50/50 last:border-none">
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                    <span class="text-[10px] font-black text-slate-700 tracking-tighter">
                        ${tx.address ? (tx.address.substring(0, 6) + '...' + tx.address.slice(-4)) : 'Unknown'}
                    </span>
                </div>
                <span class="text-[9px] text-slate-400 uppercase font-black pl-3.5">${tx.method || 'Transfer'}</span>
            </div>
            <div class="text-right">
                <span class="text-xs font-black text-blue-600">${tx.amount} ${tx.symbol || ''}</span>
                <div class="flex items-center justify-end gap-1 mt-0.5">
                    <i class="fa-solid fa-circle-check text-[8px] text-emerald-400"></i>
                    <p class="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">Success</p>
                </div>
            </div>
        </div>`).join('');
}


window.renderHistory = renderHistory;
window.renderTransfers = renderTransfers;
window.renderNews = renderNews;
window.renderStatsPage = renderStatsPage;
window.renderTokenList = renderTokenList;
window.renderHistory = renderHistory;
window.renderTransfers = renderTransfers;
