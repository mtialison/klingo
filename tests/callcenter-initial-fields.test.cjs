const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const start = script.indexOf('/* =========================\n   CALL CENTER - FOCO E SUGESTÕES INICIAIS');
const end = script.indexOf('/* =========================\n   CALL CENTER - RASCUNHOS EM ESPERA', start);
assert.ok(start >= 0 && end > start);

function setup() {
  const handlers = {};
  const styles = [];
  let job;
  class Element {
    constructor() { this.blurs = 0; }
    matches(selector) { return selector.includes('Operadora/Plano'); }
    closest(selector) { return this.matches(selector) ? this : null; }
    blur() { this.blurs++; }
  }
  const input = new Element();
  const document = {
    activeElement: input,
    addEventListener(type, handler) { handlers[type] = handler; },
    getElementById() { return styles[0] || null; },
    createElement() { return {}; },
    head: { appendChild(style) { styles.push(style); } },
    querySelector() { return input; }
  };
  vm.runInNewContext(script.slice(start, end), {
    Element, document, window: { location: { hash: '#/call-center' } },
    tmRuntime: { register(_name, callback) { job = callback; } }
  });
  return { handlers, styles, input, job: () => job() };
}

test('retira o foco automático, inclusive quando ocorre depois da montagem', () => {
  const { handlers, input, job } = setup();
  job();
  assert.equal(input.blurs, 1);
  handlers.focusin({ target: input });
  assert.equal(input.blurs, 2);
});

test('mantém o foco quando o usuário clica ou navega com Tab', () => {
  const { handlers, input, job } = setup();
  handlers.pointerdown({ target: input });
  handlers.focusin({ target: input });
  job();
  assert.equal(input.blurs, 0);

  handlers.focusout({ target: input });
  handlers.keydown({ key: 'Tab' });
  handlers.focusin({ target: input });
  assert.equal(input.blurs, 0);
});

test('oculta apenas listas fixas, não os resultados pesquisáveis', () => {
  const { styles, job } = setup();
  job();
  assert.match(styles[0].textContent, /Operadora\/Plano/);
  assert.match(styles[0].textContent, /Selecione o Procedimento/);
  assert.match(styles[0].textContent, /> \.col > ul\.list-group/);
  assert.doesNotMatch(styles[0].textContent, /autocomplete-results/);
});
