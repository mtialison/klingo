/* Configurações > Agendas: recarrega os dados quando a rota volta com médico restaurado. */
(function () {
  'use strict';

  const ROUTE = '#/config/agendas';
  const loadRequested = new WeakSet();
  let readyRetry = null;
  let cachedComponent = null;

  function onRoute() {
    return window.location.hash.split('?')[0] === ROUTE;
  }

  function findAgendasComponent() {
    if (cachedComponent && !cachedComponent._isDestroyed && cachedComponent.$el?.isConnected &&
        cachedComponent.$route?.path === '/config/agendas') return cachedComponent;

    const roots = [window.app, document.getElementById('app')?.__vue__].filter(Boolean);
    const seen = new Set();

    function scan(queue) {
      for (let index = 0; index < queue.length; index++) {
        const component = queue[index];
        if (!component || seen.has(component) || component._isDestroyed) continue;
        seen.add(component);

        if (component.$route?.path === '/config/agendas' &&
            typeof component.load === 'function' &&
            typeof component.medico_inicial === 'function' &&
            Object.prototype.hasOwnProperty.call(component, 'dados') &&
            Object.prototype.hasOwnProperty.call(component, 'montando') &&
            !component.setup) {
          return component;
        }

        queue.push(...(component.$children || []));
      }
      return null;
    }

    const fromRoots = scan(roots);
    if (fromRoots) return (cachedComponent = fromRoots);

    // O Klingo às vezes substitui #app; nesse caso, encontre as raízes Vue atuais no DOM.
    const domRoots = Array.from(document.querySelectorAll('body *'), element => element.__vue__).filter(Boolean);
    return (cachedComponent = scan(domRoots));

  }

  function checkAgendasList() {
    if (!onRoute()) {
      cachedComponent = null;
      if (readyRetry !== null) {
        window.clearTimeout(readyRetry);
        readyRetry = null;
      }
      return;
    }

    const component = findAgendasComponent();
    if (!component) return;

    if (component.montando) {
      if (readyRetry === null) {
        readyRetry = window.setTimeout(() => {
          readyRetry = null;
          checkAgendasList();
        }, 120);
      }
      return;
    }

    if (!component.medico?.id_pessoa || component.dados !== null || loadRequested.has(component)) return;

    loadRequested.add(component);
    try {
      component.load();
    } catch (error) {
      loadRequested.delete(component);
      throw error;
    }
  }

  tmRuntime.register('recarregar agendas ao retornar do log', checkAgendasList, [ROUTE]);
})();
