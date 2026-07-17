/**
 * 🌍 国际化核心模块 - 修复数据归零问题版
 */
window.i18nRender = function(lang) {
    lang = lang || localStorage.getItem('fbs_lang') || 'zh-CN';
    
    // 1. 强制检查 window.i18nData 是否存在
    if (!window.i18nData) {
        console.error("[i18n] 严重错误：window.i18nData 未定义！");
        return;
    }

    let dict = window.i18nData[lang]; 
    if (!dict) {
        console.warn(`[i18n] 找不到语言包数据: ${lang}，使用默认语言 zh-CN`);
        dict = window.i18nData['zh-CN'];
        if (!dict) {
            console.error("[i18n] 默认语言包也找不到！");
            return;
        }
        // 更新localStorage为默认语言
        localStorage.setItem('fbs_lang', 'zh-CN');
    }

    console.log(`[i18n] 正在渲染语言: ${lang}`);

    // --- A. 静态翻译 (核心逻辑：处理页面上所有带有 data-i18n 属性的元素) ---
    // 这个逻辑是最安全的，它只替换文字，不影响数据逻辑
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = dict[key];
        if (translation !== undefined) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else if (el.tagName === 'OPTION') {
                el.textContent = translation;
            } else {
                el.innerHTML = translation;
            }
        }
    });

    // --- B. 处理占位符翻译 ---
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translation = dict[key];
        if (translation !== undefined) {
            // 处理占位符中的变量，如 {max}
            let placeholder = translation;
            if (placeholder.includes('{max}')) {
                const max = el.placeholder.match(/最多 (\d+)/)?.[1] || '';
                placeholder = placeholder.replace('{max}', max);
            }
            el.placeholder = placeholder;
        }
    });

    // --- B. 联动动态组件 (仅保留只需语言代码即可渲染的函数) ---
    /**
     * ⚠️ 修复说明：
     * 这里移除了 'renderTokenList' 和 'renderHistory'。
     * 因为这两个函数需要真实的“资产数据/历史数据”对象才能运行。
     * 如果在这里传入 lang (字符串)，会导致渲染逻辑因拿不到数据而将页面数值清空。
     */
    const dynamicRenders = ['renderNews', 'renderStatsPage', 'renderMinerLevel'];
    
    dynamicRenders.forEach(fnName => {
        if (typeof window[fnName] === 'function') {
            try {
                window[fnName](lang);
            } catch (e) {
                console.error(`[i18n] 执行 ${fnName} 失败:`, e);
            }
        }
    });

    // --- C. 同步语言切换下拉框 ---
    const langTextEl = document.getElementById('selectedLangText');
    if (langTextEl) {
        const langNames = {
            'zh-CN': '🇨🇳 中文',
            'zh-HK': '🇭🇰 繁體',
            'en': '🇺🇸 EN',
            'ja': '🇯🇵 JP',
            'ko': '🇰🇷 KR',
            'ru': '🇷🇺 RU',
            'de': '🇩🇪 DE',
            'fr': '🇫🇷 FR',
            'it': '🇮🇹 IT',
            'ar': '🇸🇦 AR',
            'mn': '🇲🇳 MN',
            'hi': '🇮🇳 HI',
            'el': '🇬🇷 EL',
            'ug': '🇨🇳 ئۇيغۇر'
        };
        langTextEl.textContent = langNames[lang] || lang;
    }
};

/**
 * 2. 统一切换入口 - 支持按需加载语言文件
 */
window.switchLang = async function(lang) {
    if (!lang) return;
    console.log(`[i18n] 切换语言至: ${lang}`);
    
    // 如果语言不是默认的 zh-CN，按需加载语言文件
    if (lang !== 'zh-CN' && window.loadLanguage) {
        try {
            await window.loadLanguage(lang);
        } catch (e) {
            console.error(`[i18n] 加载语言文件失败: ${lang}`, e);
            return;
        }
    }
    
    localStorage.setItem('fbs_lang', lang);
    
    // 执行翻译渲染
    window.i18nRender();
    
    // 发送全局事件，如果有其他模块需要监听语言变化可以捕获
    window.dispatchEvent(new CustomEvent('onLanguageChanged', { detail: lang }));
};

/**
 * 3. 页面加载初始化
 */
window.addEventListener('load', () => {
    // 延迟执行，确保所有 JS 模块挂载到 window 对象后再进行首次翻译
    setTimeout(() => {
        const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        window.i18nRender(); 
    }, 200);
});
