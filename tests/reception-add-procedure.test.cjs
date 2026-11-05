const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const file = path.join(__dirname, '../src/37-recepcao-adicionar-procedimento.js');
const source = fs.readFileSync(file, 'utf8');
function fixture() {
  let job = () => {}, present = true;
  const h = (tag, data = {}, children = []) => ({ tag, data, children });
  const originalList = [];
  const owner = { origem: 'recep', dados: { plano: { id_plano: 9, id_operadora: 3 },
    medico: { id_pessoa: 12 }, procedimento: { id_procedimento: 20 } },
    procedimentos: originalList, novoProcedimento: '', cc: false, infusao: false,
    $options: { render() { return h('div', {}, [h('div', { staticClass: 'form-row tm-booking-observation-row' }),
      h('div', { key: 'conclude' })]); } },
    $createElement: h, $forceUpdate() {}, $set: (o, k, v) => o[k] = v, marcar() {},
    incluirProcedimento(target) {
      assert.equal(this, owner); assert.ok(this.procedimentos.length, 'native guard needs a prepared procedure');
      if (this.fail) throw Error('native failure');
      target.outros_procedimentos.push({ id_procedimento: this.novoProcedimento.id_procedimento, search: this.novoProcedimento.search });
      this.novoProcedimento = '';
    }, removerElemento: (list, index) => list.splice(index, 1)
  };
  const originalRender = owner.$options.render;
  const document = { getElementById: () => present ? { querySelectorAll: () => [{ __vue__: owner }] } : null };
  const cleanup = vm.runInNewContext(source, { document, tmRuntime: { register: (_n, fn) => job = fn } });
  return { owner, originalList, originalRender, cleanup, update: () => job(), remove: () => present = false,
    render: () => owner.$options.render.call(owner) };
}
const nodes = tree => [tree, ...(tree.children || []).flatMap(nodes)];
const input = tree => nodes(tree).find(n => n.data?.attrs?.placeholder === 'Adicionar procedimento...');
test('campo nativo aparece depois da observação e antes de Concluir com filtros da agenda/plano', () => {
  const f = fixture(); f.update(); const tree = f.render();
  assert.equal(tree.children.length, 3); assert.equal(tree.children[2].data.key, 'conclude');
  const field = input(tree.children[1]); assert.ok(field);
  assert.equal(field.data.attrs.service, 'procedimentos.index');
  assert.equal(JSON.stringify(field.data.attrs.optionsParm), JSON.stringify({ agenda: true, agenda_add: true, ativos: true,
    id_medico: 12, id_operadora: 3, id_plano: 9, cc: 0, infusao: 0 }));
});
test('seleção passa pelo método nativo e altera dados que serão clonados ao concluir', () => {
  const f = fixture(); f.update(); const field = input(f.render()); assert.ok(field);
  field.data.model.callback({ id_procedimento: 42, search: 'Adicional' }); field.data.on.selecionado();
  assert.equal(f.owner.dados.outros_procedimentos[0].id_procedimento, 42);
  assert.equal(f.owner.procedimentos, f.originalList); assert.equal(f.owner.procedimentos.length, 0);
  const row = nodes(f.render()).find(n => n.data?.attrs?.edicao === false);
  row.data.scopedSlots['button-pre']()[0].children[0].data.on.click();
  assert.equal(f.owner.dados.outros_procedimentos.length, 0);
});
test('falha nativa restaura o descritor da lista original sem enviar ou concluir', () => {
  const f = fixture(); f.update(); const before = Object.getOwnPropertyDescriptor(f.owner, 'procedimentos');
  f.owner.fail = true; const field = input(f.render()); assert.ok(field);
  field.data.model.callback({ id_procedimento: 42 });
  assert.throws(() => field.data.on.selecionado(), /native failure/);
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.owner, 'procedimentos'), before);
});
test('seleção múltipla preserva o acesso reativo à lista final e inclui cada adicional pelo método nativo', () => {
  const f = fixture();
  const getter = () => f.originalList, setter = value => { throw Error('must not invoke reactive setter'); };
  Object.defineProperty(f.owner, 'procedimentos', { configurable: true, enumerable: true, get: getter, set: setter });
  f.update(); const field = input(f.render());
  field.data.model.callback([{ id_procedimento: 42, search: 'A' }, { id_procedimento: 43, search: 'B' }]);
  field.data.on.selecionado();
  assert.deepEqual(Array.from(f.owner.dados.outros_procedimentos, p => p.id_procedimento), [42, 43]);
  assert.equal(Object.getOwnPropertyDescriptor(f.owner, 'procedimentos').get, getter);
  assert.equal(Object.getOwnPropertyDescriptor(f.owner, 'procedimentos').set, setter);
});
test('não exibe antes de escolher procedimento/profissional e restaura render ao desmontar', () => {
  const f = fixture(); f.update(); f.owner.dados.medico = null;
  assert.equal(input(f.render()), undefined); f.remove(); f.update();
  assert.equal(f.owner.$options.render, f.originalRender);
});
test('remover adicional não dispara validação de Concluir por estar na mesma seção', () => {
  const layout = fs.readFileSync(path.join(__dirname, '../src/08-recepcao-novo-atendimento.js'), 'utf8');
  const start = layout.indexOf("  document.addEventListener('click',");
  const end = layout.indexOf("  document.addEventListener('submit',", start);
  let listener, validations = 0;
  const modal = {}, section = {};
  const remove = { textContent: '', classList: { contains: () => false }, closest: selector => selector.startsWith('#') ? modal : section };
  vm.runInNewContext(layout.slice(start, end), { document: { addEventListener: (_n, f) => listener = f },
    MODAL_ID: 'novoAtendimento2Modal', norm: text => text.trim(), openReceptionPatientProfile: () => false,
    validateRequiredReceptionFields: () => validations++ });
  listener({ target: { closest: () => remove } }); assert.equal(validations, 0);
  listener({ target: { closest: () => ({ ...remove, textContent: 'Concluir' }) } }); assert.equal(validations, 1);
});
