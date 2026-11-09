
(function () {
    'use strict';

    var STUDIO_API = 'https://api.neoneo.ink/api/studio';

    function fmtNum(val) {
        var n = parseFloat(String(val || "0").replace(/,/g, ""));
        if (isNaN(n)) return "0";
        return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }

    window.fetchStudioData = async function (address) {
        if (!address) return null;
        var url = STUDIO_API + '?address=' + encodeURIComponent(address) + '&t=' + Date.now();
        try {
            var res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            if (!res.ok) return null;
            var data = await res.json();
            if (!data || data.success === false) return null;
            return data;
        } catch (e) {
            console.error('[Studio] 查询工作室数据失败:', e.message);
            return null;
        }
    };

    window.renderStudio = function (data) {
        var section = document.getElementById('studio_section');
        if (!section) return;
        if (!data || !data.user) {
            section.classList.add('hidden');
            return;
        }
        var u = data.user;
        var set = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        set('studio_id', u.studioId || '--');
        set('studio_name', u.name || '--');
        set('studio_age', u.age != null ? u.age : '--');
        set('studio_phone', u.phone || '--');
        set('studio_address', u.address || '--');
        set('studio_subsidy', fmtNum(u.subsidy));
        set('studio_monthly', fmtNum(u.monthlyVolume));
        section.classList.remove('hidden');
        window.studioData = data;
    };

    window.refreshStudio = async function () {
        var addr = localStorage.getItem('fbs_address') || '';
        if (!addr) { window.renderStudio(null); return; }
        var data = await window.fetchStudioData(addr);
        window.renderStudio(data);
    };

    function t(key) {
        var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
        var dict = window.i18nData && window.i18nData[lang];
        if (!dict) dict = window.i18nData && window.i18nData['zh-CN'];
        return (dict && dict[key]) || key;
    }

    window.showStudioRules = function () {
        if (typeof window.showModal !== 'function') return alert('页面正在加载中，请稍后重试');
        var reqs = ['studio_rules_req_1','studio_rules_req_2','studio_rules_req_3','studio_rules_req_4','studio_rules_req_5','studio_rules_req_6'];
        var subs = ['studio_rules_subsidy_1','studio_rules_subsidy_2','studio_rules_subsidy_3','studio_rules_subsidy_4','studio_rules_subsidy_5','studio_rules_subsidy_6'];
        var calcs = ['studio_rules_calc_1','studio_rules_calc_2'];
        window.showModal('studio_rules_title', `
            <div class="max-h-[70vh] overflow-y-auto space-y-4 text-left pr-1">
                <div>
                    <p class="text-xs font-black text-purple-600 mb-1.5">${t('studio_rules_req_title')}</p>
                    <ol class="list-decimal list-inside space-y-1 text-[11px] font-bold text-slate-700 leading-relaxed">
                        ${reqs.map(function(k){ return '<li>' + t(k) + '</li>'; }).join('')}
                    </ol>
                </div>
                <div>
                    <p class="text-xs font-black text-purple-600 mb-1.5">${t('studio_rules_subsidy_title')}</p>
                    <ol class="list-decimal list-inside space-y-1 text-[11px] font-bold text-slate-700 leading-relaxed">
                        ${subs.map(function(k){ return '<li>' + t(k) + '</li>'; }).join('')}
                    </ol>
                </div>
                <div>
                    <p class="text-xs font-black text-purple-600 mb-1.5">${t('studio_rules_calc_title')}</p>
                    <ol class="list-decimal list-inside space-y-1 text-[11px] font-bold text-slate-700 leading-relaxed">
                        ${calcs.map(function(k){ return '<li>' + t(k) + '</li>'; }).join('')}
                    </ol>
                </div>
            </div>
        `);
        var titleEl = document.getElementById('modalTitle');
        if (titleEl) titleEl.textContent = t('studio_rules_title');
    };

    window.withdrawStudioSubsidy = function () {
        if (typeof window.showModal !== 'function') return alert('页面正在加载中，请稍后重试');
        var available = (window.studioData && window.studioData.user && window.studioData.user.subsidy) || 0;
        var display = fmtNum(available);
        window.showModal('studio_withdraw', `
            <div class="space-y-3 text-left">
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase">${t('studio_available_label')}</span>
                    <span class="text-sm font-black text-purple-600">${display} USDT</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1">${t('studio_amount_label')}</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="studioWithdrawAmount" placeholder="0" step="any" min="0" max="${available}" class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <span class="text-xs font-black">USDT</span>
                        </div>
                    </div>
                </div>
                <button type="button" id="studioWithdrawBtn" class="w-full py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all">
                    ${t('studio_confirm_withdraw')}
                </button>
            </div>
        `);
        var titleEl = document.getElementById('modalTitle');
        if (titleEl) titleEl.textContent = t('studio_withdraw_btn');
        var btn = document.getElementById('studioWithdrawBtn');
        if (btn) {
            btn.addEventListener('click', async function () {
                var input = document.getElementById('studioWithdrawAmount');
                var amount = parseFloat(input && input.value) || 0;
                if (amount <= 0) return alert(t('studio_err_invalid'));
                if (amount > available) return alert(t('studio_err_exceed'));
                btn.disabled = true;
                btn.textContent = t('studio_submitting');
                try {
                    var res = await window.postTransactionRecord('领取补助', amount, 'USDT');
                    if (res && (res.success || res.code === 0)) {
                        if (window.refreshStudio) window.refreshStudio();
                    } else {
                        alert(t('studio_err_fail') + (res && res.msg || t('studio_err_unknown')));
                        btn.disabled = false;
                        btn.textContent = t('studio_confirm_withdraw');
                    }
                } catch (e) {
                    alert(t('studio_err_fail') + (e.message || e));
                    btn.disabled = false;
                    btn.textContent = t('studio_confirm_withdraw');
                }
            });
        }
    };
})();