/**
 * i18n-core.js - 统一翻译与渲染核心
 * 职责：管理语言状态、执行 DOM 替换、触发动态组件重绘
 */

// 1. 核心渲染函数
window.i18nRender = function() {
    const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    
    // 获取语言包数据
    const dict = window.i18nData ? window.i18nData[lang] : null; 
    
    if (!dict) {
        console.error(`[i18n] 找不到语言包数据: ${lang}。请检查 js/lang/${lang}.js 是否正确加载。`);
        return;
    }

    console.log(`[i18n] 正在执行页面渲染，语言: ${lang}`);

    // --- A. 静态元素翻译 ---
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = dict[key];

        if (translation !== undefined) {
            // 处理输入框的 placeholder
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                // 处理普通文本
                el.innerText = translation;
            }
        } else {
            console.warn(`[i18n] 语言包 [${lang}] 中缺少 Key: "${key}"`);
        }
    });

    // --- B. 动态组件渲染 ---
    // 强制触发业务逻辑中的渲染函数，确保数组类数据（如公告、代币详情）同步更新
    if (typeof window.renderNews === 'function') {
        window.renderNews(lang);
    }
    
    if (typeof window.renderStatsPage === 'function') {
        window.renderStatsPage(lang);
    }

    // 如果你有底部导航或其他由 JS 生成的 UI，也在这里统一触发
    if (typeof window.renderNavigation === 'function') {
        window.renderNavigation(lang);
    }

    // --- C. 同步下拉框状态 ---
    const selectEl = document.getElementById('langSelect');
    if (selectEl && selectEl.value !== lang) {
        selectEl.value = lang;
    }
};

// 2. 统一切换语言入口
window.switchLang = function(lang) {
    if (!lang) return;
    
    console.log(`[i18n] 切换语言至: ${lang}`);
    
    // 更新本地缓存
    localStorage.setItem('fbs_lang', lang);
    
    // 执行渲染
    window.i18nRender();
    
    // 发送全局自定义事件（可选，方便其他 type="module" 的脚本监听）
    window.dispatchEvent(new CustomEvent('onLanguageChanged', { detail: lang }));
};

// 3. 页面加载初始化
document.addEventListener('DOMContentLoaded', () => {
    // 稍微延迟 50ms 执行
    // 理由：确保 DOM 树已经完全构建，且所有 type="module" 的渲染脚本已完成初始填充
    setTimeout(() => {
        const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        window.switchLang(savedLang); 
    }, 50);
});
