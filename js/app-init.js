import { 
    mountWalletClickHandler, 
    updateWalletUI, 
    resetWalletUI,
    mountAccountChangeListener
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
    mountWalletClickHandler();        // 挂载钱包点击逻辑 (wallet-utils)
    mountAccountChangeListener();     // 挂载账户变化监听器 (wallet-utils)
    mountModalHandlers();             // 挂载弹窗与复制逻辑 (modal-handler)
    mountCalculationHandlers();       // 挂载计算器逻辑 (calculations)
    mountActionExecutors();           // 挂载业务交互逻辑 (action-executor)

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

    // 区块链选择函数
    window.selectChain = function(chain) {
        // 关闭下拉菜单
        const wrapper = document.querySelector('.custom-select-wrapper');
        wrapper.classList.remove('open');
        
        if (chain === 'BSC') {
            // BSC 链点击无反应（当前已选中）
            return;
        } else {
            // TON 和 SOLANA 链显示 "come soon"
            alert('🚀 ' + chain + ' Chain: Coming Soon');
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
        
        // 额外调用：确保工厂模块数据被渲染（即使 fetchUserData 内部已调用）
        // 这可以确保在页面初始化时这三个区块也能正确显示
        setTimeout(() => {
            console.log("[App] 延迟渲染工厂模块数据");
            // 从全局缓存中获取数据（如果有的话）
            if (window.lastFetchedData) {
                window.renderFactoryData(window.lastFetchedData);
            }
        }, 500); 
            
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
     * 3. 监听钱包账号与链的变化
     * 修复核心：防止 TP 钱包等插件重复发送 accountsChanged 导致的死循环
     */
    if (window.ethereum) {
        // 监听账号切换
        window.ethereum.on('accountsChanged', (accounts) => {
            // 获取当前本地存储的旧地址进行对比
            const oldAddr = (localStorage.getItem('fbs_address') || "").toLowerCase();
            const newAddr = (accounts[0] || "").toLowerCase();

            console.log("[Wallet] 检测到账号信号:", newAddr || "空");

            // --- 核心修复：只有当地址【真正】发生改变时才执行重载 ---
            if (newAddr !== oldAddr) {
                console.log("[Wallet] 地址发生真实变更，正在更新状态...");
                
                if (newAddr) {
                    // 切换到了新账号
                    localStorage.setItem('fbs_address', accounts[0]);
                    localStorage.setItem('user_logout_manual', 'false');
                } else {
                    // 用户在插件内断开了所有连接
                    localStorage.removeItem('fbs_address');
                    localStorage.setItem('user_logout_manual', 'true');
                }
                
                // 执行刷新以确保所有数据（飞书/资产）重新加载
                location.reload();
            } else {
                console.log("[Wallet] 地址与本地一致，拦截重复刷新信号");
            }
        });

        // 链切换 (监听是否离开 BSC)
        window.ethereum.on('chainChanged', (chainId) => {
            console.log("[Wallet] 网络变更:", chainId);
            location.reload();
        });
    } else {
        console.warn("[App] 未检测到 Web3 环境，请在钱包 DApp 浏览器中访问");
    }
}

// --- 启动程序 ---
initApp();
