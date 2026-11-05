/* Sinalizador junto ao horário e observação em linha própria nos dois agendamentos. */
(function () {
  'use strict';
  const targets = new Map([
    ['novoAtendimento2Modal', 'recep'], ['novoAtendimentoConfirmacaoModal', 'confirm']
  ]);
  const patches = new Map();
  const STYLE_ID = 'tm-booking-attendance-flag-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style'); style.id = STYLE_ID;
    style.textContent = Array.from(targets.keys()).map(id => `
      @media (min-width: 768px) {
        #${id} .tm-booking-flag-row > .tm-booking-flag-col {
          flex: 0 0 25% !important; max-width: 25% !important; min-width: 0;
        }
      }
      #${id} .tm-booking-observation-row > .tm-recepcao-observacao-col {
        flex: 0 0 100% !important; max-width: 100% !important;
      }
      #${id} .tm-booking-observation-row textarea.form-control {
        height: calc(3em + 1rem + 4px) !important;
        min-height: calc(3em + 1rem + 4px) !important;
        width: 100% !important; box-sizing: border-box;
      }
      #${id} .tm-booking-flag-col .input-group { flex-wrap: nowrap; }
      #${id} .tm-booking-flag-col select { min-width: 0; }
    `).join('\n');
    document.head.appendChild(style);
  }
  function hasSignal(node) {
    return !!node && (node.data?.attrs?.service === 'sinalizadores.index' ||
      node.componentOptions?.propsData?.service === 'sinalizadores.index' ||
      (node.children || []).some(hasSignal));
  }
  function addSignal(tree, owner) {
    const h = owner.$createElement.bind(owner);
    const visit = (node, parent) => {
      if (!node) return;
      if ((node.data?.staticClass || '').split(/\s+/).includes('tm-booking-observation-row')) return;
      const columns = node.children || [];
      if ((node.data?.staticClass || '').split(/\s+/).includes('form-row')) {
        const index = columns.findIndex(col => (col.children || []).some(field =>
          field.data?.model?.expression === 'st_observacoes'));
        if (index >= 0 && parent?.children) {
          let signal = columns.find(hasSignal);
          if (!signal) {
            const input = h('az-input', {
            attrs: { sizing: 'sm', type: 'select', optionsMode: 'aql', service: 'sinalizadores.index', optionsParm: { ativos: true } },
            scopedSlots: { 'button-pre': () => [h('div', { staticClass: 'input-group-prepend' }, [
              h('span', { staticClass: 'input-group-text' }, [h('i', {
                class: owner.sinalizador_atendimento ?
                  (owner.sinalizador_atendimento.st_icon || 'fas fa-flag') + ' fa-fw text-' + owner.sinalizador_atendimento.st_cor :
                  'fa-fw fas fa-question text-muted', attrs: { 'aria-hidden': 'true' }
              })])
            ])] },
            model: { value: owner.sinalizador_atendimento, callback: value => { owner.sinalizador_atendimento = value; },
              expression: 'sinalizador_atendimento' }
          });
            signal = h('div', { staticClass: 'col col-12 tm-booking-flag-col' }, [
              h('az-sub-title', { attrs: { title: 'Sinalizador' } }), input
            ]);
          } else {
            signal.data ||= {};
            signal.data.staticClass = 'col col-12 tm-booking-flag-col';
            const title = signal.children?.find(child => child.data?.attrs?.title || child.componentOptions?.propsData?.title);
            if (title?.data?.attrs?.title) title.data.attrs.title = 'Sinalizador';
            if (title?.componentOptions?.propsData) title.componentOptions.propsData.title = 'Sinalizador';
          }
          const observation = columns[index];
          const input = observation.children.find(field => field.data?.model?.expression === 'st_observacoes');
          input.data.attrs = { ...input.data.attrs, type: 'textarea', rows: '2' };
          if (input.componentOptions?.propsData) {
            input.componentOptions.propsData.type = 'textarea'; input.componentOptions.propsData.rows = '2';
          }
          observation.data.staticClass = 'col col-12'; observation.data.class = null;
          if (signal !== observation && columns.includes(signal)) columns.splice(columns.indexOf(signal), 1);
          columns.splice(columns.indexOf(observation), 1, signal);
          if (!node.data.staticClass.includes('tm-booking-flag-row')) node.data.staticClass += ' tm-booking-flag-row';
          parent.children.splice(parent.children.indexOf(node) + 1, 0,
            h('div', { staticClass: 'form-row tm-booking-observation-row' }, [observation]));
          return;
        }
      }
      for (const child of columns) visit(child, node);
    };
    visit(tree);
  }
  function restore(id) {
    const p = patches.get(id);
    if (p && p.owner.$options.render === p.render) p.owner.$options.render = p.original;
    patches.delete(id);
  }
  function update() {
    for (const [id, origin] of targets) {
      const modal = document.getElementById(id);
      let owner = null;
      const matches = v => v?.origem === origin && typeof v.marcar === 'function' && !v._isDestroyed;
      for (const child of modal?.querySelectorAll('*') || []) if (matches(child.__vue__)) { owner = child.__vue__; break; }
      for (let node = modal; !owner && node; node = node.parentElement) {
        if (matches(node.__vue__)) owner = node.__vue__;
        else if (matches(node.__vue__?.$refs?.marcacao)) owner = node.__vue__.$refs.marcacao;
      }
      if (!owner) { restore(id); continue; }
      if (patches.get(id)?.owner === owner) continue;
      restore(id); injectStyle();
      const original = owner.$options.render;
      const render = function (...args) {
        const tree = original.apply(this, args); addSignal(tree, this); return tree;
      };
      owner.$options.render = render;
      patches.set(id, { owner, original, render }); owner.$forceUpdate();
    }
  }
  tmRuntime.register('sinalizador nos modais de agendamento', update);
  return () => { for (const id of targets.keys()) restore(id); };
})();
