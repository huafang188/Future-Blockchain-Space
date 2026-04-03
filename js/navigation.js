// 导航核心函数（必须全局，否则导航栏失效）
window.switchPage = function(page) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + page).classList.remove('hidden');
    document.getElementById('nav-' + page).classList.add('active');
};

// 顶部导航（白皮书等）
window.handleNav = function(key) {
    if (key === 'whitepaper') {
        window.showModal('白皮书', '<div class="p-8 text-center">白皮书即将上线</div>');
    }
};

/**
 * 切换语言的核心逻辑
 */
window.switchLang = function(lang) {
    // 1. 更新本地存储
    localStorage.setItem('fbs_lang', lang);
    
    // 2. 渲染静态标签 (处理带有 data-i18n 属性的元素)
    if (typeof window.i18nRender === 'function') {
        window.i18nRender(lang);
    }
    
    // 3. 关键：重新渲染动态生成的组件
    // 只有重新执行这些函数，它们才会从 i18nData[lang] 中读取最新的数组和文字
    if (typeof window.renderNews === 'function') {
        window.renderNews(lang);
    }
    
    if (typeof window.renderStatsPage === 'function') {
        window.renderStatsPage(lang);
    }

    // 4. (可选) 如果个人中心的代币列表也有多语言需求，也需要重新渲染
    // if (typeof window.renderTokenList === 'function') {
    //     window.renderTokenList(window.userBalances || {});
    // }

    console.log(`Language successfully switched to: ${lang}`);
};
