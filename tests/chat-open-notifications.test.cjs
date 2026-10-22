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
    closingToasts: new WeakSet(),
    findToastAction: toast => ({ click: () => closed.push(toast.sender) }),
    window: { setTimeout() {} }
  });
  functions('dismissCoveredToasts', 'findToastAction', context);
  const ana = { sender: 'ANA' }, bruno = { sender: 'BRUNO' };
  vm.runInContext('dismissCoveredToasts(toasts)', Object.assign(context, { toasts: [ana, bruno] }));
  assert.deepEqual(closed, ['ANA']);
  assert.equal(context.closingToasts.has(ana), true);
  assert.equal(context.closingToasts.has(bruno), false);
});

test('som pendente da conversa aberta é descartado sem perder outras mensagens', () => {
  const played = [];
  const audio = { pause() {}, currentTime: 0, addEventListener() {}, removeEventListener() {},
    play() { played.push('play'); return Promise.resolve(); } };
  const context = vm.createContext({ pendingSounds: ['ANA', 'BRUNO'], soundPlaying: false,
    isChatOpen: sender => sender === 'ANA', ensureNotificationAudio: () => audio,
    audioPrimed: false, audioWarningShown: false, console });
  functions('playNextMessageSound', 'playNewMessageSound', context);
  vm.runInContext('playNextMessageSound()', context);
  assert.deepEqual(played, ['play']);
  assert.equal(context.pendingSounds.length, 0);
});

test('toast coberto não pisca nem toca; toast de outro remetente continua alertando', () => {
  const seen = [];
  const toasts = [{ sender: 'ANA', key: '1' }, { sender: 'BRUNO', key: '2' }];
  const closingToasts = new WeakSet();
  const context = vm.createContext({ blinking: false, originalTitle: 'klingo',
    document: { title: 'klingo' }, knownToastCounts: new Map(), closingToasts,
    syncOpenChat() {}, applyPendingDismissals() {}, messageToasts: () => toasts,
    countMessageToasts: items => new Map(items.map(item => [item.key, 1])),
    dismissCoveredToasts: items => items.forEach(item => {
      if (item.sender === 'ANA') closingToasts.add(item);
    }),
    isChatOpen: sender => sender === 'ANA', toastSender: item => item.sender,
    isOwner: () => true, messageKey: text => text,
    normalizeToastText: item => item.key,
    playNewMessageSound: sender => seen.push(`som:${sender}`),
    startBlink: () => seen.push('piscar'), stopBlink: () => seen.push('parar'),
    console
  });
  const start = source.indexOf('  function checkMessages()');
  const end = source.indexOf('  // O monitor geral da página', start);
  vm.runInContext(source.slice(start, end), context);
  vm.runInContext('checkMessages()', context);
  assert.deepEqual(seen, ['som:BRUNO', 'piscar']);
  seen.length = 0;
  toasts.splice(1);
  vm.runInContext('checkMessages()', context);
  assert.deepEqual(seen, ['parar']);
});
