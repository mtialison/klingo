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
  let originRenderedField = null;
  let originRenderedOwner = null;
  const guardedBookings = new WeakSet();
  const bookingModals = new WeakMap();
  const validationAttempted = new WeakSet();
  const lastValidationToast = new WeakMap();
  const lastEnteredCpf = new WeakMap();

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

      #${MODAL_ID} .tm-recepcao-warning-host { position: relative !important; }
      #${MODAL_ID} .tm-recepcao-required-warning {
        position: absolute !important; z-index: 3; display: inline-flex;
        align-items: center; justify-content: center; width: 24px;
        color: #dc3545; background: #f8d7da; border-right: 1px solid #f5c6cb;
        border-radius: 3px 0 0 3px; font-weight: 700;
        pointer-events: none;
      }
      #${MODAL_ID} .tm-recepcao-warning-control { padding-left: 30px !important; }

      #${MODAL_ID} .tm-recepcao-birth-field .input-group {
        display: flex !important; flex-wrap: nowrap !important; align-items: stretch !important;
        width: 100% !important; min-width: 0 !important;
      }
      #${MODAL_ID} .tm-recepcao-birth-field .input-group > .form-control {
        flex: 1 1 auto !important; width: 0 !important; min-width: 0 !important;
      }
      #${MODAL_ID} .tm-recepcao-birth-field .input-group > .input-group-append {
        display: flex !important; flex: 0 0 auto !important;
      }
      #${MODAL_ID} .tm-recepcao-birth-field .input-group-text {
        font-family: "Open Sans", "Helvetica Neue", sans-serif !important;
        font-size: 13.125px !important; font-weight: 400 !important;
        color: #495057 !important; line-height: 1.2 !important;
      }
      #${MODAL_ID} .tm-recepcao-existing-identity-row .tm-recepcao-identity-name {
        flex: 0 0 50% !important; max-width: 50% !important;
      }
      #${MODAL_ID} .tm-recepcao-existing-identity-row .tm-recepcao-identity-birth,
      #${MODAL_ID} .tm-recepcao-existing-identity-row .tm-recepcao-identity-cpf {
        flex: 0 0 25% !important; max-width: 25% !important;
      }
      #${MODAL_ID} .tm-recepcao-existing-identity-row .form-control,
      #${MODAL_ID} .tm-recepcao-existing-identity-row .input-group-text {
        font-family: "Open Sans", "Helvetica Neue", sans-serif !important;
        font-size: .875rem !important;
        font-weight: 400 !important;
        line-height: 1.5 !important;
        color: #495057 !important;
        height: calc(1.5em + .5rem + 2px) !important;
        padding: .25rem .5rem !important;
        box-sizing: border-box !important;
      }
      #${MODAL_ID} .tm-recepcao-hidden-patient-card,
      #${MODAL_ID} .tm-recepcao-hidden-native-patient-row {
        display: none !important;
      }
      #${MODAL_ID} .tm-recepcao-perfil-append button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: .875rem !important;
        line-height: 1.5 !important;
        height: calc(1.5em + .5rem + 2px) !important;
        min-width: 36px !important;
        padding: 0 !important;
      }
      #${MODAL_ID} .tm-recepcao-perfil-append button i {
        display: block !important;
        margin: 0 !important;
        line-height: 1 !important;
      }

      @media (max-width: 767px) {
        #${MODAL_ID} .tm-recepcao-existing-identity-row > .col {
          flex: 0 0 100% !important; max-width: 100% !important;
        }
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

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-dados-row > .col:not(.tm-recepcao-hidden-field) {
          flex: 0 0 25% !important;
          max-width: 25% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-contato-row > .col:not(.tm-recepcao-hidden-field) {
          flex: 0 0 33.333333% !important;
          max-width: 33.333333% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-dados-row > .tm-recepcao-cpf-col {
          flex: 0 0 25% !important;
          max-width: 25% !important;
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

  function receptionOriginField(modal, contactRow) {
    const owner = receptionBookingComponent(modal);
    let field = fieldByLabel(modal, 'Origem do Agendamento');
    if (field) {
      originRenderedField = field;
      originRenderedOwner = owner;
      return field;
    }
    if (!owner || !contactRow) return null;
    const pending = [owner], seen = new Set();
    while (pending.length && seen.size < 200) {
      const child = pending.pop();
      if (!child || seen.has(child)) continue;
      seen.add(child);
      if (norm(child.label) === 'Origem do Agendamento') {
        const candidate = child.$el?.closest?.('.col');
        if (candidate?.querySelector('select')) {
          field = candidate;
          break;
        }
      }
      pending.push(...(child.$children || []));
    }
    if (!field && originRenderedOwner === owner && originRenderedField?.querySelector('select')) {
      field = originRenderedField;
    }
    if (!field) return null;
    if (field.parentElement !== contactRow) contactRow.appendChild(field);
    field.classList.remove('tm-recepcao-hidden-field');
    originRenderedField = field;
    originRenderedOwner = owner;
    return field;
  }

  function arrangeReceptionBookingFields(modal) {
    const email = fieldByLabel(modal, 'e-mail');
    const cellular = fieldByLabel(modal, 'Celular');
    const contactRow = cellular?.parentElement;
    const origin = receptionOriginField(modal, contactRow);
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

  function arrangeFirstTimeReceptionFields(modal) {
    const name = fieldByLabel(modal, 'Nome');
    const birth = fieldByLabel(modal, 'Data de Nascimento');
    const cpf = fieldByLabel(modal, 'CPF');
    const email = fieldByLabel(modal, 'e-mail');
    const cellular = fieldByLabel(modal, 'Celular');
    const sex = fieldByLabel(modal, 'Sexo');
    const origin = fieldByLabel(modal, 'Origem do Agendamento');
    const detailsRow = birth?.parentElement;
    const contactRow = email?.parentElement;
    if (![name, birth, cpf, email, cellular, sex].every(Boolean) ||
        !detailsRow?.classList.contains('form-row') ||
        !contactRow?.classList.contains('form-row') || detailsRow === contactRow) return;

    const placeAfter = (row, field, previous) => {
      if (field.parentElement !== row || field.previousElementSibling !== previous) {
        row.insertBefore(field, previous ? previous.nextElementSibling : row.firstElementChild);
      }
    };
    placeAfter(detailsRow, name, null);
    placeAfter(detailsRow, birth, name);
    placeAfter(detailsRow, cpf, birth);
    placeAfter(detailsRow, sex, cpf);
    placeAfter(contactRow, email, null);
    placeAfter(contactRow, cellular, email);
    if (origin) placeAfter(contactRow, origin, cellular);
    setClass(detailsRow, 'tm-recepcao-dados-row', true);
    setClass(contactRow, 'tm-recepcao-contato-row', true);
  }

  function patientIdentity(patient, keys) {
    for (const source of [patient, patient?.cadastro, patient?.pessoa]) {
      for (const key of keys) {
        const value = source?.[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
    }
    return '';
  }

  function patientBirth(patient) {
    const known = patientIdentity(patient, ['dt_nascimento', 'data_nascimento',
      'st_data_nascimento', 'st_nascimento', 'dt_data_nascimento', 'birth_date']);
    if (known) return known;
    for (const source of [patient, patient?.cadastro, patient?.pessoa]) {
      const entry = Object.entries(source || {}).find(([key, value]) =>
        /nasc|birth/i.test(key) && typeof value === 'string' && value.trim());
      if (entry) return entry[1].trim();
    }
    return '';
  }

  function displayBirth(value) {
    const iso = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const local = String(value || '').match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
    return local ? `${local[3]}-${local[2]}-${local[1]}` : '';
  }

  function displayCpf(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 11 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` : '';
  }

  function identityField(row, key, labelText) {
    let field = row.querySelector(`.tm-recepcao-identity-${key}`);
    if (field) return field;
    field = document.createElement('div');
    field.className = `col col-12 tm-recepcao-identity-${key}`;
    if (key === 'birth') field.classList.add('tm-recepcao-birth-field');
    const label = document.createElement('small');
    label.className = 'form-text text-muted';
    label.textContent = labelText;
    const group = document.createElement('div');
    group.className = 'input-group';
    const input = document.createElement('input');
    input.className = 'form form-control';
    input.type = key === 'birth' ? 'date' : 'text';
    input.readOnly = true;
    input.setAttribute('aria-readonly', 'true');
    group.appendChild(input);
    if (key === 'name') {
      const append = document.createElement('div');
      append.className = 'input-group-append tm-recepcao-perfil-append';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline-primary tm-recepcao-perfil-button';
      button.title = 'Abrir perfil do paciente';
      button.setAttribute('aria-label', 'Abrir perfil do paciente');
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-id-badge';
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
      append.appendChild(button);
      group.appendChild(append);
    }
    if (key === 'birth') {
      const append = document.createElement('div');
      append.className = 'input-group-append';
      const age = document.createElement('span');
      age.className = 'input-group-text tm-recepcao-identity-age';
      append.appendChild(age);
      group.appendChild(append);
    }
    field.append(label, group);
    row.appendChild(field);
    return field;
  }

  function showExistingIdentity(modal, contactRow) {
    const component = receptionBookingComponent(modal);
    const patient = component?.dados?.paciente;
    if (!contactRow || !(Number(patient?.id_pessoa) > 0)) {
      modal.querySelector('.tm-recepcao-existing-identity-row')?.remove();
      return;
    }
    let row = modal.querySelector('.tm-recepcao-existing-identity-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'form-row tm-recepcao-existing-identity-row';
    }
    if (row.parentElement !== contactRow.parentElement || row.nextElementSibling !== contactRow) {
      contactRow.parentElement.insertBefore(row, contactRow);
    }
    const name = identityField(row, 'name', 'Nome');
    const birth = identityField(row, 'birth', 'Data de Nascimento');
    const cpf = identityField(row, 'cpf', 'CPF');
    const values = [
      patientIdentity(patient, ['st_nome', 'nome', 'nm_pessoa', 'st_nome_paciente']),
      displayBirth(patientBirth(patient)),
      displayCpf(patientIdentity(patient, ['st_cpf', 'cpf']) || lastEnteredCpf.get(modal))
    ];
    [name, birth, cpf].forEach((field, index) => {
      const input = field.querySelector('input');
      if (input.value !== values[index]) input.value = values[index];
    });
    const value = values[1];
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const age = birth.querySelector('.tm-recepcao-identity-age');
    const ageDate = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
    const today = new Date();
    const years = ageDate && !Number.isNaN(ageDate.getTime()) ? today.getFullYear() - ageDate.getFullYear() -
      (today.getMonth() < ageDate.getMonth() ||
        (today.getMonth() === ageDate.getMonth() && today.getDate() < ageDate.getDate()) ? 1 : 0) : null;
    const text = years != null && years >= 0 && years < 130 ? `${years}a` : '';
    if (age.textContent !== text) age.textContent = text;
    age.parentElement.style.display = text ? '' : 'none';
  }

  function openReceptionPatientProfile(modal, event) {
    const button = event.target?.closest?.('button');
    if (!button || button.closest(`#${MODAL_ID}`) !== modal ||
        !(button.classList?.contains('tm-recepcao-perfil-button') ||
          (norm(button.title) === 'Histórico do paciente.' && button.querySelector('.fa-id-badge')))) return false;
    const component = receptionBookingComponent(modal);
    const patient = component?.dados?.paciente;
    if (!(Number(patient?.id_pessoa) > 0) || typeof component?.$root?.perfil !== 'function') return false;

    // O clique nativo fecha Novo Atendimento antes de abrir o perfil e perde o formulário.
    event.preventDefault();
    event.stopImmediatePropagation();
    // A ação raiz do Klingo apenas abre o perfil; não é necessário fechar o agendamento.
    component.$root.perfil(patient);
    return true;
  }

  function hideRedundantReceptionPatientControls(modal, existingPatient) {
    const nativeButton = modal.querySelector('button[title="Histórico do paciente."]');
    const nativeRow = nativeButton?.closest('.row.d-flex.justify-content-center.mb-2.w3-animate-opacity');
    if (nativeRow) setClass(nativeRow, 'tm-recepcao-hidden-native-patient-row', existingPatient);
    modal.querySelectorAll('.alert.alert-light.alert-dismissible.border').forEach((card) => {
      if (card.querySelector('a.card-link')) {
        setClass(card, 'tm-recepcao-hidden-patient-card', existingPatient);
      }
    });
  }

  function alignReceptionBirth(modal) {
    const name = fieldByLabel(modal, 'Nome')?.querySelector('input');
    const birth = fieldByLabel(modal, 'Data de Nascimento');
    const group = birth?.querySelector('.input-group');
    if (!name || !group) return;
    birth.classList.add('tm-recepcao-birth-field');
    const nameRect = name.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    if (!nameRect.height || !groupRect.height) return;
    const height = `${nameRect.height}px`;
    for (const element of [group, ...group.querySelectorAll('input, .input-group-append, .input-group-text')]) {
      if (element.style.getPropertyValue('height') !== height) {
        element.style.setProperty('height', height, 'important');
      }
    }
    const difference = nameRect.top - groupRect.top;
    if (Math.abs(difference) > 0.5) {
      const current = parseFloat(getComputedStyle(group).marginTop) || 0;
      const margin = `${Math.round((current + difference) * 100) / 100}px`;
      if (group.style.getPropertyValue('margin-top') !== margin) {
        group.style.setProperty('margin-top', margin, 'important');
      }
    }
  }

  function protectReceptionBirthDate(modal) {
    const input = fieldByLabel(modal, 'Data de Nascimento')?.querySelector('input[type="date"]');
    if (!input || input.dataset.tmReceptionBirthGuard === '1') return;
    input.dataset.tmReceptionBirthGuard = '1';
    input.addEventListener('paste', (event) => {
      const parsed = tmParseDateInput(event.clipboardData?.getData('text/plain') || '');
      if (!parsed) return;
      event.preventDefault();
      input.value = parsed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, true);
    let lastValue = input.value, yearDigits = 0, yearActive = false, replacement = '', writing = false;
    const parts = (value) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    const reset = () => { lastValue = input.value; yearDigits = 0; yearActive = false; replacement = ''; };
    input.addEventListener('pointerdown', reset, true);
    input.addEventListener('focus', reset, true);
    input.addEventListener('keydown', (event) => {
      if (/^(?:Arrow|Backspace|Delete|Tab|Home|End)/.test(event.key)) { reset(); return; }
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
      const before = parts(lastValue), after = parts(input.value);
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

  function requiredReceptionCpf(modal) {
    const input = fieldByLabel(modal, 'CPF')?.querySelector('input');
    if (input && !input.readOnly) {
      input.required = true;
      input.setAttribute('aria-required', 'true');
    }
    return input || null;
  }

  function optionalReceptionEmail(modal) {
    const input = fieldByLabel(modal, 'e-mail')?.querySelector('input') ||
      modal.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
    if (!input) return;
    input.required = false;
    input.removeAttribute('aria-required');
    if (!norm(input.value)) input.setCustomValidity?.('');
  }

  function receptionRequiredControls(modal) {
    const firstTime = !!fieldByLabel(modal, 'Nome Social');
    const fields = firstTime ? [
      ['Nome', 'input'], ['Data de Nascimento', 'input'], ['CPF', 'input'],
      ['Sexo', 'select'], ['Celular', 'input'], ['Origem do Agendamento', 'select']
    ] : [['CPF', 'input']];
    return fields.map(([name, selector]) => {
      const field = fieldByLabel(modal, name);
      const control = field?.querySelector(selector) || null;
      const value = norm(control?.value);
      const selectedText = norm(control?.selectedOptions?.[0]?.textContent);
      const missing = !control || !value ||
        (control.tagName === 'SELECT' && /^Selecione/i.test(selectedText));
      return { name, field, control, missing };
    }).filter((item) => firstTime || (item.control && !item.control.readOnly));
  }

  function setReceptionWarning(field, control, invalid) {
    if (!field || !control) return;
    const host = control.parentElement;
    if (!host) return;
    host.classList.add('tm-recepcao-warning-host');
    let warning = host.querySelector(':scope > .tm-recepcao-required-warning');
    if (!invalid) {
      warning?.remove();
      control.classList.remove('tm-recepcao-warning-control');
      return;
    }
    if (!warning) {
      warning = document.createElement('span');
      warning.className = 'tm-recepcao-required-warning';
      warning.textContent = '!';
      warning.setAttribute('aria-hidden', 'true');
      host.appendChild(warning);
    }
    const position = { top: `${control.offsetTop + 1}px`, left: `${control.offsetLeft + 1}px`,
      height: `${Math.max(0, control.offsetHeight - 2)}px` };
    for (const [key, value] of Object.entries(position)) {
      if (warning.style[key] !== value) warning.style[key] = value;
    }
    control.classList.add('tm-recepcao-warning-control');
  }

  function refreshReceptionWarnings(modal) {
    if (!validationAttempted.has(modal)) return;
    for (const { field, control, missing } of receptionRequiredControls(modal)) {
      setReceptionWarning(field, control, missing);
    }
  }

  function clearReceptionWarnings(modal) {
    validationAttempted.delete(modal);
    lastValidationToast.delete(modal);
    modal.querySelectorAll('.tm-recepcao-required-warning').forEach((warning) => warning.remove());
    modal.querySelectorAll('.tm-recepcao-warning-control').forEach((control) =>
      control.classList.remove('tm-recepcao-warning-control'));
  }

  function validateRequiredReceptionFields(modal, event) {
    optionalReceptionEmail(modal);
    requiredReceptionCpf(modal);
    validationAttempted.add(modal);
    const missing = receptionRequiredControls(modal).filter((item) => item.missing);
    refreshReceptionWarnings(modal);
    if (!missing.length) return true;

    event?.preventDefault();
    event?.stopImmediatePropagation();

    const component = receptionBookingComponent(modal);
    const message = missing.length === 1 ? `O campo ${missing[0].name} é obrigatório.` :
      'Verificar preenchimento dos campos obrigatórios.';
    if (Date.now() - (lastValidationToast.get(modal) || 0) > 1000) {
      component?.$toast?.add?.({ severity: 'error', summary: 'Atenção', detail: message, life: 5000 });
      lastValidationToast.set(modal, Date.now());
    }
    const first = missing.find(({ control }) => control)?.control;
    first?.focus();
    if (!component?.$toast?.add) {
      if (first?.setCustomValidity) {
        first.setCustomValidity(message);
        first.reportValidity();
        first.addEventListener('input', () => first.setCustomValidity(''), { once: true });
      } else {
        window.alert(message);
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
      originRenderedField = null;
      originRenderedOwner = null;
      lastEnteredCpf.delete(modal);
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
    if (!modal.classList.contains('show') && getComputedStyle(modal).display === 'none' &&
        validationAttempted.has(modal)) clearReceptionWarnings(modal);

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
    if (social) {
      const entered = cpf?.querySelector('input')?.value;
      if (String(entered || '').replace(/\D/g, '').length === 11) lastEnteredCpf.set(modal, entered);
      else lastEnteredCpf.delete(modal);
    }
    requiredReceptionCpf(modal);
    optionalReceptionEmail(modal);
    refreshReceptionWarnings(modal);
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
    hideRedundantReceptionPatientControls(modal,
      !firstTime && Number(receptionBookingComponent(modal)?.dados?.paciente?.id_pessoa) > 0);

    if (!firstTime) {
      if (modal.classList.contains('show') || getComputedStyle(modal).display !== 'none') {
        showExistingIdentity(modal, fieldByLabel(modal, 'Celular')?.parentElement);
        alignReceptionBirth(modal);
      } else {
        modal.querySelector('.tm-recepcao-existing-identity-row')?.remove();
      }
      modal.querySelectorAll('.tm-recepcao-hidden-field').forEach((field) =>
        setClass(field, 'tm-recepcao-hidden-field', field === phone));
      modal.querySelectorAll('.tm-recepcao-dados-row').forEach((row) =>
        setClass(row, 'tm-recepcao-dados-row', false));
      modal.querySelectorAll('.tm-recepcao-contato-row').forEach((row) =>
        setClass(row, 'tm-recepcao-contato-row', false));
      return;
    }

    modal.querySelector('.tm-recepcao-existing-identity-row')?.remove();

    for (const field of [social]) {
      if (!field) continue;
      setClass(field, 'tm-recepcao-hidden-field', true);
      if (field.parentElement?.classList.contains('form-row')) {
        setClass(field.parentElement, 'tm-recepcao-dados-row', true);
      }
    }
    arrangeFirstTimeReceptionFields(modal);
    alignReceptionBirth(modal);
    protectReceptionBirthDate(modal);
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
    if (modal && openReceptionPatientProfile(modal, event)) return;
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
      const modal = event.target?.closest?.(`#${MODAL_ID}`);
      if (modal) {
        if (event.target === fieldByLabel(modal, 'CPF')?.querySelector('input')) {
          if (String(event.target.value || '').replace(/\D/g, '').length === 11) {
            lastEnteredCpf.set(modal, event.target.value);
          } else {
            lastEnteredCpf.delete(modal);
          }
        }
        refreshReceptionWarnings(modal);
      }
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
