const BANNER = '.yandex-banner';
const TEXTS = '.yandex-banner-hello, .yandex-banner-slogan, .yandex-banner-desc, .yandex-intro-title, .yandex-intro-body, .yandex-tag, .yandex-cta-primary [data-i18n], .yandex-cta-secondary [data-i18n]';
const SPEED = 30;

let played = false;
let token = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function typeElement(el, myToken) {
    const full = el.textContent;
    el.classList.add('yandex-typing');
    for (let i = 0; i <= full.length; i++) {
        if (myToken !== token) break;
        el.textContent = full.slice(0, i);
        await sleep(SPEED);
    }
    el.classList.remove('yandex-typing');
}

async function play() {
    if (played) return;
    played = true;
    const banner = document.querySelector(BANNER);
    if (!banner) return;
    const myToken = ++token;
    const els = banner.querySelectorAll(TEXTS);
    for (const el of els) {
        if (myToken !== token) break;
        await typeElement(el, myToken);
    }
}

function init() {
    const banner = document.querySelector(BANNER);
    if (!banner) return;
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) {
                io.disconnect();
                play();
            }
        }, { threshold: 0.2 });
        io.observe(banner);
    } else {
        play();
    }
}

window.addEventListener('onLanguageChanged', () => { token++; });

if (document.readyState === 'complete') {
    setTimeout(init, 250);
} else {
    window.addEventListener('load', () => setTimeout(init, 250));
}