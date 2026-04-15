// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      1.7
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
    let t = norm(text);
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

  function dispatchBirthDateEvents(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
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
  function injectHiddenFieldsCSS() {
    if (document.getElementById('tm-hidden-fields-style')) return;

    const style = document.createElement('style');
    style.id = 'tm-hidden-fields-style';
    style.textContent = `
      #minutoModal .tm-hidden-by-script {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function hideElement(el) {
    if (!el) return;
    el.classList.add('tm-hidden-by-script');
    el.style.setProperty('display', 'none', 'important');
  }

  function textEquals(el, value) {
    return norm(el && el.textContent) === norm(value);
  }

  function findTelefoneBlock(modal) {
    const labels = modal.querySelectorAll('small');
    for (const label of labels) {
      if (!textEquals(label, 'Telefone')) continue;

      const formGroup = label.closest('.form-group.mb-1') || label.closest('.form-group');
      const col = label.closest('.col.col-12.col-md-3') || label.closest('.col');
      return col || formGroup || label.parentElement;
    }
    return null;
  }

  function findNomeSocialBlock(modal) {
    const labels = modal.querySelectorAll('small');
    for (const label of labels) {
      if (!textEquals(label, 'Nome Social')) continue;

      const formGroup = label.closest('.form-group.mb-1') || label.closest('.form-group');
      const col = label.closest('.col.col-12.col-md-3') || label.closest('.col');
      return col || formGroup || label.parentElement;
    }
    return null;
  }

  function findMaterialMedicamentoTaxaBlock(modal) {
    const input = modal.querySelector('input[placeholder="Incluir material, medicamento ou taxa..."]');
    if (!input) return null;

    return (
      input.closest('.form-group.mb-3.mb-1') ||
      input.closest('.form-group') ||
      input.closest('.autocomplete') ||
      input.closest('.input-group') ||
      input.parentElement
    );
  }

  function hideAppointmentModalFields() {
    const modal = document.querySelector('#minutoModal');
    if (!modal) return;

    const telefoneBlock = findTelefoneBlock(modal);
    const nomeSocialBlock = findNomeSocialBlock(modal);
    const materialBlock = findMaterialMedicamentoTaxaBlock(modal);

    hideElement(telefoneBlock);
    hideElement(nomeSocialBlock);
    hideElement(materialBlock);
  }

  function burstUpdateLite() {
    updateModalTitle();
    enableBirthDatePaste();
    injectHiddenFieldsCSS();
    hideAppointmentModalFields();
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
    injectHiddenFieldsCSS();
    hideAppointmentModalFields();

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
