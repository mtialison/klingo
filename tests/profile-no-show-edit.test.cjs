const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '../src/40-editar-faltosos-no-perfil.js');
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

// The native PEP passes the same appointment to pre-atendimento-view and its action closures.
function fixture() {
  const h = (tag, data = {}, children = []) => ({ tag, data,
    children: children.map(child => typeof child === 'string' ? { text: child } : child), key: data.key });
  const text = value => ({ text: value });
  const rows = [
    { id_marcacao: 10, ch_estado_marcacao: 'A', item_status: { valor: 'agendado' } },
    { id_marcacao: 20, ch_estado_marcacao: 'A', item_status: { valor: 'faltoso' } },
    { id_marcacao: 30, ch_estado_marcacao: 'A', item_status: { valor: 'faltoso' } }
  ];
  let job = () => {}, present = true, visible = true, renders = 0;
  const calls = [], reschedules = [];
  const element = { isConnected: true };
  const owner = {
    lista: rows, marcacoes: rows, historico: false, imprimindo: false,
    $el: element, $store: { state: { user: { st_tipo: 'U' } } },
    $createElement: h, filtrar() {}, $forceUpdate() { renders++; },
    editar_marcacao(row) { calls.push({ row, self: this }); return 'native editor'; },
    $options: { render() {
      return h('table', {}, this.lista.map((row, i) => h('tr', {}, [h('td', {}, [
        h('div', { staticClass: 'card', key: 'm' + i }, [
          h('div', { staticClass: 'card-body' }, [
            h('vue-component-pre-atendimento-view', {}, []),
            h('span', { staticClass: 'd-flex align-items-center justify-content-between' }, [
              h('span', {}, [h('i', { staticClass: row.item_status.valor === 'faltoso' ? 'far fa-calendar-times' : 'far fa-calendar-alt' })]),
              h('span', {}, [h('button', { staticClass: 'btn btn-outline-primary', attrs: { type: 'button' },
                on: { click: () => reschedules.push(row) } }, [text('Remarcar')])])
            ])
          ])
        ])
      ])])));
    } }
  };
  const original = owner.$options.render;
  // Populate native component props after rendering, without changing the production renderer.
  owner.$options.render = function () {
    const tree = original.call(this);
    tree.children.forEach((row, i) => {
      row.children[0].children[0].children[0].children[0].componentOptions = { propsData: { marcacao: this.lista[i] } };
    });
    return tree;
  };
  const nativeRender = owner.$options.render;
  element.__vue__ = owner;
  const profile = { isConnected: true, classList: { contains: () => visible },
    contains: el => present && el === element, querySelectorAll: () => [element] };
  const cleanup = vm.runInNewContext(source, { document: { getElementById: () => present ? profile : null },
    tmRuntime: { register: (_name, fn) => job = fn } });
  return { owner, rows, calls, reschedules, profile, nativeRender, cleanup,
    update: () => job(), render: () => owner.$options.render.call(owner),
    remove: () => { present = false; element.isConnected = false; },
    hide: () => { visible = false; }, renders: () => renders };
}
function buttons(tree, label) {
  const found = [];
  function walk(node) {
    if (node.tag === 'button' && node.children?.some(c => c.text?.trim() === label)) found.push(node);
    for (const c of node.children || []) walk(c);
  }
  walk(tree); return found;
}
test('Editar é acrescentado após Remarcar somente nas faltas e abre o registro correto pelo método nativo', () => {
  const f = fixture(); f.update(); const tree = f.render();
  const edits = buttons(tree, 'Editar'); assert.equal(edits.length, 2);
  const actions = tree.children[1].children[0].children[0].children[0].children[1].children[1].children;
  assert.equal(actions[0].children[0].text, 'Remarcar'); assert.equal(actions[1], edits[0]);
  assert.equal(edits[1].data.on.click(), 'native editor');
  assert.equal(f.calls[0].row, f.rows[2]); assert.equal(f.calls[0].self, f.owner);
  actions[0].data.on.click(); assert.equal(f.reschedules[0], f.rows[1]);
  assert.equal(f.rows[2].ch_estado_marcacao, 'A');
});
test('rerender não duplica botões nem perde o vínculo ao reordenar a lista', () => {
  const f = fixture(); f.update(); f.update();
  assert.equal(buttons(f.render(), 'Editar').length, 2); assert.equal(f.renders(), 1);
  f.owner.lista = [f.rows[2], f.rows[0]];
  const edits = buttons(f.render(), 'Editar'); assert.equal(edits.length, 1);
  edits[0].data.on.click(); assert.equal(f.calls[0].row, f.rows[2]);
});
test('clique obsoleto não abre registro substituído, status alterado ou perfil fechado', () => {
  for (const change of [f => f.owner.lista = [], f => f.rows[1].item_status.valor = 'atendido', f => f.hide(), f => f.remove()]) {
    const f = fixture(); f.update(); const edit = buttons(f.render(), 'Editar')[0];
    assert.ok(edit); change(f); edit.data.on.click(); assert.equal(f.calls.length, 0);
  }
});
test('não acrescenta edição em histórico, impressão, usuário externo, cancelamento, bloqueio ou com atendimento', () => {
  for (const change of [f => f.owner.historico = true, f => f.owner.imprimindo = true,
    f => f.owner.$store.state.user.st_tipo = 'P', f => f.owner.readonly = true]) {
    const f = fixture(); change(f); f.update(); assert.equal(buttons(f.render(), 'Editar').length, 0);
  }
  const f = fixture(); f.rows[1].ch_estado_marcacao = 'C'; f.rows[2].id_atendimento = 9;
  f.update(); assert.equal(buttons(f.render(), 'Editar').length, 0);
  f.rows[1].ch_estado_marcacao = 'B'; assert.equal(buttons(f.render(), 'Editar').length, 0);
});
test('desmontar restaura o render nativo e invalida os cliques anteriores', () => {
  const f = fixture(); f.update(); const edit = buttons(f.render(), 'Editar')[0]; assert.ok(edit);
  f.remove(); f.update(); assert.equal(f.owner.$options.render, f.nativeRender);
  edit.data.on.click(); assert.equal(f.calls.length, 0); f.cleanup();
});
test('reutilizar o mesmo objeto com outro ID invalida o botão anterior', () => {
  const f = fixture(); f.update(); const edit = buttons(f.render(), 'Editar')[0];
  f.rows[1].id_marcacao = 90; edit.data.on.click(); assert.equal(f.calls.length, 0);
});
test('não oferece editar se o Remarcar nativo está desabilitado ou o ID não é válido', () => {
  const f = fixture();
  const render = f.owner.$options.render;
  f.owner.$options.render = function () {
    const tree = render.call(this);
    buttons(tree, 'Remarcar')[1].data.attrs.disabled = '';
    return tree;
  };
  f.rows[2].id_marcacao = null; f.update();
  assert.equal(buttons(f.render(), 'Editar').length, 0);
});
