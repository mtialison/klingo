const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const file = path.join(__dirname, '../src/38-remarcacao-em-modal.js');
const source = fs.readFileSync(file, 'utf8');
function fixture(options = {}) {
  let job = () => {}, renderOptions, mountedHost, hostInstance, nativeSelects = 0, refreshes = 0, destroys = 0, writes = 0;
  const ticks = [], pushes = [], history = [], posts = [], elements = new Map(), listeners = new Map(), timers = new Map();
  let nextTimer = 1, internalModal = false;
  const classes = initial => { const s = new Set(initial); return { contains: k => s.has(k), add: k => s.add(k), remove: k => s.delete(k) }; };
  const make = () => ({ style: { overflow: '' }, classList: classes([]), dataset: {}, children: [], isConnected: true,
    setAttribute() {}, getAttribute: () => null, removeAttribute() {}, hasAttribute: () => false,
    appendChild(c) { this.children.push(c); c.parentElement = this; }, remove() { this.isConnected = false; },
    querySelectorAll: () => [], contains: () => false, focus() { this.focused = true; }, addEventListener() {}, removeEventListener() {} });
  const originElement = make(); originElement.scrollTop = 99;
  const oldModal = make(), newModal = make(); oldModal.id = newModal.id = 'cadastroModal';
  if (options.collision) originElement.querySelectorAll = () => [oldModal];
  const router = { push(location) { pushes.push(location); return Promise.resolve(); }, go(n) { history.push(n); } };
  let resolvePost, rejectPost;
  const axios = { post(url, data) { posts.push({ url, data }); writes++; return new Promise((r, j) => { resolvePost = r; rejectPost = j; }); } };
  const Native = { methods: { avancar_aviso_final() { this.$emit('refresh', this.resumo); this.$router.go(-1); },
    marcar() { this.$nextTick(() => { if (!this.invalid) this.axios.post('/aql', { q: [{ name: 'agendas.store' }] }).catch(() => {}); }); } } };
  const origin = { _uid: 1, $el: originElement, $data: { medico: 12 }, medico: 12, referencia: '2026-12-07', referencia_fim: '2026-12-07',
    $route: { path: '/call-center/confirmacao', params: {}, meta: {} }, $router: router,
    $store: { state: { user: { id_usuario: 7 }, loading: false } }, $refs: {},
    $options: { methods: { load() {} }, components: { Marcacao: Native } },
    load() { refreshes++; }, $nextTick(f) { if (f) ticks.push(f); return Promise.resolve(); },
    $watch() { return () => {}; } };
  function Base(opts) {
    hostInstance = this;
    renderOptions = opts;
    this.$options = opts; this.$refs = {};
    opts.beforeCreate?.call(this);
    this.$mount = host => { mountedHost = host; this.$el = host;
      if (options.collision) this.$el.querySelectorAll = () => [newModal];
      const vnode = opts.render.call(this, (type, data, children) => ({ type, data, children }));
      const find = n => n?.type?.extends ? n : (n?.children || []).map(find).find(Boolean);
      const node = find(vnode); if (node) {
        const child = this.$refs.booking = { ...Native.methods, ...(node.type.methods || {}), ...node.data.props, $options: node.type,
          $router: this._routerRoot?._router || router, $route: this._routerRoot?._route || origin.$route,
          $nextTick: origin.$nextTick, $emit() {}, axios, $store: origin.$store,
          resumo: { ids: [1] }, $forceUpdate() {} };
        node.type.beforeCreate?.call(child);
      }
      return this;
    };
    this.$destroy = () => { destroys++; };
    this.$forceUpdate = () => {};
  }
  Base.observable = value => value;
  origin.$options._base = Base; origin.$root = origin;
  const combo = { dados: { cc: false, infusao: false }, $options: { methods: { remarcar() {}, selecionar() {} } },
    $router: router, $nextTick: origin.$nextTick,
    selecionar(all) { nativeSelects++; this.$nextTick(() => this.$router.push({ name: 'call-center', params: {
      remarcacao: all ? [1, 2] : [1], manter_mesma_unidade: true, desagrupar: [false], blockrepetir: true
    } })); return 'native'; } };
  const originalSelect = combo.selecionar;
  const refresh = { __vue__: origin }, comboEl = { __vue__: combo };
  const body = make(); body.insertBefore = c => body.appendChild(c);
  const focus = { isConnected: true, closest: () => options.modalFocus ? {} : null, focus() { this.focused = true; } };
  const document = { body, head: { appendChild() {} }, activeElement: focus, documentElement: make(), scrollingElement: originElement,
    createElement: make, getElementById: id => id === 'refresh-button' ? refresh : id === 'remarcarComboModal' ? comboEl : elements.get(id),
    querySelectorAll: () => [], querySelector: () => internalModal ? {} : null, addEventListener: (k, f) => listeners.set(k, f), removeEventListener: k => listeners.delete(k) };
  const window = { location: { hash: options.route || '#/call-center/confirmacao' }, scrollX: 0, scrollY: 99,
    scrollTo() {}, addEventListener() {}, removeEventListener() {}, setTimeout: f => { const id = nextTimer++; timers.set(id, f); return id; }, clearTimeout: id => timers.delete(id), clearInterval() {},
    requestAnimationFrame: f => ticks.push(f) };
  const cleanup = vm.runInNewContext(source, { document, window, Promise,
    requestAnimationFrame: window.requestAnimationFrame, setTimeout: window.setTimeout, clearTimeout() {}, clearInterval() {},
    tmRuntime: { register: (_n, f) => job = f, schedule() {} }, console });
  const flush = () => { let guard = 0; while (ticks.length && guard++ < 30) ticks.shift()(); };
  const headerClose = () => {
    const tree = renderOptions.render.call(hostInstance, (type, data, children) => ({ type, data, children }));
    const find = n => n?.data?.attrs?.['aria-label'] === 'Fechar remarcação' ? n : (n?.children || []).map(find).find(Boolean);
    return find(tree).data.on.click();
  };
  return { origin, combo, originalSelect, router, body, Native, cleanup, update: () => job(), flush,
    child: () => hostInstance?.$refs.booking,
    pushes, history, posts, writes: () => writes, selects: () => nativeSelects, refreshes: () => refreshes,
    destroys: () => destroys, host: () => mountedHost, resolve: response => resolvePost(response), reject: error => rejectPost(error),
    window, headerClose, listeners, oldModal, focus, setInternalModal: value => internalModal = value,
    runTimers() { const batch = [...timers]; timers.clear(); for (const [, fn] of batch) fn(); },
    get options() { return renderOptions; } };
}
test('seleção nativa abre host sem navegar e conserva todos os parâmetros da remarcação', () => {
  const f = fixture(); f.update(); assert.equal(f.combo.selecionar(true), 'native'); f.flush();
  assert.equal(f.selects(), 1); assert.equal(f.pushes.length, 0); assert.ok(f.host());
  assert.equal(f.combo.$router, f.router); assert.equal(f.origin.medico, 12);
  assert.deepEqual(Array.from(f.child().remarcacao), [1, 2]);
  assert.equal(f.child().params.blockrepetir, true);
  assert.equal(f.child().$route.path, '/call-center');
  assert.equal(f.origin.$route.path, '/call-center/confirmacao');
});
test('Avançar usa conclusão nativa, fecha e atualiza origem sem voltar no histórico', async () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush();
  assert.ok(f.child()); f.child().marcar(); f.flush();
  f.resolve({ data: { marcar: { status: 200 } } });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  f.child().avancar_aviso_final(); await Promise.resolve(); f.flush();
  assert.equal(f.history.length, 0); assert.equal(f.refreshes(), 1); assert.equal(f.destroys(), 1);
  assert.equal(f.origin.medico, 12); assert.equal(f.origin.$el.scrollTop, 99);
});
test('cliques repetidos não abrem outra sessão de remarcação', () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.combo.selecionar(); f.flush();
  assert.equal(f.selects(), 1); assert.equal(f.pushes.length, 0);
});
test('duplo Concluir faz só uma requisição e só permite nova tentativa após erro', async () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush(); const child = f.child(); assert.ok(child);
  child.marcar(); child.marcar(); f.flush(); assert.equal(f.writes(), 1);
  f.resolve({ data: { marcar: { status: 422 } } });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  child.marcar(); f.flush(); assert.equal(f.writes(), 2);
});
test('desmontagem sem salvar não atualiza a lista e restaura método e router da seleção', () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush(); assert.ok(f.child());
  f.cleanup(); assert.equal(f.refreshes(), 0); assert.equal(f.destroys(), 1);
  assert.equal(f.combo.selecionar, f.originalSelect); assert.equal(f.combo.$router, f.router);
});
test('outras rotas mantêm a navegação nativa', () => {
  const f = fixture({ route: '#/call-center' }); f.update(); f.combo.selecionar(); f.flush();
  assert.equal(f.pushes.length, 1); assert.equal(f.host(), undefined);
});
test('X e Avançar não encerram enquanto a gravação está pendente', async () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush(); f.child().marcar(); f.flush();
  assert.equal(f.headerClose(), false); f.child().avancar_aviso_final();
  assert.equal(f.destroys(), 0); assert.equal(f.refreshes(), 0); assert.equal(f.writes(), 1);
  f.resolve({ data: { marcar: { status: 422 } } });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.headerClose(), true); assert.equal(f.destroys(), 1);
});
test('fechar restaura filtros alterados e não mistura contexto de outra conta', () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush(); f.origin.medico = '';
  f.headerClose(); f.flush(); assert.equal(f.origin.medico, 12);
  const other = fixture(); other.update(); other.combo.selecionar(); other.flush();
  other.origin.medico = ''; other.origin.$store.state.user.id_usuario = 99; other.update();
  assert.equal(other.origin.medico, ''); assert.equal(other.refreshes(), 0); assert.equal(other.destroys(), 1);
});
test('Centro Cirúrgico e Infusão usam seleção nativa sem host', () => {
  for (const kind of ['cc', 'infusao']) {
    const f = fixture(); f.combo.dados[kind] = true; f.update(); f.combo.selecionar(); f.flush();
    assert.equal(f.pushes.length, 1); assert.equal(f.host(), undefined);
  }
});
test('exceção da seleção restaura imediatamente o router original', () => {
  const f = fixture(); f.combo.selecionar = () => { throw Error('native failure'); }; f.update();
  assert.throws(() => f.combo.selecionar(), /native failure/); assert.equal(f.combo.$router, f.router);
});
test('IDs de modais da origem são isolados e restaurados ao fechar', () => {
  const f = fixture({ collision: true }); f.update(); f.combo.selecionar(); f.flush();
  assert.notEqual(f.oldModal.id, 'cadastroModal');
  f.headerClose(); assert.equal(f.oldModal.id, 'cadastroModal');
});
test('cancelamento libera seleção temporária pela função nativa, sem gravar', () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush();
  let released = 0; const child = f.child(); child.horarios = []; child.hora_selecionada = {};
  child.voltar = () => released++;
  f.headerClose(); assert.equal(released, 1); assert.equal(f.writes(), 0); assert.equal(f.refreshes(), 0);
});
test('Escape respeita modal interno e não fecha a tela original', () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush();
  let prevented = 0; const event = { key: 'Escape', preventDefault() { prevented++; }, stopPropagation() {} };
  f.setInternalModal(true); f.listeners.get('keydown')(event); assert.equal(f.destroys(), 0); assert.equal(prevented, 0);
  f.setInternalModal(false); f.listeners.get('keydown')(event);
  assert.equal(prevented, 1); assert.equal(f.destroys(), 1); assert.equal(f.history.length, 0);
});
test('foco sai do modal de seleção para o host e retorna a um alvo visível da origem', () => {
  const f = fixture({ modalFocus: true }); f.update(); f.combo.selecionar(); f.flush();
  assert.equal(f.host().focused, true);
  f.headerClose(); f.flush(); assert.equal(f.origin.$el.focused, true); assert.notEqual(f.focus.focused, true);
});
test('mudança de rota durante gravação aguarda resposta e não restaura contexto antigo', async () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush(); f.child().marcar(); f.flush();
  f.window.location.hash = '#/recepcao'; f.update(); assert.equal(f.destroys(), 0);
  f.resolve({ data: { marcar: { status: 200 } } });
  for (let i = 0; i < 8; i++) await Promise.resolve();
  f.runTimers(); assert.equal(f.destroys(), 1); assert.equal(f.refreshes(), 0); assert.equal(f.history.length, 0);
});
test('rejeição de rede permite tentar novamente sem multiplicar requisições', async () => {
  const f = fixture(); f.update(); f.combo.selecionar(); f.flush(); f.child().marcar(); f.flush();
  f.reject(Error('network failure')); for (let i = 0; i < 8; i++) await Promise.resolve();
  f.child().marcar(); f.flush(); assert.equal(f.writes(), 2);
});
