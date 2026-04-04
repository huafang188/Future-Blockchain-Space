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
