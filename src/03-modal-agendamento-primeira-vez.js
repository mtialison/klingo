/* =========================
   MODAL AGENDAMENTO - PRIMEIRA VEZ
   v19.4 - reorganização visual sem mover DOM
========================= */
const tmBookingModalWatch = (() => {
  const listeners = new Set();
  let modal = null;
  const modalObserver = new MutationObserver(() => {
    listeners.forEach((listener) => listener(modal));
  });
  function discover() {
    const current = document.getElementById('cadastroModal');
    if (current === modal) return;
    modalObserver.disconnect();
    modal = current;
    if (modal) modalObserver.observe(modal, {
      attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true
    });
    listeners.forEach((listener) => listener(modal));
  }
  new MutationObserver(discover).observe(document.documentElement, { childList: true, subtree: true });
  return { subscribe(listener) {
    listeners.add(listener);
    const previous = modal;
    discover();
    if (modal === previous) listener(modal);
  } };
})();
(function () {
  'use strict';

  const TM_CADASTRO_LAYOUT_ID = 'tm-cadastro-primeira-vez-layout-22-4';
  const modalBaselines = new WeakMap();
  const cpfLookups = new WeakMap();
  const otherCpfObservers = new WeakMap();

  function tmCadNorm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function tmCadInjectStyle() {
    if (document.getElementById(TM_CADASTRO_LAYOUT_ID)) return;

    const style = document.createElement('style');
    style.id = TM_CADASTRO_LAYOUT_ID;
    style.textContent = `
      #cadastroModal.tm-primeira-vez-layout {
        text-align: center !important;
      }

      #cadastroModal.tm-primeira-vez-layout .modal-dialog {
        width: 800px !important;
        max-width: calc(100vw - 24px) !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: left !important;
      }

      #cadastroModal.tm-primeira-vez-layout .modal-content {
        width: 800px !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp {
        display: grid !important;
        grid-template-columns: 200px minmax(0, 1fr) 200px 200px !important;
        column-gap: 10px !important;
        row-gap: 4px !important;
        align-items: start !important;
        width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .border-bottom {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
        width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .form-row {
        display: contents !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .tm-cad-origem-inline-row {
        display: contents !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col-4,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col-6,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col-12 {
        flex: initial !important;
        max-width: none !important;
        width: auto !important;
        min-width: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .form-control,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > input.form-control,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > select.form-control {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .input-group-prepend,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .input-group-append {
        display: flex !important;
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: none !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .input-group-text,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .btn,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group-prepend > .input-group-text,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group-append > .input-group-text,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group-prepend > .btn,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group-append > .btn {
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: none !important;
        white-space: nowrap !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-nascimento .input-group,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-celular .input-group {
        width: 200px !important;
        max-width: 200px !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-celular .input-group-prepend,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-celular .tm-cad-phone-country-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-nome {
        grid-column: 1 / 3 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-nascimento {
        grid-column: 3 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-cpf {
        grid-column: 4 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-celular {
        grid-column: 1 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-origem {
        grid-column: 2 / 4 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-sexo {
        grid-column: 4 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-carteira {
        grid-column: 1 / 3 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-validade {
        grid-column: 3 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-col {
        padding-left: 5px !important;
        padding-right: 5px !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-col-4 {
        flex: 0 0 33.333333% !important;
        max-width: 33.333333% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-col-6 {
        flex: 0 0 50% !important;
        max-width: 50% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-hidden-field {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-nome { order: 10 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-nascimento { order: 20 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-cpf { order: 30 !important; }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-celular { order: 40 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-email { order: 50 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-sexo { order: 60 !important; }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-carteira { order: 70 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-validade { order: 80 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-origem { order: 50 !important; }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-col,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-col .form-group,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-col .input-group,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-col select {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-select-row {
        margin-top: 4px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-col {
        flex: 0 0 100% !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .form-row.tm-cad-observacao-row,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row {
        display: flex !important;
        flex-wrap: wrap !important;
        width: 100% !important;
        flex: 0 0 100% !important;
        max-width: 100% !important;
        order: 100 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .form-row.tm-cad-observacao-row > .tm-cad-observacao-col,
      #cadastroModal.tm-primeira-vez-layout #cadTemp > .form-row.tm-cad-observacao-row > .tm-cad-observacao-aux-col,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-aux-col {
        display: block !important;
        flex: 0 0 100% !important;
        max-width: 100% !important;
        width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col {
        flex: 0 0 min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        width: min(353.78px, 100%) !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        margin-top: 4px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col {
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        flex: 0 0 min(353.78px, 100%) !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col .input-group-prepend {
        display: flex !important;
        flex: 0 0 auto !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col select {
        width: auto !important;
        max-width: none !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-select-row > .input-group {
        width: 100% !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col .input-group,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col input.form-control {
        width: 100% !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-original-input-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col {
        padding-left: 5px !important;
        padding-right: 5px !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col .input-group {
        width: calc(100% + 10px) !important;
        max-width: calc(100% + 10px) !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-textarea {
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

      #cadastroModal.tm-primeira-vez-layout div.mt-3.mb-5 {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        flex-grow: 0 !important;
        padding-bottom: 0 !important;
        margin-bottom: 16px !important;
      }

      #cadastroModal.tm-primeira-vez-layout div.mt-3.mb-5 > br {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card * {
        font-family: inherit !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        font-style: normal !important;
        line-height: 1.4 !important;
        letter-spacing: normal !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card {
        position: relative !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-title {
        margin-bottom: 6px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-procedure-emoji {
        margin-right: 5px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-ocupar {
        position: absolute !important;
        right: 12px !important;
        bottom: 10px !important;
        z-index: 2;
        margin: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-info-wrap {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
        gap: 4px !important;
        width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-left {
        display: contents !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-row {
        display: block !important;
        width: 100% !important;
        margin-right: 0 !important;
        margin-bottom: 0 !important;
        white-space: normal !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-profissional {
        order: 2 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-convenio {
        order: 3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-unidade {
        order: 4 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data {
        order: 5 !important;
        display: block !important;
        width: 100% !important;
        margin-top: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-date-line,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-time-line {
        display: block !important;
        width: 100% !important;
        margin-left: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-time-line {
        margin-top: 2px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-native-icon-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-emoji {
        display: inline-block !important;
        width: 1.5em !important;
        margin-right: 4px !important;
        vertical-align: baseline !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-sala {
        font-size: 13px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card blockquote {
        margin-top: 6px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-convenio-externo-oculto {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-convenio-injetado {
        display: block !important;
      }





      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-section-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-title-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-warning-host {
        position: relative !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-required-warning {
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
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-required-warning.tm-cad-warning-visible {
        display: inline-flex;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-warning-control {
        padding-left: 30px !important;
      }

      @media (max-width: 720px) {
        #cadastroModal.tm-primeira-vez-layout #cadTemp {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col,
        #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-observacao-row {
          grid-column: 1 / -1 !important;
          grid-row: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function tmCadVisibleModal() {
    const modal = document.querySelector('#cadastroModal');
    if (!modal) return null;

    const style = getComputedStyle(modal);
    const rect = modal.getBoundingClientRect();

    if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return modal;
  }

  function tmCadFieldByLabel(modal, labelText) {
    const labels = Array.from(modal.querySelectorAll('small.form-text.text-muted'));
    const allowedLabels = String(labelText || '')
      .split('|')
      .map((item) => tmCadNorm(item))
      .filter(Boolean);

    for (const label of labels) {
      const currentLabel = tmCadNorm(label.innerText || label.textContent || '');
      if (!allowedLabels.includes(currentLabel)) continue;

      const col = label.closest('.col');
      if (col && modal.contains(col)) return col;
    }

    return null;
  }

  function tmCadHasLabel(modal, labelText) {
    return !!tmCadFieldByLabel(modal, labelText);
  }

  function tmCadIsValidCpf(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

    for (let length = 9; length <= 10; length += 1) {
      let sum = 0;
      for (let index = 0; index < length; index += 1) {
        sum += Number(digits[index]) * (length + 1 - index);
      }
      const remainder = (sum * 10) % 11;
      if (Number(digits[length]) !== (remainder === 10 ? 0 : remainder)) return false;
    }
    return true;
  }

  function tmCadPhoneInvalid(input) {
    const digits = String(input?.value || '').replace(/\D/g, '');
    if (!digits || input?.validity?.valid === false) return true;
    return digits.length < 10 || digits.length > 11;
  }

  function tmCadRequiredProblems(modal) {
    const labels = [
      ['nome', 'Nome', 'input'],
      ['nascimento', 'Data de Nascimento', 'input[type="date"]'],
      ['cpf', 'CPF', 'input'],
      ['celular', 'Celular', 'input[type="tel"], input:not([type="hidden"])'],
      ['origem', 'Origem de Pacientes|Origem do Agendamento', 'select'],
      ['sexo', 'Sexo', 'select']
    ];
    const fields = labels.map(([key, label, selector]) => {
      const field = tmCadFieldByLabel(modal, label);
      const control = field?.querySelector(selector) || null;
      const value = tmCadNorm(control?.value);
      const selectedText = tmCadNorm(control?.selectedOptions?.[0]?.textContent);
      const missing = !control || !value || (control.tagName === 'SELECT' && /^Selecione/i.test(selectedText));
      const malformed = !missing && (key === 'cpf' ? !tmCadIsValidCpf(value) :
        key === 'celular' ? tmCadPhoneInvalid(control) : control.validity?.valid === false);
      return { key, field, control, missing, malformed };
    });
    return fields;
  }

  function tmCadSetRequiredWarning(field, input, invalid) {
    if (!field || !input) return;
    const host = input.parentElement;
    if (!host) return;
    host.classList.add('tm-cad-warning-host');
    let warning = host.querySelector(':scope > .tm-cad-required-warning');
    if (!warning) {
      warning = document.createElement('span');
      warning.className = 'tm-cad-required-warning';
      warning.textContent = '!';
      warning.setAttribute('aria-hidden', 'true');
      host.appendChild(warning);
    }
    warning.style.top = `${input.offsetTop + 1}px`;
    warning.style.left = `${input.offsetLeft + 1}px`;
    warning.style.height = `${Math.max(0, input.offsetHeight - 2)}px`;
    warning.classList.toggle('tm-cad-warning-visible', invalid);
    input.classList.toggle('tm-cad-warning-control', invalid);
  }

  function tmCadRefreshRequiredWarnings(modal, force = false) {
    if (!modal || !tmCadIsPrimeiraVez(modal)) return;
    for (const { field, control, missing, malformed } of tmCadRequiredProblems(modal)) {
      tmCadSetRequiredWarning(field, control,
        !!control && force && (missing || malformed));
    }
  }

  function tmCadBookingComponent(modal) {
    const firstVisit = document.querySelector('input[placeholder="Operadora/Plano..."]') ||
      Array.from(document.querySelectorAll('a')).find((link) => tmCadNorm(link.textContent) === 'Primeira Vez');
    for (const start of [modal, firstVisit]) {
      for (let element = start; element; element = element.parentElement) {
        const vue = element.__vue__;
        if (vue?.$route?.path === '/call-center' && typeof vue.$toast?.add === 'function') return vue;
      }
    }
    return null;
  }

  function tmCadCadastroComponent(modal) {
    const component = modal?.querySelector('#cadTemp')?.parentElement?.__vue__;
    return component?.value && typeof component.$util?.loadItem === 'function' &&
      typeof component.identificar_paciente === 'function' ? component : null;
  }

  function tmCadIsCpfLookupTarget(modal) {
    return tmCadIsPrimeiraVez(modal) ||
      (['novoAtendimento2Modal', 'editarMarcacaoModal'].includes(modal?.id) &&
        !!modal.querySelector('#cadTemp'));
  }

  function tmCadCpfDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function tmCadExactCpfRecords(records, cpf) {
    return Array.isArray(records) ? records.filter((record) =>
      tmCadCpfDigits(record?.st_cpf || record?.cadastro?.st_cpf || record?.pessoa?.st_cpf) === cpf &&
      Number(record?.id_pessoa) > 0) : [];
  }

  function tmCadSelectExactCpf(modal, component, cpf, records) {
    if (!modal?.isConnected || !tmCadIsCpfLookupTarget(modal) ||
        tmCadCpfDigits(tmCadFieldByLabel(modal, 'CPF')?.querySelector('input')?.value) !== cpf) return false;
    const matches = tmCadExactCpfRecords(records, cpf);
    if (matches.length !== 1) return false;
    const state = cpfLookups.get(component);
    if (state?.selectedCpf === cpf) return true;
    if (state) state.selectedCpf = cpf;
    component.identificar_paciente(matches[0]);
    return true;
  }

  function tmCadLookupCpf(modal) {
    if (!tmCadIsCpfLookupTarget(modal)) return null;
    const input = tmCadFieldByLabel(modal, 'CPF')?.querySelector('input');
    const cpf = tmCadCpfDigits(input?.value);
    if (!tmCadIsValidCpf(cpf)) return null;
    const component = tmCadCadastroComponent(modal);
    if (!component) return null;

    let state = cpfLookups.get(component);
    if (!state) {
      state = { cpf: '', pending: false, done: false, selectedCpf: '', matches: 0, generation: 0 };
      cpfLookups.set(component, state);
    }
    if (state.cpf !== cpf) {
      state.cpf = cpf;
      state.pending = false;
      state.done = false;
      state.selectedCpf = '';
      state.matches = 0;
      state.generation += 1;
    }
    if (tmCadSelectExactCpf(modal, component, cpf, component.lista)) return state;
    if (state.pending || state.done || state.selectedCpf === cpf) return state;

    state.pending = true;
    const generation = state.generation;
    // A pesquisa nativa de pacientes aceita CPF isolado; checar_existencia
    // exige os demais dados e falha quando recebe apenas o CPF.
    Promise.resolve(component.$util.loadItem(component, {
      service: 'pacientes', func: 'index', parms: { search: cpf }
    })).then((result) => {
      if (state.generation !== generation || !modal.isConnected || !tmCadIsCpfLookupTarget(modal) ||
          tmCadCpfDigits(input.value) !== cpf) return;
      const matches = tmCadExactCpfRecords(result, cpf);
      state.done = true;
      state.matches = matches.length;
      tmCadSelectExactCpf(modal, component, cpf, matches);
    }).catch(() => {
      if (state.generation === generation) state.done = false;
    }).finally(() => {
      if (state.generation === generation) state.pending = false;
    });
    return state;
  }

  function tmCadGuardCpfLookup(modal, event) {
    const input = tmCadFieldByLabel(modal, 'CPF')?.querySelector('input');
    if (!tmCadIsValidCpf(input?.value)) return true;
    const state = tmCadLookupCpf(modal);
    if (state?.done && state.matches === 0 && !state.selectedCpf) return true;
    event?.preventDefault();
    event?.stopImmediatePropagation();
    (tmCadCadastroComponent(modal)?.$toast || tmCadBookingComponent(modal)?.$toast)?.add({
      severity: 'warn', summary: 'Atenção',
      detail: state?.matches > 1 ? 'Há mais de uma ficha com este CPF. Confira os demais dados e selecione a correta.' :
        state?.selectedCpf ? 'Aguarde a ficha existente carregar.' :
          'Aguarde a conferência do CPF antes de confirmar.', life: 5000
    });
    return false;
  }

  function tmCadValidateRequiredFields(modal, event) {
    if (!modal || !tmCadIsPrimeiraVez(modal)) return true;
    modal.dataset.tmCadValidationAttempted = '1';
    tmCadRefreshRequiredWarnings(modal, true);
    const problems = tmCadRequiredProblems(modal);
    const missing = problems.filter((item) => item.missing);
    const malformed = problems.filter((item) => item.malformed);
    if (!missing.length && !malformed.length) return tmCadGuardCpfLookup(modal, event);

    const message = missing.length || malformed.length !== 1 ? 'Verificar preenchimento dos campos.' :
      malformed[0].key === 'cpf' ? 'Informe um CPF válido.' :
      malformed[0].key === 'celular' ? 'Informe um celular válido.' :
      'Verificar preenchimento dos campos.';

    event?.preventDefault();
    event?.stopImmediatePropagation();
    const component = tmCadBookingComponent(modal);
    component?.$toast?.add({ severity: 'error', summary: 'Atenção', detail: message, life: 5000 });
    if (!component) console.warn('[TM] Balão do Klingo indisponível para validar o cadastro.');
    (missing[0] || malformed[0])?.control?.focus();
    return false;
  }

  function tmCadIsPrimeiraVez(modal) {
    if (!modal || modal.id !== 'cadastroModal') return false;
    if (modal.classList.contains('tm-paciente-layout')) return false;

    const title = tmCadNorm(modal.querySelector('.modal-title')?.innerText || modal.querySelector('.modal-title')?.textContent || '');

    if (/Remarcação de/i.test(modal.innerText || modal.textContent || '')) return false;
    if (/Editar Marcação/i.test(title)) return false;
    if (tmCadHasLabel(modal, 'Nome do Paciente')) return false;

    return (
      tmCadHasLabel(modal, 'Sexo') &&
      tmCadHasLabel(modal, 'Data de Nascimento') &&
      tmCadHasLabel(modal, 'Nome') &&
      tmCadHasLabel(modal, 'CPF') &&
      tmCadHasLabel(modal, 'Origem de Pacientes|Origem do Agendamento')
    );
  }

  function tmCadResetFieldClass(field) {
    if (!field) return;

    field.classList.remove(
      'col-md-1', 'col-md-2', 'col-md-3', 'col-md-4', 'col-md-5', 'col-md-6',
      'col-md-7', 'col-md-8', 'col-md-9', 'col-md-10', 'col-md-11', 'col-md-12',
      'tm-cad-col', 'tm-cad-col-4', 'tm-cad-col-6',
      'tm-cad-order-nome', 'tm-cad-order-nascimento', 'tm-cad-order-cpf',
      'tm-cad-order-celular', 'tm-cad-order-email', 'tm-cad-order-origem',
      'tm-cad-order-sexo', 'tm-cad-order-carteira', 'tm-cad-order-validade',
      'tm-cad-origem-col'
    );

    field.classList.add('col', 'col-12');
  }

  function tmCadSetField(field, sizeClass, orderClass) {
    if (!field) return;

    tmCadResetFieldClass(field);
    field.classList.add('tm-cad-col', sizeClass, orderClass);
  }

  function tmCadHideField(field) {
    if (!field) return;

    field.classList.add('tm-cad-hidden-field');
    field.style.setProperty('display', 'none', 'important');
  }

  function tmCadHidePhoneCountry(field) {
    if (!field) return;
    for (const control of field.querySelectorAll('button, select')) {
      if (!/^BR\b/i.test(tmCadNorm(control.textContent))) continue;
      const wrapper = control.closest('.input-group-prepend, .btn-group, .dropdown');
      (wrapper && field.contains(wrapper) ? wrapper : control)
        .classList.add('tm-cad-phone-country-hidden');
    }
  }

  function tmCadPlaceOrigemInDados(modal, origemField) {
    if (!modal || !origemField) return;

    const cadTemp = modal.querySelector('#cadTemp');
    if (!cadTemp) return;

    let inlineRow = cadTemp.querySelector(':scope > .tm-cad-origem-inline-row');
    if (!inlineRow) {
      inlineRow = document.createElement('div');
      inlineRow.className = 'form-row tm-cad-origem-inline-row';
      cadTemp.appendChild(inlineRow);
    }

    if (origemField.parentElement !== inlineRow) {
      inlineRow.appendChild(origemField);
    }
  }

  function tmCadFindObservacaoRow(modal) {
    if (!modal) return null;

    const rows = Array.from(modal.querySelectorAll('.form-row')).filter((row) => row instanceof HTMLElement);

    for (const row of rows) {
      const directCols = Array.from(row.children).filter((child) => {
        return child instanceof HTMLElement && child.classList.contains('col');
      });

      if (directCols.length < 2) continue;

      const obsCol = directCols.find((col) => {
        return !!col.querySelector(':scope input.form.form-control') && !col.querySelector(':scope select');
      });

      const auxCol = directCols.find((col) => {
        return (
          !!col.querySelector(':scope select.form.form-control') &&
          !!col.querySelector(':scope .fa-fw.fas.fa-question.text-muted, :scope .fa-question') &&
          !col.querySelector(':scope small.form-text.text-muted')
        );
      });

      if (!obsCol || !auxCol) continue;

      const previousText = tmCadNorm(row.previousElementSibling?.innerText || row.previousElementSibling?.textContent || '');
      const nearObservationTitle = previousText === 'Observação' || previousText.includes('Observação');

      // Este é o HTML exato informado: primeira coluna input, segunda coluna select com ícone ?.
      // Preferir a linha logo abaixo do título Observação, mas aceitar a primeira estrutura exata encontrada.
      if (nearObservationTitle || !row.dataset.tmObservationCandidateChecked) {
        row.dataset.tmObservationCandidateChecked = '1';
        return { row, obsCol, auxCol };
      }
    }

    return null;
  }

  function tmCadForceFullCol(col, extraClass) {
    if (!col) return;

    col.classList.remove(
      'col-md-1', 'col-md-2', 'col-md-3', 'col-md-4', 'col-md-5', 'col-md-6',
      'col-md-7', 'col-md-8', 'col-md-9', 'col-md-10', 'col-md-11', 'col-md-12'
    );

    col.classList.add('col', 'col-12', extraClass);
    col.style.setProperty('display', 'block', 'important');

    if (extraClass === 'tm-cad-observacao-aux-col') {
      col.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
      col.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
      col.style.setProperty('width', 'min(353.78px, 100%)', 'important');
      return;
    }

    col.style.setProperty('flex', '0 0 100%', 'important');
    col.style.setProperty('max-width', '100%', 'important');
    col.style.setProperty('width', '100%', 'important');
  }

  function tmCadMoveObservacaoSelect(modal) {
    const found = tmCadFindObservacaoRow(modal);
    if (!found) return;

    const { row, obsCol, auxCol } = found;

    row.classList.add('tm-cad-observacao-row');
    row.style.setProperty('display', 'flex', 'important');
    row.style.setProperty('flex-wrap', 'wrap', 'important');
    row.style.setProperty('width', '100%', 'important');
    row.style.setProperty('flex', '0 0 100%', 'important');
    row.style.setProperty('max-width', '100%', 'important');
    row.style.setProperty('order', '100', 'important');

    tmCadForceFullCol(obsCol, 'tm-cad-observacao-col');
    tmCadForceFullCol(auxCol, 'tm-cad-observacao-aux-col');

    obsCol.style.setProperty('padding-left', '5px', 'important');
    obsCol.style.setProperty('padding-right', '5px', 'important');
    obsCol.style.setProperty('box-sizing', 'border-box', 'important');

    const obsInputGroup = obsCol.querySelector('.input-group');
    if (obsInputGroup) {
      obsInputGroup.style.setProperty('width', 'calc(100% + 10px)', 'important');
      obsInputGroup.style.setProperty('max-width', 'calc(100% + 10px)', 'important');
    }

    const obsInput = obsCol.querySelector('input.form-control');
    if (obsInput) {
      obsInput.style.setProperty('width', '100%', 'important');
      obsInput.style.setProperty('max-width', '100%', 'important');
    }

    obsCol.style.setProperty('order', '1', 'important');
    auxCol.style.setProperty('order', '2', 'important');
    auxCol.style.setProperty('margin-top', '4px', 'important');
    auxCol.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('width', 'min(353.78px, 100%)', 'important');

    const inputGroup = auxCol.querySelector('.input-group');
    if (inputGroup) {
      inputGroup.style.setProperty('display', 'flex', 'important');
      inputGroup.style.setProperty('flex-wrap', 'nowrap', 'important');
      inputGroup.style.setProperty('width', 'min(353.78px, 100%)', 'important');
      inputGroup.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
    }

    const prepend = auxCol.querySelector('.input-group-prepend');
    if (prepend) {
      prepend.style.setProperty('display', 'flex', 'important');
      prepend.style.setProperty('flex', '0 0 auto', 'important');
    }

    const select = auxCol.querySelector('select');
    if (select) {
      select.style.setProperty('flex', '1 1 auto', 'important');
      select.style.setProperty('width', 'auto', 'important');
      select.style.setProperty('min-width', '0', 'important');
    }
  }

  function tmCadDispatchNativeInput(el) {
    if (!el) return;

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function tmCadSetInputValue(el, value) {
    if (!el) return;

    el.value = value || '';
    tmCadDispatchNativeInput(el);
  }

  function tmCadExtractPatientClipboard(rawText) {
    const text = String(rawText || '').replace(/\r\n/g, '\n').trim();
    if (!text) return null;

    const data = {};

    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      const match = line.match(/^(Nome|Nascimento|CPF|E-mail|Email|Telefone|Celular)\s*:?\s*(.+)$/i);
      if (!match) return;

      const key = match[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const value = match[2].trim();

      if (key === 'nome') data.nome = value;
      if (key === 'nascimento') data.nascimento = value;
      if (key === 'cpf') data.cpf = value;
      if (key === 'e-mail' || key === 'email') data.email = value;
      if (key === 'telefone' || key === 'celular') data.celular = value;
    });

    const hasMinimumData = !!(data.nome || data.nascimento || data.cpf || data.email || data.celular);
    const hasExplicitLabel = lines.some((line) =>
      /^(Nome|Nascimento|CPF|E-mail|Email|Telefone|Celular)\s*:/i.test(line)
    );

    if (!hasMinimumData || (!hasExplicitLabel && Object.keys(data).length < 2)) return null;

    return data;
  }

  function tmCadFindInputInField(modal, labelText) {
    const field = tmCadFieldByLabel(modal, labelText);
    if (!field) return null;

    return field.querySelector('input.form-control, input, select.form-control, select, textarea.tm-cad-observacao-textarea, textarea');
  }

  function tmCadNormalizeCpf(value) {
    return String(value || '').trim();
  }

  function tmCadNormalizePhone(value) {
    return String(value || '').trim();
  }

  function tmCadApplyPatientClipboard(modal, data) {
    if (!modal || !data) return false;

    const nomeInput = tmCadFindInputInField(modal, 'Nome');
    const nascimentoInput = tmCadFindInputInField(modal, 'Data de Nascimento');
    const cpfInput = tmCadFindInputInField(modal, 'CPF');
    const emailInput = tmCadFindInputInField(modal, 'e-mail');
    const celularField = tmCadFieldByLabel(modal, 'Celular');
    const celularInput = celularField?.querySelector('input.form-control, input');

    if (data.nome && nomeInput) {
      tmCadSetInputValue(nomeInput, data.nome);
    }

    if (data.nascimento && nascimentoInput) {
      const parsedDate = tmCadParseClipboardDate(data.nascimento);
      if (parsedDate) tmCadSetInputValue(nascimentoInput, parsedDate);
    }

    if (data.cpf && cpfInput) {
      tmCadSetInputValue(cpfInput, tmCadNormalizeCpf(data.cpf));
    }

    if (data.email && emailInput) {
      tmCadSetInputValue(emailInput, data.email);
    }

    if (data.celular && celularInput) {
      tmCadSetInputValue(celularInput, tmCadNormalizePhone(data.celular));
    }

    return true;
  }

  function tmCadEnablePatientClipboardPaste(modal) {
    if (!modal || modal.dataset.tmPatientClipboardPasteEnabled === '1') return;

    modal.dataset.tmPatientClipboardPasteEnabled = '1';

    modal.addEventListener('paste', (event) => {
      if (!modal.classList.contains('tm-primeira-vez-layout')) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const cadTemp = modal.querySelector('#cadTemp');
      if (!cadTemp || !cadTemp.contains(target)) return;

      const rawText = event.clipboardData?.getData('text/plain') || '';
      const parsed = tmCadExtractPatientClipboard(rawText);

      if (!parsed) return;

      event.preventDefault();
      event.stopPropagation();

      tmCadApplyPatientClipboard(modal, parsed);

      const nomeInput = tmCadFindInputInField(modal, 'Nome');
      if (nomeInput) {
        nomeInput.focus({ preventScroll: true });
      }
    }, true);
  }

  function tmCadParseClipboardDate(rawValue) {
    return tmParseDateInput(rawValue);
  }
  function tmCadEnableDatePaste(field) {
    if (!field || field.dataset.tmDatePasteEnabled === '1') return;

    const input = field.querySelector('input[type="date"].form-control, input[type="date"]');
    if (!input) return;

    field.dataset.tmDatePasteEnabled = '1';

    input.addEventListener('paste', (event) => {
      const clipboardText = event.clipboardData?.getData('text/plain') || '';
      const parsed = tmCadParseClipboardDate(clipboardText);

      if (!parsed) return;

      event.preventDefault();

      input.value = parsed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, true);
  }

  function tmCadProtectBirthDate(field) {
    const input = field?.querySelector('input[type="date"]');
    if (!input || input.dataset.tmBirthDateDigitGuard === '1') return;
    input.dataset.tmBirthDateDigitGuard = '1';
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

      // O Chrome apaga o input date quando o ano recebe um quinto dígito.
      // Reinicia somente a edição do ano; dia e mês permanecem nativos.
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

  function tmCadEnableDatePastes(modal) {
    const nascimento = tmCadFieldByLabel(modal, 'Data de Nascimento');
    tmCadEnableDatePaste(nascimento);
    tmCadProtectBirthDate(nascimento);
    tmCadEnableDatePaste(tmCadFieldByLabel(modal, 'Validade da Carteira'));
  }

  function tmCadFocusableInField(field) {
    if (!field) return null;

    return field.querySelector('textarea.tm-cad-observacao-textarea, input:not([type="hidden"]), select, textarea, button');
  }

  function tmCadApplyTabOrder(modal) {
    if (!modal) return;

    const ordered = [
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Nome')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Data de Nascimento')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'CPF')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Celular')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'e-mail')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Sexo')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'No. da Carteira do Plano')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Validade da Carteira')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento')),
      modal.querySelector('.tm-cad-observacao-textarea'),
      tmCadFindObservacaoRow(modal)?.auxCol?.querySelector('select.form.form-control, select')
    ].filter(Boolean);

    ordered.forEach((el, index) => {
      el.setAttribute('tabindex', String(index + 1));
    });

    modal.querySelectorAll('.tm-cad-hidden-field input, .tm-cad-hidden-field select, input.tm-cad-observacao-original-input-hidden').forEach((el) => {
      el.setAttribute('tabindex', '-1');
    });
  }

  function tmCadFocusNomeOnce(modal) {
    if (!modal || modal.dataset.tmNomeInitialFocusDone === '1') return;
    const nomeInput = tmCadFocusableInField(tmCadFieldByLabel(modal, 'Nome'));
    if (!nomeInput) return;

    modal.dataset.tmNomeInitialFocusDone = '1';
    window.setTimeout(() => {
      if (modal.classList.contains('tm-primeira-vez-layout') && nomeInput.isConnected) {
        nomeInput.focus({ preventScroll: true });
      }
    }, 50);
  }
  function tmCadHeaderMonthName(monthShort) {
    const key = String(monthShort || '').trim().toLowerCase();

    const map = {
      jan: 'Janeiro',
      fev: 'Fevereiro',
      mar: 'Março',
      abr: 'Abril',
      mai: 'Maio',
      jun: 'Junho',
      jul: 'Julho',
      ago: 'Agosto',
      set: 'Setembro',
      out: 'Outubro',
      nov: 'Novembro',
      dez: 'Dezembro'
    };

    return map[key] || monthShort;
  }

  function tmCadHeaderWeekdayName(dayShort) {
    const key = String(dayShort || '').trim().toLowerCase();

    const map = {
      dom: 'Domingo',
      seg: 'Segunda-feira',
      ter: 'Terça-feira',
      qua: 'Quarta-feira',
      qui: 'Quinta-feira',
      sex: 'Sexta-feira',
      sab: 'Sábado',
      sáb: 'Sábado'
    };

    return map[key] || dayShort;
  }

  function tmCadNormalizeHeaderDate(dateBlock) {
    if (!dateBlock) return;

    const calendarSmall = Array.from(dateBlock.querySelectorAll('small')).find((small) => {
      return !!small.querySelector('.fa-calendar-alt');
    });

    if (!calendarSmall) return;

    const rawText = String(calendarSmall.textContent || '').replace(/\s+/g, ' ').trim();
    const badge = calendarSmall.querySelector('.badge');

    const dayMatch = rawText.match(/(\d{1,2})\s*\/\s*([A-Za-zÀ-ÿ]{3})/i);
    const weekday = tmCadHeaderWeekdayName(badge?.textContent || '');

    if (!dayMatch) return;

    const day = String(parseInt(dayMatch[1], 10));
    const monthName = tmCadHeaderMonthName(dayMatch[2]);

    const icon = calendarSmall.querySelector('i');

    calendarSmall.textContent = '';

    if (icon) {
      calendarSmall.appendChild(icon);
    }

    calendarSmall.appendChild(document.createTextNode(`${day} de ${monthName} | ${weekday}`.toUpperCase()));

    dateBlock.dataset.tmHeaderDateNormalized = '1';
  }

  function tmCadAddProcedureEmoji(title) {
    if (!title || title.querySelector(':scope > .tm-cad-header-procedure-emoji')) return;
    const icon = document.createElement('span');
    icon.className = 'tm-cad-header-procedure-emoji';
    icon.textContent = '🩺';
    icon.setAttribute('aria-hidden', 'true');
    title.prepend(icon);
  }

  function tmCadEmojifyHeaderIcon(container, selector, emoji) {
    const icon = container?.querySelector(selector);
    if (!icon) return;
    icon.classList.add('tm-cad-native-icon-hidden');
    if (icon.previousElementSibling?.classList.contains('tm-cad-header-emoji')) {
      icon.previousElementSibling.textContent = emoji;
      return;
    }

    const replacement = document.createElement('span');
    replacement.className = 'tm-cad-header-emoji';
    replacement.textContent = emoji;
    replacement.setAttribute('aria-hidden', 'true');
    icon.before(replacement);
  }

  function tmCadDecorateHeader(profissional, convenio, unidade, dateBlock) {
    tmCadEmojifyHeaderIcon(profissional, '.fa-user-md', '👨‍⚕️');
    tmCadEmojifyHeaderIcon(convenio, '.fa-credit-card', '💳');
    tmCadEmojifyHeaderIcon(unidade, '.fa-building', '🏥');

    const dateSmall = Array.from(dateBlock.querySelectorAll('small'))
      .find((small) => !!small.querySelector('.fa-calendar-alt'));
    const timeSmall = Array.from(dateBlock.querySelectorAll('small'))
      .find((small) => small !== dateSmall && /\d{1,2}:\d{2}/.test(small.textContent || ''));

    dateSmall?.classList.add('tm-cad-header-date-line');
    timeSmall?.classList.add('tm-cad-header-time-line');
    tmCadEmojifyHeaderIcon(dateSmall, '.fa-calendar-alt', '📅');
    tmCadEmojifyHeaderIcon(timeSmall, 'i', '🕒');
  }

  function tmCadGetExternalConvenioForHeaderList(listGroup) {
    if (!listGroup) return '';

    const convenioItem = Array.from(listGroup.children).find((item) => {
      if (!(item instanceof HTMLElement)) return false;
      if (!item.matches('li.list-group-item')) return false;
      if (item.querySelector('label .h4')) return false;
      return !!item.querySelector('.fa-credit-card');
    });

    const small = convenioItem?.querySelector('small.lead');
    const textValue = tmCadNorm(small?.innerText || small?.textContent || '');

    if (textValue) {
      convenioItem.classList.add('tm-cad-convenio-externo-oculto');
    }

    return textValue;
  }

  function tmCadBuildConvenioRowFromText(textValue) {
    const row = document.createElement('span');
    row.className = 'mr-3 tm-cad-header-row tm-cad-header-convenio tm-cad-header-convenio-injetado';
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

  function tmCadPositionOcuparButton(item) {
    const button = Array.from(item.querySelectorAll('button'))
      .find((candidate) => /^Ocupar\b/i.test(tmCadNorm(candidate.textContent)));
    if (!button) return;
    const group = button.closest('.btn-group, .dropdown');
    const target = group && item.contains(group) ? group : button;
    target.classList.add('tm-cad-header-ocupar');
  }

  function tmCadApplyHeaderLayout(modal) {
    if (!modal) return;

    const listGroups = Array.from(modal.querySelectorAll('ul.list-group'));

    listGroups.forEach((listGroup) => {
      const externalConvenioText = tmCadGetExternalConvenioForHeaderList(listGroup);

      const headerItems = Array.from(listGroup.children).filter((item) => {
        return (
          item instanceof HTMLElement &&
          item.matches('li.list-group-item') &&
          !!item.querySelector('label .h4') &&
          !!item.querySelector('label .fa-user-md') &&
          !!item.querySelector('label .fa-building') &&
          !!item.querySelector('label .fa-calendar-alt')
        );
      });

      if (headerItems.length > 1) {
        modal.classList.add('tm-cad-multiple-headers');
        listGroup.classList.add('tm-cad-multiple-headers');
      } else {
        listGroup.classList.remove('tm-cad-multiple-headers');
      }

      headerItems.forEach((item) => {
        const title = item.querySelector('label .h4');
        const infoWrap = item.querySelector('label .d-flex.justify-content-between');
        if (!title || !infoWrap) return;

        const left = infoWrap.querySelector(':scope > div:first-child');
        const dateBlock = infoWrap.querySelector(':scope > div.lead');

        if (!left || !dateBlock) return;

        const injectedConvenio = left.querySelector('.tm-cad-header-convenio-injetado');
        if (injectedConvenio && tmCadNorm(injectedConvenio.textContent) !== externalConvenioText) {
          injectedConvenio.remove();
        }

        const spans = Array.from(left.querySelectorAll(':scope > span'));

        let convenio = spans.find((span) => !!span.querySelector('.fa-credit-card'));
        const profissional = spans.find((span) => !!span.querySelector('.fa-user-md'));
        const unidade = spans.find((span) => !!span.querySelector('.fa-building'));

        if (!profissional || !unidade) return;

        if (!convenio && externalConvenioText) {
          convenio = tmCadBuildConvenioRowFromText(externalConvenioText);
          left.insertBefore(convenio, unidade);
        }

        item.classList.add('tm-cad-header-card');
        tmCadPositionOcuparButton(item);
        title.classList.add('tm-cad-header-title');
        tmCadAddProcedureEmoji(title);
        infoWrap.classList.add('tm-cad-header-info-wrap');
        left.classList.add('tm-cad-header-left');

        profissional.classList.add('tm-cad-header-row', 'tm-cad-header-profissional');
        unidade.classList.add('tm-cad-header-row', 'tm-cad-header-unidade');
        dateBlock.classList.add('tm-cad-header-data');

        if (convenio) {
          convenio.classList.add('tm-cad-header-row', 'tm-cad-header-convenio');
        }

        unidade.querySelectorAll('small.text-muted').forEach((small) => {
          small.classList.add('tm-cad-header-sala');
        });

        tmCadNormalizeHeaderDate(dateBlock);
        tmCadDecorateHeader(profissional, convenio, unidade, dateBlock);
      });
    });
  }


  function tmCadEnableObservacaoTextarea(modal) {
    const found = tmCadFindObservacaoRow(modal);
    if (!found) return;

    const { obsCol } = found;
    const inputGroup = obsCol.querySelector('.input-group');
    const originalInput = obsCol.querySelector('input.form-control');

    if (!inputGroup || !originalInput) return;

    originalInput.classList.add('tm-cad-observacao-original-input-hidden');
    originalInput.style.setProperty('display', 'none', 'important');

    let textarea = inputGroup.querySelector('textarea.tm-cad-observacao-textarea');

    if (!textarea) {
      textarea = document.createElement('textarea');
      textarea.className = 'form form-control tm-cad-observacao-textarea';
      textarea.placeholder = originalInput.getAttribute('placeholder') || '';
      textarea.autocomplete = originalInput.getAttribute('autocomplete') || 'off';
      textarea.value = originalInput.value || '';

      textarea.addEventListener('input', () => {
        originalInput.value = textarea.value;
        originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        originalInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      inputGroup.appendChild(textarea);
    }

    if (document.activeElement !== textarea && textarea.value !== originalInput.value) {
      textarea.value = originalInput.value || textarea.value || '';
    }

    textarea.style.setProperty('width', 'calc(100% + 10px)', 'important');
    textarea.style.setProperty('max-width', 'calc(100% + 10px)', 'important');
    textarea.style.setProperty('height', '95px', 'important');
    textarea.style.setProperty('min-height', '95px', 'important');
    textarea.style.setProperty('box-sizing', 'border-box', 'important');
    textarea.style.setProperty('white-space', 'pre-wrap', 'important');
    textarea.style.setProperty('overflow-wrap', 'break-word', 'important');
    textarea.style.setProperty('word-break', 'break-word', 'important');
  }

  function tmCadHideOrigemPacientesSection(modal) {
    if (!modal) return;

    const labels = Array.from(modal.querySelectorAll('small')).filter((small) => {
      return ['ORIGEM DE PACIENTES', 'ORIGEM DO AGENDAMENTO'].includes(
        tmCadNorm(small.innerText || small.textContent || '').toUpperCase());
    });

    labels.forEach((label) => {
      const title = label.closest('.border-bottom.hover-title-bg');
      if (title && modal.contains(title)) title.classList.add('tm-cad-origem-title-hidden');

      const row = label.closest('.row');
      if (!row || !modal.contains(row)) return;

      const hasConfigModal =
        !!row.querySelector('[id^="formularioConfigModal-fixed-"]') ||
        !!row.querySelector('[id^="selecaoTextoModal"]') ||
        !!row.querySelector('[id^="trocarModeloModal"]') ||
        !!row.querySelector('[id^="anteriorModal-fixed-"]');

      if (!hasConfigModal) return;

      row.classList.add('tm-cad-origem-section-hidden');
      row.style.setProperty('display', 'none', 'important');
    });
  }

  function tmCadClearPrimeiraVezLayout(modal) {
    if (!modal || modal.id !== 'cadastroModal') return;
    const baseline = modalBaselines.get(modal);
    if (!baseline) return;

    modal.querySelectorAll('.tm-cad-header-emoji, .tm-cad-header-convenio-injetado, textarea.tm-cad-observacao-textarea')
      .forEach((node) => node.remove());

    const { origem, cpfInput, cpfRequired, cpfAriaRequired, emailInput, emailRequired } = baseline;
    if (origem?.element.isConnected && origem.parent.isConnected) {
      const next = origem.next?.parentNode === origem.parent ? origem.next : null;
      origem.parent.insertBefore(origem.element, next);
    }
    modal.querySelectorAll('.tm-cad-origem-inline-row').forEach((row) => row.remove());
    modal.querySelectorAll('.tm-cad-required-warning').forEach((warning) => warning.remove());
    delete modal.dataset.tmCadValidationAttempted;

    if (cpfInput?.isConnected) {
      cpfInput.required = cpfRequired;
      if (cpfAriaRequired === null) cpfInput.removeAttribute('aria-required');
      else cpfInput.setAttribute('aria-required', cpfAriaRequired);
      cpfInput.setCustomValidity('');
    }
    if (emailInput?.isConnected) emailInput.required = emailRequired;

    tmRestoreAttributes(baseline.attributes);
    tmRestoreHeaderContents(baseline.headers);
    modal.classList.remove('tm-primeira-vez-layout', 'tm-cad-multiple-headers');
    delete modal.dataset.tmNomeInitialFocusDone;
    delete modal.dataset.tmNomeInitialFocusLock;
    modal.querySelectorAll('[data-tm-header-date-normalized], [data-tm-observation-candidate-checked]')
      .forEach((element) => {
        delete element.dataset.tmHeaderDateNormalized;
        delete element.dataset.tmObservationCandidateChecked;
      });
    modalBaselines.delete(modal);
  }
  function tmCadApplyPrimeiraVezLayout() {
    const modal = tmCadVisibleModal();
    if (!modal) {
      tmCadClearPrimeiraVezLayout(document.querySelector('#cadastroModal'));
      return;
    }

    if (!tmCadIsPrimeiraVez(modal)) {
      tmCadClearPrimeiraVezLayout(modal);
      return;
    }

    if (!modalBaselines.has(modal)) {
      const origemField = tmCadFieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');
      const cpfInput = tmCadFieldByLabel(modal, 'CPF')?.querySelector('input');
      const emailInput = tmCadFieldByLabel(modal, 'e-mail')?.querySelector('input');
      modalBaselines.set(modal, {
        attributes: tmCaptureAttributes(modal),
        headers: tmCaptureHeaderContents(modal),
        cpfInput,
        cpfRequired: cpfInput?.required,
        cpfAriaRequired: cpfInput?.getAttribute('aria-required') ?? null,
        emailInput,
        emailRequired: emailInput?.required,
        origem: origemField ? {
          element: origemField,
          parent: origemField.parentNode,
          next: origemField.nextSibling
        } : null
      });
    }

    tmCadInjectStyle();
    modal.classList.add('tm-primeira-vez-layout');

    const nome = tmCadFieldByLabel(modal, 'Nome');
    const nascimento = tmCadFieldByLabel(modal, 'Data de Nascimento');
    const cpf = tmCadFieldByLabel(modal, 'CPF');

    const celular = tmCadFieldByLabel(modal, 'Celular');
    const email = tmCadFieldByLabel(modal, 'e-mail');
    const origem = tmCadFieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');

    const sexo = tmCadFieldByLabel(modal, 'Sexo');
    const carteira = tmCadFieldByLabel(modal, 'No. da Carteira do Plano');
    const validade = tmCadFieldByLabel(modal, 'Validade da Carteira');

    const telefone = tmCadFieldByLabel(modal, 'Telefone');
    const nomeSocial = tmCadFieldByLabel(modal, 'Nome Social');

    tmCadSetField(nome, 'tm-cad-col-4', 'tm-cad-order-nome');
    tmCadSetField(nascimento, 'tm-cad-col-4', 'tm-cad-order-nascimento');
    tmCadSetField(cpf, 'tm-cad-col-4', 'tm-cad-order-cpf');

    tmCadSetField(celular, 'tm-cad-col-4', 'tm-cad-order-celular');
    tmCadHidePhoneCountry(celular);
    tmCadSetField(email, 'tm-cad-col-4', 'tm-cad-order-email');
    tmCadSetField(sexo, 'tm-cad-col-4', 'tm-cad-order-sexo');

    tmCadSetField(carteira, 'tm-cad-col-4', 'tm-cad-order-carteira');
    tmCadSetField(validade, 'tm-cad-col-4', 'tm-cad-order-validade');
    tmCadSetField(origem, 'tm-cad-col-4', 'tm-cad-order-origem');
    origem?.classList.add('tm-cad-origem-col');

    tmCadPlaceOrigemInDados(modal, origem);

    tmCadHideField(telefone);
    tmCadHideField(nomeSocial);
    tmCadHideField(email);
    const cpfInput = cpf?.querySelector('input');
    if (cpfInput) {
      // A obrigatoriedade é verificada antes de confirmar; o HTML5 não deve
      // substituir o aviso padrão do Klingo pelo balão do navegador.
      cpfInput.required = false;
      cpfInput.setAttribute('aria-required', 'true');
    }
    const emailInput = email?.querySelector('input');
    if (emailInput) emailInput.required = false;
    tmCadRefreshRequiredWarnings(modal, modal.dataset.tmCadValidationAttempted === '1');
    tmCadLookupCpf(modal);

    tmCadApplyHeaderLayout(modal);
    tmCadMoveObservacaoSelect(modal);
    tmCadEnableObservacaoTextarea(modal);
    tmCadEnableDatePastes(modal);
    tmCadEnablePatientClipboardPaste(modal);
    tmCadApplyTabOrder(modal);
    tmCadFocusNomeOnce(modal);
    tmCadHideOrigemPacientesSection(modal);
  }

  document.addEventListener('shown.bs.modal', (event) => {
    if (event.target?.id === 'cadastroModal') {
      window.setTimeout(tmCadApplyPrimeiraVezLayout, 0);
      window.setTimeout(tmCadApplyPrimeiraVezLayout, 100);
    }
  }, true);

  document.addEventListener('hidden.bs.modal', (event) => {
    if (event.target?.id === 'cadastroModal') {
      tmCadClearPrimeiraVezLayout(event.target);
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (!window.location.hash.startsWith('#/call-center')) return;
    const button = event.target?.closest?.('button');
    const modal = button?.closest?.('#cadastroModal');
    if (modal && /^Confirmar$/i.test(tmCadNorm(button.textContent))) {
      tmCadValidateRequiredFields(modal, event);
    }
  }, true);

  document.addEventListener('submit', (event) => {
    if (!window.location.hash.startsWith('#/call-center')) return;
    const modal = event.target?.closest?.('#cadastroModal');
    if (modal && !/^Reservar$/i.test(tmCadNorm(event.submitter?.textContent))) {
      tmCadValidateRequiredFields(modal, event);
    }
  }, true);

  for (const name of ['input', 'change']) {
    document.addEventListener(name, (event) => {
      const modal = event.target?.closest?.('#cadastroModal.tm-primeira-vez-layout');
      if (!modal || modal.dataset.tmCadValidationAttempted !== '1' || !event.target.matches('input, select')) return;
      const field = event.target.closest('.tm-cad-order-nome, .tm-cad-order-nascimento, .tm-cad-order-cpf, .tm-cad-order-celular, .tm-cad-order-origem, .tm-cad-order-sexo');
      if (!field) return;
      tmCadRefreshRequiredWarnings(modal, true);
    }, true);
  }

  for (const name of ['input', 'change']) document.addEventListener(name, (event) => {
    const modal = event.target?.closest?.('#cadastroModal, #novoAtendimento2Modal, #editarMarcacaoModal');
    if (!modal || !modal.querySelector('#cadTemp')?.contains(event.target)) return;
    window.setTimeout(() => tmCadLookupCpf(modal), 0);
  }, true);

  document.addEventListener('shown.bs.modal', (event) => {
    if (!['novoAtendimento2Modal', 'editarMarcacaoModal'].includes(event.target?.id)) return;
    const modal = event.target;
    window.setTimeout(() => {
      const root = modal.querySelector('#cadTemp');
      if (!root) return;
      let observer = otherCpfObservers.get(modal);
      if (!observer) {
        observer = new MutationObserver(() => tmCadLookupCpf(modal));
        otherCpfObservers.set(modal, observer);
      }
      observer.observe(root, { childList: true, subtree: true });
      tmCadLookupCpf(modal);
    }, 0);
  }, true);

  document.addEventListener('hidden.bs.modal', (event) => {
    otherCpfObservers.get(event.target)?.disconnect();
    const state = cpfLookups.get(tmCadCadastroComponent(event.target));
    if (state) {
      state.generation += 1;
      state.pending = false;
      state.done = false;
      state.selectedCpf = '';
    }
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    const modal = button?.closest?.('#novoAtendimento2Modal, #editarMarcacaoModal');
    if (!modal || !/^(Concluir|Atualizar)$/i.test(tmCadNorm(button.textContent))) return;
    tmCadGuardCpfLookup(modal, event);
  }, true);

  // O observador roda na microtarefa em que o modal se torna visível, antes
  // de a fila geral (80 ms) ou o evento "shown" deixarem o layout original pintar.
  let observedCadastroModal = null;

  function applyPrimeiraVezBeforePaint() {
    const modal = observedCadastroModal;
    if (!modal?.isConnected || modal.classList.contains('tm-primeira-vez-layout') ||
        tmCadVisibleModal() !== modal || !tmCadIsPrimeiraVez(modal)) return;
    tmCadApplyPrimeiraVezLayout();
  }

  function observeCadastroModal(modal) {
    if (modal === observedCadastroModal) return;
    observedCadastroModal = modal;
    if (!modal) return;

    applyPrimeiraVezBeforePaint();
  }

  tmBookingModalWatch.subscribe((modal) => {
    if (modal !== observedCadastroModal) observeCadastroModal(modal);
    else applyPrimeiraVezBeforePaint();
  });

  tmRuntime.register('cadastro de primeira vez', tmCadApplyPrimeiraVezLayout, ['#/call-center']);
})();
