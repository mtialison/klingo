/* Manter o perfil aberto quando sua marcação é editada pelo fluxo nativo. */
(function () {
  'use strict';
  let patch = null, stack = null, observer = null;
  function bootstrap(element) {
    if (!element) return null;
    for (const key of Object.keys(element)) {
      if (key.startsWith('jQuery') && element[key]?.['bs.modal']?._element === element) {
        return element[key]['bs.modal'];
      }
    }
    return null;
  }
  const shown = element => !!element?.classList.contains('show');
  const zSnapshot = element => [element.style.getPropertyValue('z-index'), element.style.getPropertyPriority('z-index')];
  function restoreZ(element, saved) {
    if (!element || !saved) return;
    if (saved[0]) element.style.setProperty('z-index', saved[0], saved[1]);
    else element.style.removeProperty('z-index');
  }
  function setZ(element, value) {
    if (element && element.style.getPropertyValue('z-index') !== String(value)) {
      element.style.setProperty('z-index', String(value));
    }
  }
  function clearStack() {
    if (!stack) return;
    const s = stack; stack = null;
    restoreZ(s.edit, s.editZ); restoreZ(s.backdrop, s.backdropZ);
    if (!s.inert) s.profile.removeAttribute('inert');
    if (s.ariaHidden === null) s.profile.removeAttribute('aria-hidden');
    else s.profile.setAttribute('aria-hidden', s.ariaHidden);
    if (shown(s.profile)) {
      document.body.classList.add('modal-open');
      const bs = bootstrap(s.profile);
      if (bs?._config?.focus !== false) {
        bs?._enforceFocus?.();
        const target = s.focus?.isConnected && s.profile.contains(s.focus) ? s.focus : s.profile;
        target.focus({ preventScroll: true });
      }
    }
  }
  function maintainStack() {
    if (!stack) return;
    const s = stack, bs = bootstrap(s.edit);
    if (!s.profile.isConnected || !shown(s.profile) || !s.edit.isConnected ||
        (!shown(s.edit) && !bs?._isShown && getComputedStyle(s.edit).display === 'none')) {
      clearStack(); return;
    }
    setZ(s.edit, s.base + 20);
    const backdrop = bs?._backdrop;
    if (backdrop && s.backdrop !== backdrop) {
      restoreZ(s.backdrop, s.backdropZ);
      s.backdrop = backdrop; s.backdropZ = zSnapshot(backdrop);
    }
    setZ(backdrop, s.base + 10);
    if (shown(s.edit)) {
      s.profile.setAttribute('inert', '');
      s.profile.setAttribute('aria-hidden', 'true');
    }
  }
  function restorePatch() {
    if (patch && patch.vm.abrir === patch.wrapped) patch.vm.abrir = patch.original;
    patch = null; observer?.disconnect(); observer = null;
  }
  function update() {
    const edit = document.getElementById('editarMarcacaoModal');
    let vm = null;
    for (let node = edit; node; node = node.parentElement) {
      if (node.__vue__?.$options?.methods?.atualizar && typeof node.__vue__.abrir === 'function') {
        vm = node.__vue__; break;
      }
    }
    if (!vm || vm._isDestroyed) { clearStack(); restorePatch(); return; }
    if (patch?.vm !== vm) {
      clearStack(); restorePatch();
      const original = vm.abrir;
      const wrapped = function (...args) {
        const profile = document.getElementById('perfilPacienteModal'), bs = bootstrap(profile);
        if (!shown(profile) || typeof bs?.hide !== 'function') return original.apply(this, args);
        clearStack();
        const descriptor = Object.getOwnPropertyDescriptor(bs, 'hide');
        Object.defineProperty(bs, 'hide', { configurable: true, writable: true, value() {} });
        const focus = document.activeElement;
        let result;
        try { result = original.apply(this, args); }
        finally {
          if (descriptor) Object.defineProperty(bs, 'hide', descriptor);
          else delete bs.hide;
        }
        const base = Math.max(1050, ...Array.from(document.querySelectorAll('.modal.show'))
          .filter(element => element !== edit).map(element => Number.parseInt(getComputedStyle(element).zIndex, 10) || 1050));
        stack = { profile, edit, base, editZ: zSnapshot(edit), inert: profile.hasAttribute('inert'),
          ariaHidden: profile.getAttribute('aria-hidden'), focus };
        tmRuntime.schedule(0);
        return result;
      };
      vm.abrir = wrapped; patch = { vm, original, wrapped };
      observer = new MutationObserver(() => tmRuntime.schedule(0));
      observer.observe(edit, { attributes: true, attributeFilter: ['class', 'style'] });
      const profile = document.getElementById('perfilPacienteModal');
      if (profile) observer.observe(profile, { attributes: true, attributeFilter: ['class'] });
    }
    maintainStack();
    if (!stack && shown(document.getElementById('perfilPacienteModal'))) document.body.classList.add('modal-open');
  }
  tmRuntime.register('edição de marcação sobre o perfil', update);
  return () => { clearStack(); restorePatch(); };
})();
