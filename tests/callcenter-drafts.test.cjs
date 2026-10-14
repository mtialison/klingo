const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const start = script.indexOf("  const DOCK_ID = 'tm-callcenter-drafts';");
const end = script.indexOf("  tmRuntime.register('rascunhos de agendamento do Call Center'", start);
assert.ok(start >= 0 && end > start);

function setup() {
  const eventHandlers = {};
  const context = vm.createContext({
    window: { location: { hash: '#/call-center' }, setTimeout },
    document: { querySelectorAll: () => [], querySelector: () => null,
      addEventListener(type, handler) { eventHandlers[type] = handler; } },
    tmRuntime: { schedule() {} },
    console: { warn() {}, error() {} },
    eventHandlers
  });
  vm.runInContext(script.slice(start, end), context);
  vm.runInContext('render = () => {};', context);
  return context;
}

function booking() {
  const initialData = { paciente: null, plano: null, hora: '' };
  const initialProcedures = [];
  return {
    fluxo: 1,
    $route: { path: '/call-center' },
    $store: { state: { user: { id_usuario: 20 }, loading: false } },
    $data: { dados: initialData, procedimentos: initialProcedures },
    dados: initialData,
    procedimentos: initialProcedures,
    cadastro_temporario: { st_cod_pais: '55' },
    st_observacoes: '',
    marcacao_anexo: null,
    reiniciar() { this.fluxo = null; this.dados = { hora: '' }; this.procedimentos = []; },
    startFluxo(flow) { this.fluxo = flow; },
    $nextTick(callback) { callback(); },
    $forceUpdate() {},
    selecionarPaciente() {}
  };
}

test('resumo do rascunho mostra profissional, plano e data completos', () => {
  const context = setup();
  const summary = vm.runInContext(`label({
    dados: { plano: { search: 'ASSIM SAÚDE / RIOSERV MAX QC' } },
    cadastro_temporario: { st_nome: 'Paciente de teste' },
    procedimentos: [{
      procedimento: { search: 'CONSULTA MEDICA' },
      medico: { search: 'PAULO AFONSO ALVES DE SOUZA' },
      data: '2026-10-20', hora: '17:15'
    }]
  })`, context);
  assert.equal(summary.patient, 'Paciente de teste');
  assert.equal(summary.procedure, 'CONSULTA MEDICA');
  assert.equal(summary.professional, 'PAULO AFONSO ALVES DE SOUZA');
  assert.equal(summary.operator, 'ASSIM SAÚDE / RIOSERV MAX QC');
  assert.equal(vm.runInContext("selectedTimes({ procedimentos: [{ data: '2026-10-20', hora: '17:15' }] })[0]", context),
    '20/10/2026 às 17:15');
});

test('resumo informa profissional e operadora ainda não definidos', () => {
  const context = setup();
  const summary = vm.runInContext('label({ dados: {}, procedimentos: [] })', context);
  assert.equal(summary.professional, 'Profissional a definir');
  assert.equal(summary.operator, 'Operadora a definir');
});

test('restaura procedimento sem reaproveitar horário ou reserva', async () => {
  const context = setup();
  const vue = booking();
  vue.dados.plano = { search: 'Particular' };
  vue.dados.hora = '16:30';
  vue.procedimentos.push({
    procedimento: { search: 'CONSULTA MEDICA' },
    data: '2026-10-20', hora: '16:30', id_agenda: 123, slots: [456],
    repeticao: { hora: '16:30', base: 'X' }, selected: true
  });
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  assert.equal(vm.runInContext('drafts.length', context), 1);
  assert.equal(vue.fluxo, null);
  await vm.runInContext('resume(1)', context);
  assert.equal(vue.fluxo, 1);
  assert.equal(vue.dados.plano.search, 'Particular');
  assert.equal(vue.dados.hora, null);
  assert.equal(vue.procedimentos[0].procedimento.search, 'CONSULTA MEDICA');
  assert.equal(vue.procedimentos[0].data, null);
  assert.equal(vue.procedimentos[0].hora, null);
  assert.equal(vue.procedimentos[0].id_agenda, null);
  assert.equal(vue.procedimentos[0].slots, null);
  assert.equal(vue.procedimentos[0].repeticao.hora, null);
  assert.equal(vue.procedimentos[0].repeticao.base, null);
  assert.equal(vm.runInContext('drafts.length', context), 0);
});

test('não cria dois rascunhos enquanto o reinício está pendente', async () => {
  const context = setup();
  const vue = booking();
  vue.dados.plano = { search: 'Particular' };
  let finish;
  vue.reiniciar = () => new Promise(resolve => { finish = resolve; });
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  const first = vm.runInContext('save()', context);
  await vm.runInContext('save()', context);
  assert.equal(vm.runInContext('drafts.length', context), 1);
  finish();
  await first;
});

test('mantém vários rascunhos independentes na mesma aba', async () => {
  const context = setup();
  const vue = booking();
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  vue.dados.plano = { search: 'Plano A' };
  await vm.runInContext('save()', context);
  vue.fluxo = 1;
  vue.dados.plano = { search: 'Plano B' };
  await vm.runInContext('save()', context);
  assert.equal(vm.runInContext('drafts.length', context), 2);
  await vm.runInContext('resume(1)', context);
  assert.equal(vue.dados.plano.search, 'Plano A');
  assert.equal(vm.runInContext('drafts.length', context), 1);
  assert.equal(vm.runInContext('drafts[0].snapshot.dados.plano.search', context), 'Plano B');
});

test('retomada confere a vaga e abre só o cadastro com os dados preservados', async () => {
  const context = setup();
  const vue = booking();
  vue.dados.plano = { id_plano: 100, search: 'Particular' };
  vue.cadastro_temporario.st_nome = 'Paciente de teste';
  vue.procedimentos.push({
    procedimento: { id_procedimento: 200, search: 'Consulta' },
    data: '2026-10-20', hora: '16:30', id_agenda: 300, index: 0,
    medico: { id_pessoa: 400 }, id_unidade_operacao: 500, selected: true
  });
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  let modalOpen = false;
  let openedDayAgenda = false;
  let selectedSlot = null;
  context.document.querySelector = selector => selector === '#cadastroModal.show' && modalOpen ? {} : null;
  vue.datas = [];
  vue.buscarHorarios = () => {
    vue.horarios = [{
      data: '2026-10-20', hora: '16:30', status: 'livre', id_agenda: 300, index: 0,
      medico: { id_pessoa: 400 }, procedimento: { id_procedimento: 200 },
      id_unidade_operacao: 500
    }];
    vue.datas = ['2026-10-20'];
    vue.buscando = false;
  };
  vue.listaPacientes = () => { openedDayAgenda = true; };
  vue.selecionar_horario = slot => { selectedSlot = slot; modalOpen = true; };
  await vm.runInContext('resume(1)', context);
  assert.equal(openedDayAgenda, false);
  assert.equal(selectedSlot.id_agenda, 300);
  assert.equal(vue.cadastro_temporario.st_nome, 'Paciente de teste');
  assert.equal(vm.runInContext('drafts.length', context), 0);
});

test('sem horário salvo, atualiza a lista sem abrir a agenda completa do dia', async () => {
  const context = setup();
  const vue = booking();
  vue.procedimentos.push({ procedimento: { search: 'Consulta' } });
  let openedDayAgenda = false;
  vue.listaPacientes = () => { openedDayAgenda = true; };
  vue.buscarHorarios = () => {
    vue.horarios = [];
    vue.datas = ['2026-10-20'];
    vue.buscando = false;
  };
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  const status = await vm.runInContext("restoreDate(vue, { date: '2026-10-20' })", context);
  assert.equal(openedDayAgenda, false);
  assert.match(status, /Escolha uma vaga disponível na lista/);
});

test('vaga ocupada não é reservada automaticamente', async () => {
  const context = setup();
  const vue = booking();
  vue.dados.plano = { search: 'Particular' };
  vue.procedimentos.push({ data: '2026-10-20', hora: '16:30', id_agenda: 300,
    procedimento: { search: 'Consulta' }, selected: true });
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  let called = false;
  vue.buscarHorarios = () => { vue.horarios = [{ data: '2026-10-20', hora: '16:30',
    status: 'ocupado', id_agenda: 300 }]; vue.buscando = false; };
  vue.selecionar_horario = () => { called = true; };
  await vm.runInContext('resume(1)', context);
  assert.equal(called, false);
  assert.match(vm.runInContext('notice', context), /não está livre/);
  assert.equal(vue.dados.plano.search, 'Particular');
});

test('recusa anexos e buscas em andamento', () => {
  const context = setup();
  const vue = booking();
  vue.dados.plano = { search: 'Particular' };
  context.vue = vue;
  vue.buscando_paciente = true;
  assert.throws(() => vm.runInContext('capture(vue)', context), /busca em andamento/);
  vue.buscando_paciente = false;
  vue.marcacao_anexo = { name: 'laudo.pdf' };
  assert.throws(() => vm.runInContext('capture(vue)', context), /Anexos/);
});

test('mantém o rascunho quando a conferência do paciente falha', async () => {
  const context = setup();
  const vue = booking();
  vue.dados.paciente = { id_pessoa: 456, st_nome: 'Paciente de teste' };
  vue.axios = { post: async () => { throw new Error('Serviço indisponível'); } };
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  await vm.runInContext('resume(1)', context);
  assert.equal(vm.runInContext('drafts.length', context), 1);
  assert.equal(vue.fluxo, null);
  assert.match(vm.runInContext('notice', context), /Serviço indisponível/);
});

test('apaga rascunhos em memória se a sessão mudar de usuário', async () => {
  const context = setup();
  const vue = booking();
  vue.dados.plano = { search: 'Particular' };
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  vue.$store.state.user.id_usuario = 21;
  assert.equal(vm.runInContext('checkOwner(vue)', context), true);
  assert.equal(vm.runInContext('drafts.length', context), 0);
});

test('identifica o usuário pelo header mesmo fora do Call Center', () => {
  const context = setup();
  const parent = { parentElement: null, __vue__: { $store: { state: { user: { id_usuario: 20 } } } } };
  const nav = { parentElement: parent };
  context.document.querySelector = selector => selector === 'nav.navbar' ? nav : null;
  assert.equal(vm.runInContext('headerUserId()', context), '20');
});

test('localiza o componente e move o botão do modal oculto para o rodapé visível do cadastro', () => {
  const context = setup();
  const vue = booking();
  vue.$options = { methods: { marcar() {} } };
  const root = { __vue__: vue, parentElement: null };
  const hiddenFooter = {};
  let modalButton = { parentElement: hiddenFooter, remove() { modalButton = null; } };
  const footer = {
    prepend(button) { button.parentElement = this; modalButton = button; }
  };
  const modal = {
    parentElement: root,
    querySelector(selector) {
      if (selector === '.modal-footer') return hiddenFooter;
      return selector === ':scope > .modal-dialog > .modal-content > .modal-footer' ? footer : null;
    }
  };
  context.document.getElementById = id =>
    id === 'cadastroModal' ? modal : id === 'tm-callcenter-draft-modal-save' ? modalButton : null;
  context.document.createElement = tag => ({
    tag, addEventListener(event, callback) { this[event] = callback; }
  });
  assert.equal(vm.runInContext('component()', context), vue);
  assert.equal(vm.runInContext('safeFlow(component())', context), true);
  vm.runInContext('ensureModalSave(safeFlow(component()))', context);
  assert.equal(modalButton.parentElement, footer);
  assert.equal(modalButton.textContent, 'Colocar em espera');
  assert.equal(modalButton.type, 'button');
});

test('clique no botão recriado mantém a lista aberta; clique fora a fecha', () => {
  const context = setup();
  vm.runInContext('open = true;', context);
  context.eventHandlers.click({
    target: { closest: () => null },
    composedPath: () => [{ id: 'tm-callcenter-drafts' }, { id: '' }]
  });
  assert.equal(vm.runInContext('open', context), true);
  context.eventHandlers.click({ target: { closest: () => null }, composedPath: () => [] });
  assert.equal(vm.runInContext('open', context), false);
});

test('guarda a data preferida mesmo sem vaga previamente escolhida', () => {
  const context = setup();
  const vue = booking();
  vue.exibicao = { '2026-10-20': [] };
  vue.selecao = { dia: 0 };
  context.vue = vue;
  const preferred = vm.runInContext('preferredSlot(vue)', context);
  assert.equal(preferred.date, '2026-10-20');
  assert.equal(preferred.time, undefined);
});

test('retomar em outro módulo navega ao Call Center antes de restaurar', async () => {
  const context = setup();
  const vue = booking();
  vue.dados.plano = { search: 'Particular' };
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  context.window.location.hash = '#/relatorios';
  vm.runInContext('component = () => null;', context);
  await vm.runInContext('resume(1)', context);
  assert.equal(context.window.location.hash, '#/call-center');
  assert.equal(vm.runInContext('pendingResume', context), 1);
  assert.equal(vm.runInContext('drafts.length', context), 1);
});
