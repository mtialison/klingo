const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
for (const file of ['10-recepcao-calendario-com-dias-de-atendimento-e-bl.js',
  '13-call-center-confirmacao-calendario-de-atendiment.js']) {
  test(`${file}: tooltip aparece só em bloqueios/feriados e sai quando a data muda`, () => {
    const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
    const slice = (first, last) => source.slice(source.indexOf(first), source.indexOf(last, source.indexOf(first)));
    const day = { dataset: { date: '2026-10-30' }, title: 'Tooltip anterior',
      setAttribute(name, value) { this[name] = value; },
      removeAttribute(name) { delete this[name]; } };
    const popover = { querySelectorAll: () => [day], querySelector: () => null, setAttribute() {} };
    const input = {};
    const state = { input, days: new Map(), loading: false, error: '' };
    const context = vm.createContext({ POPOVER_ID: 'calendar', state,
      document: { getElementById: () => popover },
      tmConfirmationCalendarAdapter: { read: () => ({ startInput: input }) } });
    const titleEnd = file.startsWith('10') ? '  function paintDays()' : '  function injectStyle()';
    const paintEnd = file.startsWith('10') ? '  function selectDate(' : '  function render()';
    vm.runInContext(slice('  function dayTitle(', titleEnd) + slice('  function paintDays()', paintEnd), context);
    for (const detail of [{ kind: 'blocked' }, { kind: 'blocked', holidayClosed: true, holiday: 'Feriado' },
      { kind: 'attendance', holiday: 'Feriado' }, { kind: 'booked', block: true }]) {
      state.days.set(day.dataset.date, detail);
      context.paintDays();
      assert.ok(day.title);
    }
    for (const detail of [undefined, { kind: '' }, { kind: 'attendance' }, { kind: 'booked' }]) {
      state.days.set(day.dataset.date, detail);
      context.paintDays();
      assert.ok(!day.title);
      assert.ok(day['aria-label'].includes(day.dataset.date));
    }
  });
}
