const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', '08-recepcao-novo-atendimento.js'), 'utf8');

test('Recepção coloca origem após celular e oculta apenas o título azul', () => {
  const start = source.indexOf('  function setClass(element');
  const end = source.indexOf('  function requiredReceptionField(', start);
  const context = vm.createContext({});
  vm.runInContext(source.slice(start, end), context);

  const classes = (initial = []) => {
    const values = new Set(initial);
    return {
      contains: (name) => values.has(name),
      toggle(name, active) { if (active) values.add(name); else values.delete(name); }
    };
  };
  const email = { classList: classes() };
  const phone = { classList: classes() };
  const cellular = { classList: classes() };
  const origin = { classList: classes() };
  const contactRow = {
    classList: classes(['form-row']), children: [email, phone, cellular],
    contains(field) { return this.children.includes(field); },
    insertBefore(field, next) {
      field.parentElement.children = field.parentElement.children.filter((item) => item !== field);
      this.children.splice(next ? this.children.indexOf(next) : this.children.length, 0, field);
      field.parentElement = this;
    }
  };
  for (const field of contactRow.children) field.parentElement = contactRow;
  const oldRow = { children: [origin] };
  origin.parentElement = oldRow;
  const title = { classList: classes(), querySelector: () => null };
  const modal = {
    querySelectorAll(selector) {
      if (selector === 'small.form-text.text-muted') return [
        ['e-mail', email], ['Celular', cellular], ['Origem do Agendamento', origin]
      ].map(([textContent, field]) => ({ textContent, closest(target) {
        return target === '.modal' ? modal : field;
      } }));
      if (selector === '.border-bottom small') return [{ textContent: 'Origem do Agendamento',
        closest: () => title }];
      return [];
    }
  };

  vm.runInContext('arrangeReceptionBookingFields', context)(modal);
  assert.deepEqual(contactRow.children, [email, phone, cellular, origin]);
  assert.equal(origin.classList.contains('tm-recepcao-origem-col'), true);
  assert.equal(title.classList.contains('tm-recepcao-origem-titulo-oculto'), true);
});

test('Recepção oculta telefone também para paciente cadastrado e amplia observação', () => {
  assert.match(source, /const phone = fieldByLabel\(modal, 'Telefone'\);\s*if \(phone\) setClass\(phone, 'tm-recepcao-hidden-field', true\);/);
  assert.match(source, /setClass\(field, 'tm-recepcao-hidden-field', field === phone\)/);
  assert.match(source, /phoneInput\.required = false;/);
  assert.match(source, /\.form-row > \.tm-recepcao-origem-col \{\s*flex: 0 0 25% !important;\s*max-width: 25% !important;/);
  assert.match(source, /\.form-row > \.tm-recepcao-observacao-col \{\s*flex: 0 0 50% !important;\s*max-width: 50% !important;/);
});
