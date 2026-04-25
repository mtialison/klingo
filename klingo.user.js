// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      9.0
// @description  envenenado
// @match        *://*.klingo.app/*
// @match        *://samec.klingo.app/*
// @updateURL    https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js
// @author       alison
// @grant        GM_info
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



  function isCallCenterRoute() {
    if (location.hostname !== 'samec.klingo.app') return false;
    if (typeof location.hash !== 'string') return false;

    const hash = location.hash.trim();

    return (
      hash === '#/call-center' ||
      hash === '#/call-center/' ||
      hash === '#/call-center/marcacao'
    );
  }

  const state = {
    selectedDate: '',
    selectedWeekday: '',
    selectedTime: '',
    selectedDoctor: '',
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

  function findDoctorContainerFromTimeButton(el) {
    let current = el;
    while (current && current !== document.body) {
      const text = norm(current.innerText || current.textContent || '');
      const hasCRM = /\bCRM\b/i.test(text);
      const hasTime = Array.from(current.querySelectorAll('button, a, div, span')).some(isTimeButton);
      if (hasCRM && hasTime) return current;
      current = current.parentElement;
    }
    return null;
  }

  function extractDoctorNameFromContainer(container) {
    if (!container) return '';

    const crmNode = Array.from(container.querySelectorAll('div, span, label, strong, b, p, h1, h2, h3, h4, h5, h6, small'))
      .find((node) => /\bCRM\b/i.test(norm(node.textContent || '')));

    if (crmNode) {
      let current = crmNode.previousElementSibling;
      while (current) {
        const text = norm(current.textContent || '');
        if (
          text &&
          text.length >= 8 &&
          text.length <= 90 &&
          !/\bCRM\b/i.test(text) &&
          !isTimeButton(current) &&
          /[A-Za-zÀ-ÿ]{2}/.test(text) &&
          !/^[A-Z]{2,6}$/.test(text)
        ) {
          return toTitleCase(text);
        }
        current = current.previousElementSibling;
      }
    }

    const candidates = Array.from(
      container.querySelectorAll('div, span, label, strong, b, p, h1, h2, h3, h4, h5, h6, small')
    );

    for (const node of candidates) {
      const text = norm(node.textContent || '');
      if (!text) continue;
      if (text.length < 8 || text.length > 90) continue;
      if (/\bCRM\b/i.test(text)) continue;
      if (isTimeButton(node)) continue;
      if (!/[A-Za-zÀ-ÿ]{2}/.test(text)) continue;
      if (/^[A-Z]{2,6}$/.test(text)) continue;

      const parentText = norm(node.parentElement?.textContent || '');
      if (/\bCRM\b/i.test(parentText)) {
        return toTitleCase(text);
      }
    }

    const raw = norm(container.innerText || container.textContent || '');
    const match = raw.match(/([A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ'´`^~\- ]{8,}?)\s+CRM\b/i);
    if (!match) return '';

    const cleaned = norm(match[1]).replace(/^[A-Z]{2,6}\s+/, '');
    return toTitleCase(cleaned);
  }

  function getSelectedDoctorName() {
    return state.selectedDoctor || getDoctorNameFromModal();
  }
  function getModalDateContext() {
    const modal = document.querySelector('#minutoModal');
    if (!modal) return { dateText: '', weekdayText: '' };

    const text = norm(modal.innerText || modal.textContent || '');
    const dateMatch = text.match(/\b\d{2}\/\d{2}\b/);
    const weekday = WEEKDAYS.find((day) => text.includes(day)) || '';

    return {
      dateText: dateMatch ? formatDatePtBr(dateMatch[0]) : '',
      weekdayText: weekday
    };
  }

  function buildCopyTextFromTarget(target) {
    const btn = target ? target.closest('button, a, div, span') : null;
    if (!btn || !isTimeButton(btn)) return '';

    const time = normalizeHour(btn.textContent);
    const doctorContainer = findDoctorContainerFromTimeButton(btn);
    const doctorName = extractDoctorNameFromContainer(doctorContainer);
    const modalContext = getModalDateContext();

    if (!doctorName || !modalContext.dateText || !modalContext.weekdayText || !time) {
      return '';
    }

    return `👨‍⚕️ ${doctorName}\n${modalContext.dateText} | ${modalContext.weekdayText} | ${time}`;
  }


  function captureSelectionFromClick(target, allowModalTime = false) {
    const insideModal = !!target.closest('#minutoModal');

    if (insideModal && !allowModalTime) return false;

    const btn = target.closest('button, a, div, span');
    if (!btn || !isTimeButton(btn)) return false;

    const time = normalizeHour(btn.textContent);

    if (insideModal && allowModalTime) {
      state.selectedTime = time;

      const doctorContainer = findDoctorContainerFromTimeButton(btn);
      const doctorName = extractDoctorNameFromContainer(doctorContainer);
      if (doctorName) {
        state.selectedDoctor = doctorName;
      }

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
    const doctorName = getSelectedDoctorName();
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

    const doctorName = getSelectedDoctorName();
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
  
  function injectFontFix() {
    if (document.getElementById('tm-font-fix')) return;
    const style = document.createElement('style');
    style.id = 'tm-font-fix';
    style.innerHTML = `
.tm-klingo-root .list-group-item.list-group-item-success .tm-procedure-title,
.tm-klingo-root .list-group-item.list-group-item-info .tm-procedure-title,
.tm-klingo-root .list-group-item.list-group-item-warning .tm-procedure-title,
.tm-klingo-root .list-group-item.list-group-item-secondary .tm-procedure-title,
.tm-klingo-root .list-group-item.list-group-item-danger .tm-procedure-title {
  font-size: 20px !important;
  line-height: 1.25 !important;
  font-weight: 400 !important;
}

.tm-klingo-root .list-group-item.list-group-item-success .tm-header-line,
.tm-klingo-root .list-group-item.list-group-item-info .tm-header-line,
.tm-klingo-root .list-group-item.list-group-item-warning .tm-header-line,
.tm-klingo-root .list-group-item.list-group-item-secondary .tm-header-line,
.tm-klingo-root .list-group-item.list-group-item-danger .tm-header-line {
  font-size: inherit !important;
  line-height: 1.3 !important;
}

.tm-klingo-root .list-group-item.list-group-item-success .tm-header-line small,
.tm-klingo-root .list-group-item.list-group-item-success .tm-header-line .lead,
.tm-klingo-root .list-group-item.list-group-item-info .tm-header-line small,
.tm-klingo-root .list-group-item.list-group-item-info .tm-header-line .lead,
.tm-klingo-root .list-group-item.list-group-item-warning .tm-header-line small,
.tm-klingo-root .list-group-item.list-group-item-warning .tm-header-line .lead,
.tm-klingo-root .list-group-item.list-group-item-secondary .tm-header-line small,
.tm-klingo-root .list-group-item.list-group-item-secondary .tm-header-line .lead,
.tm-klingo-root .list-group-item.list-group-item-danger .tm-header-line small,
.tm-klingo-root .list-group-item.list-group-item-danger .tm-header-line .lead {
  font-size: 14px !important;
  line-height: 1.3 !important;
  font-weight: 400 !important;
}

.tm-klingo-root .list-group-item.list-group-item-success .tm-header-line i,
.tm-klingo-root .list-group-item.list-group-item-info .tm-header-line i,
.tm-klingo-root .list-group-item.list-group-item-warning .tm-header-line i,
.tm-klingo-root .list-group-item.list-group-item-secondary .tm-header-line i,
.tm-klingo-root .list-group-item.list-group-item-danger .tm-header-line i {
  font-size: 14px !important;
}

.tm-klingo-root .list-group-item.list-group-item-success .tm-header-line .text-muted,
.tm-klingo-root .list-group-item.list-group-item-info .tm-header-line .text-muted,
.tm-klingo-root .list-group-item.list-group-item-warning .tm-header-line .text-muted,
.tm-klingo-root .list-group-item.list-group-item-secondary .tm-header-line .text-muted,
.tm-klingo-root .list-group-item.list-group-item-danger .tm-header-line .text-muted {
  font-size: 14px !important;
}

.tm-klingo-root .list-group-item.list-group-item-success .tm-header-infos footer,
.tm-klingo-root .list-group-item.list-group-item-info .tm-header-infos footer,
.tm-klingo-root .list-group-item.list-group-item-warning .tm-header-infos footer,
.tm-klingo-root .list-group-item.list-group-item-secondary .tm-header-infos footer,
.tm-klingo-root .list-group-item.list-group-item-danger .tm-header-infos footer {
  font-size: 12px !important;
  line-height: 1.35 !important;
}

.tm-klingo-root .tm-procedure-title {
  font-size: 16px !important;
}

.tm-klingo-root .tm-header-line,
.tm-klingo-root .tm-header-line small,
.tm-klingo-root .tm-header-line .lead {
  font-size: 12px !important;
}

.tm-klingo-root .tm-header-infos footer {
  font-size: 12px !important;
}


/* FIX DEFINITIVO TAMANHO (override do H4 do bootstrap) */
.tm-klingo-root .tm-procedure-title.h4,
.tm-klingo-root .h4.tm-procedure-title {
  font-size: 16px !important;
  font-weight: 500 !important;
}

.tm-klingo-root .tm-header-line,
.tm-klingo-root .tm-header-line * {
  font-size: 12px !important;
}

/* garantir que não herde tamanho maior */
.tm-klingo-root .list-group-item * {
  font-size: 12px;
}

.tm-klingo-root .tm-procedure-title * {
  font-size: 16px !important;
}

/* ocultar consultorio */
.tm-klingo-root .tm-header-line small .text-muted {
  display: none !important;
}

`;
    document.head.appendChild(style);
  }

  function injectLayoutCSS() {
    if (!isCallCenterRoute()) return;
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
        height: 30px !important;
        min-width: 38px !important;
        border-top-right-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }

      .tm-observation-layout select.form-control {
        height: 30px !important;
        max-width: 188px !important;
        width: 188px !important;
        border-top-left-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        line-height: 30px !important;
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


      /* OCULTAR ÍCONE NATIVO DO INPUT DATE NO CAMPO DATA DE NASCIMENTO */
      .tm-klingo-root [data-slot="nascimento"] input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0 !important;
        display: none !important;
        -webkit-appearance: none !important;
      }

      .tm-klingo-root [data-slot="nascimento"] input[type="date"]::-webkit-inner-spin-button,
      .tm-klingo-root [data-slot="nascimento"] input[type="date"]::-webkit-clear-button {
        display: none !important;
        -webkit-appearance: none !important;
      }

      .tm-klingo-root [data-slot="nascimento"] input[type="date"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        background-image: none !important;
        padding-right: 8px !important;
      }

      .tm-klingo-root [data-slot="nascimento"] .input-group-append,
      .tm-klingo-root [data-slot="nascimento"] .input-group-text,
      .tm-klingo-root [data-slot="nascimento"] .btn,
      .tm-klingo-root [data-slot="nascimento"] button {
        display: none !important;
      }


      /* DATA DE NASCIMENTO: badge de idade inline */
      .tm-klingo-root [data-slot="nascimento"] .input-group {
        position: relative !important;
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      .tm-klingo-root [data-slot="nascimento"] input[type="date"],
      .tm-klingo-root [data-slot="nascimento"] input.form-control {
        padding-right: 46px !important;
      }

      .tm-klingo-root [data-slot="nascimento"] .tm-birth-age-inline {
        position: absolute !important;
        top: 1px !important;
        bottom: 1px !important;
        right: 1px !important;
        width: 44px !important;
        transform: none !important;
        z-index: 3 !important;
        display: flex !important;
        align-items: stretch !important;
        margin: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        border-top-right-radius: .25rem !important;
        border-bottom-right-radius: .25rem !important;
      }

      .tm-klingo-root [data-slot="nascimento"] .tm-birth-age-inline .input-group-text {
        width: 100% !important;
        min-width: 0 !important;
        height: 100% !important;
        max-height: none !important;
        padding: 0 !important;
        border-radius: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #d9d9d9 !important;
        color: #666 !important;
        line-height: 1 !important;
        border-top: 0 !important;
        border-right: 0 !important;
        border-bottom: 0 !important;
        border-left: 1px solid #cfd4da !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        white-space: nowrap !important;
        text-align: center !important;
      }

      .tm-klingo-root [data-slot="nascimento"] .tm-age-hidden {
        display: none !important;
      }


      /* =========================
         FASE 2 - HEADER PACIENTE
         Visual próprio, sem função da Primeira Vez
      ========================= */
      .tm-paciente-header-root .list-group,
      .tm-paciente-header-root .list-group-item.list-group-item-success {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-paciente-header-root .list-group-item.list-group-item-success {
        background: #d5edff !important;
        border-color: #b7d9ee !important;
        color: #003358 !important;
        padding: 12px 14px !important;
      }

      .tm-paciente-header-root .list-group-item.list-group-item-success,
      .tm-paciente-header-root .list-group-item.list-group-item-success * {
        color: #003358 !important;
      }

      .tm-paciente-header-root .tm-paciente-procedure-title {
        display: block !important;
        margin-bottom: 8px !important;
        font-size: 20px !important;
        line-height: 1.25 !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
      }

      .tm-paciente-header-root .tm-paciente-header-line {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px 10px !important;
        margin-bottom: 6px !important;
        line-height: 1.3 !important;
      }

      .tm-paciente-header-root .tm-paciente-header-line,
      .tm-paciente-header-root .tm-paciente-header-line * {
        font-size: 12px !important;
      }

      .tm-paciente-header-root .tm-paciente-header-line small.text-muted,
      .tm-paciente-header-root .tm-paciente-header-line small .text-muted {
        display: none !important;
      }



      /* =========================
         FASE 3 - CAMPOS PACIENTE
         Oculta Nome Social sem mover DOM
      ========================= */
      .tm-paciente-fields-root .tm-paciente-nome-social-field {
        display: none !important;
      }

      .tm-paciente-fields-root .tm-paciente-nome-paciente-field {
        width: 100% !important;
        max-width: none !important;
        flex: 0 0 100% !important;
      }

      .tm-paciente-fields-root .tm-paciente-nome-paciente-field .form-group {
        margin-bottom: 0 !important;
      }

      .tm-paciente-fields-root .tm-paciente-nome-paciente-field .input-group,
      .tm-paciente-fields-root .tm-paciente-nome-paciente-field input {
        width: 100% !important;
      }



      /* =========================
         FASE 4 - LARGURA E ESPAÇAMENTO PACIENTE
         Sem mover DOM
      ========================= */
      .tm-paciente-spacing-root {
        width: 580px !important;
        max-width: 580px !important;
        min-width: 580px !important;
        overflow: hidden !important;
      }

      .tm-paciente-spacing-root .modal-body {
        padding-left: 0 !important;
        padding-right: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }

      .tm-paciente-spacing-root .modal-body > div,
      .tm-paciente-spacing-root .modal-body > .mt-3,
      .tm-paciente-spacing-root .modal-footer,
      .tm-paciente-spacing-root #myTab,
      .tm-paciente-spacing-root #myTabContent,
      .tm-paciente-spacing-root .tab-content,
      .tm-paciente-spacing-root .tab-pane,
      .tm-paciente-spacing-root .tab-pane > .mt-3 {
        width: 540px !important;
        max-width: 540px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-spacing-root .border-bottom,
      .tm-paciente-spacing-root .tm-paciente-title,
      .tm-paciente-spacing-root .tm-paciente-section {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-spacing-root .form-row {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-spacing-root .form-row > .col,
      .tm-paciente-spacing-root .form-row > [class*="col-"] {
        padding-left: 5px !important;
        padding-right: 5px !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-spacing-root .form-group {
        margin-bottom: 8px !important;
      }

      .tm-paciente-spacing-root .input-group,
      .tm-paciente-spacing-root .form-control,
      .tm-paciente-spacing-root input,
      .tm-paciente-spacing-root select {
        min-width: 0 !important;
      }

      .tm-paciente-spacing-root .modal-footer {
        justify-content: flex-start !important;
        padding-left: 0 !important;
        padding-right: 8px !important;
      }



      /* =========================
         FASE 4.1 - INPUTS PACIENTE COM LARGURA DO PRIMEIRA VEZ
         Sem mover DOM
      ========================= */
      .tm-paciente-spacing-root .modal-body > div,
      .tm-paciente-spacing-root .modal-body > .mt-3,
      .tm-paciente-spacing-root .modal-footer,
      .tm-paciente-spacing-root #myTab,
      .tm-paciente-spacing-root #myTabContent,
      .tm-paciente-spacing-root .tab-content,
      .tm-paciente-spacing-root .tab-pane,
      .tm-paciente-spacing-root .tab-pane > .mt-3 {
        width: 509px !important;
        max-width: 509px !important;
      }

      .tm-paciente-spacing-root .form-row {
        width: 509px !important;
        max-width: 509px !important;
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-end !important;
      }

      .tm-paciente-spacing-root .form-row > .col,
      .tm-paciente-spacing-root .form-row > [class*="col-"] {
        padding-left: 5px !important;
        padding-right: 5px !important;
        flex-grow: 0 !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-spacing-root .tm-paciente-nome-paciente-field {
        flex: 0 0 509px !important;
        width: 509px !important;
        max-width: 509px !important;
      }

      .tm-paciente-spacing-root .tm-paciente-social-field,
      .tm-paciente-spacing-root .tm-paciente-nome-social-field {
        display: none !important;
      }

      .tm-paciente-spacing-root .tm-paciente-sexo-field {
        flex: 0 0 155px !important;
        width: 155px !important;
        max-width: 155px !important;
      }

      .tm-paciente-spacing-root .tm-paciente-nascimento-field {
        flex: 0 0 155px !important;
        width: 155px !important;
        max-width: 155px !important;
      }

      .tm-paciente-spacing-root .tm-paciente-email-field {
        flex: 0 0 199px !important;
        width: 199px !important;
        max-width: 199px !important;
      }

      .tm-paciente-spacing-root .tm-paciente-telefone-field,
      .tm-paciente-spacing-root .tm-paciente-celular-field {
        flex: 0 0 254px !important;
        width: 254px !important;
        max-width: 254px !important;
      }

      .tm-paciente-spacing-root .tm-paciente-carteira-field {
        flex: 0 0 354px !important;
        width: 354px !important;
        max-width: 354px !important;
      }

      .tm-paciente-spacing-root .tm-paciente-validade-field {
        flex: 0 0 155px !important;
        width: 155px !important;
        max-width: 155px !important;
      }

      .tm-paciente-spacing-root .tm-paciente-field,
      .tm-paciente-spacing-root .tm-paciente-field .form-group,
      .tm-paciente-spacing-root .tm-paciente-field .input-group,
      .tm-paciente-spacing-root .tm-paciente-field input,
      .tm-paciente-spacing-root .tm-paciente-field select,
      .tm-paciente-spacing-root .tm-paciente-field .form-control {
        min-width: 0 !important;
        max-width: 100% !important;
      }



      /* =========================
         FASE 5 - GRID PACIENTE
         Layout solicitado, com movimentação única e controlada
      ========================= */
      .tm-paciente-grid-root {
        width: 580px !important;
        max-width: 580px !important;
        min-width: 580px !important;
        overflow: hidden !important;
      }

      .tm-paciente-grid-root .modal-body {
        padding-left: 0 !important;
        padding-right: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-host,
      .tm-paciente-grid-root .tm-paciente-grid-section,
      .tm-paciente-grid-root .tm-paciente-observation-host,
      .tm-paciente-grid-root .modal-footer,
      .tm-paciente-grid-root #myTab,
      .tm-paciente-grid-root #myTabContent,
      .tm-paciente-grid-root .tab-content,
      .tm-paciente-grid-root .tab-pane,
      .tm-paciente-grid-root .tab-pane > .mt-3 {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-grid-host {
        display: grid !important;
        grid-template-columns: repeat(12, 1fr) !important;
        gap: 10px 12px !important;
        align-items: end !important;
      }

      .tm-paciente-grid-host .tm-paciente-grid-field {
        min-width: 0 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-grid-host .tm-paciente-grid-field .form-group {
        margin-bottom: 0 !important;
      }

      .tm-paciente-grid-host .tm-paciente-grid-field .input-group,
      .tm-paciente-grid-host .tm-paciente-grid-field .form-control,
      .tm-paciente-grid-host .tm-paciente-grid-field input,
      .tm-paciente-grid-host .tm-paciente-grid-field select {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }

      .tm-paciente-grid-nome { grid-column: span 9 !important; }
      .tm-paciente-grid-nascimento { grid-column: span 3 !important; }
      .tm-paciente-grid-cpf { grid-column: span 3 !important; }
      .tm-paciente-grid-sexo { grid-column: span 3 !important; }
      .tm-paciente-grid-origem { grid-column: span 6 !important; }
      .tm-paciente-grid-celular { grid-column: span 3 !important; }
      .tm-paciente-grid-telefone { grid-column: span 3 !important; }
      .tm-paciente-grid-email { grid-column: span 6 !important; }
      .tm-paciente-grid-carteira { grid-column: span 9 !important; }
      .tm-paciente-grid-validade { grid-column: span 3 !important; }

      .tm-paciente-grid-root .tm-paciente-grid-social {
        display: none !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-nascimento .input-group {
        position: relative !important;
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-nascimento input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0 !important;
        display: none !important;
        -webkit-appearance: none !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-nascimento input[type="date"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        background-image: none !important;
        padding-right: 46px !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-nascimento .tm-birth-age-inline {
        position: absolute !important;
        top: 1px !important;
        bottom: 1px !important;
        right: 1px !important;
        width: 44px !important;
        transform: none !important;
        z-index: 3 !important;
        display: flex !important;
        align-items: stretch !important;
        margin: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        border-top-right-radius: .25rem !important;
        border-bottom-right-radius: .25rem !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-nascimento .tm-birth-age-inline .input-group-text {
        width: 100% !important;
        min-width: 0 !important;
        height: 100% !important;
        max-height: none !important;
        padding: 0 !important;
        border-radius: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #d9d9d9 !important;
        color: #666 !important;
        line-height: 1 !important;
        border-top: 0 !important;
        border-right: 0 !important;
        border-bottom: 0 !important;
        border-left: 1px solid #cfd4da !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        white-space: nowrap !important;
        text-align: center !important;
      }

      .tm-paciente-observation-host {
        margin-top: 10px !important;
      }

      .tm-paciente-observation-host .tm-paciente-observation-title {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-paciente-observation-host .tm-paciente-observation-row {
        display: grid !important;
        grid-template-columns: 9fr 3fr !important;
        gap: 10px 12px !important;
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        align-items: start !important;
      }

      .tm-paciente-observation-host textarea.tm-paciente-observation-textarea,
      .tm-paciente-observation-host .tm-paciente-observation-textarea {
        min-height: 68px !important;
        height: 68px !important;
        resize: none !important;
        overflow-y: auto !important;
        padding: 8px 10px !important;
        line-height: 1.35 !important;
        white-space: pre-wrap !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
      }

      .tm-paciente-grid-root .tm-paciente-hidden-original-row {
        display: none !important;
      }



      /* =========================
         FASE 5.1 - AJUSTES GRID PACIENTE
         Referência Primeira Vez
      ========================= */
      .tm-paciente-grid-root .tm-paciente-grid-host {
        width: 509px !important;
        max-width: 509px !important;
        display: grid !important;
        grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
        gap: 10px 12px !important;
        align-items: end !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-nome {
        grid-column: span 9 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-nascimento {
        grid-column: span 3 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-cpf {
        grid-column: span 3 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-sexo {
        grid-column: span 4 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-origem {
        grid-column: span 5 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-celular {
        grid-column: span 4 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-telefone {
        grid-column: span 4 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-email {
        grid-column: span 8 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-carteira {
        grid-column: span 9 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-validade {
        grid-column: span 3 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
      }

      .tm-paciente-grid-root .tm-paciente-grid-field,
      .tm-paciente-grid-root .tm-paciente-grid-field .form-group,
      .tm-paciente-grid-root .tm-paciente-grid-field .input-group,
      .tm-paciente-grid-root .tm-paciente-grid-field input,
      .tm-paciente-grid-root .tm-paciente-grid-field select,
      .tm-paciente-grid-root .tm-paciente-grid-field .form-control {
        min-width: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-grid-root .tm-paciente-observation-host {
        width: 509px !important;
        max-width: 509px !important;
        margin: 12px auto 0 auto !important;
      }

      .tm-paciente-grid-root .tm-paciente-observation-title {
        width: 509px !important;
        max-width: 509px !important;
        margin: 0 auto 6px auto !important;
      }

      .tm-paciente-grid-root .tm-paciente-observation-row {
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-paciente-grid-root .tm-paciente-observation-input,
      .tm-paciente-grid-root .tm-paciente-observation-input > *,
      .tm-paciente-grid-root .tm-paciente-observation-input textarea,
      .tm-paciente-grid-root .tm-paciente-observation-input .form-control {
        width: 509px !important;
        max-width: 509px !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-grid-root .tm-paciente-observation-input textarea,
      .tm-paciente-grid-root .tm-paciente-observation-input .tm-paciente-observation-textarea,
      .tm-paciente-grid-root .tm-paciente-observation-input .tm-observation-textarea {
        height: 84px !important;
        min-height: 84px !important;
        resize: none !important;
        overflow-y: auto !important;
        padding: 8px 10px !important;
        line-height: 1.35 !important;
      }

      .tm-paciente-grid-root .tm-paciente-observation-select {
        width: 240px !important;
        max-width: 240px !important;
      }

      .tm-paciente-grid-root .tm-paciente-observation-select .input-group,
      .tm-paciente-grid-root .tm-paciente-observation-select select,
      .tm-paciente-grid-root .tm-paciente-observation-select .form-control {
        width: 240px !important;
        max-width: 240px !important;
      }



      /* =========================
         PACIENTE 9.0 - HOST FIXO IGUAL PRIMEIRA VEZ
      ========================= */
      .tm-paciente-v9-root {
        width: 580px !important;
        max-width: 580px !important;
        min-width: 580px !important;
        overflow: hidden !important;
      }

      .tm-paciente-v9-root .modal-body {
        padding-left: 0 !important;
        padding-right: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }

      .tm-paciente-v9-root .tm-paciente-v9-host,
      .tm-paciente-v9-root .tm-paciente-v9-title,
      .tm-paciente-v9-root .tm-paciente-v9-observation-host,
      .tm-paciente-v9-root .modal-footer {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-v9-row {
        display: grid !important;
        gap: 10px 12px !important;
        margin-bottom: 10px !important;
        align-items: end !important;
      }

      .tm-paciente-v9-row-name-birth { grid-template-columns: 342px 155px !important; }
      .tm-paciente-v9-row-basic { grid-template-columns: 155px 155px 187px !important; }
      .tm-paciente-v9-row-contact { grid-template-columns: 155px 155px !important; }
      .tm-paciente-v9-row-email { grid-template-columns: 1fr !important; }
      .tm-paciente-v9-row-card { grid-template-columns: 342px 155px !important; }

      .tm-paciente-v9-slot,
      .tm-paciente-v9-slot > .col,
      .tm-paciente-v9-slot > [class*="col-"] {
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        flex: unset !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-v9-slot .form-group { margin-bottom: 0 !important; }

      .tm-paciente-v9-slot .input-group,
      .tm-paciente-v9-slot .form-control,
      .tm-paciente-v9-slot input,
      .tm-paciente-v9-slot select {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-v9-hidden { display: none !important; }

      .tm-paciente-v9-root .tm-paciente-v9-birth .input-group {
        position: relative !important;
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      .tm-paciente-v9-root .tm-paciente-v9-birth input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0 !important;
        display: none !important;
        -webkit-appearance: none !important;
      }

      .tm-paciente-v9-root .tm-paciente-v9-birth input[type="date"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        background-image: none !important;
        padding-right: 46px !important;
      }

      .tm-paciente-v9-root .tm-paciente-v9-birth .tm-birth-age-inline {
        position: absolute !important;
        top: 1px !important;
        bottom: 1px !important;
        right: 1px !important;
        width: 44px !important;
        transform: none !important;
        z-index: 3 !important;
        display: flex !important;
        align-items: stretch !important;
        margin: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        border-top-right-radius: .25rem !important;
        border-bottom-right-radius: .25rem !important;
      }

      .tm-paciente-v9-root .tm-paciente-v9-birth .tm-birth-age-inline .input-group-text {
        width: 100% !important;
        min-width: 0 !important;
        height: 100% !important;
        max-height: none !important;
        padding: 0 !important;
        border-radius: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: #d9d9d9 !important;
        color: #666 !important;
        line-height: 1 !important;
        border-top: 0 !important;
        border-right: 0 !important;
        border-bottom: 0 !important;
        border-left: 1px solid #cfd4da !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        white-space: nowrap !important;
        text-align: center !important;
      }

      .tm-paciente-v9-observation-host { margin-top: 10px !important; }

      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-title,
      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-input {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-input textarea,
      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-input .form-control,
      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-textarea {
        width: 509px !important;
        max-width: 509px !important;
        height: 84px !important;
        min-height: 84px !important;
        resize: none !important;
        overflow-y: auto !important;
        padding: 8px 10px !important;
        line-height: 1.35 !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-select {
        width: 240px !important;
        max-width: 240px !important;
        margin-top: 10px !important;
      }

      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-select .input-group,
      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-select .form-control,
      .tm-paciente-v9-observation-host .tm-paciente-v9-observation-select select {
        width: 240px !important;
        max-width: 240px !important;
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
    if (!isCallCenterRoute()) return null;
    const modalContents = document.querySelectorAll('.modal-content');

    for (const modal of modalContents) {
      const text = norm(modal.innerText || modal.textContent || '');
      if (!text) continue;

      const modalTitle = norm(modal.querySelector('.modal-title')?.textContent || '');
      const successTexts = Array.from(modal.querySelectorAll('.btn-success'))
        .map(btn => norm(btn.textContent || ''));

      const hasCadTemp = !!modal.querySelector('#cadTemp');
      const hasDadosPessoais = text.includes('Dados Pessoais');
      const hasOrigemPacientes = text.includes('ORIGEM DE PACIENTES') || text.includes('Origem de Pacientes');
      const hasConfirmar = successTexts.some(txt => txt.includes('Confirmar'));
      const hasAtualizar = successTexts.some(txt => txt.includes('Atualizar'));
      const hasNomeDoPaciente = text.includes('Nome do Paciente');

      if (modalTitle.includes('Editar Marcação')) continue;
      if (hasAtualizar && !hasConfirmar) continue;

      // FASE 1: Primeira Vez é o ÚNICO fluxo que pode receber a customização pesada.
      // Regra confirmada no DOM: Primeira Vez tem #cadTemp; Paciente não tem.
      if (hasCadTemp && !hasNomeDoPaciente && hasDadosPessoais && hasOrigemPacientes && hasConfirmar) {
        modal.classList.add('tm-klingo-root');
        return modal;
      }
    }

    return null;
  }

  function isPacienteSchedulingModalRoot(root) {
    if (!root || !isCallCenterRoute()) return false;

    const body = root.querySelector(':scope > .modal-body');
    const personal = body ? body.querySelector(':scope > .mt-3') : null;
    if (!body || !personal) return false;

    const text = norm(personal.innerText || personal.textContent || '');

    return (
      !root.querySelector('#cadTemp') &&
      text.includes('Nome do Paciente') &&
      text.includes('Nome Social') &&
      text.includes('Telefone') &&
      text.includes('Celular') &&
      text.includes('Data de Nascimento')
    );
  }

  function getActivePacienteSchedulingModalRoot() {
    if (!isCallCenterRoute()) return null;

    const modal =
      document.querySelector('#cadastroModal.modal.show') ||
      document.querySelector('#cadastroModal.show');

    if (!modal) return null;

    const root =
      modal.querySelector(':scope > .modal-dialog.modal-xl.modal-dialog-scrollable > .modal-content') ||
      modal.querySelector('.modal-dialog.modal-xl.modal-dialog-scrollable > .modal-content');

    return isPacienteSchedulingModalRoot(root) ? root : null;
  }

  function clearFirstVisitResidueFromPacienteModal() {
    const root = getActivePacienteSchedulingModalRoot();
    if (!root) return;

    root.classList.remove(
      'tm-klingo-root',
      'tm-first-visit-modal',
      'tm-registered-patient-modal'
    );

    root.querySelectorAll('.tm-procedure-title, .tm-header-line, .tm-header-line-2, .tm-header-line-3').forEach((el) => {
      el.classList.remove(
        'tm-procedure-title',
        'tm-header-line',
        'tm-header-line-2',
        'tm-header-line-3'
      );
    });

    root.querySelectorAll('#tm-top-layout-host, #tm-observation-layout-host, .tm-layout-host, .tm-top-layout, .tm-left-panel').forEach((el) => {
      el.remove();
    });

    root.querySelectorAll('.tm-hidden-original-row').forEach((el) => {
      el.classList.remove('tm-hidden-original-row');
      el.style.removeProperty('display');
    });

    root.querySelectorAll('.tm-hidden-by-script').forEach((el) => {
      el.classList.remove('tm-hidden-by-script');
      el.removeAttribute('data-tm-hidden-by-script');
      el.style.removeProperty('display');
    });

    root.querySelectorAll('.tm-observation-textarea').forEach((el) => {
      el.remove();
    });

    root.querySelectorAll('[data-slot]').forEach((el) => {
      el.removeAttribute('data-slot');
    });

    const dialog = root.closest('.modal-dialog');
    [dialog, root, root.querySelector(':scope > .modal-body')].forEach((el) => {
      if (!el) return;
      [
        'width',
        'max-width',
        'min-width',
        'margin-left',
        'margin-right',
        'box-sizing',
        'padding-left',
        'padding-right',
        'display',
        'flex-direction',
        'align-items',
        'flex',
        'overflow',
        'overflow-x',
        'overflow-y',
        'justify-content'
      ].forEach((prop) => el.style.removeProperty(prop));
    });
  }

  function applyPacienteHeaderVisual() {
    const root = getActivePacienteSchedulingModalRoot();
    if (!root) return;

    root.classList.add('tm-paciente-header-root');

    const headerItem = root.querySelector('.list-group-item.list-group-item-success');
    if (!headerItem) return;

    const label = headerItem.querySelector('label.w-100, label');
    if (!label) return;

    const title = label.querySelector('.h4.mb-1, .h4');
    if (title) {
      title.classList.add('tm-paciente-procedure-title');
    }

    // Mantém o DOM original, só marca as linhas existentes.
    const detailsLine = Array.from(label.children).find((child) => {
      const text = norm(child.innerText || child.textContent || '');
      return (
        child.classList.contains('d-flex') &&
        text.includes('PAULO') || text.includes('LEVE') || text.includes('CLINICA') || text.includes('COPACABANA')
      );
    });

    if (detailsLine) {
      detailsLine.classList.add('tm-paciente-header-line');
    }

    // Linha de data/horário no HTML do Paciente fica dentro do bloco justify-content-between.
    const dateTimeBlock = Array.from(label.querySelectorAll('div, span')).find((el) => {
      const text = norm(el.innerText || el.textContent || '');
      return /\d{2}\/[A-Za-zÀ-ÿ]{3}/.test(text) && /\d{2}:\d{2}-\d{2}:\d{2}/.test(text);
    });

    if (dateTimeBlock) {
      dateTimeBlock.classList.add('tm-paciente-header-line');
    }

    // Oculta apenas a sala detalhada no cabeçalho do Paciente, preservando unidade.
    const roomSmall = headerItem.querySelector('small.text-muted');
    if (roomSmall) {
      roomSmall.style.setProperty('display', 'none', 'important');
    }
  }

  function findPacienteFieldBlockByLabel(root, labelText) {
    if (!root) return null;

    const labels = Array.from(root.querySelectorAll('small.form-text, small'));
    for (const label of labels) {
      if (norm(label.textContent || '') !== labelText) continue;

      return (
        label.closest('.col') ||
        label.closest('[class*="col-"]') ||
        label.closest('.form-group') ||
        label.parentElement
      );
    }

    return null;
  }

  function applyPacienteFieldsPhase3() {
    const root = getActivePacienteSchedulingModalRoot();
    if (!root) return;

    root.classList.add('tm-paciente-fields-root');

    const nomeBlock = findPacienteFieldBlockByLabel(root, 'Nome do Paciente');
    const nomeSocialBlock = findPacienteFieldBlockByLabel(root, 'Nome Social');
    const sexoBlock = findPacienteFieldBlockByLabel(root, 'Sexo');
    const nascimentoBlock = findPacienteFieldBlockByLabel(root, 'Data de Nascimento');
    const emailBlock = findPacienteFieldBlockByLabel(root, 'e-mail');
    const telefoneBlock = findPacienteFieldBlockByLabel(root, 'Telefone');
    const celularBlock = findPacienteFieldBlockByLabel(root, 'Celular');
    const carteiraBlock = findPacienteFieldBlockByLabel(root, 'No. da Carteira do Plano');
    const validadeBlock = findPacienteFieldBlockByLabel(root, 'Validade da Carteira');

    if (nomeBlock) {
      nomeBlock.classList.add('tm-paciente-field', 'tm-paciente-nome-paciente-field');
      nomeBlock.style.setProperty('width', '509px', 'important');
      nomeBlock.style.setProperty('max-width', '509px', 'important');
      nomeBlock.style.setProperty('flex', '0 0 509px', 'important');
    }

    if (nomeSocialBlock) {
      nomeSocialBlock.classList.add('tm-paciente-field', 'tm-paciente-nome-social-field');
      nomeSocialBlock.style.setProperty('display', 'none', 'important');
    }

    [
      [sexoBlock, 'tm-paciente-sexo-field', '155px'],
      [nascimentoBlock, 'tm-paciente-nascimento-field', '155px'],
      [emailBlock, 'tm-paciente-email-field', '199px'],
      [telefoneBlock, 'tm-paciente-telefone-field', '254px'],
      [celularBlock, 'tm-paciente-celular-field', '254px'],
      [carteiraBlock, 'tm-paciente-carteira-field', '354px'],
      [validadeBlock, 'tm-paciente-validade-field', '155px']
    ].forEach(([block, className, width]) => {
      if (!block) return;
      block.classList.add('tm-paciente-field', className);
      block.style.setProperty('width', width, 'important');
      block.style.setProperty('max-width', width, 'important');
      block.style.setProperty('flex', `0 0 ${width}`, 'important');
    });
  }

  function applyPacienteSpacingPhase4() {
    const root = getActivePacienteSchedulingModalRoot();
    if (!root) return;

    root.classList.add('tm-paciente-spacing-root');

    const dialog = root.closest('.modal-dialog');
    if (dialog) {
      dialog.style.setProperty('width', '580px', 'important');
      dialog.style.setProperty('max-width', '580px', 'important');
      dialog.style.setProperty('min-width', '580px', 'important');
      dialog.style.setProperty('margin-left', 'auto', 'important');
      dialog.style.setProperty('margin-right', 'auto', 'important');
    }

    root.style.setProperty('width', '580px', 'important');
    root.style.setProperty('max-width', '580px', 'important');
    root.style.setProperty('min-width', '580px', 'important');
    root.style.setProperty('overflow', 'hidden', 'important');

    const body = root.querySelector(':scope > .modal-body');
    if (body) {
      body.style.setProperty('padding-left', '0', 'important');
      body.style.setProperty('padding-right', '0', 'important');
      body.style.setProperty('overflow-x', 'hidden', 'important');
      body.style.setProperty('overflow-y', 'auto', 'important');
      body.style.setProperty('display', 'flex', 'important');
      body.style.setProperty('flex-direction', 'column', 'important');
      body.style.setProperty('align-items', 'center', 'important');
    }

    const footer = root.querySelector(':scope > .modal-footer');
    if (footer) {
      footer.style.setProperty('width', '509px', 'important');
      footer.style.setProperty('max-width', '509px', 'important');
      footer.style.setProperty('margin-left', 'auto', 'important');
      footer.style.setProperty('margin-right', 'auto', 'important');
      footer.style.setProperty('box-sizing', 'border-box', 'important');
      footer.style.setProperty('justify-content', 'flex-start', 'important');
      footer.style.setProperty('padding-left', '0', 'important');
      footer.style.setProperty('padding-right', '8px', 'important');
    }
  }

  function ensurePacienteGridHost(root) {
    const personal = root.querySelector(':scope > .modal-body > .mt-3');
    if (!personal) return null;

    let title = personal.querySelector('#tm-paciente-grid-title');
    if (!title) {
      title = document.createElement('div');
      title.id = 'tm-paciente-grid-title';
      title.className = 'border-bottom mb-1 d-flex justify-content-between hover-title-bg text-primary tm-paciente-grid-section';
      title.innerHTML = '<div><small>Dados Pessoais</small></div><div></div>';
      personal.insertBefore(title, personal.firstChild);
    }

    let host = personal.querySelector('#tm-paciente-grid-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tm-paciente-grid-host';
      host.className = 'tm-paciente-grid-host tm-paciente-grid-section';
      host.innerHTML = `
        <div class="tm-paciente-grid-slot" data-paciente-slot="nome"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="nascimento"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="cpf"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="sexo"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="origem"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="celular"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="telefone"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="email"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="carteira"></div>
        <div class="tm-paciente-grid-slot" data-paciente-slot="validade"></div>
      `;
    }

    if (title.nextSibling !== host) {
      personal.insertBefore(host, title.nextSibling);
    }

    return host;
  }

  function movePacienteGridField(slot, block, className) {
    if (!slot || !block) return;
    block.classList.add('tm-paciente-grid-field', className);
    block.style.removeProperty('width');
    block.style.removeProperty('max-width');
    block.style.removeProperty('flex');
    if (block.parentElement !== slot) {
      slot.appendChild(block);
    }
  }

  function hidePacienteOriginalRows(root) {
    const personal = root.querySelector(':scope > .modal-body > .mt-3');
    if (!personal) return;

    personal.querySelectorAll(':scope > .form-row').forEach((row) => {
      row.classList.add('tm-paciente-hidden-original-row');
      row.style.setProperty('display', 'none', 'important');
    });
  }

  function applyPacienteObservationGrid(root) {
    const obsTitleSmall = Array.from(root.querySelectorAll('small'))
      .find((small) => norm(small.textContent || '') === 'Observação');
    const obsTitle = obsTitleSmall ? obsTitleSmall.closest('.border-bottom') : null;
    if (!obsTitle) return;

    let obsRow = obsTitle.nextElementSibling;
    while (obsRow && !(obsRow.classList && obsRow.classList.contains('form-row'))) {
      obsRow = obsRow.nextElementSibling;
    }
    if (!obsRow) return;

    const inputBlock = obsRow.children[0] || null;
    const selectBlock = obsRow.children[1] || null;
    if (!inputBlock || !selectBlock) return;

    let host = root.querySelector('#tm-paciente-observation-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tm-paciente-observation-host';
      host.className = 'tm-paciente-observation-host';
      host.innerHTML = `
        <div class="tm-paciente-observation-title"></div>
        <div class="tm-paciente-observation-row">
          <div class="tm-paciente-observation-input"></div>
          <div class="tm-paciente-observation-select"></div>
        </div>
      `;
    }

    if (obsTitle.parentElement && obsTitle.nextSibling !== host) {
      obsTitle.parentElement.insertBefore(host, obsTitle.nextSibling);
    }

    host.querySelector('.tm-paciente-observation-title').appendChild(obsTitle);
    host.querySelector('.tm-paciente-observation-input').appendChild(inputBlock);
    host.querySelector('.tm-paciente-observation-select').appendChild(selectBlock);

    obsRow.classList.add('tm-paciente-hidden-original-row');
    obsRow.style.setProperty('display', 'none', 'important');

    ensureObservationTextarea(inputBlock);

    const textarea = inputBlock.querySelector('textarea, .tm-observation-textarea, .tm-paciente-observation-textarea');
    if (textarea) {
      textarea.classList.add('tm-paciente-observation-textarea');
      textarea.style.setProperty('height', '84px', 'important');
      textarea.style.setProperty('min-height', '84px', 'important');
      textarea.style.setProperty('resize', 'none', 'important');
      textarea.style.setProperty('overflow-y', 'auto', 'important');
    }
  }

  function applyPacienteGridBirth(root) {
    const birthBlock = root.querySelector('.tm-paciente-grid-nascimento');
    if (!birthBlock) return;

    const input = birthBlock.querySelector('input[type="date"]');
    const inputGroup = birthBlock.querySelector('.input-group');
    if (!input || !inputGroup) return;

    const ageAppend = Array.from(birthBlock.querySelectorAll('.input-group-append')).find((append) =>
      append.querySelector('.input-group-text[title*="Idade"], .input-group-text[title*="idade"]')
    );

    if (!ageAppend) return;

    if (ageAppend.parentElement !== inputGroup) inputGroup.appendChild(ageAppend);
    ageAppend.classList.add('tm-birth-age-inline');

    const ageText = ageAppend.querySelector('.input-group-text[title*="Idade"], .input-group-text[title*="idade"]');
    if (ageText) {
      syncBirthAgeBadgeFontSafe(input, ageText);
      const age = calculateBirthAgeSafe(input.value);
      if (age) ageText.textContent = age;
    }
  }

  function applyPacienteGridLayoutPhase5() {
    const root = getActivePacienteSchedulingModalRoot();
    if (!root) return;

    if (root.dataset.tmPacienteGridApplied === '1') {
      applyPacienteGridBirth(root);
      return;
    }

    const host = ensurePacienteGridHost(root);
    if (!host) return;

    const nome = findPacienteFieldBlockByLabel(root, 'Nome do Paciente');
    const social = findPacienteFieldBlockByLabel(root, 'Nome Social');
    const nascimento = findPacienteFieldBlockByLabel(root, 'Data de Nascimento');
    const cpf = findPacienteFieldBlockByLabel(root, 'CPF');
    const sexo = findPacienteFieldBlockByLabel(root, 'Sexo');
    const origem = findPacienteFieldBlockByLabel(root, 'Origem de Pacientes');
    const celular = findPacienteFieldBlockByLabel(root, 'Celular');
    const telefone = findPacienteFieldBlockByLabel(root, 'Telefone');
    const email = findPacienteFieldBlockByLabel(root, 'e-mail');
    const carteira = findPacienteFieldBlockByLabel(root, 'No. da Carteira do Plano');
    const validade = findPacienteFieldBlockByLabel(root, 'Validade da Carteira');

    if (!nome || !nascimento || !sexo || !origem || !celular || !telefone || !email || !carteira || !validade) return;

    root.classList.add('tm-paciente-grid-root');

    movePacienteGridField(host.querySelector('[data-paciente-slot="nome"]'), nome, 'tm-paciente-grid-nome');
    movePacienteGridField(host.querySelector('[data-paciente-slot="nascimento"]'), nascimento, 'tm-paciente-grid-nascimento');

    if (cpf) {
      movePacienteGridField(host.querySelector('[data-paciente-slot="cpf"]'), cpf, 'tm-paciente-grid-cpf');
    } else {
      const cpfSlot = host.querySelector('[data-paciente-slot="cpf"]');
      if (cpfSlot) cpfSlot.remove();
      sexo.classList.add('tm-paciente-grid-cpf');
    }

    movePacienteGridField(host.querySelector('[data-paciente-slot="sexo"]'), sexo, 'tm-paciente-grid-sexo');
    movePacienteGridField(host.querySelector('[data-paciente-slot="origem"]'), origem, 'tm-paciente-grid-origem');

    // Ordem solicitada: Celular, Telefone. E-mail fica na linha de baixo.
    movePacienteGridField(host.querySelector('[data-paciente-slot="celular"]'), celular, 'tm-paciente-grid-celular');
    movePacienteGridField(host.querySelector('[data-paciente-slot="telefone"]'), telefone, 'tm-paciente-grid-telefone');
    movePacienteGridField(host.querySelector('[data-paciente-slot="email"]'), email, 'tm-paciente-grid-email');

    movePacienteGridField(host.querySelector('[data-paciente-slot="carteira"]'), carteira, 'tm-paciente-grid-carteira');
    movePacienteGridField(host.querySelector('[data-paciente-slot="validade"]'), validade, 'tm-paciente-grid-validade');

    if (social) {
      social.classList.add('tm-paciente-grid-social');
      social.style.setProperty('display', 'none', 'important');
    }

    const origemTitle = Array.from(root.querySelectorAll('small'))
      .find((small) => norm(small.textContent || '') === 'ORIGEM DE PACIENTES');
    const origemTitleRow = origemTitle ? origemTitle.closest('.border-bottom') : null;
    const origemMainRow = origemTitleRow ? origemTitleRow.closest('.row') : null;

    if (origemTitleRow) {
      origemTitleRow.classList.add('tm-paciente-hidden-original-row');
      origemTitleRow.style.setProperty('display', 'none', 'important');
    }

    if (origemMainRow) {
      origemMainRow.classList.add('tm-paciente-hidden-original-row');
      origemMainRow.style.setProperty('display', 'none', 'important');
    }

    hidePacienteOriginalRows(root);
    applyPacienteObservationGrid(root);
    applyPacienteGridBirth(root);

    root.dataset.tmPacienteGridApplied = '1';
  }


  function tmPacienteV9FindField(root, labelText) {
    if (!root) return null;

    const labels = Array.from(root.querySelectorAll('small.form-text, small'));
    for (const label of labels) {
      if (norm(label.textContent || '') !== labelText) continue;

      return (
        label.closest('.col') ||
        label.closest('[class*="col-"]') ||
        label.closest('.form-group') ||
        label.parentElement
      );
    }

    return null;
  }

  function tmPacienteV9Move(slot, block, extraClass) {
    if (!slot || !block) return;
    block.classList.add('tm-paciente-v9-field', extraClass);
    block.style.removeProperty('width');
    block.style.removeProperty('max-width');
    block.style.removeProperty('flex');
    block.style.removeProperty('display');

    if (block.parentElement !== slot) {
      slot.appendChild(block);
    }
  }

  function tmPacienteV9Hide(el) {
    if (!el) return;
    el.classList.add('tm-paciente-v9-hidden');
    el.style.setProperty('display', 'none', 'important');
  }

  function tmPacienteV9EnsureHost(root) {
    const personal = root.querySelector(':scope > .modal-body > .mt-3');
    if (!personal) return null;

    let title = personal.querySelector('#tm-paciente-v9-title');
    if (!title) {
      title = document.createElement('div');
      title.id = 'tm-paciente-v9-title';
      title.className = 'border-bottom mb-1 d-flex justify-content-between hover-title-bg text-primary tm-paciente-v9-title';
      title.innerHTML = '<div><small>Dados Pessoais</small></div><div></div>';
      personal.insertBefore(title, personal.firstChild);
    }

    let host = personal.querySelector('#tm-paciente-v9-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tm-paciente-v9-host';
      host.className = 'tm-paciente-v9-host';
      host.innerHTML = `
        <div class="tm-paciente-v9-row tm-paciente-v9-row-name-birth">
          <div class="tm-paciente-v9-slot" data-v9-slot="nome"></div>
          <div class="tm-paciente-v9-slot" data-v9-slot="nascimento"></div>
        </div>
        <div class="tm-paciente-v9-row tm-paciente-v9-row-basic">
          <div class="tm-paciente-v9-slot" data-v9-slot="cpf"></div>
          <div class="tm-paciente-v9-slot" data-v9-slot="sexo"></div>
          <div class="tm-paciente-v9-slot" data-v9-slot="origem"></div>
        </div>
        <div class="tm-paciente-v9-row tm-paciente-v9-row-contact">
          <div class="tm-paciente-v9-slot" data-v9-slot="celular"></div>
          <div class="tm-paciente-v9-slot" data-v9-slot="telefone"></div>
        </div>
        <div class="tm-paciente-v9-row tm-paciente-v9-row-email">
          <div class="tm-paciente-v9-slot" data-v9-slot="email"></div>
        </div>
        <div class="tm-paciente-v9-row tm-paciente-v9-row-card">
          <div class="tm-paciente-v9-slot" data-v9-slot="carteira"></div>
          <div class="tm-paciente-v9-slot" data-v9-slot="validade"></div>
        </div>
      `;
    }

    if (title.nextSibling !== host) {
      personal.insertBefore(host, title.nextSibling);
    }

    return host;
  }

  function tmPacienteV9ApplyBirth(root) {
    const birthBlock = root.querySelector('.tm-paciente-v9-birth');
    if (!birthBlock) return;

    const input = birthBlock.querySelector('input[type="date"]');
    const inputGroup = birthBlock.querySelector('.input-group');
    if (!input || !inputGroup) return;

    const ageAppend = Array.from(birthBlock.querySelectorAll('.input-group-append')).find((append) =>
      append.querySelector('.input-group-text[title*="Idade"], .input-group-text[title*="idade"]')
    );

    if (!ageAppend) return;

    if (ageAppend.parentElement !== inputGroup) {
      inputGroup.appendChild(ageAppend);
    }

    ageAppend.classList.add('tm-birth-age-inline');

    const ageText = ageAppend.querySelector('.input-group-text[title*="Idade"], .input-group-text[title*="idade"]');
    if (ageText) {
      syncBirthAgeBadgeFontSafe(input, ageText);
      const age = calculateBirthAgeSafe(input.value);
      if (age) ageText.textContent = age;
    }
  }

  function tmPacienteV9ApplyObservation(root) {
    const obsTitleSmall = Array.from(root.querySelectorAll('small'))
      .find((small) => norm(small.textContent || '') === 'Observação');
    const obsTitle = obsTitleSmall ? obsTitleSmall.closest('.border-bottom') : null;
    if (!obsTitle) return;

    let obsRow = obsTitle.nextElementSibling;
    while (obsRow && !(obsRow.classList && obsRow.classList.contains('form-row'))) {
      obsRow = obsRow.nextElementSibling;
    }
    if (!obsRow) return;

    const inputBlock = obsRow.children[0] || null;
    const selectBlock = obsRow.children[1] || null;
    if (!inputBlock || !selectBlock) return;

    let host = root.querySelector('#tm-paciente-v9-observation-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tm-paciente-v9-observation-host';
      host.className = 'tm-paciente-v9-observation-host';
      host.innerHTML = `
        <div class="tm-paciente-v9-observation-title"></div>
        <div class="tm-paciente-v9-observation-input"></div>
        <div class="tm-paciente-v9-observation-select"></div>
      `;
    }

    if (obsTitle.parentElement && obsTitle.nextSibling !== host) {
      obsTitle.parentElement.insertBefore(host, obsTitle.nextSibling);
    }

    host.querySelector('.tm-paciente-v9-observation-title').appendChild(obsTitle);
    host.querySelector('.tm-paciente-v9-observation-input').appendChild(inputBlock);
    host.querySelector('.tm-paciente-v9-observation-select').appendChild(selectBlock);

    tmPacienteV9Hide(obsRow);

    ensureObservationTextarea(inputBlock);

    const textarea = inputBlock.querySelector('textarea, .tm-observation-textarea, .form-control');
    if (textarea) {
      textarea.classList.add('tm-paciente-v9-observation-textarea');
      textarea.style.setProperty('width', '509px', 'important');
      textarea.style.setProperty('max-width', '509px', 'important');
      textarea.style.setProperty('height', '84px', 'important');
      textarea.style.setProperty('min-height', '84px', 'important');
      textarea.style.setProperty('resize', 'none', 'important');
      textarea.style.setProperty('overflow-y', 'auto', 'important');
    }
  }

  function tmPacienteV9HideOriginalRows(root) {
    const personal = root.querySelector(':scope > .modal-body > .mt-3');
    if (!personal) return;

    personal.querySelectorAll(':scope > .form-row').forEach((row) => {
      if (row.querySelector('#tm-paciente-v9-host')) return;
      row.classList.add('tm-paciente-v9-hidden');
      row.style.setProperty('display', 'none', 'important');
    });
  }

  function tmPacienteV9Layout() {
    const root = getActivePacienteSchedulingModalRoot();
    if (!root) return;

    root.classList.add('tm-paciente-v9-root');

    if (root.dataset.tmPacienteV9Applied === '1') {
      tmPacienteV9ApplyBirth(root);
      return;
    }

    const dialog = root.closest('.modal-dialog');
    if (dialog) {
      dialog.style.setProperty('width', '580px', 'important');
      dialog.style.setProperty('max-width', '580px', 'important');
      dialog.style.setProperty('min-width', '580px', 'important');
      dialog.style.setProperty('margin-left', 'auto', 'important');
      dialog.style.setProperty('margin-right', 'auto', 'important');
    }

    root.style.setProperty('width', '580px', 'important');
    root.style.setProperty('max-width', '580px', 'important');
    root.style.setProperty('min-width', '580px', 'important');
    root.style.setProperty('overflow', 'hidden', 'important');

    const body = root.querySelector(':scope > .modal-body');
    if (body) {
      body.style.setProperty('padding-left', '0', 'important');
      body.style.setProperty('padding-right', '0', 'important');
      body.style.setProperty('overflow-x', 'hidden', 'important');
      body.style.setProperty('overflow-y', 'auto', 'important');
      body.style.setProperty('display', 'flex', 'important');
      body.style.setProperty('flex-direction', 'column', 'important');
      body.style.setProperty('align-items', 'center', 'important');
    }

    const footer = root.querySelector(':scope > .modal-footer');
    if (footer) {
      footer.style.setProperty('width', '509px', 'important');
      footer.style.setProperty('max-width', '509px', 'important');
      footer.style.setProperty('margin-left', 'auto', 'important');
      footer.style.setProperty('margin-right', 'auto', 'important');
      footer.style.setProperty('justify-content', 'flex-start', 'important');
    }

    const host = tmPacienteV9EnsureHost(root);
    if (!host) return;

    const nome = tmPacienteV9FindField(root, 'Nome do Paciente');
    const social = tmPacienteV9FindField(root, 'Nome Social');
    const nascimento = tmPacienteV9FindField(root, 'Data de Nascimento');
    const cpf = tmPacienteV9FindField(root, 'CPF');
    const sexo = tmPacienteV9FindField(root, 'Sexo');
    const origem = tmPacienteV9FindField(root, 'Origem de Pacientes');
    const celular = tmPacienteV9FindField(root, 'Celular');
    const telefone = tmPacienteV9FindField(root, 'Telefone');
    const email = tmPacienteV9FindField(root, 'e-mail');
    const carteira = tmPacienteV9FindField(root, 'No. da Carteira do Plano');
    const validade = tmPacienteV9FindField(root, 'Validade da Carteira');

    if (!nome || !nascimento || !sexo || !origem || !celular || !telefone || !email || !carteira || !validade) return;

    tmPacienteV9Move(host.querySelector('[data-v9-slot="nome"]'), nome, 'tm-paciente-v9-name');
    tmPacienteV9Move(host.querySelector('[data-v9-slot="nascimento"]'), nascimento, 'tm-paciente-v9-birth');

    if (cpf) {
      tmPacienteV9Move(host.querySelector('[data-v9-slot="cpf"]'), cpf, 'tm-paciente-v9-cpf');
    } else {
      const cpfSlot = host.querySelector('[data-v9-slot="cpf"]');
      if (cpfSlot) cpfSlot.remove();
    }

    tmPacienteV9Move(host.querySelector('[data-v9-slot="sexo"]'), sexo, 'tm-paciente-v9-sex');
    tmPacienteV9Move(host.querySelector('[data-v9-slot="origem"]'), origem, 'tm-paciente-v9-origin');

    tmPacienteV9Move(host.querySelector('[data-v9-slot="celular"]'), celular, 'tm-paciente-v9-cell');
    tmPacienteV9Move(host.querySelector('[data-v9-slot="telefone"]'), telefone, 'tm-paciente-v9-phone');
    tmPacienteV9Move(host.querySelector('[data-v9-slot="email"]'), email, 'tm-paciente-v9-email');

    tmPacienteV9Move(host.querySelector('[data-v9-slot="carteira"]'), carteira, 'tm-paciente-v9-card');
    tmPacienteV9Move(host.querySelector('[data-v9-slot="validade"]'), validade, 'tm-paciente-v9-valid');

    if (social) {
      social.classList.add('tm-paciente-v9-hidden');
      social.style.setProperty('display', 'none', 'important');
    }

    const origemTitle = Array.from(root.querySelectorAll('small'))
      .find((small) => norm(small.textContent || '') === 'ORIGEM DE PACIENTES');
    const origemTitleRow = origemTitle ? origemTitle.closest('.border-bottom') : null;
    const origemMainRow = origemTitleRow ? origemTitleRow.closest('.row') : null;
    tmPacienteV9Hide(origemTitleRow);
    tmPacienteV9Hide(origemMainRow);

    tmPacienteV9HideOriginalRows(root);
    tmPacienteV9ApplyObservation(root);
    tmPacienteV9ApplyBirth(root);

    root.dataset.tmPacienteV9Applied = '1';
  }

  function burstUpdateLite() {
    if (!isCallCenterRoute()) return;

    clearFirstVisitResidueFromPacienteModal();
    applyPacienteHeaderVisual();
    applyPacienteFieldsPhase3();
    applyPacienteSpacingPhase4();
    applyPacienteGridLayoutPhase5();
    tmPacienteV9Layout();

    const root = getSchedulingModalRoot();

    updateModalTitle();
    enableBirthDatePaste();
    injectLayoutCSS();
    injectFontFix();

    if (root) {
      hideAppointmentModalFields();
      reorganizeSchedulingModalLayout();
      enableBirthAgeBadgeSafe();
      resizeSchedulingModal();
      reorganizeHeaderStructure(root);
    }

    simplifyUnitsSafe();
  }

  function burstUpdate() {
    if (!isCallCenterRoute()) return;
    burstUpdateLite();
    setTimeout(burstUpdateLite, 100);
    setTimeout(burstUpdateLite, 250);
    setTimeout(burstUpdateLite, 500);
    setTimeout(burstUpdateLite, 900);
    setTimeout(burstUpdateLite, 1400);
  }

  document.addEventListener('click', (e) => {
    if (!isCallCenterRoute()) return;

    const pacienteCard = e.target instanceof Element
      ? e.target.closest('.card-body.atalho.bg-success')
      : null;

    if (pacienteCard) {
      setTimeout(() => {
        clearFirstVisitResidueFromPacienteModal();
        applyPacienteHeaderVisual();
        applyPacienteFieldsPhase3();
        applyPacienteSpacingPhase4();
        applyPacienteGridLayoutPhase5();
        tmPacienteV9Layout();
      }, 60);
      setTimeout(() => {
        clearFirstVisitResidueFromPacienteModal();
        applyPacienteHeaderVisual();
        applyPacienteFieldsPhase3();
        applyPacienteSpacingPhase4();
        applyPacienteGridLayoutPhase5();
        tmPacienteV9Layout();
      }, 160);
      setTimeout(() => {
        clearFirstVisitResidueFromPacienteModal();
        applyPacienteHeaderVisual();
        applyPacienteFieldsPhase3();
        applyPacienteSpacingPhase4();
        applyPacienteGridLayoutPhase5();
        tmPacienteV9Layout();
      }, 320);
    }

    if (!e.target.closest('#minutoModal')) {
      captureSelectionFromClick(e.target, false);
    }

    burstUpdate();
  }, true);

  document.addEventListener('focusin', () => {
    if (!isCallCenterRoute()) return;
    enableBirthDatePaste();
    hideAppointmentModalFields();
    reorganizeSchedulingModalLayout();
    enableBirthAgeBadgeSafe();
  }, true);

  document.addEventListener('contextmenu', async (e) => {
    if (!e.target.closest('#minutoModal')) return;

    const targetEl = e.target.closest('button, a, div, span');
    if (!targetEl || !isTimeButton(targetEl)) return;

    e.preventDefault();
    e.stopPropagation();

    const directCopyText = buildCopyTextFromTarget(targetEl);
    const changed = captureSelectionFromClick(e.target, true);
    if (!changed && !directCopyText) return;

    const modalContext = getModalDateContext();
    if (modalContext.dateText) state.selectedDate = modalContext.dateText;
    if (modalContext.weekdayText) state.selectedWeekday = modalContext.weekdayText;

    burstUpdate();

    setTimeout(async () => {
      await copyText(directCopyText || getCopyText(), targetEl);
    }, 80);
  }, true);


  function isKlingoHost() {
    return location.hostname.endsWith('klingo.app');
  }

  function injectDateCalculatorCSS() {
    if (document.getElementById('tm-datecalc-style')) return;

    const style = document.createElement('style');
    style.id = 'tm-datecalc-style';
    style.textContent = `
      .tm-datecalc-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 360px;
        max-width: calc(100vw - 24px);
        background: #ffffff;
        border: 1px solid #d7dbe2;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        z-index: 999995;
        overflow: hidden;
      }

      .tm-datecalc-hidden {
        display: none !important;
      }

      .tm-datecalc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        background: #1679e8;
        color: #fff;
      }

      .tm-datecalc-title {
        font-size: 16px;
        font-weight: 600;
        line-height: 1.2;
      }

      .tm-datecalc-close {
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
      }

      .tm-datecalc-body {
        padding: 14px;
      }

      .tm-datecalc-section + .tm-datecalc-section {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e7ebf0;
      }

      .tm-datecalc-grid {
        display: grid;
        grid-template-columns: 1fr 112px;
        gap: 10px 12px;
        align-items: end;
      }

      .tm-datecalc-field {
        min-width: 0;
      }

      .tm-datecalc-field label {
        display: block;
        margin-bottom: 6px;
        color: #6c757d;
        font-size: 13px;
        line-height: 1.2;
      }

      
      .tm-datecalc-field input[type="date"]::-webkit-calendar-picker-indicator {
        display: none !important;
        opacity: 0 !important;
      }

      .tm-datecalc-hoje-btn {
        height: 38px;
        padding: 0 10px;
        margin-left: 6px;
        border: 1px solid #ced4da;
        border-radius: .25rem;
        background: #f1f3f5;
        cursor: pointer;
        font-size: 13px;
      }

      .tm-datecalc-field input {
        width: 100%;
        height: 38px;
        border: 1px solid #ced4da;
        border-radius: .25rem;
        padding: 6px 10px;
        font-size: 15px;
        line-height: 1.2;
        color: #495057;
        background: #fff;
        box-sizing: border-box;
      }

      .tm-datecalc-field input:focus {
        outline: none;
        border-color: #80bdff;
        box-shadow: 0 0 0 .2rem rgba(0,123,255,.15);
      }

      .tm-datecalc-result-box,
      .tm-datecalc-days-box {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        margin-top: 12px;
        padding: 10px 12px;
        border: 1px solid #d9dee5;
        border-radius: 8px;
        background: #f7f9fb;
        text-align: center;
        box-sizing: border-box;
      }

      .tm-datecalc-result-box {
        color: #212529;
        font-weight: 600;
        line-height: 1.35;
      }

      .tm-datecalc-result-box small {
        display: block;
        margin-top: 2px;
        color: #6c757d;
        font-weight: 500;
      }

      .tm-datecalc-days-box {
        color: #212529;
        font-size: 16px;
        font-weight: 700;
      }

      [data-tm-datecalc-item="1"] {
        cursor: pointer !important;
      }

      .tm-datecalc-header-trigger-item {
        display: flex !important;
        align-items: center !important;
      }

      .tm-datecalc-header-trigger {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        align-self: stretch !important;
        height: 100% !important;
        min-height: 48px !important;
        padding: 0 12px !important;
        margin: 0 14px 0 0 !important;
        color: #ffffff !important;
        font-size: 28px !important;
        line-height: 1 !important;
        text-decoration: none !important;
        cursor: pointer !important;
        user-select: none !important;
        flex: 0 0 auto !important;
      }

      .tm-datecalc-header-trigger img {
        display: block !important;
        width: 22px !important;
        height: 22px !important;
      }

      .tm-datecalc-header-trigger:hover,
      .tm-datecalc-header-trigger:focus {
        color: #ffffff !important;
        text-decoration: none !important;
        opacity: 0.92 !important;
      }

      .tm-script-version-indicator {
        position: absolute !important;
        left: 50% !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        color: #ffffff !important;
        font-size: inherit !important;
        line-height: inherit !important;
        font-weight: inherit !important;
        font-family: inherit !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        user-select: none !important;
        z-index: 2 !important;
      }

      @media (max-width: 640px) {
        .tm-datecalc-panel {
          top: 76px;
          right: 10px;
          left: 10px;
          width: auto;
          max-width: none;
        }

        .tm-datecalc-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getDateCalculatorPanel() {
    return document.getElementById('tm-datecalc-panel');
  }

  function ensureDateCalculatorPanel() {
    let panel = getDateCalculatorPanel();
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'tm-datecalc-panel';
    panel.className = 'tm-datecalc-panel tm-datecalc-hidden';
    panel.innerHTML = `      <div class="tm-datecalc-body">
        <div class="tm-datecalc-section">
          <div class="tm-datecalc-grid">
            <div class="tm-datecalc-field">
              <label for="tm-datecalc-start">Data inicial</label>
              <div style="display:flex;align-items:center;">
              <input id="tm-datecalc-start" type="date" style="flex:1;">
              <button type="button" class="tm-datecalc-hoje-btn" data-tm-hoje="1">Hoje</button>
            </div>
            </div>
            <div class="tm-datecalc-field">
              <label for="tm-datecalc-days">Adicionar dias</label>
              <input id="tm-datecalc-days" type="number" step="1" placeholder="">
            </div>
          </div>
          <div class="tm-datecalc-result-box" id="tm-datecalc-result-date"></div>
        </div>

        <div class="tm-datecalc-section">
          <div class="tm-datecalc-grid">
            <div class="tm-datecalc-field" style="grid-column: 1 / -1;">
              <label for="tm-datecalc-end">Data final</label>
              <div style="display:flex;align-items:center;">
              <input id="tm-datecalc-end" type="date" style="flex:1;">
              <button type="button" class="tm-datecalc-hoje-btn" data-tm-hoje-end="1">Hoje</button>
            </div>
            </div>
          </div>
          <div class="tm-datecalc-days-box" id="tm-datecalc-result-days"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  
  function positionDateCalculatorPanel() {
    const panel = document.getElementById('tm-datecalc-panel');
    const trigger = document.querySelector('[data-tm-datecalc-header-trigger="1"]');
    if (!panel || !trigger) return;

    const rect = trigger.getBoundingClientRect();

    panel.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    panel.style.left = (rect.left + window.scrollX - 280) + 'px';
  }

function setDateCalculatorOpen(isOpen) {
    const panel = ensureDateCalculatorPanel();
    panel.classList.toggle('tm-datecalc-hidden', !isOpen);
    if (isOpen) positionDateCalculatorPanel();

    if (isOpen) {
      const startInput = panel.querySelector('#tm-datecalc-start');
      if (startInput) startInput.focus();
    }
  }

  function toggleDateCalculatorPanel() {
    const panel = ensureDateCalculatorPanel();
    setDateCalculatorOpen(panel.classList.contains('tm-datecalc-hidden'));
  }

  function parseIsoDateSafe(value) {
    const raw = norm(value || '');
    if (!raw) return null;

    let yyyy = 0;
    let mm = 0;
    let dd = 0;
    let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      yyyy = Number(match[1]);
      mm = Number(match[2]);
      dd = Number(match[3]);
    } else {
      match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) return null;
      dd = Number(match[1]);
      mm = Number(match[2]);
      yyyy = Number(match[3]);
    }

    const date = new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);

    if (
      date.getFullYear() !== yyyy ||
      date.getMonth() !== mm - 1 ||
      date.getDate() !== dd
    ) {
      return null;
    }

    return date;
  }

  function addDaysSafe(date, days) {
    const amount = Number(days);
    if (!(date instanceof Date) || Number.isNaN(amount)) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12, 0, 0, 0);
  }

  function diffDaysSafe(startDate, endDate) {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) return null;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round(diffMs / 86400000);
  }

  function formatDatePtBrFull(date) {
    if (!(date instanceof Date)) return '';
    const weekday = WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1] || '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = monthNameFromNumber(String(date.getMonth() + 1).padStart(2, '0'));
    const year = date.getFullYear();
    return `${weekday}, ${day} de ${month} de ${year}`;
  }

  function formatDatePtBrShort(date) {
    if (!(date instanceof Date)) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function refreshDateCalculatorResults() {
    const panel = getDateCalculatorPanel();
    if (!panel) return;

    const startInput = panel.querySelector('#tm-datecalc-start');
    const daysInput = panel.querySelector('#tm-datecalc-days');
    const endInput = panel.querySelector('#tm-datecalc-end');
    const resultDate = panel.querySelector('#tm-datecalc-result-date');
    const resultDays = panel.querySelector('#tm-datecalc-result-days');

    if (!startInput || !daysInput || !endInput || !resultDate || !resultDays) return;

    const startDate = parseIsoDateSafe(startInput.value);
    const endDate = parseIsoDateSafe(endInput.value);
    const daysValue = norm(daysInput.value);

    if (startDate && daysValue !== '' && !Number.isNaN(Number(daysValue))) {
      const targetDate = addDaysSafe(startDate, Number(daysValue));
      resultDate.textContent = targetDate
        ? formatDatePtBrShort(targetDate)
        : 'Não foi possível calcular a data.';
    } else {
      resultDate.textContent = '';
    }

    if (startDate && endDate) {
      const totalDays = diffDaysSafe(startDate, endDate);
      if (totalDays === null) {
        resultDays.textContent = 'Não foi possível calcular a diferença.';
      } else {
        const label = Math.abs(totalDays) === 1 ? 'dia' : 'dias';
        resultDays.textContent = `${totalDays} ${label}`;
      }
    } else {
      resultDays.textContent = '';
    }
  }

  function getCurrentScriptVersion() {
    const version = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version)
      ? String(GM_info.script.version)
      : '9.0';
    const match = version.match(/\d+(?:\.\d+)?/);
    return match ? match[0] : '9.0';
  }

  function ensureScriptVersionIndicator() {
    const navbar = document.querySelector('nav.navbar');
    if (!navbar) return;

    navbar.style.setProperty('position', 'relative', 'important');

    let indicator = navbar.querySelector('#tm-script-version-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'tm-script-version-indicator';
      indicator.className = 'tm-script-version-indicator';
      navbar.appendChild(indicator);
    }

    const expected = `🧪 V${getCurrentScriptVersion()}`;
    if (indicator.textContent !== expected) {
      indicator.textContent = expected;
    }

    const companyText = navbar.querySelector('.text-white');
    if (companyText) {
      const cs = window.getComputedStyle(companyText);
      indicator.style.setProperty('font-size', cs.fontSize, 'important');
      indicator.style.setProperty('line-height', cs.lineHeight, 'important');
      indicator.style.setProperty('font-weight', cs.fontWeight, 'important');
      indicator.style.setProperty('font-family', cs.fontFamily, 'important');
    }
  }

  function startHeaderToolsInitialRenderSafe() {
    if (!isKlingoHost()) return;

    clearTimeout(startHeaderToolsInitialRenderSafe._timer);

    let attempts = 0;
    const maxAttempts = 24;

    const run = () => {
      attempts += 1;

      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();

      const hasCalculator = !!document.querySelector('[data-tm-datecalc-header-trigger="1"]');
      const hasVersion = !!document.querySelector('#tm-script-version-indicator');

      if (hasCalculator && hasVersion) return;
      if (attempts >= maxAttempts) return;

      startHeaderToolsInitialRenderSafe._timer = setTimeout(run, 250);
    };

    run();
  }

  function getDateCalculatorHeaderHost() {
    return document.querySelector('nav.navbar ul.navbar-nav.ml-auto');
  }

  function ensureDateCalculatorHeaderTrigger() {
    const host = getDateCalculatorHeaderHost();
    if (!host) return;

    if (host.querySelector('[data-tm-datecalc-header-trigger="1"]')) return;

    const patientItem = host.querySelector('li');
    const triggerLi = document.createElement('li');
    triggerLi.className = 'nav-item tm-datecalc-header-trigger-item';

    const trigger = document.createElement('a');
    trigger.href = '#';
    trigger.className = 'nav-link tm-datecalc-header-trigger';
    trigger.setAttribute('data-tm-datecalc-header-trigger', '1');
    trigger.setAttribute('title', 'Calculadora de datas');
    trigger.setAttribute('aria-label', 'Calculadora de datas');
    trigger.innerHTML = '<img src="https://i.imgur.com/GU5gE57.png" style="width:22px;height:22px;">';

    triggerLi.appendChild(trigger);

    if (patientItem) {
      host.insertBefore(triggerLi, patientItem);
    } else {
      host.appendChild(triggerLi);
    }
  }

  function isElementVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return !!(rect.width || rect.height);
  }

  function findDateCalculatorMenuContainer() {
    const menu = document.querySelector('#creek-dropdown.dropdown-menu');
    if (!menu) return null;

    const text = norm(menu.textContent || '');
    if (!text.includes('Sair')) return null;
    if (!text.includes('Alterar minha senha')) return null;

    return menu;
  }

  function findExitActionInMenu(menu) {
    if (!menu) return null;

    const actions = Array.from(menu.querySelectorAll('a, button, div, li, span'));
    for (const action of actions) {
      if (!isElementVisible(action)) continue;
      if (norm(action.textContent) !== 'Sair') continue;

      const anchor =
        action.closest('a, button, .dropdown-item, [role="menuitem"], li, div') ||
        action.parentElement;

      if (anchor && anchor !== menu) return anchor;
    }

    return null;
  }

  function ensureDateCalculatorMenuItem() {
    return;
  }

  function scheduleDateCalculatorMenuRefresh() {
    if (!isKlingoHost()) return;
    clearTimeout(scheduleDateCalculatorMenuRefresh._timer);
    scheduleDateCalculatorMenuRefresh._timer = setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
      ensureDateCalculatorMenuItem();
    }, 120);
  }

  function bindDateCalculatorEvents() {
    if (document.body.dataset.tmDatecalcBound === '1') return;
    document.body.dataset.tmDatecalcBound = '1';

    document.addEventListener('click', (e) => {
      const headerTrigger = e.target.closest('[data-tm-datecalc-header-trigger="1"]');
      if (headerTrigger) {
        e.preventDefault();
        e.stopPropagation();
        toggleDateCalculatorPanel();
        return;
      }

      const menuItem = e.target.closest('[data-tm-datecalc-item="1"]');
      if (menuItem) {
        e.preventDefault();
        e.stopPropagation();
        toggleDateCalculatorPanel();
        return;
      }

      const hojeEndBtn = e.target.closest('[data-tm-hoje-end="1"]');
      if (hojeEndBtn) {
        e.preventDefault();
        const input = document.getElementById('tm-datecalc-end');
        if (input) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth()+1).padStart(2,'0');
          const dd = String(today.getDate()).padStart(2,'0');
          input.value = `${yyyy}-${mm}-${dd}`;
          input.dispatchEvent(new Event('input', {bubbles:true}));
        }
        return;
      }

      const hojeBtn = e.target.closest('[data-tm-hoje="1"]');
      if (hojeBtn) {
        e.preventDefault();
        const input = document.getElementById('tm-datecalc-start');
        if (input) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth()+1).padStart(2,'0');
          const dd = String(today.getDate()).padStart(2,'0');
          input.value = `${yyyy}-${mm}-${dd}`;
          input.dispatchEvent(new Event('input', {bubbles:true}));
        }
        return;
      }

            const closeBtn = e.target.closest('[data-tm-datecalc-close="1"]');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        setDateCalculatorOpen(false);
        return;
      }

      const avatarToggle = e.target.closest('#navbarDropdown');
      if (avatarToggle) {
        scheduleDateCalculatorMenuRefresh();
        setTimeout(scheduleDateCalculatorMenuRefresh, 80);
        setTimeout(scheduleDateCalculatorMenuRefresh, 180);
        setTimeout(scheduleDateCalculatorMenuRefresh, 320);
        return;
      }

      scheduleDateCalculatorMenuRefresh();
    }, true);

    document.addEventListener('input', (e) => {
      if (!e.target.closest('#tm-datecalc-panel')) return;
      refreshDateCalculatorResults();
  window.addEventListener('resize', positionDateCalculatorPanel);
  window.addEventListener('scroll', positionDateCalculatorPanel, true);

    }, true);

    document.addEventListener('change', (e) => {
      if (!e.target.closest('#tm-datecalc-panel')) return;
      refreshDateCalculatorResults();
    }, true);

    window.addEventListener('hashchange', () => {
      scheduleDateCalculatorMenuRefresh();
      startHeaderToolsInitialRenderSafe();
    }, true);

    window.addEventListener('focus', () => {
      scheduleDateCalculatorMenuRefresh();
      startHeaderToolsInitialRenderSafe();
    }, true);
  }

  function initDateCalculatorFeature() {
    if (!isKlingoHost()) return;
    injectDateCalculatorCSS();
    ensureDateCalculatorPanel();
    ensureDateCalculatorHeaderTrigger();
    ensureScriptVersionIndicator();
    bindDateCalculatorEvents();
    refreshDateCalculatorResults();
    scheduleDateCalculatorMenuRefresh();
    setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
    }, 120);
    setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
    }, 300);
    setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
    }, 700);

    startHeaderToolsInitialRenderSafe();
  }

  const observer = new MutationObserver(() => {
    applyLoginIndicator();
    enableBirthDatePaste();
    burstUpdateLite();
    scheduleDateCalculatorMenuRefresh();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  function initScript() {
    applyLoginIndicator();
    initDateCalculatorFeature();
    if (!isCallCenterRoute()) return;
    enableBirthDatePaste();
    injectLayoutCSS();
    injectFontFix();
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
    if (!isCallCenterRoute()) return;
    enableBirthDatePaste();
    burstUpdate();
  });
  window.addEventListener('hashchange', initScript);

  setInterval(() => {
    if (location.hostname.endsWith('klingo.app')) {
      applyLoginIndicator();
      if (!isCallCenterRoute()) return;
      enableBirthDatePaste();
      burstUpdate();
    }
  }, 1500);
})();
