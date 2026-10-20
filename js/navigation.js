
window.switchPage = function(page) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('page-' + page).classList.remove('hidden');
    document.getElementById('nav-' + page).classList.add('active');

    document.body.classList.toggle('agent-active', page === 'agent');

    var topCard = document.getElementById('top-card-section');
    if (topCard) topCard.style.display = (page === 'market') ? 'none' : '';
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
