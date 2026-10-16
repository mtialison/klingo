/* =========================
   RECEPÇÃO - FILTRO POR TIPO DE AGENDAMENTO
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-recepcao-tipo-filter';
  const HOST_CLASS = 'tm-recepcao-tipo-filter-host';
  const HIDDEN_CLASS = 'tm-recepcao-tipo-filter-hidden';
  const STYLE_ID = 'tm-recepcao-tipo-filter-style';
  const CARD_SELECTOR = '.dashcard.my-2[class*="atendimento-"]';
  let selectedType = '';

  function isReceptionPage() {
    const breadcrumb = document.querySelector('.breadcrumb');
    return /\bRecepção\b/i.test(breadcrumb?.textContent || '');
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

      @media (min-width: 1200px) {
        .${HOST_CLASS} {
          flex: 0 0 calc(25% + 100px) !important;
          max-width: calc(25% + 100px) !important;
        }

        .${HOST_CLASS} + .col.col-12.col-md-3 {
          flex: 0 0 calc(25% - 100px) !important;
          max-width: calc(25% - 100px) !important;
        }
      }

      @media (min-width: 768px) and (max-width: 1199.98px) {
        .${HOST_CLASS},
        .${HOST_CLASS} + .col.col-12.col-md-3 {
          flex: 0 0 50% !important;
          max-width: 50% !important;
        }
      }

      .${HOST_CLASS} > .input-group {
        flex: 1 1 300px;
        width: auto;
        max-width: 300px;
        min-width: 0;
      }

      .${HOST_CLASS} > .input-group > input#ref-data {
        min-width: 0;
      }

      #${FILTER_ID} {
        flex: 1 1 180px;
        min-width: 180px;
        max-width: none;
        height: 36px;
      }

      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px !important;
        box-sizing: border-box !important;
      }

      #${FILTER_ID} select {
        min-width: 0;
        font-size: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  function appointmentType(card) {
    const statusColumn = card.querySelector(
      ':scope > .row.py-1.px-2.align-items-center > .col.col-12.col-md-2'
    );
    const icon = statusColumn?.querySelector('.azfloat > a > i');
    if (icon?.classList.contains('fa-dot-circle')) return 'marcado';
    if (icon?.classList.contains('fa-exclamation-circle')) return 'extra';
    if (icon?.classList.contains('fa-plus-circle')) return 'demanda';
    return '';
  }

  function applyFilter() {
    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      const hide = !!selectedType && appointmentType(card) !== selectedType;
      if (card.classList.contains(HIDDEN_CLASS) !== hide) {
        card.classList.toggle(HIDDEN_CLASS, hide);
      }
    });
    updateSectionCounters();
  }

  function updateSectionCounters() {
    const badges = document.querySelectorAll(
      '.d-flex.justify-content-between.mt-3.mb-1 > h5.mb-0 > span.badge.badge-secondary'
    );
    badges.forEach((badge) => {
      const header = badge.parentElement?.parentElement;
      const list = header?.parentElement?.querySelector(':scope > .mb-3');
      if (!list) return;
      const cards = Array.from(list.querySelectorAll(CARD_SELECTOR));
      const visibleCount = cards.filter((card) => !card.classList.contains(HIDDEN_CLASS)).length;
      const nextValue = String(visibleCount);
      if (badge.textContent.trim() !== nextValue) badge.textContent = nextValue;
    });
  }

  function clearFilter() {
    document.getElementById(FILTER_ID)?.remove();
    document.querySelectorAll(`.${HOST_CLASS}`).forEach((host) =>
      host.classList.remove(HOST_CLASS));
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) =>
      card.classList.remove(HIDDEN_CLASS));
  }

  function ensureFilter() {
    if (!isReceptionPage()) {
      clearFilter();
      return;
    }

    const dateInput = document.querySelector('input#ref-data[type="date"]');
    const dateGroup = dateInput?.closest('.input-group.mb-1');
    const host = dateGroup?.closest('.col.col-12.col-md-3');
    if (!dateGroup || !host) return;

    injectStyle();
    if (!host.classList.contains(HOST_CLASS)) host.classList.add(HOST_CLASS);

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
    if (filter.previousElementSibling !== dateGroup || filter.parentElement !== host) {
      dateGroup.insertAdjacentElement('afterend', filter);
    }
    applyFilter();
  }

  tmRuntime.register('filtro por tipo de agendamento na Recepção', ensureFilter, ['#/recepcao']);
})();
