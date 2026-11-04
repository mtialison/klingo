const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/31-marcacoes-bloqueadas-acoes.js'), 'utf8');
function fixture(route = '#/recepcao') {
  let job, renders = 0;
  const data = { id_marcacao: 123, ch_estado_marcacao: 'B', id_bloqueio: 5 };
  const owner = {}, cell = { $options: { _componentTag: 'celula-horarios-marcacao' }, $parent: owner,
    hor: { marcacao: data } };
  const input = (label, edicao, tag = 'az-input') => ({ componentOptions: { tag, propsData: { label, edicao } } });
  const original = function () { return { children: [input('Operadora / Plano', false),
    input('e-mail', false), input('Nome', false), input('CPF', false), input('Quantidade de Ciclos', false),
    input('Data de Liberação', false), input('', false, 'medico-solicitante'), input('Celular', true)],
    blockedWarning: !this.marcacao_ativa }; };
  const modal = { dados: data, marcacao_ativa: false, $options: { render: original,
    methods: { abrir() {}, atualizar() {} }, computed: { marcacao_ativa() {} } }, $forceUpdate() { renders++; } };
  const oldGroup = { remove() { this.removed = true; } };
  const document = { getElementById: () => ({ __vue__: modal }), querySelectorAll: selector =>
    selector === '.dashcard' ? [{ querySelectorAll: () => [{ __vue__: cell }] }] : [oldGroup] };
  const window = { location: { hash: route } };
  vm.runInNewContext(source, { document, window, tmRuntime: { register: (_name, fn) => job = fn } });
  return { data, cell, owner, modal, original, oldGroup, window, job, render: () => modal.$options.render.call(modal), renders: () => renders };
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
