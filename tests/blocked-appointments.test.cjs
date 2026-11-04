const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/31-marcacoes-bloqueadas-acoes.js'), 'utf8');

function fixture(route = '#/recepcao') {
  let click, job, scheduled = 0;
  const calls = [], groups = [];
  const appointment = { id_marcacao: 123, ch_estado_marcacao: 'B', item_status: { valor: 'bloqueado' } };
  const owner = { remarcar: a => calls.push(['reschedule', a]), load: a => calls.push(['load', a]) };
  const cell = { $options: { _componentTag: 'celula-horarios-marcacao' }, $parent: owner,
    hor: { marcacao: appointment }, $root: { editar_marcacao: (...args) => calls.push(['edit', ...args]) } };
  const menu = { querySelector: () => groups[0], appendChild: g => groups.push(g) };
  const card = { closest: () => null, querySelectorAll: () => [{ __vue__: cell }], querySelector: () => menu };
  cell.$el = { closest: () => card };
  const window = { location: { hash: route } };
  const document = {
    addEventListener: (_name, fn) => { click = fn; },
    querySelectorAll: selector => selector === '.dashcard' ? [card] : [...groups],
    createElement() {
      const node = { dataset: {}, children: [], closest: () => card,
        appendChild(child) { this.children.push(child); child.closest = () => node; },
        remove() { const i = groups.indexOf(node); if (i >= 0) groups.splice(i, 1); } };
      return node;
    }
  };
  vm.runInNewContext(source, { document, window, tmRuntime: {
    register: (_name, fn) => { job = fn; }, schedule: () => scheduled++
  } });
  const press = index => {
    const button = groups[0].children[index];
    click({ target: { closest: () => button }, preventDefault() {} });
  };
  return { appointment, owner, cell, groups, calls, window, job, press, scheduled: () => scheduled };
}

for (const route of ['#/recepcao', '#/call-center/confirmacao']) {
  test(`bloqueados: abre edição/remarcação nativas sem mudar estado em ${route}`, () => {
    const f = fixture(route), before = JSON.stringify(f.appointment);
    f.job(); assert.equal(f.groups.length, 1);
    f.press(0); assert.equal(f.calls[0][0], 'edit'); assert.equal(f.calls[0][1], 123);
    f.calls[0][2](); assert.equal(f.calls[1][0], 'load');
    f.calls[0][3].remarcar(f.appointment); assert.equal(f.calls[2][1], f.appointment);
    f.press(1); assert.equal(f.calls[3][0], 'reschedule'); assert.equal(f.calls[3][1], f.appointment);
    assert.equal(JSON.stringify(f.appointment), before);
  });
}
test('bloqueados: preserva modo somente leitura e bloqueio de edição', () => {
  for (const restriction of ['viewonly', 'block_editar']) {
    const f = fixture(); f.job();
    if (restriction === 'viewonly') f.owner.viewonly = true;
    else f.cell.block_editar = true;
    f.press(0); assert.equal(f.calls.length, 0);
    f.job(); assert.equal(f.groups.length, 0);
  }
});
test('bloqueados: recusa card reciclado, outro estado e outra rota', () => {
  const f = fixture(); f.job(); f.cell.hor.marcacao = { ...f.appointment, id_marcacao: 456 };
  f.press(1); assert.equal(f.calls.length, 0); assert.equal(f.scheduled(), 1);
  f.cell.hor.marcacao = f.appointment; f.appointment.ch_estado_marcacao = 'A';
  f.press(1); assert.equal(f.calls.length, 0); f.job(); assert.equal(f.groups.length, 0);
  f.appointment.ch_estado_marcacao = 'B'; f.job(); f.window.location.hash = '#/autorizacoes';
  f.press(0); assert.equal(f.calls.length, 0); f.job(); assert.equal(f.groups.length, 0);
});
test('bloqueados: não oferece ações em horários livres, atendidos ou cancelados', () => {
  for (const change of [f => f.cell.hor.marcacao = null, f => f.appointment.id_atendimento = 9,
    f => f.appointment.ch_estado_marcacao = 'C', f => f.appointment.item_status.valor = 'cancelado']) {
    const f = fixture(); change(f); f.job(); assert.equal(f.groups.length, 0);
  }
});
