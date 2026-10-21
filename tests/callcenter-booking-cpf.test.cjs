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
    tmCadBookingComponent: () => ({ $toast: { add: (notice) => notices.push(notice) } }),
    tmCadGuardCpfLookup: () => true
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

test('vincula somente uma ficha com CPF completo e id de pessoa válido', () => {
  const cpfDigits = sourceFunction('tmCadCpfDigits', 'tmCadExactCpfRecords');
  const exact = sourceFunction('tmCadExactCpfRecords', 'tmCadSelectExactCpf', { tmCadCpfDigits: cpfDigits });
  const cpf = '52998224725';
  const records = [
    { id_pessoa: 12, st_cpf: '529.982.247-25' },
    { id_pessoa: 13, st_cpf: '123.456.789-09' },
    { id_pessoa: -1, st_cpf: cpf }
  ];
  assert.deepEqual(exact(records, cpf).map((item) => item.id_pessoa), [12]);
  assert.deepEqual(exact(records, '52998224724'), []);
});

test('a busca cobre cadastro temporário da recepção e edição, sem exigir CPF vazio', () => {
  const target = sourceFunction('tmCadIsCpfLookupTarget', 'tmCadCpfDigits', {
    tmCadIsPrimeiraVez: (modal) => modal.id === 'cadastroModal'
  });
  assert.equal(target({ id: 'cadastroModal' }), true);
  assert.equal(target({ id: 'novoAtendimento2Modal', querySelector: () => ({}) }), true);
  assert.equal(target({ id: 'editarMarcacaoModal', querySelector: () => ({}) }), true);
  assert.equal(target({ id: 'novoAtendimento2Modal', querySelector: () => null }), false);
});

test('consulta CPF sem aguardar sexo, nascimento ou celular e seleciona só o resultado exato', async () => {
  const cpf = '52998224725';
  const input = { value: '529.982.247-25' };
  const selected = [];
  let params;
  const component = {
    value: { st_cpf: cpf },
    lista: [],
    identificar_paciente(record) { selected.push(record.id_pessoa); },
    $util: { loadItem(_component, request) {
      params = request;
      return Promise.resolve({ pacientes: [
        { id_pessoa: 31, st_cpf: '12345678909' },
        { id_pessoa: 42, st_cpf: cpf }
      ] });
    } }
  };
  const modal = { isConnected: true, querySelector: () => ({ __vue__: component }) };
  const context = {
    cpfLookups: new WeakMap(),
    tmCadFieldByLabel: () => ({ querySelector: () => input }),
    tmCadIsPrimeiraVez: () => true,
    tmCadIsCpfLookupTarget: () => true,
    tmCadIsValidCpf: isValidCpf,
    tmCadCpfDigits: sourceFunction('tmCadCpfDigits', 'tmCadExactCpfRecords'),
    Promise
  };
  context.tmCadExactCpfRecords = sourceFunction('tmCadExactCpfRecords', 'tmCadSelectExactCpf', context);
  context.tmCadCadastroComponent = sourceFunction('tmCadCadastroComponent', 'tmCadCpfDigits', context);
  context.tmCadSelectExactCpf = sourceFunction('tmCadSelectExactCpf', 'tmCadLookupCpf', context);
  const lookup = sourceFunction('tmCadLookupCpf', 'tmCadGuardCpfLookup', context);
  const state = lookup(modal);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(params.service, 'pacientes');
  assert.equal(params.func, 'checar_existencia');
  assert.equal(params.parms.st_cpf, cpf);
  assert.deepEqual(selected, [42]);
  assert.equal(state.done, true);
  assert.equal(state.selectedCpf, cpf);
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

test('nascimento mantém somente o input date nativo, e cabeçalho usa 13px', () => {
  assert.doesNotMatch(source, /tm-cad-birth-date-text|tm-cad-birth-date-picker/);
  assert.match(source, /\['nascimento', 'Data de Nascimento', 'input\[type="date"\]'\]/);
  assert.match(source, /\.tm-cad-header-card \* \{[\s\S]*?font-size: 13px !important;/);
  assert.match(source, /\.tm-cad-header-sala \{\s*font-size: 13px !important;/);
});

test('ano nativo pode ser reescrito sem apagar dia e mês; setas voltam a outros segmentos', () => {
  const handlers = {};
  const emitted = [];
  const input = {
    value: '', dataset: {},
    addEventListener(type, fn) { handlers[type] = fn; },
    dispatchEvent(event) { emitted.push(event.type); }
  };
  const protect = sourceFunction('tmCadProtectBirthDate', 'tmCadEnableDatePastes', { Event });
  protect({ querySelector: () => input });
  for (const year of ['0001', '0019', '0199', '1999']) {
    input.value = `${year}-12-07`;
    handlers.input();
  }
  let prevented = false;
  handlers.keydown({ key: '2', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(input.value, '0002-12-07');
  for (const key of ['0', '0', '0']) handlers.keydown({ key, preventDefault() {} });
  assert.equal(input.value, '2000-12-07');
  assert.deepEqual(emitted, ['input', 'change', 'input', 'change', 'input', 'change', 'input', 'change']);

  handlers.keydown({ key: 'ArrowLeft' });
  prevented = false;
  handlers.keydown({ key: '1', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
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
