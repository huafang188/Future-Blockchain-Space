
window.i18nRender = function() {
    const lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    
    // 强制检查 window.i18nData 是否存在
    if (!window.i18nData) {
        console.error("[i18n] 严重错误：window.i18nData 未定义！语言包文件（如 zh-CN.js）可能未加载成功。");
        return;
    }

    const dict = window.i18nData[lang]; 
    if (!dict) {
        console.error(`[i18n] 找不到语言包数据: ${lang}`);
        return;
    }

    console.log(`[i18n] 正在渲染: ${lang}`);

    // --- A. 静态翻译 ---
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = dict[key];
        if (translation !== undefined) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                el.innerText = translation;
            }
        }
    });

    // --- B. 联动动态组件 (加上更强的容错) ---
    const dynamicRenders = ['renderNews', 'renderStatsPage', 'renderTokenList', 'renderHistory'];
    dynamicRenders.forEach(fnName => {
        if (typeof window[fnName] === 'function') {
            try {
                window[fnName](lang);
            } catch (e) {
                console.error(`[i18n] 执行 ${fnName} 失败:`, e);
            }
        } else {
            console.warn(`[i18n] 动态函数 ${fnName} 尚未就绪`);
        }
    });

    // --- C. 同步下拉框 ---
    const selectEl = document.getElementById('langSelect');
    if (selectEl) selectEl.value = lang;
};

// 2. 统一切换入口
window.switchLang = function(lang) {
    if (!lang) return;
    localStorage.setItem('fbs_lang', lang);
    window.i18nRender();
    window.dispatchEvent(new CustomEvent('onLanguageChanged', { detail: lang }));
};

// 3. 页面加载初始化 - 改用更稳妥的 window.onload
window.addEventListener('load', () => {
    // 稍微给浏览器喘息时间，确保所有 JS 模块初始化完成
    setTimeout(() => {
        const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        window.switchLang(savedLang); 
    }, 200);
});
