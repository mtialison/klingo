/* Configurações > Operadoras: preserva a posição da lista ao abrir e fechar o detalhe. */
(function () {
  'use strict';

  const LIST_ROUTE = '#/config/operadoras';
  const STORAGE_KEY = 'tm_operadoras_scroll_return_v1';
  const STATE_TTL_MS = 10 * 60 * 1000;
  const RESTORE_WAIT_MS = 4000;
  let lastRoute = getRoute();
  let lastListPosition = readScrollPosition();
  let clickedOperatorName = '';
  let pendingRestore = null;
  let fallbackTimer = null;

  function getRoute() {
    return window.location.hash.split('?')[0];
  }

  function isOperatorDetailRoute(route) {
    return /^#\/config\/operadoras\/\d+(?:\/.*)?$/.test(route);
  }

  function readScrollPosition() {
    const root = document.scrollingElement || document.documentElement;
    return {
      x: Math.max(0, Number(window.scrollX ?? root?.scrollLeft) || 0),
      y: Math.max(0, Number(window.scrollY ?? root?.scrollTop) || 0)
    };
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function clearSavedState() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) { /* storage indisponível */ }
  }

  function saveState(position) {
    const state = {
      version: 1,
      createdAt: Date.now(),
      x: position.x,
      y: position.y,
      operatorName: clickedOperatorName
    };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { /* A restauração fica indisponível se o storage estiver bloqueado. */ }
  }

  function readSavedState() {
    try {
      const state = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!state || state.version !== 1 || !Number.isFinite(state.createdAt) ||
          Date.now() - state.createdAt > STATE_TTL_MS ||
          !Number.isFinite(state.x) || !Number.isFinite(state.y) ||
          state.x < 0 || state.y < 0) {
        clearSavedState();
        return null;
      }
      return state;
    } catch (_) {
      clearSavedState();
      return null;
    }
  }

  function cancelFallback() {
    if (fallbackTimer === null) return;
    window.clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }

  function targetOperatorIsRendered(state) {
    if (!state.operatorName) return false;
    const expected = normalizeText(state.operatorName);
    return Array.from(document.querySelectorAll('a'))
      .some(anchor => normalizeText(anchor.textContent) === expected);
  }

  function finishRestore(force) {
    if (!pendingRestore || getRoute() !== LIST_ROUTE) return;
    if (!force && !targetOperatorIsRendered(pendingRestore)) return;

    const state = pendingRestore;
    try { window.scrollTo(state.x, state.y); }
    catch (_) {
      const root = document.scrollingElement || document.documentElement;
      if (root) { root.scrollLeft = state.x; root.scrollTop = state.y; }
    }

    const current = readScrollPosition();
    const reachedPosition = Math.abs(current.x - state.x) < 2 && Math.abs(current.y - state.y) < 2;
    if (reachedPosition || force) {
      pendingRestore = null;
      cancelFallback();
      clearSavedState();
    }
  }

  function scheduleFallback() {
    if (fallbackTimer !== null) return;
    fallbackTimer = window.setTimeout(() => {
      fallbackTimer = null;
      finishRestore(true);
    }, RESTORE_WAIT_MS);
  }

  function captureOperatorClick(event) {
    if (getRoute() !== LIST_ROUTE) return;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const anchor = target?.closest?.('a');
    if (!anchor) return;

    const name = normalizeText(anchor.textContent);
    clickedOperatorName = /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(name) && name.length >= 3 ? name : '';
  }

  function onScroll() {
    if (getRoute() === LIST_ROUTE) lastListPosition = readScrollPosition();
  }

  function syncRoute() {
    const route = getRoute();
    if (route !== lastRoute) {
      const previousRoute = lastRoute;
      if (previousRoute === LIST_ROUTE && isOperatorDetailRoute(route)) {
        saveState(lastListPosition);
        pendingRestore = null;
        cancelFallback();
      } else if (isOperatorDetailRoute(previousRoute) && route === LIST_ROUTE) {
        pendingRestore = readSavedState();
        if (pendingRestore) scheduleFallback();
        else clearSavedState();
      } else if (route !== LIST_ROUTE && !isOperatorDetailRoute(route)) {
        pendingRestore = null;
        cancelFallback();
        clearSavedState();
      }

      if (route !== LIST_ROUTE) clickedOperatorName = '';
      lastRoute = route;
    }

    if (route === LIST_ROUTE && pendingRestore) finishRestore(false);
  }

  document.addEventListener('click', captureOperatorClick, true);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('popstate', syncRoute);
  window.addEventListener('pageshow', syncRoute);

  tmRuntime.register('restaurar rolagem da lista de operadoras', syncRoute, [LIST_ROUTE]);
})();
