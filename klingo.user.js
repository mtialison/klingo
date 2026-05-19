// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      25.7
// @description  envenenado
// @match        *://*.klingo.app/*
// @match        *://samec.klingo.app/*
// @updateURL    https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js
// @connect      api.klingo.app
// @author       alison
// @grant        GM_info
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
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
    selectedDoctorFromCopy: false,
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
    return false;
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

  function getDoctorInfoFromContainer(container) {
    if (!container) return { name: '', hasCRM: false };

    const text = norm(container.innerText || container.textContent || '');
    const hasCRM = /\bCRM\b/i.test(text);
    if (!hasCRM) return { name: '', hasCRM: false };

    const name = extractDoctorNameFromContainer(container);
    if (!name) return { name: '', hasCRM: false };

    return { name, hasCRM: true };
  }


  /* TM 16.3: função getModalDoctorCandidates removida junto com alterações do modal. */



  /* TM 16.3: função getSelectedDoctorName removida junto com alterações do modal. */


  /* TM 16.3: função getModalDateContext removida junto com alterações do modal. */



  /* TM 16.3: função buildCopyTextFromTarget removida junto com alterações do modal. */




  /* TM 16.3: função captureSelectionFromClick removida junto com alterações do modal. */



  /* TM 16.3: função getDoctorNameFromModal removida junto com alterações do modal. */


  function getSubtitleHtml(titleEl) {
    const subtitleEl = titleEl.querySelector('.small.text-muted');
    return subtitleEl ? subtitleEl.outerHTML : '';
  }


  /* TM 16.3: função buildTitleHtml removida junto com alterações do modal. */



  /* TM 16.3: função getCopyText removida junto com alterações do modal. */


  function tmDateCalcIsOwnCopyButton(targetEl) {
    return !!(
      targetEl &&
      targetEl.matches &&
      targetEl.matches('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"], [data-tm-copy-date-result="1"]')
    );
  }

  function showCopyFeedback(targetEl, message = '') {
    return;
  }

  async function copyText(text, targetEl) {
    if (!text) return;

    const isDateCalcCopy = tmDateCalcIsOwnCopyButton(targetEl);

    try {
      await navigator.clipboard.writeText(text);

      if (isDateCalcCopy) {
        tmDateCalcMarkCopied(targetEl);
      } else {
        showCopyFeedback(targetEl, 'Copiado');
      }
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();

      if (isDateCalcCopy) {
        tmDateCalcMarkCopied(targetEl);
      } else {
        showCopyFeedback(targetEl, 'Copiado');
      }
    }
  }


  /* TM 16.3: função updateModalTitle removida junto com alterações do modal. */


  function applyLoginIndicator() {
    const passwordInput = document.querySelector('input[type="password"]');
    if (!passwordInput) return;

    const card =
      passwordInput.closest('.card') ||
      passwordInput.closest('.panel') ||
      passwordInput.closest('form')?.parentElement;

    if (!card) return;

    const logo = card.querySelector('img');
    if (!logo) return;

    if (card.dataset.tmLoginRatIcon === '1') return;
    card.dataset.tmLoginRatIcon = '1';

    card.style.position = card.style.position || 'relative';

    const ratIcon = document.createElement('img');
    ratIcon.id = 'tm-login-rat-icon';
    ratIcon.src = 'https://i.imgur.com/8n5QWZk.png';
    ratIcon.alt = '';
    ratIcon.setAttribute('aria-hidden', 'true');

    ratIcon.style.position = 'absolute';
    ratIcon.style.width = '48px';
    ratIcon.style.height = '48px';
    ratIcon.style.objectFit = 'contain';
    ratIcon.style.right = '20px';
    ratIcon.style.top = '325px';
    ratIcon.style.zIndex = '5';
    ratIcon.style.pointerEvents = 'none';
    ratIcon.style.userSelect = 'none';

    card.appendChild(ratIcon);
  }


  /* TM 16.3: função parsePastedBirthDate removida junto com o modal. */



  /* TM 16.3: função isValidDate removida junto com o modal. */



  /* TM 16.3: função setNativeInputValue removida junto com o modal. */



  /* TM 16.3: função dispatchEvents removida junto com o modal. */



  /* TM 16.3: função dispatchBirthDateEvents removida junto com o modal. */



  /* TM 16.3: função isBirthDateInput removida junto com o modal. */



  /* TM 16.3: função handleBirthDatePaste removida junto com o modal. */





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

  /* TM 16.3: layout/modificações do modal de agendamento removidos. */

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
        font-weight: 400;
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
        color: #212529;
        font-size: 16px;
        font-weight: 400;
        line-height: 1.35;
      }

      .tm-datecalc-result-box {
        position: relative;
        padding-right: 46px;
      }

      .tm-datecalc-result-value {
        flex: 1 1 auto;
        min-width: 0;
        text-align: center;
      }

      .tm-datecalc-copy-result {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 30px;
        height: 30px;
        border: 1px solid #ced4da;
        border-radius: 7px;
        background: #ffffff;
        color: #495057;
        font-size: 15px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.88;
      }

      .tm-datecalc-copy-result:hover,
      .tm-datecalc-copy-result:focus {
        opacity: 1;
        background: #eef5ff;
        border-color: #80bdff;
      }

      .tm-datecalc-copy-result:disabled {
        cursor: default;
        opacity: 0.35;
      }

      .tm-datecalc-result-box small {
        display: block;
        margin-top: 2px;
        color: #6c757d;
        font-weight: 500;
      }

      [data-tm-datecalc-item="1"] {
        cursor: pointer !important;
      }

      .tm-datecalc-header-trigger-item {
        display: flex !important;
        align-items: center !important;
      }

      .tm-datecalc-header-trigger {
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 38px !important;
        height: 38px !important;
        min-width: 38px !important;
        min-height: 38px !important;
        padding: 0 !important;
        margin: 0 14px 0 0 !important;
        border-radius: 13px !important;
        border: 1px solid rgba(255,255,255,0.34) !important;
        background: rgba(255,255,255,0.12) !important;
        color: #ffffff !important;
        line-height: 1 !important;
        text-decoration: none !important;
        cursor: pointer !important;
        user-select: none !important;
        flex: 0 0 auto !important;
        overflow: hidden !important;
        box-shadow: 0 4px 10px rgba(0,0,0,0.10) !important;
        backdrop-filter: blur(5px) !important;
        -webkit-backdrop-filter: blur(5px) !important;
        transition:
          transform 0.16s ease,
          background 0.16s ease,
          border-color 0.16s ease,
          box-shadow 0.16s ease,
          opacity 0.16s ease !important;
      }

      .tm-datecalc-header-trigger::before {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        border-radius: inherit !important;
        background: linear-gradient(135deg, rgba(255,255,255,0.24), rgba(255,255,255,0.06)) !important;
        opacity: 0 !important;
        transition: opacity 0.16s ease !important;
        pointer-events: none !important;
      }

      .tm-datecalc-header-trigger img {
        position: relative !important;
        z-index: 1 !important;
        display: block !important;
        width: 20px !important;
        height: 20px !important;
        object-fit: contain !important;
        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.22)) !important;
        transition: transform 0.16s ease, filter 0.16s ease !important;
      }

      .tm-datecalc-header-trigger:hover,
      .tm-datecalc-header-trigger:focus {
        color: #ffffff !important;
        text-decoration: none !important;
        opacity: 1 !important;
        background: rgba(255,255,255,0.22) !important;
        border-color: rgba(255,255,255,0.58) !important;
        box-shadow: 0 7px 16px rgba(0,0,0,0.18) !important;
        transform: translateY(-1px) !important;
      }

      .tm-datecalc-header-trigger:hover::before,
      .tm-datecalc-header-trigger:focus::before {
        opacity: 1 !important;
      }

      .tm-datecalc-header-trigger:hover img,
      .tm-datecalc-header-trigger:focus img {
        transform: none !important;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.26)) !important;
      }

      .tm-datecalc-header-trigger:active {
        transform: translateY(0) !important;
        box-shadow: 0 3px 8px rgba(0,0,0,0.12) !important;
      }


      /* TM FIX 13.4 - remover tooltip do botão copiar calculadora */
      .tm-datecalc-copy-btn,
      .tm-datecalc-copy-result,
      [data-tm-datecalc-copy="1"] {
        position: relative !important;
      }

      .tm-datecalc-copy-btn::before,
      .tm-datecalc-copy-btn::after,
      .tm-datecalc-copy-result::before,
      .tm-datecalc-copy-result::after,
      [data-tm-datecalc-copy="1"]::before,
      [data-tm-datecalc-copy="1"]::after {
        display: none !important;
        content: none !important;
      }

      .tooltip:empty,
      .tooltip .tooltip-inner:empty {
        display: none !important;
      }


      /* FIX 13.5 - posição correta botão copiar */
      .tm-datecalc-result-box {
        position: relative !important;
      }

      .tm-datecalc-copy-btn,
      .tm-datecalc-copy-result {
        position: absolute !important;
        right: 10px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }
`;
    document.head.appendChild(style);
  }


  function injectDateCalculatorFinalBaseCSS24_0() {
    if (document.getElementById('tm-datecalc-final-base-24-0')) return;

    const style = document.createElement('style');
    style.id = 'tm-datecalc-final-base-24-0';
    style.textContent = `
      .tm-datecalc-final-root {
        position: relative !important;
      }

      .tm-datecalc-final-close-row {
        display: flex !important;
        justify-content: flex-end !important;
        align-items: center !important;
        width: 100% !important;
        height: 18px !important;
        margin: -2px 0 4px 0 !important;
        padding: 0 !important;
      }

      .tm-datecalc-final-close {
        position: static !important;
        z-index: 100000 !important;
        border: 0 !important;
        border-color: transparent !important;
        outline: none !important;
        box-shadow: none !important;
        background: transparent !important;
        color: #dc3545 !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        padding: 0 2px !important;
        cursor: pointer !important;
        appearance: none !important;
        -webkit-appearance: none !important;
      }

      .tm-datecalc-final-close:hover,
      .tm-datecalc-final-close:focus,
      .tm-datecalc-final-close:active,
      .tm-datecalc-final-close:focus-visible {
        color: #b02a37 !important;
        border: 0 !important;
        border-color: transparent !important;
        outline: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      .tm-datecalc-final-root input[type="number"]::-webkit-outer-spin-button,
      .tm-datecalc-final-root input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none !important;
        margin: 0 !important;
      }

      .tm-datecalc-final-root input[type="number"] {
        appearance: textfield !important;
        -moz-appearance: textfield !important;
      }

      .tm-datecalc-final-hide {
        display: none !important;
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
              <label for="tm-datecalc-start">Data do pedido médico</label>
              <div style="display:flex;align-items:center;">
              <input id="tm-datecalc-start" type="date" style="flex:1;">
              <button type="button" class="tm-datecalc-hoje-btn" data-tm-hoje="1">Hoje</button>
            </div>
            </div>
            <div class="tm-datecalc-field">
              <label for="tm-datecalc-days">Prazo do convênio</label>
              <input id="tm-datecalc-days" type="number" step="1" placeholder="">
            </div>
          </div>
          <div class="tm-datecalc-field tm-datecalc-result-field-final" style="grid-column: 1 / -1;">
            <label for="tm-datecalc-result-date">Validade do pedido médico</label>
            <div class="tm-datecalc-result-box"><span class="tm-datecalc-result-value" id="tm-datecalc-result-date"></span><button type="button" class="tm-datecalc-copy-result" data-tm-copy-date-result="1" title="Copiar resultado" aria-label="Copiar resultado" disabled>📋</button></div>
          </div>
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
    const day = String(date.getDate());
    const month = monthNameFromNumber(String(date.getMonth() + 1).padStart(2, '0'));
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  }

  function refreshDateCalculatorResults() {
    const panel = getDateCalculatorPanel();
    if (!panel) return;

    const startInput = panel.querySelector('#tm-datecalc-start');
    const daysInput = panel.querySelector('#tm-datecalc-days');
    const endInput = panel.querySelector('#tm-datecalc-end');
    const resultDate = panel.querySelector('#tm-datecalc-result-date');
    const resultDays = panel.querySelector('#tm-datecalc-result-days');
    const copyDateBtn = panel.querySelector('[data-tm-copy-date-result="1"]');

    if (!startInput || !daysInput || !resultDate) return;

    const startDate = parseIsoDateSafe(startInput.value);
    const daysValue = norm(daysInput.value);

    if (startDate && daysValue !== '' && !Number.isNaN(Number(daysValue))) {
      const targetDate = addDaysSafe(startDate, Number(daysValue));
      resultDate.textContent = targetDate
        ? formatDatePtBrShort(targetDate)
        : 'Não foi possível calcular a data.';
    } else {
      resultDate.textContent = '';
    }

    if (copyDateBtn) {
      copyDateBtn.disabled = !norm(resultDate.textContent);
    }

    if (endInput && resultDays) {
      const endDate = parseIsoDateSafe(endInput.value);

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
  }


  function getCurrentScriptVersion() {
    const version = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version)
      ? String(GM_info.script.version)
      : '25.7';
    const match = version.match(/\d+(?:\.\d+)?/);
    return match ? match[0] : '25.7';
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
    }

    const expected = `🧪 V${getCurrentScriptVersion()}`;
    if (indicator.textContent !== expected) {
      indicator.textContent = expected;
    }

    const companyText = navbar.querySelector('.text-white');

    indicator.style.setProperty('position', 'absolute', 'important');
    indicator.style.setProperty('left', '50%', 'important');
    indicator.style.setProperty('top', '50%', 'important');
    indicator.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
    indicator.style.setProperty('z-index', '4', 'important');
    indicator.style.setProperty('color', '#ffffff', 'important');
    indicator.style.setProperty('white-space', 'nowrap', 'important');
    indicator.style.setProperty('pointer-events', 'none', 'important');

    if (companyText) {
      const cs = window.getComputedStyle(companyText);
      indicator.style.setProperty('font-size', cs.fontSize, 'important');
      indicator.style.setProperty('line-height', cs.lineHeight, 'important');
      indicator.style.setProperty('font-weight', cs.fontWeight, 'important');
      indicator.style.setProperty('font-family', cs.fontFamily, 'important');
    } else {
      indicator.style.setProperty('font-size', '14px', 'important');
      indicator.style.setProperty('line-height', '1', 'important');
      indicator.style.setProperty('font-weight', '500', 'important');
    }

    if (indicator.parentElement !== navbar) {
      navbar.appendChild(indicator);
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
    trigger.innerHTML = '<img src="https://i.imgur.com/GU5gE57.png">';

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
    document.querySelectorAll('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"]').forEach(tmDateCalcDisableCopyTooltip);

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

      const copyDateResultBtn = e.target.closest('[data-tm-copy-date-result="1"]');
      if (copyDateResultBtn) {
        e.preventDefault();
        e.stopPropagation();

        const resultDate = document.getElementById('tm-datecalc-result-date');
        const textToCopy = norm(resultDate ? resultDate.textContent : '');
        if (textToCopy) {
          copyText(textToCopy, copyDateResultBtn);
        }
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


  function tmDateCalcDisableCopyTooltip(btn) {
    if (!btn) return;

    btn.removeAttribute('title');
    btn.removeAttribute('data-title');
    btn.removeAttribute('data-toggle');
    btn.removeAttribute('data-placement');
    btn.removeAttribute('data-original-title');
    btn.removeAttribute('aria-describedby');
    btn.dataset.tmDatecalcCopy = '1';

    try {
      if (window.jQuery) {
        window.jQuery(btn).tooltip('dispose');
        window.jQuery(btn).popover('dispose');
      }
    } catch (e) {}

    document.querySelectorAll('.tooltip, .popover').forEach((el) => {
      const inner = el.querySelector('.tooltip-inner, .popover-body');
      const raw = (inner ? inner.textContent : el.textContent || '').trim();

      if (!raw || raw === 'Copiado' || raw === 'Copiar') {
        el.remove();
      }
    });
  }

  function tmDateCalcMarkCopied(btn) {
    if (!btn || !tmDateCalcIsOwnCopyButton(btn)) return;
    tmDateCalcDisableCopyTooltip(btn);

    btn.textContent = '✅';
    btn.setAttribute('aria-label', 'Copiado');

    clearTimeout(btn._tmDatecalcCopiedTimer);
    btn._tmDatecalcCopiedTimer = setTimeout(() => {
      btn.textContent = '📋';
      btn.setAttribute('aria-label', 'Copiar');
      tmDateCalcDisableCopyTooltip(btn);
    }, 1200);
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
injectFontFix();
setTimeout(() => {
}, 1000);
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
});
  window.addEventListener('hashchange', initScript);

  setInterval(() => {
    if (location.hostname.endsWith('klingo.app')) {
      applyLoginIndicator();
      if (!isCallCenterRoute()) return;
}
  }, 1500);

/* =========================
   NOTIFICAÇÃO VISUAL - NOVA MENSAGEM
========================= */
(function(){
  const ORIGINAL_TITLE = document.title;
  let lastSignature = '';
  let blinking = false;
  let blinkInterval = null;

  function getMessageSignature() {
    const toast = document.querySelector('.toasted.toastnafrente');
    if (toast && /De:/i.test(toast.textContent)) {
      return toast.textContent.trim();
    }

    const badge = document.querySelector('#botao-chat .badge-warning');
    if (badge) {
      const count = badge.textContent.trim();
      if (count && count !== '0') return 'badge-' + count;
    }

    return '';
  }

  function startBlink() {
    if (blinking) return;
    blinking = true;

    blinkInterval = setInterval(() => {
      document.title = document.title === '💬 Nova mensagem'
        ? ORIGINAL_TITLE
        : '💬 Nova mensagem';
    }, 1000);
  }

  function stopBlink() {
    if (!blinking) return;
    blinking = false;

    clearInterval(blinkInterval);
    document.title = ORIGINAL_TITLE;
  }

  function checkMessages() {
    try {
      const sig = getMessageSignature();

      if (sig && sig !== lastSignature) {
        lastSignature = sig;
        startBlink();
      }

      if (!sig && blinking) {
        stopBlink();
        lastSignature = '';
      }

    } catch (e) {}
  }

  setInterval(checkMessages, 1500);
})();




  /* TM 16.3: bloco PACIENTE 11.6 removido. */

/* =========================
   NOTIFICAÇÃO VISUAL - NOVA MENSAGEM
========================= */
(function(){
  const ORIGINAL_TITLE = document.title;
  let lastSignature = '';
  let blinking = false;
  let blinkInterval = null;

  function getMessageSignature() {
    const toast = document.querySelector('.toasted.toastnafrente');
    if (toast && /De:/i.test(toast.textContent)) {
      return toast.textContent.trim();
    }

    const badge = document.querySelector('#botao-chat .badge-warning');
    if (badge) {
      const count = badge.textContent.trim();
      if (count && count !== '0') return 'badge-' + count;
    }

    return '';
  }

  function startBlink() {
    if (blinking) return;
    blinking = true;

    blinkInterval = setInterval(() => {
      document.title = document.title === '💬 Nova mensagem'
        ? ORIGINAL_TITLE
        : '💬 Nova mensagem';
    }, 1000);
  }

  function stopBlink() {
    if (!blinking) return;
    blinking = false;

    clearInterval(blinkInterval);
    document.title = ORIGINAL_TITLE;
  }

  function checkMessages() {
    try {
      const sig = getMessageSignature();

      if (sig && sig !== lastSignature) {
        lastSignature = sig;
        startBlink();
      }

      if (!sig && blinking) {
        stopBlink();
        lastSignature = '';
      }

    } catch (e) {}
  }

  setInterval(checkMessages, 1500);
})();

})();




/* =========================
   NOTIFICAÇÃO VISUAL - NOVA MENSAGEM
========================= */
(function(){
  const ORIGINAL_TITLE = document.title;
  let lastSignature = '';
  let blinking = false;
  let blinkInterval = null;

  function getMessageSignature() {
    const toast = document.querySelector('.toasted.toastnafrente');
    if (toast && /De:/i.test(toast.textContent)) {
      return toast.textContent.trim();
    }

    const badge = document.querySelector('#botao-chat .badge-warning');
    if (badge) {
      const count = badge.textContent.trim();
      if (count && count !== '0') return 'badge-' + count;
    }

    return '';
  }

  function startBlink() {
    if (blinking) return;
    blinking = true;

    blinkInterval = setInterval(() => {
      document.title = document.title === '💬 Nova mensagem'
        ? ORIGINAL_TITLE
        : '💬 Nova mensagem';
    }, 1000);
  }

  function stopBlink() {
    if (!blinking) return;
    blinking = false;

    clearInterval(blinkInterval);
    document.title = ORIGINAL_TITLE;
  }

  function checkMessages() {
    try {
      const sig = getMessageSignature();

      if (sig && sig !== lastSignature) {
        lastSignature = sig;
        startBlink();
      }

      if (!sig && blinking) {
        stopBlink();
        lastSignature = '';
      }

    } catch (e) {}
  }

  setInterval(checkMessages, 1500);
})();

  document.addEventListener('click', function tmDateCalcGlobalCopyCleanup13_4(event) {
    const btn = event.target && event.target.closest
      ? event.target.closest('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"]')
      : null;

    if (!btn) return;

    tmDateCalcDisableCopyTooltip(btn);

    setTimeout(() => {
      tmDateCalcDisableCopyTooltip(btn);
    }, 0);
  }, true);

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
        object-fit: contain !important;
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
    temp.innerHTML = buildDisplayLines(data, clickedTime, doctorName, unitName)
      .map((line) => `<div>${line}</div>`)
      .join('');

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

    const icon = document.createElement('img');
    icon.className = 'tm-slot-copy-success-icon';
    icon.src = 'https://i.imgur.com/d4xuHhG.png';
    icon.alt = 'Copiado';

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
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      ta.remove();
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
    await copyText(buildCopyText(data, clickedTime, doctorName, unitName));
    showCopySuccessIcon(button);
  }, true);

  setInterval(() => {
    const modal = document.querySelector('#minutoModal');
    const isOpen = !!getModal();

    if (!isOpen && lastModalOpen) {
      clearTemporaryHeader(modal);
      resetOpening();
    }

    lastModalOpen = isOpen;
  }, 100);
})();


/* =========================
   MODAL AGENDAMENTO - PRIMEIRA VEZ
   v19.4 - reorganização visual sem mover DOM
========================= */
(function () {
  'use strict';

  const TM_CADASTRO_LAYOUT_ID = 'tm-cadastro-primeira-vez-layout-22-4';

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
        max-width: 800px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: left !important;
      }

      #cadastroModal.tm-primeira-vez-layout .modal-content {
        width: 800px !important;
        max-width: 800px !important;
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

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-email {
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

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-origem {
        grid-column: 4 !important;
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
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-origem { order: 90 !important; }

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
        flex: 0 0 353.78px !important;
        max-width: 353.78px !important;
        width: 353.78px !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        margin-top: 4px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col {
        width: 353.78px !important;
        max-width: 353.78px !important;
        flex: 0 0 353.78px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        width: 353.78px !important;
        max-width: 353.78px !important;
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

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-title,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-row,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-row small,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data small,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data span {
        font-weight: 400 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-title {
        margin-bottom: 6px !important;
        font-weight: 400 !important;
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

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data small,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data span {
        font-size: 18.75px !important;
        line-height: 1.35 !important;
        font-weight: 400 !important;
        text-transform: uppercase !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data small {
        display: inline-flex !important;
        align-items: center !important;
        margin-left: 0 !important;
        font-weight: 400 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data .fa-calendar-alt {
        width: 1.25em !important;
        min-width: 1.25em !important;
        max-width: 1.25em !important;
        text-align: center !important;
        margin-right: 6px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data small.mx-2 {
        margin-left: 8px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-sala {
        font-size: 18.75px !important;
        line-height: 1.35 !important;
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

      #cadastroModal.tm-primeira-vez-layout .tm-cad-multiple-headers .tm-cad-header-card .tm-cad-header-title,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-multiple-headers .tm-cad-header-card .tm-cad-header-title * {
        font-size: 18px !important;
        line-height: 1.3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-multiple-headers .tm-cad-header-card .tm-cad-header-row,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-multiple-headers .tm-cad-header-card .tm-cad-header-row *,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-multiple-headers .tm-cad-header-card .tm-cad-header-data,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-multiple-headers .tm-cad-header-card .tm-cad-header-data *,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-multiple-headers .tm-cad-header-card blockquote,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-multiple-headers .tm-cad-header-card blockquote * {
        font-size: 15px !important;
        line-height: 1.3 !important;
      }





      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-section-hidden {
        display: none !important;
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

  function tmCadIsPrimeiraVez(modal) {
    if (!modal || modal.id !== 'cadastroModal') return false;

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

  function tmCadPlaceOrigemAfterValidade(modal, origemField) {
    if (!modal || !origemField) return;

    const cadTemp = modal.querySelector('#cadTemp');
    const validade = tmCadFieldByLabel(modal, 'Validade da Carteira');

    if (!cadTemp || !validade) return;

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
      col.style.setProperty('flex', '0 0 353.78px', 'important');
      col.style.setProperty('max-width', '353.78px', 'important');
      col.style.setProperty('width', '353.78px', 'important');
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
    auxCol.style.setProperty('flex', '0 0 353.78px', 'important');
    auxCol.style.setProperty('max-width', '353.78px', 'important');
    auxCol.style.setProperty('width', '353.78px', 'important');

    const inputGroup = auxCol.querySelector('.input-group');
    if (inputGroup) {
      inputGroup.style.setProperty('display', 'flex', 'important');
      inputGroup.style.setProperty('flex-wrap', 'nowrap', 'important');
      inputGroup.style.setProperty('width', '353.78px', 'important');
      inputGroup.style.setProperty('max-width', '353.78px', 'important');
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

    const wantedLabels = ['Nome', 'Nascimento', 'CPF', 'E-mail', 'Email', 'Telefone', 'Celular'];
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
    const hasKnownLabel = wantedLabels.some((label) => new RegExp(`^${label}\\s*:?.+`, 'im').test(text));

    if (!hasMinimumData || !hasKnownLabel) return null;

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
      tmCadSetInputValue(nascimentoInput, parsedDate || data.nascimento);
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
    const value = String(rawValue || '').trim();
    if (!value) return '';

    let match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }

    match = value.match(/^(\d{8})$/);
    if (match) {
      const compact = match[1];
      const dd = compact.slice(0, 2);
      const mm = compact.slice(2, 4);
      const yyyy = compact.slice(4, 8);
      return `${yyyy}-${mm}-${dd}`;
    }

    match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return value;
    }

    return '';
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

  function tmCadEnableDatePastes(modal) {
    tmCadEnableDatePaste(tmCadFieldByLabel(modal, 'Data de Nascimento'));
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

    const nomeField = tmCadFieldByLabel(modal, 'Nome');
    const nomeInput = tmCadFocusableInField(nomeField);
    const sexoField = tmCadFieldByLabel(modal, 'Sexo');

    if (!nomeInput) return;

    modal.dataset.tmNomeInitialFocusDone = '1';
    modal.dataset.tmNomeInitialFocusLock = '1';

    modal.querySelectorAll('[autofocus]').forEach((el) => {
      el.removeAttribute('autofocus');
    });

    const forceNomeFocus = () => {
      if (!modal.classList.contains('tm-primeira-vez-layout')) return;
      if (modal.dataset.tmNomeInitialFocusLock !== '1') return;
      if (!document.body.contains(modal) || !document.body.contains(nomeInput)) return;

      nomeInput.focus({ preventScroll: true });

      try {
        const valueLength = String(nomeInput.value || '').length;
        nomeInput.setSelectionRange(valueLength, valueLength);
      } catch (_) {
        // ignore
      }
    };

    const focusRedirect = (event) => {
      if (modal.dataset.tmNomeInitialFocusLock !== '1') return;
      if (!sexoField || !sexoField.contains(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      window.setTimeout(forceNomeFocus, 0);
    };

    modal.addEventListener('focusin', focusRedirect, true);

    [0, 50, 100, 200, 350, 500, 750, 1000, 1300, 1700, 2200].forEach((delay) => {
      window.setTimeout(forceNomeFocus, delay);
    });

    window.setTimeout(() => {
      delete modal.dataset.tmNomeInitialFocusLock;
    delete modal.dataset.tmPatientClipboardPasteEnabled;
      modal.removeEventListener('focusin', focusRedirect, true);
    }, 2600);
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
      icon.style.setProperty('width', '1.25em', 'important');
      icon.style.setProperty('min-width', '1.25em', 'important');
      icon.style.setProperty('max-width', '1.25em', 'important');
      icon.style.setProperty('text-align', 'center', 'important');
      icon.style.setProperty('margin-right', '6px', 'important');
      calendarSmall.appendChild(icon);
    }

    calendarSmall.appendChild(document.createTextNode(`${day} de ${monthName} | ${weekday}`.toUpperCase()));

    dateBlock.dataset.tmHeaderDateNormalized = '1';
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

        left.querySelectorAll('.tm-cad-header-convenio-injetado').forEach((node) => node.remove());

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
        title.classList.add('tm-cad-header-title');
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

    if (textarea.value !== originalInput.value) {
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
      return ['ORIGEM DE PACIENTES', 'ORIGEM DO AGENDAMENTO'].includes(tmCadNorm(small.innerText || small.textContent || ''));
    });

    labels.forEach((label) => {
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

    modal.classList.remove('tm-primeira-vez-layout', 'tm-cad-multiple-headers');
    delete modal.dataset.tmNomeInitialFocusDone;
    delete modal.dataset.tmNomeInitialFocusLock;

    modal.querySelectorAll('[tabindex]').forEach((el) => {
      if (el.closest('#cadastroModal')) {
        el.removeAttribute('tabindex');
      }
    });

    const markedFields = modal.querySelectorAll(
      '.tm-cad-col, .tm-cad-col-4, .tm-cad-col-6, .tm-cad-order-nome, .tm-cad-order-nascimento, .tm-cad-order-cpf, ' +
      '.tm-cad-order-celular, .tm-cad-order-email, .tm-cad-order-origem, .tm-cad-order-sexo, .tm-cad-order-carteira, ' +
      '.tm-cad-order-validade, .tm-cad-origem-col, .tm-cad-observacao-row, .tm-cad-observacao-col, .tm-cad-observacao-aux-col, .tm-cad-hidden-field, .tm-cad-observacao-original-input-hidden, .tm-cad-observacao-textarea, .tm-cad-header-card, .tm-cad-header-title, .tm-cad-header-info-wrap, .tm-cad-header-left, .tm-cad-header-row, .tm-cad-header-convenio, .tm-cad-header-profissional, .tm-cad-header-unidade, .tm-cad-header-data, .tm-cad-header-sala, .tm-cad-header-convenio-injetado, .tm-cad-convenio-externo-oculto, .tm-cad-multiple-headers'
    );

    modal.querySelectorAll('.tm-cad-header-convenio-injetado').forEach((node) => {
      node.remove();
    });

    modal.querySelectorAll('textarea.tm-cad-observacao-textarea').forEach((textarea) => {
      textarea.remove();
    });

    modal.querySelectorAll('input.tm-cad-observacao-original-input-hidden').forEach((input) => {
      input.classList.remove('tm-cad-observacao-original-input-hidden');
      input.style.removeProperty('display');
    });

    markedFields.forEach((el) => {
      el.classList.remove(
        'tm-cad-col', 'tm-cad-col-4', 'tm-cad-col-6',
        'tm-cad-order-nome', 'tm-cad-order-nascimento', 'tm-cad-order-cpf',
        'tm-cad-order-celular', 'tm-cad-order-email', 'tm-cad-order-origem',
        'tm-cad-order-sexo', 'tm-cad-order-carteira', 'tm-cad-order-validade',
        'tm-cad-origem-col', 'tm-cad-observacao-row', 'tm-cad-observacao-col',
        'tm-cad-observacao-aux-col', 'tm-cad-hidden-field', 'tm-cad-observacao-original-input-hidden', 'tm-cad-observacao-textarea',
        'tm-cad-header-card', 'tm-cad-header-title', 'tm-cad-header-info-wrap', 'tm-cad-header-left',
        'tm-cad-header-row', 'tm-cad-header-convenio', 'tm-cad-header-profissional', 'tm-cad-header-unidade',
        'tm-cad-header-data', 'tm-cad-header-sala', 'tm-cad-header-convenio-injetado', 'tm-cad-convenio-externo-oculto',
        'tm-cad-multiple-headers'
      );

      delete el.dataset.tmHeaderDateNormalized;

      [
        'display', 'flex', 'flex-wrap', 'width', 'max-width', 'min-width',
        'order', 'grid-column', 'grid-row', 'margin-top', 'padding-left',
        'padding-right', 'font-size', 'line-height', 'font-weight', 'text-transform'
      ].forEach((prop) => el.style.removeProperty(prop));
    });
  }

  function tmCadApplyPrimeiraVezLayout() {
    const modal = tmCadVisibleModal();
    if (!modal) return;

    if (!tmCadIsPrimeiraVez(modal)) {
      tmCadClearPrimeiraVezLayout(modal);
      return;
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
    tmCadSetField(email, 'tm-cad-col-4', 'tm-cad-order-email');
    tmCadSetField(sexo, 'tm-cad-col-4', 'tm-cad-order-sexo');

    tmCadSetField(carteira, 'tm-cad-col-4', 'tm-cad-order-carteira');
    tmCadSetField(validade, 'tm-cad-col-4', 'tm-cad-order-validade');
    tmCadSetField(origem, 'tm-cad-col-4', 'tm-cad-order-origem');
    origem?.classList.add('tm-cad-origem-col');

    tmCadPlaceOrigemAfterValidade(modal, origem);

    tmCadHideField(telefone);
    tmCadHideField(nomeSocial);

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

  setInterval(tmCadApplyPrimeiraVezLayout, 250);
})();


/* =========================
   MODAL AGENDAMENTO - PACIENTE
   v22.7 - teste layout paciente separado
========================= */
(function () {
  'use strict';

  const STYLE_ID = 'tm-cadastro-paciente-layout-23-0';

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
        max-width: 800px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: left !important;
      }

      #cadastroModal.tm-paciente-layout .modal-content {
        width: 800px !important;
        max-width: 800px !important;
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
        grid-row: 1 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento {
        grid-column: 3 !important;
        grid-row: 1 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-cpf {
        grid-column: 4 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-celular {
        grid-column: 1 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-telefone {
        grid-column: 4 !important;
        grid-row: 2 !important;
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
        grid-column: 2 / 4 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-sexo {
        grid-column: 4 !important;
        grid-row: 1 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-carteira {
        grid-column: 1 / 3 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-validade {
        grid-column: 3 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem {
        grid-column: 4 !important;
        grid-row: 3 !important;
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
        flex: 0 0 353.78px !important;
        max-width: 353.78px !important;
        width: 353.78px !important;
        margin-top: 4px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        width: 353.78px !important;
        max-width: 353.78px !important;
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

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-title,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-row,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-row small,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data small,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data span {
        font-weight: 400 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-title {
        margin-bottom: 6px !important;
        font-weight: 400 !important;
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

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data small,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data span {
        font-size: 18.75px !important;
        line-height: 1.35 !important;
        font-weight: 400 !important;
        text-transform: uppercase !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data small {
        display: inline-flex !important;
        align-items: center !important;
        margin-left: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data .fa-calendar-alt {
        width: 1.25em !important;
        min-width: 1.25em !important;
        max-width: 1.25em !important;
        text-align: center !important;
        margin-right: 6px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data small.mx-2 {
        margin-left: 8px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-sala {
        font-size: 18.75px !important;
        line-height: 1.35 !important;
      }

      #cadastroModal.tm-paciente-layout.tm-paciente-multiple-headers .tm-paciente-header-card .tm-paciente-header-title,
      #cadastroModal.tm-paciente-layout.tm-paciente-multiple-headers .tm-paciente-header-card .tm-paciente-header-title * {
        font-size: 18px !important;
        line-height: 1.3 !important;
      }

      #cadastroModal.tm-paciente-layout.tm-paciente-multiple-headers .tm-paciente-header-card .tm-paciente-header-row,
      #cadastroModal.tm-paciente-layout.tm-paciente-multiple-headers .tm-paciente-header-card .tm-paciente-header-row *,
      #cadastroModal.tm-paciente-layout.tm-paciente-multiple-headers .tm-paciente-header-card .tm-paciente-header-data,
      #cadastroModal.tm-paciente-layout.tm-paciente-multiple-headers .tm-paciente-header-card .tm-paciente-header-data *,
      #cadastroModal.tm-paciente-layout.tm-paciente-multiple-headers .tm-paciente-header-card blockquote,
      #cadastroModal.tm-paciente-layout.tm-paciente-multiple-headers .tm-paciente-header-card blockquote * {
        font-size: 15px !important;
        line-height: 1.3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-convenio-externo-oculto {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-convenio-injetado {
        display: block !important;
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

  function isPacienteModal(modal) {
    if (!modal || modal.id !== 'cadastroModal') return false;

    const text = modal.innerText || modal.textContent || '';
    const hasEditar = /Editar Marcação|Reenviar e-mail da marcação/i.test(text);
    const hasRemarcacao = /Remarcação de/i.test(text);

    if (hasEditar || hasRemarcacao) return false;

    return (
      !!fieldByLabel(modal, 'Nome do Paciente') &&
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
    const nome = fieldByLabel(modal, 'Nome do Paciente');
    const mt3 = nome?.closest('.mt-3');
    return mt3 || nome?.parentElement?.parentElement || null;
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
      if (!['ORIGEM DE PACIENTES', 'ORIGEM DO AGENDAMENTO'].includes(norm(small.innerText || small.textContent || ''))) return;

      const row = small.closest('.row');
      if (!row) return;

      row.classList.add('tm-paciente-origem-section-hidden');
      row.style.setProperty('display', 'none', 'important');
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
    auxCol.style.setProperty('flex', '0 0 353.78px', 'important');
    auxCol.style.setProperty('max-width', '353.78px', 'important');
    auxCol.style.setProperty('width', '353.78px', 'important');
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

        left.querySelectorAll('.tm-paciente-header-convenio-injetado').forEach((node) => node.remove());

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
        title.classList.add('tm-paciente-header-title');
        infoWrap.classList.add('tm-paciente-header-info-wrap');
        left.classList.add('tm-paciente-header-left');

        profissional.classList.add('tm-paciente-header-row');
        convenio?.classList.add('tm-paciente-header-row');
        unidade.classList.add('tm-paciente-header-row');
        dateBlock.classList.add('tm-paciente-header-data');

        unidade.querySelectorAll('small.text-muted').forEach((small) => {
          small.classList.add('tm-paciente-header-sala');
        });

        normalizeHeaderDate(dateBlock);
      });
    });

    modal.classList.toggle('tm-paciente-multiple-headers', totalHeaders > 1);
  }


  function parseDate(rawValue) {
    const value = String(rawValue || '').trim();
    let match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;

    match = value.match(/^(\d{8})$/);
    if (match) return `${match[1].slice(4, 8)}-${match[1].slice(2, 4)}-${match[1].slice(0, 2)}`;

    match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return value;

    return '';
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

  function applyPacienteLayout() {
    const modal = visibleModal();
    if (!modal) return;

    if (!isPacienteModal(modal)) {
      clearPacienteLayout(modal);
      return;
    }

    injectStyle();

    modal.classList.add('tm-paciente-layout');

    const dados = findDadosContainer(modal);
    if (!dados) return;

    dados.classList.add('tm-paciente-dados-grid');

    const nome = fieldByLabel(modal, 'Nome do Paciente');
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
    addField(nascimento, 'tm-paciente-nascimento');
    addField(cpf, 'tm-paciente-cpf');
    addField(celular, 'tm-paciente-celular');
    addField(email, 'tm-paciente-email');
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
    enableDatePaste(validade);
  }

  function clearPacienteLayout(modal) {
    if (!modal || modal.id !== 'cadastroModal') return;

    modal.classList.remove('tm-paciente-layout', 'tm-paciente-multiple-headers');

    modal.querySelectorAll('.tm-paciente-header-convenio-injetado').forEach((el) => el.remove());

    modal.querySelectorAll('textarea.tm-paciente-observacao-textarea').forEach((el) => el.remove());

    modal.querySelectorAll('input.tm-paciente-observacao-original-hidden').forEach((input) => {
      input.classList.remove('tm-paciente-observacao-original-hidden');
      input.style.removeProperty('display');
    });

    modal.querySelectorAll('[class*="tm-paciente-"]').forEach((el) => {
      el.className = String(el.className)
        .split(/\s+/)
        .filter((cls) => !cls.startsWith('tm-paciente-'))
        .join(' ');

      [
        'display', 'flex', 'flex-wrap', 'width', 'max-width', 'min-width',
        'order', 'grid-column', 'grid-row', 'margin-top', 'padding-left',
        'padding-right', 'font-size', 'line-height', 'font-weight',
        'text-transform'
      ].forEach((prop) => el.style.removeProperty(prop));
    });
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

  setInterval(applyPacienteLayout, 400);
})();


/* =========================
   CHAT - REMOÇÃO DO ENVIO EM MASSA
   v23.4
========================= */
(function () {
  'use strict';

  function cleanupBulkChatDom() {
    const modal = document.querySelector('#modalChat');
    if (!modal) return;

    modal.querySelectorAll(
      '.tm-chat-bulk-bar, ' +
      '.tm-chat-bulk-cell, ' +
      '.tm-chat-bulk-check, ' +
      '.tm-chat-bulk-row, ' +
      '#tm-chat-bulk-style, ' +
      '[data-tm-chat-bulk-name], ' +
      '[data-tm-chat-bulk-user-id], ' +
      '[data-tm-chat-stable-key]'
    ).forEach((el) => {
      if (el.classList?.contains('tm-chat-bulk-row')) {
        el.classList.remove('tm-chat-bulk-row');
        el.removeAttribute('data-tm-chat-bulk-name');
        el.removeAttribute('data-tm-chat-bulk-user-id');
        el.removeAttribute('data-tm-chat-stable-key');
        return;
      }

      el.remove();
    });

    modal.classList.remove('tm-chat-bulk-returning-to-list');
  }

  document.addEventListener('shown.bs.modal', (event) => {
    if (event.target?.id === 'modalChat') {
      window.setTimeout(cleanupBulkChatDom, 0);
      window.setTimeout(cleanupBulkChatDom, 150);
      window.setTimeout(cleanupBulkChatDom, 400);
    }
  }, true);

  setInterval(cleanupBulkChatDom, 700);
})();


/* =========================
   CALCULADORA DE DATAS - BASE FINAL
   v24.0
========================= */
(function () {
  'use strict';

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectFinalDateCalcCss24_1() {
    if (document.getElementById('tm-datecalc-final-fix-24-1')) return;

    const style = document.createElement('style');
    style.id = 'tm-datecalc-final-fix-24-1';
    style.textContent = `
      .tm-datecalc-final-root {
        position: relative !important;
      }

      .tm-datecalc-final-close-row {
        display: flex !important;
        justify-content: flex-end !important;
        align-items: center !important;
        width: 100% !important;
        height: 18px !important;
        margin: -2px 0 4px 0 !important;
        padding: 0 !important;
      }

      .tm-datecalc-final-close {
        position: static !important;
        z-index: 100000 !important;
        border: 0 !important;
        border-color: transparent !important;
        outline: none !important;
        box-shadow: none !important;
        background: transparent !important;
        color: #dc3545 !important;
        font-size: 20px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        padding: 0 2px !important;
        cursor: pointer !important;
        appearance: none !important;
        -webkit-appearance: none !important;
      }

      .tm-datecalc-final-close:hover,
      .tm-datecalc-final-close:focus,
      .tm-datecalc-final-close:active,
      .tm-datecalc-final-close:focus-visible {
        color: #b02a37 !important;
        border: 0 !important;
        border-color: transparent !important;
        outline: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      .tm-datecalc-final-root input[type="number"]::-webkit-outer-spin-button,
      .tm-datecalc-final-root input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none !important;
        appearance: none !important;
        margin: 0 !important;
      }

      .tm-datecalc-final-root input[type="number"],
      .tm-datecalc-final-root input#tm-datecalc-days {
        appearance: textfield !important;
        -moz-appearance: textfield !important;
      }

      .tm-datecalc-result-field-final {
        display: block !important;
        width: 100% !important;
        margin-top: 13px !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }

      .tm-datecalc-result-field-final > label {
        display: block !important;
        width: 100% !important;
        margin: 0 0 6px 0 !important;
        padding: 0 !important;
        color: #6c757d !important;
        font-size: 13px !important;
        line-height: 1.2 !important;
        font-weight: 400 !important;
        text-align: left !important;
      }

      .tm-datecalc-result-field-final .tm-datecalc-result-box {
        position: relative !important;
        width: 100% !important;
        margin-top: 0 !important;
        padding: 10px 46px 10px 12px !important;
        box-sizing: border-box !important;
      }

      .tm-datecalc-result-field-final .tm-datecalc-copy-result {
        position: absolute !important;
        right: 10px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }

      .tm-datecalc-final-root .tm-datecalc-hoje-btn,
      .tm-datecalc-final-root .tm-datecalc-copy-result {
        outline: none !important;
        box-shadow: none !important;
      }

      .tm-datecalc-final-root .tm-datecalc-hoje-btn:hover,
      .tm-datecalc-final-root .tm-datecalc-hoje-btn:focus,
      .tm-datecalc-final-root .tm-datecalc-hoje-btn:active,
      .tm-datecalc-final-root .tm-datecalc-hoje-btn:focus-visible,
      .tm-datecalc-final-root .tm-datecalc-copy-result:hover,
      .tm-datecalc-final-root .tm-datecalc-copy-result:focus,
      .tm-datecalc-final-root .tm-datecalc-copy-result:active,
      .tm-datecalc-final-root .tm-datecalc-copy-result:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }

      .tm-datecalc-final-hide {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function findRoot() {
    const candidates = Array.from(document.querySelectorAll('div, section, aside'))
      .filter((el) => {
        if (!(el instanceof HTMLElement)) return false;

        const text = norm(el.innerText || el.textContent || '');
        if (!text.includes('Data do pedido médico') || !text.includes('Prazo do convênio')) return false;

        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);

        return (
          rect.width >= 300 &&
          rect.width <= 560 &&
          rect.height >= 90 &&
          rect.height <= 330 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      });

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    });

    return candidates[0];
  }

  function findCalculatorButton(root) {
    return Array.from(document.querySelectorAll('button, a, [role="button"], .btn'))
      .find((el) => {
        if (root && root.contains(el)) return false;

        const text = norm(el.innerText || el.textContent || '');
        const title = norm(el.getAttribute('title') || el.getAttribute('aria-label') || '');

        return /calculadora/i.test(text + ' ' + title);
      }) || null;
  }

  function clearCalculatorFields(root) {
    if (!root) return;

    const startInput = root.querySelector('#tm-datecalc-start');
    const daysInput = root.querySelector('#tm-datecalc-days');
    const resultDate = root.querySelector('#tm-datecalc-result-date');
    const copyButton = root.querySelector('[data-tm-copy-date-result="1"]');

    [startInput, daysInput].filter(Boolean).forEach((input) => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    if (resultDate) {
      resultDate.textContent = '';
    }

    if (copyButton) {
      copyButton.disabled = true;
      copyButton.textContent = '📋';
      copyButton.blur();
    }
  }

  function closeRoot(root) {
    clearCalculatorFields(root);

    const button = findCalculatorButton(root);

    if (button) {
      button.click();
      return;
    }

    root.style.removeProperty('display');
    root.hidden = true;
  }

  function cleanupOldResultLabelNodes(root) {
    if (!root) return;

    root.querySelectorAll('.tm-datecalc-final-result-label-outside').forEach((node) => node.remove());

    root.querySelectorAll('.tm-datecalc-final-result-label, .tm-datecalc-final-result-value').forEach((node) => {
      const textValue = norm(node.innerText || node.textContent || '');

      if (node.classList.contains('tm-datecalc-final-result-label')) {
        node.remove();
        return;
      }

      if (node.classList.contains('tm-datecalc-final-result-value')) {
        const parent = node.parentElement;
        if (parent && textValue && !parent.querySelector('#tm-datecalc-result-date')) {
          parent.textContent = textValue;
        } else {
          node.remove();
        }
      }
    });
  }


  function bindDryClickButtons(root) {
    if (!root) return;

    root.querySelectorAll('.tm-datecalc-hoje-btn, .tm-datecalc-copy-result').forEach((button) => {
      if (button.dataset.tmDatecalcDryClickBound === '1') return;

      button.dataset.tmDatecalcDryClickBound = '1';

      button.addEventListener('mousedown', () => {
        button.style.setProperty('outline', 'none', 'important');
        button.style.setProperty('box-shadow', 'none', 'important');
      }, true);

      button.addEventListener('click', () => {
        window.setTimeout(() => {
          button.blur();
          button.style.setProperty('outline', 'none', 'important');
          button.style.setProperty('box-shadow', 'none', 'important');
        }, 0);
      }, true);
    });
  }

  function bindCalculatorButtonReset() {
    if (document.documentElement.dataset.tmDatecalcResetButtonBound === '1') return;
    document.documentElement.dataset.tmDatecalcResetButtonBound = '1';

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('button, a, [role="button"], .btn') : null;
      if (!target) return;

      const text = norm(target.innerText || target.textContent || '');
      const title = norm(target.getAttribute('title') || target.getAttribute('aria-label') || '');

      if (!/calculadora/i.test(text + ' ' + title)) return;

      const root = findRoot();
      if (!root || !root.classList.contains('tm-datecalc-final-root')) return;

      clearCalculatorFields(root);
    }, true);
  }

  function ensureFinalStructure() {
    bindCalculatorButtonReset();

    injectFinalDateCalcCss24_1();

    const root = findRoot();
    if (!root) return;

    root.classList.add('tm-datecalc-final-root');

    bindDryClickButtons(root);

    cleanupOldResultLabelNodes(root);
    root.querySelectorAll('.tm-datecalc-close-btn, .tm-datecalc-close-main, .tm-datecalc-safe-close, .tm-datecalc-safe-close-row')
      .forEach((node) => node.remove());

    const prazoInput = root.querySelector('#tm-datecalc-days, input[type="number"]');
    if (prazoInput) {
      prazoInput.setAttribute('type', 'text');
      prazoInput.setAttribute('inputmode', 'numeric');
      prazoInput.style.setProperty('appearance', 'textfield', 'important');
      prazoInput.style.setProperty('-moz-appearance', 'textfield', 'important');
    }

    root.querySelectorAll('.tm-datecalc-section').forEach((section) => {
      const hasFinal = !!section.querySelector('#tm-datecalc-end, #tm-datecalc-result-days');
      const text = norm(section.innerText || section.textContent || '');

      if (hasFinal || text.includes('Data final')) {
        section.classList.add('tm-datecalc-final-hide');
        section.style.setProperty('display', 'none', 'important');
      }
    });

    let row = root.querySelector(':scope > .tm-datecalc-final-close-row');

    if (!row) {
      row = document.createElement('div');
      row.className = 'tm-datecalc-final-close-row';
      root.insertBefore(row, root.firstElementChild || null);
    }

    let btn = row.querySelector(':scope > .tm-datecalc-final-close');

    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tm-datecalc-final-close';
      btn.textContent = '×';
      btn.title = 'Fechar';
      row.appendChild(btn);
    }

    row.style.setProperty('display', 'flex', 'important');
    row.style.setProperty('justify-content', 'flex-end', 'important');
    row.style.setProperty('align-items', 'center', 'important');
    row.style.setProperty('width', '100%', 'important');
    row.style.setProperty('height', '18px', 'important');
    row.style.setProperty('margin', '-2px 0 4px 0', 'important');
    row.style.setProperty('padding', '0', 'important');

    btn.style.setProperty('position', 'static', 'important');
    btn.style.setProperty('border', '0', 'important');
    btn.style.setProperty('border-color', 'transparent', 'important');
    btn.style.setProperty('outline', 'none', 'important');
    btn.style.setProperty('box-shadow', 'none', 'important');
    btn.style.setProperty('background', 'transparent', 'important');
    btn.style.setProperty('color', '#dc3545', 'important');
    btn.style.setProperty('font-size', '20px', 'important');
    btn.style.setProperty('font-weight', '700', 'important');
    btn.style.setProperty('line-height', '1', 'important');
    btn.style.setProperty('padding', '0 2px', 'important');
    btn.style.setProperty('cursor', 'pointer', 'important');
    btn.style.setProperty('appearance', 'none', 'important');

    if (btn.dataset.tmDatecalcFinalBound !== '1') {
      btn.dataset.tmDatecalcFinalBound = '1';

      btn.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
      }, true);

      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        btn.blur();
        closeRoot(root);
      }, true);
    }
  }

  document.addEventListener('click', () => {
    window.setTimeout(ensureFinalStructure, 0);
    window.setTimeout(ensureFinalStructure, 60);
    window.setTimeout(ensureFinalStructure, 160);
  }, true);

  setInterval(ensureFinalStructure, 600);
})();


/* =========================
   AUTORIZAÇÕES - FILTRO POR ANEXO
   v25.3
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-auth-attachment-filter';
  const SELECT_ID = 'tm-auth-attachment-select';
  const STYLE_ID = 'tm-auth-attachment-filter-style-25-3';

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectAuthAttachmentStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tm-auth-attachment-hidden {
        display: none !important;
      }

      #${FILTER_ID} .input-group,
      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
        box-sizing: border-box !important;
      }

      #${FILTER_ID} select {
        min-width: 0 !important;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
      }

      .tm-auth-recepcao-filter-hidden {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function isAutorizacoesTabActive() {
    const active = Array.from(document.querySelectorAll('.nav.nav-pills .nav-link.active, .nav-pills .nav-link.active'))
      .find((link) => norm(link.innerText || link.textContent || '') === 'Autorizações');

    if (active) return true;

    const breadcrumbText = Array.from(document.querySelectorAll('.breadcrumb, nav, body'))
      .map((el) => norm(el.innerText || el.textContent || ''))
      .join(' ');

    return /\/\s*Autorizações/.test(breadcrumbText);
  }

  function getAuthFilterCardBody() {
    if (!isAutorizacoesTabActive()) return null;

    const refresh = document.querySelector('#refresh-button');
    if (!refresh) return null;

    const card = refresh.closest('.card.dashcard, .card');
    const cardBody = card?.querySelector(':scope > .card-body') || refresh.closest('.card-body');

    if (!cardBody) return null;

    const cardText = norm(cardBody.innerText || cardBody.textContent || '');
    const hasAuthFilters =
      cardText.includes('Todas as Operadoras') &&
      cardText.includes('Todos os Status Ativos') &&
      cardText.includes('Sem filtro por fila de autorização');

    return hasAuthFilters ? cardBody : null;
  }

  function getAuthRefreshButton() {
    const body = getAuthFilterCardBody();
    if (!body) return null;

    return body.querySelector('#refresh-button');
  }

  function getAuthListCards() {
    if (!isAutorizacoesTabActive()) return [];

    return Array.from(document.querySelectorAll('.card.mb-2.dashcard'))
      .filter((card) => {
        if (!(card instanceof HTMLElement)) return false;
        if (card.closest(`#${FILTER_ID}`)) return false;

        const text = norm(card.innerText || card.textContent || '');
        const hasAuthActions =
          text.includes('Clonar Solicitação') ||
          text.includes('Realizar Outra Marcação') ||
          !!card.querySelector('[data-original-title="Editar Solicitação de Autorização"], [title="Imprimir Solicitação"]');

        const hasDateAttachmentArea =
          !!card.querySelector('a[title*="arquivos anexados ao atendimento"], a[title*="arquivo anexado ao atendimento"]');

        return hasAuthActions || hasDateAttachmentArea;
      });
  }

  function cardHasAttendanceAttachment(card) {
    if (!card) return false;

    const links = Array.from(card.querySelectorAll('a[title*="arquivos anexados ao atendimento"], a[title*="arquivo anexado ao atendimento"]'));

    return links.some((link) => {
      const title = norm(link.getAttribute('title') || '');
      const icon = link.querySelector('i');

      if (/^0\s+arquivos?\s+anexados?\s+ao\s+atendimento/i.test(title)) return false;
      if (/\b[1-9]\d*\s+arquivos?\s+anexados?\s+ao\s+atendimento/i.test(title)) return true;

      return !!icon && icon.classList.contains('fa-paperclip') && !icon.classList.contains('fa-plus');
    });
  }

  function getCurrentAttachmentFilterValue() {
    const select = document.getElementById(SELECT_ID);
    return select ? select.value : '';
  }

  function applyAttachmentFilter() {
    if (!isAutorizacoesTabActive()) {
      document.querySelectorAll('.tm-auth-attachment-hidden').forEach((card) => {
        card.classList.remove('tm-auth-attachment-hidden');
      });
      return;
    }

    const value = getCurrentAttachmentFilterValue();

    getAuthListCards().forEach((card) => {
      const hasAttachment = cardHasAttendanceAttachment(card);

      const shouldHide =
        value === 'com' ? !hasAttachment :
        value === 'sem' ? hasAttachment :
        false;

      card.classList.toggle('tm-auth-attachment-hidden', shouldHide);
    });
  }

  function scheduleApplyAttachmentFilter() {
    window.setTimeout(applyAttachmentFilter, 0);
    window.setTimeout(applyAttachmentFilter, 150);
    window.setTimeout(applyAttachmentFilter, 400);
    window.setTimeout(applyAttachmentFilter, 900);
    window.setTimeout(applyAttachmentFilter, 1500);
  }

  function createAttachmentFilterElement() {
    const col = document.createElement('div');
    col.id = FILTER_ID;
    col.className = 'col col-12 col-md-3';

    col.innerHTML = `
      <div class="form-group mb-1">
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text text-outline-secondary" data-toggle="tooltip" data-placement="top" title="Filtrar por anexo">
              <i class="fa fa-paperclip fa-fw"></i>
            </span>
          </div>
          <select id="${SELECT_ID}" class="form form-control">
            <option value="">Todos os anexos...</option>
            <option value="com">Com anexo</option>
            <option value="sem">Sem anexo</option>
          </select>
        </div>
      </div>
    `;

    const select = col.querySelector(`#${SELECT_ID}`);
    select.addEventListener('change', () => {
      scheduleApplyAttachmentFilter();
    }, true);

    return col;
  }

  function hideRecepcaoAuthorizationFilter(cardBody) {
    if (!cardBody) return;

    Array.from(cardBody.querySelectorAll('label'))
      .filter((label) => norm(label.innerText || label.textContent || '') === 'Incluir autorizações da recepção')
      .forEach((label) => {
        const col = label.closest('.col');
        if (!col) return;

        col.classList.add('tm-auth-recepcao-filter-hidden');
        col.style.setProperty('display', 'none', 'important');
      });
  }

  function ensureAttachmentFilter() {
    injectAuthAttachmentStyle();

    const cardBody = getAuthFilterCardBody();

    if (cardBody) {
      hideRecepcaoAuthorizationFilter(cardBody);
    }

    if (!cardBody) {
      const existing = document.getElementById(FILTER_ID);
      if (existing) existing.remove();
      applyAttachmentFilter();
      return;
    }

    if (document.getElementById(FILTER_ID)) {
      scheduleApplyAttachmentFilter();
      return;
    }

    const rows = Array.from(cardBody.querySelectorAll(':scope > .form-row'));
    let targetRow = rows.find((row) => {
      const text = norm(row.innerText || row.textContent || '');
      return text.includes('Todos...') && text.includes('Selecionar paciente') && text.includes('Sem filtro por fila de autorização');
    });

    if (!targetRow) {
      targetRow = rows[rows.length - 1] || null;
    }

    if (!targetRow) return;

    targetRow.appendChild(createAttachmentFilterElement());
    scheduleApplyAttachmentFilter();
  }

  document.addEventListener('change', (event) => {
    if (event.target && event.target.id === SELECT_ID) {
      scheduleApplyAttachmentFilter();
    }
  }, true);

  document.addEventListener('click', () => {
    window.setTimeout(ensureAttachmentFilter, 60);
    window.setTimeout(scheduleApplyAttachmentFilter, 500);
    window.setTimeout(scheduleApplyAttachmentFilter, 1200);
  }, true);

  setInterval(() => {
    ensureAttachmentFilter();
    applyAttachmentFilter();
  }, 800);
})();


/* =========================
   CHAT DIRETO - ENTER ENVIA / SHIFT+ENTER QUEBRA LINHA
   v25.4
========================= */
(function () {
  'use strict';

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isDirectChatTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return false;

    const footer = textarea.closest('.modal-footer.d-flex.flex-column');
    if (!footer) return false;

    const group = textarea.closest('.input-group');
    if (!group || !footer.contains(group)) return false;

    const sendButton = group.querySelector('.input-group-append button.btn.btn-success, .input-group-append button.btn-success');
    if (!sendButton) return false;

    const hasPlaneIcon = !!sendButton.querySelector('.fa-paper-plane, .fas.fa-paper-plane');
    if (!hasPlaneIcon) return false;

    const modalContent = textarea.closest('.modal-content');
    if (!modalContent) return false;

    const headerText = norm(modalContent.querySelector('.modal-header')?.innerText || modalContent.querySelector('.modal-header')?.textContent || '');
    const hasChatHeader = !!headerText && !/Chat$/i.test(headerText);

    return hasChatHeader;
  }

  function getSendButton(textarea) {
    const group = textarea.closest('.input-group');
    if (!group) return null;

    return group.querySelector('.input-group-append button.btn-success');
  }

  function sendDirectChatMessage(textarea) {
    const sendButton = getSendButton(textarea);
    if (!sendButton) return;

    const value = norm(textarea.value);
    if (!value) return;

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    window.setTimeout(() => {
      if (sendButton.disabled || sendButton.getAttribute('disabled') !== null) {
        sendButton.disabled = false;
        sendButton.removeAttribute('disabled');
      }

      sendButton.click();
    }, 0);
  }

  function bindDirectChatTextarea(textarea) {
    if (!isDirectChatTextarea(textarea)) return;
    if (textarea.dataset.tmDirectChatEnterBound === '1') return;

    textarea.dataset.tmDirectChatEnterBound = '1';

    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;

      if (event.shiftKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      sendDirectChatMessage(textarea);
    }, true);
  }

  function scanDirectChatTextareas() {
    document.querySelectorAll('.modal-footer.d-flex.flex-column textarea.form.form-control')
      .forEach((textarea) => bindDirectChatTextarea(textarea));
  }

  document.addEventListener('focusin', (event) => {
    if (event.target instanceof HTMLTextAreaElement) {
      bindDirectChatTextarea(event.target);
    }
  }, true);

  document.addEventListener('shown.bs.modal', () => {
    window.setTimeout(scanDirectChatTextareas, 50);
    window.setTimeout(scanDirectChatTextareas, 200);
  }, true);

  setInterval(scanDirectChatTextareas, 700);
})();


/* =========================
   CALCULADORA DE DATAS - COR DA VALIDADE
   v25.5
========================= */
(function () {
  'use strict';

  const STYLE_ID = 'tm-datecalc-validade-color-style-25-5';

  function injectValidityColorStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tm-datecalc-validade-vencida {
        background-color: #f8d7da !important;
        border-color: #f1aeb5 !important;
      }

      .tm-datecalc-validade-vigente {
        background-color: #d1e7dd !important;
        border-color: #a3cfbb !important;
      }
    `;

    document.head.appendChild(style);
  }

  function parseDateInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const y = Number(iso[1]);
      const m = Number(iso[2]) - 1;
      const d = Number(iso[3]);
      const date = new Date(y, m, d);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) {
      const d = Number(br[1]);
      const m = Number(br[2]) - 1;
      const y = Number(br[3]);
      const date = new Date(y, m, d);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  function addDays(date, days) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + Number(days));
    return result;
  }

  function clearValidityColor(resultBox) {
    if (!resultBox) return;

    resultBox.classList.remove('tm-datecalc-validade-vencida');
    resultBox.classList.remove('tm-datecalc-validade-vigente');
  }

  function updateValidityColor(root) {
    if (!root) return;

    const startInput = root.querySelector('#tm-datecalc-start');
    const daysInput = root.querySelector('#tm-datecalc-days');
    const resultBox = root.querySelector('.tm-datecalc-result-box');

    if (!startInput || !daysInput || !resultBox) return;

    clearValidityColor(resultBox);

    const startDate = parseDateInput(startInput.value);
    const daysRaw = String(daysInput.value || '').trim();

    if (!startDate || daysRaw === '' || Number.isNaN(Number(daysRaw))) return;

    const validityDate = addDays(startDate, Number(daysRaw));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    validityDate.setHours(0, 0, 0, 0);

    if (validityDate < today) {
      resultBox.classList.add('tm-datecalc-validade-vencida');
    } else {
      resultBox.classList.add('tm-datecalc-validade-vigente');
    }
  }

  function findDateCalculatorRoots() {
    return Array.from(document.querySelectorAll('.tm-datecalc-final-root, div, section, aside'))
      .filter((root) => {
        if (!(root instanceof HTMLElement)) return false;
        if (!root.querySelector('#tm-datecalc-start')) return false;
        if (!root.querySelector('#tm-datecalc-days')) return false;
        if (!root.querySelector('.tm-datecalc-result-box')) return false;

        const style = getComputedStyle(root);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }

  function applyValidityColors() {
    injectValidityColorStyle();

    findDateCalculatorRoots().forEach(updateValidityColor);
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === 'tm-datecalc-start' || target.id === 'tm-datecalc-days') {
      window.setTimeout(applyValidityColors, 0);
      window.setTimeout(applyValidityColors, 80);
    }
  }, true);

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === 'tm-datecalc-start' || target.id === 'tm-datecalc-days') {
      window.setTimeout(applyValidityColors, 0);
      window.setTimeout(applyValidityColors, 80);
    }
  }, true);

  document.addEventListener('click', () => {
    window.setTimeout(applyValidityColors, 120);
  }, true);

  setInterval(applyValidityColors, 700);
})();
