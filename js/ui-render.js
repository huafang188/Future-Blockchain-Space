import { tokenInfo } from './config.js';

/**
 * 内部工具：安全获取多语言数据
 * 解决 i18nData 尚未加载或语言 key 不存在的问题
 */
function getI18nLabels(lang) {
    const currentLang = lang || localStorage.getItem('fbs_lang') || 'zh-CN';
    // 强制检查全局变量 i18nData
    if (window.i18nData && window.i18nData[currentLang]) {
        return window.i18nData[currentLang];
    }
    return null; // 如果还没加载好，返回 null 触发 Loading 状态
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

/**
 * 2. 渲染看板代币详情 (修正：从 labels.tokens 渲染)
 */
export function renderStatsPage(lang) {
    const container = document.getElementById('token-detail-list');
    if (!container) return;

    const labels = getI18nLabels(lang);
    if (!labels || !labels.tokens) {
        container.innerHTML = `<div class="p-10 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest animate-pulse">Loading Market Data...</div>`;
        return;
    }

    const tokens = labels.tokens;
    const tLabels = labels.token_labels || {};

    container.innerHTML = tokens.map(token => {
        // 尝试从 config.js 获取对应的 logo，如果配置里没有，则回退到 symbol 命名规则
        const configLogo = tokenInfo[token.symbol]?.logo || `assets/${token.symbol.toLowerCase()}_logo.webp`;
        
        return `
        <div class="glass-card rounded-[2rem] p-6 border-l-4 border-blue-500 shadow-sm mb-4">
            <div class="flex justify-between items-start mb-5">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
                        <img src="${configLogo}" alt="${token.symbol}" class="w-full h-full object-contain" onerror="this.src='assets/head_logo.png'">
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
                        <span class="text-slate-400 uppercase text-[9px] font-black">${tLabels.position || 'Position'}</span>
                        <span class="text-slate-800 leading-tight">${token.desc}</span>
                    </div>
                    <div class="flex flex-col gap-1 text-right">
                        <span class="text-slate-400 uppercase text-[9px] font-black">${tLabels.supply || 'Total Supply'}</span>
                        <span class="text-slate-800">${token.total}</span>
                    </div>
                </div>
                
                <div class="pt-3 border-t border-slate-50">
                    <span class="text-slate-400 uppercase text-[9px] font-black">${tLabels.mechanism || 'Mechanism'}</span>
                    <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">${token.mech}</p>
                </div>

                <div class="pt-3 border-t border-slate-50">
                    <span class="text-slate-400 uppercase text-[9px] font-black">${tLabels.distribution || 'Distribution'}</span>
                    <p class="text-[11px] text-slate-500 mt-1 leading-relaxed italic opacity-80">${token.dist}</p>
                </div>
            </div>
        </div>`;
    }).join('');
}

/**
 * 3. 渲染个人中心代币列表 (修正：严格匹配 config.js)
 */
export function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;

    let totalVal = 0;
    let html = '';

    // 严格按照 config.js 定义的 tokenInfo 渲染，确保顺序和图片一致
    Object.keys(tokenInfo).forEach(symbol => {
        const config = tokenInfo[symbol];
        const balance = parseFloat(balances[symbol] || 0);
        const price = config.price || 0;
        const value = (balance * price).toFixed(2);
        totalVal += parseFloat(value);

        html += `
        <div class="flex justify-between items-center p-4 hover:bg-slate-50/50 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 p-1">
                    <img src="${config.logo}" alt="${symbol}" class="w-full h-full object-contain" onerror="this.src='assets/head_logo.png'">
                </div>
                <div>
                    <div class="font-bold text-sm text-slate-800">${symbol}</div>
                    <div class="text-[10px] text-slate-400 font-black tracking-tight">${balance.toFixed(4)}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-black text-sm text-slate-800">$ ${value}</div>
                <div class="text-[9px] text-slate-400 font-bold">$${price.toFixed(price < 1 ? 4 : 2)}</div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    const totalEl = document.getElementById('totalValue');
    if (totalEl) totalEl.innerText = totalVal.toLocaleString(undefined, {minimumFractionDigits: 2});
}

// 渲染交易历史和转账流水保持原样，但确保已挂载到 window...
export function renderHistory(history) { /* ...保持你的实现... */ }
export function renderTransfers(transfers) { /* ...保持你的实现... */ }

export function i18nRender(lang) {
    const labels = getI18nLabels(lang);
    if (!labels) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (labels[key]) {
            el.tagName === 'INPUT' ? el.placeholder = labels[key] : el.innerText = labels[key];
        }
    });
}

// 全局挂载
window.renderNews = renderNews;
window.renderStatsPage = renderStatsPage;
window.renderTokenList = renderTokenList;
window.renderHistory = renderHistory;
window.renderTransfers = renderTransfers;
window.i18nRender = i18nRender;
