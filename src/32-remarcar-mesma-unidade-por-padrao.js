/* Definir a unidade no modelo nativo uma vez por abertura, sem impedir desmarcar. */
(function () {
  'use strict';
  let current = null, unwatch = null;
  const onRoute = () => /^#\/(recepcao|call-center\/confirmacao)(\/|$)/.test(window.location.hash.split('?')[0]);

  function cleanup() {
    unwatch?.(); unwatch = null; current = null;
  }

  function update() {
    if (!onRoute()) { cleanup(); return; }
    let vm = null;
    for (let node = document.getElementById('remarcarComboModal'); node; node = node.parentElement) {
      const candidate = node.__vue__;
      if (candidate?.$options?.methods?.remarcar && 'dados' in candidate &&
          typeof candidate.$watch === 'function') { vm = candidate; break; }
    }
    if (!vm || vm._isDestroyed) { cleanup(); return; }
    if (current === vm) return;
    cleanup(); current = vm;
    // remarcar() limpa dados e o preenche após a consulta. Observar só a referência:
    // mudar o checkbox dentro do mesmo objeto não deve reativá-lo.
    unwatch = vm.$watch('dados', data => {
      if (onRoute() && data && typeof data === 'object') {
        vm.$set(data, 'manter_mesma_unidade', true);
      }
    }, { immediate: true });
  }
  tmRuntime.register('remarcar na mesma unidade por padrão', update, ['#/recepcao', '#/call-center/confirmacao']);
})();
