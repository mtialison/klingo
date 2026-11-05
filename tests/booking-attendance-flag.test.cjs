const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const file = path.join(__dirname, '../src/36-sinalizador-nos-modais-de-agendamento.js');
const source = fs.readFileSync(file, 'utf8');
function fixture() {
  let job = () => {}, present = true;
  const h = (tag, data = {}, children = []) => ({ tag, data, children });
  function component(origem) {
    return { origem, sinalizador_atendimento: '', st_observacoes: 'teste',
      $createElement: h, $forceUpdate() {}, marcar() {},
      $options: { render() {
        const observation = h('div', { staticClass: 'col col-12' }, [
          h('az-sub-title', { attrs: { title: 'Observação' } }),
          h('az-input', { model: { expression: 'st_observacoes', value: this.st_observacoes,
            callback: value => { this.st_observacoes = value; } } })
        ]);
        if (this.normalized) observation.children[1].componentOptions = { propsData: { type: 'text', rows: '1' } };
        const row = h('div', { staticClass: 'form-row' }, [observation]);
        if (this.withTime) row.children.unshift(h('div', { key: 'time' }), h('div', { key: 'extra' }));
        if (this.nativeFlag) row.children.push(h('div', {}, [
          { data: {}, componentOptions: { propsData: { title: 'Sinalizador de atendimento' } } },
          h('az-input', { attrs: { service: 'sinalizadores.index' } })
        ]));
        return h('div', {}, [row]);
      } } };
  }
  const recep = component('recep'), confirm = component('confirm'), unrelated = component('call');
  const originals = [recep, confirm, unrelated].map(c => c.$options.render);
  const modal = c => ({ querySelectorAll: () => [{ __vue__: c }] });
  const modals = { novoAtendimento2Modal: modal(recep), novoAtendimentoConfirmacaoModal: modal(confirm) };
  const styles = [];
  const cleanup = vm.runInNewContext(source, { document: {
    getElementById: id => present ? modals[id] || styles.find(s => s.id === id) : null,
    createElement: () => ({}), head: { appendChild: s => styles.push(s) }
  }, tmRuntime: { register: (_n, fn) => job = fn } });
  return { recep, confirm, unrelated, originals, cleanup, update: () => job(), remove: () => present = false,
    render: c => c.$options.render.call(c) };
}
const nodes = tree => [tree, ...(tree.children || []).flatMap(nodes)];
const flag = tree => nodes(tree).find(n => n.data?.attrs?.service === 'sinalizadores.index');
test('Recepção e Confirmação exibem Sinalizador antes da observação em linha própria', () => {
  const f = fixture(); f.update();
  for (const c of [f.recep, f.confirm]) {
    const row = f.render(c).children[0];
    assert.equal(row.children.length, 1);
    assert.equal(flag(row.children[0]).data.attrs.optionsParm.ativos, true);
    assert.equal(flag(row.children[0]).data.attrs.optionsMode, 'aql');
    assert.equal(nodes(row.children[0]).find(n => n.data?.attrs?.title)?.data.attrs.title, 'Sinalizador');
    const observationRow = f.render(c).children[1];
    assert.equal(observationRow.children.length, 1);
    const observation = observationRow.children[0].children[1];
    assert.equal(observation.data.attrs.type, 'textarea');
    assert.equal(observation.data.model.value, 'teste');
    observation.data.model.callback('linha 1\nlinha 2');
    assert.equal(c.st_observacoes, 'linha 1\nlinha 2');
  }
  assert.equal(f.unrelated.$options.render, f.originals[2]);
});
test('seleção e limpeza atualizam o sinalizador no componente sem alterar observação', () => {
  const f = fixture(); f.update(); const selected = { id_sinalizador_atendimento: 7, st_icon: 'fas fa-car', st_cor: 'primary' };
  for (const c of [f.recep, f.confirm]) {
    flag(f.render(c)).data.model.callback(selected);
    assert.equal(c.sinalizador_atendimento, selected);
    flag(f.render(c)).data.model.callback(null);
    assert.equal(c.sinalizador_atendimento, null);
    assert.equal(c.st_observacoes, 'teste');
  }
});
test('mantém horário, extra e sinalizador na primeira linha e observação abaixo', () => {
  const f = fixture(); f.recep.withTime = true; f.update();
  const row = f.render(f.recep).children[0];
  assert.equal(row.children.length, 3);
  assert.equal(row.children[0].data.key, 'time'); assert.equal(row.children[1].data.key, 'extra');
  assert.ok(flag(row.children[2]));
  assert.equal(f.render(f.recep).children[1].children[0].children[1].data.model.expression, 'st_observacoes');
});
test('renderizações repetidas não duplicam sinalizador e preservam um controle nativo existente', () => {
  const f = fixture(); f.update(); f.update(); f.recep.nativeFlag = true;
  for (const c of [f.recep, f.confirm]) {
    for (let i = 0; i < 3; i++) assert.equal(nodes(f.render(c)).filter(n => n.data?.attrs?.service === 'sinalizadores.index').length, 1);
  }
});
test('remoção dos modais restaura os renderizadores sem alterar o fluxo de salvar', () => {
  const f = fixture(); const save = f.recep.marcar; f.update(); f.remove(); f.update();
  assert.equal(f.recep.$options.render, f.originals[0]); assert.equal(f.confirm.$options.render, f.originals[1]);
  assert.equal(f.recep.marcar, save);
});
test('atualiza props já extraídas pelo Vue ao reutilizar controles nativos', () => {
  const f = fixture(); f.recep.normalized = true; f.recep.nativeFlag = true; f.update();
  const tree = f.render(f.recep);
  assert.equal(tree.children[0].children[0].children[0].componentOptions.propsData.title, 'Sinalizador');
  const observation = tree.children[1].children[0].children[1];
  assert.equal(observation.componentOptions.propsData.type, 'textarea');
  assert.equal(observation.componentOptions.propsData.rows, '2');
});
