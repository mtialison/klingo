const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', '03-modal-agendamento-primeira-vez.js'), 'utf8');
function sourceFunction(name, nextName, context = {}) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf(`  function ${nextName}(`, start);
  assert.ok(start >= 0 && end > start, `${name} não encontrado`);
  return vm.runInNewContext(`${source.slice(start, end)}\n${name}`, context);
}

const isValidCpf = sourceFunction('tmCadIsValidCpf', 'tmCadPhoneInvalid');
const phoneInvalid = sourceFunction('tmCadPhoneInvalid', 'tmCadRequiredProblems');

test('CPF exige dígitos verificadores válidos e rejeita sequências repetidas', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('123.456.789-09'), true);
  assert.equal(isValidCpf(''), false);
  assert.equal(isValidCpf('529.982.247-24'), false);
  for (let digit = 0; digit <= 9; digit += 1) {
    assert.equal(isValidCpf(String(digit).repeat(11)), false);
  }
});

test('celular vazio, curto ou rejeitado pela validação nativa é inválido', () => {
  assert.equal(phoneInvalid({ value: '' }), true);
  assert.equal(phoneInvalid({ value: '(21) 9999-999' }), true);
  assert.equal(phoneInvalid({ value: '(21) 99999-9999' }), false);
  assert.equal(phoneInvalid({ value: '(21) 99999-9999', validity: { valid: false } }), true);
});

test('identifica todos os campos obrigatórios ausentes ou malformados', () => {
  const controls = {
    Nome: { value: '', tagName: 'INPUT' },
    'Data de Nascimento': { value: '', tagName: 'INPUT' },
    CPF: { value: '', tagName: 'INPUT' },
    Celular: { value: '', tagName: 'INPUT' },
    'Origem de Pacientes|Origem do Agendamento': { value: '', tagName: 'SELECT' },
    Sexo: { value: '', tagName: 'SELECT', selectedOptions: [{ textContent: 'Selecione uma opção' }] }
  };
  const classify = sourceFunction('tmCadRequiredProblems', 'tmCadSetRequiredWarning', {
    tmCadFieldByLabel: (_modal, label) => ({ querySelector: () => controls[label] }),
    tmCadNorm: (value) => String(value || '').trim(),
    tmCadIsValidCpf: isValidCpf,
    tmCadPhoneInvalid: phoneInvalid
  });
  const problems = classify({});
  assert.deepEqual(Array.from(problems, (item) => item.key), ['nome', 'nascimento', 'cpf', 'celular', 'origem', 'sexo']);
  assert.equal(problems.every((item) => item.missing), true);

  controls.Nome.value = 'Alison';
  controls['Data de Nascimento'].value = '1999-12-07';
  controls.CPF.value = '111.111.111-11';
  controls.Celular.value = '(21) 99999-9999';
  controls['Origem de Pacientes|Origem do Agendamento'].value = '1';
  controls.Sexo.value = 'M';
  controls.Sexo.selectedOptions[0].textContent = 'Masculino';
  const updated = classify({});
  assert.deepEqual(Array.from(updated.filter((item) => item.malformed), (item) => item.key), ['cpf']);
  assert.equal(updated.some((item) => item.missing), false);
});

test('aviso é geral para campos vazios e específico somente para erro isolado de formato', () => {
  const notices = [];
  const warnings = [];
  const focused = [];
  const fields = (states) => states.map(([key, missing, malformed]) => ({
    key, missing, malformed, control: { focus: () => focused.push(key) }
  }));
  let problems = fields([
    ['nome', true, false], ['cpf', true, false], ['celular', true, false],
    ['origem', true, false], ['sexo', true, false]
  ]);
  const validate = sourceFunction('tmCadValidateRequiredFields', 'tmCadIsPrimeiraVez', {
    tmCadIsPrimeiraVez: () => true,
    tmCadRequiredProblems: () => problems,
    tmCadRefreshRequiredWarnings: (_modal, force) => warnings.push(force),
    tmCadBookingComponent: () => ({ $toast: { add: (notice) => notices.push(notice) } })
  });
  const modal = { dataset: {} };
  const event = {
    prevented: false, stopped: false,
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; }
  };

  assert.equal(validate(modal, event), false);
  assert.equal(notices[0].detail, 'Verificar preenchimento dos campos.');
  assert.equal(notices[0].summary, 'Atenção');
  assert.equal(warnings[0], true);
  assert.equal(focused[0], 'nome');
  assert.equal(event.prevented && event.stopped, true);

  problems = fields([['cpf', false, true]]);
  assert.equal(validate(modal, event), false);
  assert.equal(notices[1].detail, 'Informe um CPF válido.');

  problems = fields([['celular', false, true]]);
  assert.equal(validate(modal, event), false);
  assert.equal(notices[2].detail, 'Informe um celular válido.');

  problems = fields([['cpf', false, true], ['celular', false, true]]);
  assert.equal(validate(modal, event), false);
  assert.equal(notices[3].detail, 'Verificar preenchimento dos campos.');

  problems = fields([['cpf', false, false]]);
  assert.equal(validate(modal, event), true);
  assert.equal(notices.length, 4);
});

test('confirmação marca todos os campos inválidos, não apenas o CPF', () => {
  const marked = [];
  const problems = ['nome', 'nascimento', 'cpf', 'celular', 'origem', 'sexo'].map((key) => ({
    field: key, control: { dataset: {} }, missing: true, malformed: false
  }));
  const refresh = sourceFunction('tmCadRefreshRequiredWarnings', 'tmCadBookingComponent', {
    tmCadIsPrimeiraVez: () => true,
    tmCadRequiredProblems: () => problems,
    tmCadSetRequiredWarning: (field, _control, invalid) => marked.push([field, invalid])
  });
  refresh({}, true);
  assert.deepEqual(marked, problems.map(({ field }) => [field, true]));
});

test('sair de um campo antes de confirmar não exibe o indicador', () => {
  const marked = [];
  const refresh = sourceFunction('tmCadRefreshRequiredWarnings', 'tmCadBookingComponent', {
    tmCadIsPrimeiraVez: () => true,
    tmCadRequiredProblems: () => [{ field: 'cpf', control: { dataset: { tmCadTouched: '1' } }, missing: true, malformed: false }],
    tmCadSetRequiredWarning: (_field, _control, invalid) => marked.push(invalid)
  });
  refresh({}, false);
  assert.deepEqual(marked, [false]);
  assert.doesNotMatch(source, /\['focusout', 'input', 'change'\]/);
});

test('usa o serviço de notificações nativo no componente do Call Center', () => {
  const findComponent = sourceFunction('tmCadBookingComponent', 'tmCadValidateRequiredFields', {
    document: { querySelector: () => null, querySelectorAll: () => [] },
    tmCadNorm: (value) => String(value || '').trim()
  });
  const vue = { $route: { path: '/call-center' }, $toast: { add() {} } };
  const modal = { parentElement: { __vue__: vue, parentElement: null } };
  assert.equal(findComponent(modal), vue);
  assert.doesNotMatch(source, /reportValidity|window\.alert/);
});

test('layout oculta e-mail, move origem e desenha indicadores em todos os campos exigidos', () => {
  assert.match(source, /tmCadHideField\(email\)/);
  assert.match(source, /tmCadPlaceOrigemInDados\(modal, origem\)/);
  assert.match(source, /\.tm-cad-order-origem\s*\{\s*grid-column: 2 \/ 4 !important;\s*grid-row: 3 !important;/);
  assert.match(source, /\.tm-cad-origem-title-hidden\s*\{\s*display: none !important;/);
  assert.match(source, /\.tm-cad-required-warning\.tm-cad-warning-visible/);
  assert.match(source, /tmCadRefreshRequiredWarnings\(modal, true\)/);
  assert.match(source, /\.tm-cad-order-nascimento, \.tm-cad-order-cpf/);
});

test('máscara de nascimento aceita oito dígitos e deixa corrigir dia, mês e ano', () => {
  const mask = sourceFunction('tmCadBirthDateMask', 'tmCadEnableBirthDateText');
  const display = sourceFunction('tmCadBirthDateText', 'tmCadBirthDateMask');
  assert.equal(mask('0'), '0');
  assert.equal(mask('0712'), '07/12');
  assert.equal(mask('07121999'), '07/12/1999');
  assert.equal(mask('071219999'), '07/12/1999');
  assert.equal(mask('08/12/1999'), '08/12/1999');
  assert.equal(mask('08/12/2000'), '08/12/2000');
  assert.equal(display('1999-12-07'), '07/12/1999');
  assert.equal(display(''), '');
  assert.match(source, /native\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\)/);
  assert.match(source, /native\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
});

test('nascimento textual sincroniza a data real do Klingo e preserva o calendário', () => {
  const handlers = {};
  const emitted = [];
  const text = {
    value: '', selectionStart: 0,
    setAttribute() {}, setSelectionRange() {},
    setCustomValidity(value) { this.validationMessage = value; },
    addEventListener(type, fn) { handlers[type] = fn; }
  };
  const group = { querySelector: () => group.text || null };
  const native = {
    value: '', dataset: {}, parentElement: group,
    classList: { add() {} }, setAttribute() {},
    before(input) { group.text = input; },
    addEventListener() {},
    dispatchEvent(event) { emitted.push(event.type); }
  };
  const field = { querySelector: () => native };
  const document = { activeElement: null, createElement: () => text };
  const enable = sourceFunction('tmCadEnableBirthDateText', 'tmCadEnableDatePastes', {
    document, Event,
    tmCadBirthDateText: sourceFunction('tmCadBirthDateText', 'tmCadBirthDateMask'),
    tmCadBirthDateMask: sourceFunction('tmCadBirthDateMask', 'tmCadEnableBirthDateText'),
    tmCadParseClipboardDate: (value) => ({
      '07/12/1999': '1999-12-07',
      '08/12/1999': '1999-12-08'
    })[value] || ''
  });
  enable(field);
  document.activeElement = text;
  text.value = '07121999';
  text.selectionStart = 8;
  handlers.input();
  assert.equal(text.value, '07/12/1999');
  assert.equal(native.value, '1999-12-07');
  assert.deepEqual(emitted, ['input', 'change']);

  text.value = '08/12/1999';
  text.selectionStart = 2;
  handlers.input();
  assert.equal(native.value, '1999-12-08');
  assert.deepEqual(emitted, ['input', 'change', 'input', 'change']);

  text.value = '31/02/1999';
  handlers.input();
  assert.equal(native.value, '');
  assert.equal(text.validationMessage, 'Data de nascimento inválida.');
  assert.match(source, /\.tm-cad-order-nascimento \.input-group > input\.tm-cad-birth-date-picker \{[\s\S]*?flex: 0 0 34px !important;[\s\S]*?height: 29px !important;/);
  assert.match(source, /tm-cad-birth-date-picker::-webkit-calendar-picker-indicator/);
});

test('oculta apenas o seletor BR do celular, preservando o campo de número', () => {
  const classes = [];
  const wrapper = { classList: { add: (name) => classes.push(name) } };
  const country = { textContent: 'BR', closest: () => wrapper };
  const field = {
    querySelectorAll: () => [country],
    contains: (element) => element === wrapper
  };
  const hide = sourceFunction('tmCadHidePhoneCountry', 'tmCadPlaceOrigemInDados', {
    tmCadNorm: (value) => String(value || '').trim()
  });
  hide(field);
  assert.deepEqual(classes, ['tm-cad-phone-country-hidden']);
  assert.match(source, /\.tm-cad-order-celular \.input-group-prepend,/);
  assert.match(source, /\.tm-cad-order-celular \.tm-cad-phone-country-hidden \{\s*display: none !important;/);
});
