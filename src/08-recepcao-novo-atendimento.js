/* =========================
   RECEPÇÃO - NOVO ATENDIMENTO
========================= */
(function () {
  'use strict';

  const MODAL_ID = 'novoAtendimento2Modal';
  const STYLE_ID = 'tm-recepcao-novo-atendimento-layout';
  let observedModal = null;
  let modalObserver = null;
  let observationWindowStart = 0;
  let observationCount = 0;
  let observationStopped = false;
  let extraWasVisible = false;
  let extraDefaultApplied = false;
  let originTemplate = null;
  let originRequest = null;
  let originUnavailable = false;
  let originLastAttempt = 0;
  let originWasVisible = false;
  let originInjectedComponent = null;
  const guardedBookings = new WeakSet();
  const bookingModals = new WeakMap();

  function setClass(element, className, active) {
    if (element.classList.contains(className) !== active) {
      element.classList.toggle(className, active);
    }
  }

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID} > .modal-dialog.modal-dialog-total.modal-dialog22 {
        width: 1180px !important;
        max-width: calc(100vw - 32px) !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 16px auto !important;
      }

      #${MODAL_ID} > .modal-dialog > .modal-content.modal-content-total.modal-content22 {
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: calc(100dvh - 32px) !important;
      }

      #${MODAL_ID} > .modal-dialog > .modal-content > .modal-body {
        flex: 0 1 auto !important;
        height: auto !important;
        min-height: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo > .modal-dialog.modal-dialog-total.modal-dialog22 {
        width: 920px !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center {
        display: flex !important;
        flex-direction: column !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-8 {
        display: contents !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-8 > * {
        order: 3;
        width: 100%;
        padding-left: 15px;
        padding-right: 15px;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-8 > .row:first-child {
        order: 1;
        margin-left: 0;
        margin-right: 0;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-8 > .row:first-child > .col {
        padding-left: 0;
        padding-right: 0;
      }

      #${MODAL_ID}.tm-recepcao-voltar-apos-concluir .modal-body > div > .form-row.justify-content-center > .col-lg-8 > .row.w3-animate-opacity {
        order: 4;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      #${MODAL_ID}.tm-recepcao-voltar-apos-concluir .modal-body > div > .form-row.justify-content-center > .col-lg-8 > .row.w3-animate-opacity > .col {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      #${MODAL_ID}.tm-recepcao-voltar-apos-concluir .tm-recepcao-concluir-section > br {
        display: none !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-4 {
        order: 2;
        flex: 0 0 auto !important;
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 15px !important;
        padding-right: 15px !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-4 > .row {
        margin-left: 0;
        margin-right: 0;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-4 > .row > .col {
        padding-left: 0;
        padding-right: 0;
      }

      #${MODAL_ID} > .modal-dialog > .modal-content > .modal-body > div > .form-row.justify-content-center > .col-lg-4 > .row li.list-group-item.list-group-item-success {
        display: none !important;
      }

      #${MODAL_ID} .tm-recepcao-hidden-field {
        display: none !important;
      }

      #${MODAL_ID} .tm-recepcao-origem-titulo-oculto {
        display: none !important;
      }

      @media (min-width: 768px) {
        #${MODAL_ID} .form-row > .tm-recepcao-origem-col {
          flex: 0 0 25% !important;
          max-width: 25% !important;
        }

        #${MODAL_ID} .form-row > .tm-recepcao-observacao-col {
          flex: 0 0 50% !important;
          max-width: 50% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-dados-row > .col.col-md-3:not(.tm-recepcao-hidden-field) {
          flex: 0 0 33.333333% !important;
          max-width: 33.333333% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-dados-row > .tm-recepcao-cpf-col {
          flex: 0 0 33.333333% !important;
          max-width: 33.333333% !important;
        }

      }

      #${MODAL_ID} .tm-recepcao-origem-col .input-group,
      #${MODAL_ID} .tm-recepcao-observacao-col input,
      #${MODAL_ID} .tm-recepcao-observacao-col textarea {
        width: 100% !important;
        max-width: 100% !important;
      }

      #${MODAL_ID} .tm-recepcao-origem-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      #${MODAL_ID} .tm-recepcao-origem-col .input-group > select.form-control {
        flex: 1 1 auto !important;
        width: 0 !important;
        min-width: 0 !important;
      }

      #${MODAL_ID} .tm-recepcao-origem-col .input-group > :not(select) {
        flex: 0 0 auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  function fieldByLabel(modal, labelText) {
    const label = Array.from(modal.querySelectorAll('small.form-text.text-muted'))
      .find((small) => small.closest('.modal') === modal && norm(small.textContent) === labelText);
    return label?.closest('.col') || null;
  }

  function arrangeReceptionBookingFields(modal) {
    const email = fieldByLabel(modal, 'e-mail');
    const cellular = fieldByLabel(modal, 'Celular');
    const origin = fieldByLabel(modal, 'Origem do Agendamento');
    const contactRow = cellular?.parentElement;
    if (origin && contactRow?.classList.contains('form-row') && contactRow.contains(email) &&
        (origin.parentElement !== contactRow || origin.previousElementSibling !== cellular)) {
      contactRow.insertBefore(origin, cellular.nextSibling);
    }
    if (origin) setClass(origin, 'tm-recepcao-origem-col', true);

    for (const small of modal.querySelectorAll('.border-bottom small')) {
      if (norm(small.textContent) !== 'Origem do Agendamento') continue;
      const title = small.closest('.border-bottom');
      if (title && !title.querySelector('input, select, textarea')) {
        setClass(title, 'tm-recepcao-origem-titulo-oculto', true);
      }
    }
  }

  function requiredReceptionField(modal, labelText) {
    const column = fieldByLabel(modal, labelText);
    const input = column?.querySelector('input') ||
      modal.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
    if (input) {
      input.required = true;
      input.setAttribute('aria-required', 'true');
    }
    return input || null;
  }

  function optionalReceptionCpf(modal) {
    const input = fieldByLabel(modal, 'CPF')?.querySelector('input') ||
      modal.querySelector('input[name*="cpf" i], input[id*="cpf" i]');
    if (!input) return;
    input.required = false;
    input.removeAttribute('aria-required');
    input.setCustomValidity?.('');
  }

  function validateRequiredReceptionFields(modal, event) {
    optionalReceptionCpf(modal);
    const fields = [
      { input: requiredReceptionField(modal, 'e-mail'), name: 'e-mail' }
    ];
    const missing = fields.filter(({ input }) => !input || !norm(input.value));
    if (!missing.length) return true;

    event?.preventDefault();
    event?.stopImmediatePropagation();

    const component = receptionBookingComponent(modal);
    for (const { name } of missing) {
      component?.$toast?.add?.({ severity: 'error', summary: 'Atenção',
        detail: `O campo ${name} é obrigatório.`, life: 5000 });
    }
    const first = missing.find(({ input }) => input)?.input;
    first?.focus();
    if (!component?.$toast?.add) {
      if (first?.setCustomValidity) {
        first.setCustomValidity(`O campo ${missing[0].name} é obrigatório.`);
        first.reportValidity();
        first.addEventListener('input', () => first.setCustomValidity(''), { once: true });
      } else {
        window.alert(`O campo ${missing[0].name} é obrigatório.`);
      }
    }
    return false;
  }

  function guardReceptionBooking(modal) {
    const component = receptionBookingComponent(modal);
    if (!component) return;
    bookingModals.set(component, modal);
    if (guardedBookings.has(component)) return;
    const original = component.marcar;
    component.marcar = function (...args) {
      const activeModal = bookingModals.get(component);
      const visible = activeModal?.isConnected &&
        (activeModal.classList.contains('show') || getComputedStyle(activeModal).display !== 'none');
      if (visible && !validateRequiredReceptionFields(activeModal)) return;
      return original.apply(this, args);
    };
    guardedBookings.add(component);
  }

  function extraCheckbox(modal) {
    const column = Array.from(modal.querySelectorAll('.col.col-12.col-md-3')).find((col) =>
      col.closest('.modal') === modal &&
      Array.from(col.querySelectorAll('.border-bottom small'))
        .some((small) => norm(small.textContent) === 'Horário') &&
      Array.from(col.querySelectorAll('label'))
        .some((label) => norm(label.textContent) === 'Extra')
    );
    return column?.querySelector('input[type="checkbox"]') || null;
  }

  function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function receptionAppointmentDate(modal, component) {
    const componentDate = component?.data;
    const pageDate = document.querySelector('input#ref-data[type="date"]')?.value;
    const match = String(componentDate || pageDate || '').match(/^\d{4}-\d{2}-\d{2}/);
    return match?.[0] || '';
  }

  function applyExtraDefault(modal) {
    const visible = modal.classList.contains('show') || getComputedStyle(modal).display !== 'none';
    if (!visible) {
      extraWasVisible = false;
      extraDefaultApplied = false;
      return;
    }
    if (!extraWasVisible) {
      extraWasVisible = true;
      extraDefaultApplied = false;
    }
    if (extraDefaultApplied) return;

    const checkbox = extraCheckbox(modal);
    const component = receptionBookingComponent(modal);
    const appointmentDate = receptionAppointmentDate(modal, component);
    if (!checkbox || !appointmentDate) return;
    extraDefaultApplied = true;
    const shouldBeExtra = appointmentDate === localDateKey();
    if (component && component.extra !== shouldBeExtra) component.extra = shouldBeExtra;
    if (checkbox.checked !== shouldBeExtra) {
      checkbox.checked = shouldBeExtra;
      checkbox.dispatchEvent(new Event('input', { bubbles: true }));
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function isOriginField(field) {
    const content = JSON.stringify(field || {}).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return /origem do agendamento/i.test(content);
  }

  function hasOriginField(config) {
    return Array.isArray(config?.js_campos) && config.js_campos.some(isOriginField);
  }

  function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
  }

  function receptionBookingComponent(modal) {
    let element = modal;
    while (element) {
      const component = element.__vue__;
      if (component?.origem === 'recep' && typeof component.marcar === 'function') return component;
      const marcacao = component?.$refs?.marcacao;
      if (marcacao?.origem === 'recep' && typeof marcacao.marcar === 'function') return marcacao;
      element = element.parentElement;
    }

    // O modal pode ser montado fora da árvore DOM do componente pai.
    element = document.getElementById('filtro-medico');
    while (element) {
      const marcacao = element.__vue__?.$refs?.marcacao;
      if (marcacao?.origem === 'recep' && typeof marcacao.marcar === 'function') return marcacao;
      element = element.parentElement;
    }
    return null;
  }

  function installOriginConfig(component, config) {
    if (!hasOriginField(config)) return false;
    const existing = component.campos_customizados_base;
    if (Array.isArray(existing?.js_campos) && existing.js_campos.length && !hasOriginField(existing)) {
      // Preserva outros campos específicos da agenda que o Klingo já carregou.
      for (const field of config.js_campos.filter(isOriginField)) {
        existing.js_campos.push(cloneConfig(field));
      }
    } else {
      component.campos_customizados_base = cloneConfig(config);
    }
    component.force_exibir_campos_customizados = true;
    originInjectedComponent = component;
    return true;
  }

  function ensureOriginField(modal) {
    const visible = modal.classList.contains('show') || getComputedStyle(modal).display !== 'none';
    if (!visible) {
      originWasVisible = false;
      return;
    }
    if (!modal.querySelector('.modal-body') || !modal.textContent.includes('Concluir')) return;

    const component = receptionBookingComponent(modal);
    if (!component?.dados) return;

    if (!originWasVisible) {
      originWasVisible = true;
      // O componente Vue é reutilizado entre atendimentos: não reaproveite a origem anterior.
      if (originInjectedComponent === component && hasOriginField(component.campos_customizados_base)) {
        for (const field of component.campos_customizados_base.js_campos.filter(isOriginField)) {
          field.value = null;
        }
        component.force_exibir_campos_customizados = true;
        return;
      }
    }

    if (hasOriginField(component.campos_customizados_base)) {
      component.force_exibir_campos_customizados = true;
      return;
    }
    if (installOriginConfig(component, component.faixaHorarios?.campos_customizados)) return;
    if (installOriginConfig(component, originTemplate)) return;
    if (originRequest || originUnavailable || Date.now() - originLastAttempt < 15000 ||
        typeof component.axios?.post !== 'function') return;

    const query = { q: [{ name: 'marcacoes.campos_customizados', id: 'campos_custom', parms: {} }] };
    originLastAttempt = Date.now();
    originRequest = component.axios.post('/aql?a=marcacoes.campos_customizados', query)
      .then((response) => {
        const result = response?.data?.campos_custom;
        if (result?.status !== 200 || !hasOriginField(result.data)) {
          originUnavailable = true;
          console.warn('[TM] Origem do Agendamento indisponível na configuração do Klingo.');
          return;
        }
        originTemplate = cloneConfig(result.data);
        if (observedModal === modal && modal.isConnected && component.dados &&
            (modal.classList.contains('show') || getComputedStyle(modal).display !== 'none')) {
          installOriginConfig(component, originTemplate);
        }
      })
      .catch((error) => {
        console.warn('[TM] Não foi possível carregar Origem do Agendamento.', error);
      })
      .finally(() => { originRequest = null; });
  }

  function applyReceptionLayout() {
    const modal = observedModal;
    if (!modal?.isConnected) return;

    const mainRow = modal.querySelector('.modal-body > div > .form-row.justify-content-center');
    // A coluna vazia não deve reservar espaço enquanto os primeiros campos são preenchidos.
    setClass(modal, 'tm-recepcao-coluna-abaixo',
      !!mainRow?.querySelector(':scope > .col-lg-8, :scope > .col-lg-4'));

    const leftColumn = mainRow?.querySelector(':scope > .col-lg-8');
    const formButtons = Array.from(leftColumn?.querySelectorAll('button') || []);
    const backButton = formButtons.find((button) => norm(button.textContent) === 'Voltar');
    const concludeButton = formButtons.find((button) => norm(button.textContent) === 'Concluir');
    const concludeSection = Array.from(leftColumn?.children || [])
      .find((section) => concludeButton && section.contains(concludeButton));
    leftColumn?.querySelectorAll(':scope > .tm-recepcao-concluir-section').forEach((section) =>
      setClass(section, 'tm-recepcao-concluir-section', section === concludeSection));
    if (concludeSection) setClass(concludeSection, 'tm-recepcao-concluir-section', true);
    setClass(modal, 'tm-recepcao-voltar-apos-concluir',
      !!backButton?.closest('.row.w3-animate-opacity') && !!concludeButton);

    applyExtraDefault(modal);
    ensureOriginField(modal);
    guardReceptionBooking(modal);
    arrangeReceptionBookingFields(modal);

    const social = fieldByLabel(modal, 'Nome Social');
    const phone = fieldByLabel(modal, 'Telefone');
    if (phone) setClass(phone, 'tm-recepcao-hidden-field', true);
    const phoneInput = phone?.querySelector('input');
    if (phoneInput) {
      phoneInput.required = false;
      phoneInput.removeAttribute('aria-required');
    }
    const cpf = fieldByLabel(modal, 'CPF');
    optionalReceptionCpf(modal);
    requiredReceptionField(modal, 'e-mail');
    const observationLabel = Array.from(modal.querySelectorAll('small, label'))
      .find((element) => element.closest('.modal') === modal &&
        norm(element.textContent) === 'Observação');
    const observation = observationLabel?.closest('.col') || null;
    modal.querySelectorAll('.tm-recepcao-cpf-col').forEach((field) =>
      setClass(field, 'tm-recepcao-cpf-col', field === cpf));
    modal.querySelectorAll('.tm-recepcao-observacao-col').forEach((field) =>
      setClass(field, 'tm-recepcao-observacao-col', field === observation));
    if (cpf) setClass(cpf, 'tm-recepcao-cpf-col', true);
    if (observation) setClass(observation, 'tm-recepcao-observacao-col', true);
    const firstTime = !!social;
    setClass(modal, 'tm-recepcao-primeira-vez', firstTime);

    if (!firstTime) {
      modal.querySelectorAll('.tm-recepcao-hidden-field').forEach((field) =>
        setClass(field, 'tm-recepcao-hidden-field', field === phone));
      modal.querySelectorAll('.tm-recepcao-dados-row').forEach((row) =>
        setClass(row, 'tm-recepcao-dados-row', false));
      return;
    }

    for (const field of [social]) {
      if (!field) continue;
      setClass(field, 'tm-recepcao-hidden-field', true);
      if (field.parentElement?.classList.contains('form-row')) {
        setClass(field.parentElement, 'tm-recepcao-dados-row', true);
      }
    }
  }

  function observeReceptionMutations() {
    if (!modalObserver || !observedModal?.isConnected || observationStopped) return;
    modalObserver.observe(observedModal, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });
  }

  function onReceptionMutations() {
    const now = performance.now();
    if (now - observationWindowStart > 1000) {
      observationWindowStart = now;
      observationCount = 0;
    }
    observationCount += 1;
    if (observationCount > 60) {
      observationStopped = true;
      modalObserver?.disconnect();
      console.warn('[TM] Ajustes da Recepção suspensos para evitar excesso de atualizações.');
      return;
    }

    // Alterações feitas por nós não entram novamente na fila do observador.
    modalObserver?.disconnect();
    try {
      applyReceptionLayout();
    } catch (error) {
      observationStopped = true;
      console.error('[TM] Ajustes da Recepção suspensos após erro.', error);
    } finally {
      observeReceptionMutations();
    }
  }

  function observeModal(modal) {
    if (modal === observedModal) return;
    modalObserver?.disconnect();
    observationStopped = false;
    observationCount = 0;
    observationWindowStart = performance.now();
    extraWasVisible = false;
    extraDefaultApplied = false;
    originWasVisible = false;
    observedModal = modal;
    if (!modal) return;
    modalObserver = new MutationObserver(onReceptionMutations);
    try {
      applyReceptionLayout();
    } catch (error) {
      observationStopped = true;
      console.error('[TM] Ajustes da Recepção suspensos após erro.', error);
    }
    observeReceptionMutations();
  }

  injectStyle();
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    const modal = button?.closest?.(`#${MODAL_ID}`);
    if (modal && (norm(button.textContent) === 'Concluir' ||
        button.closest('.tm-recepcao-concluir-section'))) {
      validateRequiredReceptionFields(modal, event);
    }
  }, true);
  document.addEventListener('submit', (event) => {
    const modal = event.target?.closest?.(`#${MODAL_ID}`);
    if (modal) validateRequiredReceptionFields(modal, event);
  }, true);
  for (const eventName of ['input', 'change']) {
    document.addEventListener(eventName, (event) => {
      if (observationStopped) return;
      if (event.target?.matches?.('input#ref-data[type="date"]')) {
        applyReceptionLayout();
      }
    }, true);
  }

  const discoveryObserver = new MutationObserver(() => {
    const modal = document.getElementById(MODAL_ID);
    if (modal !== observedModal) observeModal(modal);
  });
  discoveryObserver.observe(document.documentElement, { childList: true, subtree: true });
  observeModal(document.getElementById(MODAL_ID));
})();
