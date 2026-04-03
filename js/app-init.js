import { mountWalletClickHandler, connectWallet, resetWalletUI, updateWalletUI, setCurrentAddress } from './wallet-utils.js';
import { fetchUserData, updateText } from './api-service.js';
import { renderTokenList, renderHistory, renderTransfers, renderStatsPage, renderNews } from './ui-render.js';
import { mountModalHandlers } from './modal-handler.js';
import { mountCalculationHandlers } from './calculations.js';
import { mountActionExecutors } from './action-executor.js';

// 全局挂载（修复所有找不到函数的问题）
window.updateText = updateText;
window.renderTokenList = renderTokenList;
window.renderHistory = renderHistory;
window.renderTransfers = renderTransfers;
window.renderStatsPage = renderStatsPage;
window.renderNews = renderNews;

// 初始化
function initApp() {
    mountWalletClickHandler();
    mountModalHandlers();
    mountCalculationHandlers();
    mountActionExecutors();

    window.connectWallet = connectWallet;
    window.fetchUserData = fetchUserData;

window.onload = () => {
    const savedLang = localStorage.getItem('fbs_lang') || 'ru';
    
    // 1. 渲染公共部分
    if (window.renderNews) renderNews(savedLang);
    if (window.renderStatsPage) renderStatsPage(savedLang);
    if (window.i18nRender) window.i18nRender(savedLang);

    // 2. 【新增】初始化渲染历史和流水容器，防止出现空白或旧数据
    if (window.renderHistory) renderHistory([]); 
    if (window.renderTransfers) renderTransfers([]);
    if (window.renderTokenList) renderTokenList({});

    // 3. 处理登录逻辑
    const currentAddress = localStorage.getItem('fbs_address');
    const isManualLogout = localStorage.getItem('user_logout_manual');
    
    if (currentAddress && isManualLogout !== 'true') {
        updateWalletUI(currentAddress);
        // 关键：fetchUserData 内部必须包含对 renderHistory/Transfers 的调用
        fetchUserData(currentAddress); 
    } else {
        resetWalletUI();
    }
};
}

initApp();
