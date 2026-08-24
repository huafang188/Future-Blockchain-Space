// 导航核心函数（必须全局，否则导航栏失效）
window.switchPage = function(page) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + page).classList.remove('hidden');
    document.getElementById('nav-' + page).classList.add('active');
    // Agent 页面隐藏页面顶部标题栏，让聊天界面占据整个顶部；其他页面恢复
    document.body.classList.toggle('agent-active', page === 'agent');
};

// 顶部导航（白皮书等）
window.handleNav = function(key) {
    if (key === 'whitepaper') {
        window.showModal('白皮书', '<div class="p-8 text-center">白皮书即将上线</div>');
    }
};

// 输入法（软键盘）弹出检测：弹出时隐藏底部导航栏，避免悬浮在键盘上方
(function () {
    var vv = window.visualViewport;
    if (!vv) return;
    var KEYBOARD_THRESHOLD = 120; // 视口高度缩小超过该值视为键盘弹出
    function onViewportChange() {
        var keyboardOpen = window.innerHeight - vv.height > KEYBOARD_THRESHOLD;
        document.body.classList.toggle('keyboard-open', keyboardOpen);
    }
    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
})();
