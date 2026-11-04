const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/34-confirmacao-fechamento-do-agendamento.js'), 'utf8');
const ID = 'novoAtendimentoConfirmacaoModal';
function fixture() {
  let job, renders = 0, shown = true, present = true;
  const dialog = {}, modal = { classList: { contains: () => shown },
    querySelector: () => dialog };
  const bs = { _element: modal, _dialog: null, _isShown: true, _isTransitioning: true,
    hide() { if (this._isShown && !this._isTransitioning) { this._isShown = false; shown = false; } } };
  modal.jQuery123 = { 'bs.modal': bs };
  const bookingNode = { componentOptions: { tag: 'marcacao', propsData: { origem: 'confirm', modalName: ID } } };
  const receptionNode = { componentOptions: { tag: 'marcacao', propsData: { origem: 'recep', modalName: 'novoAtendimento2Modal' } } };
  const parent = { $options: { methods: { novoAtendimento() {}, fechar_modal() {} },
    render() { bookingNode.componentOptions.propsData.modalName = ID; return { children: [bookingNode, receptionNode] }; } },
    $forceUpdate() { renders++; this.$options.render.call(this); } };
  const original = parent.$options.render; modal.__vue__ = parent;
  const cleanup = vm.runInNewContext(source, { document: { getElementById: () => present ? modal : null },
    tmRuntime: { register: (_name, fn) => job = fn } });
  return { modal, dialog, bs, parent, original, bookingNode, receptionNode, cleanup, update: () => job(),
    isShown: () => shown, renders: () => renders, remove: () => { present = false; } };
}
test('Confirmação corrige seletor passado ao callback de sucesso e preserva Recepção', () => {
  const f = fixture(); f.update();
  assert.equal(f.bookingNode.componentOptions.propsData.modalName, '#' + ID);
  assert.equal(f.receptionNode.componentOptions.propsData.modalName, 'novoAtendimento2Modal');
  f.parent.$forceUpdate(); assert.equal(f.bookingNode.componentOptions.propsData.modalName, '#' + ID);
  assert.equal(f.renders(), 2); f.update(); assert.equal(f.renders(), 2);
});
test('Bootstrap criado sem dialog é reparado e permite fechar pelo botão nativo', () => {
  const f = fixture(); f.bs.hide(); assert.equal(f.isShown(), true);
  f.update(); assert.equal(f.bs._dialog, f.dialog); assert.equal(f.bs._isTransitioning, false);
  f.bs.hide(); assert.equal(f.isShown(), false);
});
test('sucesso nativo fecha modal antes de reiniciar formulário, sem reabri-lo', () => {
  const f = fixture(); f.update();
  const nativeSuccess = () => {
    if (f.bookingNode.componentOptions.propsData.modalName === '#' + ID) f.bs.hide();
    f.parent.$forceUpdate(); // reiniciar/refresh do Klingo
  };
  nativeSuccess(); f.update();
  assert.equal(f.isShown(), false); assert.equal(f.bs._isShown, false);
});
test('transição válida e modal aberto não são encerrados pelo ajuste', () => {
  const f = fixture(); f.bs._dialog = f.dialog; f.update();
  assert.equal(f.bs._isTransitioning, true); assert.equal(f.isShown(), true);
});
test('ao remover o componente, restaura seu renderizador e permite reinstalar', () => {
  const f = fixture(); f.update(); f.remove(); f.update();
  assert.equal(f.parent.$options.render, f.original); f.cleanup();
});
