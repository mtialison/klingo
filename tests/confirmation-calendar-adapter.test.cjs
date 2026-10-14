const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const start = script.indexOf('const tmConfirmationCalendarAdapter = (() => {');
const end = script.indexOf('/* =========================\n   CALL CENTER / CONFIRMAÇÃO - CALENDÁRIO DE ATENDIMENTOS', start);
assert.ok(start >= 0 && end > start);

function setup() {
  const startInput = { value: '2026-10-14' };
  const endInput = { value: '2026-10-20' };
  const unrelatedDate = { value: '2027-01-01' };
  const unitSelect = { value: '5', options: [{ textContent: 'Unidades...' }] };
  const doctorSelect = { value: '42', options: [{ textContent: 'Todos os Médicos...' }] };
  const toolbar = {
    querySelectorAll(selector) {
      if (selector === 'input[type="date"]') return [startInput, endInput];
      if (selector === 'select') return [unitSelect, doctorSelect];
      return [];
    }
  };
  const refresh = { closest(selector) {
    if (selector === '.card.dashcard') return toolbar;
    if (selector === '.input-group') return { querySelector: () => startInput };
    return null;
  } };
  const handlers = {}, events = [];
  const document = {
    querySelector(selector) { return selector === '#refresh-button' ? refresh : unrelatedDate; },
    addEventListener(type, handler) { handlers[type] = handler; },
    dispatchEvent(event) { events.push(event); }
  };
  const window = { location: { hash: '#/call-center/confirmacao' } };
  let sync, scheduled = 0;
  const context = vm.createContext({
    document, window, CustomEvent: class { constructor(type, options) {
      this.type = type; this.detail = options.detail;
    } },
    tmRuntime: { register(_name, callback) { sync = callback; },
      schedule() { scheduled++; } }
  });
  vm.runInContext(script.slice(start, end), context);
  return { context, window, handlers, events, sync: () => sync(),
    scheduled: () => scheduled, startInput, endInput, unitSelect, doctorSelect };
}

test('lê somente os filtros e as duas datas da Confirmação', () => {
  const testPage = setup();
  const data = vm.runInContext('tmConfirmationCalendarAdapter.read()', testPage.context);
  assert.equal(data.startInput, testPage.startInput);
  assert.equal(data.endInput, testPage.endInput);
  assert.equal(data.context.unit, '5');
  assert.equal(data.context.doctor, '42');
  testPage.window.location.hash = '#/recepcao';
  assert.equal(vm.runInContext('tmConfirmationCalendarAdapter.read()', testPage.context), null);
});

test('publica mudanças de contexto sem consultar agendas ou alterar filtros', () => {
  const testPage = setup();
  testPage.sync();
  assert.equal(testPage.events.length, 1);
  assert.equal(testPage.events[0].type, 'tm-confirmacao-calendar-context');
  testPage.sync();
  assert.equal(testPage.events.length, 1);
  testPage.doctorSelect.value = '43';
  testPage.handlers.input({ target: testPage.doctorSelect });
  assert.equal(testPage.scheduled(), 0);
  assert.equal(testPage.events.length, 2);
  assert.equal(testPage.events[1].detail.doctor, '43');
  testPage.handlers.change({ target: testPage.doctorSelect });
  testPage.sync();
  assert.equal(testPage.events.length, 2, 'input/change/runtime não duplicam o disparo');
  testPage.window.location.hash = '#/call-center';
  testPage.sync();
  assert.equal(testPage.events[2].detail, null);
});
