const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', '03-modal-agendamento-primeira-vez.js'), 'utf8');
const start = source.indexOf('  function tmCadIsValidCpf(value) {');
const end = source.indexOf('  function tmCadValidateCpf(', start);
assert.ok(start >= 0 && end > start);
const isValidCpf = vm.runInNewContext(`${source.slice(start, end)}\ntmCadIsValidCpf`);
const validateEnd = source.indexOf('  function tmCadIsPrimeiraVez(', end);
assert.ok(validateEnd > end);

test('CPF do agendamento exige dígitos verificadores válidos e rejeita sequências repetidas', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('123.456.789-09'), true);
  assert.equal(isValidCpf(''), false);
  assert.equal(isValidCpf('529.982.247-24'), false);
  for (let digit = 0; digit <= 9; digit += 1) {
    assert.equal(isValidCpf(String(digit).repeat(11)), false);
  }
});

test('confirmação é bloqueada quando CPF falta ou é inválido', () => {
  const input = {
    value: '', message: '', focused: false, reported: false,
    setCustomValidity(message) { this.message = message; },
    focus() { this.focused = true; },
    reportValidity() { this.reported = true; }
  };
  const modal = {};
  const event = {
    prevented: false, stopped: false,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; }
  };
  const validate = vm.runInNewContext(`${source.slice(end, validateEnd)}\ntmCadValidateCpf`, {
    tmCadIsPrimeiraVez: () => true,
    tmCadFieldByLabel: () => ({ querySelector: () => input }),
    tmCadIsValidCpf: isValidCpf
  });

  assert.equal(validate(modal, event), false);
  assert.equal(input.message, 'O campo CPF é obrigatório.');
  assert.equal(input.focused && input.reported && event.prevented && event.stopped, true);

  input.value = '111.111.111-11';
  assert.equal(validate(modal, event), false);
  assert.equal(input.message, 'Informe um CPF válido.');

  input.value = '529.982.247-25';
  assert.equal(validate(modal, event), true);
  assert.equal(input.message, '');
});

test('layout de primeira vez oculta e-mail e coloca a origem no espaço dele', () => {
  assert.match(source, /tmCadHideField\(email\)/);
  assert.match(source, /tmCadPlaceOrigemInDados\(modal, origem\)/);
  assert.match(source, /\.tm-cad-order-origem\s*\{\s*grid-column: 2 \/ 4 !important;\s*grid-row: 3 !important;/);
  assert.match(source, /\.tm-cad-origem-title-hidden\s*\{\s*display: none !important;/);
  assert.match(source, /\^Confirmar\$/);
});
