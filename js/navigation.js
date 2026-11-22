
(function () {
    var main = document.querySelector('main');
    if (!main) return;
    ['page-academy', 'page-device', 'page-chain'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.parentElement !== main) main.appendChild(el);
    });
})();

window.switchPage = function(page) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + page).classList.remove('hidden');
    var navEl = document.getElementById('nav-' + page);
    if (navEl) navEl.classList.add('active');

    document.body.classList.toggle('agent-active', page === 'agent');

    var lang = localStorage.getItem('fbs_lang') || 'zh-CN';
    var dict = (window.i18nData && window.i18nData[lang]) || (window.i18nData && window.i18nData['zh-CN']) || {};
    var subPages = { academy: dict.hdr_academy || 'NEO学院', market: dict.hdr_market || '算力市场', device: dict.hdr_device || '机房设备', chain: dict.hdr_chain || 'NEO公链' };
    var isSub = !!subPages[page];
    var titleEl = document.getElementById('headerTitle');
    var subEl = document.getElementById('headerSubtitle');
    if (titleEl) titleEl.textContent = isSub ? subPages[page] : (dict.title || 'NEO AI算力矩阵');
    if (subEl) subEl.style.display = isSub ? 'none' : '';

    var topCard = document.getElementById('top-card-section');
    if (topCard) topCard.style.display = isSub ? 'none' : '';

    var homeNav = document.getElementById('home-nav');
    if (homeNav) homeNav.style.display = (page === 'home') ? '' : 'none';
};

window.goToLPStake = function() {
    var target = document.getElementById('lp-stake-section');
    if (!target) return;
    window.switchPage('mine');
    requestAnimationFrame(function() {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
};

window.goToNryMining = function() {
    var target = document.getElementById('nry-mining-section');
    if (!target) return;
    window.switchPage('mine');
    requestAnimationFrame(function() {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
};

window.handleNav = function(key) {
    if (key === 'whitepaper') {
        window.showModal('白皮书', '<div class="p-8 text-center">白皮书即将上线</div>');
    }
};

(function () {
    var vv = window.visualViewport;
    if (!vv) return;
    var KEYBOARD_THRESHOLD = 120; 
    function onViewportChange() {
        var keyboardOpen = window.innerHeight - vv.height > KEYBOARD_THRESHOLD;
        document.body.classList.toggle('keyboard-open', keyboardOpen);
    }
    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
})();
