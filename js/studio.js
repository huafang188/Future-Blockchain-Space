
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

    window.withdrawStudioSubsidy = function () {
        if (typeof window.showModal !== 'function') return alert('页面正在加载中，请稍后重试');
        var available = (window.studioData && window.studioData.user && window.studioData.user.subsidy) || 0;
        var display = fmtNum(available);
        window.showModal('studio_withdraw', `
            <div class="space-y-3 text-left">
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase">可提取补助</span>
                    <span class="text-sm font-black text-purple-600">${display} USDT</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1">提取数量 (USDT)</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="studioWithdrawAmount" placeholder="0" step="any" min="0" max="${available}" class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <span class="text-xs font-black">USDT</span>
                        </div>
                    </div>
                </div>
                <button type="button" id="studioWithdrawBtn" class="w-full py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all">
                    确认提取
                </button>
            </div>
        `);
        var titleEl = document.getElementById('modalTitle');
        if (titleEl) titleEl.textContent = '提取补助';
        var btn = document.getElementById('studioWithdrawBtn');
        if (btn) {
            btn.addEventListener('click', async function () {
                var input = document.getElementById('studioWithdrawAmount');
                var amount = parseFloat(input && input.value) || 0;
                if (amount <= 0) return alert('请输入有效数量');
                if (amount > available) return alert('提取数量超过可提取补助');
                btn.disabled = true;
                btn.textContent = '提交中...';
                try {
                    var res = await window.postTransactionRecord('领取补助', amount, 'USDT');
                    if (res && (res.success || res.code === 0)) {
                        if (window.refreshStudio) window.refreshStudio();
                    } else {
                        alert('提取失败：' + (res && res.msg || '未知错误'));
                        btn.disabled = false;
                        btn.textContent = '确认提取';
                    }
                } catch (e) {
                    alert('提取失败：' + (e.message || e));
                    btn.disabled = false;
                    btn.textContent = '确认提取';
                }
            });
        }
    };
})();