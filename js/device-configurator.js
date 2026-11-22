(function () {
    var CATS = [
        { id: 'gpu', icon: 'fa-microchip' },
        { id: 'mb', icon: 'fa-th-large' },
        { id: 'cpu', icon: 'fa-cogs' },
        { id: 'ram', icon: 'fa-memory' },
        { id: 'net', icon: 'fa-network-wired' },
        { id: 'stg', icon: 'fa-database' },
        { id: 'pwr', icon: 'fa-bolt' }
    ];

    var SKUS = [
        { id: 'GPU-01', cat: 'gpu', name: 'NVIDIA RTX 4060 Ti 16GB GDDR6', price: 480, vram: 16 },
        { id: 'GPU-02', cat: 'gpu', name: 'NVIDIA RTX 4090 24GB GDDR6X', price: 2150, vram: 24 },
        { id: 'GPU-03', cat: 'gpu', name: 'NVIDIA RTX 5090 32GB GDDR7', price: 5800, vram: 32 },
        { id: 'GPU-04', cat: 'gpu', name: 'NVIDIA RTX 6000 Ada 48GB ECC', price: 8900, vram: 48 },
        { id: 'GPU-05', cat: 'gpu', name: 'NVIDIA L40S 48GB GDDR6 ECC', price: 9600, vram: 48 },
        { id: 'GPU-06', cat: 'gpu', name: 'Ascend 910B 64GB HBM', price: 14500, vram: 64 },
        { id: 'GPU-07', cat: 'gpu', name: 'NVIDIA H20 96GB HBM3', price: 15800, vram: 96 },
        { id: 'GPU-08', cat: 'gpu', name: 'NVIDIA H100 80GB HBM3 SXM5', price: 32000, vram: 80 },
        { id: 'GPU-09', cat: 'gpu', name: 'NVIDIA H200 141GB HBM3e SXM5', price: 39500, vram: 141 },
        { id: 'GPU-10', cat: 'gpu', name: 'NVIDIA B200 192GB HBM3e SXM', price: 48000, vram: 192 },
        { id: 'MB-01', cat: 'mb', name: '入门 ATX 主板 + 基础塔式机箱', price: 220 },
        { id: 'MB-02', cat: 'mb', name: '工作站多卡主板 (4x PCIe 5.0) + 机箱', price: 1250 },
        { id: 'MB-03', cat: 'mb', name: '4U 8卡 PCIe 5.0 服务器准系统', price: 11500 },
        { id: 'MB-04', cat: 'mb', name: '8卡 HGX 基板准系统 (内置 NVSwitch)', price: 45000 },
        { id: 'CPU-01', cat: 'cpu', name: 'Intel Core i5-14400F / AMD Ryzen 5 7500F', price: 180 },
        { id: 'CPU-02', cat: 'cpu', name: 'AMD Ryzen Threadripper PRO 7965WX (24核)', price: 2650 },
        { id: 'CPU-03', cat: 'cpu', name: 'Dual Intel Xeon Silver 4514Y (双路套装)', price: 3800 },
        { id: 'CPU-04', cat: 'cpu', name: 'Dual Intel Xeon Platinum 8592+ (双路套装)', price: 11200 },
        { id: 'CPU-05', cat: 'cpu', name: 'Dual AMD EPYC 9654 96-Core (双路套装)', price: 12800 },
        { id: 'RAM-01', cat: 'ram', name: '32GB DDR5 (2x16GB)', price: 110 },
        { id: 'RAM-02', cat: 'ram', name: '128GB DDR5 ECC (4x32GB)', price: 560 },
        { id: 'RAM-03', cat: 'ram', name: '512GB DDR5 ECC (8x64GB)', price: 2200 },
        { id: 'RAM-04', cat: 'ram', name: '1TB DDR5 ECC (16x64GB)', price: 4300 },
        { id: 'RAM-05', cat: 'ram', name: '2TB DDR5 ECC (32x64GB)', price: 8500 },
        { id: 'NET-01', cat: 'net', name: '10GbE SFP+ 单口网卡', price: 120 },
        { id: 'NET-02', cat: 'net', name: '200GbE ConnectX-6 Dx 智能网卡 (单张)', price: 1850 },
        { id: 'NET-03', cat: 'net', name: '400GbE ConnectX-7 InfiniBand/RoCE 网卡 (单张)', price: 3200 },
        { id: 'NET-04', cat: 'net', name: '400G OSFP 高速光模块 (单只)', price: 1100 },
        { id: 'NET-05', cat: 'net', name: '64端口 400GbE InfiniBand 交换机 (单台)', price: 68000 },
        { id: 'STG-01', cat: 'stg', name: '1TB PCIe 4.0 NVMe SSD', price: 75 },
        { id: 'STG-02', cat: 'stg', name: '4TB 企业级 U.3 NVMe SSD', price: 460 },
        { id: 'STG-03', cat: 'stg', name: '7.68TB 企业级 U.3 NVMe SSD (高耐久)', price: 1150 },
        { id: 'STG-04', cat: 'stg', name: '15.36TB 企业级 U.3 NVMe SSD', price: 2200 },
        { id: 'STG-05', cat: 'stg', name: '全闪存并行存储扩展柜 (100TB 有效容量)', price: 48000 },
        { id: 'PWR-01', cat: 'pwr', name: '750W 金牌电源 + 风冷散热器', price: 130 },
        { id: 'PWR-02', cat: 'pwr', name: '2000W 钛金双电源 + 暴力风冷风扇组', price: 1200 },
        { id: 'PWR-03', cat: 'pwr', name: '3000W 冗余电源模块 (单颗)', price: 850 },
        { id: 'PWR-04', cat: 'pwr', name: '机架导轨 + 机柜理线与 PDU 套件', price: 950 },
        { id: 'PWR-05', cat: 'pwr', name: '冷板式液冷 CDU 分配单元与管路套件', price: 36000 }
    ];


    var sel = {};
    var curCat = 'gpu';
    var skuById = {};
    SKUS.forEach(function (s) { skuById[s.id] = s; });

    function t(key) {
        var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
        var dict = window.i18nData && window.i18nData[lang];
        if (!dict) dict = window.i18nData && window.i18nData['zh-CN'];
        return (dict && dict[key]) || key;
    }

    function isZh() {
        var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
        return lang.indexOf('zh') === 0;
    }

    function fmt(n) {
        return '$' + n.toLocaleString('en-US');
    }

    function skuTag(sku) {
        return t('sku_' + sku.id + '_tag');
    }

    function thumbHTML(sku, cls) {
        var cat = CATS.filter(function (c) { return c.id === sku.cat; })[0];
        return '<div class="cfg-thumb cfg-thumb-' + sku.cat + ' ' + (cls || '') + ' flex flex-col items-center justify-center gap-1">' +
            '<i class="fas ' + cat.icon + ' text-white/90 text-3xl"></i>' +
            '<span class="text-[8px] font-mono text-white/70 tracking-widest">' + sku.id + '</span></div>';
    }


    function renderTabs() {
        var el = document.getElementById('cfgTabs');
        if (!el) return;
        el.innerHTML = CATS.map(function (c) {
            var count = SKUS.filter(function (s) { return s.cat === c.id; })
                .reduce(function (a, s) { return a + (sel[s.id] || 0); }, 0);
            var active = c.id === curCat;
            var badge = count > 0 ? '<span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center">' + count + '</span>' : '';
            return '<button type="button" onclick="cfgSwitchCat(\'' + c.id + '\')" class="relative flex-shrink-0 px-4 h-10 rounded-full text-[11px] font-black whitespace-nowrap transition-all ' + (active ? 'bg-orange-500 text-white shadow-md' : 'text-slate-600') + '">' +
                t('cfg_cat_' + c.id) + badge + '</button>';
        }).join('');
    }

    function qtyControl(sku) {
        var n = sel[sku.id] || 0;
        if (n === 0) {
            return '<button type="button" onclick="cfgAdd(\'' + sku.id + '\')" class="h-10 px-5 rounded-full bg-slate-900 text-white text-[11px] font-black transition-transform active:scale-95"><i class="fas fa-plus mr-1"></i>' + t('cfg_add') + '</button>';
        }
        return '<div class="flex items-center gap-1">' +
            '<button type="button" onclick="cfgDec(\'' + sku.id + '\')" class="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-black text-sm transition-transform active:scale-90"><i class="fas fa-minus text-xs"></i></button>' +
            '<span onclick="cfgEditQty(\'' + sku.id + '\', this)" class="min-w-[44px] h-10 px-1 flex items-center justify-center rounded-xl bg-orange-50 border border-orange-200 text-sm font-black text-orange-500 font-mono cursor-pointer select-none">' + n + '</span>' +
            '<button type="button" onclick="cfgInc(\'' + sku.id + '\')" class="w-10 h-10 rounded-full bg-slate-900 text-white font-black text-sm transition-transform active:scale-90"><i class="fas fa-plus text-xs"></i></button>' +
            '</div>';
    }

    function renderList() {
        var el = document.getElementById('cfgList');
        if (!el) return;
        var items = SKUS.filter(function (s) { return s.cat === curCat; });
        el.innerHTML = items.map(function (sku) {
            var n = sel[sku.id] || 0;
            return '<div class="flex items-stretch gap-3 rounded-2xl border border-slate-200/60 p-3">' +
                '<div onclick="cfgOpenPreview(\'' + sku.id + '\')" class="shrink-0 cursor-pointer">' + thumbHTML(sku, 'w-[100px] h-[100px] rounded-xl') + '</div>' +
                '<div class="flex flex-col min-w-0 flex-1 py-0.5">' +
                '<p class="text-[12px] font-black text-slate-900 leading-snug break-words">' + sku.name + '</p>' +
                '<span class="inline-block mt-1 w-fit text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">' + skuTag(sku) + '</span>' +
                '<div class="mt-auto flex items-end justify-between gap-2 pt-2">' +
                '<span class="text-base font-black text-slate-900 font-mono leading-none">' + fmt(sku.price) + '</span>' +
                qtyControl(sku) +
                '</div></div></div>';
        }).join('');
    }

    function summary() {
        var total = 0, vram = 0, count = 0;
        SKUS.forEach(function (s) {
            var n = sel[s.id] || 0;
            if (n > 0) { total += s.price * n; count += n; if (s.vram) vram += s.vram * n; }
        });
        return { total: total, vram: vram, count: count };
    }

    function renderBottom() {
        var el = document.getElementById('cfgBottomInfo');
        if (!el) return;
        var s = summary();
        el.innerHTML =
            '<p class="text-base font-black text-orange-500 font-mono leading-none">' + fmt(s.total) + '</p>' +
            '<p class="text-[9px] font-bold text-slate-500 mt-0.5">' + t('cfg_vram') + ' ' + (s.vram > 0 ? s.vram + 'GB' : '--') + ' · ' + s.count + ' ' + t('cfg_items') + '</p>';
        var badge = document.getElementById('cfgDetailBadge');
        if (badge) {
            badge.textContent = s.count;
            badge.style.display = s.count > 0 ? '' : 'none';
        }
    }

    function renderAll() {
        renderTabs();
        renderList();
        renderBottom();
        renderSheet();
    }

    window.cfgSwitchCat = function (id) {
        curCat = id;
        renderTabs();
        renderList();
    };

    window.cfgAdd = function (id) { sel[id] = 1; renderAll(); };
    window.cfgInc = function (id) { sel[id] = (sel[id] || 0) + 1; renderAll(); };
    window.cfgDec = function (id) {
        sel[id] = (sel[id] || 0) - 1;
        if (sel[id] <= 0) delete sel[id];
        renderAll();
    };

    window.cfgEditQty = function (id, el) {
        var input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.inputMode = 'numeric';
        input.value = sel[id] || 1;
        input.className = 'w-[44px] h-10 text-center rounded-xl bg-white border-2 border-orange-400 text-sm font-black text-slate-900 font-mono outline-none';
        el.replaceWith(input);
        input.focus();
        input.select();
        function commit() {
            var v = parseInt(input.value, 10);
            if (isNaN(v) || v <= 0) v = 1;
            sel[id] = v;
            renderAll();
        }
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') commit(); });
    };

    window.cfgOpenPreview = function (id) {
        var sku = skuById[id];
        var el = document.getElementById('cfgPreview');
        if (!el || !sku) return;
        var cat = CATS.filter(function (c) { return c.id === sku.cat; })[0];
        document.getElementById('cfgPreviewBody').innerHTML =
            thumbHTML(sku, 'w-full h-44 rounded-2xl mb-4').replace('text-3xl', 'text-6xl') +
            '<p class="text-sm font-black text-slate-900 mb-1">' + sku.name + '</p>' +
            '<span class="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mb-3">' + skuTag(sku) + '</span>' +
            '<div class="space-y-1.5 text-[11px] font-bold">' +
            '<div class="flex justify-between"><span class="text-slate-400">' + t('cfg_spec_no') + '</span><span class="font-mono text-slate-800">' + sku.id + '</span></div>' +
            '<div class="flex justify-between"><span class="text-slate-400">' + t('cfg_cat_' + sku.cat) + '</span><span class="text-slate-800">' + t('cfg_cat_' + sku.cat) + '</span></div>' +
            (sku.vram ? '<div class="flex justify-between"><span class="text-slate-400">' + t('cfg_vram') + '</span><span class="font-mono text-slate-800">' + sku.vram + 'GB</span></div>' : '') +
            '<div class="flex justify-between"><span class="text-slate-400">' + t('cfg_unit_price') + '</span><span class="font-mono text-orange-500 text-base">' + fmt(sku.price) + '</span></div>' +
            '</div>' +
            '<button type="button" onclick="cfgSheetClose();cfgAdd(\'' + sku.id + '\')" class="w-full h-11 mt-4 rounded-full bg-slate-900 text-white text-xs font-black transition-transform active:scale-95"><i class="fas fa-plus mr-1"></i>' + t('cfg_add') + '</button>';
        el.classList.remove('hidden');
        requestAnimationFrame(function () { document.getElementById('cfgPreviewPanel').style.transform = 'translateY(0)'; });
    };

    window.cfgSheetClose = function () {
        var p = document.getElementById('cfgPreview');
        var s = document.getElementById('cfgSheet');
        if (p && !p.classList.contains('hidden')) {
            document.getElementById('cfgPreviewPanel').style.transform = 'translateY(100%)';
            setTimeout(function () { p.classList.add('hidden'); }, 250);
        }
        if (s && !s.classList.contains('hidden')) {
            document.getElementById('cfgSheetPanel').style.transform = 'translateY(100%)';
            setTimeout(function () { s.classList.add('hidden'); }, 250);
        }
    };

    window.cfgToggleSheet = function () {
        var s = document.getElementById('cfgSheet');
        if (!s) return;
        if (s.classList.contains('hidden')) {
            renderSheet();
            s.classList.remove('hidden');
            requestAnimationFrame(function () { document.getElementById('cfgSheetPanel').style.transform = 'translateY(0)'; });
        } else {
            cfgSheetClose();
        }
    };

    function renderSheet() {
        var body = document.getElementById('cfgSheetBody');
        if (!body) return;
        var ids = Object.keys(sel);
        if (ids.length === 0) {
            body.innerHTML = '<p class="text-center text-[11px] font-bold text-slate-400 py-8">' + t('cfg_empty') + '</p>';
            return;
        }
        var rows = ids.map(function (id) {
            var sku = skuById[id];
            var n = sel[id];
            return '<div class="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">' +
                thumbHTML(sku, 'w-12 h-12 rounded-lg shrink-0') +
                '<div class="flex-1 min-w-0"><p class="text-[10px] font-black text-slate-800 truncate">' + sku.name + '</p>' +
                '<p class="text-[9px] font-mono text-slate-500">' + fmt(sku.price) + ' × ' + n + ' = ' + fmt(sku.price * n) + '</p></div>' +
                '<div class="flex items-center gap-1 shrink-0">' +
                '<button type="button" onclick="cfgDec(\'' + id + '\');renderSheet();renderTabs();renderBottom();renderList();" class="w-9 h-9 rounded-full bg-slate-100 text-slate-600"><i class="fas fa-minus text-[10px]"></i></button>' +
                '<span class="min-w-[28px] text-center text-xs font-black font-mono">' + n + '</span>' +
                '<button type="button" onclick="cfgInc(\'' + id + '\');renderSheet();renderTabs();renderBottom();renderList();" class="w-9 h-9 rounded-full bg-slate-900 text-white"><i class="fas fa-plus text-[10px]"></i></button>' +
                '<button type="button" onclick="delete sel[\'' + id + '\'];renderSheet();renderTabs();renderBottom();renderList();" class="w-9 h-9 rounded-full bg-red-50 text-red-400"><i class="fas fa-trash text-[10px]"></i></button>' +
                '</div></div>';
        }).join('');
        var s = summary();
        body.innerHTML = rows +
            '<div class="flex items-center justify-between pt-3 pb-1">' +
            '<button type="button" onclick="cfgClearAll()" class="text-[10px] font-black text-red-400 underline">' + t('cfg_clear') + '</button>' +
            '<span class="text-sm font-black font-mono text-slate-900">' + fmt(s.total) + '</span></div>';
    }

    window.renderSheet = renderSheet;
    window.renderTabs = renderTabs;
    window.renderBottom = renderBottom;
    window.renderList = renderList;

    window.cfgClearAll = function () {
        sel = {};
        renderAll();
    };

    function exportText() {
        var lines = [];
        var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
        var isZhLang = lang.indexOf('zh') === 0;
        lines.push(isZhLang ? '=== NEO AI 算力整机配置单 ===' : '=== NEO AI Compute Build ===');
        CATS.forEach(function (c) {
            SKUS.filter(function (s) { return s.cat === c.id && sel[s.id] > 0; }).forEach(function (s) {
                lines.push('[' + c.id.toUpperCase() + '] ' + s.name + ' x' + sel[s.id] + ' = ' + fmt(s.price * sel[s.id]));
            });
        });
        var s = summary();
        lines.push(isZhLang ? '--- 总计: ' + fmt(s.total) + ' | 总显存: ' + (s.vram > 0 ? s.vram + 'GB' : '--') + ' ---' : '--- TOTAL: ' + fmt(s.total) + ' | VRAM: ' + (s.vram > 0 ? s.vram + 'GB' : '--') + ' ---');
        return lines.join('\n');
    }

    window.cfgExport = function () {
        var text = exportText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (window.showToast) window.showToast(t('cfg_copied'), 'success', 2500);
            }).catch(function () { fallbackCopy(text); });
        } else {
            fallbackCopy(text);
        }
    };

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); if (window.showToast) window.showToast(t('cfg_copied'), 'success', 2500); } catch (e) {}
        document.body.removeChild(ta);
    }

    window.cfgOrderNow = function () {
        if (summary().count === 0) {
            if (window.showToast) window.showToast(t('cfg_empty'), 'warning', 2000);
            return;
        }
        window.cfgExport();
    };

    var _origRender = window.i18nRender;
    window.i18nRender = function (lang) {
        if (_origRender) _origRender(lang);
        var app = document.getElementById('cfgApp');
        if (app && !app.closest('.hidden')) renderAll();
    };

    renderAll();
})();