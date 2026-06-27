(function () {
  'use strict';

  var script = document.currentScript;
  var botId = script.getAttribute('data-bot-id') || '';
  var userId = script.getAttribute('data-user-id') || 'default';
  var apiBase = script.getAttribute('data-api-base') || 'http://localhost:8080';
  var primaryColor = script.getAttribute('data-primary-color') || '#6366f1';
  var position = script.getAttribute('data-position') || 'right';
  var botName = script.getAttribute('data-bot-name') || 'AI Assistant';
  var welcomeMsg = script.getAttribute('data-welcome-message') || 'Hi! How can I help you today?';

  var chatApi = apiBase + '/api/v1/chat/script/' + userId + '/';
  var visitorId = localStorage.getItem('cb_visitorId');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('cb_visitorId', visitorId);
  }

  var sessionId = null;
  var conversationId = null;

  function createElement(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') { el.className = attrs[k]; }
        else if (k === 'style') { el.style.cssText = attrs[k]; }
        else if (k === 'innerHTML') { el.innerHTML = attrs[k]; }
        else { el.setAttribute(k, attrs[k]); }
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (typeof c === 'string') { el.appendChild(document.createTextNode(c)); }
        else if (c) { el.appendChild(c); }
      });
    }
    return el;
  }

  function createStyles() {
    var css = [
      '#cb-widget * { box-sizing: border-box; margin: 0; padding: 0; }',
      '#cb-widget { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }',
      '#cb-btn { position: fixed; bottom: 24px; ' + position + ': 24px; z-index: 999999; width: 60px; height: 60px; border-radius: 50%; background: ' + primaryColor + '; color: #fff; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 28px; transition: transform 0.2s; }',
      '#cb-btn:hover { transform: scale(1.1); }',
      '#cb-btn.cb-open { transform: rotate(45deg); }',
      '@keyframes cb-pulse { 0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.2); } 50% { box-shadow: 0 4px 28px ' + primaryColor + '80; } }',
      '#cb-btn { animation: cb-pulse 2s infinite; }',
      '#cb-panel { position: fixed; bottom: 100px; ' + position + ': 24px; z-index: 999998; width: 380px; height: 560px; max-height: calc(100vh - 140px); background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; }',
      '@media (max-width: 480px) { #cb-panel { ' + position + ': 0; bottom: 0; width: 100%; height: 100vh; max-height: 100vh; border-radius: 0; } }',
      '#cb-panel.cb-open { display: flex; }',
      '#cb-header { background: ' + primaryColor + '; color: #fff; padding: 16px 20px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }',
      '#cb-avatar { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; }',
      '#cb-header-info { flex: 1; }',
      '#cb-header-name { font-weight: 600; font-size: 15px; }',
      '#cb-header-status { font-size: 12px; opacity: 0.8; display: flex; align-items: center; gap: 4px; }',
      '#cb-header-status::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #4ade80; display: inline-block; }',
      '#cb-close { background: none; border: none; color: #fff; font-size: 22px; cursor: pointer; opacity: 0.8; padding: 4px; }',
      '#cb-close:hover { opacity: 1; }',
      '#cb-messages { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; display: flex; flex-direction: column; gap: 8px; }',
      '.cb-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.45; word-wrap: break-word; animation: cb-fadeIn 0.2s; }',
      '@keyframes cb-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
      '.cb-msg-bot { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; color: #1f2937; }',
      '.cb-msg-user { align-self: flex-end; background: ' + primaryColor + '; color: #fff; border-bottom-right-radius: 4px; }',
      '.cb-typing { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; border-bottom-left-radius: 4px; padding: 12px 18px; display: flex; gap: 4px; }',
      '.cb-typing span { width: 8px; height: 8px; border-radius: 50%; background: #9ca3af; animation: cb-bounce 1.4s infinite; }',
      '.cb-typing span:nth-child(2) { animation-delay: 0.2s; }',
      '.cb-typing span:nth-child(3) { animation-delay: 0.4s; }',
      '@keyframes cb-bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }',
      '#cb-footer { padding: 12px 16px; border-top: 1px solid #e5e7eb; background: #fff; flex-shrink: 0; display: flex; gap: 8px; }',
      '#cb-input { flex: 1; border: 1px solid #d1d5db; border-radius: 24px; padding: 10px 16px; font-size: 14px; outline: none; }',
      '#cb-input:focus { border-color: ' + primaryColor + '; }',
      '#cb-send { width: 40px; height: 40px; border-radius: 50%; background: ' + primaryColor + '; color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }',
      '#cb-send:hover { opacity: 0.9; }',
      '#cb-send:disabled { opacity: 0.5; cursor: not-allowed; }'
    ].join('');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  var panel, messagesEl, inputEl, sendEl, btnEl;

  function togglePanel() {
    var isOpen = panel.classList.contains('cb-open');
    if (isOpen) {
      panel.classList.remove('cb-open');
      btnEl.classList.remove('cb-open');
      btnEl.innerHTML = getChatIcon();
    } else {
      panel.classList.add('cb-open');
      btnEl.classList.add('cb-open');
      btnEl.innerHTML = getCloseIcon();
      if (messagesEl.children.length === 0) {
        addBotMessage(welcomeMsg);
      }
      inputEl.focus();
    }
  }

  function getChatIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  }

  function getCloseIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  function getSendIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  }

  function addBotMessage(text) {
    var el = createElement('div', { className: 'cb-msg cb-msg-bot' }, [text]);
    messagesEl.appendChild(el);
    scrollBottom();
  }

  function addUserMessage(text) {
    var el = createElement('div', { className: 'cb-msg cb-msg-user' }, [text]);
    messagesEl.appendChild(el);
    scrollBottom();
  }

  function showTyping() {
    var el = createElement('div', { className: 'cb-typing', id: 'cb-typing-indicator' });
    el.appendChild(createElement('span'));
    el.appendChild(createElement('span'));
    el.appendChild(createElement('span'));
    messagesEl.appendChild(el);
    scrollBottom();
  }

  function hideTyping() {
    var el = document.getElementById('cb-typing-indicator');
    if (el) el.remove();
  }

  function scrollBottom() {
    setTimeout(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  function sendMessage() {
    
    var text = inputEl.value.trim();
    if (!text || !botId) return;

    inputEl.value = '';
    addUserMessage(text);
    showTyping();
    sendEl.disabled = true;

    var body = JSON.stringify({
      message: text,
      visitorId: visitorId,
      sessionId: sessionId
    });
    fetch(chatApi + botId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      hideTyping();
      sendEl.disabled = false;
      if (res.conversationId || res.id) {
        conversationId = res.conversationId || res.id;
      }
      var reply = res.response || res.reply || res.message || res.text || '';
      if (reply) {
        addBotMessage(reply);
      }
      if (res.sessionId) {
        sessionId = res.sessionId;
      }
    })
    .catch(function () {
      hideTyping();
      sendEl.disabled = false;
      addBotMessage('Sorry, something went wrong. Please try again.');
    });
  }

  function handleInputKey(e) {
    if (e.key === 'Enter') sendMessage();
  }

  function buildWidget() {
    createStyles();

    btnEl = createElement('button', { id: 'cb-btn' });
    btnEl.innerHTML = getChatIcon();
    btnEl.addEventListener('click', togglePanel);

    var avatarEl = createElement('div', { id: 'cb-avatar' }, ['🤖']);
    var headerInfoEl = createElement('div', { id: 'cb-header-info' });
    headerInfoEl.appendChild(createElement('div', { id: 'cb-header-name' }, [botName]));
    headerInfoEl.appendChild(createElement('div', { id: 'cb-header-status' }, ['Online']));
    var closeEl = createElement('button', { id: 'cb-close' }, ['✕']);
    closeEl.addEventListener('click', togglePanel);

    var headerEl = createElement('div', { id: 'cb-header' });
    headerEl.appendChild(avatarEl);
    headerEl.appendChild(headerInfoEl);
    headerEl.appendChild(closeEl);

    messagesEl = createElement('div', { id: 'cb-messages' });

    inputEl = createElement('input', { id: 'cb-input', type: 'text', placeholder: 'Type your message...' });
    inputEl.addEventListener('keydown', handleInputKey);
    sendEl = createElement('button', { id: 'cb-send' });
    sendEl.innerHTML = getSendIcon();
    sendEl.addEventListener('click', sendMessage);

    var footerEl = createElement('div', { id: 'cb-footer' });
    footerEl.appendChild(inputEl);
    footerEl.appendChild(sendEl);

    panel = createElement('div', { id: 'cb-panel' });
    panel.appendChild(headerEl);
    panel.appendChild(messagesEl);
    panel.appendChild(footerEl);

    var wrapper = createElement('div', { id: 'cb-widget' });
    wrapper.appendChild(btnEl);
    wrapper.appendChild(panel);
    document.body.appendChild(wrapper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
