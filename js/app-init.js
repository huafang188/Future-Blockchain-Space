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
    const savedLang = localStorage.getItem('fbs_lang');
    const currentLang = savedLang || 'ru';
    if (!savedLang) {
        localStorage.setItem('fbs_lang', 'ru');
    }
    if (window.renderNews) renderNews(currentLang);
    if (window.renderStatsPage) renderStatsPage(currentLang);
    
    if (window.renderTokenList) renderTokenList({});

    if (window.i18nRender) window.i18nRender(currentLang);

    const currentAddress = localStorage.getItem('fbs_address');
    const isManualLogout = localStorage.getItem('user_logout_manual');
    
    if (typeof setCurrentAddress === 'function') {
        setCurrentAddress(currentAddress);
    }

    if (currentAddress && isManualLogout !== 'true') {
        updateWalletUI(currentAddress);
        fetchUserData(currentAddress);
    } else {
        resetWalletUI();
    }
};
}

initApp();
