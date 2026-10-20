import { API_BASE, getTeamByInviter, findTopLevelInviter, ACTIVE_CHAINS } from './config.js';

let fetchController = null;

let csrfToken = null;

let pendingRequest = null;

function isSettlementSubmission(type, action) {
  const settleActions = new Set(["exchange", "redeem", "swap", "sell", "buy", "withdraw_exchange", "兑换"]);
  if (action && settleActions.has(String(action).toLowerCase())) return true;

  const txType = String(type || "").toLowerCase();
  const txKeywords = ["兑换", "卖出", "出售", "提现兑换", "实时结算", "exchange", "sell", "redeem", "withdraw"];
  for (const kw of txKeywords) {
    if (txType.includes(kw.toLowerCase())) return true;
  }
  return false;
}

function snapshotBalances() {
  const b = window.userBalances || (window.currentUserInfo && window.currentUserInfo.balances) || {};
  const snap = {};
  for (const k of Object.keys(b)) {
    const v = parseFloat(b[k]);
    snap[k] = isNaN(v) ? String(b[k]) : v;
  }
  return JSON.stringify(snap);
}

async function smartRefreshAfterTransaction(type, action, address) {
  if (!address) return;
  const needPolling = isSettlementSubmission(type, action);

  const doRefresh = async (label) => {
    try {
      console.log(`[API][刷新] ${label} (${type}/${action})`);
      await fetchUserData(address, { silent: true });
      return true;
    } catch (e) {
      console.warn(`[API][刷新] ${label} 失败:`, e.message);
      return false;
    }
  };

  if (!needPolling) {
    await doRefresh("立即");
    setTimeout(() => doRefresh("补刷(500ms)"), 500);
    return;
  }

  console.log(`[API][轮询] 检测到结算类操作 ${type}，启动 4 次轮询刷新`);
  const schedule = [0, 3000, 8000, 15000];
  let initialSnapshot = null;

  for (let i = 0; i < schedule.length; i++) {
    const delay = schedule[i];
    const label = `轮询${i + 1}/${schedule.length} (T+${delay}ms)`;

    await new Promise(r => setTimeout(r, delay));
    await doRefresh(label);

    const current = snapshotBalances();
    if (i === 0) {
      initialSnapshot = current;
    } else if (initialSnapshot && current !== initialSnapshot) {
      console.log(`[API][轮询] ✅ 余额已变化，结算完成，提前结束轮询`);
      if (window.showToast) window.showToast("结算完成，余额已更新", "success", 2500);
      return;
    }
  }
  console.log(`[API][轮询] 已完成全部 ${schedule.length} 次刷新，若余额仍未变化请稍后手动刷新`);
}

function getCsrfToken() {
    if (!csrfToken) {
        csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        localStorage.setItem('fbs_csrf_token', csrfToken);
    }
    return csrfToken;
}

function handleApiError(message) {
    if (window.showModal) {
        window.showModal("错误", `<div class="p-4 text-center">${message}</div>`);
    } else {
        alert(message);
    }
}

export async function postTransactionRecord(type, amount, symbol, action = "record_transaction", extraFields = {}) {
    const address = localStorage.getItem('fbs_address');

    if (!address) {
        alert("请先连接钱包");
        return { success: false };
    }

    const chain = localStorage.getItem('fbs_chain') || 'BSC';
    const cleanAddr = address.toLowerCase().trim();

    const payload = {
        action: action,        
        address: cleanAddr,
        chain: chain,                
        type: type,            
        amount: String(amount),
        symbol: symbol,        
        turnstileToken: window.getTurnstileToken ? window.getTurnstileToken() : "", 
        ...extraFields
    };

    console.log(`[API] 发起 POST 请求 [${action}]:`, payload);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 30000); 

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = await response.json();

        if (result.success || result.code === 0) {
            console.log(`[API] ${type} 后端写入成功`);
            if (window.resetTurnstile) window.resetTurnstile(); 

            if (window.closeModal) window.closeModal();

            if (type === "绑定关系") {
                try {
                    await fetchUserData(address, { silent: true });
                    const userInfo = window.currentUserInfo;
                    if (userInfo) {
                        const inviter = userInfo.inviter || userInfo["推荐人"] || '---';
                        const myCode = userInfo.inviteCode || userInfo["推荐码"] || '---';
                        alert(`✅ 绑定成功！\n\n您的推荐人: ${inviter}\n您的推荐码: ${myCode}\n\n数据已自动刷新`);
                    }
                } catch (syncError) {
                    console.error("[API] 绑定关系刷新失败:", syncError);
                    alert(`✅ 绑定已提交成功！\n\n但数据刷新失败，请手动刷新页面查看您的推荐人和推荐码`);
                }
            }

            if (type !== "绑定关系") {
                setTimeout(() => {
                    smartRefreshAfterTransaction(type, action, address).catch(e =>
                        console.warn("[API] 智能刷新异常:", e.message)
                    );
                }, 0);
            }

            return { success: true, data: result };
        } else {

            if (window.closeModal) window.closeModal();
            handleApiError(`提交失败: ${result.msg || "服务器繁忙"}`);
            return { success: false };
        }
    } catch (e) {

        if (e.name === 'AbortError') {
            handleApiError("请求超时，请检查网络连接或稍后重试");
            return { success: false, error: "timeout" };
        }

        if (e.message === 'Failed to fetch') return { success: false };
        console.error("[API] POST 请求异常:", e);
        handleApiError(`请求异常: ${e.message}`);
        return { success: false, error: e.message };
    }
}

export async function fetchUserData(address, options = {}) {
    if (!address) return;

    const { silent = false } = options;
    const chain = localStorage.getItem('fbs_chain') || 'BSC';

    if (!ACTIVE_CHAINS.includes(chain)) {
        console.log(`[API] 当前链 ${chain} 未激活，跳过数据请求`);
        return;
    }

    const requestKey = `${chain}:${address}`;
    if (pendingRequest && pendingRequest.key === requestKey) {
        console.log(`[API] 检测到重复请求 (${requestKey})，等待已有请求完成`);
        try {
            return await pendingRequest.promise;
        } catch (e) {

            console.warn(`[API] 等待重复请求时出错: ${e.message}`);
        }
    }

    if (fetchController) fetchController.abort();
    fetchController = new AbortController();
    const { signal } = fetchController;

    let resolvePromise, rejectPromise;
    const requestPromise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    pendingRequest = {
        key: requestKey,
        promise: requestPromise,
        resolve: resolvePromise,
        reject: rejectPromise
    };

    try {
        if (!silent) {
            console.log(`[API] 正在从后端同步数据: ${address} (链: ${chain})`);
        }
        const requestStart = Date.now();
        const cleanAddr = address.toLowerCase().trim();

        const res = await fetch(`${API_BASE}?address=${cleanAddr}&t=${Date.now()}`, { signal });
        const requestDuration = Date.now() - requestStart;

        if (!res.ok) {
            let errDetail = `HTTP Error: ${res.status}`;
            try {
                const errBody = await res.json();
                console.error("[API] 后端错误响应:", errBody);
                if (errBody?._diag) {
                    errDetail += ` | ${errBody._diag.message || ''}`;
                    if (errBody._diag.stack) console.error("[API] 后端堆栈:", errBody._diag.stack);
                } else if (errBody?.error) {
                    errDetail += ` | ${errBody.error}`;
                }
            } catch (_) {  }
            throw new Error(errDetail);
        }

        const parseStart = Date.now();
        const data = await res.json();
        const parseDuration = Date.now() - parseStart;

        if (!silent) {
            console.log(`[API] 请求耗时: ${requestDuration}ms, JSON解析: ${parseDuration}ms, 总计: ${requestDuration + parseDuration}ms`);
            console.log("[API] 后端原始数据包:", data);
        }

        window.lastFetchedData = data;

        if (data.newUser) {
            if (!silent) console.log("[API] 该地址为新用户，待手动绑定");
            updateText('info_inviteCode', '---');
            updateText('info_inviter', '---');

            if (window.renderTokenList) window.renderTokenList({});

            renderMinerLevel(data);
            renderIdentityWeight(data);

            return;
        }

        if (data.allPrices) {
            const normalizedPrices = {};
            Object.keys(data.allPrices).forEach(key => {
                normalizedPrices[key.toUpperCase()] = parseFloat(data.allPrices[key]);
            });
            window.currentPrices = normalizedPrices; 

            if (window.updateNeoPriceDisplay) {
                const neoPrice = normalizedPrices['NEO'] || 0;
                window.updateNeoPriceDisplay(neoPrice);
            }
        }

        window.userBalances = data.balances || {};

        if (window.renderTokenList) {
            window.renderTokenList(data.balances || {});
        }

        const renderNonCritical = () => {

            if (data.priceHistory) {
                window.priceHistory = data.priceHistory;
            }

            const userInfo = {
                inviteCode: data.info?.["推荐码"],
                inviter: data.info?.["推荐人"],
                inviterChain: data.info?.["推荐链"] || [],
                team: null,
                topInviter: null
            };

            if (data.info?.["团队"]) {
                userInfo.team = data.info["团队"];
            }

            else if (userInfo.inviterChain && userInfo.inviterChain.length > 0) {
                const topResult = findTopLevelInviter(userInfo.inviterChain);
                userInfo.topInviter = topResult.inviter;
                userInfo.team = topResult.team;
            }

            else if (userInfo.inviter) {
                userInfo.team = getTeamByInviter(userInfo.inviter);
                userInfo.topInviter = userInfo.inviter;
            }

            window.currentUserInfo = userInfo;
            if (!silent) console.log(`[Team] 用户团队识别结果: ${userInfo.team} (最高层级推荐人: ${userInfo.topInviter || '无'})`);

            updateText('info_inviteCode', data.info?.["推荐码"]);
            updateText('info_inviter', data.info?.["推荐人"]);
            updateText('info_regTime', data.info?.["注册时间"]);

            const bindBtn = document.getElementById('btn_bind_inviter');
            if (bindBtn) {
                if (data.info?.["推荐人"] && data.info["推荐人"] !== '---' && data.info["推荐人"] !== '') {
                    bindBtn.style.display = 'none';
                } else {
                    bindBtn.style.display = 'block';
                }
            }

            let teamData = {
                directCount: 0,
                directSales: 0,
                totalCount: 0,
                totalSales: 0,
                totalReward: 0
            };

            if (data.team) {
                teamData = {
                    directCount: data.team["直推人数"] || 0,
                    directSales: data.team["直推业绩"] || 0,
                    totalCount: data.team["团队人数"] || 0,
                    totalSales: data.team["团队业绩"] || 0,
                    totalReward: data.team["累计奖励"] || 0
                };
            }

            updateText('team_directCount', teamData.directCount);
            updateText('team_directSales', Math.round(teamData.directSales));
            updateText('team_totalCount', teamData.totalCount);
            updateText('team_totalSales', Math.round(teamData.totalSales));
            updateText('team_totalReward', Math.round(teamData.totalReward));

            if (data.miner) {
                updateText('miner_count', data.miner["矿机数量"]);
                updateText('miner_running', data.miner["在运行"]);
                updateText('miner_daily', data.miner["日产量"]);
                updateText('miner_deadline', data.miner["挖矿期限"]); 
                updateText('miner_locked', data.miner["锁仓数量"]);
            }

            renderMinerLevel(data);

            renderIdentityWeight(data);

            if (window.renderHistory) window.renderHistory(data.history || []);
            if (window.renderTransfers) window.renderTransfers(data.transfers || []);

            setTimeout(() => {
                if (window.renderPriceCharts) window.renderPriceCharts();

            }, 100);
        };

        if ('requestIdleCallback' in window) {
            requestIdleCallback(renderNonCritical, { timeout: 200 });
        } else {
            setTimeout(renderNonCritical, 50);
        }

    } catch (e) {
        if (e.name === 'AbortError' || e.message === 'Failed to fetch') {
            console.warn("[API] 请求被中止或页面重载");
        } else {
            console.error("[API] 同步用户数据失败:", e);

            if (!silent) {
                handleApiError(`数据同步失败: ${e.message}`);
            }
        }

        if (pendingRequest && pendingRequest.key === requestKey) {
            pendingRequest.reject(e);
            pendingRequest = null;
        }

        throw e;
    }

    if (pendingRequest && pendingRequest.key === requestKey) {
        pendingRequest.resolve();
        pendingRequest = null;
    }
}

export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");

    const myCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const res = await postTransactionRecord(
        "绑定关系", 
        "0", 
        "INFO", 
        "bind_inviter", 
        { inviterId: inviterId, myInviteCode: myCode }
    );

    if (res.success) {
        alert("✅ 推荐人绑定成功");
    }
}

export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return; 

    const isNumberField = id.includes('Sales') || id.includes('Reward') || id.includes('totalValue') || 
                          id.includes('bal_') || id.includes('val_') || id.includes('price_') || 
                          id.includes('locked') || id.includes('daily') || id.includes('Count');

    if (value === undefined || value === null || value === "" || value === "NaN") {
        el.innerText = isNumberField ? "0.00" : "--";
        return;
    }

    if (isNumberField && !isNaN(value)) {
        let num = parseFloat(value);

        let decimals = id.includes('price_') ? 4 : (id.includes('Sales') || id.includes('Reward')) ? 0 : 2;
        el.innerText = num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    } else {

        el.innerText = value;

        if (id === 'miner_deadline') {
            applyClampBehavior(el, String(value));
        }
    }
}

function applyClampBehavior(el, rawValue) {

    el.classList.remove('fbs-clamp');
    el.onclick = null;
    el.title = '';

    const raw = String(rawValue ?? '');

    const firstLine = (raw.split('\n')[0] || '').trim();
    const hasMore = raw.includes('\n');
    el.innerText = firstLine;

    el.classList.add('fbs-clamp');

    requestAnimationFrame(() => {

        const visible = el.offsetWidth > 0 || el.offsetHeight > 0;
        const overflow = visible ? (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) : false;

        const needClamp = hasMore || overflow || firstLine.length > 14;
        if (!needClamp) {

            el.classList.remove('fbs-clamp');
            return;
        }
        el.title = hasMore ? raw : firstLine; 
        el.onclick = function (e) {
            e.stopPropagation();
            if (!window.showModal) return;

            const safe = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            window.showModal("m_term", `<div class="p-2 text-left break-words whitespace-pre-wrap text-sm font-bold text-slate-700 leading-relaxed">${safe}</div>`);
        };
    });
}

function getMinerLevelTranslation(level) {
    const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    const dict = window.i18nData?.[lang] || window.i18nData?.['zh-CN'] || {};
    return dict[level] || level;
}

const LEVEL_STYLES = {
    '未激活': { color: 'from-gray-400 to-gray-500', textColor: 'text-white', borderColor: 'border-gray-300' },
    '白银矿工': { color: 'from-slate-300 to-slate-400', textColor: 'text-white', borderColor: 'border-slate-300' },
    '白银节点': { color: 'from-slate-400 to-blue-300', textColor: 'text-white', borderColor: 'border-blue-200' },
    '黄金矿工': { color: 'from-amber-400 to-yellow-500', textColor: 'text-white', borderColor: 'border-amber-300' },
    '黄金节点': { color: 'from-amber-500 to-orange-500', textColor: 'text-white', borderColor: 'border-orange-300' },
    '钻石矿工': { color: 'from-cyan-400 to-blue-500', textColor: 'text-white', borderColor: 'border-cyan-300' },
    '钻石节点': { color: 'from-blue-500 to-purple-500', textColor: 'text-white', borderColor: 'border-purple-300' },
    '钻石大师': { color: 'from-purple-500 to-pink-500', textColor: 'text-white', borderColor: 'border-pink-300' },
    '系统维护': { color: 'from-red-500 to-red-600', textColor: 'text-white', borderColor: 'border-red-300' },
    '账户锁定': { color: 'from-red-600 to-red-700', textColor: 'text-white', borderColor: 'border-red-400' },
    '账户异常': { color: 'from-red-700 to-red-800', textColor: 'text-white', borderColor: 'border-red-500' }
};

function extractMinerLevel(data) {
    if (!data) return '';
    return String(data.info?.["矿工等级"] || data.info?.["等级"] ||
                  data.team?.["矿工等级"] || data.team?.["等级"] || '').trim();
}

function renderMinerLevel(data) {
    const levelEl = document.getElementById('minerLevel');

    if (data && typeof data === 'object' && (data.info || data.team)) {
        window.currentMinerLevelData = data;
    }

    data = (data && typeof data === 'object' && (data.info || data.team)) ? data : window.currentMinerLevelData;

    const minerLevel = extractMinerLevel(data);

    if (!levelEl) {
        console.log("[MinerLevel] 未找到 minerLevel 元素");
        return;
    }

    if (!data) {
        console.log("[MinerLevel] 没有可用的数据");
        levelEl.className = 'miner-level-badge opacity-0';
        return;
    }

    console.log("[MinerLevel] 数据对象结构:", {
        info: data.info ? Object.keys(data.info) : null,
        team: data.team ? Object.keys(data.team) : null
    });
    console.log("[MinerLevel] 读取到的矿工等级:", minerLevel);

    if (minerLevel && LEVEL_STYLES[minerLevel]) {
        const style = LEVEL_STYLES[minerLevel];

        const translatedLevel = getMinerLevelTranslation(minerLevel);
        levelEl.innerText = translatedLevel;
        levelEl.className = `miner-level-badge bg-gradient-to-r ${style.color} ${style.textColor} px-3 py-1 rounded-full text-[9px] font-bold border ${style.borderColor} mb-2 inline-block opacity-100 shadow-md`;
        console.log("[MinerLevel] 成功显示矿工等级:", minerLevel, "(翻译后:", translatedLevel, ")");
    } else {

        levelEl.className = 'miner-level-badge opacity-0';
        console.log("[MinerLevel] 矿工等级数据为空或不匹配，隐藏徽章");
    }
}

function renderIdentityWeight(data) {
    const identityEl = document.getElementById('identity_level');
    const weightBar = document.getElementById('weight_bar');
    const weightValue = document.getElementById('weight_value');
    if (!identityEl || !weightBar || !weightValue) return;

    if (data && typeof data === 'object' && (data.info || data.team)) {
        window.currentMinerLevelData = data;
    }

    data = (data && typeof data === 'object' && (data.info || data.team)) ? data : window.currentMinerLevelData;

    const minerLevel = extractMinerLevel(data);
    console.log("[IdentityWeight] 渲染身份与权重, 等级:", minerLevel, "元素存在:", !!identityEl, !!weightBar, !!weightValue);

    updateHoldingValue(data);

    const levelWeightMap = {
        '未激活': 0,
        '白银矿工': 20,
        '白银节点': 40,
        '黄金矿工': 40,
        '黄金节点': 50,
        '钻石矿工': 60,
        '钻石节点': 70,
        '钻石大师': 80,
        '系统维护': 0,
        '账户锁定': 0,
        '账户异常': 0
    };

    if (minerLevel && LEVEL_STYLES[minerLevel]) {
        const style = LEVEL_STYLES[minerLevel];
        const translatedLevel = getMinerLevelTranslation(minerLevel);
        identityEl.innerText = translatedLevel;

        identityEl.className = `text-[10px] font-black px-3 py-1 rounded-full bg-gradient-to-r ${style.color} ${style.textColor} shadow-sm`;

        const weight = levelWeightMap[minerLevel] ?? 0;
        weightValue.innerText = weight + '%';

        const opacity = 0.15 + (weight / 100) * 0.85;
        weightBar.style.width = weight + '%';
        weightBar.style.background = `rgba(124, 58, 237, ${opacity})`;
    } else {
        identityEl.innerText = '--';
        identityEl.className = 'text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 text-slate-400';
        weightValue.innerText = '0%';
        weightBar.style.width = '0%';
        weightBar.style.background = '#e2e8f0';
    }
}

function updateHoldingValue(data) {
    const holdingEl = document.getElementById('holding_value');
    if (!holdingEl) return;
    const neoBal = parseFloat(data?.balances?.['NEO'] ?? 0) || 0;

    holdingEl.textContent = neoBal.toLocaleString(undefined, {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
    }) + ' NEO';
}

window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
window.renderMinerLevel = renderMinerLevel;
window.renderIdentityWeight = renderIdentityWeight;

export async function refreshBalances() {
    const address = window.currentAddress || localStorage.getItem('fbs_address');
    if (!address) {
        alert("请先连接钱包");
        return;
    }

    const refreshBtn = document.querySelector('button[onclick="refreshBalances()"] svg');
    if (refreshBtn) {
        refreshBtn.classList.add('animate-spin');
    }

    try {
        await fetchUserData(address);
        console.log("[Refresh] 余额刷新成功");
    } catch (error) {
        console.error("[Refresh] 余额刷新失败:", error);
        alert("刷新失败，请重试");
    } finally {

        if (refreshBtn) {
            setTimeout(() => refreshBtn.classList.remove('animate-spin'), 500);
        }
    }
}
window.refreshBalances = refreshBalances;
