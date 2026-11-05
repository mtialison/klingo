/* Procedimentos adicionais na Recepção, usando autocomplete e inclusão nativos. */
(function () {
  'use strict';
  const ID = 'novoAtendimento2Modal';
  let patch = null;
  function include(owner, target) {
    const values = Array.isArray(owner.novoProcedimento) ? [...owner.novoProcedimento] : [owner.novoProcedimento];
    const descriptor = Object.getOwnPropertyDescriptor(owner, 'procedimentos');
    const bridge = !owner.procedimentos?.length;
    // A Recepção só monta a lista final em adicao_direta(). Não chamar essa ação nem o gravador aqui.
    // A inclusão nativa requer lista não vazia mesmo quando recebe o alvo explicitamente.
    if (bridge) Object.defineProperty(owner, 'procedimentos', { configurable: true, writable: true, value: [target] });
    try {
      for (const value of values) {
        if (!value?.id_procedimento) continue;
        if (!target.outros_procedimentos) owner.$set(target, 'outros_procedimentos', []);
        owner.novoProcedimento = value;
        owner.incluirProcedimento(target);
      }
    } finally {
      if (bridge) {
        if (descriptor) Object.defineProperty(owner, 'procedimentos', descriptor);
        else delete owner.procedimentos;
      }
    }
  }
  function fields(owner) {
    const h = owner.$createElement.bind(owner), target = owner.dados;
    const rows = (target.outros_procedimentos || []).map((item, index) => h('div', { key: index }, [
      h('az-input', {
        attrs: { sizing: 'sm', edicao: false },
        scopedSlots: {
          'button-pre': () => [h('div', { staticClass: 'input-group-prepend' }, [h('button', {
            staticClass: 'btn btn-outline-danger', attrs: { type: 'button', title: 'Remover procedimento' },
            on: { click: () => owner.removerElemento(target.outros_procedimentos, index) }
          }, [h('i', { staticClass: 'fa fa-minus fa-fw', attrs: { 'aria-hidden': 'true' } })])])],
          buttonposb: () => [
            ...(item.duracao ? [h('span', { staticClass: 'input-group-text small' }, [item.duracao + ' min'])] : []),
            ...(item.js_complementos?.length ? [h('div', { staticClass: 'input-group-append' }, [
              h('button', { staticClass: 'btn btn-sm btn-secondary dropdown-toggle',
                attrs: { type: 'button', 'data-toggle': 'dropdown', 'aria-haspopup': 'true', 'aria-expanded': 'false' } },
              [item.st_regiao || 'Região...']),
              h('div', { staticClass: 'dropdown-menu dropdown-menu-scroll' }, item.js_complementos.map(region =>
                h('a', { staticClass: 'dropdown-item', class: owner.regiao_tem(item, region) ? 'active' : '',
                  attrs: { href: '#' }, on: { click: event => { event.preventDefault(); owner.regiao_add(item, region); } } }, [region])))
            ])] : []),
            ...(item.in_quantidade > 1 ? [h('span', { staticClass: 'input-group-text' }, ['x' + item.in_quantidade])] : [])
          ]
        },
        model: { value: item.search, callback: value => owner.$set(item, 'search', value), expression: 'proced.search' }
      })
    ]));
    rows.push(h('az-input', {
      ref: 'tm_reception_add_procedure',
      attrs: { placeholder: 'Adicionar procedimento...', sizing: 'sm', icon: 'fas fa-plus fa-fw', type: 'autocomplete',
        optionsMode: 'aql', service: 'procedimentos.index', optionsParm: { agenda: true, agenda_add: true, ativos: true,
          id_medico: target.medico.id_pessoa, id_operadora: target.plano.id_operadora, id_plano: target.plano.id_plano,
          cc: owner.cc ? 1 : 0, infusao: owner.infusao ? 1 : 0 }, procsigla: true },
      on: { selecionado: () => include(owner, target) },
      model: { value: owner.novoProcedimento, callback: value => { owner.novoProcedimento = value; }, expression: 'novoProcedimento' }
    }));
    return h('div', { staticClass: 'mt-2 tm-reception-add-procedure' }, rows);
  }
  function insert(tree, owner) {
    if (!owner.dados?.procedimento || !owner.dados.medico || !owner.dados.plano || owner.marcacao_alterar_proc ||
        owner.dados.regiao_cd || owner.dados.procedimento.cfm) return;
    const visit = node => {
      const children = node?.children || [];
      const index = children.findIndex(child => (child.data?.staticClass || '').split(/\s+/).includes('tm-booking-observation-row'));
      if (index >= 0) { children.splice(index + 1, 0, fields(owner)); return true; }
      return children.some(visit);
    };
    visit(tree);
  }
  function restore() {
    if (patch && patch.owner.$options.render === patch.render) patch.owner.$options.render = patch.original;
    patch = null;
  }
  function update() {
    const modal = document.getElementById(ID);
    const owner = Array.from(modal?.querySelectorAll('*') || []).map(e => e.__vue__)
      .find(v => v?.origem === 'recep' && typeof v.marcar === 'function' && typeof v.incluirProcedimento === 'function' && !v._isDestroyed);
    if (!owner) { restore(); return; }
    if (patch?.owner === owner) return;
    restore();
    const original = owner.$options.render;
    const render = function (...args) { const tree = original.apply(this, args); insert(tree, this); return tree; };
    owner.$options.render = render; patch = { owner, original, render }; owner.$forceUpdate();
  }
  tmRuntime.register('adicionar procedimento na Recepção', update);
  return restore;
})();
