/* =========================
   AUTORIZAÇÕES - FILTROS INICIAIS
   v26.11
========================= */
(function () {
  'use strict';

  const RETRY_DELAY = 120;
  const MAX_READY_RETRIES = 8;
  const INITIAL_REFRESH_DELAY = 80;
  let activeFilterCard = null;
  let currentFilters = null;
  let cardStateApplied = false;
  let refreshScheduledForTabEntry = false;
  let autorizaçõesTabWasActive = false;
  let readyRetries = 0;
  let retryTimer = null;
  let refreshTimer = null;

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isAuthorizationModuleOpen() {
    const hash = String(window.location?.hash || '');

    if (hash) return /^#\/autorizacoes(?:\/|$)/i.test(hash);

    const breadcrumb = document.querySelector('.breadcrumb');
    return /(?:^|\/)\s*Autorizações\b/.test(norm(breadcrumb?.innerText || breadcrumb?.textContent || ''));
  }

  function isAutorizacoesTabActive() {
    return Array.from(document.querySelectorAll('.nav.nav-pills .nav-link.active, .nav-pills .nav-link.active'))
      .some((link) => norm(link.innerText || link.textContent || '') === 'Autorizações');
  }

  function findSelectWithOptions(container, requiredLabels) {
    return Array.from(container.querySelectorAll('select')).find((select) => {
      const labels = new Set(Array.from(select.options, (option) => norm(option.textContent)));
      return requiredLabels.every((label) => labels.has(label));
    }) || null;
  }

  function findSelectWithOptionPrefix(container, prefix) {
    return Array.from(container.querySelectorAll('select')).find((select) =>
      Array.from(select.options).some((option) => norm(option.textContent).startsWith(prefix))
    ) || null;
  }

  function getAuthorizationFilterCard() {
    if (!isAutorizacoesTabActive()) return null;

    const refreshButton = document.querySelector('#refresh-button');
    const card = refreshButton?.closest('.card.dashcard, .card');
    const cardBody = card?.querySelector(':scope > .card-body') || refreshButton?.closest('.card-body');

    if (!cardBody) return null;

    const hasPeriod = !!findSelectWithOptions(cardBody, ['Semana']);
    const hasStatus = !!findSelectWithOptions(cardBody, ['Aberto', 'Todos os Status Ativos...']);
    const hasDateKind = !!findSelectWithOptions(cardBody, ['Data de Abertura', 'Data de Agendamento']);
    const hasAuthorizationQueue = !!findSelectWithOptionPrefix(cardBody, 'Sem filtro por fila de autorização');

    return hasPeriod && hasStatus && hasDateKind && hasAuthorizationQueue ? cardBody : null;
  }

  function getCurrentIsoWeek(date = new Date()) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;

    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

    const year = utcDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);

    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  function setValue(element, value) {
    if (!element || element.value === value) return false;

    const prototype = element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }

    return true;
  }

  function notifyValueChange(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function selectValueForLabel(select, label) {
    const option = Array.from(select?.options || [])
      .find((item) => norm(item.textContent) === label);

    return option ? option.value : null;
  }

  function getAuthorizationControls(cardBody) {
    const period = findSelectWithOptions(cardBody, ['Semana']);
    const status = findSelectWithOptions(cardBody, ['Aberto', 'Todos os Status Ativos...']);
    const dateKind = findSelectWithOptions(cardBody, ['Data de Abertura', 'Data de Agendamento']);
    const authorizationQueue = findSelectWithOptionPrefix(cardBody, 'Sem filtro por fila de autorização');
    const range = cardBody.querySelector('input[type="week"], input[type="month"], input[type="date"]');

    return { period, status, dateKind, authorizationQueue, range };
  }

  function getAuxiliaryInputs(cardBody, range) {
    return Array.from(cardBody.querySelectorAll('input'))
      .filter((input) => input !== range && input.type !== 'hidden' && input.type !== 'button' && input.type !== 'submit' && input.type !== 'reset');
  }

  function getDefaultFilters(cardBody) {
    const { period, status, dateKind, authorizationQueue } = getAuthorizationControls(cardBody);
    const periodValue = selectValueForLabel(period, 'Semana');
    const statusValue = selectValueForLabel(status, 'Aberto');
    const dateKindValue = selectValueForLabel(dateKind, 'Data de Agendamento');
    const authorizationQueueValue = selectValueForLabel(authorizationQueue, 'Exames');

    if (periodValue === null || statusValue === null || dateKindValue === null || authorizationQueueValue === null) return null;

    return {
      period: periodValue,
      status: statusValue,
      dateKind: dateKindValue,
      authorizationQueue: authorizationQueueValue,
      range: getCurrentIsoWeek(),
      rangeType: 'week'
    };
  }

  function captureCurrentFilters(cardBody) {
    const { period, status, dateKind, authorizationQueue, range } = getAuthorizationControls(cardBody);

    if (!period || !status || !dateKind || !authorizationQueue || !range) return null;

    return {
      period: period.value,
      status: status.value,
      dateKind: dateKind.value,
      authorizationQueue: authorizationQueue.value,
      range: range.value,
      rangeType: range.type,
      selectValues: Array.from(cardBody.querySelectorAll('select'), (select) => select.value),
      inputValues: getAuxiliaryInputs(cardBody, range).map((input) => ({
        type: input.type,
        value: input.value,
        checked: input.checked
      }))
    };
  }

  function applyFilterState(cardBody, filters) {
    const { period, status, dateKind, authorizationQueue, range } = getAuthorizationControls(cardBody);

    if (!period || !status || !dateKind || !authorizationQueue || !filters) return { ready: false, changed: false };

    const changedElements = [];
    const selects = Array.from(cardBody.querySelectorAll('select'));

    (filters.selectValues || []).forEach((value, index) => {
      const select = selects[index];
      if (select && setValue(select, value)) changedElements.push(select);
    });

    [
      [period, filters.period],
      [status, filters.status],
      [dateKind, filters.dateKind],
      [authorizationQueue, filters.authorizationQueue]
    ].forEach(([element, value]) => {
      if (setValue(element, value)) changedElements.push(element);
    });

    if ((!range || (filters.rangeType && range.type !== filters.rangeType)) && filters.range) {
      changedElements.forEach(notifyValueChange);
      return { ready: false, changed: changedElements.length > 0 };
    }

    if (range && filters.range && setValue(range, filters.range)) {
      changedElements.push(range);
    }

    const auxiliaryInputs = getAuxiliaryInputs(cardBody, range);
    (filters.inputValues || []).forEach((savedInput, index) => {
      const input = auxiliaryInputs[index];
      if (!input || input.type !== savedInput.type) return;

      if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked !== savedInput.checked) {
          input.checked = savedInput.checked;
          changedElements.push(input);
        }
        return;
      }

      if (setValue(input, savedInput.value)) changedElements.push(input);
    });

    changedElements.forEach(notifyValueChange);
    return { ready: true, changed: changedElements.length > 0 };
  }

  function scheduleTabRefresh() {
    if (refreshScheduledForTabEntry || refreshTimer) return;

    refreshScheduledForTabEntry = true;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;

      if (!isAuthorizationModuleOpen() || !isAutorizacoesTabActive()) return;

      const refreshButton = document.querySelector('#refresh-button');
      if (!refreshButton || refreshButton.disabled) {
        refreshScheduledForTabEntry = false;
        return;
      }

      refreshButton.click();
    }, INITIAL_REFRESH_DELAY);
  }

  function resetAuthorizationSession() {
    activeFilterCard = null;
    currentFilters = null;
    cardStateApplied = false;
    refreshScheduledForTabEntry = false;
    autorizaçõesTabWasActive = false;
    readyRetries = 0;
    window.clearTimeout(retryTimer);
    window.clearTimeout(refreshTimer);
    retryTimer = null;
    refreshTimer = null;
  }

  function ensureAuthorizationDefaults() {
    if (!isAuthorizationModuleOpen()) {
      resetAuthorizationSession();
      return;
    }

    if (!isAutorizacoesTabActive()) {
      autorizaçõesTabWasActive = false;
      refreshScheduledForTabEntry = false;
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
      return;
    }

    const cardBody = getAuthorizationFilterCard();

    if (!cardBody) {
      return;
    }

    if (!autorizaçõesTabWasActive || cardBody !== activeFilterCard) {
      activeFilterCard = cardBody;
      cardStateApplied = false;
      readyRetries = 0;
    }
    autorizaçõesTabWasActive = true;

    if (cardStateApplied) return;

    const filters = currentFilters || getDefaultFilters(cardBody);
    const result = applyFilterState(cardBody, filters);

    if (result.ready) {
      currentFilters = captureCurrentFilters(cardBody) || filters;
      cardStateApplied = true;
      window.clearTimeout(retryTimer);
      retryTimer = null;
      scheduleTabRefresh();
      return;
    }

    if (readyRetries >= MAX_READY_RETRIES || retryTimer) return;

    readyRetries += 1;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      tmRuntime.schedule();
    }, RETRY_DELAY);
  }

  document.addEventListener('change', (event) => {
    if (!isAuthorizationModuleOpen() || !isAutorizacoesTabActive()) return;

    const cardBody = getAuthorizationFilterCard();
    if (!cardBody || !cardBody.contains(event.target)) return;

    const filters = captureCurrentFilters(cardBody);
    if (filters) currentFilters = filters;
  }, true);

  tmRuntime.register('filtros iniciais de autorizações', ensureAuthorizationDefaults, ['#/autorizacoes']);
})();
