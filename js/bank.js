/**
 * NEO 链上银行模块
 * ------------------------------------------------------------------
 * 数据对接说明：
 *   读取：GET {BANK_API}?address=<钱包地址>
 *         后端从 Google Sheets「银行」表按「用户」列匹配，返回：
 *         { pool: { totalStaked }, user: { myStake, period, rate, daily } }
 *         - 全网总质押(totalStaked)：公共数据，每个用户加载相同值
 *         - 我的质押/质押周期/质押利率/预估每日收益：用户级
 * ------------------------------------------------------------------
 */
(function () {
    'use strict';

    var BANK_API = 'https://api.neoneo.ink/api/bank';

    // 查询银行公共数据与用户存款信息
    window.fetchBankInfo = async function (address) {
        if (!address) return null;
        var url = BANK_API + '?address=' + encodeURIComponent(address) + '&t=' + Date.now();
        try {
            var res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var data = await res.json();
            if (!data || data.success === false) return null;
            return data;
        } catch (e) {
            console.error('[银行] 查询银行数据失败:', e.message);
            return null;
        }
    };

    // 通用格式化：避免单位重复（sheet 里可能已带 % / $ / NEO / 天）
    function fmt(val, unit, opts) {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        if (!s) return (opts && opts.empty) || unit;
        if (opts && opts.prefix) {
            return (s.charAt(0) === opts.prefix ? '' : opts.prefix) + s;
        }
        if (unit && s.indexOf(unit) !== -1) return s;
        return s + (unit || '');
    }

    // 金额/数量格式化：解析「19387423NEO」这类数字+单位，转「19,387,423 NEO」
    function fmtAmount(val, defaultUnit) {
        var s = (val === null || val === undefined) ? '' : String(val).trim();
        if (!s) return '--';
        var num = s.replace(/[^0-9.]/g, '');
        var unit = s.replace(/[0-9.,\s]/g, '');
        if (unit && unit.charAt(0) === '.') unit = unit.slice(1);
        var n = parseFloat(num);
        if (isNaN(n)) return s;
        var out = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
        var u = unit || defaultUnit || '';
        return u ? (out + ' ' + u) : out;
    }

    // 渲染银行数据到 UI
    window.renderBank = function (data) {
        var set = function (id, v) {
            var el = document.getElementById(id);
            if (el) el.textContent = v;
        };
        window.bankData = data || null;
        if (!data) {
            set('bank_tvl', '--');
            set('bank_my_stake', '--');
            set('bank_my_period', '--');
            set('bank_my_rate', '--');
            set('bank_my_daily', '--');
            return;
        }
        var pool = data.pool || {};
        var user = data.user || {};
        set('bank_tvl', fmtAmount(pool.totalStaked, 'NEO'));
        set('bank_my_stake', fmtAmount(user.myStake, 'NEO'));
        set('bank_my_period', fmt(user.period, '', { empty: '--' }));
        set('bank_my_rate', fmt(user.rate, '', { empty: '--' }));
        set('bank_my_daily', fmtAmount(user.daily, 'NEO'));
    };

    // 从 localStorage 读取地址并刷新银行数据
    window.refreshBank = async function (address) {
        var addr = address || localStorage.getItem('fbs_address') || '';
        if (!addr) { window.renderBank(null); return; }
        var data = await window.fetchBankInfo(addr);
        window.renderBank(data);
    };

    // 钱包地址/链变化时刷新
    var refreshTimer = null;
    window.addEventListener('fbs-storage-change', function () {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            window.refreshBank();
            refreshTimer = null;
        }, 600);
    });

    // 页面加载后主动刷一次
    window.addEventListener('load', function () {
        setTimeout(function () { window.refreshBank(); }, 800);
    });

    // 读取用户银行字段原始值
    function getBankUser(key) {
        var d = (window.bankData && window.bankData.user) || {};
        var v = d[key];
        return (v === null || v === undefined) ? '' : String(v).trim();
    }

    // 提取收益弹窗（可提取收益 + 输入框）
    window.claimBankIncome = function () {
        var income = fmtAmount(getBankUser('daily'), 'NEO');
        window.showModal('bank_btn_income', `
            <div class="space-y-3 text-left">
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="bank_income_balance">可提取收益</span>
                    <span class="text-sm font-black text-purple-600">${income}</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="bank_income_label">提取数量</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="bankIncomeAmount" placeholder="0.0" step="any" min="0"
                               class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <span class="text-xs font-black">NEO</span>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="window.doClaimBankIncome()" class="action-btn w-full mt-1">
                    <span data-i18n="bank_income_confirm">确认提取</span>
                </button>
            </div>`);
    };

    // 提取本金弹窗（可提取本金 + 到期时间 + 输入框）
    window.withdrawBankPrincipal = function () {
        var principal = fmtAmount(getBankUser('myStake'), 'NEO');
        var due = fmt(getBankUser('period'), '', { empty: '--' });
        window.showModal('bank_btn_principal', `
            <div class="space-y-3 text-left">
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="bank_principal_balance">可提取本金</span>
                    <span class="text-sm font-black text-purple-600">${principal}</span>
                </div>
                <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] font-black text-slate-500 uppercase" data-i18n="bank_principal_due">到期时间</span>
                    <span class="text-sm font-black text-purple-600">${due}</span>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-500 uppercase mb-1.5 px-1" data-i18n="bank_income_label">提取数量</p>
                    <div class="flex items-center gap-2">
                        <input type="number" id="bankPrincipalAmount" placeholder="0.0" step="any" min="0"
                               class="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-black text-sm border-none outline-none">
                        <div class="flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl shrink-0">
                            <span class="text-xs font-black">NEO</span>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="window.doWithdrawBankPrincipal()" class="action-btn w-full mt-1">
                    <span data-i18n="bank_principal_confirm">确认提取本金</span>
                </button>
            </div>`);
    };

    // 确认提取收益
    window.doClaimBankIncome = async function () {
        var amount = parseFloat(document.getElementById('bankIncomeAmount') && document.getElementById('bankIncomeAmount').value) || 0;
        if (amount <= 0) { alert('请输入提取数量'); return; }
        if (!window.executeSignatureAction) { alert('提交模块未加载，请刷新页面重试'); return; }
        await window.executeSignatureAction('提取收益', amount.toString(), 'NEO', 'claim_bank_income', {});
        setTimeout(function () { window.refreshBank && window.refreshBank(); }, 2000);
    };

    // 确认提取本金（按输入数量提取）
    window.doWithdrawBankPrincipal = async function () {
        var amount = parseFloat(document.getElementById('bankPrincipalAmount') && document.getElementById('bankPrincipalAmount').value) || 0;
        if (amount <= 0) { alert('请输入提取数量'); return; }
        var principal = getBankUser('myStake');
        var maxNum = parseFloat(principal.replace(/[^0-9.]/g, '')) || 0;
        if (amount > maxNum) { alert('提取数量超过可提取本金'); return; }
        if (!window.executeSignatureAction) { alert('提交模块未加载，请刷新页面重试'); return; }
        await window.executeSignatureAction('提取本金', amount.toString(), 'NEO', 'withdraw_bank_principal', { due: getBankUser('period') });
        setTimeout(function () { window.refreshBank && window.refreshBank(); }, 2000);
    };
})();