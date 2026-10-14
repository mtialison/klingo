const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const start = script.indexOf('  function bindDateCalculatorEvents() {');
const end = script.indexOf('  function tmDateCalcDisableCopyTooltip(', start);
assert.ok(start >= 0 && end > start);

function setup() {
  const listeners = {};
  const closeCalls = [];
  class Element {
    constructor(inside) { this.inside = inside; }
    closest() { return null; }
  }
  const panel = {
    classList: { contains: () => false },
    contains: (element) => element.inside
  };
  const context = vm.createContext({
    Element,
    document: {
      body: { dataset: {} },
      querySelectorAll: () => [],
      addEventListener: (type, handler) => { listeners[type] = handler; }
    },
    window: { addEventListener() {} },
    getDateCalculatorPanel: () => panel,
    setDateCalculatorOpen: (state) => closeCalls.push(state),
    tmDateCalcDisableCopyTooltip() {},
    scheduleDateCalculatorMenuRefresh() {},
    positionDateCalculatorPanel() {}
  });
  vm.runInContext(script.slice(start, end), context);
  vm.runInContext('bindDateCalculatorEvents()', context);
  return { listeners, closeCalls, Element };
}

test('clique dentro da calculadora não fecha a janela', () => {
  const { listeners, closeCalls, Element } = setup();
  listeners.click({ target: new Element(true) });
  assert.deepEqual(closeCalls, []);
});

test('clique fora da calculadora fecha a janela', () => {
  const { listeners, closeCalls, Element } = setup();
  listeners.click({ target: new Element(false) });
  assert.deepEqual(closeCalls, [false]);
});
