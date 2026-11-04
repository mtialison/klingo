/* Cancelamento sobre o perfil: campo estável durante a carga e dismiss isolado. */
(function () {
  'use strict';
  let patch = null, stack = null, observer = null;
  const shown = element => !!element?.classList.contains('show');
  function restoreProfile() {
    if (!stack) return;
    const s = stack; stack = null;
    if (shown(s.profile)) {
      document.body.classList.add('modal-open');
      for (const key of Object.keys(s.profile)) {
        const bs = key.startsWith('jQuery') && s.profile[key]?.['bs.modal'];
        if (bs?._element === s.profile && bs._config?.focus !== false) {
          bs._enforceFocus?.();
          const target = s.focus?.isConnected && s.profile.contains(s.focus) ? s.focus : s.profile;
          target.focus({ preventScroll: true });
          break;
        }
      }
    }
  }
  function captureProfile() {
    const profile = document.getElementById('perfilPacienteModal');
    if (stack || !shown(profile)) return;
    stack = { profile, focus: document.activeElement };
  }
  function addPendingReason(tree, owner) {
    if (!tree || owner.motivos?.length || !owner.marcacao || owner.$store?.state?.user?.st_tipo !== 'U') return;
    const walk = node => {
      if (!node) return;
      if ((node.data?.staticClass || '').split(/\s+/).includes('modal-body')) {
        const children = node.children || [], index = children.findIndex(child =>
          child.componentOptions?.propsData?.label === 'Motivo de Cancelamento' ||
          child.data?.attrs?.label === 'Motivo de Cancelamento');
        if (index < 0) return;
        const h = owner.$createElement.bind(owner);
        const row = h('div', { staticClass: 'row' }, [h('div', { staticClass: 'col col-12' }, [
          h('az-input', { attrs: { label: 'Motivo', type: 'select', optionsList: [], optionsData: 'id_motivo',
            placeholder: 'Carregando motivos...', edicao: false, required: '', validate: owner.validate },
            model: { value: owner.id_motivo, callback: value => { owner.id_motivo = value; }, expression: 'id_motivo' } })
        ])]);
        // Replace the native conditional comment: no extra field when the response arrives.
        if (children[index - 1]?.isComment) children[index - 1] = row;
        else children.splice(index, 0, row);
        return;
      }
      for (const child of node.children || []) walk(child);
    };
    walk(tree);
  }
  function detach() {
    restoreProfile();
    if (patch) {
      const p = patch;
      if (p.vm.$options.render === p.render) p.vm.$options.render = p.originalRender;
      if (p.vm.cancelar === p.open) p.vm.cancelar = p.originalOpen;
      p.modal.removeEventListener('click', p.dismiss);
      p.modal.removeEventListener('keydown', p.escape);
    }
    patch = null; observer?.disconnect(); observer = null;
  }
  function update() {
    const modal = document.getElementById('cancAtdPepModal');
    let owner = null;
    for (let node = modal; node; node = node.parentElement) {
      if (node.__vue__?.$options?.methods?.confirmar && typeof node.__vue__.cancelar === 'function') {
        owner = node.__vue__; break;
      }
    }
    if (!owner || owner._isDestroyed) { detach(); return; }
    if (patch?.vm !== owner || patch?.modal !== modal) {
      detach();
      const originalRender = owner.$options.render, originalOpen = owner.cancelar;
      const render = function (...args) {
        const tree = originalRender.apply(this, args); addPendingReason(tree, this); return tree;
      };
      const open = function (...args) {
        captureProfile();
        try { return originalOpen.apply(this, args); }
        catch (error) { restoreProfile(); throw error; }
        finally { tmRuntime.schedule(0); }
      };
      // Bootstrap handles dismiss on this same modal. Stop only its propagation to the outer profile.
      const dismiss = event => {
        if (event.target?.closest?.('.modal') === modal && event.target.closest('[data-dismiss="modal"]')) {
          event.stopPropagation();
        }
      };
      const escape = event => {
        if (event.key === 'Escape' && shown(modal) && event.target?.closest?.('.modal') === modal) event.stopPropagation();
      };
      owner.$options.render = render; owner.cancelar = open;
      modal.addEventListener('click', dismiss); modal.addEventListener('keydown', escape);
      patch = { vm: owner, modal, render, open, originalRender, originalOpen, dismiss, escape };
      observer = new MutationObserver(() => tmRuntime.schedule(0));
      observer.observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
      owner.$forceUpdate();
    }
    if (shown(modal)) {
      captureProfile();
      // The cancellation modal is a descendant: inert/aria-hidden on the profile would hide it too.
    } else {
      restoreProfile();
      if (shown(document.getElementById('perfilPacienteModal'))) document.body.classList.add('modal-open');
    }
  }
  tmRuntime.register('cancelamento no perfil', update);
  return detach;
})();
