/* Configurações > Operadoras: indica a última operadora visualizada na lista. */
(function () {
  'use strict';

  const LIST_ROUTE = '#/config/operadoras';
  const LIST_SELECTOR = '#azure-body .list-group.az-anime-surgir';
  const STORAGE_KEY = 'tm_operadoras_ultima_visualizada_v1';
  const ICON_CLASS = 'tm-ultima-operadora-visualizada';
  let lastViewedInMemory = null;
  let lastRoute = getRoute();
  let pendingOperator = null;

  function getRoute() {
    return window.location.hash.split('?')[0];
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isOperatorDetailRoute(route) {
    return /^#\/config\/operadoras\/\d+(?:\/.*)?$/.test(route);
  }

  function getOperatorFromAnchor(anchor) {
    const row = anchor?.closest?.('li.list-group-item');
    if (!row || !row.closest(LIST_SELECTOR)) return null;

    const nameAnchor = row.querySelector('a.h5.card-link');
    const codeElement = row.querySelector('small.text-muted');
    const name = normalizeText(nameAnchor?.textContent);
    const code = normalizeText(codeElement?.textContent);
    if (!name || !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(name)) return null;

    return { name, code };
  }

  function saveLastViewed(operator) {
    lastViewedInMemory = operator;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...operator }));
    } catch (_) { /* Mantém o indicador em memória se o armazenamento da aba estiver bloqueado. */ }
  }

  function readLastViewed() {
    if (lastViewedInMemory) return lastViewedInMemory;
    try {
      const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!value || value.version !== 1 || typeof value.name !== 'string' ||
          typeof value.code !== 'string' || !value.name.trim()) return null;
      return { name: normalizeText(value.name), code: normalizeText(value.code) };
    } catch (_) {
      return null;
    }
  }

  function createIndicator() {
    const indicator = document.createElement('span');
    indicator.className = ICON_CLASS;
    indicator.setAttribute('role', 'img');
    indicator.setAttribute('aria-label', 'Última operadora visualizada');
    indicator.setAttribute('title', 'Última operadora visualizada');
    indicator.innerHTML = `
      <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2.4" />
        <path d="M17 17 25 25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.8" />
        <path d="M11 5.7a3.1 3.1 0 0 0-3.1 3.1c0 2.2 3.1 5.9 3.1 5.9s3.1-3.7 3.1-5.9A3.1 3.1 0 0 0 11 5.7Zm0 4.2a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z" fill="currentColor" />
      </svg>`;
    return indicator;
  }

  function injectStyle() {
    if (document.getElementById(`${ICON_CLASS}-style`)) return;
    const style = document.createElement('style');
    style.id = `${ICON_CLASS}-style`;
    style.textContent = `
      .${ICON_CLASS} {
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        color: #203153;
        vertical-align: middle;
      }
      .${ICON_CLASS} svg {
        display: block;
        width: 20px;
        height: 20px;
      }
    `;
    document.head.appendChild(style);
  }

  function syncIndicator() {
    if (getRoute() !== LIST_ROUTE) return;

    const lastViewed = readLastViewed();
    const rows = Array.from(document.querySelectorAll(`${LIST_SELECTOR} > li.list-group-item`));
    rows.forEach(row => {
      const existing = row.querySelector(`.${ICON_CLASS}`);
      const nameAnchor = row.querySelector('a.h5.card-link');
      const codeElement = row.querySelector('small.text-muted');
      const isLastViewed = !!lastViewed &&
        normalizeText(nameAnchor?.textContent) === lastViewed.name &&
        normalizeText(codeElement?.textContent) === lastViewed.code;

      if (isLastViewed && !existing) {
        (codeElement || nameAnchor)?.after(createIndicator());
      } else if (!isLastViewed && existing) {
        existing.remove();
      }
    });
  }

  function captureOperatorClick(event) {
    if (getRoute() !== LIST_ROUTE) return;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const anchor = target?.closest?.('a');
    if (anchor) pendingOperator = getOperatorFromAnchor(anchor);
  }

  function syncRoute() {
    const route = getRoute();
    if (lastRoute === LIST_ROUTE && isOperatorDetailRoute(route) && pendingOperator) {
      saveLastViewed(pendingOperator);
      pendingOperator = null;
    } else if (route !== LIST_ROUTE && !isOperatorDetailRoute(route)) {
      pendingOperator = null;
    }

    if (route === LIST_ROUTE) syncIndicator();
    lastRoute = route;
  }

  injectStyle();
  document.addEventListener('click', captureOperatorClick, true);
  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('popstate', syncRoute);
  window.addEventListener('pageshow', syncRoute);
  tmRuntime.register('ícone da última operadora visualizada', syncRoute, [LIST_ROUTE]);
})();
