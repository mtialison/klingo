/* =========================
   AUTORIZAÇÕES - FILTRO POR ANEXO
   v25.3
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-auth-attachment-filter';
  const SELECT_ID = 'tm-auth-attachment-select';
  const STYLE_ID = 'tm-auth-attachment-filter-style-25-3';
  let selectedAttachmentValue = '';
  let applyTimer = null;

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectAuthAttachmentStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tm-auth-attachment-hidden {
        display: none !important;
      }

      #${FILTER_ID} .input-group,
      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
        box-sizing: border-box !important;
      }

      #${FILTER_ID} select {
        min-width: 0 !important;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
      }

      .tm-auth-recepcao-filter-hidden {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function isAutorizacoesTabActive() {
    const active = Array.from(document.querySelectorAll('.nav.nav-pills .nav-link.active, .nav-pills .nav-link.active'))
      .find((link) => norm(link.innerText || link.textContent || '') === 'Autorizações');

    if (active) return true;

    const breadcrumb = document.querySelector('.breadcrumb');
    return /(?:^|\/)\s*Autorizações\b/.test(norm(breadcrumb?.innerText || breadcrumb?.textContent || ''));
  }

  function getAuthFilterCardBody() {
    if (!isAutorizacoesTabActive()) return null;

    const refresh = document.querySelector('#refresh-button');
    if (!refresh) return null;

    const card = refresh.closest('.card.dashcard, .card');
    const cardBody = card?.querySelector(':scope > .card-body') || refresh.closest('.card-body');

    if (!cardBody) return null;

    const cardText = norm(cardBody.innerText || cardBody.textContent || '');
    const hasAuthFilters =
      cardText.includes('Todas as Operadoras') &&
      cardText.includes('Todos os Status Ativos') &&
      cardText.includes('Sem filtro por fila de autorização');

    return hasAuthFilters ? cardBody : null;
  }

  function getAuthListCards() {
    if (!isAutorizacoesTabActive()) return [];

    return Array.from(document.querySelectorAll('.card.mb-2.dashcard'))
      .filter((card) => {
        if (!(card instanceof HTMLElement)) return false;
        if (card.closest(`#${FILTER_ID}`)) return false;

        const text = norm(card.innerText || card.textContent || '');
        const hasAuthActions =
          text.includes('Clonar Solicitação') ||
          text.includes('Realizar Outra Marcação') ||
          !!card.querySelector('[data-original-title="Editar Solicitação de Autorização"], [title="Imprimir Solicitação"]');

        const hasDateAttachmentArea =
          !!card.querySelector('a[title*="arquivos anexados ao atendimento"], a[title*="arquivo anexado ao atendimento"]');

        return hasAuthActions || hasDateAttachmentArea;
      });
  }

  function cardHasAttendanceAttachment(card) {
    if (!card) return false;

    const links = Array.from(card.querySelectorAll('a[title*="arquivos anexados ao atendimento"], a[title*="arquivo anexado ao atendimento"]'));

    return links.some((link) => {
      const title = norm(link.getAttribute('title') || '');
      const icon = link.querySelector('i');

      if (/^0\s+arquivos?\s+anexados?\s+ao\s+atendimento/i.test(title)) return false;
      if (/\b[1-9]\d*\s+arquivos?\s+anexados?\s+ao\s+atendimento/i.test(title)) return true;

      return !!icon && icon.classList.contains('fa-paperclip') && !icon.classList.contains('fa-plus');
    });
  }

  function getCurrentAttachmentFilterValue() {
    const select = document.getElementById(SELECT_ID);
    return select ? select.value : selectedAttachmentValue;
  }

  function applyAttachmentFilter() {
    if (!isAutorizacoesTabActive()) {
      document.querySelectorAll('.tm-auth-attachment-hidden').forEach((card) => {
        card.classList.remove('tm-auth-attachment-hidden');
      });
      return;
    }

    const value = getCurrentAttachmentFilterValue();

    getAuthListCards().forEach((card) => {
      const hasAttachment = cardHasAttendanceAttachment(card);

      const shouldHide =
        value === 'com' ? !hasAttachment :
        value === 'sem' ? hasAttachment :
        false;

      card.classList.toggle('tm-auth-attachment-hidden', shouldHide);
    });
  }

  function scheduleApplyAttachmentFilter() {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(applyAttachmentFilter, 80);
  }

  function createAttachmentFilterElement() {
    const col = document.createElement('div');
    col.id = FILTER_ID;
    col.className = 'col col-12 col-md-3';

    col.innerHTML = `
      <div class="form-group mb-1">
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text text-outline-secondary" data-toggle="tooltip" data-placement="top" title="Filtrar por anexo">
              <i class="fa fa-paperclip fa-fw"></i>
            </span>
          </div>
          <select id="${SELECT_ID}" class="form form-control">
            <option value="">Todos os anexos...</option>
            <option value="com">Com anexo</option>
            <option value="sem">Sem anexo</option>
          </select>
        </div>
      </div>
    `;

    const select = col.querySelector(`#${SELECT_ID}`);
    select.setAttribute('aria-label', 'Filtrar autorizações por anexo');
    select.value = selectedAttachmentValue;
    select.addEventListener('change', () => {
      selectedAttachmentValue = select.value;
      scheduleApplyAttachmentFilter();
    }, true);

    return col;
  }

  function hideRecepcaoAuthorizationFilter(cardBody) {
    if (!cardBody) return;

    Array.from(cardBody.querySelectorAll('label'))
      .filter((label) => norm(label.innerText || label.textContent || '') === 'Incluir autorizações da recepção')
      .forEach((label) => {
        const col = label.closest('.col');
        if (!col) return;

        col.classList.add('tm-auth-recepcao-filter-hidden');
      });
  }

  function ensureAttachmentFilter() {
    injectAuthAttachmentStyle();

    const cardBody = getAuthFilterCardBody();

    if (cardBody) {
      hideRecepcaoAuthorizationFilter(cardBody);
    }

    if (!cardBody) {
      const existing = document.getElementById(FILTER_ID);
      if (existing) existing.remove();
      document.querySelectorAll('.tm-auth-recepcao-filter-hidden')
        .forEach((element) => element.classList.remove('tm-auth-recepcao-filter-hidden'));
      applyAttachmentFilter();
      return;
    }

    if (document.getElementById(FILTER_ID)) {
      return;
    }

    const rows = Array.from(cardBody.querySelectorAll(':scope > .form-row'));
    let targetRow = rows.find((row) => {
      const text = norm(row.innerText || row.textContent || '');
      return text.includes('Todos...') && text.includes('Selecionar paciente') && text.includes('Sem filtro por fila de autorização');
    });

    if (!targetRow) {
      targetRow = rows[rows.length - 1] || null;
    }

    if (!targetRow) return;

    targetRow.appendChild(createAttachmentFilterElement());
    scheduleApplyAttachmentFilter();
  }

  document.addEventListener('change', (event) => {
    if (event.target && event.target.id === SELECT_ID) {
      selectedAttachmentValue = event.target.value;
      scheduleApplyAttachmentFilter();
    }
  }, true);

  document.addEventListener('click', () => {
    tmRuntime.schedule();
  }, true);

  tmRuntime.register('filtro de autorizações', () => {
    ensureAttachmentFilter();
    applyAttachmentFilter();
  }, ['#/autorizacoes']);
})();
