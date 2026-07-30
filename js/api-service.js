import { API_BASE, getTeamByInviter, findTopLevelInviter, ACTIVE_CHAINS } from './config.js';

// 用于管理请求取消，彻底解决并发请求导致的 "Failed to fetch" 报错
let fetchController = null;

// CSRF token 管理
let csrfToken = null;

// 请求去重：存储当前正在进行的请求
let pendingRequest = null;

// ========== 交易后智能刷新 ==========

/**
 * 判断当前提交是否属于"需要 Apps Script 后台结算"类型
 * （与 worker.js 的 shouldTriggerSettlement 关键字保持一致）
 * 这类操作写入后不会立即影响余额，需要轮询等待结算结果
 */
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

/**
 * 抓取当前余额快照（用于结算前后对比，变化了就停止轮询）
 */
function snapshotBalances() {
  const b = window.userBalances || (window.currentUserInfo && window.currentUserInfo.balances) || {};
  const snap = {};
  for (const k of Object.keys(b)) {
    const v = parseFloat(b[k]);
    snap[k] = isNaN(v) ? String(b[k]) : v;
  }
  return JSON.stringify(snap);
}

/**
 * 交易成功后的智能刷新策略
 *  - 普通类（绑定/转让/充值等）：立即刷 1 次 → 再 500ms 补 1 次
 *  - 结算类（兑换/提现/出售）：轮询 0s→3s→8s→15s，余额变化提前停止
 */
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

  // 非结算类：立即 + 500ms 补刷
  if (!needPolling) {
    await doRefresh("立即");
    setTimeout(() => doRefresh("补刷(500ms)"), 500);
    return;
  }

  // 结算类：轮询 + 余额对比提前停止
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

/**
 * 生成或获取 CSRF token
 */
function getCsrfToken() {
    if (!csrfToken) {
        csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        // 存储到 localStorage
        localStorage.setItem('fbs_csrf_token', csrfToken);
    }
    return csrfToken;
}

/**
 * 辅助函数：统一处理API错误
 */
function handleApiError(message) {
    if (window.showModal) {
        window.showModal("错误", `<div class="p-4 text-center">${message}</div>`);
    } else {
        alert(message);
    }
}

/**
 * 1. 提交交易/申请记录到后端 (POST)
 * 涵盖：充值、提现、兑换、绑定推荐人、矿机/内部转账
 */
export async function postTransactionRecord(type, amount, symbol, action = "record_transaction", extraFields = {}) {
    const address = localStorage.getItem('fbs_address');
    
    if (!address) {
        alert("请先连接钱包");
        return { success: false };
    }

    const chain = localStorage.getItem('fbs_chain') || 'BSC';
    // EVM 链地址统一小写，TON 和 SOL 保持原始格式
    const cleanAddr = chain === 'BSC' ? address.toLowerCase().trim() : address.trim();

    const payload = {
        action: action,        
        address: cleanAddr,      
        type: type,            
        amount: String(amount),
        symbol: symbol,        
        ...extraFields
    };

    console.log(`[API] 发起 POST 请求 [${action}]:`, payload);

    // 创建超时控制器（30秒超时）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 30000); // 30秒超时

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

        // 飞书 code 为 0 或 result.success 为 true 均代表写入成功
        if (result.success || result.code === 0) {
            console.log(`[API] ${type} 后端写入成功`);
            
            // 成功后关闭所有可能存在的弹窗
            if (window.closeModal) window.closeModal();
            
            // 绑定关系需要立即弹推荐人/推荐码，先立即刷一次
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

            // 🔥 关键：交给智能刷新策略统一处理
            //  - 普通类（绑定/转让/充值等）：立即刷 1 次 → 500ms 再补刷 1 次
            //  - 结算类（兑换/提现/出售等）：0s→3s→8s→15s 轮询，余额变化提前停止
            // 用 setTimeout 0 包裹：return 返回后再跑，不阻塞用户响应
            // 绑定关系已在上面分支立即刷新并弹窗，跳过重复刷
            if (type !== "绑定关系") {
                setTimeout(() => {
                    smartRefreshAfterTransaction(type, action, address).catch(e =>
                        console.warn("[API] 智能刷新异常:", e.message)
                    );
                }, 0);
            }
            
            return { success: true, data: result };
        } else {
            // 失败也要关闭弹窗
            if (window.closeModal) window.closeModal();
            handleApiError(`提交失败: ${result.msg || "服务器繁忙"}`);
            return { success: false };
        }
    } catch (e) {
        // 捕获超时错误
        if (e.name === 'AbortError') {
            handleApiError("请求超时，请检查网络连接或稍后重试");
            return { success: false, error: "timeout" };
        }
        // 捕获因刷新页面导致的连接中断
        if (e.message === 'Failed to fetch') return { success: false };
        console.error("[API] POST 请求异常:", e);
        handleApiError(`请求异常: ${e.message}`);
        return { success: false, error: e.message };
    }
}

/**
 * 2. 获取用户完整数据并同步渲染 UI (GET)
 * 包含资产余额、实时单价、团队业绩、矿机运行状态
 * @param {string} address - 用户地址
 * @param {Object} options - 配置选项
 * @param {boolean} options.silent - 静默模式，不显示加载提示
 */
export async function fetchUserData(address, options = {}) {
    if (!address) return;

    const { silent = false } = options;
    const chain = localStorage.getItem('fbs_chain') || 'BSC';
    
    // 检查是否为激活的链，非激活链不发起请求
    if (!ACTIVE_CHAINS.includes(chain)) {
        console.log(`[API] 当前链 ${chain} 未激活，跳过数据请求`);
        return;
    }

    // 请求去重：如果有相同地址和链的请求正在进行，则等待该请求完成
    const requestKey = `${chain}:${address}`;
    if (pendingRequest && pendingRequest.key === requestKey) {
        console.log(`[API] 检测到重复请求 (${requestKey})，等待已有请求完成`);
        try {
            return await pendingRequest.promise;
        } catch (e) {
            // 如果等待时出错，忽略并继续执行新请求
            console.warn(`[API] 等待重复请求时出错: ${e.message}`);
        }
    }

    // 终止上一次未完成的请求，防止数据混乱和 Failed to fetch 报错
    if (fetchController) fetchController.abort();
    fetchController = new AbortController();
    const { signal } = fetchController;
    
    // 创建新的请求承诺用于去重
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
        // EVM 链地址统一小写，TON 和 SOL 保持原始格式
        const cleanAddr = chain === 'BSC' ? address.toLowerCase().trim() : address.trim();
        
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
            } catch (_) { /* ignore body parse error */ }
            throw new Error(errDetail);
        }
        
        const parseStart = Date.now();
        const data = await res.json();
        const parseDuration = Date.now() - parseStart;
        
        if (!silent) {
            console.log(`[API] 请求耗时: ${requestDuration}ms, JSON解析: ${parseDuration}ms, 总计: ${requestDuration + parseDuration}ms`);
            console.log("[API] 后端原始数据包:", data);
        }

        // 缓存数据供其他模块使用
        window.lastFetchedData = data;

        // --- 核心逻辑：新用户初始化，取消自动弹窗 ---
        if (data.newUser) {
            if (!silent) console.log("[API] 该地址为新用户，待手动绑定");
            updateText('info_inviteCode', '---');
            updateText('info_inviter', '---');
            // 此处清空资产显示，防止显示上一个钱包的数据
            if (window.renderTokenList) window.renderTokenList({});
            
            // 新用户也尝试渲染矿工等级（可能已有预填写数据）
            renderMinerLevel(data);
            
            return;
        }

        // 🚀 优化：分阶段渲染 - 第一阶段立即渲染价格和余额
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

        // 将用户资产存入全局供 calculations.js 使用
        window.userBalances = data.balances || {};

        // 🚀 优化：立即渲染资产列表（不等待其他数据）
        if (window.renderTokenList) {
            window.renderTokenList(data.balances || {});
        }

        // 🚀 优化：使用 requestIdleCallback 延迟渲染非关键内容
        const renderNonCritical = () => {
            // 历史价格数据
            if (data.priceHistory) {
                window.priceHistory = data.priceHistory;
            }

            // --- 团队识别与推荐链处理 ---
            const userInfo = {
                inviteCode: data.info?.["推荐码"],
                inviter: data.info?.["推荐人"],
                inviterChain: data.info?.["推荐链"] || [],
                team: null,
                topInviter: null
            };
            
            // 1. 优先使用后端返回的团队信息（来自推荐关系列表中的"团队"列）
            if (data.info?.["团队"]) {
                userInfo.team = data.info["团队"];
            }
            // 2. 如果有推荐链，找到最高层级的推荐码并确定团队
            else if (userInfo.inviterChain && userInfo.inviterChain.length > 0) {
                const topResult = findTopLevelInviter(userInfo.inviterChain);
                userInfo.topInviter = topResult.inviter;
                userInfo.team = topResult.team;
            }
            // 3. 如果只有直接推荐人，根据推荐人确定团队
            else if (userInfo.inviter) {
                userInfo.team = getTeamByInviter(userInfo.inviter);
                userInfo.topInviter = userInfo.inviter;
            }
            
            // 保存到全局状态
            window.currentUserInfo = userInfo;
            if (!silent) console.log(`[Team] 用户团队识别结果: ${userInfo.team} (最高层级推荐人: ${userInfo.topInviter || '无'})`);

            // C. 渲染资料信息
            updateText('info_inviteCode', data.info?.["推荐码"]);
            updateText('info_inviter', data.info?.["推荐人"]);
            updateText('info_regTime', data.info?.["注册时间"]);
            
            // 控制绑定推荐人按钮显示：已绑定则隐藏
            const bindBtn = document.getElementById('btn_bind_inviter');
            if (bindBtn) {
                if (data.info?.["推荐人"] && data.info["推荐人"] !== '---' && data.info["推荐人"] !== '') {
                    bindBtn.style.display = 'none';
                } else {
                    bindBtn.style.display = 'block';
                }
            }

            // D. 渲染团队数据（从后端获取）
            let teamData = {
                directCount: 0,
                directSales: 0,
                totalCount: 0,
                totalSales: 0,
                totalReward: 0
            };
            
            // 直接使用后端返回的团队数据
            if (data.team) {
                teamData = {
                    directCount: data.team["直推人数"] || 0,
                    directSales: data.team["直推业绩"] || 0,
                    totalCount: data.team["团队人数"] || 0,
                    totalSales: data.team["团队业绩"] || 0,
                    totalReward: data.team["累计奖励"] || 0
                };
            }
            
            // 渲染团队数据
            updateText('team_directCount', teamData.directCount);
            updateText('team_directSales', teamData.directSales.toFixed(2));
            updateText('team_totalCount', teamData.totalCount);
            updateText('team_totalSales', teamData.totalSales.toFixed(2));
            updateText('team_totalReward', teamData.totalReward.toFixed(2));

            // E. 渲染矿机数据 (严格匹配飞书文字列名)
            if (data.miner) {
                updateText('miner_count', data.miner["矿机数量"]);
                updateText('miner_running', data.miner["在运行"]);
                updateText('miner_daily', data.miner["日产量"]);
                updateText('miner_deadline', data.miner["挖矿期限"]); 
                updateText('miner_locked', data.miner["锁仓数量"]);
            }

            // F. 渲染矿工等级
            renderMinerLevel(data);

            // F. 执行各 UI 模块的渲染函数
            if (window.renderHistory) window.renderHistory(data.history || []);
            if (window.renderTransfers) window.renderTransfers(data.transfers || []);
            
            // 🚀 优化：K线图延迟渲染，避免阻塞主线程
            setTimeout(() => {
                if (window.renderPriceCharts) window.renderPriceCharts();
            }, 100);
        };

        // 使用 requestIdleCallback 或 setTimeout 延迟渲染非关键内容
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
            // 显示错误提示，但不阻止后续操作
            if (!silent) {
                handleApiError(`数据同步失败: ${e.message}`);
            }
        }
        // 清理 pendingRequest
        if (pendingRequest && pendingRequest.key === requestKey) {
            pendingRequest.reject(e);
            pendingRequest = null;
        }
        // ❌ 抛出错误让调用者知道
        throw e;
    }
    
    // 清理 pendingRequest
    if (pendingRequest && pendingRequest.key === requestKey) {
        pendingRequest.resolve();
        pendingRequest = null;
    }
}

/**
 * 3. 绑定推荐人业务逻辑
 */
export async function submitBindInviter() {
    const inviterId = document.getElementById('input_inviter_id')?.value.trim();
    if (!inviterId) return alert("请输入推荐码");
    
    // 生成临时随机码
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

/**
 * 4. 统一文本更新工具
 * 自动识别数值字段并进行千分位格式化 (Apple 风格)
 */
export function updateText(id, value) {
    const el = document.getElementById(id);
    if (!el) return; // 容错：如果 ID 不在当前页面，直接跳过不报错
    
    // 定义数值类型的 ID 特征
    const isNumberField = id.includes('Sales') || id.includes('Reward') || id.includes('totalValue') || 
                          id.includes('bal_') || id.includes('val_') || id.includes('price_') || 
                          id.includes('locked') || id.includes('daily') || id.includes('Count');
    
    // 处理空值
    if (value === undefined || value === null || value === "" || value === "NaN") {
        el.innerText = isNumberField ? "0.00" : "--";
        return;
    }

    // 处理数值格式化
    if (isNumberField && !isNaN(value)) {
        let num = parseFloat(value);
        // 单价展示 4 位，其余金额/数量展示 2 位
        let decimals = id.includes('price_') ? 4 : 2;
        el.innerText = num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    } else {
        // 纯文本展示
        el.innerText = value;
    }
}

/**
 * 获取矿工等级的多语言翻译
 * @param {string} level - 原始矿工等级（中文）
 * @returns {string} - 翻译后的等级名称
 */
function getMinerLevelTranslation(level) {
    const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    const dict = window.i18nData?.[lang] || window.i18nData?.['zh-CN'] || {};
    return dict[level] || level;
}

/**
 * 渲染矿工等级（直接从飞书多维表格读取预填写的数据）
 * 矿工等级分为8级（从低到高）：
 * 0. 未激活 - 灰色
 * 1. 白银矿工 - 银色
 * 2. 白银节点 - 银蓝色
 * 3. 黄金矿工 - 金色
 * 4. 黄金节点 - 金橙色
 * 5. 钻石矿工 - 青蓝色
 * 6. 钻石节点 - 蓝紫色
 * 7. 钻石大师 - 紫粉色（最高级）
 * 数据来自用户团队表格（table=tblPKLs0jYlN0UnJ）中的"矿工等级"字段
 * 支持多语言切换
 * @param {Object} data - 后端返回的数据（可选，不传则重新渲染当前数据）
 */
function renderMinerLevel(data) {
    const levelEl = document.getElementById('minerLevel');
    if (!levelEl) {
        console.log("[MinerLevel] 未找到 minerLevel 元素");
        return;
    }

    // 如果传入了数据且是有效对象（不是语言代码字符串），保存到全局变量用于语言切换时重新渲染
    if (data && typeof data === 'object' && (data.info || data.team)) {
        window.currentMinerLevelData = data;
    }
    // 如果没有传入数据或传入的是语言代码字符串，尝试使用全局缓存的数据
    data = (data && typeof data === 'object' && (data.info || data.team)) ? data : window.currentMinerLevelData;
    if (!data) {
        console.log("[MinerLevel] 没有可用的数据");
        levelEl.className = 'miner-level-badge opacity-0';
        return;
    }

    // 打印调试信息，帮助排查问题
    console.log("[MinerLevel] 数据对象结构:", {
        info: data.info ? Object.keys(data.info) : null,
        team: data.team ? Object.keys(data.team) : null
    });

    // 从后端数据中直接读取矿工等级（支持多个可能的字段名）
    const minerLevel = data.info?.["矿工等级"] || data.info?.["等级"] || 
                       data.team?.["矿工等级"] || data.team?.["等级"] || '';

    console.log("[MinerLevel] 读取到的矿工等级:", minerLevel);

    // 定义矿工等级对应的样式配置（8个等级，从低到高）
    const levelStyles = {
        '未激活': { color: 'from-gray-400 to-gray-500', textColor: 'text-white', borderColor: 'border-gray-300' },
        '白银矿工': { color: 'from-slate-300 to-slate-400', textColor: 'text-white', borderColor: 'border-slate-300' },
        '白银节点': { color: 'from-slate-400 to-blue-300', textColor: 'text-white', borderColor: 'border-blue-200' },
        '黄金矿工': { color: 'from-amber-400 to-yellow-500', textColor: 'text-white', borderColor: 'border-amber-300' },
        '黄金节点': { color: 'from-amber-500 to-orange-500', textColor: 'text-white', borderColor: 'border-orange-300' },
        '钻石矿工': { color: 'from-cyan-400 to-blue-500', textColor: 'text-white', borderColor: 'border-cyan-300' },
        '钻石节点': { color: 'from-blue-500 to-purple-500', textColor: 'text-white', borderColor: 'border-purple-300' },
        '钻石大师': { color: 'from-purple-500 to-pink-500', textColor: 'text-white', borderColor: 'border-pink-300' }
    };

    // 如果有矿工等级数据且在配置中存在，则显示
    if (minerLevel && levelStyles[minerLevel]) {
        const style = levelStyles[minerLevel];
        // 使用多语言翻译
        const translatedLevel = getMinerLevelTranslation(minerLevel);
        levelEl.innerText = translatedLevel;
        levelEl.className = `miner-level-badge bg-gradient-to-r ${style.color} ${style.textColor} px-3 py-1 rounded-full text-[9px] font-bold border ${style.borderColor} mb-2 inline-block opacity-100 shadow-md`;
        console.log("[MinerLevel] 成功显示矿工等级:", minerLevel, "(翻译后:", translatedLevel, ")");
    } else {
        // 没有数据或等级不匹配，隐藏徽章
        levelEl.className = 'miner-level-badge opacity-0';
        console.log("[MinerLevel] 矿工等级数据为空或不匹配，隐藏徽章");
    }
}

// 暴露到全局，确保 HTML 按钮、导航和其它模块能调用
window.fetchUserData = fetchUserData;
window.postTransactionRecord = postTransactionRecord;
window.submitBindInviter = submitBindInviter;
window.updateText = updateText;
window.renderMinerLevel = renderMinerLevel;

/**
 * 刷新余额 - 重新从后台获取用户数据
 */
export async function refreshBalances() {
    const address = window.currentAddress || localStorage.getItem('fbs_address');
    if (!address) {
        alert("请先连接钱包");
        return;
    }
    
    // 添加旋转动画
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
        // 移除旋转动画
        if (refreshBtn) {
            setTimeout(() => refreshBtn.classList.remove('animate-spin'), 500);
        }
    }
}
window.refreshBalances = refreshBalances;
