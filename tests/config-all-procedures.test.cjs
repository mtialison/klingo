const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '../src/41-config-todos-procedimentos.js');
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
function fixture(options = {}) {
  let job = () => {}, route = '#/config/procedimentos', renders = 0;
  const requests = [], contexts = [];
  const client = { CancelToken: { source: () => ({ token: {}, cancel() {} }) },
    post(url, body, config) { requests.push({ url, body, config, self: this }); return Promise.resolve({}); } };
  const h = (tag, data = {}, children = []) => {
    const node = { tag, data, children };
    if (tag === 'az-input' || tag === 'az-empty-state') {
      node.componentOptions = { propsData: { ...data.attrs } };
      node.data = { ...data, attrs: {} }; // Vue extrai props de componentes antes de devolver o VNode.
    }
    return node;
  };
  // Native load shape from chunk-15c7a508.8f51f128.js; transport is replaced to avoid network access.
  const owner = { especialidade: '', setup: false, link: false, id_procedimento: null,
    classificacao: '', search: '', page: 1, viewMode: 'A', filtro_material: 'T',
    dados: null, $el: { isConnected: true }, $children: [], $createElement: h,
    $store: { state: { loading: false }, commit(name, value) { contexts.push([name, value]); } },
    $options: { render() {
      return h('div', {}, [h('az-input', { attrs: { type: 'select' }, model: { expression: 'especialidade' } }),
        h('az-empty-state', { attrs: { msg: 'Selecione a Especialidade' } }),
        h('az-input', { ref: 'info_procedimento' })]);
    } },
    load() {
      this.$store.commit('setContexto', { especialidade: this.especialidade ? this.especialidade.id_especialidade : null });
      if (this.fail) throw Error('native load failed');
      const where = this.id_procedimento && this.link ? { id_procedimento: this.id_procedimento }
        : { id_especialidade: this.especialidade ? this.especialidade.id_especialidade : -1 };
      if (this.classificacao) where.id_classe_procedimento = this.classificacao;
      const body = { q: [{ name: 'procedimentos.index', id: 'lista', parms: { lista_cadastro: true, where,
        cadastro: true, busca: this.search, size: 100, page: this.page, ativos: this.viewMode === 'A',
        filtro_material: this.especialidade?.id_especialidade === 2 ? this.filtro_material : 'T' } },
      { name: 'configuracao_pacs.index', id: 'config', parms: { where: { fl_ativo: '1' } } }] };
      this.nativePayload = body;
      this.canceltoken?.cancel('#BC#'); this.canceltoken = this.axios.CancelToken.source();
      this.axios.post('/aql?a=procedimentos.index&page=' + this.page, body, { cancelToken: this.canceltoken.token });
      return 'native result';
    },
    editar() {}, incluir_procedimento() {}, buscarItems() {}, $forceUpdate() { renders++; }
  };
  Object.defineProperty(owner, 'axios', { configurable: true, get: () => client });
  Object.assign(owner, options);
  if (options.watchSpecialty) {
    let specialty = owner.especialidade;
    Object.defineProperty(owner, 'especialidade', { get: () => specialty,
      set(value) { const changed = value !== specialty; specialty = value; if (changed) this.load(); } });
  }
  const original = owner.load, render = owner.$options.render, descriptor = Object.getOwnPropertyDescriptor(owner, 'axios');
  const root = { $children: [owner] };
  const cleanup = vm.runInNewContext(source, { window: { location: { get hash() { return route; } } },
    document: { getElementById: id => id === 'app' && !options.noAppId ? { __vue__: root } : null,
      querySelectorAll: () => [{ __vue__: root }, owner.$el] },
    tmRuntime: { register: (_name, fn) => job = fn } });
  return { owner, client, requests, contexts, original, render, descriptor, cleanup,
    update: () => job(), tree: () => owner.$options.render.call(owner),
    leave: () => { route = '#/recepcao'; }, renders: () => renders };
}
test('sem especialidade, consulta todas sem alterar cliente compartilhado ou payload original', () => {
  const f = fixture(); f.update(); assert.equal(f.requests.length, 1);
  assert.deepEqual(Object.keys(f.requests[0].body.q[0].parms.where), []);
  assert.equal(f.owner.nativePayload.q[0].parms.where.id_especialidade, -1);
  assert.equal(f.requests[0].self, f.client);
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.owner, 'axios'), f.descriptor);
  assert.equal(f.tree().children[0].componentOptions.propsData.placeholder, 'Todas as especialidades');
  assert.notEqual(f.tree().children[1].componentOptions.propsData.msg, 'Selecione a Especialidade');
  assert.equal(f.tree().children.filter(n => n.data?.ref === 'info_procedimento').length, 0);
});
test('busca, classificação, página e Ativos/Todos continuam enviados nativamente', () => {
  const f = fixture(); f.update(); f.owner.search = 'eletro'; f.owner.classificacao = 3; f.owner.page = 4;
  f.owner.viewMode = 'T'; assert.equal(f.owner.load(), 'native result');
  const req = f.requests.at(-1); const p = req.body.q[0].parms;
  assert.equal(p.busca, 'eletro'); assert.equal(p.page, 4); assert.equal(p.size, 100);
  assert.equal(p.ativos, false); assert.equal(p.where.id_classe_procedimento, 3);
  assert.equal(p.where.id_especialidade, undefined);
  assert.equal(req.body.q[1], f.owner.nativePayload.q[1]);
  assert.equal(req.config.cancelToken, f.owner.canceltoken.token);
});
test('seleção manual de especialidade continua restringindo a consulta', () => {
  const f = fixture(); f.update(); f.owner.especialidade = { id_especialidade: 2 }; f.owner.filtro_material = 'C';
  f.owner.load(); const p = f.requests.at(-1).body.q[0].parms;
  assert.equal(p.where.id_especialidade, 2); assert.equal(p.filtro_material, 'C');
});
test('abrir por ID ou setup mantém o comportamento original e não carrega todas', () => {
  for (const option of [{ id_procedimento: 9, link: true }, { setup: true }]) {
    const f = fixture(option); f.update(); assert.equal(f.requests.length, 0);
    f.owner.load(); assert.equal(f.requests[0].body, f.owner.nativePayload);
  }
});
test('atualizações do DOM não repetem carga e sair da rota restaura os métodos', () => {
  const f = fixture(); f.update(); f.update(); f.update(); assert.equal(f.requests.length, 1);
  f.leave(); f.update(); assert.equal(f.owner.load, f.original); assert.equal(f.owner.$options.render, f.render);
});
test('falha síncrona do load restaura o acesso ao cliente e preserva a exceção', () => {
  const f = fixture(); f.update(); f.owner.fail = true;
  assert.throws(() => f.owner.load(), /native load failed/);
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.owner, 'axios'), f.descriptor);
});
test('entrada limpa especialidade anterior uma vez e o watcher nativo carrega todas desde a página1', () => {
  const f = fixture({ especialidade: { id_especialidade: 8 }, page: 6, watchSpecialty: true });
  f.update(); assert.equal(f.owner.especialidade, ''); assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].body.q[0].parms.page, 1);
  assert.equal(f.requests[0].body.q[0].parms.where.id_especialidade, undefined);
  f.owner.especialidade = { id_especialidade: 3 }; f.update();
  assert.equal(f.requests.at(-1).body.q[0].parms.where.id_especialidade, 3);
});
test('consultas de outros componentes não são ampliadas pelo cliente compartilhado', () => {
  const f = fixture(); f.update();
  const body = { q: [{ name: 'procedimentos.index', id: 'lista', parms: {
    cadastro: true, lista_cadastro: true, where: { id_especialidade: -1 }
  } }] };
  f.client.post('/aql', body); assert.equal(f.requests.at(-1).body, body);
  assert.equal(f.requests.at(-1).body.q[0].parms.where.id_especialidade, -1);
});
test('encontra a página quando o Vue substitui o ponto de montagem e o DOM já não possui #app', () => {
  const f = fixture({ noAppId: true }); f.update();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].body.q[0].parms.where.id_especialidade, undefined);
  assert.equal(f.tree().children[0].componentOptions.propsData.placeholder, 'Todas as especialidades');
});
