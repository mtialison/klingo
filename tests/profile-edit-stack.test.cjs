const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/33-editar-marcacao-sobre-perfil.js'), 'utf8');
function fixture() {
  let job, otherHides = 0, traps = 0, calls = [];
  function element() {
    const attrs = new Map(), styles = new Map(), classes = new Set();
    return { isConnected: true, scrollTop: 77, classList: {
      contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c)
    }, style: { display: 'none', getPropertyValue: p => styles.get(p)?.[0] || '',
      getPropertyPriority: p => styles.get(p)?.[1] || '', setProperty: (p, v, priority = '') => styles.set(p, [v, priority]),
      removeProperty: p => styles.delete(p) },
    hasAttribute: a => attrs.has(a), getAttribute: a => attrs.has(a) ? attrs.get(a) : null,
    setAttribute: (a, v) => attrs.set(a, v), removeAttribute: a => attrs.delete(a),
    focus() { this.focused = true; }, contains() { return false; } };
  }
  const profile = element(), edit = element(), backdrop = element(), body = element();
  profile.classList.add('show'); profile.style.display = 'block'; profile.setAttribute('aria-hidden', 'false');
  profile.style.setProperty('z-index', '1050'); edit.style.setProperty('z-index', '1060', 'important');
  const bsProfile = { _element: profile, _isShown: true, _config: { focus: true },
    hide() { profile.classList.remove('show'); this._isShown = false; }, _enforceFocus() { traps++; } };
  const bsEdit = { _element: edit, _isShown: false, _backdrop: backdrop };
  profile.jQuery123 = { 'bs.modal': bsProfile }; edit.jQuery123 = { 'bs.modal': bsEdit };
  const hide = bsProfile.hide;
  const component = { $options: { methods: { atualizar() {} } }, abrir(...args) {
    calls.push({ self: this, args }); bsProfile.hide(); otherHides++;
    if (this.fail) throw Error('native failure');
    edit.classList.add('show'); edit.style.display = 'block'; bsEdit._isShown = true;
    return 'native result';
  } };
  edit.__vue__ = component; const original = component.abrir;
  const document = { body, activeElement: null,
    getElementById: id => id === 'perfilPacienteModal' ? profile : edit,
    querySelectorAll: () => [profile, edit].filter(e => e.classList.contains('show')) };
  const context = { document, getComputedStyle: e => ({ display: e.style.display, zIndex: e.style.getPropertyValue('z-index') }),
    MutationObserver: class { observe() {} disconnect() {} },
    tmRuntime: { register: (_name, fn) => job = fn, schedule() {} } };
  const cleanup = vm.runInNewContext(source, context);
  return { profile, edit, backdrop, body, component, bsProfile, bsEdit, hide, original, cleanup,
    update: () => job(), otherHides: () => otherHides, traps: () => traps, calls };
}
test('perfil permanece aberto e editor/backdrop ficam acima sem alterar fluxo nativo', () => {
  const f = fixture(); f.update(); const callback = () => {}, options = {};
  assert.equal(f.component.abrir(123, callback, options), 'native result'); f.update();
  assert.equal(f.profile.classList.contains('show'), true); assert.equal(f.edit.classList.contains('show'), true);
  assert.equal(f.bsProfile.hide, f.hide); assert.equal(f.otherHides(), 1);
  assert.equal(f.calls[0].self, f.component); assert.equal(f.calls[0].args[1], callback);
  assert.equal(f.calls[0].args[2], options); assert.equal(f.profile.scrollTop, 77);
  assert.equal(f.profile.hasAttribute('inert'), true);
  assert.ok(Number(f.edit.style.getPropertyValue('z-index')) > Number(f.backdrop.style.getPropertyValue('z-index')));
  assert.ok(Number(f.backdrop.style.getPropertyValue('z-index')) > 1050);
});
test('fechar edição restaura perfil, foco, scroll e estilos', () => {
  const f = fixture(); f.update(); f.component.abrir(123); f.update();
  f.edit.classList.remove('show'); f.edit.style.display = 'none'; f.bsEdit._isShown = false;
  f.body.classList.remove('modal-open'); f.update();
  assert.equal(f.profile.classList.contains('show'), true); assert.equal(f.profile.hasAttribute('inert'), false);
  assert.equal(f.profile.getAttribute('aria-hidden'), 'false'); assert.equal(f.profile.scrollTop, 77);
  assert.equal(f.body.classList.contains('modal-open'), true); assert.equal(f.traps(), 1);
  assert.equal(f.edit.style.getPropertyValue('z-index'), '1060');
  assert.equal(f.edit.style.getPropertyPriority('z-index'), 'important');
  f.cleanup(); assert.equal(f.component.abrir, f.original);
});
test('sem perfil visível, abertura é integralmente nativa', () => {
  const f = fixture(); f.profile.classList.remove('show'); f.update();
  assert.equal(f.component.abrir(123), 'native result'); f.update();
  assert.equal(f.profile.hasAttribute('inert'), false); assert.equal(f.bsProfile.hide, f.hide);
});
test('falha nativa restaura hide e preserva a exceção', () => {
  const f = fixture(); f.update(); f.component.fail = true;
  assert.throws(() => f.component.abrir(123), /native failure/);
  assert.equal(f.bsProfile.hide, f.hide); assert.equal(f.profile.classList.contains('show'), true);
  f.cleanup(); assert.equal(f.component.abrir, f.original);
});
