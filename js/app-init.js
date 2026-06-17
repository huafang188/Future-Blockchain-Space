import { 
    mountWalletClickHandler, 
    updateWalletUI, 
    resetWalletUI,
    mountAccountChangeListener,
    syncWalletUI,
    detectWalletEnv
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

import { CHAIN_CONFIG, setCurrentChain, TOKEN_DECIMALS } from './config.js';

// 导出到 window
window.CHAIN_CONFIG = CHAIN_CONFIG;
window.TOKEN_DECIMALS = TOKEN_DECIMALS;

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
    mountWalletClickHandler();        // 挂载钱包点击逻辑 (wallet-utils)
    mountAccountChangeListener();     // 挂载账户变化监听器 (wallet-utils)
    mountModalHandlers();             // 挂载弹窗与复制逻辑 (modal-handler)
    mountCalculationHandlers();       // 挂载计算器逻辑 (calculations)
    mountActionExecutors();           // 挂载业务交互逻辑 (action-executor)

    // 导出 syncWalletUI 到全局
    window.syncWalletUI = syncWalletUI;

    console.log("[Init] 全局函数挂载完成");
    
    // 轮播功能
    let carouselCurrentIndex = 0;
    let carouselInterval = null;
    
    window.carouselNext = function() {
        const items = document.querySelectorAll('.carousel-item');
        const indicators = document.querySelectorAll('[data-index]');
        if (items.length === 0) return;
        
        items[carouselCurrentIndex].classList.remove('active');
        indicators[carouselCurrentIndex].style.backgroundColor = 'rgba(255,255,255,0.3)';
        
        carouselCurrentIndex = (carouselCurrentIndex + 1) % items.length;
        
        items[carouselCurrentIndex].classList.add('active');
        indicators[carouselCurrentIndex].style.backgroundColor = 'rgba(255,255,255,0.5)';
    };
    
    window.carouselPrev = function() {
        const items = document.querySelectorAll('.carousel-item');
        const indicators = document.querySelectorAll('[data-index]');
        if (items.length === 0) return;
        
        items[carouselCurrentIndex].classList.remove('active');
        indicators[carouselCurrentIndex].style.backgroundColor = 'rgba(255,255,255,0.3)';
        
        carouselCurrentIndex = (carouselCurrentIndex - 1 + items.length) % items.length;
        
        items[carouselCurrentIndex].classList.add('active');
        indicators[carouselCurrentIndex].style.backgroundColor = 'rgba(255,255,255,0.5)';
    };
    
    window.carouselGoTo = function(index) {
        const items = document.querySelectorAll('.carousel-item');
        const indicators = document.querySelectorAll('[data-index]');
        if (items.length === 0 || index < 0 || index >= items.length) return;
        
        items[carouselCurrentIndex].classList.remove('active');
        indicators[carouselCurrentIndex].style.backgroundColor = 'rgba(255,255,255,0.3)';
        
        carouselCurrentIndex = index;
        
        items[carouselCurrentIndex].classList.add('active');
        indicators[carouselCurrentIndex].style.backgroundColor = 'rgba(255,255,255,0.5)';
    };
    
    // 自动轮播
    window.startCarousel = function() {
        if (carouselInterval) clearInterval(carouselInterval);
        carouselInterval = setInterval(carouselNext, 5000);
    };
    
    // 停止轮播
    window.stopCarousel = function() {
        if (carouselInterval) {
            clearInterval(carouselInterval);
            carouselInterval = null;
        }
    };

    // 检测钱包环境
    function detectWalletEnv() {
        // Bitget 钱包
        if (window.bitkeep && window.bitkeep.ethereum) return 'bitget';
        // TP 钱包 (TokenPocket)
        if (window.tokenpocket && window.tokenpocket.ethereum) return 'tokenpocket';
        // 通用 EVM 钱包
        if (window.ethereum) return 'evm';
        return 'none';
    }

    // 更新链选择器 UI
    function updateChainUI(chain) {
        window.currentChain = chain;
        setCurrentChain(chain);
        const chainConfig = CHAIN_CONFIG[chain];
        if (chainConfig) {
            document.getElementById('selectedChainText').textContent = chain;
            document.getElementById('selectedChainIcon').src = chainConfig.icon;
        }
        localStorage.setItem('selectedChain', chain);
        
        // 更新弹窗中的代币选项
        if (window.updateWithdrawTokens) window.updateWithdrawTokens();
        if (window.updateSwapTokens) window.updateSwapTokens();
    }

    // 区块链选择函数
    window.selectChain = async function(chain) {
        // 关闭下拉菜单
        const wrapper = document.querySelector('.custom-select-wrapper');
        wrapper.classList.remove('open');
        
        // 如果选择的是当前链，直接返回
        if (chain === window.currentChain) return;
        
        // 如果已登录，先登出再切换链
        const savedAddr = localStorage.getItem('fbs_address');
        if (savedAddr) {
            const shouldSwitch = confirm(`切换链将退出当前登录，是否继续？\n\n当前链: ${window.currentChain || 'BSC'}\n目标链: ${chain}`);
            if (!shouldSwitch) return;
            
            // 清除登录状态
            localStorage.setItem('user_logout_manual', 'true');
            localStorage.removeItem('fbs_address');
            localStorage.removeItem('fbs_chain');
            
            // 重置 UI
            if (typeof window.resetWalletUI === 'function') window.resetWalletUI();
            if (typeof window.renderHistory === 'function') window.renderHistory([]);
            if (typeof window.renderTransfers === 'function') window.renderTransfers([]);
            if (typeof window.renderTokenList === 'function') window.renderTokenList({});
        }
        
        const walletEnv = detectWalletEnv();
        
        if (chain === 'BSC') {
            // EVM 链：使用标准钱包切换 API
            if (walletEnv === 'none') {
                alert('请在 Web3 钱包浏览器中操作');
                return;
            }
            
            try {
                const chainConfig = CHAIN_CONFIG['BSC'];
                const provider = walletEnv === 'bitget' ? window.bitkeep.ethereum : 
                                 walletEnv === 'tokenpocket' ? window.tokenpocket.ethereum : 
                                 window.ethereum;
                
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: chainConfig.chainId }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    try {
                        const chainConfig = CHAIN_CONFIG['BSC'];
                        const provider = walletEnv === 'bitget' ? window.bitkeep.ethereum : 
                                         walletEnv === 'tokenpocket' ? window.tokenpocket.ethereum : 
                                         window.ethereum;
                        await provider.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: chainConfig.chainId,
                                chainName: chainConfig.chainName,
                                nativeCurrency: chainConfig.nativeCurrency,
                                rpcUrls: chainConfig.rpcUrls,
                                blockExplorerUrls: chainConfig.blockExplorerUrls
                            }]
                        });
                    } catch (addError) {
                        alert('添加 BSC 链失败: ' + (addError.message || '未知错误'));
                        return;
                    }
                } else if (switchError.code === 4001) {
                    return; // 用户拒绝
                } else {
                    alert('切换 BSC 链失败: ' + (switchError.message || '未知错误'));
                    return;
                }
            }
            
            updateChainUI('BSC');
            
        } else if (chain === 'TON') {
            // TON 链：非 EVM，直接切换 UI
            updateChainUI('TON');
            
        } else if (chain === 'SOL') {
            // Solana 链：非 EVM，直接切换 UI
            updateChainUI('SOL');
        }
        
        // 切换完成后，如果之前已登录，提示用户重新连接
        if (savedAddr) {
            setTimeout(() => {
                const shouldConnect = confirm(`已切换至 ${chain} 链，是否立即连接钱包？`);
                if (shouldConnect && typeof window.connectWallet === 'function') {
                    window.connectWallet();
                }
            }, 300);
        }
    };
    
    // 切换区块链下拉菜单
    window.toggleChainDropdown = function(event) {
        if (event) event.stopPropagation();
        const wrappers = document.querySelectorAll('.custom-select-wrapper');
        wrappers.forEach(w => w.classList.remove('open'));
        const wrapper = document.querySelector('.custom-select-wrapper:not(.lang-select-wrapper)');
        if (wrapper) wrapper.classList.toggle('open');
    };
    
    // 切换语言下拉菜单
    window.toggleLangDropdown = function(event) {
        if (event) event.stopPropagation();
        const wrappers = document.querySelectorAll('.custom-select-wrapper');
        wrappers.forEach(w => w.classList.remove('open'));
        const wrapper = document.querySelector('.custom-select-wrapper.lang-select-wrapper');
        if (wrapper) wrapper.classList.toggle('open');
    };
    
    // 选择语言
    window.selectLang = function(lang) {
        const wrapper = document.querySelector('.custom-select-wrapper.lang-select-wrapper');
        if (wrapper) wrapper.classList.remove('open');
        window.switchLang(lang);
    };
    
    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', function(event) {
        const wrappers = document.querySelectorAll('.custom-select-wrapper');
        wrappers.forEach(wrapper => {
            if (!wrapper.contains(event.target)) {
                wrapper.classList.remove('open');
            }
        });
    });
}

/**
 * 2. 应用程序初始化入口
 */
function initApp() {
    // 立即执行挂载，确保在 DOM 加载前函数已就绪
    mountAllGlobals();

    // 页面加载完成后的逻辑
    window.addEventListener('load', () => {
        console.log("[App] 页面加载完成，检查初始状态...");
        
        // --- 2.0 隐藏加载遮罩 ---
        setTimeout(() => {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                loadingOverlay.style.transition = 'opacity 0.3s ease-out';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }
        }, 200);
        
        // --- 2.0.5 恢复上次选择的链 ---
        const savedChain = localStorage.getItem('selectedChain') || 'BSC';
        window.currentChain = savedChain;
        setCurrentChain(savedChain);
        const chainConfig = CHAIN_CONFIG[savedChain];
        if (chainConfig) {
            document.getElementById('selectedChainText').textContent = savedChain;
            document.getElementById('selectedChainIcon').src = chainConfig.icon;
        }
        
        // --- 2.1 基础环境初始化 ---
        const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        if (window.i18nRender) {
            window.i18nRender(savedLang);
        }

        // 预渲染静态组件 (公告、看板)
        if (window.renderNews) renderNews(savedLang);
        if (window.renderStatsPage) renderStatsPage(savedLang);

        // --- 2.2 登录态恢复逻辑 ---
        const currentAddress = localStorage.getItem('fbs_address');
        const isManualLogout = localStorage.getItem('user_logout_manual');

        // 规则：本地有地址 且 用户没有手动点过“退出登录”
        if (currentAddress && isManualLogout !== 'true') {
            console.log(`[App] 自动连接地址: ${currentAddress}`);
            
            // 更新导航栏钱包 UI（显示缩略地址）
            updateWalletUI(currentAddress);
            
            // 核心：拉取飞书后台的所有资产、团队、记录数据
        fetchUserData(currentAddress);
            
        } else {
            console.log("[App] 处于未登录或手动登出状态，等待手动连接");
            resetWalletUI(); // 显示“连接钱包”按钮
            
            // 初始清空列表，防止显示旧的缓存数据
            if (window.renderHistory) window.renderHistory([]); 
            if (window.renderTransfers) window.renderTransfers([]);
            if (window.renderTokenList) window.renderTokenList({});
        }
    });

    /**
     * 3. 监听 localStorage 变化（跨标签页或同页内）
     * 用于钱包切换、链切换、退出登录时同步 UI
     */
    window.addEventListener('storage', (e) => {
        if (e.key === 'fbs_address' || e.key === 'fbs_chain') {
            console.log('[App] 检测到 storage 变化，同步钱包 UI');
            syncWalletUI();
        }
    });

    // 同页面内 localStorage 变化监听（通过轮询检测）
    let lastKnownAddress = localStorage.getItem('fbs_address');
    setInterval(() => {
        const currentAddr = localStorage.getItem('fbs_address');
        if (currentAddr !== lastKnownAddress) {
            console.log('[App] 检测到地址变化，同步钱包 UI');
            lastKnownAddress = currentAddr;
            syncWalletUI();
        }
    }, 500);
}

// --- 启动程序 ---
initApp();
