import { tokenConfig } from './config.js';

/**
 * 辅助函数：获取国际化标签数据
 */
function getI18nLabels(lang) {
    const currentLang = lang || localStorage.getItem('fbs_lang') || 'en';
    if (window.i18nData && window.i18nData[currentLang]) {
        return window.i18nData[currentLang];
    }
    // Fallback: 如果没有匹配语言，尝试取第一个可用语言
    if (window.i18nData) {
        const availableLangs = Object.keys(window.i18nData);
        if (availableLangs.length > 0) return window.i18nData[availableLangs[0]];
    }
    return null;
}

/**
 * 1. 渲染公告/新闻列表
 */
export function renderNews(lang) {
    const container = document.getElementById('news-container');
    if (!container) return;

    const labels = getI18nLabels(lang);
    if (!labels) {
        return;
    }

    const newsList = labels.news_list || [];
    if (newsList.length === 0) {
        return;
    }

    const announcementPanel = container.querySelector('#announcement-panel');
    const newsPanel = container.querySelector('#news-panel');
    
    if (announcementPanel && newsPanel) {
        const newsHtml = newsList.map(newsText => `
            <div class="bg-slate-50/50 p-3 rounded-lg">
                <p class="text-xs font-bold text-slate-800 leading-relaxed">${newsText}</p>
                <div class="flex items-center gap-2 mt-2">
                    <span class="w-1 h-1 bg-blue-400 rounded-full"></span>
                    <p class="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Official Update</p>
                </div>
            </div>
        `).join('');

        newsPanel.innerHTML = newsHtml;
    }
}

/**
 * 2. 渲染行情详情页 (包含嵌入式 K 线图表)
 */
export function renderStatsPage(lang) {
    const container = document.getElementById('token-detail-list');
    if (!container) return;

    const labels = getI18nLabels(lang);
    if (!labels || !labels.tokens) return;

    const tokens = labels.tokens;
    const tLabels = labels.token_labels || {};

    container.innerHTML = tokens.map(token => {
        const config = tokenConfig[token.symbol] || {};
        const configLogo = config.logo || `assets/${token.symbol.toLowerCase()}_logo.webp`;
        const chartUrl = config.chartUrl || ""; 

        return `
        <div class="glass-card p-5 mb-6 transition-all border border-white/60">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border p-1">
                        <img src="${configLogo}" alt="${token.symbol}" class="w-full h-full object-contain" onerror="this.src='assets/head_logo.webp'">
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

            <div class="relative w-full h-48 bg-slate-900/5 rounded-2xl mb-5 border border-white/50 overflow-hidden shadow-inner">
                <canvas id="chart-${token.symbol}" class="w-full h-full"></canvas>
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
                    <div>
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

    renderPriceCharts();
}

/**
 * 3. 渲染钱包资产列表 (动态计算价值)
 */
export function renderTokenList(balances = {}) {
    const container = document.getElementById('tokenRows');
    if (!container) return;

    // 从全局变量获取 Worker 抓取的实时价格
    const livePrices = window.currentPrices || {}; 

    let totalValUSD = 0;
    let html = '';

    // 遍历 tokenConfig 确保显示顺序一致
    Object.keys(tokenConfig).forEach(symbol => {
        const config = tokenConfig[symbol];
        
        // 获取单价 (不区分大小写)
        const unitPrice = parseFloat(livePrices[symbol.toUpperCase()]) || 0; 
        const balance = parseFloat(balances[symbol] || 0);
        const currentTokenValue = balance * unitPrice;
        
        totalValUSD += currentTokenValue;

        html += `
        <div class="flex justify-between items-center p-4 hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-none">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 p-1">
                    <img src="${config.logo}" alt="${symbol}" class="w-full h-full object-contain" onerror="this.src='assets/head_logo.webp'">
                </div>
                <div>
                    <div class="font-bold text-sm text-slate-800">${symbol}</div>
                    <div class="text-[10px] text-slate-400 font-black tracking-tight" id="price_${symbol}">
                        $${unitPrice.toFixed(unitPrice < 1 ? 4 : 2)}
                    </div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-black text-sm text-slate-800" id="bal_${symbol}">${balance.toFixed(4)}</div>
                <div class="text-[9px] text-slate-400 font-bold" id="val_${symbol}">$${currentTokenValue.toFixed(2)}</div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    
    // 同步更新页面顶部的总资产数值显示
    const totalEl = document.getElementById('totalValue');
    if (totalEl) {
        totalEl.innerText = totalValUSD.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    }
}

/**
 * 获取代币 Logo
 */
function getTokenLogo(symbol) {
    const logoMap = {
        'NEO': '💜',
        'GAS': '⛽',
        'ETH': '🟣',
        'BTC': '₿',
        'USDT': '💵',
        'USDC': '💳',
        'TON': '🌐',
        'BNB': '🔷',
        'SOL': '⚡',
        'ADA': '🔶',
        'DOT': '🔵',
        'MATIC': '🟢'
    };
    return logoMap[symbol] || '🔹';
}

/**
 * 4. 渲染交易流水 (充值/提现/奖励等)
 */
export function renderHistory(history = []) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!Array.isArray(history) || history.length === 0) {
        const lang = localStorage.getItem('fbs_lang') || 'en';
        const noDataText = (window.i18nData && window.i18nData[lang]) ? (window.i18nData[lang].no_data || 'No Records') : 'No Records';
        container.innerHTML = `<div class="p-12 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest opacity-40">${noDataText}</div>`;
        return;
    }

    container.innerHTML = history.map(item => {
        const type = item['交易类型'] || item.type || 'Transaction';
        const amount = parseFloat(item['交易数量'] || item.amount || 0);
        const symbol = item['交易代币'] || item.symbol || '';
        const status = item['交易状态'] || item.status || 'Success';
        const time = item['交易时间'] || item.time || '--';
        const tokenLogo = getTokenLogo(symbol);
        
        // 判断资金流向渲染颜色
        const isPositive = amount > 0 || type.includes('充值') || type.includes('奖励') || type.includes('收益');

        return `
        <div class="flex items-center justify-between p-4 mb-2 bg-white/50 rounded-2xl border border-slate-50 hover:border-blue-100 transition-all">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 ${isPositive ? 'bg-emerald-50' : 'bg-blue-50'} rounded-xl flex items-center justify-center border border-white text-[18px]">
                    ${tokenLogo}
                </div>
                <div>
                    <p class="text-[11px] font-black text-slate-800 tracking-tight">${type}</p>
                    <p class="text-[8px] text-slate-400 font-bold uppercase">${time}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xs font-black ${isPositive ? 'text-emerald-500' : 'text-slate-800'}">${isPositive ? '+' : ''}${amount} ${symbol}</p>
                <p class="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">${status}</p>
            </div>
        </div>`;
    }).join('');
}

/**
 * 5. 渲染团队转账/内部流水
 */
export function renderTransfers(transfers = []) {
    const container = document.getElementById('transferList');
    if (!container) return;

    if (!Array.isArray(transfers) || transfers.length === 0) {
        container.innerHTML = `<div class="p-10 text-center opacity-30 text-[9px] text-slate-400 uppercase font-black">Streaming Empty</div>`;
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
                        ${addr.length > 12 ? (addr.substring(0, 6) + '...' + addr.slice(-4)) : addr}
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

/**
 * 解析日期字符串（处理飞书格式 DD/MM/YYYY）
 */
function parseDate(dateStr) {
    if (!dateStr) return new Date();
    // 检测格式 DD/MM/YYYY
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 月份从0开始
        const year = parseInt(match[3], 10);
        return new Date(year, month, day);
    }
    return new Date(dateStr);
}

function renderPriceCharts() {
    if (typeof Chart === 'undefined') return;

    const prices = window.currentPrices || {};
    const priceHistory = window.priceHistory || {};
    const tokenSymbols = ['NEO', 'NEX', 'NET', 'NEA', 'NRY', 'NCL'];
    const days = 30;
    const trendColors = {
        NEO: { line: '#6366f1', fill: 'rgba(99,102,241,0.1)' },
        NEX: { line: '#06b6d4', fill: 'rgba(6,182,212,0.1)' },
        NET: { line: '#10b981', fill: 'rgba(16,185,129,0.1)' },
        NEA: { line: '#f59e0b', fill: 'rgba(245,158,11,0.1)' },
        NRY: { line: '#ef4444', fill: 'rgba(239,68,68,0.1)' },
        NCL: { line: '#8b5cf6', fill: 'rgba(139,92,246,0.1)' }
    };

    tokenSymbols.forEach(symbol => {
        const canvas = document.getElementById(`chart-${symbol}`);
        if (!canvas) return;

        const basePrice = parseFloat(prices[symbol]) || 1;
        const colors = trendColors[symbol] || trendColors.NEO;
        const labels = [];
        const data = [];

        // 获取该代币的历史价格数据
        const symbolHistory = priceHistory[symbol] || [];
        
        if (symbolHistory.length > 0 && symbolHistory[0] && symbolHistory[0].price) {
            // 使用真实历史数据
            // 按时间排序（旧到新）
            const sortedHistory = [...symbolHistory].sort((a, b) => {
                const dateA = parseDate(a.execute_time);
                const dateB = parseDate(b.execute_time);
                return dateA - dateB;
            });

            // 取最近的 days 条数据
            const recentHistory = sortedHistory.slice(-days);

            recentHistory.forEach(record => {
                const date = parseDate(record.execute_time);
                labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
                data.push(parseFloat(record.price) || 0);
            });
        } else {
            // 使用模拟数据作为 fallback
            let price = basePrice * 0.65;
            for (let i = 0; i < days; i++) {
                const date = new Date();
                date.setDate(date.getDate() - (days - 1 - i));
                labels.push(`${date.getMonth() + 1}/${date.getDate()}`);

                const volatility = basePrice * 0.03;
                const drift = (basePrice - price) / (days - i) * 0.15;
                const noise = (Math.random() - 0.48) * volatility;
                price = Math.max(basePrice * 0.3, price + drift + noise);
                data.push(parseFloat(price.toFixed(4)));
            }
        }

        if (canvas._chart) canvas._chart.destroy();

        const ctx = canvas.getContext('2d');
        canvas._chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    borderColor: colors.line,
                    backgroundColor: colors.fill,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: colors.line
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `$${ctx.parsed.y.toFixed(4)}`
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { display: false },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 8 },
                            maxTicksLimit: 6
                        }
                    },
                    y: {
                        display: true,
                        grid: { color: 'rgba(148,163,184,0.08)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 8 },
                            callback: v => '$' + v.toFixed(2)
                        }
                    }
                }
            }
        });
    });
}

// 全局挂载，方便外部调用
window.renderNews = renderNews;
window.renderStatsPage = renderStatsPage;
window.renderTokenList = renderTokenList;
window.renderHistory = renderHistory;
window.renderTransfers = renderTransfers;
window.renderPriceCharts = renderPriceCharts;
