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
  const cpf = { value: '', focus() { this.focused = true; }, setAttribute() {} };
  const email = { value: '', focus() { this.focused = true; }, setAttribute() {} };
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
    receptionBookingComponent: (target) => target.__vue__
  });
  vm.runInContext(functions, context);
  return {
    cpf, email, modal, component, toasts,
    guard: vm.runInContext('guardReceptionBooking', context),
    validate: vm.runInContext('validateRequiredReceptionFields', context),
    calls: () => calls
  };
}

test('CPF e e-mail vazios bloqueiam conclusão também pela ação direta do componente', () => {
  const f = fixture();
  f.guard(f.modal);
  assert.equal(f.component.marcar(), undefined);
  assert.equal(f.calls(), 0);
  assert.equal(f.toasts.length, 2);
  assert.equal(f.cpf.focused, true);
  assert.equal(f.cpf.required, true);
  assert.equal(f.email.required, true);

  f.cpf.value = '12345678901';
  f.email.value = 'paciente@example.com';
  f.guard(f.modal);
  assert.equal(f.component.marcar(), 'salvo');
  assert.equal(f.calls(), 1);
});

test('validação falha de modo seguro se um campo ainda não foi renderizado', () => {
  const f = fixture();
  f.modal.querySelectorAll = () => [];
  assert.equal(f.validate(f.modal), false);
  assert.equal(f.toasts.length, 2);
  assert.equal(f.calls(), 0);
});
