
(function () {
    'use strict';

    const STORAGE_KEY = 'fbs_agent_history';
    const API_URL = 'https://api.neoneo.ink/api/chat';
    const MAX_HISTORY = 20; 

    const QUICK_QUESTIONS = {
        founder: "请详细介绍 NEO 生态的创始人 Igor Runets，包括他的教育背景、创立 BitRiver 的经历、布拉茨克矿场、与 Gazprom Neft 的合作、以及在 2026 年推动 AI 数据中心转型的动态。",
        price: "NEO 矿机的价格是多少？电费怎么算？矿机有什么规格？日产量多少？",
        ai: "请详细介绍 NEO 的 AI 战略，包括与 OpenAI 的合作、去中心化 AI 算力网络、隐私安全计算和 Web3 智能体生态的布局。",
        withdraw: "NEO 提现和兑换 USDT 的规则是什么？兑换滑点是多少？提现手续费怎么收？多久到账？如果超过 2 小时未到账怎么办？"
    };

    let isResponding = false;

    function loadHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveHistory(history) {
        try {

            const trimmed = history.slice(-MAX_HISTORY * 2);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch (e) {  }
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function inlineMd(s) {
        return s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    }
    function formatAgentText(text) {
        const safe = escapeHtml(text || '');
        return safe.split('\n').map(function (line) {
            const t = line.trim();
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) return '<div class="fbs-md-hr"></div>';
            let m;
            if ((m = t.match(/^#{1,6}\s*(.*)$/))) return '<div class="fbs-md-h">' + inlineMd(m[1]) + '</div>';
            if ((m = t.match(/^[-*]\s+(.*)$/))) return '<div class="fbs-md-li">• ' + inlineMd(m[1]) + '</div>';
            return '<div>' + inlineMd(line) + '</div>';
        }).join('');
    }

    function renderMessage(role, content, opts) {
        opts = opts || {};
        const container = document.getElementById('agentMessages');
        if (!container) return null;

        const msg = document.createElement('div');
        msg.className = 'fbs-msg fbs-msg--' + role;
        if (opts.welcome) msg.classList.add('fbs-msg--welcome');
        if (opts.error) msg.classList.add('fbs-msg--error');
        if (opts.id) msg.id = opts.id;

        const avatar = document.createElement('div');
        avatar.className = 'fbs-msg-avatar';
        avatar.innerHTML = role === 'ai'
            ? '<i class="fas fa-robot"></i>'
            : '<i class="fas fa-user"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'fbs-msg-bubble';
        if (role === 'ai') {
            bubble.innerHTML = formatAgentText(content);
        } else {
            bubble.textContent = content || '';
        }

        msg.appendChild(avatar);
        msg.appendChild(bubble);
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
        return bubble;
    }

    function renderTypingIndicator() {
        const container = document.getElementById('agentMessages');
        if (!container) return null;

        const msg = document.createElement('div');
        msg.className = 'fbs-msg fbs-msg--ai';
        msg.id = 'typing-indicator';

        const avatar = document.createElement('div');
        avatar.className = 'fbs-msg-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'fbs-msg-bubble';
        bubble.innerHTML = '<div class="fbs-typing-dots"><span></span><span></span><span></span></div>';

        msg.appendChild(avatar);
        msg.appendChild(bubble);
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
        return msg;
    }

    function removeTypingIndicator() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    function showWelcomeIfEmpty() {
        const container = document.getElementById('agentMessages');
        if (!container || container.children.length > 0) return;

        const welcomeText = (window.i18n && window.i18n('agent_welcome'))
            || '你好！我是 NEO AI 助手。可以问我关于 NCL、挖矿、AI 战略等问题。';
        renderMessage('ai', welcomeText, { welcome: true });
    }

    async function sendUserMessage(text) {
        if (isResponding) return;
        text = (text || '').trim();
        if (!text) return;

        const history = loadHistory();
        history.push({ role: 'user', content: text });

        renderMessage('user', text);
        saveHistory(history);

        const input = document.getElementById('agentInput');
        if (input) {
            input.value = '';
            autoResizeAgentInput(input);
        }

        setResponding(true);
        renderTypingIndicator();

        try {
            const replyText = await streamChat(history);
            removeTypingIndicator();

            if (replyText !== null) {
                renderMessage('ai', replyText);
                history.push({ role: 'ai', content: replyText });
                saveHistory(history);
            }
        } catch (err) {
            removeTypingIndicator();
            const errText = (window.i18n && window.i18n('agent_error'))
                || '抱歉，发生错误，请稍后重试。';
            renderMessage('ai', errText, { error: true });
            console.error('[Agent] stream error:', err);
        } finally {
            setResponding(false);
        }
    }

    function setResponding(val) {
        isResponding = val;
        const btn = document.getElementById('agentSendBtn');
        if (btn) btn.disabled = val;
    }

    async function streamChat(history) {
        const lang = (localStorage.getItem('fbs_lang') || 'zh-CN').split('-')[0];
        const resp = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: history.slice(-12), 
                lang: lang
            })
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.msg || ('HTTP ' + resp.status));
        }

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('text/event-stream')) {

            const data = await resp.json();
            return data.response || data.msg || '';
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullText = '';

        const container = document.getElementById('agentMessages');
        const liveMsg = document.createElement('div');
        liveMsg.className = 'fbs-msg fbs-msg--ai';
        const liveAvatar = document.createElement('div');
        liveAvatar.className = 'fbs-msg-avatar';
        liveAvatar.innerHTML = '<i class="fas fa-robot"></i>';
        const liveBubble = document.createElement('div');
        liveBubble.className = 'fbs-msg-bubble';
        liveMsg.appendChild(liveAvatar);
        liveMsg.appendChild(liveBubble);
        container.appendChild(liveMsg);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine.startsWith('data:')) continue;
                const data = trimmedLine.slice(5).trim();
                if (!data || data === '[DONE]') continue;
                let obj;
                try { obj = JSON.parse(data); } catch (e) { continue; }
                if (obj.error) {
                    liveMsg.remove();
                    throw new Error(obj.error);
                }
                const token = obj.token || obj.response || '';
                if (token) {
                    fullText += token;
                    liveBubble.textContent = fullText;
                    container.scrollTop = container.scrollHeight;
                }
            }
        }

        liveMsg.remove();

        return fullText || '(空回复)';
    }

    window.sendAgentMessage = function () {
        const input = document.getElementById('agentInput');
        if (!input) return;
        sendUserMessage(input.value);
    };

    window.sendQuickMessage = function (key) {
        const text = (window.i18n && window.i18n('agent_q_' + key + '_full')) || QUICK_QUESTIONS[key];
        if (text) sendUserMessage(text);
    };

    window.clearAgentChat = function () {
        if (!confirm((window.i18n && window.i18n('agent_clear_confirm')) || '确定清空所有对话？')) return;
        localStorage.removeItem(STORAGE_KEY);
        const container = document.getElementById('agentMessages');
        if (container) container.innerHTML = '';
        showWelcomeIfEmpty();
    };

    window.autoResizeAgentInput = function (el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    };

    window.handleAgentKeydown = function (e) {

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAgentMessage();
        }
    };

    window.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('agentMessages');
        if (!container) return;

        const history = loadHistory();
        if (history.length === 0) {
            showWelcomeIfEmpty();
        } else {
            history.forEach(msg => {
                renderMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
            });
        }

    });

    const origSwitchPage = window.switchPage;
    if (origSwitchPage) {
        window.switchPage = function (page) {
            origSwitchPage(page);
            if (page === 'agent') {
                const container = document.getElementById('agentMessages');
                if (container) {
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight;
                    }, 100);
                }
            }
        };
    }
})();
