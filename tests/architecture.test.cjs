const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('os dois arquivos finais têm o mesmo código e incorporam os recursos originais', () => {
  const files = fs.readdirSync(path.join(root, 'src')).filter((name) => /^\d{2}-.*\.js$/.test(name)).sort();
  assert.ok(files.length > 10);
  const source = files.map((name) => read(path.join('src', name)).trimEnd()).join('\n\n') + '\n';
  const main = read('klingo.user.js');
  const draft = read('klingo.test.user.js');
  assert.equal(fs.readFileSync(path.join(root, 'assets/login-icon.png')).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const image = main.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1];
  assert.ok(image);
  assert.doesNotMatch(main, /data:audio\/mpeg;base64,/);
  assert.deepEqual(Buffer.from(image, 'base64'), fs.readFileSync(path.join(root, 'assets/login-icon.png')));
  const expectedMain = source
    .replace("'__TM_LOGIN_ICON_DATA__'", JSON.stringify(`data:image/png;base64,${image}`));
  assert.equal(main, expectedMain);
  const endHeader = '// ==/UserScript==\n';
  assert.equal(draft.slice(draft.indexOf(endHeader) + endHeader.length),
    main.slice(main.indexOf(endHeader) + endHeader.length));
  assert.doesNotMatch(main, /i\.imgur\.com|@resource|GM_getResourceURL/);
});

test('arquivo para copiar à main não aponta para a branch de testes', () => {
  const main = read('klingo.user.js').split('// ==/UserScript==')[0];
  const draft = read('klingo.test.user.js').split('// ==/UserScript==')[0];
  assert.match(main, /@updateURL\s+https:\/\/raw\.githubusercontent\.com\/mtialison\/klingo\/main\/klingo\.user\.js/);
  assert.match(main, /@downloadURL\s+https:\/\/raw\.githubusercontent\.com\/mtialison\/klingo\/main\/klingo\.user\.js/);
  assert.doesNotMatch(main, /testes-codex/);
  assert.match(draft, /@name\s+klingo \(testes\)/);
  assert.match(draft, /@namespace\s+http:\/\/tampermonkey\.net\/klingo-testes/);
  assert.match(draft, /@updateURL\s+https:\/\/raw\.githubusercontent\.com\/mtialison\/klingo\/testes-codex\/klingo\.test\.user\.js/);
  assert.match(draft, /@downloadURL\s+https:\/\/raw\.githubusercontent\.com\/mtialison\/klingo\/testes-codex\/klingo\.test\.user\.js/);
});

test('versão publicada de testes sobe para 1.64', () => {
  const header = read('klingo.test.user.js').split('// ==/UserScript==')[0];
  assert.match(header, /^\/\/ @version\s+1\.64\s*$/m);
});

test('runtime reage a mudanças e executa só os módulos da rota ativa', () => {
  const code = read(path.join('src', '00-foundation.js')).split('function tmCaptureAttributes')[0];
  const listeners = new Map();
  const timers = [];
  const observers = [];
  const window = {
    location: { hash: '#/recepcao' },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    addEventListener(name, callback) { listeners.set(name, callback); }
  };
  const document = { body: {}, addEventListener() {} };
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(_target, options) { this.options = options; }
    takeRecords() { return []; }
  }
  const context = vm.createContext({ window, document, MutationObserver, console });
  vm.runInContext(code, context);
  const runtime = vm.runInContext('tmRuntime', context);
  const calls = [];
  runtime.register('global', () => calls.push('global'));
  runtime.register('recepcao', () => calls.push('recepcao'), ['#/recepcao']);
  runtime.register('confirmacao', () => calls.push('confirmacao'), ['#/call-center/confirmacao']);
  const flush = () => { while (timers.length) timers.shift()(); };

  flush();
  assert.deepEqual(calls, ['global', 'recepcao']);
  assert.equal(observers.length, 1);
  assert.equal(observers[0].options.childList, true);
  assert.equal(observers[0].options.subtree, true);
  assert.equal(observers[0].options.characterData, undefined);

  calls.length = 0;
  observers[0].callback();
  flush();
  assert.deepEqual(calls, ['global', 'recepcao']);

  calls.length = 0;
  window.location.hash = '#/call-center/confirmacao';
  listeners.get('hashchange')();
  flush();
  assert.deepEqual(calls, ['global', 'recepcao', 'confirmacao']);

  calls.length = 0;
  observers[0].callback();
  flush();
  assert.deepEqual(calls, ['global', 'confirmacao']);
});

test('cadastro do Call Center usa um observador de modal compartilhado', () => {
  const code = read(path.join('src', '03-modal-agendamento-primeira-vez.js')).split('(function ()')[0];
  const observers = [];
  let currentModal = null;
  const document = { documentElement: {}, getElementById() { return currentModal; } };
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.target = null; }
  }
  const context = vm.createContext({ document, MutationObserver, Set });
  vm.runInContext(code, context);
  const watch = vm.runInContext('tmBookingModalWatch', context);
  const first = [], second = [];
  watch.subscribe((modal) => first.push(modal));
  watch.subscribe((modal) => second.push(modal));
  assert.deepEqual(first, [null]);
  assert.deepEqual(second, [null]);

  currentModal = {};
  observers[1].callback();
  assert.deepEqual(first, [null, currentModal]);
  assert.deepEqual(second, [null, currentModal]);
  observers[0].callback();
  assert.equal(first.length, 3);
  assert.equal(second.length, 3);
  assert.equal(observers.length, 2);
});
