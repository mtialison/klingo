const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', '08-recepcao-novo-atendimento.js'), 'utf8');
const section = (from, to) => source.slice(source.indexOf(`  function ${from}(`),
  source.indexOf(`  function ${to}(`));

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.dataset = {};
    this.listeners = {};
    this.attributes = {};
    this.style = { display: '' };
    this.classList = {
      add: (...classes) => { this.className += ` ${classes.join(' ')}`; },
      remove: (name) => { this.className = this.className.split(/\s+/).filter((item) => item !== name).join(' '); }
    };
  }
  get nextElementSibling() {
    const children = this.parentElement?.children || [];
    return children[children.indexOf(this) + 1] || null;
  }
  appendChild(child) {
    if (child.parentElement) child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
    this.children.push(child); child.parentElement = this; return child;
  }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  insertBefore(child, next) {
    if (child.parentElement) child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
    const index = next ? this.children.indexOf(next) : this.children.length;
    this.children.splice(index, 0, child); child.parentElement = this;
  }
  setAttribute(name, value) { this.attributes[name] = value; this[name] = value; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  querySelector(selector) {
    const match = (item) => selector.startsWith('.') ? item.className.split(/\s+/).includes(selector.slice(1)) :
      item.tagName.toLowerCase() === selector;
    const pending = [...this.children];
    while (pending.length) {
      const item = pending.shift();
      if (match(item)) return item;
      pending.unshift(...item.children);
    }
    return null;
  }
}

test('ficha existente mostra Nome, Nascimento e CPF como leitura, antes do contato', () => {
  const root = new Element('div');
  const contact = new Element('div');
  root.appendChild(contact);
  const patient = { id_pessoa: 42, st_nome: 'Paciente teste',
    cadastro: { dt_nascimento: '1981-03-14', st_cpf: '08486445736' } };
  const context = vm.createContext({ document: { createElement: tag => new Element(tag) },
    receptionBookingComponent: () => ({ dados: { paciente: patient } }),
    lastEnteredCpf: new WeakMap() });
  vm.runInContext(section('patientIdentity', 'requiredReceptionCpf'), context);
  vm.runInContext('showExistingIdentity', context)(root, contact);
  const row = root.querySelector('.tm-recepcao-existing-identity-row');
  assert.equal(row.nextElementSibling, contact);
  const fields = ['name', 'birth', 'cpf'].map((key) => row.querySelector(`.tm-recepcao-identity-${key}`));
  assert.deepEqual(fields.map((field) => field.querySelector('input').value),
    ['Paciente teste', '1981-03-14', '084.864.457-36']);
  for (const field of fields) {
    assert.equal(field.querySelector('input').readOnly, true);
    assert.equal(field.querySelector('input')['aria-readonly'], 'true');
  }
  const profile = fields[0].querySelector('.tm-recepcao-perfil-button');
  assert.equal(profile.title, 'Abrir perfil do paciente');
  assert.equal(profile.querySelector('i').className, 'fa-solid fa-id-badge');
  assert.match(fields[1].querySelector('.tm-recepcao-identity-age').textContent, /^\d+a$/);
});

test('ficha existente exibe Sexo e grava a seleção no cadastro que o Klingo valida', () => {
  const root = new Element('div');
  const contact = new Element('div');
  root.appendChild(contact);
  const patient = { id_pessoa: 42, st_nome: 'Paciente teste',
    cadastro: { dt_nascimento: '1981-03-14', st_cpf: '08486445736', ch_sexo: '' } };
  const updates = [];
  const component = { dados: { paciente: patient }, $set(target, key, value) {
    updates.push({ target, key, value }); target[key] = value;
  } };
  const context = vm.createContext({ document: { createElement: tag => new Element(tag) },
    receptionBookingComponent: () => component, lastEnteredCpf: new WeakMap(),
    refreshReceptionWarnings() {} });
  vm.runInContext(section('patientIdentity', 'requiredReceptionCpf'), context);
  vm.runInContext('showExistingIdentity', context)(root, contact);

  const row = root.querySelector('.tm-recepcao-existing-identity-row');
  const sexField = row.querySelector('.tm-recepcao-identity-sex');
  const select = sexField?.querySelector('select');
  assert.ok(select, 'o campo Sexo deve ser exibido como seletor');
  assert.equal(select.required, true);
  assert.deepEqual(select.children.map(option => [option.value, option.textContent]), [
    ['', 'Selecione uma opção'], ['M', 'Masculino'], ['F', 'Feminino'], ['I', 'Indefinido']
  ]);

  select.value = 'F';
  assert.equal(vm.runInContext('syncExistingPatientSex', context)(root, select), true);
  assert.equal(patient.cadastro.ch_sexo, 'F');
  assert.deepEqual(updates.map(({ key, value }) => [key, value]), [['ch_sexo', 'F']]);
  vm.runInContext('showExistingIdentity', context)(root, contact);
  assert.equal(select.value, 'F', 'a escolha deve sobreviver à atualização visual do modal');
});

test('seleção de Sexo sincroniza o modelo pelo fluxo delegado do modal', () => {
  const patient = { id_pessoa: 42, cadastro: { ch_sexo: '' } };
  const updates = [];
  const component = { dados: { paciente: patient }, $set(target, key, value) {
    updates.push([key, value]); target[key] = value;
  } };
  const select = { value: 'F' };
  const context = vm.createContext({ receptionBookingComponent: () => component });
  vm.runInContext(section('patientIdentity', 'requiredReceptionCpf'), context);

  const sync = vm.runInContext('syncExistingPatientSex', context);
  assert.equal(sync({}, select), true);
  assert.equal(patient.cadastro.ch_sexo, 'F');
  assert.deepEqual(updates, [['ch_sexo', 'F']]);
  assert.match(source, /function handleReceptionFieldEvent\(modal, event\) \{[\s\S]*?syncExistingPatientSex\(modal, event\.target\)/);
  assert.match(source, /for \(const eventName of \['input', 'change'\]\) \{[\s\S]*?handleReceptionFieldEvent\(modal, event\)/);
});

test('seleção de Sexo continua sendo salva quando os ajustes visuais estão suspensos', () => {
  const patient = { id_pessoa: 42, cadastro: { ch_sexo: '' } };
  const updates = [];
  const component = { dados: { paciente: patient }, $set(target, key, value) {
    updates.push([key, value]); target[key] = value;
  } };
  const select = { value: 'F', matches: selector => selector === 'select',
    closest: selector => selector.includes('.tm-recepcao-identity-sex') ? {} : null };
  const context = vm.createContext({
    receptionBookingComponent: () => component,
    fieldByLabel: () => null,
    lastEnteredCpf: new WeakMap(),
    refreshReceptionWarnings() {},
    observationStopped: true
  });
  vm.runInContext(section('syncExistingPatientSex', 'openReceptionPatientProfile'), context);

  assert.equal(vm.runInContext('handleReceptionFieldEvent', context)({}, { target: select }), undefined);
  assert.equal(patient.cadastro.ch_sexo, 'F');
  assert.deepEqual(updates, [['ch_sexo', 'F']]);
  const listenerStart = source.indexOf("for (const eventName of ['input', 'change']) {");
  const listenerEnd = source.indexOf('const discoveryObserver', listenerStart);
  const listeners = source.slice(listenerStart, listenerEnd);
  assert.match(listeners, /handleReceptionFieldEvent\(modal, event\)/);
  assert.doesNotMatch(listeners, /if\s*\(observationStopped\)\s*return/);
});

test('ficha existente mantém o sexo cadastrado selecionado e deixa o campo editável', () => {
  const root = new Element('div');
  const contact = new Element('div');
  root.appendChild(contact);
  const patient = { id_pessoa: 42, cadastro: { ch_sexo: 'M' } };
  const context = vm.createContext({ document: { createElement: tag => new Element(tag) },
    receptionBookingComponent: () => ({ dados: { paciente: patient }, $set(target, key, value) { target[key] = value; } }),
    lastEnteredCpf: new WeakMap(), refreshReceptionWarnings() {} });
  vm.runInContext(section('patientIdentity', 'requiredReceptionCpf'), context);
  vm.runInContext('showExistingIdentity', context)(root, contact);
  const select = root.querySelector('.tm-recepcao-identity-sex')?.querySelector('select');
  assert.equal(select?.value, 'M');
  assert.equal(select?.disabled, undefined);
});

test('identificação da ficha usa tamanho e tipografia dos campos nativos da Recepção', () => {
  assert.match(source, /\.tm-recepcao-existing-identity-row \.form-control,[\s\S]*?font-size: \.875rem !important/);
  assert.match(source, /\.tm-recepcao-existing-identity-row \.form-control,[\s\S]*?height: calc\(1\.5em \+ \.5rem \+ 2px\) !important/);
  assert.match(source, /\.tm-recepcao-perfil-append button \{[\s\S]*?font-size: \.875rem !important;[\s\S]*?height: calc\(1\.5em \+ \.5rem \+ 2px\) !important/);
});

test('identificação existente distribui Nome, nascimento, CPF e Sexo em quatro colunas', () => {
  assert.match(source, /\.tm-recepcao-identity-name,[\s\S]*?\.tm-recepcao-identity-sex \{\s*flex: 0 0 25% !important; max-width: 25% !important;/);
});

test('abrir histórico chama o perfil sem executar o clique nativo que fecha o agendamento', () => {
  const patient = { id_pessoa: 42 };
  const calls = [];
  const modal = {};
  const button = { title: 'Abrir perfil do paciente', closest: () => modal,
    classList: { contains: value => value === 'tm-recepcao-perfil-button' } };
  const event = { target: { closest: () => button },
    preventDefault: () => calls.push('preventDefault'),
    stopImmediatePropagation: () => calls.push('stopImmediatePropagation') };
  const context = vm.createContext({ MODAL_ID: 'novoAtendimento2Modal', norm: value => value,
    receptionBookingComponent: () => ({ dados: { paciente: patient },
      $root: { perfil: value => calls.push(value) } }) });
  vm.runInContext(section('openReceptionPatientProfile', 'alignReceptionBirth'), context);
  assert.equal(vm.runInContext('openReceptionPatientProfile', context)(modal, event), true);
  assert.deepEqual(calls, ['preventDefault', 'stopImmediatePropagation', patient]);
});

test('ficha vinculada oculta somente o cartão duplicado e a busca nativa do paciente', () => {
  const classes = () => { const selected = new Set(); return { selected,
    contains: value => selected.has(value), toggle: (value, active) => active ? selected.add(value) : selected.delete(value) }; };
  const nativeRow = { classList: classes() }, card = { classList: classes(), querySelector: () => ({}) };
  const button = { closest: () => nativeRow };
  const modal = { querySelector: () => button, querySelectorAll: () => [card] };
  const context = vm.createContext({ setClass: (element, name, active) => element.classList.toggle(name, active) });
  vm.runInContext(section('hideRedundantReceptionPatientControls', 'alignReceptionBirth'), context);
  const hide = vm.runInContext('hideRedundantReceptionPatientControls', context);
  hide(modal, true);
  assert.equal(nativeRow.classList.contains('tm-recepcao-hidden-native-patient-row'), true);
  assert.equal(card.classList.contains('tm-recepcao-hidden-patient-card'), true);
  hide(modal, false);
  assert.equal(nativeRow.classList.contains('tm-recepcao-hidden-native-patient-row'), false);
  assert.equal(card.classList.contains('tm-recepcao-hidden-patient-card'), false);
});

test('origem nativa removida pela troca de ficha é recolocada após o celular', () => {
  const owner = {};
  const field = { parentElement: null, classList: { remove() {} }, querySelector: () => ({}) };
  const row = { appendChild(child) { child.parentElement = this; } };
  const context = vm.createContext({ originRenderedField: field, originRenderedOwner: owner,
    receptionBookingComponent: () => owner, fieldByLabel: () => null, norm: value => String(value || '') });
  vm.runInContext(section('receptionOriginField', 'arrangeReceptionBookingFields'), context);
  assert.equal(vm.runInContext('receptionOriginField', context)({}, row), field);
  assert.equal(field.parentElement, row);
});

test('nascimento acompanha a altura e o topo do campo Nome sem pixel fixo', () => {
  const style = () => ({ values: {}, getPropertyValue(name) { return this.values[name] || ''; },
    setProperty(name, value) { this.values[name] = value; } });
  const pieces = Array.from({ length: 3 }, () => ({ style: style() }));
  const group = { style: style(), getBoundingClientRect: () => ({ top: 43, height: 32 }),
    querySelectorAll: () => pieces };
  const name = { getBoundingClientRect: () => ({ top: 40, height: 29.17 }) };
  const birth = { classList: { add() {} }, querySelector: () => group };
  const context = vm.createContext({ fieldByLabel: (_modal, label) =>
    label === 'Nome' ? { querySelector: () => name } : birth,
  getComputedStyle: () => ({ marginTop: '0px' }) });
  vm.runInContext(section('alignReceptionBirth', 'requiredReceptionCpf'), context);
  vm.runInContext('alignReceptionBirth', context)({});
  assert.equal(group.style.values.height, '29.17px');
  assert.equal(group.style.values['margin-top'], '-3px');
  assert.ok(pieces.every((piece) => piece.style.values.height === '29.17px'));
});

test('nascimento na Primeira Vez aceita colar data e atualiza o controle nativo', () => {
  const handlers = {}, dispatched = [];
  const input = { dataset: {}, value: '', addEventListener(name, handler) { handlers[name] = handler; },
    dispatchEvent(event) { dispatched.push(event.type); } };
  const field = { querySelector: () => input };
  const context = vm.createContext({ fieldByLabel: () => field,
    tmParseDateInput: () => '1981-03-14', Event: class { constructor(type) { this.type = type; } } });
  vm.runInContext(section('protectReceptionBirthDate', 'requiredReceptionCpf'), context);
  vm.runInContext('protectReceptionBirthDate', context)({});
  let prevented = false;
  handlers.paste({ clipboardData: { getData: () => '14/03/1981' },
    preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(input.value, '1981-03-14');
  assert.deepEqual(dispatched, ['input', 'change']);
});
