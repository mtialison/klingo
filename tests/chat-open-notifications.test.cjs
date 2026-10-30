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

test('abas de contas diferentes não disputam o mesmo dono dos avisos', () => {
  const values = new Map();
  const make = (account) => {
    const context = vm.createContext({ Date: { now: () => 1000 },
      OWNER_KEY: 'owner', OWNER_TTL: 7000, tabId: `aba-${account}`,
      alertAccountId: () => account,
      GM_getValue: key => values.get(key) ?? null,
      GM_setValue: (key, value) => values.set(key, value),
      countMessageToasts: () => new Map(), knownToastCounts: new Map(),
      tmRuntime: { schedule() {} } });
    functions('readOwner', 'startBlink', context);
    vm.runInContext('claimOwner(true)', context);
    return context;
  };
  const sender = make('remetente');
  const recipient = make('destinatario');
  assert.equal(vm.runInContext('isOwner()', sender), true);
  assert.equal(vm.runInContext('isOwner()', recipient), true);
  assert.equal(values.size, 2);
});

test('identifica a conta pelo avatar quando o componente Vue não está acessível', () => {
  const nav = { parentElement: null, __vue__: null };
  const context = vm.createContext({ document: { querySelector: selector =>
    selector === 'nav.navbar' ? nav : selector === 'nav.navbar [data-initials]'
      ? { getAttribute: () => 'AM' } : null } });
  functions('alertAccountId', 'syncGlobalFocus', context);
  assert.equal(vm.runInContext('alertAccountId()', context), 'avatar:AM');
});

test('primeira mensagem em conversa vazia e chegadas em lote não se perdem', () => {
  const arrivals = [];
  const context = vm.createContext({ openChatContent: null, openChatSender: '',
    knownChatRows: [], publishChatAlert: item => arrivals.push(item),
    messageKey: text => text });
  functions('detectChatRows', 'scanOpenChatMessages', context);
  context.content = {};
  context.rows = [];
  vm.runInContext('detectChatRows(content, "TESTE", rows)', context);
  context.rows = [{ key: 'primeira', incoming: true, item: {} }];
  vm.runInContext('detectChatRows(content, "TESTE", rows)', context);
  context.rows = [...context.rows,
    { key: 'segunda', incoming: true, item: {} },
    { key: 'minha', incoming: false, item: {} },
    { key: 'terceira', incoming: true, item: {} }];
  vm.runInContext('detectChatRows(content, "TESTE", rows)', context);
  assert.equal(arrivals.length, 3);
  assert.deepEqual(arrivals.map(item => item.key), ['primeira', 'segunda', 'terceira']);
});

test('toast histórico recriado não é confundido com mensagem nova', () => {
  const arrivals = [];
  const context = vm.createContext({ knownToastElements: new WeakMap(),
    knownToastCounts: new Map(), toastSender: () => 'TESTE',
    normalizeToastText: toast => toast.text, messageKey: text => text,
    publishChatAlert: item => arrivals.push(item) });
  functions('detectNewToasts', 'dismissCoveredToasts', context);
  context.countMessageToasts = items => new Map([["De: TESTE >> oi", items.length]]);
  context.toasts = [{ text: 'De: TESTE >> oi' }];
  vm.runInContext('detectNewToasts(toasts, true)', context);
  context.toasts = [{ text: 'De: TESTE >> oi' }];
  vm.runInContext('detectNewToasts(toasts)', context);
  assert.equal(arrivals.length, 0);
  context.toasts.push({ text: 'De: TESTE >> oi' });
  vm.runInContext('detectNewToasts(toasts)', context);
  assert.equal(arrivals.length, 1);
});

test('chegada só na aba não proprietária é encaminhada à proprietária', async () => {
  const forwarded = [];
  const context = vm.createContext({
    tabId: 'aba-chat', alertAccountId: () => 'destinatario',
    ALERT_EVENT_KEY: 'alert-event', alertSequence: 0,
    isOwner: () => false, readOwner: () => ({ id: 'aba-dona', updatedAt: 1000 }),
    OWNER_TTL: 7000, Date: { now: () => 1000 },
    syncGlobalFocus() {}, isAnyKlingoTabFocused: () => false,
    isChatOpen: () => false, directChatSender: () => 'TESTE',
    GM_setValue: (key, value) => forwarded.push({ key, value }),
    navigator: { locks: { request: async () => {} } }
  });
  functions('publishChatAlert', 'detectChatRows', context);
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"chat",key:"msg-1"})', context);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].value.account, 'destinatario');
  assert.equal(forwarded[0].value.key, 'msg-1');
});

test('mensagens idênticas sucessivas da mesma aba alertam; eco de outra aba não duplica', async () => {
  const events = [];
  const history = new Map();
  const context = vm.createContext({ alertAudio: null, recentAlertKeys: new Map(),
    tabId: 'aba-dona', alertAccountId: () => 'destinatario',
    ALERT_HISTORY_KEY: 'history', ALERT_DEDUP_TTL: 2000, ALERT_ID_TTL: 300000,
    GM_getValue: key => history.get(key) ?? [],
    GM_setValue: (key, value) => history.set(key, value),
    isOwner: () => true, isChatOpen: () => false,
    syncGlobalFocus() {}, isAnyKlingoTabFocused: () => false,
    navigator: { locks: { request: async (_name, callback) => callback() } },
    startBlink: () => events.push('visual'),
    playScriptAlert: () => events.push('som'), console });
  functions('publishChatAlert', 'detectChatRows', context);
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast",key:"igual"})', context);
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast",key:"igual"})', context);
  await vm.runInContext('publishChatAlert({sender:"",source:"relay",origin:"outra",key:"igual"})', context);
  assert.deepEqual(events, ['visual', 'som', 'visual', 'som']);
});

test('som próprio agenda um toque distinto por mensagem rápida na aba proprietária', () => {
  const tones = [];
  const audio = { state: 'running', currentTime: 10,
    destination: {}, createOscillator() {
      const tone = { frequency: { value: 0 }, connect() {},
        start(at) { this.at = at; }, stop(at) { this.end = at; } };
      tones.push(tone); return tone;
    }, createGain() { return { gain: { setValueAtTime() {},
      exponentialRampToValueAtTime() {} }, connect() {} }; } };
  const context = vm.createContext({
    notificationAudioContext: audio, nextAlertToneAt: 0, pendingAlertTones: new Set(),
    window: {}, console
  });
  functions('playScriptAlert', 'handleNativeChatPlay', context);
  vm.runInContext('playScriptAlert(); playScriptAlert(); playScriptAlert()', context);
  assert.equal(tones.length, 3);
  assert.ok(tones[0].at < tones[1].at && tones[1].at < tones[2].at);
  assert.ok(tones[0].end <= tones[1].at && tones[1].end <= tones[2].at);
});

test('áudio bloqueado pelo Chrome não toca atrasado quando a aba volta ao foco', () => {
  let created = 0;
  const context = vm.createContext({ notificationAudioContext: null, pendingAlertTones: new Set(),
    nextAlertToneAt: 0, window: { AudioContext: class {
      constructor() { created++; this.state = 'suspended'; }
      resume() { this.state = 'running'; return Promise.resolve(); }
    } }, console });
  functions('armScriptAudio', 'handleNativeChatPlay', context);
  vm.runInContext('playScriptAlert()', context);
  assert.equal(created, 0);
  vm.runInContext('armScriptAudio()', context);
  assert.equal(created, 1);
});

test('dona executa um único aviso de duas abas com toasts divergentes', async () => {
  const sounds = [];
  const history = new Map();
  let listener;
  const context = vm.createContext({ alertAudio: null, recentAlertKeys: new Map(),
    tabId: 'aba-dona', ALERT_EVENT_KEY: 'alert-event',
    ALERT_HISTORY_KEY: 'history', ALERT_DEDUP_TTL: 2000, ALERT_ID_TTL: 300000,
    GM_getValue: key => history.get(key) ?? [],
    GM_setValue: (key, value) => history.set(key, value),
    alertAccountId: () => 'destinatario', isOwner: () => true,
    isChatOpen: () => false, syncGlobalFocus() {},
    isAnyKlingoTabFocused: () => false,
    navigator: { locks: { request: async (_name, callback) => callback() } },
    startBlink: () => sounds.push('visual'),
    GM_addValueChangeListener: (_key, callback) => { listener = callback; }, console });
  functions('publishChatAlert', 'detectChatRows', context);
  const start = source.indexOf('  GM_addValueChangeListener(ALERT_EVENT_KEY');
  const end = source.indexOf("  window.addEventListener('storage'", start);
  vm.runInContext(source.slice(start, end), context);
  const event = (sourceTab, account, key) =>
    ({ source: sourceTab, account, key, at: Date.now() });
  listener('alert-event', null, event('aba-um', 'destinatario', 'mensagem-1'), true);
  listener('alert-event', null, event('aba-dois', 'destinatario', 'mensagem-1'), true);
  listener('alert-event', null, event('aba-remetente', 'remetente', 'mensagem-2'), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sounds.length, 1);
  listener('alert-event', null, event('aba-um', 'destinatario', 'mensagem-2'), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sounds.length, 2);
});

test('eco atrasado e troca de aba dona não repetem o mesmo aviso', async () => {
  let now = 1000;
  const shared = new Map();
  const sounds = [];
  const makeOwner = id => {
    const context = vm.createContext({ alertAudio: null, recentAlertKeys: new Map(),
      tabId: id, alertAccountId: () => 'destinatario',
      ALERT_HISTORY_KEY: 'history', ALERT_DEDUP_TTL: 2000, ALERT_ID_TTL: 300000,
      Date: { now: () => now }, isOwner: () => true, isChatOpen: () => false,
      syncGlobalFocus() {}, isAnyKlingoTabFocused: () => false,
      navigator: { locks: { request: async (_name, callback) => callback() } },
      GM_getValue: key => shared.get(key) ?? null,
      GM_setValue: (key, value) => shared.set(key, value),
      startBlink: () => sounds.push(id), console });
    functions('publishChatAlert', 'detectChatRows', context);
    return context;
  };
  const first = makeOwner('dona-um');
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast",key:"msg"})', first);
  now += 1500;
  const second = makeOwner('dona-dois');
  await vm.runInContext('publishChatAlert({sender:"",source:"relay",origin:"outra",key:"msg"})', second);
  assert.deepEqual(sounds, ['dona-um']);
  now += 3500;
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"native",key:"id:segunda"})', second);
  assert.deepEqual(sounds, ['dona-um', 'dona-dois']);
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast",key:"msg"})', second);
  assert.deepEqual(sounds, ['dona-um', 'dona-dois', 'dona-dois']);
});

test('o mesmo id nativo não pisca novamente mesmo após quinze segundos', async () => {
  let now = 1000;
  const shared = new Map();
  const sounds = [];
  const make = id => {
    const context = vm.createContext({ tabId: id, alertAudio: null,
      Date: { now: () => now }, alertAccountId: () => 'destinatario',
      ALERT_HISTORY_KEY: 'history', ALERT_DEDUP_TTL: 2000, ALERT_ID_TTL: 300000,
      GM_getValue: key => shared.get(key) ?? [],
      GM_setValue: (key, value) => shared.set(key, value),
      isOwner: () => true, isChatOpen: () => false,
      syncGlobalFocus() {}, isAnyKlingoTabFocused: () => false,
      navigator: { locks: { request: async (_name, callback) => callback() } },
      startBlink: () => sounds.push(id), console });
    functions('publishChatAlert', 'detectChatRows', context);
    return context;
  };
  const first = make('dona-um');
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"native",key:"id:101"})', first);
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"native",key:"id:101"})', first);
  assert.deepEqual(sounds, ['dona-um']);
  now += 15000;
  await vm.runInContext('publishChatAlert({sender:"",source:"relay",origin:"outra",key:"id:101"})', make('dona-dois'));
  assert.deepEqual(sounds, ['dona-um']);
});

test('gancho nativo usa id da mensagem e preserva o recebimento original', () => {
  const alerts = [];
  const received = [];
  const vue = { receberMensagem(message) { received.push(message.id_chat_sala_mensagem); } };
  const modal = { parentElement: { parentElement: null, __vue__: vue }, __vue__: null };
  const context = vm.createContext({ document: { getElementById: () => modal },
    hookedChatVue: null, nativeChatHooked: false,
    normalizeSender: value => value.toUpperCase(),
    publishChatAlert: event => alerts.push(event) });
  functions('syncNativeMessageHook', 'publishChatAlert', context);
  vm.runInContext('syncNativeMessageHook(); syncNativeMessageHook()', context);
  vue.receberMensagem({ id_chat_sala_mensagem: 101, from_name: 'Teste', text: 'oi' });
  vue.receberMensagem({ id_chat_sala_mensagem: 102, from_name: 'Teste', text: 'oi' });
  assert.deepEqual(received, [101, 102]);
  assert.deepEqual(alerts.map(event => event.key), ['id:101', 'id:102']);
});

test('sem Web Locks o fallback não arrisca áudio duplicado', () => {
  const events = [];
  const context = vm.createContext({ isOwner: () => true,
    alertAccountId: () => 'destinatario',
    syncGlobalFocus() {}, isAnyKlingoTabFocused: () => false,
    directChatSender: () => '', isChatOpen: () => false,
    startBlink: () => events.push('piscar'),
    Audio: function () { this.play = () => { events.push('som'); return Promise.resolve(); }; },
    navigator: {} });
  functions('publishChatAlert', 'detectChatRows', context);
  vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast"})', context);
  assert.deepEqual(events, []);
});

test('foco em qualquer aba Klingo impede alerta e expira após fechamento', () => {
  const localStorage = storage();
  const context = vm.createContext({ Date: { now: () => 1000 },
    FOCUS_PREFIX: 'focus:', FOCUS_TTL: 3000, tabId: 'aba-a', localStorage,
    document: { visibilityState: 'visible', hasFocus: () => false } });
  functions('syncGlobalFocus', 'handleNativeChatPlay', context);
  localStorage.setItem('focus:aba-remetente', JSON.stringify({ at: 1000 }));
  assert.equal(vm.runInContext('isAnyKlingoTabFocused()', context), true);
  context.Date.now = () => 4001;
  assert.equal(vm.runInContext('isAnyKlingoTabFocused()', context), false);
});

test('foco simultâneo impossível em várias abas não suprime o alerta', () => {
  const localStorage = storage();
  const context = vm.createContext({ Date: { now: () => 1000 },
    FOCUS_PREFIX: 'focus:', FOCUS_TTL: 3000, tabId: 'aba-a', localStorage,
    document: { visibilityState: 'hidden', hasFocus: () => false } });
  functions('syncGlobalFocus', 'handleNativeChatPlay', context);
  localStorage.setItem('focus:aba-a', JSON.stringify({ at: 900 }));
  localStorage.setItem('focus:aba-b', JSON.stringify({ at: 1000 }));
  assert.equal(vm.runInContext('isAnyKlingoTabFocused()', context), false);
});

test('aba oculta pode assumir avisos quando não existe responsável', () => {
  const timers = [];
  const context = vm.createContext({ claimTimer: null,
    document: { visibilityState: 'hidden' },
    window: { setTimeout: callback => { timers.push(callback); return 1; } },
    Math, alertAccountId: () => 'destinatario', claimOwner: () => {},
    navigator: { locks: { request: (_name, callback) => callback() } } });
  functions('scheduleTakeover', 'maintainOwner', context);
  vm.runInContext('scheduleTakeover()', context);
  assert.equal(timers.length, 1);
});

test('vídeo nativo do Klingo permanece mudo até para remetente sem conversa aberta', () => {
  const audio = { id: 'beepChatId', muted: false, currentTime: 1,
    pauses: 0, pause() { this.pauses++; } };
  const context = vm.createContext({ window: { setTimeout() {} },
    nativeNotificationAudio: new Map(),
    isOwner: () => true, isChatOpen: () => false });
  functions('handleNativeChatPlay', 'syncNativeChatAudio', context);
  vm.runInContext('handleNativeChatPlay({target: audio})', Object.assign(context, { audio }));
  assert.equal(audio.muted, true);
  assert.equal(audio.pauses, 1);
});

test('chat aberto detecta nova linha recebida e ignora envio próprio e rerenderização', () => {
  const arrivals = [];
  const context = vm.createContext({ openChatContent: null, openChatSender: '',
    knownChatRows: [], publishChatAlert: item => arrivals.push(item), messageKey: text => text });
  functions('detectChatRows', 'scanOpenChatMessages', context);
  const content = {};
  const old = { key: '12:00|anterior', incoming: true, item: {} };
  const incoming = { key: '12:01|nova', incoming: true, item: {} };
  const sent = { key: '12:02|minha', incoming: false, item: {} };
  context.content = content;
  context.rows = [old];
  vm.runInContext('detectChatRows(content, "TESTE", rows)', context);
  context.rows = [old, incoming];
  vm.runInContext('detectChatRows(content, "TESTE", rows)', context);
  vm.runInContext('detectChatRows(content, "TESTE", rows)', context);
  context.rows = [old, incoming, sent];
  vm.runInContext('detectChatRows(content, "TESTE", rows)', context);
  assert.equal(arrivals.length, 1);
});

test('dois toasts idênticos novos são dois eventos, mas os antigos são baseline', () => {
  const arrivals = [];
  const context = vm.createContext({ knownToastElements: new WeakMap(),
    knownToastCounts: new Map(), messageKey: text => text,
    toastSender: () => 'TESTE', normalizeToastText: toast => toast.text,
    publishChatAlert: item => arrivals.push(item) });
  functions('detectNewToasts', 'countMessageToasts', context);
  context.countMessageToasts = items => new Map([["De: TESTE >> oi", items.length]]);
  const old = { text: 'De: TESTE >> oi' };
  const one = { text: 'De: TESTE >> oi' };
  const two = { text: 'De: TESTE >> oi' };
  context.toasts = [old];
  vm.runInContext('detectNewToasts(toasts, true)', context);
  context.toasts = [old, one];
  vm.runInContext('detectNewToasts(toasts)', context);
  context.toasts = [old, one, two];
  vm.runInContext('detectNewToasts(toasts)', context);
  assert.equal(arrivals.length, 2);
});

test('título e som acontecem só no dono em segundo plano', async () => {
  const events = [];
  const context = vm.createContext({ alertAudio: null, isOwner: () => true,
    alertAccountId: () => 'destinatario', recentAlertKeys: new Map(),
    ALERT_HISTORY_KEY: 'history', ALERT_DEDUP_TTL: 2000, ALERT_ID_TTL: 300000,
    GM_getValue: () => [],
    isChatOpen: () => false,
    navigator: { locks: { request: async (_name, callback) => callback() } },
    ALERT_EVENT_KEY: 'alert-event', tabId: 'aba-dona', alertSequence: 0,
    GM_setValue() {},
    readOwner: () => ({ updatedAt: Date.now() }), OWNER_TTL: 7000,
    isAnyKlingoTabFocused: () => false, syncGlobalFocus() {},
    directChatSender: () => '', startBlink: () => events.push('piscar'),
    playScriptAlert: () => events.push('som'),
    console });
  functions('publishChatAlert', 'detectChatRows', context);
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast"})', context);
  assert.deepEqual(events, ['piscar', 'som']);
  events.length = 0;
  context.isAnyKlingoTabFocused = () => true;
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast"})', context);
  assert.deepEqual(events, []);
  context.isAnyKlingoTabFocused = () => false;
  context.isOwner = () => false;
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast"})', context);
  assert.deepEqual(events, []);
});

test('chegada durante troca de responsável não perde o alerta', async () => {
  const events = [];
  let owner = false;
  const context = vm.createContext({ alertAudio: null, recentAlertKeys: new Map(),
    tabId: 'aba-chat',
    ALERT_HISTORY_KEY: 'history', ALERT_DEDUP_TTL: 2000, ALERT_ID_TTL: 300000,
    GM_getValue: () => [], GM_setValue() {},
    isChatOpen: () => false,
    isOwner: () => owner, readOwner: () => null,
    alertAccountId: () => 'destinatario',
    claimOwner: () => { owner = true; },
    isAnyKlingoTabFocused: () => false, syncGlobalFocus() {},
    directChatSender: () => '', startBlink: () => events.push('piscar'),
    playScriptAlert: () => events.push('som'),
    navigator: { locks: { request: (_name, callback) => Promise.resolve(callback()) } },
    console });
  functions('publishChatAlert', 'detectChatRows', context);
  await vm.runInContext('publishChatAlert({sender:"TESTE",source:"toast"})', context);
  assert.deepEqual(events, ['piscar', 'som']);
});

test('verificação de avisos não inicia alerta personalizado da conversa aberta', () => {
  let customScans = 0;
  const context = vm.createContext({
    document: { title: 'klingo' }, blinking: false, backgroundChatAlert: false,
    nativeChatHooked: false, syncNativeMessageHook() {},
    syncGlobalFocus() {}, isAnyKlingoTabFocused: () => false,
    syncOpenChat() {}, scanOpenChatMessages: () => customScans++,
    syncNativeChatAudio() {}, applyPendingDismissals() {}, detectNewToasts() {},
    messageToasts: () => [], countMessageToasts: () => new Map(),
    knownToastCounts: new Map(), dismissCoveredToasts() {},
    closingToasts: new WeakSet(), isOwner: () => false, stopBlink() {},
    console: { error: error => { throw error; } }
  });
  const start = source.indexOf('  function checkMessages(');
  const end = source.indexOf('  const notificationObserver = new MutationObserver(', start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
  vm.runInContext('checkMessages()', context);
  assert.equal(customScans, 1);
});

test('conversa aberta em outra aba suprime só o remetente correspondente e expira', () => {
  const localStorage = storage();
  let now = 100000;
  const context = vm.createContext({ localStorage, Date: { now: () => now },
    OPEN_CHAT_PREFIX: 'klingo_chat_open_sender_v1:', OPEN_CHAT_TTL: 90000,
    tabId: 'aba-a', publishedSenderKey: '', lastPresenceWrite: 0,
    alertAccountId: () => 'destinatario',
    pendingChatSender: 'ANA', document: { querySelectorAll: () => [{
      closest: selector => selector === '.modal-footer' ? { querySelector: () => ({}) } :
        selector === '.modal-content' ? { querySelector: inner =>
          inner === '.modal-header .modal-title' ? { textContent: 'Ana' } : null } : null
    }] } });
  functions('messageKey', 'findToastAction', context);
  context.alertAccountId = () => 'destinatario';
  assert.equal(vm.runInContext('directChatSender()', context), 'ANA');
  vm.runInContext('syncOpenChat()', context);
  assert.equal(vm.runInContext('isChatOpen("ANA")', context), true);
  context.alertAccountId = () => 'outra-conta';
  assert.equal(vm.runInContext('isChatOpen("ANA")', context), false);
  context.alertAccountId = () => 'destinatario';
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

test('checagem periódica não dispara alerta a partir de toasts antigos', () => {
  const seen = [];
  const toasts = [{ sender: 'ANA', key: '1' }, { sender: 'BRUNO', key: '2' }];
  const closingToasts = new WeakSet();
  const context = vm.createContext({ blinking: false, originalTitle: 'klingo',
    document: { title: 'klingo' }, knownToastCounts: new Map(), closingToasts,
    nativeChatHooked: false, syncNativeMessageHook() {},
    syncGlobalFocus() {}, isAnyKlingoTabFocused: () => false,
    syncOpenChat() {}, scanOpenChatMessages() {}, backgroundChatAlert: false,
    applyPendingDismissals() {}, detectNewToasts() {}, messageToasts: () => toasts,
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
  const end = source.indexOf('  const notificationObserver = new MutationObserver(', start);
  vm.runInContext(source.slice(start, end), context);
  vm.runInContext('checkMessages()', context);
  assert.deepEqual(seen, []);
  seen.length = 0;
  toasts.splice(1);
  vm.runInContext('checkMessages()', context);
  assert.deepEqual(seen, []);
});

test('som nativo permanece silenciado mesmo sem presença compartilhada', () => {
  const listeners = [];
  const audio = { id: 'beepChatId', paused: true, muted: false,
    addEventListener: (name, handler) => listeners.push([name, handler]),
    removeEventListener() {} };
  const pageAudio = { id: 'beepPagId', paused: true, muted: false,
    addEventListener: (name, handler) => listeners.push([name, handler]),
    removeEventListener() {} };
  let open = true;
  const context = vm.createContext({ document: { getElementById: id =>
    id === 'beepChatId' ? audio : id === 'beepPagId' ? pageAudio : null },
    nativeNotificationAudio: new Map(),
    hasOpenChatPresence: () => open, console });
  functions('handleNativeChatPlay', 'syncNativeMessageHook', context);
  vm.runInContext('syncNativeChatAudio(); syncNativeChatAudio()', context);
  assert.equal(audio.muted, true);
  assert.equal(pageAudio.muted, true);
  assert.equal(listeners.length, 2);
  assert.equal(listeners[0][0], 'play');
  open = false;
  vm.runInContext('syncNativeChatAudio()', context);
  assert.equal(audio.muted, true);
  assert.equal(pageAudio.muted, true);
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

for (const blinking of [true, false]) {
  test(`parar aviso cancela a rajada sonora mesmo com título piscando=${blinking}`, () => {
    const tones = [];
    let disconnected = 0;
    const audio = { state: 'running', currentTime: 10, destination: {},
      createOscillator() {
        const tone = { frequency: {}, connect() {}, disconnect() { disconnected++; },
          start(at) { this.at = at; }, stop(at = audio.currentTime) { this.end = at; } };
        tones.push(tone); return tone;
      },
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}, disconnect() { disconnected++; } }; }
    };
    const context = vm.createContext({ notificationAudioContext: audio, nextAlertToneAt: 0, pendingAlertTones: new Set(),
      blinking, blinkInterval: 1, originalTitle: 'klingo',
      document: { title: 'Nova mensagem' }, clearInterval() {}, console });
    functions('playScriptAlert', 'handleNativeChatPlay', context);
    functions('stopBlink', 'checkMessages', context);
    for (let i = 0; i < 10; i++) context.playScriptAlert();
    audio.currentTime = 10.1;
    context.stopBlink();
    assert.ok(tones.every(tone => tone.end <= 10.1));
    for (const tone of tones) tone.onended();
    assert.equal(disconnected, 20);
    audio.currentTime = 10.2;
    context.playScriptAlert();
    assert.equal(tones[10].at, 10.2);
  });
}
