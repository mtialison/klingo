const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('restauração aguarda opção combinada remontada e preserva o estado salvo', () => {
  class Input {}
  class Select {
    constructor(options, value) {
      this.options = options.map(([textContent, value]) => ({ textContent, value }));
      this.value = value;
      this.events = [];
    }
    set value(value) { this.current = this.options.some(o => o.value === value) ? value : ''; }
    get value() { return this.current; }
    dispatchEvent(event) { this.events.push(event.type); }
  }
  const period = new Select([['Semana', 'week']], 'week');
  const status = new Select([['Aberto', '0'], ['Enviado', '6'], ['Todos os Status Ativos...', '']], '0');
  const dateKind = new Select([['Data de Agendamento', 'book'], ['Data de Abertura', 'open']], 'book');
  const queue = new Select([['Exames', '1'], ['Sem filtro por fila de autorização', '']], '1');
  const range = { type: 'week', value: '2026-W44' };
  const card = { querySelectorAll: q => q === 'select' ? [period, status, dateKind, queue] : [range],
    querySelector: () => range };
  const source = fs.readFileSync(path.join(__dirname, '../src/18-autorizacoes-filtros-iniciais.js'), 'utf8');
  const context = vm.createContext({ HTMLSelectElement: Select, HTMLInputElement: Input,
    Event: class { constructor(type) { this.type = type; } }, document: { addEventListener() {} },
    tmRuntime: { register() {} } });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.applyFilterState = applyFilterState;})();'), context);
  const saved = { period: 'week', status: 'tm-open-sent', dateKind: 'book', authorizationQueue: '1',
    range: '2026-W44', rangeType: 'week' };
  assert.equal(context.applyFilterState(card, saved).ready, false);
  assert.equal(status.value, '0');
  assert.equal(status.events.length, 0);
  status.options.splice(1, 0, { textContent: 'Aberto + Enviado', value: 'tm-open-sent' });
  assert.equal(context.applyFilterState(card, saved).ready, true);
  assert.equal(status.value, 'tm-open-sent');
  assert.deepEqual(status.events, ['input', 'change']);
  assert.equal(saved.status, 'tm-open-sent');
});
