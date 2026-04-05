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
 * 1. 核心挂载器：将所有模块化函数暴露给全局 (window)
 * 这样 HTML 里的 onclick="doRecharge()" 才能正常工作
 */
function mountAllGlobals() {
    // API 与渲染类
    window.updateText = updateText;
    window.fetchUserData = fetchUserData;
    window.postTransactionRecord = postTransactionRecord;
    window.submitBindInviter = submitBindInviter;
    
    window.renderTokenList = renderTokenList;
    window.renderHistory = renderHistory;
    window.renderTransfers = renderTransfers;
    window.renderStatsPage = renderStatsPage;
    window.renderNews = renderNews;

    // 运行各模块的内部挂载逻辑
    mountWalletClickHandler();     // 钱包点击处理
    mountModalHandlers();          // 弹窗控制
    mountCalculationHandlers();    // 计算器逻辑
    mountActionExecutors();        // 业务执行逻辑 (充值/提币/转让等)
}

/**
 * 2. 初始化应用程序
 */
function initApp() {
    console.log("[Init] 正在初始化模块挂载...");
    
    // 执行全局挂载
    mountAllGlobals();

    // 页面加载完成后的逻辑
    window.addEventListener('load', () => {
        console.log("[Init] 页面加载完成，开始检查状态...");
        
        // A. 读取本地配置
        const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        const currentAddress = localStorage.getItem('fbs_address');
        const isManualLogout = localStorage.getItem('user_logout_manual');

        // B. 静态 UI 预渲染 (公告、行情、语言包)
        if (window.i18nRender) window.i18nRender(savedLang);
        if (window.renderNews) window.renderNews(savedLang);
        if (window.renderStatsPage) window.renderStatsPage(savedLang);

        // C. 登录态自动重连
        if (currentAddress && isManualLogout !== 'true') {
            console.log(`[Init] 检测到已连接地址: ${currentAddress}`);
            
            // 更新钱包按钮 UI
            updateWalletUI(currentAddress);
            
            // 核心：从飞书拉取该地址的所有动态数据 (资产、团队、记录)
            fetchUserData(currentAddress); 
            
        } else {
            console.log("[Init] 用户未连接或已手动登出");
            resetWalletUI();
            
            // 初始清空列表，显示“请连接钱包”
            if (window.renderHistory) window.renderHistory([]); 
            if (window.renderTokenList) window.renderTokenList({});
        }
    });

    /**
     * 3. 钱包环境监听 (MetaMask / TrustWallet / Bitget)
     */
    if (window.ethereum) {
        // 监听账号切换
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log("[Wallet] 账号已切换");
            if (accounts.length > 0) {
                const newAddr = accounts[0];
                localStorage.setItem('fbs_address', newAddr);
                localStorage.setItem('user_logout_manual', 'false');
                location.reload(); // 刷新以重新加载飞书数据
            } else {
                // 用户在插件中手动断开连接
                localStorage.removeItem('fbs_address');
                localStorage.setItem('user_logout_manual', 'true');
                location.reload();
            }
        });

        // 监听链切换 (如从 ETH 切换到 BSC)
        window.ethereum.on('chainChanged', () => {
            console.log("[Wallet] 网络已切换");
            location.reload();
        });
    } else {
        console.warn("[Wallet] 未检测到以太坊环境，请在 Web3 钱包浏览器中打开");
    }
}

// --- 启动程序 ---
initApp();
