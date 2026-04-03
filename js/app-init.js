import { mountWalletClickHandler, connectWallet, resetWalletUI, updateWalletUI, setCurrentAddress } from './wallet-utils.js';
import { fetchUserData, updateText } from './api-service.js';
import { renderTokenList, renderHistory, renderTransfers, renderStatsPage } from './ui-render.js';
import { mountModalHandlers } from './modal-handler.js';
import { mountCalculationHandlers } from './calculations.js';
import { mountActionExecutors } from './action-executor.js';

window.updateText = updateText;
window.renderHistory = renderHistory;
window.renderTransfers = renderTransfers;
window.renderStatsPage = renderStatsPage; 

function initApp() {
    mountWalletClickHandler();
    mountModalHandlers();
    mountCalculationHandlers();
    mountActionExecutors();

    window.connectWallet = connectWallet;
    window.fetchUserData = fetchUserData;
    window.renderTokenList = renderTokenList;

    window.onload = () => {
        if (window.i18nRender) window.i18nRender();

        const currentAddress = localStorage.getItem('fbs_address');
        const isManualLogout = localStorage.getItem('user_logout_manual');
        
        setCurrentAddress(currentAddress);

        if (currentAddress && isManualLogout !== 'true') {
            updateWalletUI(currentAddress);
            fetchUserData(currentAddress);
        } else {
            resetWalletUI();
        }
        
        renderTokenList({});
        renderStatsPage(localStorage.getItem('fbs_lang') || 'zh-CN');
        if (window.i18nRender) window.i18nRender();
    };
}

initApp();
