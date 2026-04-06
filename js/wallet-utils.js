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

        // 3. 登录态检查逻辑 (实现首次手动，后续自动)
        const currentAddress = localStorage.getItem('fbs_address');
        const isManualLogout = localStorage.getItem('user_logout_manual');

        if (currentAddress && isManualLogout !== 'true') {
            console.log(`[App] 检测到有效登录态，自动连接地址: ${currentAddress}`);
            
            // 更新导航栏钱包 UI
            updateWalletUI(currentAddress);
            
            // 拉取飞书后台数据
            fetchUserData(currentAddress); 
            
        } else {
            console.log("[App] 处于登出状态或首次访问，等待手动连接");
            resetWalletUI();
            
            // 初始清空列表显示
            if (window.renderHistory) window.renderHistory([]); 
            if (window.renderTransfers) window.renderTransfers([]);
            if (window.renderTokenList) window.renderTokenList({});
        }
    });

    /**
     * 3. 监听钱包账号与链的变化
     * 修复：加入地址比对，防止部分钱包插件在初始化时重复触发导致的无限刷新
     */
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            const oldAddr = localStorage.getItem('fbs_address')?.toLowerCase();
            const newAddr = accounts[0]?.toLowerCase();

            // 核心修复：只有当新旧地址不一致时才处理刷新逻辑
            if (newAddr !== oldAddr) {
                console.log("[Wallet] 检测到账号真实变更:", newAddr || "已断开");
                if (newAddr) {
                    // 更新本地存储地址并清除手动退出标记
                    localStorage.setItem('fbs_address', accounts[0]); 
                    localStorage.setItem('user_logout_manual', 'false');
                } else {
                    // 用户断开连接
                    localStorage.removeItem('fbs_address');
                    localStorage.setItem('user_logout_manual', 'true');
                }
                location.reload(); 
            } else {
                console.log("[Wallet] 检测到 accountsChanged 信号，但地址未变，跳过刷新");
            }
        });

        // 链切换 (监听是否离开 BSC)
        window.ethereum.on('chainChanged', () => {
            console.log("[Wallet] 检测到网络变更，正在重载...");
            location.reload();
        });
    } else {
        console.warn("[App] 未检测到 Web3 环境，请在 DApp 浏览器中访问");
    }
}

// 启动
initApp();
