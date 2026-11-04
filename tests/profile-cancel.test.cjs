const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '../src/35-cancelamento-no-perfil.js');
const source = fs.readFileSync(file, 'utf8');
function fixture() {
  let job = () => {}, present = true, traps = 0;
  function element() {
    const classes = new Set(), attrs = new Map(), listeners = new Map();
    return { isConnected: true, classList: { contains: k => classes.has(k), add: k => classes.add(k), remove: k => classes.delete(k) },
      hasAttribute: k => attrs.has(k), getAttribute: k => attrs.get(k) ?? null,
      setAttribute: (k, v) => attrs.set(k, v), removeAttribute: k => attrs.delete(k),
      addEventListener(k, f) { listeners.set(k, f); }, removeEventListener(k, f) { if (listeners.get(k) === f) listeners.delete(k); },
      contains: () => false, focus() { this.focused = true; }, listeners };
  }
  const modal = element(), profile = element(), body = element();
  profile.classList.add('show'); profile.setAttribute('aria-hidden', 'false'); profile.scrollTop = 92;
  const bs = { _element: profile, _config: { focus: true }, _enforceFocus() { traps++; } };
  profile.jQuery123 = { 'bs.modal': bs };
  const h = (tag, data = {}, children = []) => ({ tag, data, children });
  const nativeReason = () => h('div', { staticClass: 'row' }, [h('az-input', { attrs: { label: 'Motivo' } })]);
  const component = { motivos: null, marcacao: null, id_motivo: '', validate: false,
    $store: { state: { user: { st_tipo: 'U' } } }, $createElement: h,
    $options: { methods: { cancelar() {}, confirmar() {} }, render() {
      if (!this.marcacao) return h('div');
      return h('div', {}, [h('div', { staticClass: 'modal-body' }, [
        { isComment: true }, this.motivos?.length ? nativeReason() : { isComment: true },
        h('az-input', { attrs: { label: 'Motivo de Cancelamento' } })
      ])]);
    } },
    cancelar(value) { this.marcacao = value; modal.classList.add('show'); return 'native'; },
    confirmar() { throw Error('must not submit'); }, $forceUpdate() {} };
  modal.__vue__ = component;
  const original = component.$options.render, originalOpen = component.cancelar;
  const cleanup = vm.runInNewContext(source, { document: { body, activeElement: null,
    getElementById: id => id === 'cancAtdPepModal' ? present && modal : profile },
    MutationObserver: class { observe() {} disconnect() {} },
    tmRuntime: { register: (_n, fn) => job = fn, schedule() {} } });
  function dismiss(type = 'click', nested = false) {
    let stopped = false;
    const button = { closest: selector => selector === '.modal' ? (nested ? {} : modal) : button };
    const event = { key: 'Escape', target: button, stopPropagation() { stopped = true; } };
    modal.listeners.get(type)?.(event);
    // Bootstrap's delegated hide on the inner modal still runs on this node.
    modal.classList.remove('show'); body.classList.remove('modal-open');
    if (!stopped) profile.classList.remove('show');
  }
  return { component, modal, profile, body, original, originalOpen, cleanup, dismiss,
    update: () => job(), render: () => component.$options.render.call(component),
    remove: () => present = false, traps: () => traps };
}
function bodyOf(tree) { return tree.children[0]; }
test('motivo já ocupa seu lugar na primeira renderização enquanto a requisição está pendente', () => {
  const f = fixture(); f.update(); f.component.cancelar({});
  const row = bodyOf(f.render()).children[1];
  assert.equal(row.data?.staticClass, 'row');
  const input = row.children[0].children[0];
  assert.equal(input.data.attrs.label, 'Motivo'); assert.equal(input.data.attrs.edicao, false);
  assert.equal(input.data.attrs.optionsList.length, 0);
  f.component.motivos = [{ id_motivo: 1 }];
  const native = bodyOf(f.render()).children[1];
  assert.equal(native.children[0].data.attrs.label, 'Motivo');
  assert.equal(bodyOf(f.render()).children.length, 3);
});
test('Fechar/X fecha só o cancelamento e devolve foco e rolagem ao perfil', () => {
  const f = fixture(); f.update(); assert.equal(f.component.cancelar({}), 'native'); f.update();
  // Inert on the outer profile would also disable its nested cancellation modal.
  assert.equal(f.profile.hasAttribute('inert'), false);
  assert.equal(f.profile.getAttribute('aria-hidden'), 'false');
  f.dismiss(); f.update();
  assert.equal(f.profile.classList.contains('show'), true);
  assert.equal(f.profile.hasAttribute('inert'), false); assert.equal(f.profile.getAttribute('aria-hidden'), 'false');
  assert.equal(f.profile.scrollTop, 92); assert.equal(f.body.classList.contains('modal-open'), true);
  assert.equal(f.traps(), 1);
});
test('Escape no cancelamento não fecha o perfil', () => {
  const f = fixture(); f.update(); f.component.cancelar({}); f.update(); f.dismiss('keydown'); f.update();
  assert.equal(f.profile.classList.contains('show'), true);
});
test('não interfere em dismiss de outro modal nem em usuário sem seletor nativo', () => {
  const f = fixture(); f.update(); f.component.$store.state.user.st_tipo = 'P'; f.component.cancelar({});
  assert.equal(bodyOf(f.render()).children[1].isComment, true);
  let stopped = false;
  f.modal.listeners.get('click')?.({ target: { closest: () => ({}) }, stopPropagation() { stopped = true; } });
  assert.equal(stopped, false);
});
test('desmontagem restaura métodos, renderização e listeners', () => {
  const f = fixture(); f.update(); f.component.cancelar({}); f.update(); f.remove(); f.update();
  assert.equal(f.component.$options.render, f.original); assert.equal(f.component.cancelar, f.originalOpen);
  assert.equal(f.modal.listeners.size, 0); assert.equal(f.profile.hasAttribute('inert'), false);
});
test('sem perfil visível não restaura foco ou bloqueia a página', () => {
  const f = fixture(); f.profile.classList.remove('show'); f.update();
  const submit = f.component.confirmar;
  f.component.cancelar({}); f.update(); f.dismiss(); f.update();
  assert.equal(f.body.classList.contains('modal-open'), false); assert.equal(f.traps(), 0);
  assert.equal(f.component.confirmar, submit);
});
test('falha na abertura nativa é propagada sem deixar estado de retorno preso', () => {
  const f = fixture(); f.component.cancelar = () => { throw Error('native failure'); }; f.update();
  assert.throws(() => f.component.cancelar({}), /native failure/);
  assert.equal(f.profile.hasAttribute('inert'), false); f.cleanup();
});
