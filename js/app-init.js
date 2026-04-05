import { 
    mountWalletClickHandler, 
    updateWalletUI, 
    resetWalletUI 
} from './wallet-utils.js';

import { 
    fetchUserData, 
    updateText, 
    postTransactionRecord, 
    submitBindInviter 
} from './api-service.js';

import { 
    renderTokenList, 
    renderHistory, 
    renderTransfers, 
    renderStatsPage, 
    renderNews 
} from './ui-render.js';

import { mountModalHandlers } from './modal-handler.js';
import { mountCalculationHandlers } from './calculations.js';
import { mountActionExecutors } from './action-executor.js';

/**
 * 1. 全局挂载器
 * 核心：将所有分散在模块中的函数强制导出给 window 变量
 * 解决 HTML 中 onclick="..." 找不到函数的问题
 */
function mountAllGlobals() {
    console.log("[Init] 开始挂载全局函数...");

    // A. 基础 API 与 UI 渲染函数挂载
    window.updateText = updateText;
    window.fetchUserData = fetchUserData;
    window.postTransactionRecord = postTransactionRecord;
    window.submitBindInviter = submitBindInviter;
    
    window.renderTokenList = renderTokenList;
    window.renderHistory = renderHistory;
    window.renderTransfers = renderTransfers;
    window.renderStatsPage = renderStatsPage;
    window.renderNews = renderNews;

    // B. 执行各模块的挂载函数 (执行内部的 window.xxx = ... 赋值)
    mountWalletClickHandler();     // 挂载钱包点击 (wallet-utils)
    mountModalHandlers();          // 挂载弹窗与复制逻辑 (modal-handler)
    mountCalculationHandlers();    // 挂载计算器逻辑 (calculations)
    mountActionExecutors();        // 挂载业务交互逻辑 (action-executor)

    console.log("[Init] 全局函数挂载完成");
}

/**
 * 2. 应用程序初始化入口
 */
function initApp() {
    // 立即执行挂载，确保在 DOM 加载前函数已就绪
    mountAllGlobals();

    window.addEventListener('load', () => {
        console.log("[App] 页面加载完成，检查初始状态...");
        
        // 1. 读取语言并初始化翻译
        const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        if (window.i18nRender) {
            window.i18nRender(savedLang);
        }

        // 2. 预渲染静态组件 (公告、看板)
        if (window.renderNews) renderNews(savedLang);
        if (window.renderStatsPage) renderStatsPage(savedLang);

        // 3. 登录态恢复与数据自动拉取
        const currentAddress = localStorage.getItem('fbs_address');
        const isManualLogout = localStorage.getItem('user_logout_manual');

        if (currentAddress && isManualLogout !== 'true') {
            console.log(`[App] 自动连接地址: ${currentAddress}`);
            
            // 更新导航栏钱包 UI
            updateWalletUI(currentAddress);
            
            // 核心：调用 api-service 里的 fetchUserData
            // 该函数内部包含了价格标准化逻辑，解决价格不显示的问题
            fetchUserData(currentAddress); 
            
        } else {
            console.log("[App] 当前处于未登录状态");
            resetWalletUI();
            
            // 初始清空列表，显示空状态
            if (window.renderHistory) window.renderHistory([]); 
            if (window.renderTransfers) window.renderTransfers([]);
            if (window.renderTokenList) window.renderTokenList({});
        }
    });

    /**
     * 3. 监听钱包账号与链的变化
     */
    if (window.ethereum) {
        // 账号切换
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log("[Wallet] 检测到账号变更");
            if (accounts.length > 0) {
                const newAddr = accounts[0];
                localStorage.setItem('fbs_address', newAddr);
                localStorage.setItem('user_logout_manual', 'false');
                location.reload(); // 账号切换属于重大变更，建议 reload 确保内存干净
            } else {
                localStorage.removeItem('fbs_address');
                localStorage.setItem('user_logout_manual', 'true');
                location.reload();
            }
        });

        // 链切换 (监听是否离开 BSC)
        window.ethereum.on('chainChanged', () => {
            console.log("[Wallet] 检测到网络变更");
            location.reload();
        });
    } else {
        console.warn("[App] 未检测到 Web3 环境，请在 DApp 浏览器中访问");
    }
}

// 启动
initApp();
