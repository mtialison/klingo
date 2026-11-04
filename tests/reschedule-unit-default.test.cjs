const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../src/32-remarcar-mesma-unidade-por-padrao.js'), 'utf8');
function fixture(route) {
  let update;
  const calls = [], firstRender = [];
  const modal = { dados: null, $options: { methods: { remarcar() {} } }, remarcar(id, medico, options) {
    calls.push({ id, medico, options, self: this });
    // Mesmo contrato do método nativo: resposta é mesclada às opções antes da montagem.
    this.dados = { manter_mesma_unidade: false, ...options };
    firstRender.push(this.dados.manter_mesma_unidade);
    return 'native result';
  } };
  const original = modal.remarcar, window = { location: { hash: route } };
  const document = { getElementById: () => ({ __vue__: modal }) };
  vm.runInNewContext(code, { document, window, tmRuntime: { register: (_name, fn) => update = fn } });
  return { modal, original, window, calls, firstRender, update: () => update() };
}
for (const route of ['#/recepcao', '#/call-center/confirmacao']) {
  test(`remarcação: checkbox nasce marcada e permite desmarcar até reabrir em ${route}`, () => {
    const f = fixture(route); f.update();
    const options = { cc: false, infusao: false, manter_mesma_unidade: false };
    assert.equal(f.modal.remarcar(123, false, options), 'native result');
    assert.equal(f.firstRender[0], true); assert.equal(f.calls[0].self, f.modal);
    assert.equal(f.calls[0].options.cc, false); assert.equal(options.manter_mesma_unidade, false);
    f.modal.dados.manter_mesma_unidade = false; f.update();
    assert.equal(f.modal.dados.manter_mesma_unidade, false);
    f.modal.remarcar(456, true); assert.equal(f.firstRender[1], true); assert.equal(f.calls[1].medico, true);
  });
}
test('remarcação: fora das rotas preserva opções e restaura método original', () => {
  const f = fixture('#/recepcao'); f.update(); f.window.location.hash = '#/outro';
  const options = { manter_mesma_unidade: false };
  f.modal.remarcar(123, false, options); assert.equal(f.calls[0].options, options);
  f.update(); assert.equal(f.modal.remarcar, f.original);
});
test('remarcação: componente destruído recupera método e não é reinterceptado', () => {
  const f = fixture('#/recepcao'); f.update(); f.modal._isDestroyed = true;
  f.update(); assert.equal(f.modal.remarcar, f.original);
});
