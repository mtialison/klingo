const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'src', '08-recepcao-novo-atendimento.js'), 'utf8');
const begin = script.indexOf('  function norm(value)');
const end = script.indexOf('  function extraCheckbox(modal)', begin);
const functions = script.slice(begin, end);

function fixture() {
  const toasts = [];
  let calls = 0;
  const cpf = { value: '', required: false, focus() { this.focused = true; },
    setAttribute(name, value) { this.attributes ??= {}; this.attributes[name] = value; },
    setCustomValidity(value) { this.customValidity = value; } };
  const email = { value: '', required: true, focus() { this.focused = true; },
    removeAttribute(name) { this.removedAttribute = name; },
    setCustomValidity(value) { this.customValidity = value; } };
  const modal = {
    isConnected: true,
    classList: { contains: () => true },
    querySelectorAll(selector) { return selector === 'small.form-text.text-muted' ? [
      { textContent: 'CPF', closest: (target) => target === '.modal' ? modal : { querySelector: () => cpf } },
      { textContent: 'e-mail', closest: (target) => target === '.modal' ? modal : { querySelector: () => email } }
    ] : []; },
    querySelector() { return null; }
  };
  const component = {
    origem: 'recep',
    marcar() { calls++; return 'salvo'; },
    $toast: { add(toast) { toasts.push(toast); } }
  };
  modal.__vue__ = component;
  const context = vm.createContext({
    document: {}, window: {}, getComputedStyle: () => ({ display: 'block' }),
    guardedBookings: new WeakSet(), bookingModals: new WeakMap(),
    validationAttempted: new WeakSet(), lastValidationToast: new WeakMap(),
    receptionBookingComponent: (target) => target.__vue__
  });
  vm.runInContext(functions, context);
  return {
    cpf, email, modal, component, toasts, context,
    guard: vm.runInContext('guardReceptionBooking', context),
    validate: vm.runInContext('validateRequiredReceptionFields', context),
    calls: () => calls
  };
}

test('CPF vazio bloqueia a conclusão, mas e-mail vazio é permitido na Recepção', () => {
  const f = fixture();
  f.guard(f.modal);
  assert.equal(f.component.marcar(), undefined);
  assert.equal(f.calls(), 0);
  assert.equal(f.toasts.length, 1);
  assert.equal(f.toasts[0].detail, 'O campo CPF é obrigatório.');
  assert.equal(f.cpf.focused, true);
  assert.equal(f.cpf.required, true);
  assert.equal(f.cpf.attributes['aria-required'], 'true');
  assert.equal(f.email.required, false);
  assert.equal(f.email.removedAttribute, 'aria-required');

  f.cpf.value = '084.864.457-36';
  assert.equal(f.component.marcar(), 'salvo');
  assert.equal(f.calls(), 1);
});

test('tentativa de concluir mostra spans nos seis campos obrigatórios, sem duplicar aviso', () => {
  const f = fixture();
  const names = ['Nome', 'Data de Nascimento', 'CPF', 'Sexo', 'Celular', 'Origem do Agendamento'];
  const controls = new Map();
  const classList = () => {
    const classes = new Set();
    return { add: name => classes.add(name), remove: name => classes.delete(name),
      contains: name => classes.has(name) };
  };
  const labels = names.map((name) => {
    const host = { classList: classList(), warning: null,
      querySelector() { return this.warning; }, appendChild(warning) { this.warning = warning; } };
    const control = { value: '', tagName: ['Sexo', 'Origem do Agendamento'].includes(name) ? 'SELECT' : 'INPUT',
      selectedOptions: [{ textContent: 'Selecione...' }], parentElement: host,
      classList: classList(), offsetTop: 0, offsetLeft: 0, offsetHeight: 29,
      setAttribute() {}, focus() {} };
    const field = { querySelector: () => control };
    controls.set(name, control);
    return { textContent: name, closest: target => target === '.modal' ? f.modal : field };
  });
  labels.push({ textContent: 'Nome Social', closest: target => target === '.modal' ? f.modal : {} });
  f.modal.querySelectorAll = selector => selector === 'small.form-text.text-muted' ? labels : [];
  f.context.document.createElement = () => ({ className: '', textContent: '', style: {},
    setAttribute() {}, remove() { this.removed = true; } });

  assert.equal(f.validate(f.modal), false);
  assert.equal(f.toasts.length, 1);
  assert.equal(f.toasts[0].detail, 'Verificar preenchimento dos campos obrigatórios.');
  for (const control of controls.values()) {
    assert.equal(control.parentElement.warning.textContent, '!');
    assert.equal(control.classList.contains('tm-recepcao-warning-control'), true);
  }
  f.validate(f.modal);
  assert.equal(f.toasts.length, 1);

  for (const control of controls.values()) {
    control.value = 'preenchido';
    control.selectedOptions[0].textContent = 'Opção';
  }
  assert.equal(f.validate(f.modal), true);
  for (const control of controls.values()) {
    assert.equal(control.parentElement.warning.removed, true);
    assert.equal(control.classList.contains('tm-recepcao-warning-control'), false);
  }
});

test('ficha existente sem campo CPF visível não bloqueia a Recepção', () => {
  const f = fixture();
  f.modal.querySelectorAll = selector => selector === 'small.form-text.text-muted' ? [
    { textContent: 'e-mail', closest: target => target === '.modal' ? f.modal :
      { querySelector: () => f.email } }
  ] : [];
  f.guard(f.modal);
  assert.equal(f.component.marcar(), 'salvo');
  assert.equal(f.email.required, false);
});

test('e-mail ainda não renderizado não bloqueia o agendamento', () => {
  const f = fixture();
  f.modal.querySelectorAll = selector => selector === 'small.form-text.text-muted' ? [
    { textContent: 'CPF', closest: target => target === '.modal' ? f.modal :
      { querySelector: () => f.cpf } }
  ] : [];
  f.cpf.value = '084.864.457-36';
  assert.equal(f.validate(f.modal), true);
  assert.equal(f.toasts.length, 0);
});
