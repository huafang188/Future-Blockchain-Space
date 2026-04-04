
// 1. 渲染函数（执行翻译的核心）
window.i18nRender = function() {
    const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    
    // 从全局变量 i18nData 中获取对应语言包
    const dict = window.i18nData ? window.i18nData[lang] : null; 
    
    if (!dict) {
        console.warn("未找到语言包数据，请检查语言文件是否加载:", lang);
        return;
    }

    // A. 翻译带有 data-i18n 属性的静态元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = dict[key];
            } else {
                el.innerText = dict[key];
            }
        }
    });

    // B. 执行动态内容的渲染（如公告、代币列表）
    if (typeof window.renderNews === 'function') {
        window.renderNews(lang);
    }
    
    if (typeof window.renderStatsPage === 'function') {
        window.renderStatsPage(lang);
    }
};

// 2. 切换语言函数
window.switchLang = function(lang) {
    console.log("切换语言至:", lang);
    localStorage.setItem('fbs_lang', lang);
    window.i18nRender(); 
};

// 3. 初始化加载
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
    const selectEl = document.getElementById('langSelect');
    if (selectEl) selectEl.value = savedLang;
    
    // 延迟一小会儿执行，确保所有语言包 script 加载完毕
    window.i18nRender();
});
