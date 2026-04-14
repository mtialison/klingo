// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  envenenado
// @match        *://.klingo.app/*
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

  function burstUpdate() {
    updateModalTitle();
    setTimeout(updateModalTitle, 100);
    setTimeout(updateModalTitle, 250);
    setTimeout(updateModalTitle, 500);
    setTimeout(updateModalTitle, 900);
    setTimeout(updateModalTitle, 1400);
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#minutoModal')) {
      captureSelectionFromClick(e.target, false);
    }
    burstUpdate();
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
    burstUpdate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  function initScript() {
    applyLoginIndicator();

    burstUpdate();
    setTimeout(burstUpdate, 300);
    setTimeout(burstUpdate, 1000);
    setTimeout(burstUpdate, 2000);

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
    burstUpdate();
  });
  window.addEventListener('hashchange', initScript);

  setInterval(() => {
    if (location.hostname.endsWith('klingo.app')) {
      applyLoginIndicator();
      burstUpdate();
    }
  }, 1500);
})();
