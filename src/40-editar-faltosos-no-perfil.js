/* Oferece o editor nativo também nas marcações faltosas da ficha do paciente. */
(function () {
  'use strict';
  let patch = null;
  const hasClass = (node, name) => (node?.data?.staticClass || '').split(/\s+/).includes(name);
  function find(node, predicate) {
    if (!node) return null;
    if (predicate(node)) return node;
    for (const child of node.children || []) {
      const match = find(child, predicate);
      if (match) return match;
    }
    return null;
  }
  function eligible(owner, appointment) {
    return !owner._isDestroyed && !owner.historico && !owner.imprimindo && !owner.readonly &&
      owner.$store?.state?.user?.st_tipo === 'U' &&
      Array.isArray(owner.lista) && owner.lista.includes(appointment) &&
      appointment?.item_status?.valor === 'faltoso' &&
      Number.isSafeInteger(Number(appointment.id_marcacao)) && Number(appointment.id_marcacao) > 0 &&
      !appointment.id_atendimento && !['B', 'C'].includes(appointment.ch_estado_marcacao);
  }
  function addButtons(tree, owner, profile) {
    if (!tree) return;
    if (hasClass(tree, 'card')) {
      // A referência vem do próprio card, sem associar pacientes pelo texto ou posição da lista.
      const view = find(tree, node => node.componentOptions?.tag === 'pre-atendimento-view' ||
        /(?:^|-)pre-atendimento-view$/.test(node.tag || ''));
      const appointment = view?.componentOptions?.propsData?.marcacao;
      if (!eligible(owner, appointment)) return;
      const group = find(tree, node => hasClass(node, 'justify-content-between') &&
        find(node, child => hasClass(child, 'fa-calendar-times')) &&
        find(node, child => child.tag === 'button' && child.children?.some(t => t.text?.trim() === 'Remarcar')));
      if (!group) return;
      const actions = find(group, node => node.children?.some(child => child.tag === 'button' &&
        child.children?.some(t => t.text?.trim() === 'Remarcar')));
      if (!actions || actions.children.some(node => node.data?.attrs?.['data-tm-edit-no-show'])) return;
      const index = actions.children.findIndex(node => node.tag === 'button' &&
        node.children?.some(t => t.text?.trim() === 'Remarcar'));
      const reschedule = actions.children[index];
      const disabled = reschedule.data?.attrs?.disabled;
      if (typeof reschedule.data?.on?.click !== 'function' || (disabled != null && disabled !== false)) return;
      const id = String(appointment.id_marcacao);
      const button = owner.$createElement('button', {
        key: 'tm-edit-no-show-' + appointment.id_marcacao,
        staticClass: 'btn btn-outline-primary ml-2',
        attrs: { type: 'button', 'data-tm-edit-no-show': 'true' },
        on: { click: () => {
          // O perfil e seus cards podem ser reutilizados enquanto o editor carrega.
          if (patch?.vm !== owner || !profile.isConnected || !profile.classList.contains('show') ||
              !owner.$el?.isConnected || !profile.contains(owner.$el) || String(appointment.id_marcacao) !== id ||
              !eligible(owner, appointment)) return;
          return owner.editar_marcacao(appointment);
        } }
      }, ['Editar']);
      actions.children.splice(index + 1, 0, button);
      return;
    }
    for (const child of tree.children || []) addButtons(child, owner, profile);
  }
  function detach() {
    if (!patch) return;
    const p = patch; patch = null;
    if (p.vm.$options.render === p.render) {
      p.vm.$options.render = p.original;
      if (!p.vm._isDestroyed) p.vm.$forceUpdate();
    }
  }
  function update() {
    const profile = document.getElementById('perfilPacienteModal');
    if (patch && patch.profile === profile && !patch.vm._isDestroyed &&
        patch.vm.$el?.isConnected && profile?.contains(patch.vm.$el)) return;
    detach();
    if (!profile) return;
    for (const element of [profile, ...profile.querySelectorAll('*')]) {
      const owner = element.__vue__;
      if (!owner || owner._isDestroyed || !Array.isArray(owner.lista) ||
          typeof owner.editar_marcacao !== 'function' || typeof owner.filtrar !== 'function' ||
          typeof owner.$options?.render !== 'function') continue;
      const original = owner.$options.render;
      const render = function (...args) {
        const tree = original.apply(this, args); addButtons(tree, this, profile); return tree;
      };
      owner.$options.render = render;
      patch = { vm: owner, profile, original, render };
      owner.$forceUpdate();
      break;
    }
  }
  tmRuntime.register('editar faltosos no perfil', update);
  return detach;
})();
