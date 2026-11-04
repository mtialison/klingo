const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/31-marcacoes-bloqueadas-acoes.js'), 'utf8');
function fixture(route = '#/recepcao') {
  let job, click, renders = 0, nativeCalls = 0;
  const data = { id_marcacao: 123, id_paciente: 4, ch_estado_marcacao: 'B', id_bloqueio: 5 };
  const planCalls = [], util = { load(vm, options) {
    planCalls.push(['load-native']); options.loadTo({ lista: [] });
  } };
  const plan = { $util: util, abrir(a) {
    planCalls.push(['native', a]); this.novo_plano = null;
    this.$util.load(this, { service: 'marcacoes', func: 'lista_dia', loadTo: data => {
      this.dados = data; this.marcacao = data.lista[0];
    } });
    planCalls.push(['#alterarMarcPlanoModal', 'show']);
  } };
  const owner = { $refs: { alterar_plano: plan } }, cell = { $options: { _componentTag: 'celula-horarios-marcacao' }, $parent: owner,
    hor: { marcacao: data } };
  const input = (label, edicao, tag = 'az-input') => ({ componentOptions: { tag, propsData: { label, edicao } } });
  const original = function () { return { children: [input('Operadora / Plano', false),
    input('e-mail', false), input('Nome', false), input('CPF', false), input('Quantidade de Ciclos', false),
    input('Data de Liberação', false), input('', false, 'medico-solicitante'), input('Celular', true)],
    blockedWarning: !this.marcacao_ativa }; };
  const modal = { dados: data, marcacao_ativa: false, $options: { render: original,
    methods: { abrir() {}, atualizar() {} }, computed: { marcacao_ativa() {} } }, $forceUpdate() { renders++; } };
  const oldGroup = { remove() { this.removed = true; } };
  const buttons = ['Alterar Procedimento', 'Alterar Operadora/Plano', 'Emitir Atestado'].map(textContent =>
    ({ textContent, disabled: true, onclick: () => nativeCalls++ }));
  const card = { closest: () => null, querySelectorAll: selector => selector === '*'
    ? [{ __vue__: cell }] : buttons };
  const document = { addEventListener: (_name, fn) => { click = fn; },
    getElementById: () => ({ __vue__: modal }), querySelectorAll: selector =>
    selector === '.dashcard' ? [card] : [oldGroup] };
  const window = { location: { hash: route }, jQuery: selector => ({ modal: action => planCalls.push([selector, action]) }) };
  vm.runInNewContext(source, { document, window, tmRuntime: { register: (_name, fn) => job = fn, schedule() {} } });
  const press = index => {
    let stopped = false;
    click({ target: { closest: () => buttons[index] }, preventDefault() {}, stopImmediatePropagation() { stopped = true; } });
    if (!stopped && !buttons[index].disabled) buttons[index].onclick();
  };
  return { data, cell, owner, modal, original, oldGroup, window, job, buttons, press, plan, planCalls,
    util, nativeCalls: () => nativeCalls, render: () => modal.$options.render.call(modal), renders: () => renders };
}
for (const route of ['#/recepcao', '#/call-center/confirmacao']) {
  test(`bloqueados: libera campos de edição mantendo identidade, aviso e estado em ${route}`, () => {
    const f = fixture(route), before = JSON.stringify(f.data); f.job();
    const tree = f.render(), enabled = tree.children.map(n => n.componentOptions.propsData.edicao);
    assert.deepEqual(Array.from(enabled), [true, true, false, false, false, true, true, true]);
    assert.equal(tree.blockedWarning, true); assert.equal(f.modal.marcacao_ativa, false);
    assert.equal(JSON.stringify(f.data), before); assert.equal(f.oldGroup.removed, true);
    const render = f.modal.$options.render; f.job(); assert.equal(f.modal.$options.render, render);
    assert.equal(f.renders(), 1);
  });
}
test('bloqueados: preserva cancelados, atendimentos, modo somente leitura e bloqueio de edição', () => {
  for (const change of [f => f.data.ch_estado_marcacao = 'C', f => f.data.ch_estado_marcacao = 'A',
    f => f.data.id_atendimento = 9, f => f.owner.viewonly = true, f => f.cell.block_editar = true,
    f => f.cell.hor.marcacao = { ...f.data, id_marcacao: 456 }]) {
    const f = fixture(); f.job(); change(f);
    assert.equal(f.render().children[0].componentOptions.propsData.edicao, false);
  }
});
test('bloqueados: restaura renderizador ao sair da rota e recusa efeito após mudar o estado', () => {
  const f = fixture(); f.job();
  f.data.ch_estado_marcacao = 'C'; assert.equal(f.render().children[0].componentOptions.propsData.edicao, false);
  f.window.location.hash = '#/autorizacoes'; f.job(); assert.equal(f.modal.$options.render, f.original);
});
test('bloqueados: usa novos dados do modal e não libera outra marcação carregada posteriormente', () => {
  const f = fixture(); f.job(); f.modal.dados = { ...f.data, id_marcacao: 456 };
  assert.equal(f.render().children[0].componentOptions.propsData.edicao, false);
});
test('bloqueados: habilita apenas os dois comandos pedidos mantendo os listeners nativos', () => {
  const f = fixture(), handlers = f.buttons.map(b => b.onclick), before = JSON.stringify(f.data);
  f.job(); assert.deepEqual(f.buttons.map(b => b.disabled), [false, false, true]);
  f.press(0); f.press(1); assert.equal(f.nativeCalls(), 2);
  assert.deepEqual(f.buttons.map(b => b.onclick), handlers); assert.equal(JSON.stringify(f.data), before);
});
test('bloqueados: bloqueia clique após reciclagem e restaura botões ao sair da rota', () => {
  const f = fixture(); f.job(); f.cell.hor.marcacao = { ...f.data, id_marcacao: 456 };
  f.press(0); assert.equal(f.nativeCalls(), 0);
  f.cell.hor.marcacao = f.data; f.window.location.hash = '#/autorizacoes'; f.job();
  assert.deepEqual(f.buttons.map(b => b.disabled), [true, true, true]);
});
test('bloqueados: restrição de leitura posterior impede comando e preserva ativo após restaurar', () => {
  const f = fixture(); f.job(); f.owner.viewonly = true;
  f.press(1); assert.equal(f.nativeCalls(), 0); f.job();
  assert.deepEqual(f.buttons.map(b => b.disabled), [true, true, true]);
  f.owner.viewonly = false; f.job(); f.data.ch_estado_marcacao = 'A'; f.job();
  assert.deepEqual(f.buttons.map(b => b.disabled), [false, false, true]);
});
test('bloqueados: modal de plano contém somente a cópia da marcação alvo, sem lista_dia', () => {
  const f = fixture(), original = f.plan.abrir; f.job(); f.plan.abrir(f.data);
  assert.equal(f.planCalls[0][0], 'native');
  assert.deepEqual(f.planCalls[1], ['#alterarMarcPlanoModal', 'show']);
  assert.equal(f.plan.$util, f.util); assert.equal(f.planCalls.length, 2);
  assert.equal(f.plan.dados.lista.length, 1); assert.equal(f.plan.dados.lista[0].id_marcacao, 123);
  assert.notEqual(f.plan.dados.lista[0], f.data); f.plan.dados.lista[0].ch_estado_marcacao = false;
  assert.equal(f.data.ch_estado_marcacao, 'B');
  f.window.location.hash = '#/autorizacoes'; f.job(); assert.equal(f.plan.abrir, original);
});
test('bloqueados: abertura de plano de ativo ou sem permissão continua nativa', () => {
  for (const change of [f => f.data.ch_estado_marcacao = 'A', f => f.owner.viewonly = true]) {
    const f = fixture(); f.job(); change(f); f.plan.abrir(f.data);
    assert.equal(f.planCalls[0][0], 'native'); assert.equal(f.planCalls[1][0], 'load-native');
    assert.equal(f.plan.dados.lista.length, 0);
  }
});
