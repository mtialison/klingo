/* =========================
   MODAL HORÁRIOS - COPIAR COM BOTÃO DIREITO
   v18.4 - header temporário mascarando só a linha nativa
========================= */
(function () {
  'use strict';

  const OPENING = {
    date: '',
    weekday: '',
    hour: '',
    timestamp: 0
  };

  let lastModalOpen = false;

  function injectStyle() {
    if (document.getElementById('tm-slot-copy-style-18-4')) return;

    const style = document.createElement('style');
    style.id = 'tm-slot-copy-style-18-4';
    style.textContent = `
      #minutoModal .modal-title.tm-slot-title-masked {
        font-size: 0 !important;
        line-height: 0 !important;
      }

      #minutoModal .modal-title.tm-slot-title-masked > .tm-slot-copy-temp-header {
        display: block !important;
        color: #333333 !important;
        font-family: "Segoe UI", Arial, sans-serif !important;
        font-size: 18.75px !important;
        line-height: 1.45 !important;
        font-weight: 500 !important;
        margin: 0 0 4px 0 !important;
      }

      #minutoModal .modal-title.tm-slot-title-masked > .small.text-muted {
        display: block !important;
        font-size: 15px !important;
        line-height: 1.4 !important;
        font-weight: 400 !important;
        margin-top: 2px !important;
      }

      #minutoModal .tm-slot-copy-success-icon {
        position: absolute !important;
        right: 18px !important;
        bottom: 18px !important;
        z-index: 100000001 !important;
        display: block !important;
        width: 34px !important;
        height: 34px !important;
        color: #28a745 !important;
        font-size: 34px !important;
        line-height: 1 !important;
        margin: 0 !important;
        padding: 0 !important;
        pointer-events: none !important;
        user-select: none !important;
        opacity: 1 !important;
        transition: opacity 300ms ease !important;
      }

      #minutoModal .tm-slot-copy-success-icon.tm-slot-copy-success-fade {
        opacity: 0 !important;
      }
    `;

    document.head.appendChild(style);
  }

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function titleCase(value) {
    const lower = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

    return norm(value)
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((part, index) => {
        if (index > 0 && lower.has(part)) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  function displayDateFromShort(value) {
    const match = norm(value).match(/^(\d{1,2})\/(\d{2})$/);
    const months = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };

    if (!match) return '';

    return `${Number(match[1])} de ${months[match[2]] || match[2]}`;
  }

  function formatHourFromList(value) {
    const text = norm(value);

    let match = text.match(/^(\d{1,2})h$/i);
    if (match) return `${Number(match[1])}h`;

    match = text.match(/^(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}$/);
    if (match) return `${Number(match[1])}h${match[2]}`;

    match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) return `${Number(match[1])}h${match[2]}`;

    return '';
  }

  function formatTimeFromModal(value) {
    const text = norm(value);

    let match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) return `${Number(match[1])}h${match[2]}`;

    match = text.match(/^(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}$/);
    if (match) return `${Number(match[1])}h${match[2]}`;

    return '';
  }

  function getModal() {
    const modal = document.querySelector('#minutoModal');
    if (!modal) return null;

    const style = getComputedStyle(modal);
    const rect = modal.getBoundingClientRect();

    if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return modal;
  }

  function getTitle(modal) {
    return modal?.querySelector?.('.modal-header .modal-title') || null;
  }

  function readConsultaText(titleEl) {
    return norm(titleEl?.querySelector?.('.small.text-muted')?.innerText || '');
  }

  function resetOpening() {
    OPENING.date = '';
    OPENING.weekday = '';
    OPENING.hour = '';
    OPENING.timestamp = 0;
  }

  function clearTemporaryHeader(modal = document.querySelector('#minutoModal')) {
    if (!modal) return;

    modal.querySelectorAll('.tm-slot-copy-temp-header').forEach((el) => el.remove());
    modal.querySelectorAll('.tm-slot-copy-success-icon').forEach((el) => el.remove());

    const titleEl = getTitle(modal);
    if (titleEl) {
      titleEl.classList.remove('tm-slot-title-masked');
    }
  }

  function captureOpeningFromListButton(button) {
    const li = button.closest('li.list-group-item');
    if (!li) return;

    const rawDate = norm(li.querySelector('h4 .card-link, h4 a, h4')?.innerText || '');
    const rawWeekday = norm(li.querySelector('small.text-muted')?.innerText || '');
    const rawHour = norm(button.innerText || button.textContent || '');

    const date = displayDateFromShort(rawDate);
    const hour = formatHourFromList(rawHour);

    if (!date || !rawWeekday || !hour) return;

    OPENING.date = date;
    OPENING.weekday = rawWeekday;
    OPENING.hour = hour;
    OPENING.timestamp = Date.now();
  }

  function headerDataFromOpeningOrNative(modal) {
    const titleEl = getTitle(modal);
    if (!titleEl) return null;

    const consultaText = readConsultaText(titleEl);

    if (OPENING.date && OPENING.weekday && OPENING.hour && Date.now() - OPENING.timestamp < 30000) {
      return {
        titleEl,
        date: OPENING.date,
        weekday: OPENING.weekday,
        hour: OPENING.hour,
        consultaText
      };
    }

    const clone = titleEl.cloneNode(true);
    clone.querySelectorAll('.small.text-muted').forEach((el) => el.remove());
    clone.querySelectorAll('.tm-slot-copy-temp-header').forEach((el) => el.remove());

    const main = norm(clone.innerText || clone.textContent || '');
    const match = main.match(/(\d{1,2}\s+de\s+[A-Za-zÀ-ÿ]+)\s*\|\s*([^|]+)\s*\|\s*(\d{1,2}h(?:\d{2})?)/i);

    if (!match) return null;

    return {
      titleEl,
      date: norm(match[1]),
      weekday: norm(match[2]),
      hour: norm(match[3]),
      consultaText
    };
  }

  function getDoctorRow(button) {
    return button.closest('.row');
  }

  function getDoctorName(row) {
    if (!row) return '';

    const nameEl = row.querySelector('.col.col-12.col-md-6 > div:first-child');
    const crmEl = Array.from(row.querySelectorAll('.col.col-12.col-md-6 > div')).find((el) => {
      return /\bCRM\b/i.test(norm(el.innerText || el.textContent || ''));
    });

    if (!nameEl || !crmEl) return '';

    return titleCase(nameEl.innerText || nameEl.textContent || '');
  }

  function getUnitName(row) {
    if (!row) return '';

    const raw = norm(row.querySelector('.col.col-12.col-md-4')?.innerText || '');
    const match = raw.match(/\(([^)]+)\)/);

    if (!match) return '';

    return titleCase(match[1]);
  }

  function shouldUseDoctor(data, row) {
    return (
      /\bCONSULTA\b/i.test(data.consultaText || '') &&
      /\bCRM\b/i.test(norm(row?.innerText || row?.textContent || ''))
    );
  }

  function cleanProcedureText(value) {
    return norm(value)
      .replace(/\s*\(\s*\d+\s*\)\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function buildDisplayLines(data, clickedTime, doctorName, unitName) {
    const line = `${data.date} | ${data.weekday} | ${clickedTime}`;

    if (doctorName) {
      return [
        `👨‍⚕️ Médico(a): ${doctorName}`,
        `📅 Data: ${line}`,
        unitName ? `📍Unidade: ${unitName}` : ''
      ].filter(Boolean);
    }

    const procedure = cleanProcedureText(data.consultaText || '');

    if (procedure) {
      return [
        `🔬 Exame: ${procedure}`,
        `🗓️ Data: ${line}`,
        unitName ? `📍Unidade: ${unitName}` : ''
      ].filter(Boolean);
    }

    return [line];
  }

  function applyTemporaryHeader(modal, data, clickedTime, doctorName, unitName) {
    const titleEl = data.titleEl;
    if (!titleEl) return;

    injectStyle();
    clearTemporaryHeader(modal);

    const temp = document.createElement('div');
    temp.className = 'tm-slot-copy-temp-header';
    buildDisplayLines(data, clickedTime, doctorName, unitName).forEach((line) => {
      const lineElement = document.createElement('div');
      lineElement.textContent = line;
      temp.appendChild(lineElement);
    });

    // Máscara:
    // - não remove o texto original
    // - não substitui a estrutura nativa
    // - esconde visualmente apenas a linha original por font-size: 0 no título
    // - reexibe o procedimento .small.text-muted via CSS
    titleEl.insertBefore(temp, titleEl.firstChild);
    titleEl.classList.add('tm-slot-title-masked');
  }

  function buildCopyText(data, clickedTime, doctorName, unitName) {
    return buildDisplayLines(data, clickedTime, doctorName, unitName).join('\n');
  }

  function clearCopySuccessIcons(modal = document.querySelector('#minutoModal')) {
    if (!modal) return;
    modal.querySelectorAll('.tm-slot-copy-success-icon').forEach((el) => el.remove());
  }

  function showCopySuccessIcon(button) {
    if (!(button instanceof Element)) return;

    const modal = button.closest('#minutoModal');
    if (!modal) return;

    clearCopySuccessIcons(modal);

    const content = modal.querySelector('.modal-content') || modal;
    const contentStyle = getComputedStyle(content);

    if (contentStyle.position === 'static') {
      content.style.position = 'relative';
    }

    const icon = document.createElement('span');
    icon.className = 'tm-slot-copy-success-icon';
    icon.textContent = '✓';
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', 'Copiado');

    content.appendChild(icon);

    window.setTimeout(() => {
      icon.classList.add('tm-slot-copy-success-fade');
    }, 1000);

    window.setTimeout(() => {
      icon.remove();
    }, 1350);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        return document.execCommand('copy');
      } finally {
        ta.remove();
      }
    }
  }

  document.addEventListener('mousedown', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('li.list-group-item button.btn')
      : null;

    if (!button || button.closest('#minutoModal')) return;

    clearTemporaryHeader();
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('li.list-group-item button.btn')
      : null;

    if (button && !button.closest('#minutoModal')) {
      clearTemporaryHeader();

      const before = OPENING.timestamp;
      captureOpeningFromListButton(button);

      if (OPENING.timestamp === before) {
        resetOpening();
      }

      return;
    }

    const close = event.target instanceof Element
      ? event.target.closest('#minutoModal [data-dismiss="modal"], #minutoModal .close')
      : null;

    if (close) {
      const modal = close.closest('#minutoModal');
      clearTemporaryHeader(modal);
      resetOpening();
    }
  }, true);

  document.addEventListener('contextmenu', async (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('#minutoModal button.btn.btn-sm')
      : null;

    if (!button) return;

    const modal = getModal();
    if (!modal || !modal.contains(button)) return;

    const clickedTime = formatTimeFromModal(button.innerText || button.textContent || '');
    const data = headerDataFromOpeningOrNative(modal);

    if (!clickedTime || !data) return;

    event.preventDefault();
    event.stopPropagation();

    const row = getDoctorRow(button);
    const doctorName = shouldUseDoctor(data, row) ? getDoctorName(row) : '';
    const unitName = getUnitName(row);

    applyTemporaryHeader(modal, data, clickedTime, doctorName, unitName);
    const copied = await copyText(buildCopyText(data, clickedTime, doctorName, unitName)).catch(() => false);
    if (copied) {
      showCopySuccessIcon(button);
    } else {
      clearTemporaryHeader(modal);
    }
  }, true);

  tmRuntime.register('modal de horários', () => {
    const modal = document.querySelector('#minutoModal');
    const isOpen = !!getModal();

    if (!isOpen && lastModalOpen) {
      clearTemporaryHeader(modal);
      resetOpening();
    }

    lastModalOpen = isOpen;
  }, ['#/call-center']);
})();
