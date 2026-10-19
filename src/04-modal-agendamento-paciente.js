/* =========================
   MODAL AGENDAMENTO - PACIENTE
   layout do cadastro de paciente existente
========================= */
(function () {
  'use strict';

  const STYLE_ID = 'tm-cadastro-paciente-layout-23-0';
  const modalBaselines = new WeakMap();

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #cadastroModal.tm-paciente-layout {
        text-align: center !important;
      }

      #cadastroModal.tm-paciente-layout .modal-dialog {
        width: 800px !important;
        max-width: calc(100vw - 24px) !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: left !important;
      }

      #cadastroModal.tm-paciente-layout .modal-content {
        width: 800px !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid {
        display: grid !important;
        grid-template-columns: 200px minmax(0, 1fr) 200px 200px !important;
        column-gap: 10px !important;
        row-gap: 4px !important;
        align-items: start !important;
        width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid > .form-row,
      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid > .tm-paciente-origem-inline-row {
        display: contents !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid > .tm-paciente-dados-heading {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
        width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field {
        flex: initial !important;
        max-width: none !important;
        width: auto !important;
        min-width: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field input,
      #cadastroModal.tm-paciente-layout .tm-paciente-field select,
      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid .tm-paciente-field .form-control {
        font-family: "Open Sans", "Helvetica Neue", sans-serif !important;
        font-size: 13.125px !important;
        font-weight: 400 !important;
        color: #495057 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group > .form-control {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group > .input-group-prepend,
      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group > .input-group-append {
        display: flex !important;
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nome input,
      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento input,
      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group,
      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group-text,
      #cadastroModal.tm-paciente-layout .tm-paciente-sexo select,
      #cadastroModal.tm-paciente-layout .tm-paciente-celular input,
      #cadastroModal.tm-paciente-layout .tm-paciente-email input,
      #cadastroModal.tm-paciente-layout .tm-paciente-telefone input {
        height: 29.18px !important;
        min-height: 29.18px !important;
        max-height: 29.18px !important;
        line-height: 1.2 !important;
        padding-top: 3px !important;
        padding-bottom: 3px !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nome {
        grid-column: 1 / 3 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento {
        grid-column: 3 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-cpf {
        grid-column: 4 !important;
        grid-row: 5 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-celular {
        grid-column: 1 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-telefone {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group,
      #cadastroModal.tm-paciente-layout .tm-paciente-validade .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group > .form-control,
      #cadastroModal.tm-paciente-layout .tm-paciente-validade .input-group > .form-control {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group > .input-group-append,
      #cadastroModal.tm-paciente-layout .tm-paciente-validade .input-group > .input-group-append {
        display: flex !important;
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-email {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-warning-host {
        position: relative !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-required-warning {
        position: absolute !important;
        z-index: 3;
        display: none;
        align-items: center;
        justify-content: center;
        width: 24px;
        color: #dc3545;
        background: #f8d7da;
        border-right: 1px solid #f5c6cb;
        border-radius: 3px 0 0 3px;
        font-weight: 700;
        pointer-events: none;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-required-warning.tm-paciente-warning-visible {
        display: inline-flex;
      }

      #cadastroModal.tm-paciente-layout .input-group:has(> .input-group-prepend > .input-group-text.invalid) > .tm-paciente-required-warning {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-warning-control {
        padding-left: 30px !important;
      }

      #cadastroModal.tm-paciente-layout .input-group:has(> .input-group-prepend > .input-group-text.invalid) > .tm-paciente-warning-control {
        padding-left: 6px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-sexo {
        grid-column: 4 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-carteira {
        grid-column: 1 / 3 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-validade {
        grid-column: 3 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem {
        grid-column: 2 / 4 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem .input-group > select.form-control {
        flex: 1 1 auto !important;
        width: 0 !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem .input-group > :not(select) {
        flex: 0 0 auto !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-hidden {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem-section-hidden {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-row {
        display: flex !important;
        flex-wrap: wrap !important;
        width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-col {
        display: block !important;
        flex: 0 0 100% !important;
        max-width: 100% !important;
        width: 100% !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-col .input-group {
        width: calc(100% + 10px) !important;
        max-width: calc(100% + 10px) !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-original-hidden {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-textarea {
        display: block !important;
        width: calc(100% + 10px) !important;
        max-width: calc(100% + 10px) !important;
        height: 95px !important;
        min-height: 95px !important;
        resize: vertical !important;
        overflow-y: auto !important;
        white-space: pre-wrap !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        line-height: 1.35 !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        box-sizing: border-box !important;
        font: inherit !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col {
        display: block !important;
        flex: 0 0 min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        width: min(353.78px, 100%) !important;
        margin-top: 4px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col .input-group-prepend {
        display: flex !important;
        flex: 0 0 auto !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col select {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-paciente-layout div.mt-3.mb-5 {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        flex-grow: 0 !important;
        padding-bottom: 0 !important;
        margin-bottom: 16px !important;
      }

      #cadastroModal.tm-paciente-layout div.mt-3.mb-5 > br {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card * {
        font-family: inherit !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        font-style: normal !important;
        line-height: 1.4 !important;
        letter-spacing: normal !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card {
        position: relative !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-title {
        margin-bottom: 6px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-procedure-emoji {
        margin-right: 5px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-ocupar {
        position: absolute !important;
        right: 12px !important;
        bottom: 10px !important;
        z-index: 2;
        margin: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-info-wrap {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
        gap: 4px !important;
        width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-left {
        display: contents !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-row {
        display: block !important;
        width: 100% !important;
        margin-right: 0 !important;
        margin-bottom: 0 !important;
        white-space: normal !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-profissional {
        order: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-convenio {
        order: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-unidade {
        order: 4 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data {
        order: 5 !important;
        display: block !important;
        width: 100% !important;
        margin-top: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-date-line,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-time-line {
        display: block !important;
        width: 100% !important;
        margin-left: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-time-line {
        margin-top: 2px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-native-icon-hidden {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-emoji {
        display: inline-block !important;
        width: 1.5em !important;
        margin-right: 4px !important;
        vertical-align: baseline !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-sala {
        font-size: 13px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card blockquote {
        margin-top: 6px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-convenio-externo-oculto {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-convenio-injetado {
        display: block !important;
      }

      @media (max-width: 720px) {
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid .tm-paciente-field,
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid .tm-paciente-observacao-row {
          grid-column: 1 / -1 !important;
          grid-row: auto !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function visibleModal() {
    const modal = document.querySelector('#cadastroModal');
    if (!modal) return null;

    const style = getComputedStyle(modal);
    const rect = modal.getBoundingClientRect();

    if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return null;

    return modal;
  }

  function fieldByLabel(modal, labelText) {
    const labels = Array.from(modal.querySelectorAll('small.form-text.text-muted'));
    const allowedLabels = String(labelText || '')
      .split('|')
      .map((item) => norm(item))
      .filter(Boolean);

    for (const label of labels) {
      const currentLabel = norm(label.innerText || label.textContent || '');
      if (!allowedLabels.includes(currentLabel)) continue;

      const col = label.closest('.col');
      if (col && modal.contains(col)) return col;
    }

    return null;
  }

  function patientFieldProblems(modal) {
    const definitions = [
      ['nome', 'Nome do Paciente|Nome', 'input:not([type="hidden"])', true],
      ['nascimento', 'Data de Nascimento', 'input:not([type="hidden"])', true],
      ['sexo', 'Sexo', 'select', true],
      ['celular', 'Celular', 'input:not([type="hidden"])', true],
      ['email', 'e-mail', 'input:not([type="hidden"])', false],
      ['carteira', 'No. da Carteira do Plano', 'input:not([type="hidden"])', false],
      ['validade', 'Validade da Carteira', 'input:not([type="hidden"])', false],
      ['origem', 'Origem de Pacientes|Origem do Agendamento', 'select', true],
      ['cpf', 'CPF', 'input:not([type="hidden"])', false]
    ];
    return definitions.map(([key, label, selector, requiredByFlow]) => {
      const field = fieldByLabel(modal, label);
      const control = field?.querySelector(selector) || null;
      const value = norm(control?.value);
      const selectedText = norm(control?.selectedOptions?.[0]?.textContent);
      const missing = (requiredByFlow || control?.required) &&
        (!control || !value || (control.tagName === 'SELECT' && /^Selecione/i.test(selectedText)));
      const digits = key === 'celular' ? value.replace(/\D/g, '') : '';
      const malformed = !!control && !!value && (control.validity?.valid === false ||
        (key === 'celular' && (digits.length < 10 || digits.length > 11 || /^(\d)\1+$/.test(digits))));
      return { key, field, control, missing, malformed };
    });
  }

  function patientSetWarning(control, invalid) {
    if (!control?.parentElement) return;
    const host = control.parentElement;
    const hasNativeWarning = !!host.querySelector(':scope > .input-group-prepend > .input-group-text.invalid');
    const showCustomWarning = invalid && !hasNativeWarning;
    let warning = host.querySelector(':scope > .tm-paciente-required-warning');
    if (!warning && showCustomWarning) {
      host.classList.add('tm-paciente-warning-host');
      warning = document.createElement('span');
      warning.className = 'tm-paciente-required-warning';
      warning.textContent = '!';
      warning.setAttribute('aria-hidden', 'true');
      host.appendChild(warning);
    }
    if (warning) {
      const hostRect = host.getBoundingClientRect();
      const controlRect = control.getBoundingClientRect();
      const top = `${controlRect.top - hostRect.top + 1}px`;
      const left = `${controlRect.left - hostRect.left + 1}px`;
      const height = `${Math.max(0, controlRect.height - 2)}px`;
      if (warning.style.top !== top) warning.style.top = top;
      if (warning.style.left !== left) warning.style.left = left;
      if (warning.style.height !== height) warning.style.height = height;
      warning.classList.toggle('tm-paciente-warning-visible', showCustomWarning);
    }
    control.classList.toggle('tm-paciente-warning-control', showCustomWarning);
  }

  function patientRefreshWarnings(modal) {
    if (!modal?.classList.contains('tm-paciente-layout') ||
        modal.dataset.tmPacienteValidationAttempted !== '1') return;
    const celular = patientFieldProblems(modal).find(({ key }) => key === 'celular');
    if (celular) patientSetWarning(celular.control, celular.missing || celular.malformed);
  }

  function patientBookingComponent(modal) {
    const patientLink = Array.from(document.querySelectorAll('a'))
      .find((link) => norm(link.textContent) === 'Paciente');
    for (const start of [modal, patientLink]) {
      for (let element = start; element; element = element.parentElement) {
        const vue = element.__vue__;
        if (vue?.$route?.path === '/call-center' && typeof vue.$toast?.add === 'function') return vue;
      }
    }
    return null;
  }

  function patientValidateCellular(modal, event) {
    if (!modal || !isPacienteModal(modal)) return true;
    modal.dataset.tmPacienteValidationAttempted = '1';
    patientRefreshWarnings(modal);
    const celular = patientFieldProblems(modal).find(({ key }) => key === 'celular');
    if (!celular || (!celular.missing && !celular.malformed)) return true;

    event.preventDefault();
    event.stopImmediatePropagation();
    const detail = celular.missing ? 'O campo celular é obrigatório.' : 'Informe um celular válido.';
    const component = patientBookingComponent(modal);
    component?.$toast?.add({ severity: 'error', summary: 'Atenção', detail, life: 5000 });
    if (!component) console.warn('[TM] Balão do Klingo indisponível para validar o celular.');
    celular.control?.focus();
    return false;
  }

  function isPacienteModal(modal) {
    if (!modal || modal.id !== 'cadastroModal') return false;

    const text = modal.innerText || modal.textContent || '';
    const hasEditar = /Editar Marcação|Reenviar e-mail da marcação/i.test(text);
    const hasRemarcacao = /Remarcação de/i.test(text);
    const hasPatientName = fieldByLabel(modal, 'Nome do Paciente') ||
      (modal.classList.contains('tm-paciente-layout') && fieldByLabel(modal, 'Nome'));

    if (hasEditar || hasRemarcacao) return false;

    return (
      !!hasPatientName &&
      !!fieldByLabel(modal, 'Data de Nascimento') &&
      !!fieldByLabel(modal, 'Celular') &&
      !!fieldByLabel(modal, 'e-mail') &&
      !!fieldByLabel(modal, 'No. da Carteira do Plano') &&
      !!fieldByLabel(modal, 'Validade da Carteira')
    );
  }

  function addField(field, className) {
    if (!field) return;

    field.classList.add('tm-paciente-field', className);
    field.classList.remove(
      'col-md-1', 'col-md-2', 'col-md-3', 'col-md-4', 'col-md-5', 'col-md-6',
      'col-md-7', 'col-md-8', 'col-md-9', 'col-md-10', 'col-md-11', 'col-md-12'
    );
    field.classList.add('col', 'col-12');
  }

  function findDadosContainer(modal) {
    const nome = fieldByLabel(modal, 'Nome do Paciente|Nome');
    const mt3 = nome?.closest('.mt-3');
    return mt3 || nome?.parentElement?.parentElement || null;
  }

  function ensurePersonalDataHeader(dados) {
    if (dados.querySelector(':scope > .tm-paciente-dados-heading')) return;
    const header = document.createElement('div');
    header.className = 'border-bottom mb-1 d-flex justify-content-between hover-title-bg text-primary tm-paciente-dados-heading';
    const title = document.createElement('div');
    const small = document.createElement('small');
    small.textContent = 'Dados Pessoais';
    title.appendChild(small);
    header.append(title, document.createElement('div'));
    dados.insertBefore(header, dados.firstChild);
  }

  function renamePatientName(field) {
    const label = Array.from(field?.querySelectorAll('small.form-text.text-muted') || [])
      .find((small) => norm(small.textContent) === 'Nome do Paciente');
    if (label) label.textContent = 'Nome';
  }

  function moveOrigem(modal, dados) {
    const origem = fieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');
    if (!origem || !dados) return;

    let row = dados.querySelector(':scope > .tm-paciente-origem-inline-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'form-row tm-paciente-origem-inline-row';
      dados.appendChild(row);
    }

    if (origem.parentElement !== row) row.appendChild(origem);

    addField(origem, 'tm-paciente-origem');
  }

  function hideOrigemSection(modal) {
    Array.from(modal.querySelectorAll('small')).forEach((small) => {
      if (!['ORIGEM DE PACIENTES', 'ORIGEM DO AGENDAMENTO'].includes(norm(small.innerText || small.textContent || '').toUpperCase())) return;
      const title = small.closest('.border-bottom.hover-title-bg');
      if (title && !title.querySelector('select, input')) {
        title.classList.add('tm-paciente-origem-section-hidden');
      }
    });
  }

  function findObservacaoRow(modal) {
    const obsHeaders = Array.from(modal.querySelectorAll('small')).filter((small) => {
      return norm(small.innerText || small.textContent || '') === 'Observação';
    });

    for (const obsHeader of obsHeaders) {
      let headerBlock = obsHeader.closest('.border-bottom, .hover-title-bg');
      if (!headerBlock) headerBlock = obsHeader.closest('div');
      if (!headerBlock) continue;

      let node = headerBlock.nextElementSibling;

      for (let i = 0; node && i < 10; i += 1, node = node.nextElementSibling) {
        if (!(node instanceof HTMLElement)) continue;
        if (!node.classList.contains('form-row')) continue;

        const cols = Array.from(node.children).filter((child) => child instanceof HTMLElement && child.classList.contains('col'));
        const obsCol = cols.find((col) => !!col.querySelector('input.form-control, input.form-control') && !col.querySelector('select'));
        const auxCol = cols.find((col) => !!col.querySelector('select.form-control, select.form-control') && !!col.querySelector('.fa-question'));

        if (obsCol && auxCol) return { row: node, obsCol, auxCol };
      }
    }

    return null;
  }


  function setupObservacao(modal) {
    const found = findObservacaoRow(modal);
    if (!found) return;

    const { row, obsCol, auxCol } = found;

    row.classList.add('tm-paciente-observacao-row');
    obsCol.classList.add('tm-paciente-observacao-col');
    auxCol.classList.add('tm-paciente-observacao-aux-col');

    row.style.setProperty('display', 'flex', 'important');
    row.style.setProperty('flex-wrap', 'wrap', 'important');
    obsCol.style.setProperty('flex', '0 0 100%', 'important');
    obsCol.style.setProperty('max-width', '100%', 'important');
    obsCol.style.setProperty('width', '100%', 'important');
    auxCol.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('width', 'min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('margin-top', '4px', 'important');

    const inputGroup = obsCol.querySelector('.input-group');
    const input = obsCol.querySelector('input.form-control, input');

    if (!inputGroup || !input) return;

    input.classList.add('tm-paciente-observacao-original-hidden');
    input.style.setProperty('display', 'none', 'important');

    let textarea = inputGroup.querySelector('textarea.tm-paciente-observacao-textarea');

    if (!textarea) {
      textarea = document.createElement('textarea');
      textarea.className = 'form form-control tm-paciente-observacao-textarea';
      textarea.value = input.value || '';

      textarea.addEventListener('input', () => {
        input.value = textarea.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      inputGroup.appendChild(textarea);
    }

    if (document.activeElement !== textarea && textarea.value !== input.value) {
      textarea.value = input.value || '';
    }

    textarea.style.setProperty('height', '95px', 'important');
    textarea.style.setProperty('min-height', '95px', 'important');
    textarea.style.setProperty('white-space', 'pre-wrap', 'important');
    textarea.style.setProperty('overflow-wrap', 'break-word', 'important');
    textarea.style.setProperty('word-break', 'break-word', 'important');
  }

  function monthName(monthShort) {
    const map = {
      jan: 'Janeiro', fev: 'Fevereiro', mar: 'Março', abr: 'Abril',
      mai: 'Maio', jun: 'Junho', jul: 'Julho', ago: 'Agosto',
      set: 'Setembro', out: 'Outubro', nov: 'Novembro', dez: 'Dezembro'
    };

    return map[String(monthShort || '').trim().toLowerCase()] || monthShort;
  }

  function weekdayName(dayShort) {
    const map = {
      dom: 'Domingo', seg: 'Segunda-feira', ter: 'Terça-feira',
      qua: 'Quarta-feira', qui: 'Quinta-feira', sex: 'Sexta-feira',
      sab: 'Sábado', sáb: 'Sábado'
    };

    return map[String(dayShort || '').trim().toLowerCase()] || dayShort;
  }

  function normalizeHeaderDate(dateBlock) {
    const calendarSmall = Array.from(dateBlock.querySelectorAll('small')).find((small) => !!small.querySelector('.fa-calendar-alt'));
    if (!calendarSmall) return;

    const rawText = norm(calendarSmall.textContent || '');
    const badge = calendarSmall.querySelector('.badge');
    const dayMatch = rawText.match(/(\d{1,2})\s*\/\s*([A-Za-zÀ-ÿ]{3})/i);
    if (!dayMatch) return;

    const icon = calendarSmall.querySelector('i');
    const dateText = `${parseInt(dayMatch[1], 10)} de ${monthName(dayMatch[2])} | ${weekdayName(badge?.textContent || '')}`.toUpperCase();

    calendarSmall.textContent = '';

    if (icon) {
      icon.style.setProperty('width', '1.25em', 'important');
      icon.style.setProperty('min-width', '1.25em', 'important');
      icon.style.setProperty('max-width', '1.25em', 'important');
      icon.style.setProperty('text-align', 'center', 'important');
      icon.style.setProperty('margin-right', '6px', 'important');
      calendarSmall.appendChild(icon);
    }

    calendarSmall.appendChild(document.createTextNode(dateText));
  }

  function addProcedureEmoji(title) {
    if (!title || title.querySelector(':scope > .tm-paciente-header-procedure-emoji')) return;
    const icon = document.createElement('span');
    icon.className = 'tm-paciente-header-procedure-emoji';
    icon.textContent = '🩺';
    icon.setAttribute('aria-hidden', 'true');
    title.prepend(icon);
  }

  function emojifyHeaderIcon(container, selector, emoji) {
    const icon = container?.querySelector(selector);
    if (!icon) return;
    icon.classList.add('tm-paciente-native-icon-hidden');
    if (icon.previousElementSibling?.classList.contains('tm-paciente-header-emoji')) {
      icon.previousElementSibling.textContent = emoji;
      return;
    }
    const replacement = document.createElement('span');
    replacement.className = 'tm-paciente-header-emoji';
    replacement.textContent = emoji;
    replacement.setAttribute('aria-hidden', 'true');
    icon.before(replacement);
  }

  function decorateHeader(profissional, convenio, unidade, dateBlock) {
    emojifyHeaderIcon(profissional, '.fa-user-md', '👨‍⚕️');
    emojifyHeaderIcon(convenio, '.fa-credit-card', '💳');
    emojifyHeaderIcon(unidade, '.fa-building', '🏥');
    const dateSmall = Array.from(dateBlock.querySelectorAll('small'))
      .find((small) => !!small.querySelector('.fa-calendar-alt'));
    const timeSmall = Array.from(dateBlock.querySelectorAll('small'))
      .find((small) => small !== dateSmall && /\d{1,2}:\d{2}/.test(small.textContent || ''));
    dateSmall?.classList.add('tm-paciente-header-date-line');
    timeSmall?.classList.add('tm-paciente-header-time-line');
    emojifyHeaderIcon(dateSmall, '.fa-calendar-alt', '📅');
    emojifyHeaderIcon(timeSmall, 'i', '🕒');
  }

  function positionOcuparButton(item) {
    const button = Array.from(item.querySelectorAll('button'))
      .find((candidate) => /^Ocupar\b/i.test(norm(candidate.textContent)));
    if (!button) return;
    const group = button.closest('.btn-group, .dropdown');
    const target = group && item.contains(group) ? group : button;
    target.classList.add('tm-paciente-header-ocupar');
  }

  function getExternalConvenioForHeaderList(listGroup) {
    if (!listGroup) return '';

    const convenioItem = Array.from(listGroup.children).find((item) => {
      if (!(item instanceof HTMLElement)) return false;
      if (!item.matches('li.list-group-item')) return false;
      if (item.querySelector('label .h4')) return false;
      return !!item.querySelector('.fa-credit-card');
    });

    const small = convenioItem?.querySelector('small.lead, small');
    const textValue = norm(small?.innerText || small?.textContent || '');

    if (textValue && convenioItem) {
      convenioItem.classList.add('tm-paciente-convenio-externo-oculto');
      convenioItem.style.setProperty('display', 'none', 'important');
    }

    return textValue;
  }

  function buildConvenioRowFromText(textValue) {
    const row = document.createElement('span');
    row.className = 'mr-3 tm-paciente-header-row tm-paciente-header-convenio tm-paciente-header-convenio-injetado';
    row.dataset.tmInjected = '1';

    const small = document.createElement('small');
    small.className = 'lead';

    const icon = document.createElement('i');
    icon.className = 'far fa-credit-card fa-fw mr-1';
    icon.setAttribute('aria-hidden', 'true');

    small.appendChild(icon);
    small.appendChild(document.createTextNode(` ${textValue} `));
    row.appendChild(small);

    return row;
  }

  function applyHeader(modal) {
    const listGroups = Array.from(modal.querySelectorAll('ul.list-group'));

    let totalHeaders = 0;

    listGroups.forEach((listGroup) => {
      const externalConvenioText = getExternalConvenioForHeaderList(listGroup);

      const items = Array.from(listGroup.children).filter((item) => {
        return (
          item instanceof HTMLElement &&
          item.matches('li.list-group-item') &&
          !!item.querySelector('label .h4') &&
          !!item.querySelector('label .fa-user-md') &&
          !!item.querySelector('label .fa-building') &&
          !!item.querySelector('label .fa-calendar-alt')
        );
      });

      totalHeaders += items.length;

      items.forEach((item) => {
        const title = item.querySelector('label .h4');
        const infoWrap = item.querySelector('label .d-flex.justify-content-between');
        const left = infoWrap?.querySelector(':scope > div:first-child');
        const dateBlock = infoWrap?.querySelector(':scope > div.lead, :scope > div:not(:first-child)');

        if (!title || !infoWrap || !left || !dateBlock) return;

        const injectedConvenio = left.querySelector('.tm-paciente-header-convenio-injetado');
        if (injectedConvenio && norm(injectedConvenio.textContent) !== externalConvenioText) {
          injectedConvenio.remove();
        }

        const spans = Array.from(left.querySelectorAll(':scope > span'));
        let convenio = spans.find((span) => !!span.querySelector('.fa-credit-card'));
        const profissional = spans.find((span) => !!span.querySelector('.fa-user-md'));
        const unidade = spans.find((span) => !!span.querySelector('.fa-building'));

        if (!profissional || !unidade) return;

        if (!convenio && externalConvenioText) {
          convenio = buildConvenioRowFromText(externalConvenioText);
          left.insertBefore(convenio, profissional);
        }

        item.classList.add('tm-paciente-header-card');
        positionOcuparButton(item);
        title.classList.add('tm-paciente-header-title');
        addProcedureEmoji(title);
        infoWrap.classList.add('tm-paciente-header-info-wrap');
        left.classList.add('tm-paciente-header-left');

        profissional.classList.add('tm-paciente-header-row', 'tm-paciente-header-profissional');
        convenio?.classList.add('tm-paciente-header-row', 'tm-paciente-header-convenio');
        unidade.classList.add('tm-paciente-header-row', 'tm-paciente-header-unidade');
        dateBlock.classList.add('tm-paciente-header-data');

        unidade.querySelectorAll('small.text-muted').forEach((small) => {
          small.classList.add('tm-paciente-header-sala');
        });

        normalizeHeaderDate(dateBlock);
        decorateHeader(profissional, convenio, unidade, dateBlock);
      });
    });

    modal.classList.toggle('tm-paciente-multiple-headers', totalHeaders > 1);
  }


  function parseDate(rawValue) {
    return tmParseDateInput(rawValue);
  }
  function enableDatePaste(field) {
    if (!field || field.dataset.tmPacienteDatePaste === '1') return;

    const input = field.querySelector('input[type="date"]');
    if (!input) return;

    field.dataset.tmPacienteDatePaste = '1';

    input.addEventListener('paste', (event) => {
      const parsed = parseDate(event.clipboardData?.getData('text/plain') || '');
      if (!parsed) return;

      event.preventDefault();
      input.value = parsed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, true);
  }

  function protectBirthDate(field) {
    const input = field?.querySelector('input[type="date"]');
    if (!input || input.dataset.tmPacienteBirthDateGuard === '1') return;
    input.dataset.tmPacienteBirthDateGuard = '1';
    let lastValue = input.value;
    let yearDigits = 0;
    let yearActive = false;
    let replacement = '';
    let writing = false;
    const parts = (value) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    const reset = () => {
      lastValue = input.value;
      yearDigits = 0;
      yearActive = false;
      replacement = '';
    };
    input.addEventListener('pointerdown', reset, true);
    input.addEventListener('focus', reset, true);
    input.addEventListener('keydown', (event) => {
      if (/^(?:Arrow|Backspace|Delete|Tab|Home|End)/.test(event.key)) {
        reset();
        return;
      }
      if (!/^\d$/.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      const current = parts(input.value);
      if (!current || (!replacement && (!yearActive || yearDigits < 4))) return;

      event.preventDefault();
      replacement = replacement.length === 4 ? event.key : replacement + event.key;
      const year = replacement.padStart(4, '0');
      if (Number(year) === 0) return;
      const next = `${year}-${current[2]}-${current[3]}`;
      if (input.value !== next) {
        writing = true;
        input.value = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        writing = false;
      }
      lastValue = input.value;
      yearActive = true;
      yearDigits = replacement.length;
    }, true);
    input.addEventListener('input', () => {
      if (writing) return;
      const before = parts(lastValue);
      const after = parts(input.value);
      if (after && (!before || before[1] !== after[1]) &&
          (!before || (before[2] === after[2] && before[3] === after[3]))) {
        yearActive = true;
        yearDigits = Math.min(4, yearDigits + 1);
      } else if (!after || (before && (before[2] !== after[2] || before[3] !== after[3]))) {
        yearActive = false;
        yearDigits = 0;
        replacement = '';
      }
      lastValue = input.value;
    }, true);
  }

  function applyPacienteLayout() {
    const modal = visibleModal();
    if (!modal) {
      clearPacienteLayout(document.querySelector('#cadastroModal'));
      return;
    }

    if (!isPacienteModal(modal)) {
      clearPacienteLayout(modal);
      return;
    }

    if (!modalBaselines.has(modal)) {
      const origemField = fieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');
      const nameLabel = fieldByLabel(modal, 'Nome do Paciente')?.querySelector('small.form-text.text-muted');
      const emailInput = fieldByLabel(modal, 'e-mail')?.querySelector('input');
      modalBaselines.set(modal, {
        attributes: tmCaptureAttributes(modal),
        headers: tmCaptureHeaderContents(modal),
        nameLabel: nameLabel ? { element: nameLabel, text: nameLabel.textContent } : null,
        emailInput,
        emailRequired: emailInput?.required,
        origem: origemField ? {
          element: origemField,
          parent: origemField.parentNode,
          next: origemField.nextSibling
        } : null
      });
    }

    injectStyle();

    modal.classList.add('tm-paciente-layout');

    const dados = findDadosContainer(modal);
    if (!dados) return;

    dados.classList.add('tm-paciente-dados-grid');
    ensurePersonalDataHeader(dados);

    const nome = fieldByLabel(modal, 'Nome do Paciente|Nome');
    const nascimento = fieldByLabel(modal, 'Data de Nascimento');
    const cpf = fieldByLabel(modal, 'CPF');
    const celular = fieldByLabel(modal, 'Celular');
    const email = fieldByLabel(modal, 'e-mail');
    const sexo = fieldByLabel(modal, 'Sexo');
    const carteira = fieldByLabel(modal, 'No. da Carteira do Plano');
    const validade = fieldByLabel(modal, 'Validade da Carteira');
    const telefone = fieldByLabel(modal, 'Telefone');
    const nomeSocial = fieldByLabel(modal, 'Nome Social');

    addField(nome, 'tm-paciente-nome');
    renamePatientName(nome);
    addField(nascimento, 'tm-paciente-nascimento');
    addField(cpf, 'tm-paciente-cpf');
    addField(celular, 'tm-paciente-celular');
    addField(email, 'tm-paciente-email');
    const emailInput = email?.querySelector('input');
    if (emailInput) emailInput.required = false;
    addField(telefone, 'tm-paciente-telefone');
    addField(sexo, 'tm-paciente-sexo');
    addField(carteira, 'tm-paciente-carteira');
    addField(validade, 'tm-paciente-validade');

    nomeSocial?.classList.add('tm-paciente-hidden');

    moveOrigem(modal, dados);
    hideOrigemSection(modal);
    setupObservacao(modal);
    applyHeader(modal);

    [
      nome, nascimento, sexo, celular, email, telefone
    ].filter(Boolean).forEach((field) => {
      field.querySelectorAll('input, select, .input-group, .input-group-text').forEach((el) => {
        el.style.setProperty('height', '29.18px', 'important');
        el.style.setProperty('min-height', '29.18px', 'important');
        el.style.setProperty('max-height', '29.18px', 'important');
        el.style.setProperty('line-height', '1.2', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');

        if (el.matches('input, select, .input-group-text')) {
          el.style.setProperty('padding-top', '3px', 'important');
          el.style.setProperty('padding-bottom', '3px', 'important');
        }
      });
    });

    enableDatePaste(nascimento);
    protectBirthDate(nascimento);
    enableDatePaste(validade);
    patientRefreshWarnings(modal);
  }

  function clearPacienteLayout(modal) {
    if (!modal || modal.id !== 'cadastroModal') return;
    const baseline = modalBaselines.get(modal);
    if (!baseline) return;

    modal.querySelectorAll('.tm-paciente-header-emoji, .tm-paciente-header-procedure-emoji, .tm-paciente-header-convenio-injetado, textarea.tm-paciente-observacao-textarea, .tm-paciente-required-warning')
      .forEach((node) => node.remove());
    modal.querySelectorAll('.tm-paciente-warning-host').forEach((node) => node.classList.remove('tm-paciente-warning-host'));
    modal.querySelectorAll('.tm-paciente-warning-control').forEach((node) => node.classList.remove('tm-paciente-warning-control'));
    delete modal.dataset.tmPacienteValidationAttempted;
    modal.querySelectorAll('.tm-paciente-dados-heading').forEach((node) => node.remove());
    if (baseline.nameLabel?.element.isConnected) {
      baseline.nameLabel.element.textContent = baseline.nameLabel.text;
    }
    if (baseline.emailInput?.isConnected) baseline.emailInput.required = baseline.emailRequired;

    const { origem } = baseline;
    if (origem?.element.isConnected && origem.parent.isConnected) {
      const next = origem.next?.parentNode === origem.parent ? origem.next : null;
      origem.parent.insertBefore(origem.element, next);
    }
    modal.querySelectorAll('.tm-paciente-origem-inline-row').forEach((row) => row.remove());

    tmRestoreAttributes(baseline.attributes);
    tmRestoreHeaderContents(baseline.headers);
    modal.classList.remove('tm-paciente-layout', 'tm-paciente-multiple-headers');
    modalBaselines.delete(modal);
  }
  document.addEventListener('shown.bs.modal', (event) => {
    if (event.target?.id === 'cadastroModal') {
      window.setTimeout(applyPacienteLayout, 0);
      window.setTimeout(applyPacienteLayout, 120);
    }
  }, true);

  document.addEventListener('hidden.bs.modal', (event) => {
    if (event.target?.id === 'cadastroModal') {
      clearPacienteLayout(event.target);
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (!window.location.hash.startsWith('#/call-center')) return;
    const button = event.target?.closest?.('button');
    const modal = button?.closest?.('#cadastroModal.tm-paciente-layout');
    if (modal && /^Confirmar$/i.test(norm(button.textContent))) {
      patientValidateCellular(modal, event);
    }
  }, true);

  document.addEventListener('submit', (event) => {
    if (!window.location.hash.startsWith('#/call-center')) return;
    const modal = event.target?.closest?.('#cadastroModal.tm-paciente-layout');
    if (modal && !/^Reservar$/i.test(norm(event.submitter?.textContent))) {
      patientValidateCellular(modal, event);
    }
  }, true);

  for (const name of ['input', 'change']) {
    document.addEventListener(name, (event) => {
      const modal = event.target?.closest?.('#cadastroModal.tm-paciente-layout');
      if (modal?.dataset.tmPacienteValidationAttempted === '1' && event.target.matches('input, select')) {
        patientRefreshWarnings(modal);
      }
    }, true);
  }

  // Mesmo tratamento antecipado do cadastro de primeira vez, limitado ao
  // formulário de paciente já cadastrado ("Nome do Paciente").
  let observedPacienteModal = null;

  function applyPacienteBeforePaint() {
    const modal = observedPacienteModal;
    if (!modal?.isConnected || modal.classList.contains('tm-paciente-layout') ||
        visibleModal() !== modal || !isPacienteModal(modal)) return;
    applyPacienteLayout();
  }

  function observePacienteModal(modal) {
    if (modal === observedPacienteModal) return;
    observedPacienteModal = modal;
    if (!modal) return;

    applyPacienteBeforePaint();
  }

  tmBookingModalWatch.subscribe((modal) => {
    if (modal !== observedPacienteModal) observePacienteModal(modal);
    else if (modal?.classList.contains('tm-paciente-layout')) patientRefreshWarnings(modal);
    else applyPacienteBeforePaint();
  });

  tmRuntime.register('cadastro de paciente', applyPacienteLayout, ['#/call-center']);
})();
