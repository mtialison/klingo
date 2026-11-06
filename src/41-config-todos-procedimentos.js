/* Configurações: filtro vazio lista procedimentos de todas as especialidades. */
(function () {
  'use strict';
  let patch = null;
  const onRoute = () => /^#\/config\/procedimentos(?:\/|\?|$)/.test(window.location.hash);
  const allMode = owner => !owner.setup && !owner.link && !owner.id_procedimento && !owner.especialidade;
  function queryAll(url, body) {
    if (typeof url !== 'string' || !/^\/aql(?:\?|$)/.test(url) || !Array.isArray(body?.q)) return body;
    let changed = false;
    const q = body.q.map(query => {
      const p = query.parms;
      if (query.name !== 'procedimentos.index' || query.id !== 'lista' || !p?.cadastro ||
          !p.lista_cadastro || p.where?.id_especialidade !== -1) return query;
      const where = { ...p.where }; delete where.id_especialidade; changed = true;
      return { ...query, parms: { ...p, where } };
    });
    return changed ? { ...body, q } : body;
  }
  function adjustRender(tree, owner) {
    if (!tree || owner.setup || owner.link || owner.id_procedimento) return tree;
    if (tree.data?.model?.expression === 'especialidade') {
      if (tree.componentOptions) tree.componentOptions.propsData = {
        ...tree.componentOptions.propsData, placeholder: 'Todas as especialidades'
      };
      else tree.data.attrs = { ...tree.data.attrs, placeholder: 'Todas as especialidades' };
    }
    if (allMode(owner)) {
      if (tree.data?.ref === 'info_procedimento') return null;
      if ((tree.componentOptions?.propsData?.msg ?? tree.data?.attrs?.msg) === 'Selecione a Especialidade') {
        return owner.$createElement('az-empty-state', { attrs: { icon: 'fa fa-search',
          msg: owner.$store.state.loading ? 'Carregando procedimentos...' : 'Nenhum procedimento encontrado' } });
      }
    }
    if (tree.children) tree.children = tree.children.map(node => adjustRender(node, owner)).filter(Boolean);
    return tree;
  }
  function detach() {
    if (!patch) return;
    const p = patch; patch = null;
    if (p.vm.load === p.load) p.vm.load = p.originalLoad;
    if (p.vm.$options.render === p.render) p.vm.$options.render = p.originalRender;
    if (!p.vm._isDestroyed) p.vm.$forceUpdate();
  }
  function component() {
    const root = document.getElementById('app')?.__vue__;
    // O Vue pode substituir o elemento de montagem: #app não permanece no DOM do Klingo.
    const queue = root ? [root] : Array.from(document.querySelectorAll('body *'), node => node.__vue__).filter(Boolean);
    const seen = new Set();
    for (let i = 0; i < queue.length; i++) {
      const owner = queue[i];
      if (!owner || seen.has(owner) || owner._isDestroyed) continue;
      seen.add(owner);
      if (typeof owner.load === 'function' && typeof owner.incluir_procedimento === 'function' &&
          typeof owner.buscarItems === 'function' && typeof owner.editar === 'function' &&
          typeof owner.$options?.render === 'function' && !owner.setup && !owner.id_procedimento && !owner.link) return owner;
      queue.push(...(owner.$children || []));
    }
    return null;
  }
  function update() {
    if (!onRoute()) { detach(); return; }
    if (patch && !patch.vm._isDestroyed && patch.vm.$el?.isConnected) return;
    detach();
    const owner = component();
    if (!owner) return;
    const originalLoad = owner.load, originalRender = owner.$options.render;
    const load = function (...args) {
      if (!onRoute() || !allMode(this)) return originalLoad.apply(this, args);
      const client = this.axios, descriptor = Object.getOwnPropertyDescriptor(this, 'axios');
      // A fachada existe somente durante o load síncrono; nenhuma alteração no Axios compartilhado.
      const facade = Object.create(client);
      Object.defineProperty(facade, 'post', { value: (url, body, ...options) =>
        client.post(url, queryAll(url, body), ...options) });
      Object.defineProperty(this, 'axios', { configurable: true, value: facade });
      try { return originalLoad.apply(this, args); }
      finally {
        if (descriptor) Object.defineProperty(this, 'axios', descriptor);
        else delete this.axios;
      }
    };
    const render = function (...args) { return adjustRender(originalRender.apply(this, args), this); };
    owner.load = load; owner.$options.render = render;
    patch = { vm: owner, load, render, originalLoad, originalRender };
    owner.page = 1;
    if (owner.especialidade) owner.especialidade = ''; // O watcher nativo chama load ao limpar a seleção anterior.
    else owner.load();
    owner.$forceUpdate();
  }
  tmRuntime.register('configuração de todos os procedimentos', update, ['#/config/procedimentos']);
  return detach;
})();
