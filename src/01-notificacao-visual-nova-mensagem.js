/* =========================
   NOTIFICAÇÃO VISUAL - NOVA MENSAGEM
   alertas nativos de mensagens e coordenação entre abas
========================= */
(function(){
  const OWNER_KEY = 'klingo_message_alert_owner_v1';
  const DISMISS_KEY = 'klingo_message_alert_dismiss_v1';
  const ALERT_EVENT_KEY = 'klingo_message_alert_event_v1';
  const ALERT_HISTORY_KEY = 'klingo_message_alert_history_v1';
  const ALERT_DEDUP_TTL = 2000;
  const ALERT_ID_TTL = 300000;
  const OPEN_CHAT_PREFIX = 'klingo_chat_open_sender_v1:';
  const FOCUS_PREFIX = 'klingo_tab_focus_v1:';
  const FOCUS_TTL = 3000;
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
  let alertSequence = 0;
  let knownToastCounts = new Map();
  let pendingChatSender = '';
  let publishedSenderKey = '';
  let lastPresenceWrite = 0;
  let recentNativeSender = '';
  let recentNativeSenderAt = 0;
  const nativeNotificationAudio = new Map();
  let hookedChatVue = null;
  let nativeChatHooked = false;
  let openChatContent = null;
  let openChatSender = '';
  let knownChatRows = [];
  const knownToastElements = new WeakMap();
  const pendingDismissals = [];
  const closingToasts = new WeakSet();

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
        localStorage.setItem(OPEN_CHAT_PREFIX + tabId,
          JSON.stringify({ senderKey, account: alertAccountId(), at: now }));
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
        if (presence?.senderKey === senderKey && presence.account === alertAccountId() &&
            Number.isFinite(presence.at) &&
            Date.now() - presence.at >= 0 && Date.now() - presence.at < OPEN_CHAT_TTL) return true;
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  function alertAccountId() {
    for (let node = document.querySelector('nav.navbar'); node; node = node.parentElement) {
      const id = node.__vue__?.$store?.state?.user?.id_usuario;
      if (id) return String(id);
    }
    const initials = document.querySelector('nav.navbar [data-initials]')
      ?.getAttribute('data-initials')?.trim().toLocaleUpperCase('pt-BR');
    return initials ? `avatar:${initials}` : '';
  }

  function syncGlobalFocus() {
    try {
      const key = FOCUS_PREFIX + tabId;
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        localStorage.setItem(key, JSON.stringify({ at: Date.now() }));
      } else localStorage.removeItem(key);
    } catch (_) {}
  }

  function isAnyKlingoTabFocused() {
    let focusedTabs = 0;
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(FOCUS_PREFIX)) continue;
        const state = JSON.parse(localStorage.getItem(key) || 'null');
        if (Number.isFinite(state?.at) && Date.now() - state.at >= 0 &&
            Date.now() - state.at < FOCUS_TTL) focusedTabs++;
      }
    } catch (_) {}
    // Uma janela do Chrome só pode entregar foco real a uma aba por vez.
    // Múltiplos heartbeats simultâneos indicam estado emulado/inconsistente.
    return focusedTabs === 1;
  }

  function handleNativeChatPlay(event) {
    const audio = event.target;
    if (audio.id !== 'beepChatId' && audio.id !== 'beepPagId') return;
    audio.muted = true;
    audio.pause();
    try { audio.currentTime = 0; } catch (_) {}
  }

  function syncNativeChatAudio() {
    for (const id of ['beepChatId', 'beepPagId']) {
      const audio = document.getElementById(id);
      if (!audio) continue;
      const previous = nativeNotificationAudio.get(id);
      if (audio !== previous) {
        previous?.removeEventListener('play', handleNativeChatPlay);
        nativeNotificationAudio.set(id, audio);
        audio.addEventListener('play', handleNativeChatPlay);
      }
      audio.muted = true;
      if (!audio.paused) audio.pause();
    }
  }

  function syncNativeMessageHook() {
    let vue = null;
    for (let node = document.getElementById('modalChat'); node; node = node.parentElement) {
      if (typeof node.__vue__?.receberMensagem === 'function') {
        vue = node.__vue__;
        break;
      }
    }
    nativeChatHooked = !!vue;
    if (!vue || (hookedChatVue === vue && vue.receberMensagem.__tmAlertHook)) return;
    if (vue.receberMensagem.__tmAlertHook) {
      hookedChatVue = vue;
      return;
    }
    const original = vue.receberMensagem;
    const wrapped = function (message) {
      const result = original.apply(this, arguments);
      try {
        const id = message?.id_chat_sala_mensagem;
        const sender = normalizeSender(message?.from_name || message?.from);
        if (id !== null && id !== undefined && id !== '') {
          publishChatAlert({ sender, source: 'native', key: `id:${id}` });
        } else if (sender) {
          publishChatAlert({ sender, source: 'native',
            key: `fallback:${messageKey(`${sender}\u0000${message?.text || ''}`)}` });
        }
      } catch (error) {
        console.warn('[TM] Falha ao identificar mensagem recebida', error);
      }
      return result;
    };
    wrapped.__tmAlertHook = true;
    vue.receberMensagem = wrapped;
    hookedChatVue = vue;
  }

  function publishChatAlert(event) {
    if (event.source === 'toast' && isChatOpen(event.sender)) return;
    syncGlobalFocus();
    if (isAnyKlingoTabFocused()) return;
    const account = alertAccountId();
    if (!account || typeof navigator === 'undefined' || !navigator.locks?.request) return;
    const run = () => {
      if (!isOwner() || isAnyKlingoTabFocused()) return;
      const key = event.key || event.sender;
      const origin = event.source === 'relay' ? event.origin : tabId;
      const historyKey = `${ALERT_HISTORY_KEY}:${account}`;
      const history = new Map(GM_getValue(historyKey, []) || []);
      const previous = history.get(key);
      const ttl = String(key).startsWith('id:') ? ALERT_ID_TTL : ALERT_DEDUP_TTL;
      if (previous && (String(key).startsWith('id:') || previous.origin !== origin) &&
          Date.now() - previous.at < ttl) return;
      history.set(key, { origin, at: Date.now() });
      for (const [oldKey, state] of history) {
        const oldTtl = String(oldKey).startsWith('id:') ? ALERT_ID_TTL : ALERT_DEDUP_TTL;
        if (Date.now() - state.at > oldTtl) history.delete(oldKey);
      }
      GM_setValue(historyKey, Array.from(history));
      startBlink();
    };
    if (isOwner()) return navigator.locks.request(`klingo-chat-owner-v1:${account}`, run)
      .catch(() => {});
    const owner = readOwner();
    if (owner && Date.now() - owner.updatedAt < OWNER_TTL) {
      if (event.source !== 'relay') GM_setValue(ALERT_EVENT_KEY, {
        id: `${tabId}:${++alertSequence}`, account, key: event.key || event.sender,
        at: Date.now(), source: tabId
      });
      return;
    }
    return navigator.locks.request(`klingo-chat-owner-v1:${account}`, () => {
      claimOwner();
      if (isOwner()) run();
      else if (event.source !== 'relay') GM_setValue(ALERT_EVENT_KEY, {
        id: `${tabId}:${++alertSequence}`, account, key: event.key || event.sender,
        at: Date.now(), source: tabId
      });
    }).catch(() => {});
  }

  function detectChatRows(content, sender, rows) {
    if (content === openChatContent && sender === openChatSender) {
      let overlap = Math.min(knownChatRows.length, rows.length);
      while (overlap && !knownChatRows.slice(-overlap).every((oldRow, index) =>
        oldRow.key === rows[index].key)) overlap--;
      for (const row of rows.slice(overlap)) {
        if (row.incoming) publishChatAlert({ sender, source: 'chat', key: messageKey(row.key) });
      }
    }
    openChatContent = content;
    openChatSender = sender;
    knownChatRows = rows;
  }

  function scanOpenChatMessages() {
    const textarea = Array.from(document.querySelectorAll(
      '.modal.show .modal-footer.d-flex.flex-column textarea')).find((item) =>
      item.closest('.modal-footer')?.querySelector('.fa-paper-plane'));
    const content = textarea?.closest('.modal-content');
    const sender = content ? directChatSender() : '';
    if (!content || !sender) {
      detectChatRows(null, '', []);
      return;
    }
    const rows = Array.from(content.querySelectorAll('.modal-body li.list-group-item'))
      .map((item) => {
        const header = item.querySelector('.small')?.textContent || '';
        const body = item.lastElementChild?.textContent || '';
        return { item, incoming: item.classList.contains('list-group-item-secondary'),
          key: `${header} ${body}`.replace(/\s+/g, ' ').trim() };
      });
    detectChatRows(content, sender, rows);
  }

  function detectNewToasts(toasts, baseline = false) {
    const current = countMessageToasts(toasts);
    for (const toast of toasts) {
      const signature = normalizeToastText(toast);
      if (knownToastElements.get(toast) === signature) continue;
      knownToastElements.set(toast, signature);
    }
    if (!baseline) {
      const seen = new Map();
      for (const toast of toasts) {
        const signature = normalizeToastText(toast);
        const key = messageKey(signature);
        const occurrence = (seen.get(key) || 0) + 1;
        seen.set(key, occurrence);
        if (occurrence <= (knownToastCounts.get(key) || 0)) continue;
        const sender = toastSender(toast);
        if (sender) publishChatAlert({ sender, source: 'toast', key });
      }
    }
    knownToastCounts = current;
  }

  function dismissCoveredToasts(toasts) {
    for (const toast of toasts) {
      if (closingToasts.has(toast)) continue;
      if (!isChatOpen(toastSender(toast))) continue;
      const sender = toastSender(toast);
      toast.style.display = 'none';
      toast.dataset.tmCovered = '1';
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
    const account = alertAccountId();
    return account ? GM_getValue(`${OWNER_KEY}:${account}`, null) : null;
  }

  function isOwner() {
    const owner = readOwner();
    return owner?.id === tabId && Date.now() - owner.updatedAt < OWNER_TTL;
  }

  function claimOwner(force = false) {
    const account = alertAccountId();
    if (!account) return;
    const owner = readOwner();
    if (!force && owner && Date.now() - owner.updatedAt < OWNER_TTL) return;
    // Ao assumir uma guia já aberta, não reapresente mensagens antigas.
    if (owner?.id !== tabId) knownToastCounts = countMessageToasts();
    GM_setValue(`${OWNER_KEY}:${account}`, { id: tabId, updatedAt: Date.now() });
    tmRuntime.schedule(0);
  }

  function scheduleTakeover() {
    if (claimTimer !== null) return;
    claimTimer = window.setTimeout(() => {
      claimTimer = null;
      const account = alertAccountId();
      if (!account) return;
      if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        navigator.locks.request(`klingo-chat-owner-v1:${account}`, () => claimOwner())
          .catch(() => claimOwner());
      } else claimOwner();
    }, 150 + Math.random() * 350);
  }

  function maintainOwner() {
    const account = alertAccountId();
    if (!account) return;
    const owner = readOwner();
    if (owner?.id === tabId) {
      GM_setValue(`${OWNER_KEY}:${account}`, { id: tabId, updatedAt: Date.now() });
    } else {
      stopBlink();
      if (!owner || Date.now() - owner.updatedAt >= OWNER_TTL) scheduleTakeover();
    }
  }

  function startBlink() {
    if (blinking) return;
    blinking = true;
    blinkInterval = setInterval(() => {
      document.title = document.title === '💬 Nova mensagem'
        ? originalTitle
        : '💬 Nova mensagem';
    }, 1000);
  }

  function stopBlink() {
    if (!blinking) return;
    blinking = false;
    clearInterval(blinkInterval);
    blinkInterval = null;
    document.title = originalTitle;
  }

  function checkMessages() {
    try {
      if (!blinking) originalTitle = document.title;
      syncGlobalFocus();
      syncOpenChat();
      syncNativeMessageHook();
      if (nativeChatHooked) {
        openChatContent = null;
        openChatSender = '';
        knownChatRows = [];
      } else scanOpenChatMessages();
      syncNativeChatAudio();
      applyPendingDismissals();
      const toasts = messageToasts();
      detectNewToasts(toasts, nativeChatHooked);
      const currentCounts = countMessageToasts(toasts);
      dismissCoveredToasts(toasts);
      if (!isOwner() || isAnyKlingoTabFocused()) stopBlink();
      knownToastCounts = currentCounts;
    } catch (error) {
      console.error('[TM] Falha no alerta de mensagens', error);
    }
  }

  const notificationObserver = new MutationObserver((mutations) => {
    const changedChat = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      return !!target?.closest?.('.modal.show .modal-body li.list-group-item') ||
        Array.from(mutation.addedNodes || []).some((node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          (node.matches?.('.modal.show .modal-body li.list-group-item') ||
            node.querySelector?.('.modal.show .modal-body li.list-group-item')));
    });
    if (changedChat && !nativeChatHooked) scanOpenChatMessages();
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

  GM_addValueChangeListener(ALERT_EVENT_KEY, (_key, _oldValue, event, remote) => {
    if (!remote || !event || event.source === tabId ||
        event.account !== alertAccountId() || !Number.isFinite(event.at) ||
        Date.now() - event.at < 0 || Date.now() - event.at > 3000) return;
    publishChatAlert({ sender: '', source: 'relay', origin: event.source, key: event.key });
  });

  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(OPEN_CHAT_PREFIX)) checkMessages();
    if (event.key?.startsWith(FOCUS_PREFIX) && isAnyKlingoTabFocused()) stopBlink();
  });
  window.addEventListener('pagehide', () => {
    try { localStorage.removeItem(OPEN_CHAT_PREFIX + tabId); } catch (_) {}
    try { localStorage.removeItem(FOCUS_PREFIX + tabId); } catch (_) {}
    const account = alertAccountId();
    if (account && isOwner()) GM_setValue(`${OWNER_KEY}:${account}`, null);
  });
  window.setInterval(() => {
    syncGlobalFocus();
    syncOpenChat();
    checkMessages();
  }, 2000);

  window.addEventListener('focus', () => {
    syncGlobalFocus();
    stopBlink();
    claimOwner(true);
  });
  document.addEventListener('visibilitychange', () => {
    syncGlobalFocus();
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      stopBlink();
      claimOwner(true);
    }
  });
  window.setInterval(maintainOwner, 2000);
  window.addEventListener('blur', syncGlobalFocus);
  syncGlobalFocus();
  syncNativeChatAudio();
  syncNativeMessageHook();
  knownToastCounts = countMessageToasts();
  detectNewToasts(messageToasts(), true);
  if (!nativeChatHooked) scanOpenChatMessages();
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
