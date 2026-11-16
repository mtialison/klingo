/* Configurações > Operadoras: mostra a listagem sem animação de zoom. */
(function () {
  'use strict';

  const LIST_ROUTE = '#/config/operadoras';
  const ROOT_CLASS = 'tm-operadoras-lista-estatica';
  const STYLE_ID = 'tm-operadoras-lista-estatica-style';

  function getRoute() {
    return window.location.hash.split('?')[0];
  }

  function syncRoute() {
    document.documentElement.classList.toggle(ROOT_CLASS, getRoute() === LIST_ROUTE);
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html.${ROOT_CLASS} #azure-body .layout-main .list-group.az-anime-surgir {
        animation: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  injectStyle();
  syncRoute();
  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('popstate', syncRoute);
  window.addEventListener('pageshow', syncRoute);

  tmRuntime.register('listagem de operadoras sem animação', syncRoute, [LIST_ROUTE]);
})();
