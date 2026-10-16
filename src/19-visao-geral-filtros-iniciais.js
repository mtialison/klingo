/* =========================
   VISÃO GERAL - FILTROS INICIAIS
   v26.10
========================= */
(function () {
  'use strict';

  const RETRY_DELAY = 120;
  const MAX_READY_RETRIES = 8;
  const REFRESH_DELAY = 80;
  let activeFilterCard = null;
  let cardStateApplied = false;
  let visaoGeralTabWasActive = false;
  let refreshScheduledForTabEntry = false;
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

  function isVisaoGeralTabActive() {
    return Array.from(document.querySelectorAll('.nav.nav-pills .nav-link.active, .nav-pills .nav-link.active'))
      .some((link) => norm(link.innerText || link.textContent || '') === 'Visão Geral');
  }

  function findSelectWithOptions(container, requiredLabels) {
    return Array.from(container.querySelectorAll('select')).find((select) => {
      const labels = new Set(Array.from(select.options, (option) => norm(option.textContent)));
      return requiredLabels.every((label) => labels.has(label));
    }) || null;
  }

  function selectValueForLabel(select, label) {
    const option = Array.from(select?.options || [])
      .find((item) => norm(item.textContent) === label);

    return option ? option.value : null;
  }

  function getOverviewControls(cardBody) {
    const period = findSelectWithOptions(cardBody, ['Mês Atual']);
    const dateKind = findSelectWithOptions(cardBody, ['Data de Abertura', 'Data de Agendamento']);
    const exam = Array.from(cardBody.querySelectorAll('select'))
      .find((select) => select !== period && select !== dateKind && selectValueForLabel(select, 'Exames') !== null) || null;

    return { period, dateKind, exam };
  }

  function getOverviewFilterCard() {
    if (!isVisaoGeralTabActive()) return null;

    const refreshButton = document.querySelector('#refresh-button');
    const card = refreshButton?.closest('.card.dashcard, .card');
    const cardBody = card?.querySelector(':scope > .card-body') || refreshButton?.closest('.card-body');

    if (!cardBody) return null;

    const { period, dateKind, exam } = getOverviewControls(cardBody);
    return period && dateKind && exam ? cardBody : null;
  }

  function setValue(element, value) {
    if (!element || element.value === value) return false;

    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
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

  function applyOverviewDefaults(cardBody) {
    const { period, dateKind, exam } = getOverviewControls(cardBody);
    const values = [
      [period, selectValueForLabel(period, 'Mês Atual')],
      [dateKind, selectValueForLabel(dateKind, 'Data de Agendamento')],
      [exam, selectValueForLabel(exam, 'Exames')]
    ];

    if (values.some(([element, value]) => !element || value === null)) return false;

    const changedElements = values
      .filter(([element, value]) => setValue(element, value))
      .map(([element]) => element);

    changedElements.forEach(notifyValueChange);
    return true;
  }

  function scheduleTabRefresh() {
    if (refreshScheduledForTabEntry || refreshTimer) return;

    refreshScheduledForTabEntry = true;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;

      if (!isAuthorizationModuleOpen() || !isVisaoGeralTabActive()) return;

      const refreshButton = document.querySelector('#refresh-button');
      if (!refreshButton || refreshButton.disabled) {
        refreshScheduledForTabEntry = false;
        return;
      }

      refreshButton.click();
    }, REFRESH_DELAY);
  }

  function resetOverviewState() {
    activeFilterCard = null;
    cardStateApplied = false;
    visaoGeralTabWasActive = false;
    refreshScheduledForTabEntry = false;
    readyRetries = 0;
    window.clearTimeout(retryTimer);
    window.clearTimeout(refreshTimer);
    retryTimer = null;
    refreshTimer = null;
  }

  function ensureOverviewDefaults() {
    if (!isAuthorizationModuleOpen()) {
      resetOverviewState();
      return;
    }

    if (!isVisaoGeralTabActive()) {
      visaoGeralTabWasActive = false;
      refreshScheduledForTabEntry = false;
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
      return;
    }

    const cardBody = getOverviewFilterCard();
    if (!cardBody) {
      scheduleTabRefresh();
      return;
    }

    if (!visaoGeralTabWasActive || cardBody !== activeFilterCard) {
      activeFilterCard = cardBody;
      cardStateApplied = false;
      readyRetries = 0;
    }
    visaoGeralTabWasActive = true;

    if (cardStateApplied) {
      scheduleTabRefresh();
      return;
    }

    if (applyOverviewDefaults(cardBody)) {
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

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const tab = target.closest('.nav.nav-pills .nav-link, .nav-pills .nav-link');
    if (!tab || norm(tab.innerText || tab.textContent || '') !== 'Visão Geral') return;

    activeFilterCard = null;
    cardStateApplied = false;
    visaoGeralTabWasActive = false;
    refreshScheduledForTabEntry = false;
    readyRetries = 0;
    window.clearTimeout(retryTimer);
    window.clearTimeout(refreshTimer);
    retryTimer = null;
    refreshTimer = null;

    window.setTimeout(() => tmRuntime.schedule(), 0);
    window.setTimeout(() => tmRuntime.schedule(), RETRY_DELAY);
  }, true);

  tmRuntime.register('filtros iniciais da visão geral de autorizações', ensureOverviewDefaults, ['#/autorizacoes']);
})();
