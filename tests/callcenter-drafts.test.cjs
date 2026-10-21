const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const start = script.indexOf("  const DOCK_ID = 'tm-callcenter-drafts';");
const end = script.indexOf("  tmRuntime.register('rascunhos de agendamento do Call Center'", start);
assert.ok(start >= 0 && end > start);

test('botão Em espera é atualizado em todas as páginas, não só no Call Center', () => {
  assert.match(script.slice(end, end + 150),
    /tmRuntime\.register\('rascunhos de agendamento do Call Center', ensureDrafts\);/);
});

test('mensagem da lista vazia preserva o texto da versão de testes atual', () => {
  assert.match(script, /empty\.textContent = 'Nenhuma marcação em espera';/);
});

function setup() {
  const eventHandlers = {};
  const windowHandlers = {};
  // As vagas de teste são de 20/10/2026; fixe o relógio para não expirarem.
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-19T12:00:00'])); }
    static now() { return new Date('2026-10-19T12:00:00').getTime(); }
  }
  const context = vm.createContext({
    Date: TestDate,
    window: { location: { hash: '#/call-center' }, setTimeout,
      addEventListener(type, handler) { windowHandlers[type] = handler; },
      removeEventListener(type, handler) {
        if (windowHandlers[type] === handler) delete windowHandlers[type];
      } },
    document: { querySelectorAll: () => [], querySelector: () => null,
      addEventListener(type, handler) { eventHandlers[type] = handler; } },
    tmRuntime: { schedule() {} },
    console: { warn() {}, error() {} },
    eventHandlers, windowHandlers
  });
  vm.runInContext(script.slice(start, end), context);
  vm.runInContext('actualRender = render; render = () => {};', context);
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
      medico: { id_pessoa: 652, st_nome_exibicao: 'PAULO AFONSO ALVES DE SOUZA' },
      data: '2026-10-20', hora: '17:15'
    }]
  })`, context);
  assert.equal(summary.patient, 'Paciente de teste');
  assert.equal(summary.procedure, 'CONSULTA MEDICA');
  assert.equal(summary.professional, 'PAULO AFONSO ALVES DE SOUZA');
  assert.equal(summary.operator, 'ASSIM SAÚDE / RIOSERV MAX QC');
  assert.equal(vm.runInContext("selectedTimes({ procedimentos: [{ data: '2026-10-20', hora: '17:15' }] })[0]", context),
    '20/10/2026 • 17:15');
});

test('resumo deixa vazios os itens ainda não selecionados', () => {
  const context = setup();
  const summary = vm.runInContext('label({ dados: {}, procedimentos: [] })', context);
  assert.equal(summary.patient, '');
  assert.equal(summary.procedure, '');
  assert.equal(summary.professional, '');
  assert.equal(summary.operator, '');
});

test('rascunho agrupa cada procedimento com seu profissional e horário', () => {
  const context = setup();
  const groups = vm.runInContext(`draftProcedureGroups({ dados: {}, procedimentos: [
    { procedimento: { search: 'ECG' }, medico: { st_nome_exibicao: 'Profissional A' },
      data: '2026-10-21', hora: '08:00' },
    { procedimento: { search: 'CONSULTA' }, medico: { st_nome_exibicao: 'Profissional B' },
      data: '2026-10-27', hora: '17:02' }
  ] })`, context);
  assert.deepEqual(Array.from(groups, group => ({ ...group })), [
    { procedure: 'ECG', professional: 'Profissional A', dateTime: '21/10/2026 • 08:00' },
    { procedure: 'CONSULTA', professional: 'Profissional B', dateTime: '27/10/2026 • 17:02' }
  ]);
});

test('abrir a calculadora fecha o menu Em espera', () => {
  const context = setup();
  vm.runInContext('open = true;', context);
  context.eventHandlers['tm-datecalc-opened']();
  assert.equal(vm.runInContext('open', context), false);
});

test('avisa antes de recarregar somente enquanto há rascunhos em memória', () => {
  const context = setup();
  vm.runInContext('syncUnloadGuard()', context);
  assert.equal(context.windowHandlers.beforeunload, undefined);

  vm.runInContext("drafts.push({ id: 1, patient: 'Paciente teste' }); syncUnloadGuard()", context);
  const handler = context.windowHandlers.beforeunload;
  assert.equal(typeof handler, 'function');
  const event = { prevented: false, preventDefault() { this.prevented = true; } };
  handler(event);
  assert.equal(event.prevented, true);
  assert.equal(event.returnValue, true);

  vm.runInContext('drafts.length = 0; syncUnloadGuard()', context);
  assert.equal(context.windowHandlers.beforeunload, undefined);
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
  let layoutPasses = 0;
  context.tmRuntime.schedule = () => { layoutPasses += 1; };
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
  assert.equal(layoutPasses, 1);
});

test('retomada seleciona as vagas de todos os procedimentos antes de abrir o cadastro', async () => {
  const context = setup();
  const vue = booking();
  vue.dados.plano = { id_plano: 100, search: 'Particular' };
  vue.procedimentos.push(
    { procedimento: { id_procedimento: 200, search: 'ECG' }, medico: { id_pessoa: 400 },
      data: '2026-10-20', hora: '08:00', id_agenda: 300, selected: true },
    { procedimento: { id_procedimento: 201, search: 'Consulta' }, medico: { id_pessoa: 401 },
      data: '2026-10-21', hora: '12:00', id_agenda: 301, selected: true }
  );
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  assert.equal(vm.runInContext('drafts[0].preferredSlots.length', context), 2);
  assert.equal(vm.runInContext('drafts[0].preferredSlots[1].procedureIndex', context), 1);

  let modalOpen = false;
  const selected = [];
  context.document.querySelector = selector => selector === '#cadastroModal.show' && modalOpen ? {} : null;
  vue.buscarHorarios = () => {
    vue.horarios = [
      { data: '2026-10-20', hora: '08:00', status: 'livre', id_agenda: 300,
        index: 0, medico: { id_pessoa: 400 }, procedimento: { id_procedimento: 200 } },
      { data: '2026-10-21', hora: '12:00', status: 'livre', id_agenda: 301,
        index: 1, medico: { id_pessoa: 401 }, procedimento: { id_procedimento: 201 } }
    ];
    vue.buscando = false;
  };
  vue.selecionar_horario = slot => {
    assert.equal(modalOpen, false);
    selected.push(slot.index);
    if (selected.length === 2) modalOpen = true;
  };
  await vm.runInContext('resume(1)', context);
  assert.deepEqual(selected, [0, 1]);
  assert.equal(modalOpen, true);
  assert.equal(vm.runInContext('drafts.length', context), 0);
  assert.equal(vm.runInContext('notice', context), '');
});

test('não seleciona parcialmente procedimentos quando uma das vagas desapareceu', async () => {
  const context = setup();
  const vue = booking();
  vue.procedimentos.push(
    { procedimento: { id_procedimento: 200 }, data: '2026-10-20', hora: '08:00',
      id_agenda: 300, selected: true },
    { procedimento: { id_procedimento: 201 }, data: '2026-10-21', hora: '12:00',
      id_agenda: 301, selected: true }
  );
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  let calls = 0;
  vue.buscarHorarios = () => {
    vue.horarios = [
      { data: '2026-10-20', hora: '08:00', status: 'livre', id_agenda: 300,
        index: 0, procedimento: { id_procedimento: 200 } },
      { data: '2026-10-21', hora: '12:00', status: 'ocupado', id_agenda: 301,
        index: 1, procedimento: { id_procedimento: 201 } }
    ];
    vue.buscando = false;
  };
  vue.selecionar_horario = () => { calls++; };
  await vm.runInContext('resume(1)', context);
  assert.equal(calls, 0);
  assert.match(vm.runInContext('notice', context), /21\/10\/2026 • 12:00 não está mais disponível/);
});

test('alerta no Klingo identifica a vaga indisponível e não abre o cadastro', async () => {
  const context = setup();
  const vue = booking();
  const toasts = [];
  vue.$toast = { add(message) { toasts.push(message); } };
  vue.procedimentos.push({ procedimento: { search: 'ECG' }, data: '2026-10-20',
    hora: '08:00', id_agenda: 300, selected: true });
  context.vue = vue;
  vm.runInContext('component = () => vue;', context);
  await vm.runInContext('save()', context);
  let selected = false;
  let modalOpen = false;
  context.document.querySelector = selector => selector === '#cadastroModal.show' && modalOpen ? {} : null;
  vue.buscarHorarios = () => {
    vue.horarios = [{ data: '2026-10-20', hora: '08:00', status: 'ocupado',
      id_agenda: 300, index: 0 }];
    vue.buscando = false;
  };
  vue.selecionar_horario = () => { selected = true; modalOpen = true; };
  await vm.runInContext('resume(1)', context);
  assert.equal(selected, false);
  assert.equal(modalOpen, false);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].severity, 'error');
  assert.equal(toasts[0].summary, 'Vaga indisponível');
  assert.match(toasts[0].detail, /20\/10\/2026 • 08:00 não está mais disponível/);
  assert.equal(vm.runInContext('open', context), false);
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
  assert.match(vm.runInContext('notice', context), /não está mais disponível/);
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

test('card inteiro retoma e a lixeira separada descarta sem retomar', () => {
  const context = setup();
  let dock;
  let resumed = 0;
  const host = {
    querySelector: () => null,
    insertBefore(element) { dock = element; element.parentElement = host; }
  };
  function element(tag) {
    return {
      tag, children: [], dataset: {}, classList: { values: [], add(value) { this.values.push(value); } },
      setAttribute() {}, addEventListener(type, callback) { this[type] = callback; },
      append(...nodes) { this.children.push(...nodes); },
      appendChild(node) { this.children.push(node); },
      replaceChildren(...nodes) { this.children = nodes; }
    };
  }
  context.document.querySelector = selector => selector.startsWith('nav.navbar ul') ? host : null;
  context.document.getElementById = () => dock || null;
  context.document.createElement = element;
  context.window.confirm = () => true;
  vm.runInContext(`component = () => null; headerUserId = () => '20';
    checkOwner = () => true; ensureModalSave = () => {}; ensureStyle = () => {};
    resume = id => { resumed = id; }; open = true;
    drafts.push({ id: 7, patient: 'Paciente teste', procedure: 'Consulta',
      professional: 'Médica', operator: 'Particular', times: ['20/10/2026 • 17:15'],
      groups: [
        { procedure: 'ECG', professional: 'Profissional A', dateTime: '21/10/2026 • 08:00' },
        { procedure: 'Consulta', professional: 'Profissional B', dateTime: '27/10/2026 • 17:02' }
      ] });`, context);
  context.resumed = 0;
  assert.equal(vm.runInContext('headerUserId()', context), '20');
  assert.equal(vm.runInContext('!!document.querySelector("nav.navbar ul.navbar-nav.ml-auto")', context), true);
  vm.runInContext('resume = id => { resumed = id; }; render = actualRender; render();', context);
  assert.ok(dock.children[1], JSON.stringify({
    open: vm.runInContext('open', context),
    children: dock.children.map(child => child.className)
  }));
  const item = dock.children[1].children[0];
  const buttons = item.children.filter(child => child.tag === 'button');
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].className, 'tm-draft-resume-hitbox');
  assert.ok(!buttons[0].textContent);
  assert.equal(buttons[0].title, undefined);
  assert.equal(buttons[1].className, 'tm-draft-discard');
  assert.equal(buttons[1].children[0].className, 'far fa-trash-alt');
  assert.equal(item.children[0].tag, 'strong');
  assert.equal(item.children[1].tag, 'strong');
  assert.equal(item.children[2].className, 'tm-draft-procedure-group');
  assert.equal(item.children[2].children[2].classList.values[0], 'tm-draft-date');
  assert.equal(item.children[2].children[1].textContent, 'Profissional A');
  assert.equal(item.children[3].children[0].textContent, 'Consulta');
  assert.equal(item.children[3].children[1].textContent, 'Profissional B');
  assert.equal(item.children[3].children[2].textContent, '27/10/2026 • 17:02');

  dock.click({ target: { closest: () => buttons[0] } });
  assert.equal(context.resumed, 7);
  context.resumed = 0;
  dock.click({ target: { closest: () => buttons[1] } });
  assert.equal(context.resumed, 0);
  assert.equal(vm.runInContext('drafts.length', context), 0);
});

test('clique no card não mostra contorno, mas teclado mantém indicação de foco', () => {
  assert.match(script, /\.tm-draft-resume-hitbox:focus:not\(:focus-visible\)\s*\{\s*outline: none !important;/);
  assert.match(script, /\.tm-draft-resume-hitbox:focus-visible\s*\{\s*outline: 2px solid #007bff !important;/);
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
