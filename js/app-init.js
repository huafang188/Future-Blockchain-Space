import { 
    mountWalletClickHandler, 
    connectWallet, 
    resetWalletUI, 
    updateWalletUI, 
    setCurrentAddress 
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
 * 1. 全局函数挂载
 * 将模块化的函数挂载到 window 对象，确保 HTML 中的 onclick="xxx()" 能够正常触发
 */
function mountGlobals() {
    // 渲染类
    window.updateText = updateText;
    window.renderTokenList = renderTokenList;
    window.renderHistory = renderHistory;
    window.renderTransfers = renderTransfers;
    window.renderStatsPage = renderStatsPage;
    window.renderNews = renderNews;

    // 逻辑类
    window.connectWallet = connectWallet;
    window.fetchUserData = fetchUserData;
    window.postTransactionRecord = postTransactionRecord;
    window.submitBindInviter = submitBindInviter;

    // 执行类 (由 mountActionExecutors 内部挂载 doRecharge, doTeamEmailSubmit 等)
    mountActionExecutors();
}

/**
 * 2. 核心初始化逻辑
 */
function initApp() {
    // 初始化各个模块的事件监听
    mountWalletClickHandler();     // 钱包连接按钮
    mountModalHandlers();          // 弹窗关闭/打开逻辑
    mountCalculationHandlers();    // 算力/收益计算器逻辑
    
    mountGlobals();                // 挂载全局 API

    // 页面加载完成后的生命周期
    window.addEventListener('load', () => {
        console.log("App Initializing...");
        
        // 读取本地存储配置
        const savedLang = localStorage.getItem('fbs_lang') || 'en';
        const currentAddress = localStorage.getItem('fbs_address');
        const isManualLogout = localStorage.getItem('user_logout_manual');

        // --- 1. 静态 UI 渲染 ---
        // 渲染新闻、统计数据、语言包
        if (window.renderNews) renderNews(savedLang);
        if (window.renderStatsPage) renderStatsPage(savedLang);
        if (window.i18nRender) window.i18nRender(savedLang);

        // --- 2. 状态占位渲染 ---
        // 初始状态清空容器，防止显示旧数据
        if (window.renderHistory) renderHistory([]); 
        if (window.renderTransfers) renderTransfers([]);
        if (window.renderTokenList) renderTokenList({});

        // --- 3. 登录态检查 ---
        // 如果本地存有地址且用户没有手动点过“退出登录”，则自动连接
        if (currentAddress && isManualLogout !== 'true') {
            console.log("Auto-connecting to:", currentAddress);
            
            // 更新 UI 为已连接状态
            updateWalletUI(currentAddress);
            
            // 核心：拉取该地址在飞书后台的所有资产、团队、矿机数据
            fetchUserData(currentAddress); 
            
        } else {
            // 未登录或已手动退出，恢复初始 UI
            resetWalletUI();
        }
    });

    // 监听钱包账户切换 (MetaMask 切换账号时自动刷新)
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                const newAddr = accounts[0];
                localStorage.setItem('fbs_address', newAddr);
                localStorage.setItem('user_logout_manual', 'false');
                location.reload();
            } else {
                // 用户在钱包插件里断开了连接
                localStorage.removeItem('fbs_address');
                location.reload();
            }
        });

        // 监听链切换
        window.ethereum.on('chainChanged', () => location.reload());
    }
}

// 启动程序
initApp();
