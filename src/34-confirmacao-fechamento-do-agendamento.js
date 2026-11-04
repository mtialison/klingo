/* Corrigir o seletor de conclusão e o cache do diálogo Bootstrap da Confirmação. */
(function () {
  'use strict';
  const ID = 'novoAtendimentoConfirmacaoModal';
  let patch = null;

  function normalize(node) {
    if (!node || typeof node !== 'object') return;
    const component = node.componentOptions, props = component?.propsData;
    if (component?.tag === 'marcacao' && props?.origem === 'confirm' && props.modalName === ID) {
      props.modalName = '#' + ID;
    }
    node.children?.forEach(normalize);
    component?.children?.forEach(normalize);
  }

  function repairDialog(modal) {
    const dialog = modal.querySelector(':scope > .modal-dialog');
    if (!dialog) return;
    for (const key of Object.keys(modal)) {
      const bs = key.startsWith('jQuery') && modal[key]?.['bs.modal'];
      if (!bs || bs._element !== modal || bs._dialog === dialog) continue;
      // modal('hide') pode criar a instância antes de Vue montar o diálogo.
      // Sem _dialog, a transição de show nunca termina e hide passa a ser ignorado.
      bs._dialog = dialog;
      if (bs._isShown && modal.classList.contains('show')) bs._isTransitioning = false;
    }
  }

  function restore() {
    if (patch && patch.vm.$options.render === patch.wrapped) patch.vm.$options.render = patch.original;
    patch = null;
  }

  function update() {
    const modal = document.getElementById(ID);
    if (!modal) { restore(); return; }
    repairDialog(modal);
    let vm = null;
    for (let node = modal; node; node = node.parentElement) {
      const candidate = node.__vue__;
      if (typeof candidate?.$options?.methods?.novoAtendimento === 'function' &&
          typeof candidate.$options.methods.fechar_modal === 'function') { vm = candidate; break; }
    }
    if (!vm || vm._isDestroyed) { restore(); return; }
    if (patch?.vm === vm) return;
    restore();
    const original = vm.$options.render;
    if (typeof original !== 'function') return;
    const wrapped = function (...args) {
      const tree = original.apply(this, args); normalize(tree); return tree;
    };
    vm.$options.render = wrapped; patch = { vm, original, wrapped };
    vm.$forceUpdate();
  }
  tmRuntime.register('fechamento do agendamento da Confirmação', update, ['#/call-center/confirmacao']);
  return restore;
})();
