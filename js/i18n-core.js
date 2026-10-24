
window.i18nRender = function(lang) {
    lang = lang || localStorage.getItem('fbs_lang') || 'zh-CN';

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

        localStorage.setItem('fbs_lang', 'zh-CN');
    }

    console.log(`[i18n] 正在渲染语言: ${lang}`);

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

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translation = dict[key];
        if (translation !== undefined) {

            let placeholder = translation;
            if (placeholder.includes('{max}')) {
                const max = el.placeholder.match(/最多 (\d+)/)?.[1] || '';
                placeholder = placeholder.replace('{max}', max);
            }
            el.placeholder = placeholder;
        }
    });

    const dynamicRenders = ['renderNews', 'renderStatsPage', 'renderIdentityWeight'];

    dynamicRenders.forEach(fnName => {
        if (typeof window[fnName] === 'function') {
            try {
                window[fnName](lang);
            } catch (e) {
                console.error(`[i18n] 执行 ${fnName} 失败:`, e);
            }
        }
    });

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

window.switchLang = async function(lang) {
    if (!lang) return;
    console.log(`[i18n] 切换语言至: ${lang}`);

    if (lang !== 'zh-CN' && window.loadLanguage) {
        try {
            await window.loadLanguage(lang);
        } catch (e) {
            console.error(`[i18n] 加载语言文件失败: ${lang}`, e);
            return;
        }
    }

    localStorage.setItem('fbs_lang', lang);

    window.i18nRender();

    window.dispatchEvent(new CustomEvent('onLanguageChanged', { detail: lang }));
};

window.addEventListener('load', () => {

    setTimeout(() => {
        const savedLang = localStorage.getItem('fbs_lang') || 'zh-CN';
        window.i18nRender(); 
    }, 200);
});
