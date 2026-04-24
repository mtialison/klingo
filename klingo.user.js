// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      7.2
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


      /* PACIENTE - MODAL ATIVO SEM #cadTemp */
      .tm-paciente-root {
        width: 580px !important;
        max-width: 580px !important;
        min-width: 580px !important;
        overflow: hidden !important;
      }

      .tm-paciente-root .modal-body {
        padding-left: 0 !important;
        padding-right: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }

      .tm-paciente-root .tm-paciente-section,
      .tm-paciente-root .tm-paciente-layout,
      .tm-paciente-root .tm-paciente-observation,
      .tm-paciente-root #myTab,
      .tm-paciente-root #myTabContent,
      .tm-paciente-root .tab-content,
      .tm-paciente-root .tab-pane,
      .tm-paciente-root .tab-pane > .mt-3,
      .tm-paciente-root .modal-footer {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        box-sizing: border-box !important;
      }

      .tm-paciente-root .tm-paciente-row {
        display: grid !important;
        gap: 10px 12px !important;
        margin-bottom: 10px !important;
        align-items: end !important;
      }

      .tm-paciente-root .tm-paciente-row-name {
        grid-template-columns: 342px 155px !important;
      }

      .tm-paciente-root .tm-paciente-row-origin {
        grid-template-columns: 155px 342px !important;
      }

      .tm-paciente-root .tm-paciente-row-phone {
        grid-template-columns: 155px 155px 187px !important;
      }

      .tm-paciente-root .tm-paciente-row-card {
        grid-template-columns: 342px 155px !important;
      }

      .tm-paciente-root .tm-paciente-slot,
      .tm-paciente-root .tm-paciente-slot > .col,
      .tm-paciente-root .tm-paciente-slot > [class*="col-"] {
        min-width: 0 !important;
        width: 100% !important;
        max-width: none !important;
        flex: unset !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      .tm-paciente-root .tm-paciente-slot .form-group {
        margin-bottom: 0 !important;
      }

      .tm-paciente-root .tm-paciente-slot .input-group,
      .tm-paciente-root .tm-paciente-slot .form-control,
      .tm-paciente-root .tm-paciente-slot input,
      .tm-paciente-root .tm-paciente-slot select,
      .tm-paciente-root .tm-paciente-slot textarea {
        width: 100% !important;
      }

      .tm-paciente-hidden {
        display: none !important;
      }

      .tm-paciente-root .list-group,
      .tm-paciente-root .list-group-item.list-group-item-success {
        width: 509px !important;
        max-width: 509px !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      .tm-paciente-root .list-group-item.list-group-item-success {
        background: #d5edff !important;
        color: #003358 !important;
        border-color: #b7d9ee !important;
        padding: 12px 14px !important;
      }

      .tm-paciente-root .list-group-item.list-group-item-success,
      .tm-paciente-root .list-group-item.list-group-item-success * {
        color: #003358 !important;
      }

      .tm-paciente-root .tm-procedure-title {
        display: block !important;
        margin-bottom: 8px !important;
        font-size: 20px !important;
        line-height: 1.25 !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
      }

      .tm-paciente-root .tm-header-line {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 6px 10px !important;
        margin-bottom: 6px !important;
        line-height: 1.3 !important;
      }

      .tm-paciente-root .tm-header-line,
      .tm-paciente-root .tm-header-line * {
        font-size: 12px !important;
      }

      .tm-paciente-root .tm-header-line small .text-muted {
        display: none !important;
      }

      .tm-paciente-root [data-paciente-slot="nascimento"] .input-group {
        position: relative !important;
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      .tm-paciente-root [data-paciente-slot="nascimento"] input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0 !important;
        display: none !important;
        -webkit-appearance: none !important;
      }

      .tm-paciente-root [data-paciente-slot="nascimento"] input[type="date"] {
        -webkit-appearance: none !important;
        appearance: none !important;
        background-image: none !important;
        padding-right: 46px !important;
      }

      .tm-paciente-root [data-paciente-slot="nascimento"] .tm-birth-age-inline {
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

      .tm-paciente-root [data-paciente-slot="nascimento"] .tm-birth-age-inline .input-group-text {
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

      const hasDadosPessoais = text.includes('Dados Pessoais');
      const hasOrigemPacientes = text.includes('ORIGEM DE PACIENTES') || text.includes('Origem de Pacientes');
      const hasConfirmar = successTexts.some(txt => txt.includes('Confirmar'));
      const hasAtualizar = successTexts.some(txt => txt.includes('Atualizar'));

      if (modalTitle.includes('Editar Marcação')) continue;
      if (hasAtualizar && !hasConfirmar) continue;

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
    if (!isCallCenterRoute()) return;

    const listGroup = root.querySelector('.list-group');
    if (!listGroup) return;

    const headerItems = listGroup.querySelectorAll(':scope > .list-group-item.list-group-item-success, :scope > .list-group-item.list-group-item-info, :scope > .list-group-item.list-group-item-warning, :scope > .list-group-item.list-group-item-secondary, :scope > .list-group-item.list-group-item-danger');
    if (!headerItems.length) return;

    const paymentSourceItem = listGroup.querySelector(':scope > .list-group-item:not(.list-group-item-success):not(.list-group-item-info)');
    const paymentSourceSmall = paymentSourceItem ? paymentSourceItem.querySelector('small.lead') : null;

    headerItems.forEach((headerItem) => {
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

      const spans = Array.from(leftMeta.querySelectorAll(':scope > span'));
      const paymentOwn = spans.find((span) => span.querySelector('.fa-credit-card'));
      const doctorNode = spans.find((span) => span.querySelector('.fa-user-md')) || null;
      const unitNode = spans.find((span) => span.querySelector('.fa-building')) || null;

      let paymentNode = null;
      if (paymentOwn) {
        paymentNode = paymentOwn;
      } else if (paymentSourceSmall) {
        const wrapper = document.createElement('span');
        wrapper.className = 'mr-3';
        wrapper.appendChild(paymentSourceSmall.cloneNode(true));
        paymentNode = wrapper;
      }

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
    });

    if (paymentSourceItem && headerItems.length > 1) {
      paymentSourceItem.style.display = 'none';
    }
  }

  function resizeSchedulingModal() {
    if (!isCallCenterRoute()) return;
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
    if (!isCallCenterRoute()) return;
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
    if (!isCallCenterRoute()) return;
    const root = getSchedulingModalRoot();
    if (!root) return;

    const telefoneBlock = findColByLabel(root, 'Telefone');
    const nomeSocialBlock = findColByLabel(root, 'Nome Social');
    const materialBlock = findMaterialBlock(root);

    hideElement(telefoneBlock);
    hideElement(nomeSocialBlock);
    hideElement(materialBlock);
  }



  function forceObservationSelectHeight() {
    if (!isCallCenterRoute()) return;
    const root = getSchedulingModalRoot();
    if (!root) return;

    const slot = root.querySelector('.tm-field-slot[data-slot="observacao-select"]');
    if (!slot) return;

    const els = [
      slot,
      slot.querySelector(':scope > .col'),
      slot.querySelector('.form-group'),
      slot.querySelector('.input-group'),
      slot.querySelector('.input-group-prepend'),
      slot.querySelector('.input-group-text'),
      slot.querySelector('select')
    ];

    els.forEach((el) => {
      if (!el) return;
      el.style.setProperty('height', '34px', 'important');
      el.style.setProperty('min-height', '34px', 'important');
      el.style.setProperty('max-height', '34px', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('box-sizing', 'border-box', 'important');
    });

    const select = slot.querySelector('select');
    if (select) {
      select.style.setProperty('line-height', '34px', 'important');
      select.style.setProperty('padding-top', '0', 'important');
      select.style.setProperty('padding-bottom', '0', 'important');
    }

    const inputText = slot.querySelector('.input-group-text');
    if (inputText) {
      inputText.style.setProperty('display', 'flex', 'important');
      inputText.style.setProperty('align-items', 'center', 'important');
      inputText.style.setProperty('padding-left', '8px', 'important');
      inputText.style.setProperty('padding-right', '8px', 'important');
    }
  }


  function forceObservationSelectHeightExact() {
    if (!isCallCenterRoute()) return;
    const root = getSchedulingModalRoot();
    if (!root) return;

    const slot = root.querySelector('.tm-field-slot[data-slot="observacao-select"]');
    if (!slot) return;

    const col = slot.querySelector(':scope > .col.col-12.col-md-3');
    const formGroup = slot.querySelector(':scope > .col.col-12.col-md-3 > .form-group.mb-1');
    const inputGroup = slot.querySelector('.input-group.input-group-sm');
    const prepend = slot.querySelector('.input-group-prepend');
    const inputText = slot.querySelector('.input-group-text');
    const select = slot.querySelector('select.form.form-control, select.form-control, select');

    [slot, col, formGroup, inputGroup, prepend, inputText, select].forEach((el) => {
      if (!el) return;
      el.style.setProperty('height', '30px', 'important');
      el.style.setProperty('min-height', '30px', 'important');
      el.style.setProperty('max-height', '30px', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('box-sizing', 'border-box', 'important');
    });

    if (col) {
      col.style.setProperty('padding-top', '0', 'important');
      col.style.setProperty('padding-bottom', '0', 'important');
    }

    if (formGroup) {
      formGroup.style.setProperty('margin-bottom', '0', 'important');
    }

    if (select) {
      select.style.setProperty('line-height', '30px', 'important');
      select.style.setProperty('padding-top', '0', 'important');
      select.style.setProperty('padding-bottom', '0', 'important');
    }

    if (inputText) {
      inputText.style.setProperty('display', 'flex', 'important');
      inputText.style.setProperty('align-items', 'center', 'important');
      inputText.style.setProperty('padding-left', '8px', 'important');
      inputText.style.setProperty('padding-right', '8px', 'important');
    }
  }


  function simplifyUnitsSafe() {
    if (!isCallCenterRoute()) return;

    const root = getSchedulingModalRoot();
    if (!root) return;

    root.querySelectorAll('.tm-header-line-3 span.mr-2 small.lead').forEach((el) => {
      if (el.dataset.tmUnitShortApplied === '1') return;

      const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
      let unit = '';

      if (raw.includes('COPACABANA')) unit = 'COPACABANA';
      else if (raw.includes('BARRA')) unit = 'BARRA';
      else if (raw.includes('SAMEC')) unit = 'SAMEC';
      else if (raw.includes('BANGU')) unit = 'BANGU';
      else return;

      const consultorio = el.querySelector('small.text-muted');
      if (consultorio) {
        consultorio.style.display = 'none';
      }

      const icon = el.querySelector('i');
      const shortTextClass = 'tm-unit-short-text';
      let shortText = el.querySelector('.' + shortTextClass);

      if (!shortText) {
        shortText = document.createElement('span');
        shortText.className = shortTextClass;

        if (icon) {
          if (icon.nextSibling) {
            icon.parentNode.insertBefore(shortText, icon.nextSibling);
          } else {
            el.appendChild(shortText);
          }
        } else {
          el.insertBefore(shortText, el.firstChild);
        }
      }

      // remove apenas nós de texto soltos, sem destruir a estrutura do elemento
      Array.from(el.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = '';
        }
      });

      shortText.textContent = ' ' + unit + ' ';
      el.dataset.tmUnitShortApplied = '1';
    });
  }



  function calculateBirthAgeSafe(isoValue) {
    if (!isoValue || !/^\d{4}-\d{2}-\d{2}$/.test(isoValue)) return '';

    const [yyyy, mm, dd] = isoValue.split('-').map(Number);
    const birth = new Date(yyyy, mm - 1, dd);

    if (
      birth.getFullYear() !== yyyy ||
      birth.getMonth() !== mm - 1 ||
      birth.getDate() !== dd
    ) return '';

    const today = new Date();
    let age = today.getFullYear() - yyyy;
    const monthDiff = today.getMonth() - (mm - 1);
    const dayDiff = today.getDate() - dd;

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
    if (age < 0 || age > 130) return '';

    return String(age);
  }

  function findBirthAgeElements(root) {
    const birthSlot = root.querySelector('[data-slot="nascimento"]');
    if (!birthSlot) return {};

    const input = birthSlot.querySelector('input[type="date"]');
    const inputGroup = birthSlot.querySelector('.input-group');
    if (!input || !inputGroup) return { birthSlot, input, inputGroup };

    const appends = Array.from(birthSlot.querySelectorAll('.input-group-append'));
    let ageAppend = null;

    appends.forEach((append) => {
      const ageText = append.querySelector('.input-group-text[title*="Idade"], .input-group-text[title*="idade"]');
      if (ageText) ageAppend = append;
    });

    return { birthSlot, input, inputGroup, ageAppend };
  }


  function syncBirthAgeBadgeFontSafe(input, ageText) {
    if (!input || !ageText) return;

    const style = window.getComputedStyle(input);
    if (!style) return;

    ageText.style.setProperty('font-size', style.fontSize, 'important');
    ageText.style.setProperty('font-family', style.fontFamily, 'important');
    ageText.style.setProperty('font-weight', style.fontWeight, 'important');
    ageText.style.setProperty('line-height', style.lineHeight, 'important');
    ageText.style.setProperty('letter-spacing', style.letterSpacing, 'important');
  }

  function applyBirthAgeBadgeSafe() {
    if (!isCallCenterRoute()) return;

    const root = getSchedulingModalRoot();
    if (!root) return;

    const { input, inputGroup, ageAppend } = findBirthAgeElements(root);
    if (!input || !inputGroup || !ageAppend) return;

    if (ageAppend.parentElement !== inputGroup) {
      inputGroup.appendChild(ageAppend);
    }

    ageAppend.classList.add('tm-birth-age-inline');

    const ageText = ageAppend.querySelector('.input-group-text[title*="Idade"], .input-group-text[title*="idade"]');
    if (!ageText) return;

    syncBirthAgeBadgeFontSafe(input, ageText);

    const age = calculateBirthAgeSafe(input.value);
    if (!age) {
      ageAppend.classList.add('tm-age-hidden');
      return;
    }

    const currentDigits = (ageText.textContent || '').replace(/\D+/g, '');
    if (currentDigits !== age) {
      ageText.textContent = age;
    }

    ageAppend.classList.remove('tm-age-hidden');
  }

  function enableBirthAgeBadgeSafe() {
    if (!isCallCenterRoute()) return;

    const root = getSchedulingModalRoot();
    if (!root) return;

    const { input } = findBirthAgeElements(root);
    if (!input) return;

    if (input.dataset.tmBirthAgeBadgeBound !== '1') {
      input.dataset.tmBirthAgeBadgeBound = '1';

      let debounceId = null;
      const handler = () => {
        clearTimeout(debounceId);
        debounceId = setTimeout(() => {
          applyBirthAgeBadgeSafe();
        }, 80);
      };

      input.addEventListener('input', handler, true);
      input.addEventListener('change', handler, true);
      input.addEventListener('blur', handler, true);
    }

    applyBirthAgeBadgeSafe();
  }



  function pacienteLabelBlock(scope, labelText) {
    if (!scope) return null;

    const labels = Array.from(scope.querySelectorAll('small.form-text, small'));
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

  function getPacienteActiveModalRoot() {
    const activeModals = Array.from(document.querySelectorAll('#cadastroModal, .modal.show, .modal.fade.show'))
      .filter((modal) => {
        if (modal.id === 'minutoModal') return false;

        const style = window.getComputedStyle(modal);
        const rect = modal.getBoundingClientRect();

        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0
        );
      });

    let root = null;

    for (const modal of activeModals) {
      const candidate =
        modal.querySelector(':scope > .modal-dialog.modal-xl.modal-dialog-scrollable > .modal-content') ||
        modal.querySelector('.modal-dialog.modal-xl.modal-dialog-scrollable > .modal-content');

      if (!candidate) continue;

      const candidateBody = candidate.querySelector(':scope > .modal-body');
      const candidatePersonal = candidateBody ? candidateBody.querySelector(':scope > .mt-3') : null;

      if (
        candidatePersonal &&
        pacienteLabelBlock(candidatePersonal, 'Nome do Paciente') &&
        pacienteLabelBlock(candidatePersonal, 'Nome Social') &&
        pacienteLabelBlock(candidatePersonal, 'Telefone')
      ) {
        root = candidate;
        break;
      }
    }

    if (!root) return null;
    const body = root.querySelector(':scope > .modal-body');
    const personal = body ? body.querySelector(':scope > .mt-3') : null;
    if (!body || !personal) return null;

    const required = [
      'Nome do Paciente',
      'Nome Social',
      'Sexo',
      'Data de Nascimento',
      'e-mail',
      'Telefone',
      'Celular',
      'No. da Carteira do Plano',
      'Validade da Carteira'
    ];

    if (!required.every((label) => !!pacienteLabelBlock(personal, label))) return null;
    if (!pacienteLabelBlock(root, 'Origem de Pacientes')) return null;

    root.classList.add('tm-paciente-root');
    return root;
  }

  function pacienteHide(el) {
    if (!el) return;
    el.classList.add('tm-paciente-hidden');
    el.style.setProperty('display', 'none', 'important');
  }

  function pacienteMove(slot, block) {
    if (!slot || !block) return;
    if (block.parentElement === slot) return;
    slot.appendChild(block);
  }

  function pacienteEnsureHost(personal) {
    let title = personal.querySelector('#tm-paciente-dados-title');
    if (!title) {
      title = document.createElement('div');
      title.id = 'tm-paciente-dados-title';
      title.className = 'border-bottom mb-1 d-flex justify-content-between hover-title-bg text-primary tm-paciente-section';
      title.innerHTML = '<div><small>Dados Pessoais</small></div><div></div>';
      personal.insertBefore(title, personal.firstChild);
    }

    let host = personal.querySelector('#tm-paciente-layout');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tm-paciente-layout';
      host.className = 'tm-paciente-layout';
      host.innerHTML = `
        <div class="tm-paciente-row tm-paciente-row-name">
          <div class="tm-paciente-slot" data-paciente-slot="nome"></div>
          <div class="tm-paciente-slot" data-paciente-slot="nascimento"></div>
        </div>
        <div class="tm-paciente-row tm-paciente-row-origin">
          <div class="tm-paciente-slot" data-paciente-slot="sexo"></div>
          <div class="tm-paciente-slot" data-paciente-slot="origem"></div>
        </div>
        <div class="tm-paciente-row tm-paciente-row-phone">
          <div class="tm-paciente-slot" data-paciente-slot="telefone"></div>
          <div class="tm-paciente-slot" data-paciente-slot="celular"></div>
          <div class="tm-paciente-slot" data-paciente-slot="email"></div>
        </div>
        <div class="tm-paciente-row tm-paciente-row-card">
          <div class="tm-paciente-slot" data-paciente-slot="carteira"></div>
          <div class="tm-paciente-slot" data-paciente-slot="validade"></div>
        </div>
      `;
    }

    if (title.nextSibling !== host) {
      personal.insertBefore(host, title.nextSibling);
    }

    return host;
  }

  function pacienteApplyOrigin(root, host) {
    const origem = pacienteLabelBlock(root, 'Origem de Pacientes');
    pacienteMove(host.querySelector('[data-paciente-slot="origem"]'), origem);

    const origemTitle = Array.from(root.querySelectorAll('small'))
      .find((small) => norm(small.textContent || '') === 'ORIGEM DE PACIENTES');
    const titleRow = origemTitle ? origemTitle.closest('.border-bottom') : null;
    const row = titleRow ? titleRow.closest('.row') : null;

    pacienteHide(titleRow);
    pacienteHide(row);
  }

  function pacienteApplyObservation(root) {
    const obsTitleSmall = Array.from(root.querySelectorAll('small'))
      .find((small) => norm(small.textContent || '') === 'Observação');
    const obsTitle = obsTitleSmall ? obsTitleSmall.closest('.border-bottom') : null;
    if (!obsTitle) return;

    let row = obsTitle.nextElementSibling;
    while (row && !(row.classList && row.classList.contains('form-row'))) {
      row = row.nextElementSibling;
    }
    if (!row) return;

    const inputBlock = row.children[0] || null;
    const selectBlock = row.children[1] || null;
    if (!inputBlock || !selectBlock) return;

    obsTitle.classList.add('tm-paciente-section');

    let host = root.querySelector('#tm-paciente-observation');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tm-paciente-observation';
      host.className = 'tm-paciente-observation tm-observation-layout';
      host.innerHTML = `
        <div class="tm-paciente-slot" data-paciente-slot="observacao-input"></div>
        <div class="tm-paciente-slot" data-paciente-slot="observacao-select"></div>
      `;
    }

    if (obsTitle.nextSibling !== host) {
      obsTitle.parentElement.insertBefore(host, obsTitle.nextSibling);
    }

    pacienteMove(host.querySelector('[data-paciente-slot="observacao-input"]'), inputBlock);
    pacienteMove(host.querySelector('[data-paciente-slot="observacao-select"]'), selectBlock);
    pacienteHide(row);
    ensureObservationTextarea(inputBlock);
  }

  function pacienteApplyBirth(root) {
    const slot = root.querySelector('[data-paciente-slot="nascimento"]');
    if (!slot) return;

    const input = slot.querySelector('input[type="date"]');
    const inputGroup = slot.querySelector('.input-group');
    if (!input || !inputGroup) return;

    const ageAppend = Array.from(slot.querySelectorAll('.input-group-append')).find((append) =>
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

  function pacienteResize(root) {
    const dialog = root.closest('.modal-dialog');
    if (!dialog) return;

    dialog.style.setProperty('width', '580px', 'important');
    dialog.style.setProperty('max-width', '580px', 'important');
    dialog.style.setProperty('min-width', '580px', 'important');

    root.style.setProperty('width', '580px', 'important');
    root.style.setProperty('max-width', '580px', 'important');
    root.style.setProperty('min-width', '580px', 'important');

    const footer = root.querySelector(':scope > .modal-footer');
    if (footer) {
      footer.style.setProperty('width', '509px', 'important');
      footer.style.setProperty('max-width', '509px', 'important');
      footer.style.setProperty('margin-left', 'auto', 'important');
      footer.style.setProperty('margin-right', 'auto', 'important');
      footer.style.setProperty('justify-content', 'flex-start', 'important');
    }
  }

  function applyPacienteActiveModalLayout() {
    const root = getPacienteActiveModalRoot();
    if (!root) return;

    const body = root.querySelector(':scope > .modal-body');
    const personal = body ? body.querySelector(':scope > .mt-3') : null;
    if (!body || !personal) return;

    const nome = pacienteLabelBlock(personal, 'Nome do Paciente');
    const nomeSocial = pacienteLabelBlock(personal, 'Nome Social');
    const sexo = pacienteLabelBlock(personal, 'Sexo');
    const birth = pacienteLabelBlock(personal, 'Data de Nascimento');
    const email = pacienteLabelBlock(personal, 'e-mail');
    const telefone = pacienteLabelBlock(personal, 'Telefone');
    const celular = pacienteLabelBlock(personal, 'Celular');
    const carteira = pacienteLabelBlock(personal, 'No. da Carteira do Plano');
    const validade = pacienteLabelBlock(personal, 'Validade da Carteira');

    if (!nome || !sexo || !birth || !email || !telefone || !celular || !carteira || !validade) return;

    const host = pacienteEnsureHost(personal);

    pacienteMove(host.querySelector('[data-paciente-slot="nome"]'), nome);
    pacienteMove(host.querySelector('[data-paciente-slot="nascimento"]'), birth);
    pacienteMove(host.querySelector('[data-paciente-slot="sexo"]'), sexo);
    pacienteMove(host.querySelector('[data-paciente-slot="telefone"]'), telefone);
    pacienteMove(host.querySelector('[data-paciente-slot="celular"]'), celular);
    pacienteMove(host.querySelector('[data-paciente-slot="email"]'), email);
    pacienteMove(host.querySelector('[data-paciente-slot="carteira"]'), carteira);
    pacienteMove(host.querySelector('[data-paciente-slot="validade"]'), validade);

    pacienteApplyOrigin(root, host);
    pacienteHide(nomeSocial);

    personal.querySelectorAll(':scope > .form-row').forEach(pacienteHide);

    pacienteApplyObservation(root);
    pacienteApplyBirth(root);
    pacienteResize(root);
    reorganizeHeaderStructure(root);
    simplifyUnitsSafe();
  }

  function burstUpdateLite() {
    if (!isCallCenterRoute()) return;
    const root = getSchedulingModalRoot();
    updateModalTitle();
    enableBirthDatePaste();
    injectLayoutCSS();
    injectFontFix();
    hideAppointmentModalFields();
    reorganizeSchedulingModalLayout();
    enableBirthAgeBadgeSafe();
    resizeSchedulingModal();
    if (root) reorganizeHeaderStructure(root);
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
    if (!e.target.closest('#minutoModal')) {
      captureSelectionFromClick(e.target, false);
    }
    burstUpdate();
    setTimeout(applyPacienteActiveModalLayout, 120);
    setTimeout(applyPacienteActiveModalLayout, 350);
    setTimeout(applyPacienteActiveModalLayout, 800);
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
      : '7.2';
    const match = version.match(/\d+(?:\.\d+)?/);
    return match ? match[0] : '7.2';
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
    applyPacienteActiveModalLayout();
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
