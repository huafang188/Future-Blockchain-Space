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

import { CHAIN_CONFIG, setCurrentChain, TOKEN_DECIMALS, ACTIVE_CHAINS } from './config.js';

window.CHAIN_CONFIG = CHAIN_CONFIG;
window.TOKEN_DECIMALS = TOKEN_DECIMALS;

function mountActivityCountdown() {
    const dayEl = document.getElementById('activityDays');
    const timeEl = document.getElementById('activityTime');
    if (!dayEl || !timeEl) return;

    const deadline = new Date('2026-09-30T23:59:59+03:00').getTime();

    const tick = () => {
        const diff = deadline - Date.now();
        if (diff <= 0) {
            dayEl.textContent = '0';
            timeEl.textContent = '00:00:00';
            return;
        }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const pad = (n) => String(n).padStart(2, '0');
        dayEl.textContent = d;
        timeEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    tick();
    setInterval(tick, 1000);
}

function mountAllGlobals() {
    console.log("[Init] 开始挂载全局函数...");

    window.updateText = updateText;
    window.fetchUserData = fetchUserData;
    window.postTransactionRecord = postTransactionRecord;
    window.submitBindInviter = submitBindInviter;

    window.renderTokenList = renderTokenList;
    window.renderHistory = renderHistory;
    window.renderTransfers = renderTransfers;
    window.renderStatsPage = renderStatsPage;
    window.renderNews = renderNews;

    mountWalletClickHandler();        
    mountAccountChangeListener();     
    mountModalHandlers();             
    mountCalculationHandlers();       
    mountActionExecutors();           
    mountActivityCountdown();          

    window.syncWalletUI = syncWalletUI;

    console.log("[Init] 全局函数挂载完成");

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

    window.startCarousel = function() {
        if (carouselInterval) clearInterval(carouselInterval);
        carouselInterval = setInterval(carouselNext, 5000);
    };

    window.stopCarousel = function() {
        if (carouselInterval) {
            clearInterval(carouselInterval);
            carouselInterval = null;
        }
    };

    window.toggleLangDropdown = function(event) {
        if (event) event.stopPropagation();
        const wrappers = document.querySelectorAll('.custom-select-wrapper');
        wrappers.forEach(w => w.classList.remove('open'));
        const wrapper = document.querySelector('.custom-select-wrapper.lang-select-wrapper');
        if (wrapper) wrapper.classList.toggle('open');
    };

    window.selectLang = function(lang) {
        const wrapper = document.querySelector('.custom-select-wrapper.lang-select-wrapper');
        if (wrapper) wrapper.classList.remove('open');
        window.switchLang(lang);
    };

    document.addEventListener('click', function(event) {
        const wrappers = document.querySelectorAll('.custom-select-wrapper');
        wrappers.forEach(wrapper => {
            if (!wrapper.contains(event.target)) {
                wrapper.classList.remove('open');
            }
        });
    });
}

function initApp() {

    mountAllGlobals();

    window.addEventListener('load', () => {
        console.log("[App] 页面加载完成，检查初始状态...");

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

        window.currentChain = 'BSC';
        setCurrentChain('BSC');

        const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        if (window.i18nRender) {
            window.i18nRender(savedLang);
        }

        if (window.renderNews) renderNews(savedLang);
        if (window.renderStatsPage) renderStatsPage(savedLang);

        console.log('[App] 清除登录状态，等待用户手动连接钱包');

        localStorage.removeItem('fbs_address');
        localStorage.removeItem('fbs_chain');
        localStorage.removeItem('user_logout_manual');

        if (window.userBalances) window.userBalances = {};
        if (window.lastFetchedData) window.lastFetchedData = null;
        if (window.currentUserInfo) window.currentUserInfo = null;

        resetWalletUI();

        if (window.renderHistory) window.renderHistory([]); 
        if (window.renderTransfers) window.renderTransfers([]); 
        if (window.renderTokenList) window.renderTokenList({});
    });

    window.addEventListener('storage', (e) => {
        if (e.key === 'fbs_address' || e.key === 'fbs_chain') {
            console.log('[App] 检测到 storage 变化，同步钱包 UI');
            syncWalletUI();
        }
    });

    const origSetItem = localStorage.setItem.bind(localStorage);
    const origRemoveItem = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = function(key, value) {
        origSetItem(key, value);
        if (key === 'fbs_address' || key === 'fbs_chain') {
            window.dispatchEvent(new CustomEvent('fbs-storage-change', { detail: { key } }));
        }
    };
    localStorage.removeItem = function(key) {
        origRemoveItem(key);
        if (key === 'fbs_address' || key === 'fbs_chain') {
            window.dispatchEvent(new CustomEvent('fbs-storage-change', { detail: { key } }));
        }
    };

    let syncWalletTimeout = null;
    window.addEventListener('fbs-storage-change', () => {
        console.log('[App] 检测到地址变化，同步钱包 UI');
        if (syncWalletTimeout) {
            clearTimeout(syncWalletTimeout);
        }
        syncWalletTimeout = setTimeout(() => {
            syncWalletUI();
            syncWalletTimeout = null;
        }, 300);
    });
}

window.initMoscowTime = function() {
    function updateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
            timeZone: 'Europe/Moscow',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const currentLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        const dateStr = now.toLocaleDateString(currentLang, {
            timeZone: 'Europe/Moscow',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short'
        });

        const timeEl = document.getElementById('moscowTime');
        const dateEl = document.getElementById('moscowDate');

        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
    }

    function getWeatherEmoji(code) {
        if (code >= 0 && code <= 3) return '☀️';
        if (code >= 45 && code <= 48) return '🌫️';
        if (code >= 51 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '❄️';
        if (code >= 80 && code <= 82) return '🌦️';
        if (code >= 95 && code <= 99) return '⛈️';
        return '🌤️';
    }

    async function fetchWeather() {
        try {
            const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=55.7558&longitude=37.6173&current_weather=true');
            const data = await response.json();

            if (data.current_weather) {
                const emoji = getWeatherEmoji(data.current_weather.weathercode);
                const temp = Math.round(data.current_weather.temperature);

                const emojiEl = document.getElementById('weatherEmoji');
                const tempEl = document.getElementById('weatherTemp');

                if (emojiEl) emojiEl.textContent = emoji;
                if (tempEl) tempEl.textContent = `${temp}°C`;
            }
        } catch (e) {
            console.log('[Moscow Time] Weather fetch failed, using default');
        }
    }

    updateTime();
    fetchWeather();

    setInterval(updateTime, 1000);
    setInterval(fetchWeather, 300000);
};

window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof window.initMoscowTime === 'function') {
            window.initMoscowTime();
        }
    }, 300);
});

initApp();
