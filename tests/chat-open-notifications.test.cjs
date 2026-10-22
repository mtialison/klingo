const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src',
  '01-notificacao-visual-nova-mensagem.js'), 'utf8');

function functions(first, last, context) {
  const start = source.indexOf(`  function ${first}(`);
  const end = source.indexOf(`  function ${last}(`, start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
}

function storage() {
  const values = new Map();
  return { values, setItem: (key, value) => values.set(key, value),
    getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key),
    get length() { return values.size; }, key: index => [...values.keys()][index] };
}

test('conversa aberta em outra aba suprime só o remetente correspondente e expira', () => {
  const localStorage = storage();
  let now = 100000;
  const context = vm.createContext({ localStorage, Date: { now: () => now },
    OPEN_CHAT_PREFIX: 'klingo_chat_open_sender_v1:', OPEN_CHAT_TTL: 90000,
    tabId: 'aba-a', publishedSenderKey: '', lastPresenceWrite: 0,
    pendingChatSender: 'ANA', document: { querySelectorAll: () => [{
      closest: selector => selector === '.modal-footer' ? { querySelector: () => ({}) } :
        selector === '.modal-content' ? { querySelector: inner =>
          inner === '.modal-header .modal-title' ? { textContent: 'Ana' } : null } : null
    }] } });
  functions('messageKey', 'findToastAction', context);
  assert.equal(vm.runInContext('directChatSender()', context), 'ANA');
  vm.runInContext('syncOpenChat()', context);
  assert.equal(vm.runInContext('isChatOpen("ANA")', context), true);
  assert.equal(vm.runInContext('isChatOpen("BRUNO")', context), false);
  assert.equal(localStorage.values.size, 1);

  now += 90001;
  assert.equal(vm.runInContext('isChatOpen("ANA")', context), false);
  vm.runInContext('syncOpenChat()', context);
  assert.equal(vm.runInContext('isChatOpen("ANA")', context), true);
  context.document.querySelectorAll = () => [];
  vm.runInContext('syncOpenChat()', context);
  assert.equal(localStorage.values.size, 0);
});

test('aviso da conversa aberta é fechado; outro remetente permanece', () => {
  const closed = [];
  const context = vm.createContext({
    isChatOpen: sender => sender === 'ANA', toastSender: toast => toast.sender,
    closingToasts: new WeakSet(), nativeChatAudio: null,
    findToastAction: toast => ({ click: () => closed.push(toast.sender) }),
    CustomEvent: function (type, options) { return { type, detail: options.detail }; },
    document: { dispatchEvent() {} },
    window: { setTimeout() {} }
  });
  functions('dismissCoveredToasts', 'findToastAction', context);
  const ana = { sender: 'ANA', style: {}, dataset: {} };
  const bruno = { sender: 'BRUNO', style: {}, dataset: {} };
  vm.runInContext('dismissCoveredToasts(toasts)', Object.assign(context, { toasts: [ana, bruno] }));
  assert.deepEqual(closed, ['ANA']);
  assert.equal(context.closingToasts.has(ana), true);
  assert.equal(context.closingToasts.has(bruno), false);
});

test('aviso coberto desaparece antes da animação e sinaliza uma única mensagem', () => {
  const events = [];
  const toast = { sender: 'ANA', isConnected: true, style: { display: '' }, dataset: {} };
  const context = vm.createContext({
    isChatOpen: sender => sender === 'ANA', toastSender: item => item.sender,
    closingToasts: new WeakSet(), nativeChatAudio: null,
    findToastAction: () => ({ click() {} }),
    CustomEvent: function (type, options) { return { type, detail: options.detail }; },
    document: { dispatchEvent: event => events.push(event) },
    window: { setTimeout() {} }
  });
  functions('dismissCoveredToasts', 'findToastAction', context);
  vm.runInContext('dismissCoveredToasts([toast]); dismissCoveredToasts([toast])',
    Object.assign(context, { toast }));
  assert.equal(toast.style.display, 'none');
  assert.equal(toast.dataset.tmCovered, '1');
  assert.deepEqual(events.map(event => [event.type, event.detail.sender]),
    [['tm-chat-covered-message', 'ANA']]);
});

test('aviso coberto interrompe áudio já tocando sem novo evento play', () => {
  const audio = { muted: false, paused: false, stops: 0,
    pause() { this.paused = true; this.stops++; } };
  const context = vm.createContext({
    isChatOpen: sender => sender === 'ANA', toastSender: toast => toast.sender,
    closingToasts: new WeakSet(), nativeChatAudio: audio,
    findToastAction: () => ({ click() {} }),
    CustomEvent: function (type, options) { return { type, detail: options.detail }; },
    document: { dispatchEvent() {} },
    window: { setTimeout() {} }
  });
  functions('dismissCoveredToasts', 'findToastAction', context);
  vm.runInContext('dismissCoveredToasts([{ sender: "ANA", isConnected: false, style: {}, dataset: {} }])', context);
  assert.equal(audio.muted, true);
  assert.equal(audio.stops, 1);
});

test('toast coberto não pisca; outro remetente continua com aviso visual, sem som próprio', () => {
  const seen = [];
  const toasts = [{ sender: 'ANA', key: '1' }, { sender: 'BRUNO', key: '2' }];
  const closingToasts = new WeakSet();
  const context = vm.createContext({ blinking: false, originalTitle: 'klingo',
    document: { title: 'klingo' }, knownToastCounts: new Map(), closingToasts,
    syncOpenChat() {}, applyPendingDismissals() {}, messageToasts: () => toasts,
    syncNativeChatAudio() {},
    countMessageToasts: items => new Map(items.map(item => [item.key, 1])),
    dismissCoveredToasts: items => items.forEach(item => {
      if (item.sender === 'ANA') closingToasts.add(item);
    }),
    isChatOpen: sender => sender === 'ANA', toastSender: item => item.sender,
    isOwner: () => true, messageKey: text => text,
    normalizeToastText: item => item.key,
    playNewMessageSound: sender => seen.push(`som-próprio:${sender}`),
    startBlink: () => seen.push('piscar'), stopBlink: () => seen.push('parar'),
    console
  });
  const start = source.indexOf('  function checkMessages()');
  const end = source.indexOf('  // O monitor geral da página', start);
  vm.runInContext(source.slice(start, end), context);
  vm.runInContext('checkMessages()', context);
  assert.deepEqual(seen, ['piscar']);
  seen.length = 0;
  toasts.splice(1);
  vm.runInContext('checkMessages()', context);
  assert.deepEqual(seen, ['parar']);
});

test('áudio nativo do chat é interrompido para remetente aberto em outra aba', () => {
  const callbacks = [];
  const audio = { id: 'beepChatId', muted: false, currentTime: 1,
    paused: 0, pause() { this.paused++; }, play() { throw Error('não deve tocar'); } };
  const context = vm.createContext({ Date: { now: () => 1000 },
    window: { setTimeout: callback => callbacks.push(callback) },
    hasOpenChatPresence: () => true,
    isChatOpen: sender => sender === 'ANA', recentNativeSender: 'ANA',
    recentNativeSenderAt: 1000, nativePlaybackAllowedUntil: 0,
    messageToasts: () => [], toastSender: () => '' });
  functions('handleNativeChatPlay', 'dismissCoveredToasts', context);
  vm.runInContext('handleNativeChatPlay({target: audio})', Object.assign(context, { audio }));
  callbacks.shift()();
  assert.equal(audio.paused, 1);
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.muted, true);
});

test('áudio começa silenciado mesmo se a presença oscilar antes do aviso chegar', () => {
  const callbacks = [];
  let presence = false;
  const audio = { id: 'beepChatId', muted: false, currentTime: 0,
    pauses: 0, pause() { this.pauses++; } };
  const context = vm.createContext({ Date: { now: () => 1000 },
    window: { setTimeout: callback => callbacks.push(callback) },
    hasOpenChatPresence: () => presence,
    isChatOpen: sender => presence && sender === 'ANA',
    recentNativeSender: '', recentNativeSenderAt: 0,
    messageToasts: () => [{ sender: 'ANA' }], toastSender: toast => toast.sender });
  functions('handleNativeChatPlay', 'dismissCoveredToasts', context);
  vm.runInContext('handleNativeChatPlay({target: audio})', Object.assign(context, { audio }));
  assert.equal(audio.muted, true);
  assert.equal(callbacks.length, 1);
  presence = true;
  callbacks.shift()();
  assert.equal(audio.pauses, 1);
  assert.equal(audio.muted, true);
});

test('áudio nativo continua para remetente diferente e sons de outras áreas não são afetados', () => {
  const callbacks = [];
  const chat = { id: 'beepChatId', muted: true, currentTime: 1,
    pause() {}, plays: 0, play() { this.plays++; return Promise.resolve(); } };
  const other = { id: 'beepPagId', muted: false };
  const context = vm.createContext({ Date: { now: () => 1000 },
    window: { setTimeout: callback => callbacks.push(callback) },
    hasOpenChatPresence: () => true,
    isChatOpen: sender => sender === 'ANA', recentNativeSender: 'BRUNO',
    recentNativeSenderAt: 1000, nativePlaybackAllowedUntil: 0,
    messageToasts: () => [], toastSender: () => '' });
  functions('handleNativeChatPlay', 'dismissCoveredToasts', context);
  vm.runInContext('handleNativeChatPlay({target: other}); handleNativeChatPlay({target: chat})',
    Object.assign(context, { other, chat }));
  assert.equal(other.muted, false);
  callbacks.shift()();
  assert.equal(chat.muted, false);
  assert.equal(chat.plays, 0);
  assert.equal(chat.currentTime, 0);
});

test('som do chat nativo permanece preparado mesmo sem presença compartilhada', () => {
  const listeners = [];
  const audio = { id: 'beepChatId', paused: true, muted: false,
    addEventListener: (name, handler) => listeners.push([name, handler]),
    removeEventListener() {} };
  let open = true;
  const context = vm.createContext({ document: { getElementById: () => audio },
    nativeChatAudio: null, hasOpenChatPresence: () => open,
    handleNativeChatPlay() {} });
  functions('syncNativeChatAudio', 'dismissCoveredToasts', context);
  vm.runInContext('syncNativeChatAudio(); syncNativeChatAudio()', context);
  assert.equal(audio.muted, true);
  assert.equal(listeners.length, 3);
  assert.equal(listeners[0][0], 'play');
  open = false;
  vm.runInContext('syncNativeChatAudio()', context);
  assert.equal(audio.muted, true);
});

test('ao terminar um som permitido, o player silencia antes da próxima mensagem', () => {
  const listeners = new Map();
  const audio = { id: 'beepChatId', paused: true, muted: false,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener() {} };
  const context = vm.createContext({ document: { getElementById: () => audio },
    nativeChatAudio: null, hasOpenChatPresence: () => false,
    handleNativeChatPlay() {} });
  functions('syncNativeChatAudio', 'dismissCoveredToasts', context);
  vm.runInContext('syncNativeChatAudio()', context);
  audio.muted = false;
  assert.equal(typeof listeners.get('ended'), 'function');
  listeners.get('ended')({ target: audio });
  assert.equal(audio.muted, true);
});

test('mensagem coberta logo após outra mensagem ainda bloqueia o segundo som', () => {
  const callbacks = [];
  let now = 1000;
  const audio = { id: 'beepChatId', muted: false, currentTime: 0,
    pauses: 0, pause() { this.pauses++; }, play() { return Promise.resolve(); } };
  const context = vm.createContext({ Date: { now: () => now },
    window: { setTimeout: callback => callbacks.push(callback) },
    hasOpenChatPresence: () => true, isChatOpen: sender => sender === 'ANA',
    recentNativeSender: 'BRUNO', recentNativeSenderAt: 1000,
    nativePlaybackAllowedUntil: 0, messageToasts: () => [] });
  functions('handleNativeChatPlay', 'dismissCoveredToasts', context);
  vm.runInContext('handleNativeChatPlay({target: audio})', Object.assign(context, { audio }));
  callbacks.shift()();
  now = 1100;
  context.recentNativeSender = 'ANA';
  context.recentNativeSenderAt = 1100;
  vm.runInContext('handleNativeChatPlay({target: audio})', context);
  assert.equal(callbacks.length, 1);
  callbacks.shift()();
  assert.equal(audio.pauses, 1);
});

test('mensagem coberta não aumenta o contador exibido, mas outra mensagem aumenta', () => {
  let mirror = null;
  const style = { getPropertyValue: () => '', getPropertyPriority: () => '',
    setProperty() {}, removeProperty() {} };
  const badge = { textContent: '3', style,
    querySelector: () => null,
    cloneNode: () => ({ dataset: {}, style, querySelector: () => null,
      replaceChildren(...nodes) { this.textContent = nodes.map(n => n.textContent).join(''); },
      remove() { mirror = null; } }),
    insertAdjacentElement(_where, element) { mirror = element; } };
  const button = { querySelector: selector => selector.includes('data-tm-unread-mirror') ? mirror : null,
    append(element) { mirror = element; } };
  const document = { querySelector: selector => selector === '#botao-chat' ? button : badge,
    addEventListener() {},
    createTextNode: text => ({ textContent: text }) };
  const context = vm.createContext({ document, nativeCount: 3, pendingDiscount: 0,
    newMessagesBySender: new Map(), hiddenBadges: new WeakMap(), Date });
  const start = source.lastIndexOf('  function normalize(value)');
  const end = source.indexOf("  document.addEventListener('click'", start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
  vm.runInContext('recordCoveredMessage({detail:{sender:"ANA"}})', context);
  assert.equal(mirror.dataset.tmUnreadCount, '2');
  badge.textContent = '4';
  vm.runInContext('updateCount()', context);
  assert.equal(mirror.dataset.tmUnreadCount, '3');
});

test('toast coberto não é recontado como mensagem nova', () => {
  const toast = (sender, covered) => ({
    dataset: { tmCovered: covered ? '1' : undefined },
    childNodes: [{ nodeType: 3, textContent: `De: ${sender} >> oi` }],
    textContent: `De: ${sender} >> oi Fechar Chat`
  });
  const context = vm.createContext({ Node: { TEXT_NODE: 3 },
    normalize: value => String(value || '').trim().toUpperCase(),
    document: { querySelectorAll: () => [toast('ANA', true), toast('BRUNO', false)] } });
  functions('toastMessages', 'newMessageCount', context);
  const senders = vm.runInContext('Array.from(toastMessages().values(), item => item.sender)', context);
  assert.deepEqual(Array.from(senders), ['BRUNO']);
});
