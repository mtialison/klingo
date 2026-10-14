const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const start = script.indexOf('/* =========================\n   RECEPÇÃO E CONFIRMAÇÃO - OCULTAR PRÉVIA');
const end = script.indexOf('/* =========================\n   CALL CENTER / CONFIRMAÇÃO - ADAPTADOR', start);
assert.ok(start >= 0 && end > start);

function element() {
  const classes = new Set();
  return { classList: {
    add: (value) => classes.add(value),
    remove: (value) => classes.delete(value),
    contains: (value) => classes.has(value)
  } };
}

function setup(route) {
  const group = element(), divider = element();
  divider.matches = (selector) => selector === 'hr';
  group.previousElementSibling = divider;
  group.querySelector = (selector) => selector === ':scope > .card > .card-body.small.p-2 a.card-link' ? {} : null;
  const unrelated = element();
  unrelated.querySelector = () => null;
  const scoped = { querySelectorAll: () => [group] };
  const styles = new Map();
  const document = {
    querySelector(selector) {
      if (selector !== '#refresh-button') return null;
      return { closest: (target) => target === '.card.dashcard' ? { parentElement: scoped } : null };
    },
    querySelectorAll(selector) {
      if (selector === '.card-group') return [unrelated, group];
      if (selector === '.tm-agenda-previa-oculta') return [group, divider];
      return [];
    },
    getElementById(id) { return styles.get(id) || null; },
    createElement() { return { remove() { styles.delete(this.id); } }; },
    head: { appendChild(style) { styles.set(style.id, style); } }
  };
  const window = { location: { hash: route } };
  let run;
  vm.runInNewContext(script.slice(start, end), {
    document, window, tmRuntime: { register(_name, callback) { run = callback; } }
  });
  return { run, window, group, divider, unrelated, styles };
}

test('oculta a prévia na Confirmação e o divisor imediatamente anterior', () => {
  const page = setup('#/call-center/confirmacao');
  page.run();
  assert.equal(page.group.classList.contains('tm-agenda-previa-oculta'), true);
  assert.equal(page.divider.classList.contains('tm-agenda-previa-oculta'), true);
  assert.equal(page.unrelated.classList.contains('tm-agenda-previa-oculta'), false);
  assert.equal(page.styles.has('tm-agenda-previa-style'), true);
});

test('mantém a ocultação na Recepção e restaura fora das duas abas', () => {
  const page = setup('#/recepcao');
  page.run();
  assert.equal(page.group.classList.contains('tm-agenda-previa-oculta'), true);
  page.window.location.hash = '#/call-center';
  page.run();
  assert.equal(page.group.classList.contains('tm-agenda-previa-oculta'), false);
  assert.equal(page.divider.classList.contains('tm-agenda-previa-oculta'), false);
  assert.equal(page.styles.has('tm-agenda-previa-style'), false);
});
