window.academySwitchTab = function (pane) {
    document.querySelectorAll('.academy-pane').forEach(function (el) { el.classList.add('hidden'); });
    var target = document.getElementById('academyPane' + pane.charAt(0).toUpperCase() + pane.slice(1));
    if (target) target.classList.remove('hidden');
    var btns = document.querySelectorAll('#academyTabBar button');
    btns.forEach(function (b) {
        var active = b.getAttribute('onclick').indexOf("'" + pane + "'") !== -1;
        b.classList.toggle('bg-orange-500', active);
        b.classList.toggle('text-white', active);
        b.classList.toggle('shadow-md', active);
        b.classList.toggle('text-slate-600', !active);
    });
};

window.switchHomeTab = function(tab) {
    document.querySelectorAll('#homeTabs .home-tab-panel').forEach(function(el){ el.classList.add('hidden'); });
    var target = document.getElementById('tab-' + tab);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('#homeTabBar .home-tab-btn').forEach(function(el){
        var active = el.getAttribute('data-tab') === tab;
        el.classList.toggle('bg-orange-500', active);
        el.classList.toggle('text-white', active);
        el.classList.toggle('text-slate-600', !active);
    });
};
(function () {
    var bar = document.getElementById('homeTabBar');
    if (!bar) return;
    var isDown = false, startX = 0, startScroll = 0, moved = 0;
    bar.addEventListener('mousedown', function (e) {
        isDown = true; moved = 0;
        startX = e.pageX; startScroll = bar.scrollLeft;
        bar.style.cursor = 'grabbing';
        e.preventDefault();
    });
    bar.addEventListener('mousemove', function (e) {
        if (!isDown) return;
        var dx = e.pageX - startX;
        moved = Math.max(moved, Math.abs(dx));
        bar.scrollLeft = startScroll - dx;
    });
    function endDrag() { isDown = false; bar.style.cursor = ''; }
    bar.addEventListener('mouseup', endDrag);
    bar.addEventListener('mouseleave', endDrag);
    bar.addEventListener('click', function (e) {
        if (moved > 5) { e.stopPropagation(); e.preventDefault(); }
    }, true);
})();

function toggleWp() {
    var c = document.getElementById('wpContent');
    var i = document.getElementById('wpToggleIcon');
    c.classList.toggle('hidden');
    i.style.transform = c.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

function toggleNewsSection() {
    var c = document.getElementById('news-content');
    var i = document.getElementById('news-toggle-icon');
    var hint = document.getElementById('news-expand-hint');
    c.classList.toggle('hidden');
    var isOpen = !c.classList.contains('hidden');
    i.style.transform = isOpen ? 'rotate(180deg)' : '';
    if (hint) {
        hint.textContent = isOpen ? (window.i18nData?.['click_to_collapse'] || '点击收起') : (window.i18nData?.['click_to_expand'] || '点击展开');
    }
}
