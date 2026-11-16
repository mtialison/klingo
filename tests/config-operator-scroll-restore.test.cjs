const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '../src/43-config-operadoras-restaurar-rolagem.js');

function fixture() {
  let route = '#/config/operadoras';
  const listeners = new Map();
  const documentListeners = new Map();
  const jobs = new Map();
  const values = new Map();
  const operatorLinks = [];
  let nextTimer = 1;
  const timers = new Map();
  const maxScrollY = 4200;
  const window = {
    location: { get hash() { return route; } },
    innerHeight: 800,
    scrollX: 0,
    scrollY: 0,
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(handler);
    },
    scrollTo(x, y) {
      this.scrollX = Math.max(0, Number(x) || 0);
      this.scrollY = Math.max(0, Math.min(Number(y) || 0, maxScrollY));
    },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  const document = {
    documentElement: { scrollHeight: maxScrollY + window.innerHeight },
    body: { scrollHeight: maxScrollY + window.innerHeight },
    addEventListener(name, handler) {
      if (!documentListeners.has(name)) documentListeners.set(name, []);
      documentListeners.get(name).push(handler);
    },
    querySelectorAll(selector) { return selector === 'a' ? operatorLinks : []; }
  };
  const sessionStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
  const source = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';
  vm.runInNewContext(source, { window, document, sessionStorage,
    tmRuntime: { register(name, job) { jobs.set(name, job); } } });

  return {
    window,
    navigate(nextRoute) {
      route = nextRoute;
      window.scrollTo(0, 0); // Simula o scroll-to-top nativo do router SPA.
      for (const handler of listeners.get('hashchange') || []) handler();
      for (const job of jobs.values()) job();
    },
    clickOperator(name) {
      const anchor = { nodeType: 1, textContent: name, closest(selector) { return selector === 'a' ? this : null; } };
      const event = { target: anchor };
      for (const handler of documentListeners.get('click') || []) handler(event);
    },
    addOperatorLink(name) { operatorLinks.push({ textContent: name }); },
    flushTimers() {
      for (const [id, callback] of Array.from(timers)) {
        timers.delete(id);
        callback();
      }
    },
    scroll() {
      for (const handler of listeners.get('scroll') || []) handler();
    },
    jobs
  };
}

test('retorna à posição anterior da lista ao voltar do detalhe de uma operadora', () => {
  const f = fixture();
  f.window.scrollTo(0, 1760);
  f.scroll();
  f.clickOperator('FIO SAUDE');
  f.navigate('#/config/operadoras/56/restricoes');
  f.navigate('#/config/operadoras/56/planos');
  f.navigate('#/config/operadoras');
  assert.equal(f.window.scrollY, 0); // Espera a lista correspondente ser reconstruída.
  f.addOperatorLink('FIO SAUDE');
  for (const job of f.jobs.values()) job();
  assert.equal(f.window.scrollY, 1760);
});

test('não restaura a posição da lista ao entrar nela por outra rota', () => {
  const f = fixture();
  f.window.scrollTo(0, 1760);
  f.scroll();
  f.navigate('#/config/procedimentos');
  f.window.scrollTo(0, 0);
  f.navigate('#/config/operadoras');
  assert.equal(f.window.scrollY, 0);
});

test('usa a melhor posição possível quando a linha original demora além do limite para aparecer', () => {
  const f = fixture();
  f.window.scrollTo(0, 1760);
  f.scroll();
  f.clickOperator('FIO SAUDE');
  f.navigate('#/config/operadoras/56/restricoes');
  f.navigate('#/config/operadoras');
  f.flushTimers();
  assert.equal(f.window.scrollY, 1760);
});
