const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', '00-foundation.js'), 'utf8');
const code = source.slice(source.indexOf("  const AUTO_LOGIN_LOGOUT_KEY"), source.indexOf('  function isKlingoHost('));

function harness(getCredential, prefilled = false) {
  const listeners = new Map(), timers = new Map(), stored = new Map(), flags = new Map();
  let timer = 0, submits = 0, requests = 0;
  class Input {
    constructor(name, value) { this.name = name; this._value = value; this.autofilled = prefilled; }
    get value() { return this._value; }
    set value(value) { this._value = value; }
    matches(selector) { return selector.includes('autofill') ? this.autofilled : selector.includes(this.name); }
    closest() { return scope; }
    getClientRects() { return [{}]; }
    dispatchEvent() {}
  }
  const username = new Input('login-username', prefilled ? 'fixture-user' : '');
  const password = new Input('login-userpassword', prefilled ? 'fixture-password' : '');
  const submit = { textContent: 'ENTRAR', getAttribute() { return null; }, click() { submits++; } };
  const scope = { contains: () => true, querySelectorAll: () => [submit] };
  const document = { readyState: 'complete', querySelector(selector) {
    if (selector.includes('login-username')) return username;
    if (selector.includes('login-userpassword')) return password;
    return null;
  }, addEventListener(type, callback) {
    const list = listeners.get(type) || []; list.push(callback); listeners.set(type, list);
  } };
  const context = vm.createContext({ document, navigator: { credentials: { get(options) {
    requests++; assert.equal(options.password, true); assert.equal(options.mediation, 'silent');
    return getCredential();
  } } }, PasswordCredential: function () {}, HTMLInputElement: Input,
    Event: class { constructor(type) { this.type = type; } }, console,
    norm: text => String(text).trim(),
    window: { setTimeout(fn) { timers.set(++timer, fn); return timer; }, clearTimeout(id) { timers.delete(id); } },
    sessionStorage: { getItem: key => stored.get(key), setItem: (k, v) => stored.set(k, v), removeItem: k => stored.delete(k) },
    GM_getValue: (key, fallback) => flags.get(key) ?? fallback,
    GM_setValue: (key, value) => flags.set(key, value) });
  vm.runInContext(code, context);
  return { context, username, password,
    run: () => vm.runInContext('tryAutoLoginWithSavedCredential()', context),
    event(type, target, extra = {}) { (listeners.get(type) || []).forEach(fn => fn({ isTrusted: true, target, ...extra })); },
    async flush() { await new Promise(resolve => setImmediate(resolve));
      for (const [id, fn] of [...timers]) { timers.delete(id); fn(); }
      await new Promise(resolve => setImmediate(resolve)); },
    submits: () => submits, requests: () => requests,
    blank: { nodeType: 1, closest: () => null } };
}

const credential = { type: 'password', id: 'fixture-user', password: 'fixture-password' };

test('clique genérico e autofill não enviam login quando Chrome não confirma credencial única', async () => {
  const h = harness(() => Promise.resolve(null), true);
  h.run(); await h.flush();
  h.event('click', h.blank);
  h.event('input', h.username); h.event('input', h.password);
  h.run(); await h.flush();
  assert.equal(h.submits(), 0);
});

test('uma credencial silenciosa válida permite uma única tentativa mesmo com autofill inicial', async () => {
  const h = harness(() => Promise.resolve(credential), true);
  h.run(); await h.flush(); h.run(); await h.flush();
  assert.equal(h.requests(), 1);
  assert.equal(h.submits(), 1);
});

test('clique fora do formulário cancela credencial silenciosa ainda pendente', async () => {
  let resolve;
  const h = harness(() => new Promise(done => { resolve = done; }));
  h.run();
  h.event('pointerdown', h.blank);
  h.event('click', h.blank);
  resolve(credential); await h.flush();
  assert.equal(h.submits(), 0);
  assert.equal(h.username.value, '');
});

test('seleção manual de conta pelo navegador não vira envio automático', async () => {
  const h = harness(() => Promise.resolve(null));
  h.run(); await h.flush();
  h.event('pointerdown', h.username);
  h.username.value = 'other-fixture'; h.password.value = 'other-password';
  h.username.autofilled = h.password.autofilled = true;
  h.event('input', h.username); h.event('input', h.password);
  h.run(); await h.flush();
  assert.equal(h.submits(), 0);
});

test('indisponibilidade da API não usa autofill como substituto para comprovar conta única', async () => {
  const h = harness(() => Promise.resolve(null), true);
  vm.runInContext('navigator.credentials = undefined', h.context);
  h.run(); h.event('input', h.username); await h.flush();
  assert.equal(h.submits(), 0);
});

test('clique cancela envio já agendado depois da resposta silenciosa', async () => {
  const h = harness(() => Promise.resolve(credential));
  h.run();
  await new Promise(resolve => setImmediate(resolve));
  h.event('pointerdown', h.blank);
  await h.flush();
  assert.equal(h.submits(), 0);
});

test('sair manualmente mantém o bloqueio do login automático', async () => {
  const h = harness(() => Promise.resolve(credential));
  vm.runInContext('GM_setValue(AUTO_LOGIN_LOGOUT_KEY, true)', h.context);
  h.run(); await h.flush();
  assert.equal(h.requests(), 0);
  assert.equal(h.submits(), 0);
});

test('Enter manual preserva a marcação de envio do usuário', async () => {
  const h = harness(() => Promise.resolve(null));
  h.event('keydown', h.username, { key: 'Enter' });
  assert.equal(vm.runInContext('hasPendingAutoAttempt()', h.context), false);
  assert.equal(vm.runInContext('sessionStorage.getItem(MANUAL_LOGIN_PENDING_KEY)', h.context), '1');
  h.run(); await h.flush();
  assert.equal(h.requests(), 0);
});
