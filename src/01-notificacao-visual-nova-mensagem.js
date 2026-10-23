/* =========================
   NOTIFICAÇÃO VISUAL - NOVA MENSAGEM
   v25.16 - diagnóstico compartilhado de alerta no chat aberto
========================= */
(function(){
  const OWNER_KEY = 'klingo_message_alert_owner_v1';
  const DISMISS_KEY = 'klingo_message_alert_dismiss_v1';
  const OPEN_CHAT_PREFIX = 'klingo_chat_open_sender_v1:';
  const OWNER_TTL = 7000;
  const DISMISS_TTL = 30000;
  const OPEN_CHAT_TTL = 90000;
  const tabId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
  let originalTitle = document.title;
  let blinking = false;
  let blinkInterval = null;
  let claimTimer = null;
  let dismissalSequence = 0;
  let knownToastCounts = new Map();
  let pendingChatSender = '';
  let publishedSenderKey = '';
  let lastPresenceWrite = 0;
  let recentNativeSender = '';
  let recentNativeSenderAt = 0;
  let nativeChatAudio = null;
  let openChatAudio = null;
  let openChatContent = null;
  let openChatSender = '';
  let knownIncoming = new Map();
  let knownIncomingItems = [];
  let backgroundChatAlert = false;
  const pendingDismissals = [];
  const closingToasts = new WeakSet();

  // Diagnóstico temporário apenas na edição de testes: não registra remetente nem mensagem.
  if (typeof GM_info !== 'undefined' && GM_info.script?.name === 'klingo (testes)') {
    for (const type of ['play', 'playing', 'pause', 'ended', 'volumechange']) {
      document.addEventListener(type, (event) => {
        const audio = event.target;
        if (!(audio instanceof HTMLMediaElement)) return;
        console.info('[TM-AUDIO]', JSON.stringify({
          type,
          id: audio.id || '',
          src: audio.currentSrc?.split('/').at(-1) || audio.getAttribute('src')?.split('/').at(-1) || '',
          muted: audio.muted,
          paused: audio.paused,
          presence: hasOpenChatPresence(),
          recentSenderOpen: Date.now() - recentNativeSenderAt < 1000 && isChatOpen(recentNativeSender)
        }));
      }, true);
    }
  }

  function chatDiagnostic(event, state = {}) {
    if (typeof GM_info === 'undefined' || GM_info.script?.name !== 'klingo (testes)') return;
    const entry = {
      at: Date.now(), event,
      visibility: state.visibility,
      focused: state.focused,
      background: state.background,
      error: state.error
    };
    console.info('[TM-CHAT-DIAG]', JSON.stringify(entry));
    try {
      const key = 'tm_chat_diag_v1';
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      history.push(entry);
      localStorage.setItem(key, JSON.stringify(history.slice(-50)));
    } catch (_) {
      // O registro de diagnóstico não deve afetar as notificações.
    }
  }

  function normalizeToastText(toast) {
    const message = Array.from(toast.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ').trim();
    return message || toast.textContent.replace(/\s*(Fechar|Chat)\s*$/gi, '').replace(/\s+/g, ' ').trim();
  }

  function messageKey(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return `${text.length}:${(hash >>> 0).toString(16)}`;
  }

  function toastSender(toast) {
    return normalizeSender(normalizeToastText(toast).match(/^De:\s*(.*?)\s*>>/i)?.[1]);
  }

  function normalizeSender(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
  }

  function directChatSender() {
    const textarea = Array.from(document.querySelectorAll(
      '.modal.show .modal-footer.d-flex.flex-column textarea')).find((item) =>
      item.closest('.modal-footer')?.querySelector('.fa-paper-plane'));
    const content = textarea?.closest('.modal-content');
    if (!content) return '';
    const header = normalizeSender(content.querySelector('.modal-header .modal-title')?.textContent ||
      content.querySelector('.modal-header')?.textContent)
      .replace(/^CHAT\s*(?:COM|:|[-–])\s*/i, '');
    if (pendingChatSender &&
        (header === pendingChatSender || header.includes(pendingChatSender))) return pendingChatSender;
    return header && header !== 'CHAT' ? header : '';
  }

  function isChatTabBackground() {
    const root = document.documentElement;
    const foreground = root?.getAttribute('data-tm-chrome-foreground');
    const updatedAt = Number(root?.getAttribute('data-tm-chrome-focus-at'));
    if ((foreground === 'true' || foreground === 'false') && updatedAt > 0 &&
        Date.now() - updatedAt >= 0 && Date.now() - updatedAt < 6000) {
      return foreground === 'false';
    }
    return document.visibilityState !== 'visible' || !document.hasFocus();
  }

  function scanOpenChatMessages() {
    const textarea = Array.from(document.querySelectorAll(
      '.modal.show .modal-footer.d-flex.flex-column textarea')).find((item) =>
      item.closest('.modal-footer')?.querySelector('.fa-paper-plane'));
    const content = textarea?.closest('.modal-content');
    const sender = directChatSender();
    if (!content || !sender) {
      openChatContent = null;
      openChatSender = '';
      knownIncoming = new Map();
      knownIncomingItems = [];
      if (backgroundChatAlert) {
        backgroundChatAlert = false;
        stopBlink();
      }
      return;
    }
    const current = new Map();
    const incomingItems = [];
    content.querySelectorAll('.modal-body li.list-group-item').forEach((item) => {
      if (!item.classList.contains('list-group-item-secondary')) return;
      incomingItems.push(item);
      const header = item.querySelector?.('.small')?.textContent
        .replace(/\bNova\b/gi, '') || '';
      const body = item.lastElementChild?.textContent || '';
      const key = (header || body ? `${header} ${body}` : item.textContent)
        .replace(/\s+/g, ' ').trim();
      current.set(key, (current.get(key) || 0) + 1);
    });
    if (content === openChatContent && sender === openChatSender) {
      const newText = Array.from(current).some(([key, count]) =>
        count > (knownIncoming.get(key) || 0));
      const shiftedFullList = !newText && incomingItems.length === 50 &&
        knownIncomingItems.length === 50 &&
        incomingItems[0] === knownIncomingItems[1] &&
        incomingItems.at(-1) !== knownIncomingItems.at(-1);
      const arrived = newText || shiftedFullList;
      if (arrived) {
        const focused = document.hasFocus();
        const background = isChatTabBackground();
        chatDiagnostic('arrival', { visibility: document.visibilityState, focused, background });
        if (background) notifyOpenChat();
      }
    }
    openChatContent = content;
    openChatSender = sender;
    knownIncoming = current;
    knownIncomingItems = incomingItems;
  }

  function notifyOpenChat() {
    backgroundChatAlert = true;
    startBlink();
    if (!openChatAudio) openChatAudio = new Audio('/notific.mp3');
    try { openChatAudio.currentTime = 0; } catch (_) {}
    chatDiagnostic('audio-attempt');
    openChatAudio.play().then(() => chatDiagnostic('audio-played'))
      .catch((error) => chatDiagnostic('audio-rejected', { error: error?.name || 'unknown' }));
  }

  function syncOpenChat() {
    const sender = directChatSender();
    const senderKey = sender ? messageKey(sender) : '';
    const now = Date.now();
    try {
      if (!senderKey) {
        if (publishedSenderKey) localStorage.removeItem(OPEN_CHAT_PREFIX + tabId);
        publishedSenderKey = '';
        return;
      }
      if (senderKey !== publishedSenderKey || now - lastPresenceWrite >= 5000) {
        localStorage.setItem(OPEN_CHAT_PREFIX + tabId, JSON.stringify({ senderKey, at: now }));
        publishedSenderKey = senderKey;
        lastPresenceWrite = now;
      }
    } catch (_) {
      // Sem armazenamento compartilhado, mantenha os avisos em vez de ocultá-los às cegas.
      publishedSenderKey = '';
    }
  }

  function isChatOpen(sender) {
    if (!sender) return false;
    const senderKey = messageKey(sender);
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(OPEN_CHAT_PREFIX)) continue;
        const presence = JSON.parse(localStorage.getItem(key) || 'null');
        if (presence?.senderKey === senderKey && Number.isFinite(presence.at) &&
            Date.now() - presence.at >= 0 && Date.now() - presence.at < OPEN_CHAT_TTL) return true;
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  function hasOpenChatPresence() {
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(OPEN_CHAT_PREFIX)) continue;
        const presence = JSON.parse(localStorage.getItem(key) || 'null');
        if (presence?.senderKey && Number.isFinite(presence.at) &&
            Date.now() - presence.at >= 0 && Date.now() - presence.at < OPEN_CHAT_TTL) return true;
      }
    } catch (_) {}
    return false;
  }

  function handleNativeChatPlay(event) {
    const audio = event.target;
    if (audio.id !== 'beepChatId') return;
    audio.muted = true;
    // O Klingo pode iniciar o som antes de inserir o toast no DOM.
    window.setTimeout(() => {
      const latestToast = messageToasts().at(-1);
      const currentSender = latestToast ? toastSender(latestToast) : '';
      const sender = Date.now() - recentNativeSenderAt < 1000
        ? recentNativeSender : currentSender;
      if (sender && isChatOpen(sender)) {
        audio.pause();
        try { audio.currentTime = 0; } catch (_) {}
        return;
      }
      // Sem remetente identificável, preserve o aviso nativo (falha aberta).
      try { audio.currentTime = 0; } catch (_) {}
      audio.muted = false;
    }, 80);
  }

  function syncNativeChatAudio() {
    const audio = document.getElementById('beepChatId');
    if (!audio) return;
    if (audio !== nativeChatAudio) {
      nativeChatAudio?.removeEventListener('play', handleNativeChatPlay);
      nativeChatAudio = audio;
      audio.addEventListener('play', handleNativeChatPlay);
      const prepareNextSound = () => { audio.muted = true; };
      audio.addEventListener('pause', prepareNextSound);
      audio.addEventListener('ended', prepareNextSound);
    }
    if (audio.paused) audio.muted = true;
  }

  function dismissCoveredToasts(toasts) {
    for (const toast of toasts) {
      if (closingToasts.has(toast)) continue;
      if (!isChatOpen(toastSender(toast))) continue;
      const sender = toastSender(toast);
      toast.style.display = 'none';
      toast.dataset.tmCovered = '1';
      if (nativeChatAudio && !nativeChatAudio.paused) {
        nativeChatAudio.muted = true;
        nativeChatAudio.pause();
        try { nativeChatAudio.currentTime = 0; } catch (_) {}
      }
      closingToasts.add(toast);
      document.dispatchEvent(new CustomEvent('tm-chat-covered-message', { detail: { sender } }));
      findToastAction(toast, 'FECHAR')?.click();
      window.setTimeout(() => { if (toast.isConnected) toast.remove(); }, 300);
    }
  }

  function findToastAction(toast, label) {
    return Array.from(toast.querySelectorAll('*')).find((element) =>
      element.textContent.trim().toLocaleUpperCase('pt-BR') === label &&
      !Array.from(element.children).some((child) =>
        child.textContent.trim().toLocaleUpperCase('pt-BR') === label));
  }

  function isRecentDismissal(dismissal) {
    return dismissal && Number.isFinite(dismissal.at) &&
      Date.now() - dismissal.at >= 0 && Date.now() - dismissal.at < DISMISS_TTL;
  }

  function applyDismissal(dismissal) {
    if (!isRecentDismissal(dismissal)) return false;
    const matches = Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((toast) => !closingToasts.has(toast) && (dismissal.action === 'CHAT' && dismissal.sender
        ? toastSender(toast) === dismissal.sender
        : messageKey(normalizeToastText(toast)) === dismissal.toastKey));
    const targets = dismissal.action === 'CHAT' && dismissal.sender
      ? matches : [matches[dismissal.ordinal] || matches[0]].filter(Boolean);
    if (!targets.length) return false;
    targets.forEach((toast) => {
      closingToasts.add(toast);
      const close = findToastAction(toast, 'FECHAR');
      close?.click();
      window.setTimeout(() => {
        if (toast.isConnected) toast.remove();
      }, 300);
    });
    return true;
  }

  function messageToasts() {
    return Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((toast) => !closingToasts.has(toast) && /De:/i.test(normalizeToastText(toast)));
  }

  function countMessageToasts(toasts = messageToasts()) {
    const counts = new Map();
    toasts.forEach((toast) => {
      const key = messageKey(normalizeToastText(toast));
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function applyPendingDismissals() {
    for (let index = pendingDismissals.length - 1; index >= 0; index--) {
      if (!isRecentDismissal(pendingDismissals[index]) || applyDismissal(pendingDismissals[index])) {
        pendingDismissals.splice(index, 1);
      }
    }
  }

  function readOwner() {
    return GM_getValue(OWNER_KEY, null);
  }

  function isOwner() {
    const owner = readOwner();
    return owner?.id === tabId && Date.now() - owner.updatedAt < OWNER_TTL;
  }

  function claimOwner(force = false) {
    const owner = readOwner();
    if (!force && owner && Date.now() - owner.updatedAt < OWNER_TTL) return;
    // Ao assumir uma guia já aberta, não reapresente mensagens antigas.
    if (owner?.id !== tabId) knownToastCounts = countMessageToasts();
    GM_setValue(OWNER_KEY, { id: tabId, updatedAt: Date.now() });
    tmRuntime.schedule(0);
  }

  function scheduleTakeover() {
    if (claimTimer !== null || document.visibilityState !== 'visible') return;
    claimTimer = window.setTimeout(() => {
      claimTimer = null;
      claimOwner();
    }, 150 + Math.random() * 350);
  }

  function maintainOwner() {
    const owner = readOwner();
    if (owner?.id === tabId) {
      GM_setValue(OWNER_KEY, { id: tabId, updatedAt: Date.now() });
    } else {
      if (!backgroundChatAlert) stopBlink();
      if (!owner || Date.now() - owner.updatedAt >= OWNER_TTL) scheduleTakeover();
    }
  }

  function startBlink() {
    if (blinking) return;
    blinking = true;
    chatDiagnostic('blink-start');

    blinkInterval = setInterval(() => {
      document.title = document.title === '💬 Nova mensagem'
        ? originalTitle
        : '💬 Nova mensagem';
    }, 1000);
  }

  function stopBlink() {
    if (!blinking) return;
    blinking = false;
    chatDiagnostic('blink-stop');

    clearInterval(blinkInterval);
    blinkInterval = null;
    document.title = originalTitle;
  }

  function checkMessages() {
    try {
      if (backgroundChatAlert && !isChatTabBackground()) {
        backgroundChatAlert = false;
        stopBlink();
      }
      if (!blinking) originalTitle = document.title;
      syncOpenChat();
      scanOpenChatMessages();
      syncNativeChatAudio();
      applyPendingDismissals();
      const toasts = messageToasts();
      const currentCounts = countMessageToasts(toasts);
      const newestToast = toasts.find((toast) => {
        const key = messageKey(normalizeToastText(toast));
        return currentCounts.get(key) > (knownToastCounts.get(key) || 0);
      });
      if (newestToast) {
        recentNativeSender = toastSender(newestToast);
        recentNativeSenderAt = Date.now();
      }
      dismissCoveredToasts(toasts);
      const activeToasts = toasts.filter((toast) => !closingToasts.has(toast) &&
        !isChatOpen(toastSender(toast)));
      const activeCounts = countMessageToasts(activeToasts);
      if (!isOwner()) {
        if (!backgroundChatAlert) stopBlink();
      } else {
        activeCounts.forEach((count, key) => {
          const newMessages = Math.max(0, count - (knownToastCounts.get(key) || 0));
          if (newMessages) startBlink();
        });
        if (!activeCounts.size && !backgroundChatAlert) {
          stopBlink();
        }
      }
      knownToastCounts = currentCounts;
    } catch (error) {
      console.error('[TM] Falha no alerta de mensagens', error);
    }
  }

  // O monitor geral da página pode atrasar durante atualizações grandes. Observe os
  // avisos diretamente para registrar cada chegada antes de uma nova renderização.
  const focusObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === 'data-tm-chrome-foreground') &&
        backgroundChatAlert && !isChatTabBackground()) {
      backgroundChatAlert = false;
      stopBlink();
    }
  });
  focusObserver.observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-tm-chrome-foreground']
  });

  const notificationObserver = new MutationObserver((mutations) => {
    const changedOpenChat = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      return !!target?.closest?.('.modal.show .modal-body li.list-group-item') ||
        Array.from(mutation.addedNodes || []).some((node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          (node.matches?.('.modal.show .modal-body li.list-group-item') ||
            node.querySelector?.('.modal.show .modal-body li.list-group-item')));
    });
    if (changedOpenChat) scanOpenChatMessages();
    const changedToast = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('.toasted.toastnafrente')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('.toasted.toastnafrente') || node.querySelector?.('.toasted.toastnafrente')));
    });
    if (changedToast) checkMessages();
  });
  notificationObserver.observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });

  document.addEventListener('click', (event) => {
    // Cliques sintéticos feitos nas outras guias não devem ser retransmitidos.
    if (!event.isTrusted) return;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const unreadRow = target?.closest('#modalChat button.list-group-item.list-group-item-action');
    const toastAction = target?.closest('.toasted.toastnafrente a.action');
    const openingSender = unreadRow ? normalizeSender(unreadRow.textContent.replace(
      unreadRow.querySelector('.badge-secondary')?.textContent || '', '')) :
      normalizeSender(toastAction?.textContent) === 'CHAT'
        ? toastSender(toastAction.closest('.toasted.toastnafrente')) : '';
    if (openingSender) {
      pendingChatSender = openingSender;
      for (const delay of [0, 100, 300]) window.setTimeout(() => {
        syncOpenChat();
        checkMessages();
      }, delay);
    }
    const unreadBadge = unreadRow?.querySelector('.badge-secondary');
    if (unreadBadge && Number(unreadBadge.textContent.trim()) > 0) {
      const sender = unreadRow.textContent.replace(unreadBadge.textContent, '')
        .replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
      if (sender) {
        // Aguarde o clique nativo abrir a conversa antes de fechar os avisos.
        window.setTimeout(() => {
          const dismissal = {
            id: `${tabId}:${++dismissalSequence}`,
            action: 'CHAT',
            sender,
            at: Date.now(),
            source: tabId
          };
          applyDismissal(dismissal);
          GM_setValue(DISMISS_KEY, dismissal);
        }, 0);
      }
      return;
    }
    const toast = target?.closest('.toasted.toastnafrente');
    if (!toast) return;

    const action = target.closest('a.action');
    const label = action?.textContent.trim().toLocaleUpperCase('pt-BR');
    if (!action || !toast.contains(action) || (label !== 'FECHAR' && label !== 'CHAT')) return;

    const toastKey = messageKey(normalizeToastText(toast));
    const ordinal = Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((item) => !closingToasts.has(item) &&
        messageKey(normalizeToastText(item)) === toastKey)
      .indexOf(toast);
    const dismissal = {
      id: `${tabId}:${++dismissalSequence}`,
      action: label,
      sender: label === 'CHAT' ? toastSender(toast) : '',
      toastKey,
      ordinal: Math.max(0, ordinal),
      at: Date.now(),
      source: tabId
    };
    closingToasts.add(toast);
    if (label === 'CHAT') applyDismissal(dismissal);
    GM_setValue(DISMISS_KEY, dismissal);
    window.setTimeout(() => {
      if (toast.isConnected) toast.remove();
      tmRuntime.schedule(0);
    }, 300);
  }, true);

  GM_addValueChangeListener(DISMISS_KEY, (_key, _oldValue, dismissal, remote) => {
    if (!remote || dismissal?.source === tabId || !isRecentDismissal(dismissal)) return;
    if (dismissal.action === 'CHAT') {
      applyDismissal(dismissal);
      return;
    }
    pendingDismissals.push(dismissal);
    applyPendingDismissals();
    tmRuntime.schedule(0);
  });

  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(OPEN_CHAT_PREFIX)) checkMessages();
  });
  window.addEventListener('pagehide', () => {
    try { localStorage.removeItem(OPEN_CHAT_PREFIX + tabId); } catch (_) {}
  });
  window.setInterval(() => {
    syncOpenChat();
    checkMessages();
  }, 2000);

  window.addEventListener('focus', () => {
    backgroundChatAlert = false;
    stopBlink();
    claimOwner(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      backgroundChatAlert = false;
      stopBlink();
      claimOwner(true);
    }
  });
  window.setInterval(maintainOwner, 2000);
  knownToastCounts = countMessageToasts();
  if (document.hasFocus()) claimOwner(true);
  else scheduleTakeover();

  tmRuntime.register('alerta de mensagens', checkMessages);
})();

/* Sincroniza entre guias somente a quantidade que o chat nativo marcou como lida. */
(function () {
  'use strict';

  const READ_KEY = 'klingo_chat_read_event_v1';
  const READ_TTL = 30000;
  const tabId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let sequence = 0;
  let nativeCount = null;
  let pendingDiscount = 0;
  let pendingLocalRead = null;
  let watchNewMessagesUntil = 0;
  let knownToastCounts = new Map();
  const newMessagesBySender = new Map();
  const recentEvents = new Map();
  const recentLocalReads = new Map();
  const recentNativeDrops = [];
  const hiddenBadges = new WeakMap();

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
  }

  function badgeNumber(badge) {
    const match = badge?.textContent.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function nativeBadge() {
    return document.querySelector('#botao-chat .badge-warning:not([data-tm-unread-mirror])');
  }

  function unreadRow(sender) {
    if (!sender) return null;
    return Array.from(document.querySelectorAll('#modalChat button.list-group-item.list-group-item-action'))
      .find((row) => {
        const badge = row.querySelector('.badge-secondary');
        return badge && normalize(row.textContent.replace(badge.textContent, '')) === sender;
      }) || null;
  }

  function toastMessages() {
    const counts = new Map();
    document.querySelectorAll('.toasted.toastnafrente').forEach((toast) => {
      if (toast.dataset.tmCovered === '1') return;
      const directText = Array.from(toast.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent).join(' ');
      const text = (directText || toast.textContent.replace(/\s*(Fechar|Chat)\s*$/gi, ''))
        .replace(/\s+/g, ' ').trim();
      const sender = normalize(text.match(/De:\s*(.*?)\s*>>/i)?.[1]);
      if (!sender) return;
      const key = `${sender}\u0000${text}`;
      const item = counts.get(key) || { count: 0, sender };
      item.count++;
      counts.set(key, item);
    });
    return counts;
  }

  function newMessageCount() {
    return Array.from(newMessagesBySender.values()).reduce((sum, count) => sum + count, 0);
  }

  function subtractNewMessages(sender, amount) {
    if (!sender || !amount) return;
    const remaining = Math.max(0, (newMessagesBySender.get(sender) || 0) - amount);
    if (remaining) newMessagesBySender.set(sender, remaining);
    else newMessagesBySender.delete(sender);
  }

  function trackNewMessages() {
    const current = toastMessages();
    if (pendingDiscount > 0 || Date.now() < watchNewMessagesUntil) {
      current.forEach((item, key) => {
        const added = item.count - (knownToastCounts.get(key)?.count || 0);
        if (added > 0) {
          newMessagesBySender.set(item.sender,
            (newMessagesBySender.get(item.sender) || 0) + added);
        }
      });
    }
    knownToastCounts = current;
  }

  function restoreBadge(badge) {
    if (!badge || !hiddenBadges.has(badge)) return;
    const original = hiddenBadges.get(badge);
    if (original.value) badge.style.setProperty('display', original.value, original.priority);
    else badge.style.removeProperty('display');
    hiddenBadges.delete(badge);
  }

  function renderCount() {
    const button = document.querySelector('#botao-chat');
    if (!button) return;
    const badge = nativeBadge();
    let mirror = button.querySelector('[data-tm-unread-mirror="1"]');
    const freshCount = newMessageCount();
    if (pendingDiscount === 0 && nativeCount >= freshCount) {
      newMessagesBySender.clear();
      mirror?.remove();
      restoreBadge(badge);
      return;
    }

    const displayed = Math.max(0, nativeCount - pendingDiscount, freshCount);
    if (displayed > 0) {
      if (!mirror) {
        mirror = badge?.cloneNode(true) || document.createElement('span');
        if (!badge) {
          mirror.className = 'badge badge-warning';
          mirror.innerHTML = '<i class="fas fa-comment-dots mr-1"></i>';
        }
        mirror.dataset.tmUnreadMirror = '1';
        mirror.style.removeProperty('display');
        if (badge) badge.insertAdjacentElement('afterend', mirror);
        else button.append(mirror);
      }
      if (mirror.dataset.tmUnreadCount !== String(displayed)) {
        const icon = (badge || mirror).querySelector('i')?.cloneNode(true);
        mirror.replaceChildren(...(icon ? [icon] : []), document.createTextNode(` ${displayed}`));
        mirror.dataset.tmUnreadCount = String(displayed);
      }
    } else {
      mirror?.remove();
    }

    if (badge && !hiddenBadges.has(badge)) {
      hiddenBadges.set(badge, {
        value: badge.style.getPropertyValue('display'),
        priority: badge.style.getPropertyPriority('display')
      });
      badge.style.setProperty('display', 'none', 'important');
    }
  }

  function pruneEvents() {
    const now = Date.now();
    recentEvents.forEach((at, id) => {
      if (now - at > READ_TTL) recentEvents.delete(id);
    });
    recentLocalReads.forEach((read, sender) => {
      if (now - read.at > 3000) recentLocalReads.delete(sender);
    });
    for (let index = recentNativeDrops.length - 1; index >= 0; index--) {
      if (now - recentNativeDrops[index].at > 3000) recentNativeDrops.splice(index, 1);
    }
  }

  function consumeNativeDrop(amount, eventAt) {
    for (const drop of recentNativeDrops) {
      if (!amount) break;
      if (Math.abs(drop.at - eventAt) > 3000) continue;
      const consumed = Math.min(amount, drop.remaining);
      drop.remaining -= consumed;
      amount -= consumed;
    }
    return amount;
  }

  function broadcastRead(delta, before, after, sender) {
    if (delta <= 0) return;
    const event = {
      id: `${tabId}:${++sequence}`,
      source: tabId,
      sender,
      delta,
      before,
      after,
      at: Date.now()
    };
    recentEvents.set(event.id, event.at);
    if (sender) {
      const previous = recentLocalReads.get(sender);
      recentLocalReads.set(sender, {
        delta: delta + (previous && event.at - previous.at < 3000 ? previous.delta : 0),
        at: event.at
      });
    }
    GM_setValue(READ_KEY, event);
  }

  function updateCount() {
    const current = badgeNumber(nativeBadge());
    if (nativeCount === null) {
      nativeCount = current;
      renderCount();
      return;
    }

    if (current < nativeCount) {
      let decrease = nativeCount - current;
      if (pendingLocalRead && Date.now() < pendingLocalRead.expiresAt) {
        const localDecrease = Math.min(decrease, pendingLocalRead.remaining);
        if (localDecrease > 0) {
          broadcastRead(localDecrease, nativeCount, current, pendingLocalRead.sender);
          subtractNewMessages(pendingLocalRead.sender, localDecrease);
          pendingLocalRead.remaining -= localDecrease;
          decrease -= localDecrease;
          if (pendingLocalRead.remaining === 0) pendingLocalRead = null;
        }
      }
      // O próprio Klingo pode atualizar a outra guia depois; nesse caso, retire
      // o desconto correspondente para não subtrair as mensagens duas vezes.
      const reconciled = Math.min(pendingDiscount, decrease);
      pendingDiscount -= reconciled;
      if (decrease > reconciled) {
        recentNativeDrops.push({ remaining: decrease - reconciled, at: Date.now() });
      }
    }
    nativeCount = current;
    renderCount();
  }

  function recordCoveredMessage(event) {
    const sender = normalize(event.detail?.sender);
    if (!sender) return;
    pendingDiscount += 1;
    subtractNewMessages(sender, 1);
    updateCount();
  }

  document.addEventListener('tm-chat-covered-message', recordCoveredMessage);

  document.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    const target = event.target?.nodeType === Node.ELEMENT_NODE
      ? event.target : event.target?.parentElement;
    if (!target) return;

    let sender = '';
    let expected = Infinity;
    const row = target.closest('#modalChat button.list-group-item.list-group-item-action');
    if (row) {
      const badge = row.querySelector('.badge-secondary');
      expected = badgeNumber(badge);
      sender = normalize(row.textContent.replace(badge?.textContent || '', ''));
      if (!expected) return;
    } else {
      const toast = target.closest('.toasted.toastnafrente');
      const action = target.closest('a.action');
      if (!toast || !action || !toast.contains(action) || normalize(action.textContent) !== 'CHAT') return;
      sender = normalize(toast.textContent.match(/De:\s*(.*?)\s*>>/i)?.[1]);
      const matchingRow = unreadRow(sender);
      if (matchingRow) expected = badgeNumber(matchingRow.querySelector('.badge-secondary'));
    }

    updateCount();
    if (!nativeCount) return;
    pendingLocalRead = { sender, remaining: expected, expiresAt: Date.now() + 8000 };
    window.setTimeout(updateCount, 50);
    window.setTimeout(updateCount, 300);
    window.setTimeout(updateCount, 1200);
  }, true);

  GM_addValueChangeListener(READ_KEY, (_key, _oldValue, event, remote) => {
    if (!remote || !event || event.source === tabId ||
        !Number.isFinite(event.at) || Date.now() - event.at < 0 ||
        Date.now() - event.at > READ_TTL || !Number.isFinite(event.delta) || event.delta <= 0) return;
    pruneEvents();
    if (recentEvents.has(event.id)) return;
    recentEvents.set(event.id, event.at);
    updateCount();

    const ownRead = recentLocalReads.get(event.sender);
    if (ownRead && ownRead.delta >= event.delta && Math.abs(ownRead.at - event.at) < 3000) return;

    let decrease = consumeNativeDrop(event.delta, event.at);
    const row = unreadRow(event.sender);
    if (row) decrease = Math.min(decrease, badgeNumber(row.querySelector('.badge-secondary')));
    pendingDiscount = Math.min(nativeCount, pendingDiscount + decrease);
    subtractNewMessages(event.sender, event.delta);
    watchNewMessagesUntil = Date.now() + 120000;
    knownToastCounts = toastMessages();
    if (pendingLocalRead?.sender && pendingLocalRead.sender === event.sender) pendingLocalRead = null;
    renderCount();
  });

  const observer = new MutationObserver((mutations) => {
    const changedToasts = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('.toasted.toastnafrente')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('.toasted.toastnafrente') || node.querySelector?.('.toasted.toastnafrente')));
    });
    const changedChatButton = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('#botao-chat')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('#botao-chat') || node.querySelector?.('#botao-chat')));
    });
    if (changedToasts) trackNewMessages();
    if (changedChatButton) updateCount();
    else if (changedToasts) renderCount();
  });
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });
  knownToastCounts = toastMessages();
  tmRuntime.register('contador de chat entre guias', updateCount);
})();



})();
