/* =========================
   CONFIRMAÇÃO - FILTRO POR TIPO DE AGENDAMENTO
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-confirmacao-tipo-filter';
  const HOST_CLASS = 'tm-confirmacao-tipo-host';
  const HIDDEN_CLASS = 'tm-confirmacao-tipo-hidden';
  const STYLE_ID = 'tm-confirmacao-tipo-style';
  const CARD_SELECTOR = '.card.mb-2.dashcard, .dashcard.my-2[class*="atendimento-"]';
  const originalBadges = new Map();
  let selectedType = '';

  function isConfirmationPage() {
    return /\bConfirmação\b/i.test(document.querySelector('.breadcrumb')?.textContent || '');
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HIDDEN_CLASS} { display: none !important; }
      .${HOST_CLASS} {
        display: flex !important;
        align-items: flex-start;
        gap: 8px;
      }
      .${HOST_CLASS} > .input-group:not(#${FILTER_ID}) {
        flex: 1 1 0;
        width: auto;
        min-width: 0;
      }
      #${FILTER_ID} {
        flex: 0 0 calc(33.333% - 8px);
        width: calc(33.333% - 8px);
        min-width: 0;
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
      }
      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
        box-sizing: border-box !important;
      }
      #${FILTER_ID} select {
        min-width: 0;
        font-size: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-width: 575.98px) {
        .${HOST_CLASS} { flex-wrap: wrap; }
        #${FILTER_ID},
        .${HOST_CLASS} > .input-group:not(#${FILTER_ID}) {
          flex: 0 0 100%;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function filterPanel() {
    return document.querySelector('#refresh-button')?.closest('.card');
  }

  function patientGroup(panel) {
    if (!panel) return null;
    return Array.from(panel.querySelectorAll('.input-group')).find((group) =>
      Array.from(group.querySelectorAll('input, select')).some((field) =>
        /Selecionar paciente/i.test(`${field.getAttribute('placeholder') || ''} ${field.getAttribute('aria-label') || ''}`)) ||
      /Selecionar paciente/i.test(group.textContent || '')) || null;
  }

  function listCards() {
    const panel = filterPanel();
    return Array.from(document.querySelectorAll(CARD_SELECTOR)).filter((card) =>
      !card.closest('.modal') && card !== panel && !panel?.contains(card));
  }

  function appointmentType(card) {
    const icons = Array.from(card.querySelectorAll(
      'i.fa-dot-circle, i.fa-exclamation-circle, i.fa-plus-circle'
    ));
    if (!icons.length) return '';

    let icon = null;
    const time = Array.from(card.querySelectorAll('a, span, small'))
      .find((item) => /^\d{1,2}:\d{2}$/.test(item.textContent.trim()));
    if (time) {
      const box = time.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const closest = icons.map((item) => {
        const rect = item.getBoundingClientRect();
        return { item, distance: Math.hypot(rect.left + rect.width / 2 - centerX,
          rect.top + rect.height / 2 - centerY) };
      }).sort((a, b) => a.distance - b.distance)[0];
      if (closest?.distance < 100) icon = closest.item;
    }
    if (!icon) icon = icons.find((item) => item.closest('.azfloat'));

    if (icon?.classList.contains('fa-dot-circle')) return 'marcado';
    if (icon?.classList.contains('fa-exclamation-circle')) return 'extra';
    if (icon?.classList.contains('fa-plus-circle')) return 'demanda';
    return '';
  }

  function updateCounters(cards) {
    if (!selectedType) {
      originalBadges.forEach(({ original }, badge) => {
        if (badge.isConnected) badge.textContent = original;
      });
      originalBadges.clear();
      return;
    }

    const panel = filterPanel();
    const badges = Array.from(document.querySelectorAll('.badge'))
      .filter((badge) => /^\d+$/.test(badge.textContent.trim()) &&
        !badge.closest(`${CARD_SELECTOR}, .modal`) &&
        panel && !panel.contains(badge) &&
        (panel.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING));

    badges.forEach((badge, index) => {
      const next = badges[index + 1];
      const sectionCards = cards.filter((card) =>
        (badge.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        (!next || (card.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING)));
      if (!sectionCards.length) return;
      let state = originalBadges.get(badge);
      if (!state) {
        state = { original: badge.textContent, filtered: null };
        originalBadges.set(badge, state);
      } else if (badge.textContent !== state.filtered) {
        state.original = badge.textContent;
      }
      state.filtered = String(sectionCards.filter((card) => !card.classList.contains(HIDDEN_CLASS)).length);
      if (badge.textContent !== state.filtered) badge.textContent = state.filtered;
    });
  }

  function applyFilter() {
    const cards = listCards();
    cards.forEach((card) => {
      const hide = !!selectedType && appointmentType(card) !== selectedType;
      card.classList.toggle(HIDDEN_CLASS, hide);
    });
    updateCounters(cards);
  }

  function clearFilter() {
    document.getElementById(FILTER_ID)?.remove();
    document.querySelectorAll(`.${HOST_CLASS}`).forEach((host) => host.classList.remove(HOST_CLASS));
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) => card.classList.remove(HIDDEN_CLASS));
    originalBadges.forEach(({ original }, badge) => {
      if (badge.isConnected) badge.textContent = original;
    });
    originalBadges.clear();
  }

  function ensureFilter() {
    if (!isConfirmationPage()) {
      clearFilter();
      return;
    }

    const group = patientGroup(filterPanel());
    const host = group?.parentElement;
    if (!group || !host) return;
    injectStyle();
    host.classList.add(HOST_CLASS);

    let filter = document.getElementById(FILTER_ID);
    if (!filter) {
      filter = document.createElement('div');
      filter.id = FILTER_ID;
      filter.className = 'input-group';
      const prepend = document.createElement('div');
      prepend.className = 'input-group-prepend';
      const icon = document.createElement('span');
      icon.className = 'input-group-text';
      icon.innerHTML = '<i class="fas fa-filter"></i>';
      prepend.appendChild(icon);
      filter.appendChild(prepend);
      const select = document.createElement('select');
      select.className = 'form-control';
      select.setAttribute('aria-label', 'Filtrar agendamentos por tipo');
      for (const [value, label] of [
        ['', 'Todos...'],
        ['marcado', 'MARCADO'],
        ['extra', 'EXTRA'],
        ['demanda', 'DEMANDA ESPONTÂNEA']
      ]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      }
      select.value = selectedType;
      select.title = select.selectedOptions[0]?.textContent || '';
      select.addEventListener('change', () => {
        selectedType = select.value;
        select.title = select.selectedOptions[0]?.textContent || '';
        applyFilter();
      });
      filter.appendChild(select);
    }
    if (filter.parentElement !== host || filter.nextElementSibling !== group) {
      host.insertBefore(filter, group);
    }
    applyFilter();
  }

  tmRuntime.register('filtro por tipo de agendamento na Confirmação', ensureFilter, ['#/call-center/confirmacao']);
})();
