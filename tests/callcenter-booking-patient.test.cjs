const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', '04-modal-agendamento-paciente.js'), 'utf8');
function sourceFunction(name, nextName, context = {}) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf(`  function ${nextName}(`, start);
  assert.ok(start >= 0 && end > start, `${name} não encontrado`);
  return vm.runInNewContext(`${source.slice(start, end)}\n${name}`, context);
}

test('paciente existente mantém nascimento preenchido ao instalar a proteção', () => {
  const handlers = {};
  const input = {
    value: '1999-09-09', dataset: {},
    addEventListener(type, handler) { handlers[type] = handler; },
    dispatchEvent() {}
  };
  const field = { querySelector: () => input };
  const protect = sourceFunction('protectBirthDate', 'applyPacienteLayout', { Event });
  protect(field);
  protect(field);
  assert.equal(input.value, '1999-09-09');
  assert.deepEqual(Object.keys(handlers).sort(), ['focus', 'input', 'keydown', 'pointerdown']);

  handlers.keydown({ key: 'ArrowLeft' });
  assert.equal(input.value, '1999-09-09');
  handlers.pointerdown();
  assert.equal(input.value, '1999-09-09');
});

test('edição do ano do paciente preserva dia e mês e não bloqueia as setas', () => {
  const handlers = {};
  const input = {
    value: '1999-09-09', dataset: {},
    addEventListener(type, handler) { handlers[type] = handler; },
    dispatchEvent() {}
  };
  sourceFunction('protectBirthDate', 'applyPacienteLayout', { Event })({ querySelector: () => input });
  for (const year of ['0002', '0020', '0200', '2000']) {
    input.value = `${year}-09-09`;
    handlers.input();
  }
  let prevented = false;
  handlers.keydown({ key: '1', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(input.value, '0001-09-09');
  handlers.keydown({ key: 'ArrowLeft' });
  prevented = false;
  handlers.keydown({ key: '1', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
});

test('cabeçalho do paciente replica fonte, emojis, linhas e botão sobreposto', () => {
  assert.match(source, /\.tm-paciente-header-card \* \{\s*font-family: inherit !important;\s*font-size: 13px !important;\s*font-weight: 600 !important;/);
  assert.match(source, /icon\.textContent = '🩺'/);
  for (const emoji of ['👨‍⚕️', '💳', '🏥', '📅', '🕒']) assert.ok(source.includes(`'${emoji}'`));
  assert.match(source, /\.tm-paciente-header-time-line \{\s*margin-top: 2px !important;/);
  assert.match(source, /\.tm-paciente-header-ocupar \{\s*position: absolute !important;\s*right: 12px !important;\s*bottom: 10px !important;/);
  assert.match(source, /items\.forEach\(\(item\) => \{/);
});

test('origem mantém aviso e seletor na mesma linha, oculta só o título e compacta rodapé', () => {
  assert.match(source, /\.tm-paciente-origem \.input-group \{\s*display: flex !important;\s*flex-wrap: nowrap !important;/);
  assert.match(source, /\.tm-paciente-origem \.input-group > select\.form-control \{\s*flex: 1 1 auto !important;\s*width: 0 !important;/);
  assert.match(source, /small\.closest\('\.border-bottom\.hover-title-bg'\)/);
  assert.match(source, /if \(title && !title\.querySelector\('select, input'\)\)/);
  assert.match(source, /div\.mt-3\.mb-5 \{\s*height: auto !important;\s*min-height: 0 !important;/);
  assert.match(source, /div\.mt-3\.mb-5 > br \{\s*display: none !important;/);
});

test('telefone fica oculto sem apagar o valor e e-mail ocupa o espaço livre', () => {
  assert.match(source, /\.tm-paciente-telefone \{\s*display: none !important;/);
  assert.match(source, /\.tm-paciente-email \{\s*grid-column: 2 \/ 5 !important;/);
  assert.doesNotMatch(source, /telefone\.value\s*=/);
});

test('campos digitáveis do paciente usam a tipografia medida no fluxo Primeira Vez', () => {
  assert.match(source, /\.tm-paciente-dados-grid \.tm-paciente-field \.form-control \{\s*font-family: "Open Sans", "Helvetica Neue", sans-serif !important;\s*font-size: 13\.125px !important;\s*font-weight: 400 !important;\s*color: #495057 !important;/);
  assert.doesNotMatch(source, /\.tm-paciente-observacao-textarea \{[^}]*font-size: 13\.125px/s);
});

test('título Dados Pessoais replica a estrutura do outro fluxo sem duplicar', () => {
  const children = [];
  const createElement = (tag) => ({ tag, children: [], appendChild(node) { this.children.push(node); },
    append(...nodes) { this.children.push(...nodes); } });
  const dados = {
    firstChild: null,
    querySelector: () => children.find((node) => node.className?.includes('tm-paciente-dados-heading')),
    insertBefore(node) { children.unshift(node); }
  };
  const ensure = sourceFunction('ensurePersonalDataHeader', 'renamePatientName', {
    document: { createElement }
  });
  ensure(dados);
  ensure(dados);
  assert.equal(children.length, 1);
  assert.match(children[0].className, /border-bottom mb-1 d-flex justify-content-between hover-title-bg text-primary/);
  assert.equal(children[0].children[0].children[0].textContent, 'Dados Pessoais');
  assert.match(source, /\.tm-paciente-dados-grid > \.tm-paciente-dados-heading \{\s*grid-column: 1 \/ -1 !important;\s*grid-row: 1 !important;/);
});

test('rótulo Nome é visualmente renomeado sem confundir o fluxo Primeira Vez', () => {
  const label = { textContent: 'Nome do Paciente' };
  const rename = sourceFunction('renamePatientName', 'moveOrigem', {
    norm: (value) => String(value || '').trim()
  });
  rename({ querySelectorAll: () => [label] });
  assert.equal(label.textContent, 'Nome');
  assert.match(source, /baseline\.nameLabel\.element\.textContent = baseline\.nameLabel\.text/);
  const firstVisitSource = fs.readFileSync(path.join(__dirname, '..', 'src', '03-modal-agendamento-primeira-vez.js'), 'utf8');
  assert.match(firstVisitSource, /if \(modal\.classList\.contains\('tm-paciente-layout'\)\) return false;/);
});

test('Nome só identifica paciente existente quando o modal já está marcado como Paciente', () => {
  const isPaciente = sourceFunction('isPacienteModal', 'addField', {
    fieldByLabel(_modal, label) { return label === 'Nome do Paciente' ? null : {}; }
  });
  const modal = {
    id: 'cadastroModal', innerText: '',
    classList: { contains: (value) => value === 'tm-paciente-layout' }
  };
  assert.equal(isPaciente(modal), true);
  modal.classList.contains = () => false;
  assert.equal(isPaciente(modal), false);
});

test('título azul de origem é encontrado sem depender de maiúsculas', () => {
  let hidden = false;
  const title = {
    querySelector: () => null,
    classList: { add(value) { hidden = value === 'tm-paciente-origem-section-hidden'; } }
  };
  const modal = { querySelectorAll: () => [{
    innerText: 'Origem do Agendamento',
    closest: () => title
  }] };
  sourceFunction('hideOrigemSection', 'findObservacaoRow', {
    norm: (value) => String(value || '').trim()
  })(modal);
  assert.equal(hidden, true);
});

test('celular vazio é obrigatório independentemente do telefone preenchido', () => {
  const controls = {
    'Celular': { value: '', tagName: 'INPUT', validity: { valid: true } },
    'Nome do Paciente': { value: 'Teste', tagName: 'INPUT', validity: { valid: true } }
  };
  const fieldByLabel = (_modal, label) => controls[label] ? {
    querySelector() { return controls[label]; }
  } : null;
  const problems = sourceFunction('patientFieldProblems', 'patientSetWarning', {
    fieldByLabel, norm: (value) => String(value || '').trim()
  })({});
  assert.equal(problems.find(({ key }) => key === 'celular').missing, true);
  assert.equal(problems.some(({ key }) => key === 'telefone'), false);
});

test('sem input de celular renderizado a confirmação também é bloqueada', () => {
  const problems = sourceFunction('patientFieldProblems', 'patientSetWarning', {
    fieldByLabel: () => null, norm: (value) => String(value || '').trim()
  })({});
  assert.equal(problems.find(({ key }) => key === 'celular').missing, true);
});

test('confirmar bloqueia celular vazio e usa o balão nativo', () => {
  const notifications = [];
  let prevented = false;
  let stopped = false;
  let focused = false;
  const cellular = { key: 'celular', missing: true, malformed: false,
    control: { focus() { focused = true; } } };
  const modal = { dataset: {} };
  const validate = sourceFunction('patientValidateCellular', 'isPacienteModal', {
    isPacienteModal: () => true,
    patientRefreshWarnings() {},
    patientFieldProblems: () => [cellular],
    patientBookingComponent: () => ({ $toast: { add(value) { notifications.push(value); } } })
  });
  const allowed = validate(modal, {
    preventDefault() { prevented = true; },
    stopImmediatePropagation() { stopped = true; }
  });
  assert.equal(allowed, false);
  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(focused, true);
  assert.equal(modal.dataset.tmPacienteValidationAttempted, '1');
  assert.equal(notifications[0].detail, 'O campo celular é obrigatório.');
});

test('aviso adicional só é usado no celular após confirmar', () => {
  assert.match(source, /modal\.dataset\.tmPacienteValidationAttempted !== '1'\) return;/);
  const calls = [];
  sourceFunction('patientRefreshWarnings', 'patientBookingComponent', {
    patientFieldProblems: () => [
      { key: 'origem', control: {}, missing: true, malformed: false },
      { key: 'celular', control: {}, missing: true, malformed: false }
    ],
    patientSetWarning: (...args) => calls.push(args)
  })({ classList: { contains: () => true }, dataset: { tmPacienteValidationAttempted: '1' } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], true);
});

test('não cria segundo aviso quando o Klingo já exibe o indicador nativo', () => {
  let created = 0;
  let warningClass = null;
  const host = {
    querySelector: (selector) => selector.includes('input-group-prepend') ? {} : null,
    classList: { add() {} }
  };
  const control = {
    parentElement: host,
    classList: { toggle(_name, visible) { warningClass = visible; } }
  };
  sourceFunction('patientSetWarning', 'patientRefreshWarnings', {
    document: { createElement() { created += 1; return {}; } }, Math
  })(control, true);
  assert.equal(created, 0);
  assert.equal(warningClass, false);
  assert.match(source, /\.input-group:has\(> \.input-group-prepend > \.input-group-text\.invalid\) > \.tm-paciente-required-warning \{\s*display: none !important;/);
  assert.match(source, /\.tm-paciente-field \.input-group \{\s*display: flex !important;\s*flex-wrap: nowrap !important;/);
});

test('celular aceita apenas 10 ou 11 dígitos, sem sequência toda igual', () => {
  const values = ['11987654321', '(11) 98765-4321', '1132654321', '123456789', '11111111111'];
  const fieldByLabel = (_modal, label) => label === 'Celular' ? {
    querySelector: () => ({ value: values.shift(), tagName: 'INPUT', validity: { valid: true } })
  } : null;
  const problems = sourceFunction('patientFieldProblems', 'patientSetWarning', {
    fieldByLabel, norm: (value) => String(value || '').trim()
  });
  assert.equal(problems({}).find(({ key }) => key === 'celular').malformed, false);
  assert.equal(problems({}).find(({ key }) => key === 'celular').malformed, false);
  assert.equal(problems({}).find(({ key }) => key === 'celular').malformed, false);
  assert.equal(problems({}).find(({ key }) => key === 'celular').malformed, true);
  assert.equal(problems({}).find(({ key }) => key === 'celular').malformed, true);
});
