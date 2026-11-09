
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

    window.showStudioRules = function () {
        if (typeof window.showModal !== 'function') return alert('页面正在加载中，请稍后重试');
        window.showModal('studio_rules_title', `
            <div class="max-h-[70vh] overflow-y-auto space-y-4 text-left pr-1">
                <div>
                    <p class="text-xs font-black text-purple-600 mb-1.5">一、工作室要求</p>
                    <ol class="list-decimal list-inside space-y-1 text-[11px] font-bold text-slate-700 leading-relaxed">
                        <li>必须有办公场地，可以服务会员；</li>
                        <li>同一个办公室，只可以申请一位；</li>
                        <li>工作室负责人，必须定期学习 NEO 生态相关知识，接受公司定期培训；</li>
                        <li>办公室只能做 NEO 相关生态；</li>
                        <li>如果隐瞒事实，不予补助；</li>
                        <li>工作室需提交申请，提供工作室负责人信息及地址，用来接收公司宣传物料的发放。</li>
                    </ol>
                </div>
                <div>
                    <p class="text-xs font-black text-purple-600 mb-1.5">二、工作室补助细则</p>
                    <ol class="list-decimal list-inside space-y-1 text-[11px] font-bold text-slate-700 leading-relaxed">
                        <li>当月团队累计业绩：$10000，补助业绩的 5%</li>
                        <li>当月团队累计业绩：$30000，补助业绩的 7%</li>
                        <li>当月团队累计业绩：$50000，补助业绩的 10%</li>
                        <li>当月团队累计业绩：$100000，补助业绩的 12%</li>
                        <li>当月团队累计业绩：$300000，补助业绩的 15%</li>
                        <li>当月团队累计业绩：$500000，补助业绩的 20%</li>
                    </ol>
                </div>
                <div>
                    <p class="text-xs font-black text-purple-600 mb-1.5">三、伞下业绩计算规则</p>
                    <ol class="list-decimal list-inside space-y-1 text-[11px] font-bold text-slate-700 leading-relaxed">
                        <li>工作室用户 A 的「当月新增业绩」= A 伞下所有人当月质押 USDT 或 BNB USDC 或 BUSD 金额之和。</li>
                        <li>如果另一个工作室用户 B 也在 A 的伞下，则剥离 B 的伞下业绩（避免重复计算）。即 A 只算"独占"部分：A 伞下不被任何其他工作室用户伞下覆盖的用户质押之和。</li>
                    </ol>
                </div>
            </div>
        `);
        var titleEl = document.getElementById('modalTitle');
        if (titleEl) titleEl.textContent = '工作室补助细则';
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