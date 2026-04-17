// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      2.36
// @description  envenenado
// @match        *://*.klingo.app/*
// @match        *://samec.klingo.app/*
// @updateURL    https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* =========================
     CONFIGURAÇÃO HEADER (FONTE)
  ========================= */
  const TM_HEADER_CONFIG = {
    titulo: '16px',
    linha: '12px',
    detalhes: '11px'
  };


  const state = {
    selectedDate: '',
    selectedWeekday: '',
    selectedTime: '',
  };

  const WEEKDAYS = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];

  function norm(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function toTitleCase(text) {
    const lowerWords = ['de', 'da', 'do', 'das', 'dos', 'e'];
    return norm(text)
      .toLowerCase()
      .split(' ')
      .map((word, i) =>
        i > 0 && lowerWords.includes(word)
          ? word
          : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(' ');
  }

  function monthNameFromNumber(mm) {
    const months = {
      '01': 'Janeiro',
      '02': 'Fevereiro',
      '03': 'Março',
      '04': 'Abril',
      '05': 'Maio',
      '06': 'Junho',
      '07': 'Julho',
      '08': 'Agosto',
      '09': 'Setembro',
      '10': 'Outubro',
      '11': 'Novembro',
      '12': 'Dezembro'
    };
    return months[mm] || mm;
  }

  function formatDatePtBr(ddmm) {
    const m = norm(ddmm).match(/^(\d{2})\/(\d{2})$/);
    if (!m) return norm(ddmm);
    const dd = String(parseInt(m[1], 10));
    const mm = m[2];
    return `${dd} de ${monthNameFromNumber(mm)}`;
  }

  function normalizeHour(text) {
    const t = norm(text);
    if (/^\d{1,2}h$/i.test(t)) {
      const hour = t.replace(/h/i, '');
      return `${String(parseInt(hour, 10)).padStart(2, '0')}h`;
    }
    if (/^\d{1,2}:\d{2}$/.test(t)) return t;
    return t;
  }

  function isTimeButton(el) {
    if (!el) return false;
    const text = norm(el.textContent);
    return /^\d{1,2}h$/i.test(text) || /^\d{1,2}:\d{2}$/.test(text);
  }

  function findRowContainer(el) {
    let current = el;
    while (current && current !== document.body) {
      const text = norm(current.innerText || current.textContent || '');
      const hasDate = /\b\d{2}\/\d{2}\b/.test(text);
      const hasWeekday = WEEKDAYS.some(day => text.includes(day));
      if (hasDate && hasWeekday) return current;
      current = current.parentElement;
    }
    return null;
  }

  function captureSelectionFromClick(target, allowModalTime = false) {
    const insideModal = !!target.closest('#minutoModal');

    if (insideModal && !allowModalTime) return false;

    const btn = target.closest('button, a, div, span');
    if (!btn || !isTimeButton(btn)) return false;

    const time = normalizeHour(btn.textContent);

    if (insideModal && allowModalTime) {
      state.selectedTime = time;
      return true;
    }

    const row = findRowContainer(btn);
    if (!row) return false;

    const rowText = norm(row.innerText || row.textContent || '');
    const dateMatch = rowText.match(/\b\d{2}\/\d{2}\b/);
    const weekday = WEEKDAYS.find(day => rowText.includes(day)) || '';

    if (!dateMatch || !weekday) return false;

    state.selectedDate = formatDatePtBr(dateMatch[0]);
    state.selectedWeekday = weekday;
    state.selectedTime = time;
    return true;
  }

  function getDoctorNameFromModal() {
    const doctorEl = document.querySelector('#minutoModal .col.col-12.col-md-6 > div:first-child');
    if (!doctorEl) return '';

    const text = norm(doctorEl.textContent);
    if (!text) return '';

    return toTitleCase(text);
  }

  function getSubtitleHtml(titleEl) {
    const subtitleEl = titleEl.querySelector('.small.text-muted');
    return subtitleEl ? subtitleEl.outerHTML : '';
  }

  function buildTitleHtml(doctorName) {
    if (!state.selectedDate || !state.selectedWeekday || !state.selectedTime || !doctorName) {
      return '';
    }

    const line1 = `👨‍⚕️ ${doctorName}`;
    const line2 = `${state.selectedDate} | ${state.selectedWeekday} | ${state.selectedTime}`;

    return `
      <span class="tm-main-title" style="display:block; line-height:1.35;">
        <span class="tm-doctor-line" style="display:block;">${line1}</span>
        <span class="tm-date-line" style="display:block;">${line2}</span>
      </span>
    `;
  }

  function getCopyText() {
    const doctorName = getDoctorNameFromModal();
    if (!doctorName || !state.selectedDate || !state.selectedWeekday || !state.selectedTime) {
      return '';
    }

    return `👨‍⚕️ ${doctorName}\n${state.selectedDate} | ${state.selectedWeekday} | ${state.selectedTime}`;
  }

  function showCopyFeedback(targetEl, message = 'Copiado') {
    if (!targetEl) return;

    const oldTip = document.querySelector('#tm-copy-bubble');
    if (oldTip) oldTip.remove();

    const bubble = document.createElement('div');
    bubble.id = 'tm-copy-bubble';
    bubble.textContent = message;

    bubble.style.position = 'fixed';
    bubble.style.zIndex = '999999';
    bubble.style.background = '#fff';
    bubble.style.color = '#222';
    bubble.style.border = '1px solid #111';
    bubble.style.borderRadius = '10px';
    bubble.style.padding = '8px 14px';
    bubble.style.fontSize = '14px';
    bubble.style.fontWeight = '600';
    bubble.style.boxShadow = '0 4px 10px rgba(0,0,0,0.12)';
    bubble.style.pointerEvents = 'none';
    bubble.style.opacity = '0';
    bubble.style.transition = 'opacity 0.15s ease';

    document.body.appendChild(bubble);

    const rect = targetEl.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    const top = rect.top - bubbleRect.height - 10;
    const left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);

    bubble.style.top = `${Math.max(8, top)}px`;
    bubble.style.left = `${Math.max(8, left)}px`;

    const arrow = document.createElement('div');
    arrow.style.position = 'absolute';
    arrow.style.left = '50%';
    arrow.style.bottom = '-7px';
    arrow.style.width = '12px';
    arrow.style.height = '12px';
    arrow.style.background = '#fff';
    arrow.style.borderRight = '1px solid #111';
    arrow.style.borderBottom = '1px solid #111';
    arrow.style.transform = 'translateX(-50%) rotate(45deg)';
    bubble.appendChild(arrow);

    requestAnimationFrame(() => {
      bubble.style.opacity = '1';
    });

    clearTimeout(bubble._hideTimer);
    bubble._hideTimer = setTimeout(() => {
      bubble.style.opacity = '0';
      setTimeout(() => bubble.remove(), 180);
    }, 1000);
  }

  async function copyText(text, targetEl) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      showCopyFeedback(targetEl, 'Copiado');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showCopyFeedback(targetEl, 'Copiado');
    }
  }

  function updateModalTitle() {
    const modal = document.querySelector('#minutoModal');
    const titleEl = document.querySelector('#minutoModal h5.modal-title');

    if (!modal || !titleEl) return;

    const doctorName = getDoctorNameFromModal();
    const titleHtml = buildTitleHtml(doctorName);

    if (!titleHtml) return;

    const subtitleHtml = getSubtitleHtml(titleEl);
    const currentMain = titleEl.querySelector('.tm-main-title');
    const expectedText = `👨‍⚕️ ${doctorName} ${state.selectedDate} | ${state.selectedWeekday} | ${state.selectedTime}`;

    if (currentMain && norm(currentMain.textContent) === norm(expectedText)) return;

    titleEl.innerHTML = `${titleHtml}${subtitleHtml}`;
  }

  function applyLoginIndicator() {
    const passwordInput = document.querySelector('input[type="password"]');
    if (!passwordInput) return;

    if (document.body.dataset.tmLoginStyled === '1') return;
    document.body.dataset.tmLoginStyled = '1';

    document.body.style.backgroundColor = '#a98787';

    const btnEntrar =
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]') ||
      [...document.querySelectorAll('button')].find(btn => /entrar/i.test((btn.textContent || '').trim()));

    if (btnEntrar) {
      btnEntrar.style.backgroundColor = '#8b0000';
      btnEntrar.style.color = '#fff';
      btnEntrar.style.border = 'none';
    }

    const logo = document.querySelector('img');
    if (logo) {
      logo.src = 'https://i.imgur.com/bY57pai.png';
      logo.style.maxWidth = '180px';
      logo.style.display = 'block';
      logo.style.margin = '0 auto';
    }
  }

  function parsePastedBirthDate(text) {
    const raw = norm(text);
    if (!raw) return '';

    const onlyDigits = raw.replace(/\D/g, '');

    if (onlyDigits.length === 8) {
      const dd = onlyDigits.slice(0, 2);
      const mm = onlyDigits.slice(2, 4);
      const yyyy = onlyDigits.slice(4, 8);

      if (isValidDate(dd, mm, yyyy)) {
        return `${yyyy}-${mm}-${dd}`;
      }

      const yyyy2 = onlyDigits.slice(0, 4);
      const mm2 = onlyDigits.slice(4, 6);
      const dd2 = onlyDigits.slice(6, 8);

      if (isValidDate(dd2, mm2, yyyy2)) {
        return `${yyyy2}-${mm2}-${dd2}`;
      }
    }

    let m = raw.match(/^(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})$/);
    if (m && isValidDate(m[1], m[2], m[3])) {
      return `${m[3]}-${m[2]}-${m[1]}`;
    }

    m = raw.match(/^(\d{4})[\/.\-](\d{2})[\/.\-](\d{2})$/);
    if (m && isValidDate(m[3], m[2], m[1])) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }

    return '';
  }

  function isValidDate(dd, mm, yyyy) {
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);

    if (!day || !month || !year) return false;
    if (year < 1900 || year > 2100) return false;

    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function setNativeInputValue(el, value) {
    const prototype = Object.getPrototypeOf(el);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    const setter = descriptor && descriptor.set;

    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
  }

  function dispatchEvents(el, names) {
    names.forEach((name) => {
      const ev = new Event(name, { bubbles: true });
      el.dispatchEvent(ev);
    });
  }

  function dispatchBirthDateEvents(el) {
    dispatchEvents(el, ['input', 'change', 'blur']);
  }

  function isBirthDateInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.type !== 'date') return false;
    if (input.name !== 'teste') return false;
    return !!input.closest('.input-group.input-group-sm');
  }

  function handleBirthDatePaste(event) {
    const input = event.target;
    if (!isBirthDateInput(input)) return;

    const pasted = event.clipboardData ? event.clipboardData.getData('text') : '';
    const normalized = parsePastedBirthDate(pasted);
    if (!normalized) return;

    event.preventDefault();
    event.stopPropagation();

    setNativeInputValue(input, normalized);
    dispatchBirthDateEvents(input);
  }

  function enableBirthDatePaste() {
    const inputs = document.querySelectorAll('input[type="date"][name="teste"]');

    inputs.forEach((input) => {
      if (!isBirthDateInput(input)) return;
      if (input.dataset.tmBirthPasteEnabled === '1') return;

      input.dataset.tmBirthPasteEnabled = '1';
      input.addEventListener('paste', handleBirthDatePaste, true);
    });
  }

  /* =========================
     OCULTAR ELEMENTOS (CSS)
  ========================= */
  function injectLayoutCSS() {
    if (document.getElementById('tm-klingo-layout-style')) return;

    const style = document.createElement('style');
    style.id = 'tm-klingo-layout-style';
    style.textContent = `
      .tm-hidden-by-script {
        display: none !important;
      }

      .tm-layout-host {
        margin-top: 8px;
        margin-bottom: 8px;
      }

      .tm-top-layout {
        display: grid;
        grid-template-columns: 509px;
        gap: 18px;
        align-items: start;
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-left-panel {
        min-width: 0;
        width: 509px !important;
        max-width: 509px !important;
      }

      .tm-grid-row {
        display: grid;
        gap: 10px 12px;
        margin-bottom: 10px;
        align-items: end;
      }

      .tm-row-name-birth {
        grid-template-columns: 342px 155px;
      }

      .tm-row-cpf-sexo-origem {
        grid-template-columns: 155px 175px 155px;
      }

      .tm-row-cel-email {
        grid-template-columns: 155px 342px;
      }

      .tm-row-carteira-validade {
        grid-template-columns: 342px 155px;
      }

      .tm-field-slot,
      .tm-field-slot > .col,
      .tm-field-slot > .form-group,
      .tm-field-slot > [class*="col-"] {
        min-width: 0;
      }

      .tm-field-slot > .col,
      .tm-field-slot > [class*="col-"] {
        flex: unset !important;
        max-width: none !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      .tm-field-slot .form-group {
        margin-bottom: 0 !important;
      }

      .tm-field-slot .input-group,
      .tm-field-slot .form-control,
      .tm-field-slot select,
      .tm-field-slot input,
      .tm-field-slot textarea {
        width: 100% !important;
      }

      .tm-cell-input-group .input-group-prepend,
      .tm-cell-input-group .dropdown {
        display: none !important;
      }

      .tm-cell-input-group .form-control {
        border-top-left-radius: .25rem !important;
        border-bottom-left-radius: .25rem !important;
      }

      .tm-observation-layout {
        display: grid;
        grid-template-columns: 509px;
        gap: 12px;
        align-items: start;
        margin-top: 6px;
        margin-bottom: 10px;
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-observation-layout .tm-field-slot > .col,
      .tm-observation-layout .tm-field-slot > [class*="col-"] {
        width: 100% !important;
      }

      .tm-observation-textarea {
        min-height: 68px !important;
        height: 68px !important;
        padding: 8px 10px !important;
        line-height: 1.35 !important;
        resize: none !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
        white-space: pre-wrap !important;
        overflow-y: auto !important;
        vertical-align: top !important;
      }

      .tm-observation-layout .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      .tm-observation-layout .input-group-prepend {
        display: flex !important;
        margin-right: 0 !important;
        flex: 0 0 auto !important;
      }

      .tm-observation-layout .input-group-text {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 44px !important;
        min-width: 38px !important;
        border-top-right-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
      }

      .tm-observation-layout select.form-control {
        height: 44px !important;
        max-width: 188px !important;
        width: 188px !important;
        border-top-left-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
      }

      .tm-klingo-root .form-row.tm-hidden-original-row,
      .tm-klingo-root .row.tm-hidden-original-row,
      .tm-klingo-root .tm-hidden-original-row {
        display: none !important;
      }

      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success {
        max-width: 509px !important;
        width: 509px !important;
        background: #d5edff !important;
        color: #003358 !important;
        border-color: #b7d9ee !important;
        padding: 12px 14px !important;
      }

      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group {
        max-width: 509px !important;
      }

      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success,
      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success label,
      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success .h4,
      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success .lead,
      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success small,
      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success span,
      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success i {
        color: #003358 !important;
      }

      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success .badge.badge-light {
        background: #ffffff !important;
        color: #003358 !important;
      }

      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success .text-muted,
      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success small.text-muted {
        color: #4d7088 !important;
      }

      .tm-klingo-root > .modal-body > div:first-child > div:first-child > .list-group > .list-group-item.list-group-item-success i.fa-exclamation-triangle.text-warning {
        color: #f4b400 !important;
      }

      
      /* OCULTAR CONSULTÓRIO AO LADO DA UNIDADE (HEADER) */
      /* =========================
         HEADER - TAMANHO CONFIGURÁVEL
      ========================= */

      .tm-klingo-root .list-group-item.list-group-item-success .h4 {
        font-size: ${TM_HEADER_CONFIG.titulo} !important;
      }

      .tm-klingo-root .list-group-item.list-group-item-success .lead {
        font-size: ${TM_HEADER_CONFIG.linha} !important;
      }

      .tm-klingo-root .list-group-item.list-group-item-success small {
        font-size: ${TM_HEADER_CONFIG.detalhes} !important;
      }

      .tm-klingo-root .list-group-item.list-group-item-success small.text-muted {
        display: none !important;
      }

.tm-klingo-root .tm-procedure-title {
        display: block !important;
        margin-bottom: 8px !important;
        font-size: 20px !important;
        line-height: 1.25 !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
      }

      .tm-klingo-root .tm-header-line {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px 10px !important;
        margin-bottom: 6px !important;
        line-height: 1.3 !important;
      }

      .tm-klingo-root .tm-header-line > * {
        display: inline-flex !important;
        align-items: center !important;
        min-width: 0 !important;
      }

      .tm-klingo-root .tm-header-line small,
      .tm-klingo-root .tm-header-line .lead {
        margin-bottom: 0 !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
      }

      .tm-klingo-root .tm-header-infos {
        margin-top: 6px !important;
      }

      .tm-klingo-root .tm-header-infos footer {
        display: -webkit-box !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 3 !important;
        line-clamp: 3 !important;
        font-size: 12px !important;
        line-height: 1.35 !important;
        white-space: pre-wrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
        margin: 0 !important;
        max-height: calc(1.35em * 3) !important;
        transition: max-height 0.15s ease !important;
        cursor: default !important;
      }

      .tm-klingo-root .tm-header-infos:hover footer {
        display: block !important;
        -webkit-line-clamp: unset !important;
        line-clamp: unset !important;
        overflow: visible !important;
        text-overflow: clip !important;
        max-height: 1000px !important;
      }

      .tm-klingo-root [data-slot="validade"] {
        margin-top: 0 !important;
      }

      .tm-klingo-root [data-slot="validade"] .form-control {
        max-width: 155px !important;
        width: 155px !important;
      }

      .tm-klingo-root [data-slot="observacao-select"] {
        max-width: 226px !important;
        width: 226px !important;
      }

      .tm-klingo-root [data-slot="observacao-select"] .form-group {
        width: 226px !important;
      }

      /* AJUSTE: largura do campo "Adicionar procedimento" igual ao header */
      .tm-klingo-root .autocomplete,
      .tm-klingo-root .autocomplete .input-group,
      .tm-klingo-root input.az-autocomplete {
        width: 509px !important;
        max-width: 509px !important;
      }

      .tm-klingo-root input[placeholder="Adicionar procedimento..."] {
        max-width: 1046px !important;
        width: 1046px !important;
      }


      .tm-klingo-root {
        width: 680px !important;
        max-width: 680px !important;
        overflow: hidden !important;
      }

      .tm-klingo-root .modal-body {
        padding-left: 0 !important;
        padding-right: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }

      .tm-klingo-root .modal-body > div,
      .tm-klingo-root .mt-3,
      .tm-klingo-root .tab-content,
      .tm-klingo-root .tab-pane,
      .tm-klingo-root #myTab,
      .tm-klingo-root #cadTemp,
      .tm-klingo-root #tm-top-layout-host,
      .tm-klingo-root hr,
      .tm-klingo-root .modal-footer {
        width: 540px !important;
        max-width: 540px !important;
        box-sizing: border-box !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-klingo-root #tm-observation-layout-host,
      .tm-klingo-root #myTab,
      .tm-klingo-root .tab-content,
      .tm-klingo-root .tab-pane,
      .tm-klingo-root .modal-footer,
      .tm-klingo-root .tab-pane .mt-3,
      .tm-klingo-root .tab-pane .form-group.mb-1 {
        width: 509px !important;
        max-width: 509px !important;
        box-sizing: border-box !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-klingo-root .tab-pane .autocomplete,
      .tm-klingo-root .tab-pane .autocomplete .input-group,
      .tm-klingo-root .tab-pane input.az-autocomplete {
        width: 509px !important;
        max-width: 509px !important;
      }

      .tm-klingo-root .tab-pane hr {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-klingo-root .modal-footer {
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-klingo-root .list-group,
      .tm-klingo-root .list-group-item.list-group-item-success {
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-klingo-root .modal-footer {
        justify-content: flex-start !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }


      .tm-klingo-root .modal-body > *,
      .tm-klingo-root #cadTemp,
      .tm-klingo-root #tm-top-layout-host,
      .tm-klingo-root #tm-observation-layout-host,
      .tm-klingo-root .border-bottom,
      .tm-klingo-root .nav-tabs,
      .tm-klingo-root .tab-content,
      .tm-klingo-root .tab-pane,
      .tm-klingo-root hr,
      .tm-klingo-root .modal-footer {
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-klingo-root #cadTemp,
      .tm-klingo-root #tm-top-layout-host,
      .tm-klingo-root #tm-observation-layout-host,
      .tm-klingo-root .border-bottom,
      .tm-klingo-root .nav-tabs,
      .tm-klingo-root .tab-content,
      .tm-klingo-root .tab-pane,
      .tm-klingo-root hr {
        width: 568px !important;
        max-width: 568px !important;
      }


      /* AJUSTE TÍTULOS (Dados Pessoais / Observação) */
      .tm-klingo-root .border-bottom.mb-1.d-flex.justify-content-between.hover-title-bg.text-primary,
      .tm-klingo-root .border-bottom.mb-1.d-flex.justify-content-between.hover-title-bg.mt-1.text-primary {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        box-sizing: border-box !important;
      }

      @media (max-width: 1200px) {
        .tm-top-layout,
        .tm-observation-layout {
          grid-template-columns: 1fr;
        }

        .tm-row-name-birth,
        .tm-row-cpf-sexo-origem,
        .tm-row-cel-email,
        .tm-row-carteira-validade {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function hideElement(el) {
    if (!el) return;
    el.dataset.tmHiddenByScript = '1';
    el.classList.add('tm-hidden-by-script');
    el.style.setProperty('display', 'none', 'important');
  }

  function hideOriginalRow(el) {
    if (!el) return;
    el.classList.add('tm-hidden-original-row');
    el.style.setProperty('display', 'none', 'important');
  }

  function getSchedulingModalRoot() {
    const modalContents = document.querySelectorAll('.modal-content');

    for (const modal of modalContents) {
      const text = norm(modal.innerText || modal.textContent || '');
      if (!text) continue;

      const hasDadosPessoais = text.includes('Dados Pessoais');
      const hasOrigemPacientes = text.includes('ORIGEM DE PACIENTES') || text.includes('Origem de Pacientes');
      const hasConfirmar = text.includes('Confirmar');

      if (hasDadosPessoais && hasOrigemPacientes && hasConfirmar) {
        modal.classList.add('tm-klingo-root');
        return modal;
      }
    }

    return null;
  }

  function findTextSmall(root, labelText) {
    const smalls = root.querySelectorAll('small');
    for (const small of smalls) {
      if (norm(small.textContent) === labelText) return small;
    }
    return null;
  }

  function findColByLabel(root, labelText) {
    const label = findTextSmall(root, labelText);
    if (!label) return null;

    return (
      label.closest('.col') ||
      label.closest('[class*="col-"]') ||
      label.closest('.form-group') ||
      label.parentElement
    );
  }

  function getCadTemp(root) {
    return root.querySelector('#cadTemp');
  }

  function getCadTempTitleRow(root) {
    const cadTemp = getCadTemp(root);
    if (!cadTemp) return null;

    const title = findTextSmall(cadTemp, 'Dados Pessoais');
    return title ? title.closest('.border-bottom') : null;
  }

  function getObservationTitleRow(root) {
    const title = findTextSmall(root, 'Observação');
    return title ? title.closest('.border-bottom') : null;
  }

  function getObservationFieldsRow(root) {
    const titleRow = getObservationTitleRow(root);
    if (!titleRow) return null;

    let current = titleRow.nextElementSibling;
    while (current) {
      if (current.classList && current.classList.contains('form-row')) return current;
      current = current.nextElementSibling;
    }
    return null;
  }

  function getOriginTitleRow(root) {
    const title = findTextSmall(root, 'ORIGEM DE PACIENTES');
    return title ? title.closest('.border-bottom') : null;
  }

  function findOriginFieldBlock(root) {
    return findColByLabel(root, 'Origem de Pacientes');
  }

  function findMaterialBlock(root) {
    const input = root.querySelector('input[placeholder="Incluir material, medicamento ou taxa..."]');
    if (!input) return null;

    return (
      input.closest('.form-group.mb-3.mb-1') ||
      input.closest('.form-group') ||
      input.closest('.autocomplete') ||
      input.closest('.input-group') ||
      input.parentElement
    );
  }

  function ensureHost(parent, id, className) {
    let host = parent.querySelector('#' + id);
    if (!host) {
      host = document.createElement('div');
      host.id = id;
      host.className = className;
      parent.appendChild(host);
    }
    return host;
  }

  function moveToSlot(slot, block) {
    if (!slot || !block) return;
    slot.innerHTML = '';
    slot.appendChild(block);
  }

  function ensureObservationTextarea(block) {
    if (!block) return;

    const input = block.querySelector('input.form-control[type="text"]');
    if (!input) return;

    let textarea = block.querySelector('textarea.tm-observation-textarea');
    if (!textarea) {
      textarea = document.createElement('textarea');
      textarea.className = `${input.className} tm-observation-textarea`;
      textarea.placeholder = input.placeholder || '';
      textarea.autocomplete = input.autocomplete || 'off';
      textarea.value = input.value || '';
      textarea.rows = 4;
      input.insertAdjacentElement('afterend', textarea);
      input.classList.add('tm-hidden-by-script');
      input.style.setProperty('display', 'none', 'important');

      const syncToInput = () => {
        setNativeInputValue(input, textarea.value);
        dispatchEvents(input, ['input', 'change']);
      };

      textarea.addEventListener('input', syncToInput, true);
      textarea.addEventListener('change', syncToInput, true);
      textarea.addEventListener('blur', () => {
        syncToInput();
        dispatchEvents(input, ['blur']);
      }, true);
    }

    if (textarea.value !== (input.value || '')) {
      textarea.value = input.value || '';
    }
  }

  function hideCellCountryButton(celularBlock) {
    if (!celularBlock) return;
    const inputGroup = celularBlock.querySelector('.input-group');
    if (!inputGroup) return;
    inputGroup.classList.add('tm-cell-input-group');

    const prepend = inputGroup.querySelector('.input-group-prepend');
    if (prepend) {
      prepend.classList.add('tm-hidden-by-script');
      prepend.style.setProperty('display', 'none', 'important');
    }
  }


  function ensureHeaderLine(label, className, beforeNode = null) {
    let line = label.querySelector(`.${className}`);
    if (!line) {
      line = document.createElement('div');
      line.className = className;
    } else {
      line.innerHTML = '';
    }

    if (beforeNode) {
      label.insertBefore(line, beforeNode);
    } else if (!line.parentElement) {
      label.appendChild(line);
    }

    if (!line.parentElement) {
      label.appendChild(line);
    }

    return line;
  }

  function reorganizeHeaderStructure(root) {
    const headerItem = root.querySelector('.list-group > .list-group-item.list-group-item-success');
    if (!headerItem) return;

    const label = headerItem.querySelector('label.mb-0.w-100');
    if (!label) return;

    const titleDiv = label.querySelector('.h4.mb-1');
    const metaRow = label.querySelector('.d-flex.justify-content-between');
    const infosWrap = label.querySelector('blockquote') ? label.querySelector('blockquote').closest('div') : null;

    if (!titleDiv || !metaRow) return;

    titleDiv.classList.add('tm-procedure-title');

    const leftMeta = metaRow.children[0] || null;
    const rightMeta = metaRow.children[1] || null;
    if (!leftMeta || !rightMeta) return;

    const spans = leftMeta.querySelectorAll(':scope > span');
    const paymentNode = spans[0] || null;
    const doctorNode = spans[1] || null;
    const unitNode = spans[2] || null;

    const dateNode = rightMeta.querySelector('small:not(.mx-2)') || rightMeta.children[0] || null;
    const timeNode = rightMeta.querySelector('small.mx-2') || rightMeta.children[1] || null;

    const line2 = ensureHeaderLine(label, 'tm-header-line-2 tm-header-line', infosWrap || null);
    const line3 = ensureHeaderLine(label, 'tm-header-line-3 tm-header-line', infosWrap || null);

    if (paymentNode) line2.appendChild(paymentNode);
    if (doctorNode) line2.appendChild(doctorNode);

    if (unitNode) line3.appendChild(unitNode);
    if (dateNode) line3.appendChild(dateNode);
    if (timeNode) line3.appendChild(timeNode);

    metaRow.remove();

    if (infosWrap) {
      infosWrap.classList.add('tm-header-infos');
      label.appendChild(infosWrap);
    }
  }


  function resizeSchedulingModal() {
    const root = getSchedulingModalRoot();
    if (!root) return;

    const dialog = root.closest('.modal-dialog');
    if (!dialog) return;

    const MODAL_W = '580px';
    const CONTENT_W = '540px';

    dialog.style.setProperty('width', MODAL_W, 'important');
    dialog.style.setProperty('max-width', MODAL_W, 'important');
    dialog.style.setProperty('min-width', MODAL_W, 'important');
    dialog.style.setProperty('margin-left', 'auto', 'important');
    dialog.style.setProperty('margin-right', 'auto', 'important');

    root.style.setProperty('width', MODAL_W, 'important');
    root.style.setProperty('max-width', MODAL_W, 'important');
    root.style.setProperty('min-width', MODAL_W, 'important');
    root.style.setProperty('overflow', 'hidden', 'important');

    const body = root.querySelector('.modal-body');
    if (body) {
      body.style.setProperty('padding-left', '0', 'important');
      body.style.setProperty('padding-right', '0', 'important');
      body.style.setProperty('overflow-x', 'hidden', 'important');
      body.style.setProperty('overflow-y', 'auto', 'important');
      body.style.setProperty('display', 'flex', 'important');
      body.style.setProperty('flex-direction', 'column', 'important');
      body.style.setProperty('align-items', 'center', 'important');
    }

    const selectors = [
      '.modal-body > div',
      '.modal-body .mt-3',
      '.modal-body #cadTemp',
      '.modal-body #tm-top-layout-host',
      '.modal-body #tm-observation-layout-host',
      '.modal-body #myTab',
      '.modal-body .tab-content',
      '.modal-body .tab-pane',
      '.modal-body hr',
      '.modal-footer'
    ];

    selectors.forEach((selector) => {
      root.querySelectorAll(selector).forEach((el) => {
        el.style.setProperty('width', CONTENT_W, 'important');
        el.style.setProperty('max-width', CONTENT_W, 'important');
        el.style.setProperty('margin-left', 'auto', 'important');
        el.style.setProperty('margin-right', 'auto', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');
      });
    });

    const topLayout = root.querySelector('.tm-top-layout');
    if (topLayout) {
      topLayout.style.setProperty('width', '509px', 'important');
      topLayout.style.setProperty('max-width', '509px', 'important');
      topLayout.style.setProperty('margin-left', 'auto', 'important');
      topLayout.style.setProperty('margin-right', 'auto', 'important');
    }

    const observationHost = root.querySelector('#tm-observation-layout-host');
    if (observationHost) {
      observationHost.style.setProperty('width', '509px', 'important');
      observationHost.style.setProperty('max-width', '509px', 'important');
      observationHost.style.setProperty('margin-left', 'auto', 'important');
      observationHost.style.setProperty('margin-right', 'auto', 'important');
    }

    const tabNav = root.querySelector('#myTab');
    if (tabNav) {
      tabNav.style.setProperty('width', '509px', 'important');
      tabNav.style.setProperty('max-width', '509px', 'important');
      tabNav.style.setProperty('margin-left', 'auto', 'important');
      tabNav.style.setProperty('margin-right', 'auto', 'important');
    }

    const tabContent = root.querySelector('.tab-content');
    if (tabContent) {
      tabContent.style.setProperty('width', '509px', 'important');
      tabContent.style.setProperty('max-width', '509px', 'important');
      tabContent.style.setProperty('margin-left', 'auto', 'important');
      tabContent.style.setProperty('margin-right', 'auto', 'important');
    }

    root.querySelectorAll('.tab-pane, .tab-pane .mt-3, .tab-pane .form-group.mb-1').forEach((el) => {
      el.style.setProperty('width', '509px', 'important');
      el.style.setProperty('max-width', '509px', 'important');
      el.style.setProperty('margin-left', 'auto', 'important');
      el.style.setProperty('margin-right', 'auto', 'important');
      el.style.setProperty('box-sizing', 'border-box', 'important');
    });

    root.querySelectorAll('.tab-pane .autocomplete, .tab-pane .autocomplete .input-group, .tab-pane input.az-autocomplete, .tab-pane hr').forEach((el) => {
      el.style.setProperty('width', '509px', 'important');
      el.style.setProperty('max-width', '509px', 'important');
      el.style.setProperty('margin-left', 'auto', 'important');
      el.style.setProperty('margin-right', 'auto', 'important');
    });

    const leftPanel = root.querySelector('.tm-left-panel');
    if (leftPanel) {
      leftPanel.style.setProperty('width', '509px', 'important');
      leftPanel.style.setProperty('max-width', '509px', 'important');
    }

    root.querySelectorAll('.border-bottom.mb-1.d-flex.justify-content-between.hover-title-bg.text-primary, .border-bottom.mb-1.d-flex.justify-content-between.hover-title-bg.mt-1.text-primary').forEach((el) => {
      el.style.setProperty('width', '509px', 'important');
      el.style.setProperty('max-width', '509px', 'important');
      el.style.setProperty('margin-left', 'auto', 'important');
      el.style.setProperty('margin-right', 'auto', 'important');
      el.style.setProperty('box-sizing', 'border-box', 'important');
    });

    const footer = root.querySelector('.modal-footer');
    if (footer) {
      footer.style.setProperty('width', '509px', 'important');
      footer.style.setProperty('max-width', '509px', 'important');
      footer.style.setProperty('padding-right', '8px', 'important');
      footer.style.setProperty('box-sizing', 'border-box', 'important');
      footer.style.setProperty('margin-left', 'auto', 'important');
      footer.style.setProperty('margin-right', 'auto', 'important');
      footer.style.setProperty('justify-content', 'flex-start', 'important');
      footer.style.setProperty('padding-left', '0', 'important');
    }

    const headerList = root.querySelector('.list-group');
    const headerItem = root.querySelector('.list-group-item.list-group-item-success');
    if (headerList) {
      headerList.style.setProperty('margin-left', 'auto', 'important');
      headerList.style.setProperty('margin-right', 'auto', 'important');
    }
    if (headerItem) {
      headerItem.style.setProperty('margin-left', 'auto', 'important');
      headerItem.style.setProperty('margin-right', 'auto', 'important');
    }
  }

  function reorganizeSchedulingModalLayout() {
    const root = getSchedulingModalRoot();
    if (!root) return;

    const cadTemp = getCadTemp(root);
    const cadTempTitleRow = getCadTempTitleRow(root);
    const observationTitleRow = getObservationTitleRow(root);
    const observationFieldsRow = getObservationFieldsRow(root);
    const originTitleRow = getOriginTitleRow(root);

    if (!cadTemp || !cadTempTitleRow || !observationTitleRow || !observationFieldsRow) return;

    const sexoBlock = findColByLabel(cadTemp, 'Sexo');
    const birthBlock = findColByLabel(cadTemp, 'Data de Nascimento');
    const celularBlock = findColByLabel(cadTemp, 'Celular');
    const emailBlock = findColByLabel(cadTemp, 'e-mail');
    const nomeBlock = findColByLabel(cadTemp, 'Nome');
    const cpfBlock = findColByLabel(cadTemp, 'CPF');
    const carteiraBlock = findColByLabel(cadTemp, 'No. da Carteira do Plano');
    const validadeBlock = findColByLabel(cadTemp, 'Validade da Carteira');
    const origemBlock = findOriginFieldBlock(root);

    const observationInputBlock = observationFieldsRow.children[0] || null;
    const observationSelectBlock = observationFieldsRow.children[1] || null;

    if (
      !sexoBlock ||
      !birthBlock ||
      !celularBlock ||
      !emailBlock ||
      !nomeBlock ||
      !cpfBlock ||
      !carteiraBlock ||
      !validadeBlock ||
      !origemBlock ||
      !observationInputBlock ||
      !observationSelectBlock
    ) {
      return;
    }

    const topLayoutHost = ensureHost(cadTemp, 'tm-top-layout-host', 'tm-layout-host');
    cadTemp.insertBefore(topLayoutHost, cadTempTitleRow.nextSibling);

    topLayoutHost.innerHTML = `
      <div class="tm-top-layout">
        <div class="tm-left-panel">
          <div class="tm-grid-row tm-row-name-birth">
            <div class="tm-field-slot" data-slot="nome"></div>
            <div class="tm-field-slot" data-slot="nascimento"></div>
          </div>
          <div class="tm-grid-row tm-row-cpf-sexo-origem">
            <div class="tm-field-slot" data-slot="cpf"></div>
            <div class="tm-field-slot" data-slot="sexo"></div>
            <div class="tm-field-slot" data-slot="origem"></div>
          </div>
          <div class="tm-grid-row tm-row-cel-email">
            <div class="tm-field-slot" data-slot="celular"></div>
            <div class="tm-field-slot" data-slot="email"></div>
          </div>
          <div class="tm-grid-row tm-row-carteira-validade">
            <div class="tm-field-slot" data-slot="carteira"></div>
            <div class="tm-field-slot" data-slot="validade"></div>
          </div>
        </div>
      </div>
    `;

    moveToSlot(topLayoutHost.querySelector('[data-slot="nome"]'), nomeBlock);
    moveToSlot(topLayoutHost.querySelector('[data-slot="nascimento"]'), birthBlock);
    moveToSlot(topLayoutHost.querySelector('[data-slot="cpf"]'), cpfBlock);
    moveToSlot(topLayoutHost.querySelector('[data-slot="sexo"]'), sexoBlock);
    moveToSlot(topLayoutHost.querySelector('[data-slot="origem"]'), origemBlock);
    moveToSlot(topLayoutHost.querySelector('[data-slot="celular"]'), celularBlock);
    moveToSlot(topLayoutHost.querySelector('[data-slot="email"]'), emailBlock);
    moveToSlot(topLayoutHost.querySelector('[data-slot="carteira"]'), carteiraBlock);
    moveToSlot(topLayoutHost.querySelector('[data-slot="validade"]'), validadeBlock);

    const observationHostParent = observationTitleRow.parentElement;
    const observationHost = ensureHost(observationHostParent, 'tm-observation-layout-host', 'tm-observation-layout');
    if (observationTitleRow.nextSibling !== observationHost) {
      observationHostParent.insertBefore(observationHost, observationTitleRow.nextSibling);
    }

    observationHost.innerHTML = `
      <div class="tm-field-slot" data-slot="observacao-input"></div>
      <div class="tm-field-slot" data-slot="observacao-select"></div>
    `;

    moveToSlot(observationHost.querySelector('[data-slot="observacao-input"]'), observationInputBlock);
    moveToSlot(observationHost.querySelector('[data-slot="observacao-select"]'), observationSelectBlock);

    cadTemp.querySelectorAll('.form-row').forEach((row) => hideOriginalRow(row));
    hideOriginalRow(observationFieldsRow);

    if (originTitleRow) {
      const originMainRow = originTitleRow.closest('.row');
      hideOriginalRow(originTitleRow);
      hideOriginalRow(originMainRow);
    }

    [
      sexoBlock,
      birthBlock,
      celularBlock,
      emailBlock,
      nomeBlock,
      cpfBlock,
      carteiraBlock,
      validadeBlock,
      origemBlock,
      observationInputBlock,
      observationSelectBlock
    ].forEach((block) => {
      block.style.setProperty('width', '100%', 'important');
      block.style.setProperty('max-width', 'none', 'important');
      block.style.setProperty('padding-left', '0', 'important');
      block.style.setProperty('padding-right', '0', 'important');
      block.style.setProperty('flex', 'unset', 'important');
    });

    hideCellCountryButton(celularBlock);
    ensureObservationTextarea(observationInputBlock);
  }

  function hideAppointmentModalFields() {
    const root = getSchedulingModalRoot();
    if (!root) return;

    const telefoneBlock = findColByLabel(root, 'Telefone');
    const nomeSocialBlock = findColByLabel(root, 'Nome Social');
    const materialBlock = findMaterialBlock(root);

    hideElement(telefoneBlock);
    hideElement(nomeSocialBlock);
    hideElement(materialBlock);
  }

  function burstUpdateLite() {
    const root = getSchedulingModalRoot();
    updateModalTitle();
    enableBirthDatePaste();
    injectLayoutCSS();
    hideAppointmentModalFields();
    reorganizeSchedulingModalLayout();
    resizeSchedulingModal();
    if (root) reorganizeHeaderStructure(root);
  }

  function burstUpdate() {
    burstUpdateLite();
    setTimeout(burstUpdateLite, 100);
    setTimeout(burstUpdateLite, 250);
    setTimeout(burstUpdateLite, 500);
    setTimeout(burstUpdateLite, 900);
    setTimeout(burstUpdateLite, 1400);
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#minutoModal')) {
      captureSelectionFromClick(e.target, false);
    }
    burstUpdate();
  }, true);

  document.addEventListener('focusin', () => {
    enableBirthDatePaste();
    hideAppointmentModalFields();
    reorganizeSchedulingModalLayout();
  }, true);

  document.addEventListener('contextmenu', async (e) => {
    if (!e.target.closest('#minutoModal')) return;

    const targetEl = e.target.closest('button, a, div, span');
    if (!targetEl || !isTimeButton(targetEl)) return;

    e.preventDefault();
    e.stopPropagation();

    const changed = captureSelectionFromClick(e.target, true);
    if (!changed) return;

    burstUpdate();

    setTimeout(async () => {
      await copyText(getCopyText(), targetEl);
    }, 200);
  }, true);

  const observer = new MutationObserver(() => {
    applyLoginIndicator();
    enableBirthDatePaste();
    burstUpdateLite();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  function initScript() {
    applyLoginIndicator();
    enableBirthDatePaste();
    injectLayoutCSS();
    hideAppointmentModalFields();
    reorganizeSchedulingModalLayout();
    resizeSchedulingModal();

    burstUpdate();

    setTimeout(() => {
      enableBirthDatePaste();
      burstUpdate();
    }, 300);

    setTimeout(() => {
      enableBirthDatePaste();
      burstUpdate();
    }, 1000);

    setTimeout(() => {
      enableBirthDatePaste();
      burstUpdate();
    }, 2000);

    console.log('[TM] script inicializado', location.href);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScript);
  } else {
    initScript();
  }

  window.addEventListener('load', initScript);
  window.addEventListener('pageshow', initScript);
  window.addEventListener('focus', () => {
    applyLoginIndicator();
    enableBirthDatePaste();
    burstUpdate();
  });
  window.addEventListener('hashchange', initScript);

  setInterval(() => {
    if (location.hostname.endsWith('klingo.app')) {
      applyLoginIndicator();
      enableBirthDatePaste();
      burstUpdate();
    }
  }, 1500);
})();
