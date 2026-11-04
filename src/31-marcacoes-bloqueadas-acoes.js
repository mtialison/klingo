/* Edição pelo fluxo nativo: manter bloqueio e liberar somente os campos de edição. */
(function () {
  'use strict';
  const FIELDS = new Set(['e-mail', 'Telefone', 'Celular', 'Operadora / Plano', 'Recepção',
    'Teleatendimento', 'Senha', 'Data de Liberação', 'Validade']);
  let patched = null;
  const menuButtons = new Map();
  const MENU = new Set(['Alterar Procedimento', 'Alterar Operadora/Plano']);
  let menuObserver = null;
  const onRoute = () => /^#\/(recepcao|call-center\/confirmacao)(\/|$)/.test(window.location.hash.split('?')[0]);

  function permitted(cell, data) {
    if (!onRoute() || !data || data.ch_estado_marcacao !== 'B' || data.id_atendimento ||
        !/^[1-9]\d*$/.test(String(data.id_marcacao)) || !cell || cell.block_editar ||
        cell.hor?.marcacao?.ch_estado_marcacao !== 'B' || cell.hor.marcacao.id_atendimento ||
        String(cell.hor.marcacao.id_marcacao) !== String(data.id_marcacao)) return false;
    for (let v = cell; v; v = v.$parent) if (v.viewonly || v._isDestroyed) return false;
    return true;
  }

  function cardCell(card) {
    return Array.from(card.querySelectorAll('*')).map(node => node.__vue__)
      .find(v => v?.$options?._componentTag === 'celula-horarios-marcacao');
  }

  function restoreButton(button, entry) {
    const data = cardCell(entry.card)?.hor?.marcacao;
    button.disabled = data ? entry.label === 'Alterar Procedimento'
      ? data.ch_estado_marcacao !== 'A'
      : data.ch_estado_marcacao !== 'A' && !!data.id_paciente : entry.disabled;
    menuButtons.delete(button);
  }

  function updateMenus() {
    const active = new Set();
    if (onRoute()) document.querySelectorAll('.dashcard').forEach(card => {
      if (card.closest('.modal')) return;
      const cell = cardCell(card), data = cell?.hor?.marcacao;
      if (!permitted(cell, data)) return;
      card.querySelectorAll('.dropleft .dropdown-menu button.dropdown-item').forEach(button => {
        const label = button.textContent.trim();
        if (!MENU.has(label)) return;
        if (!menuButtons.has(button)) menuButtons.set(button, { disabled: button.disabled });
        Object.assign(menuButtons.get(button), { card, id: String(data.id_marcacao), label });
        active.add(button);
        if (button.disabled) button.disabled = false;
      });
    });
    for (const [button, entry] of menuButtons) if (!active.has(button)) restoreButton(button, entry);
    if (!onRoute()) { menuObserver?.disconnect(); menuObserver = null; }
    else if (!menuObserver && document.body) {
      menuObserver = new MutationObserver(records => {
        if (records.some(record => menuButtons.has(record.target) && record.target.disabled)) tmRuntime.schedule(0);
      });
      menuObserver.observe(document.body, { attributes: true, attributeFilter: ['disabled'], subtree: true });
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('button.dropdown-item'), entry = menuButtons.get(button);
    if (!entry) return;
    const cell = cardCell(entry.card), data = cell?.hor?.marcacao;
    if (!permitted(cell, data) || String(data.id_marcacao) !== entry.id) {
      event.preventDefault(); event.stopImmediatePropagation(); tmRuntime.schedule(0);
    }
    // Quando válido, o próprio listener nativo abre o modal com o objeto original.
  }, true);

  function editable(vm) {
    const data = vm.dados;
    if (!onRoute() || !data || data.ch_estado_marcacao !== 'B' || data.id_atendimento ||
        !/^[1-9]\d*$/.test(String(data.id_marcacao))) return false;
    for (const card of document.querySelectorAll('.dashcard')) {
      const cell = Array.from(card.querySelectorAll('*')).map(node => node.__vue__).find(v =>
        v?.$options?._componentTag === 'celula-horarios-marcacao' &&
        String(v.hor?.marcacao?.id_marcacao) === String(data.id_marcacao));
      if (permitted(cell, data)) return true;
    }
    return false;
  }

  function unlockFields(node) {
    if (!node || typeof node !== 'object') return;
    const component = node.componentOptions;
    const props = component?.propsData;
    // Nome/CPF e campos fixos permanecem protegidos. Não alterar marcacao_ativa ou dados.
    if (props?.edicao === false &&
        ((component.tag === 'az-input' && FIELDS.has(props.label)) || component.tag === 'medico-solicitante')) {
      props.edicao = true;
    }
    node.children?.forEach(unlockFields);
    component?.children?.forEach(unlockFields);
  }

  function restore() {
    if (!patched) return;
    const { vm, original, wrapped } = patched;
    if (vm.$options.render === wrapped) {
      vm.$options.render = original;
      if (!vm._isDestroyed) vm.$forceUpdate();
    }
    patched = null;
  }

  function update() {
    // Compatibilidade com a versão anterior: retirar os itens duplicados do submenu.
    document.querySelectorAll('.tm-blocked-appointment-actions').forEach(group => group.remove());
    updateMenus();
    if (!onRoute()) { restore(); return; }
    let modal = document.getElementById('editarMarcacaoModal'), vm = null;
    for (let node = modal; node; node = node.parentElement) {
      const candidate = node.__vue__;
      if (candidate?.$options?.methods?.abrir && candidate.$options.methods.atualizar &&
          candidate.$options.computed?.marcacao_ativa) { vm = candidate; break; }
    }
    if (!vm || vm._isDestroyed) { restore(); return; }
    if (patched?.vm === vm) return;
    restore();
    const original = vm.$options.render;
    if (typeof original !== 'function') return;
    const wrapped = function (...args) {
      const tree = original.apply(this, args);
      if (editable(this)) unlockFields(tree);
      return tree;
    };
    vm.$options.render = wrapped;
    patched = { vm, original, wrapped };
    vm.$forceUpdate();
  }
  tmRuntime.register('ações em marcações bloqueadas', update, ['#/recepcao', '#/call-center/confirmacao']);
})();
