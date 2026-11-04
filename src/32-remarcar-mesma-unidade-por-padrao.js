/* Padrão aplicado antes da criação do checkbox nativo; o usuário pode desmarcar. */
(function () {
  'use strict';
  let patch = null;
  const onRoute = () => /^#\/(recepcao|call-center\/confirmacao)(\/|$)/.test(window.location.hash.split('?')[0]);

  function cleanup() {
    if (patch && patch.vm.remarcar === patch.wrapped) patch.vm.remarcar = patch.original;
    patch = null;
  }

  function update() {
    if (!onRoute()) { cleanup(); return; }
    let vm = null;
    for (let node = document.getElementById('remarcarComboModal'); node; node = node.parentElement) {
      const candidate = node.__vue__;
      if (candidate?.$options?.methods?.remarcar && 'dados' in candidate) { vm = candidate; break; }
    }
    if (!vm || vm._isDestroyed) { cleanup(); return; }
    if (patch?.vm === vm) return;
    cleanup();
    const original = vm.remarcar;
    const wrapped = function (id, trocarMedico, options) {
      if (!onRoute()) return original.apply(this, arguments);
      // O 3º argumento nativo é mesclado à resposta ANTES de montar os campos.
      return original.call(this, id, trocarMedico, { ...options, manter_mesma_unidade: true });
    };
    vm.remarcar = wrapped;
    patch = { vm, original, wrapped };
  }
  tmRuntime.register('remarcar na mesma unidade por padrão', update, ['#/recepcao', '#/call-center/confirmacao']);
})();
