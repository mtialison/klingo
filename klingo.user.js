// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      16.3
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
          <div class="tm-datecalc-result-box"><span class="tm-datecalc-result-value" id="tm-datecalc-result-date"></span><button type="button" class="tm-datecalc-copy-result" data-tm-copy-date-result="1" title="Copiar resultado" aria-label="Copiar resultado" disabled>📋</button></div>
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

    if (copyDateBtn) {
      copyDateBtn.disabled = !norm(resultDate.textContent);
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
      : '16.3';
    const match = version.match(/\d+(?:\.\d+)?/);
    return match ? match[0] : '16.3';
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
     CHAT - ENVIO EM MASSA (CONECTADOS)
     v13.9 - módulo leve
  ========================= */
  const TM_CHAT_BULK = {
    usersByName: new Map(),
    pendingByName: new Map(),
    authHeaders: {},
    loading: false,
    loadedAt: 0,
    sending: false,
    lastSignature: ''
  };

  function tmChatBulkNorm(text) {
    return (text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function tmChatBulkStoreUsersFromList(list) {
    if (!Array.isArray(list) || !list.length) return false;

    const map = new Map(TM_CHAT_BULK.usersByName || []);

    list.forEach((user) => {
      const id = Number(user?.id_usuario);
      const name =
        user?.pessoa?.st_nome ||
        user?.pessoa?.search ||
        user?.search ||
        '';

      if (!id || !name) return;

      const cleanName = String(name).replace(/\s+/g, ' ').trim();
      const key = tmChatBulkNorm(cleanName);

      map.set(key, {
        id,
        name: cleanName
      });

      // aliases úteis
      if (user?.search) {
        map.set(tmChatBulkNorm(user.search), { id, name: cleanName });
      }

      if (user?.pessoa?.search) {
        map.set(tmChatBulkNorm(user.pessoa.search), { id, name: cleanName });
      }
    });

    if (map.size > TM_CHAT_BULK.usersByName.size) {
      TM_CHAT_BULK.usersByName = map;
      TM_CHAT_BULK.loadedAt = Date.now();
      TM_CHAT_BULK.lastSignature = '';
      return true;
    }

    return false;
  }

  function tmChatBulkStoreUsersFromResponseJson(json) {
    const list =
      json?.lista?.data?.lista ||
      json?.data?.lista ||
      json?.lista ||
      [];

    return tmChatBulkStoreUsersFromList(list);
  }

  function tmChatBulkResolveFromMap(name) {
    const key = tmChatBulkNorm(name);

    if (!key) return null;

    const exact = TM_CHAT_BULK.usersByName.get(key);
    if (exact?.id) return exact.id;

    for (const [mapKey, user] of TM_CHAT_BULK.usersByName.entries()) {
      if (!user?.id) continue;

      if (
        mapKey === key ||
        mapKey.includes(key) ||
        key.includes(mapKey)
      ) {
        return user.id;
      }
    }

    return null;
  }


  function tmChatBulkCaptureAuthHeaders(headersLike) {
    try {
      const h = {};
      if (!headersLike) return;

      if (headersLike instanceof Headers) {
        headersLike.forEach((v,k) => h[String(k).toLowerCase()] = String(v));
      } else if (Array.isArray(headersLike)) {
        headersLike.forEach(([k,v]) => h[String(k).toLowerCase()] = String(v));
      } else if (typeof headersLike === 'object') {
        Object.keys(headersLike).forEach(k => h[String(k).toLowerCase()] = String(headersLike[k]));
      }

      [
        'authorization',
        'x-xsrf-token',
        'x-csrf-token',
        'x-api-token',
        'x-domain',
        'x-portal',
        'x-unidade'
      ].forEach(k => {
        if (h[k]) TM_CHAT_BULK.authHeaders[k] = h[k];
      });

      if (Object.keys(TM_CHAT_BULK.authHeaders).length) {
        console.info('[klingo chat bulk] auth/headers capturados', Object.keys(TM_CHAT_BULK.authHeaders));
      }
    } catch (e) {}
  }

  function tmChatBulkGetAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json;charset=UTF-8',
      'Accept': 'application/json, text/plain, */*',
      'X-Domain': TM_CHAT_BULK.authHeaders['x-domain'] || 'samec',
      'X-Portal': TM_CHAT_BULK.authHeaders['x-portal'] || '0',
      'X-Unidade': TM_CHAT_BULK.authHeaders['x-unidade'] || '1'
    };

    Object.keys(TM_CHAT_BULK.authHeaders || {}).forEach((key) => {
      const value = TM_CHAT_BULK.authHeaders[key];
      if (!value) return;

      if (key === 'authorization') headers.Authorization = value;
      else if (key === 'x-xsrf-token') headers['X-XSRF-TOKEN'] = value;
      else if (key === 'x-csrf-token') headers['X-CSRF-TOKEN'] = value;
      else if (key === 'x-api-token') headers['X-API-TOKEN'] = value;
      else if (key === 'x-domain') headers['X-Domain'] = value;
      else if (key === 'x-portal') headers['X-Portal'] = value;
      else if (key === 'x-unidade') headers['X-Unidade'] = value;
    });

    if (!headers.Authorization) {
      const token = tmChatBulkFindTokenInStorage();
      if (token) headers.Authorization = token;
    }

    return headers;
  }

  function tmChatBulkInstallPageNetworkCapture() {
    if (window.__tmChatBulkPageCaptureInjected) return;
    window.__tmChatBulkPageCaptureInjected = true;

    try {
      const script = document.createElement('script');
      script.textContent = `
        (function () {
          if (window.__tmChatBulkNativeCaptureInstalled) return;
          window.__tmChatBulkNativeCaptureInstalled = true;

          function emit(headers) {
            try {
              window.dispatchEvent(new CustomEvent('tm-chat-bulk-auth-headers', { detail: headers || {} }));
            } catch (e) {}
          }

          try {
            const nativeFetch = window.fetch;
            if (typeof nativeFetch === 'function') {
              window.fetch = function () {
                try {
                  const input = arguments[0];
                  const init = arguments[1] || {};
                  const url = String((input && input.url) || input || '');

                  if (url.indexOf('/api/aql') !== -1 || url.indexOf('api.klingo.app') !== -1) {
                    emit(init.headers || (input && input.headers) || {});
                  }
                } catch (e) {}

                return nativeFetch.apply(this, arguments);
              };
            }
          } catch (e) {}

          try {
            const XHR = window.XMLHttpRequest;
            const nativeOpen = XHR.prototype.open;
            const nativeSetRequestHeader = XHR.prototype.setRequestHeader;
            const nativeSend = XHR.prototype.send;

            XHR.prototype.open = function (method, url) {
              this.__tmChatBulkUrl = String(url || '');
              this.__tmChatBulkHeaders = {};
              return nativeOpen.apply(this, arguments);
            };

            XHR.prototype.setRequestHeader = function (key, value) {
              try {
                this.__tmChatBulkHeaders[String(key).toLowerCase()] = String(value);
              } catch (e) {}

              return nativeSetRequestHeader.apply(this, arguments);
            };

            XHR.prototype.send = function () {
              try {
                if ((this.__tmChatBulkUrl || '').indexOf('/api/aql') !== -1 || (this.__tmChatBulkUrl || '').indexOf('api.klingo.app') !== -1) {
                  emit(this.__tmChatBulkHeaders || {});
                }
              } catch (e) {}

              return nativeSend.apply(this, arguments);
            };
          } catch (e) {}
        })();
      `;

      (document.documentElement || document.head || document.body).appendChild(script);
      script.remove();

      window.addEventListener('tm-chat-bulk-auth-headers', function (event) {
        tmChatBulkCaptureAuthHeaders(event.detail || {});
      });
    } catch (e) {}
  }

  function tmChatBulkInstallNetworkCapture() {
    if (window.__tmChatBulkNetworkCaptureInstalled) return;
    window.__tmChatBulkNetworkCaptureInstalled = true;

    try {
      const nativeFetch = window.fetch;
      if (typeof nativeFetch === 'function') {
        window.fetch = async function tmChatBulkFetchProxy(...args) {
          const response = await nativeFetch.apply(this, args);

          try {
            const url = String(args[0]?.url || args[0] || '');

            if (url.includes('api.klingo.app') || url.includes('/api/aql')) {
              tmChatBulkCaptureAuthHeaders(args[1]?.headers || args[0]?.headers || {});
            }

            if (url.includes('usuarios.listar_conectados')) {
              response.clone().json().then((json) => {
                if (tmChatBulkStoreUsersFromResponseJson(json)) {
                  setTimeout(tmChatBulkApply, 50);
                }
              }).catch(() => {});
            }
          } catch (e) {}

          return response;
        };
      }
    } catch (e) {}

    try {
      const XHR = window.XMLHttpRequest;
      if (!XHR || !XHR.prototype) return;

      const nativeOpen = XHR.prototype.open;
      const nativeSend = XHR.prototype.send;

      XHR.prototype.open = function tmChatBulkXhrOpen(method, url, ...rest) {
        this.__tmChatBulkUrl = String(url || '');
        return nativeOpen.call(this, method, url, ...rest);
      };

      XHR.prototype.send = function tmChatBulkXhrSend(...args) {
        try {
          this.addEventListener('load', function () {
            try {
              const url = String(this.__tmChatBulkUrl || '');

              if (!url.includes('usuarios.listar_conectados')) return;

              const json = JSON.parse(this.responseText || '{}');

              if (tmChatBulkStoreUsersFromResponseJson(json)) {
                setTimeout(tmChatBulkApply, 50);
              }
            } catch (e) {}
          });
        } catch (e) {}

        return nativeSend.apply(this, args);
      };
    } catch (e) {}
  }


  function tmChatBulkModal() {
    return document.querySelector('#modalChat.show');
  }

  function tmChatBulkConnectedActive() {
    const modal = tmChatBulkModal();
    if (!modal) return false;

    const active = Array.from(modal.querySelectorAll('.btn-group button'))
      .find((btn) => btn.classList.contains('btn-secondary'));

    return !!active && tmChatBulkNorm(active.textContent) === 'CONECTADOS';
  }


  function tmChatBulkApiPost(url, payload) {
    const body = JSON.stringify(payload);

    async function nativeFetchAttempt() {
      const fetchFn =
        (typeof unsafeWindow !== 'undefined' && typeof unsafeWindow.fetch === 'function')
          ? unsafeWindow.fetch.bind(unsafeWindow)
          : window.fetch.bind(window);

      const headers = tmChatBulkGetAuthHeaders();

      console.info('[klingo chat bulk] request API direta', {
        url,
        hasAuthorization: !!headers.Authorization,
        extraHeaders: Object.keys(headers).filter((key) => !['Content-Type', 'Accept', 'Authorization'].includes(key))
      });

      const response = await fetchFn(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers,
        body
      });

      const raw = await response.text();
      let json = {};

      try {
        json = JSON.parse(raw || '{}');
      } catch (e) {
        throw new Error(`Resposta inválida HTTP ${response.status}`);
      }

      return {
        ok: response.ok,
        status: response.status,
        json,
        raw,
        via: 'native-fetch'
      };
    }

    return nativeFetchAttempt();
  }

  async function tmChatBulkLoadUsers() {
    if (TM_CHAT_BULK.loading) return;
    if (TM_CHAT_BULK.usersByName.size && Date.now() - TM_CHAT_BULK.loadedAt < 60000) return;

    TM_CHAT_BULK.loading = true;

    try {
      const result = await tmChatBulkApiPost('https://api.klingo.app/api/aql?a=usuarios.listar_conectados', {
        q: [{
          name: 'usuarios.listar_conectados',
          id: 'lista',
          parms: {}
        }]
      });

      tmChatBulkStoreUsersFromResponseJson(result.json);
    } catch (e) {
      console.error('[klingo chat bulk] erro ao carregar conectados', e);
    } finally {
      TM_CHAT_BULK.loading = false;
    }
  }

  async function tmChatBulkResolveUserIdByName(name) {
    const key = tmChatBulkNorm(name);

    if (!key) return null;

    const fromMap = tmChatBulkResolveFromMap(name);
    if (fromMap) return fromMap;

    if (TM_CHAT_BULK.pendingByName.has(key)) {
      return TM_CHAT_BULK.pendingByName.get(key);
    }

    const promise = (async () => {
      TM_CHAT_BULK.loadedAt = 0;
      await tmChatBulkLoadUsers();

      const afterLoad = tmChatBulkResolveFromMap(name);
      if (afterLoad) return afterLoad;

      // Pequena espera para caso o KLINGO esteja fazendo a request nativa
      await new Promise((resolve) => setTimeout(resolve, 400));

      return tmChatBulkResolveFromMap(name);
    })();

    TM_CHAT_BULK.pendingByName.set(key, promise);

    try {
      return await promise;
    } finally {
      TM_CHAT_BULK.pendingByName.delete(key);
    }
  }


  function tmChatBulkCSS() {
    if (document.getElementById('tm-chat-bulk-style')) return;

    const style = document.createElement('style');
    style.id = 'tm-chat-bulk-style';
    style.textContent = `
      #modalChat .tm-chat-bulk-bar {
        margin: 0 0 10px 0;
        padding: 8px 10px;
        border: 1px solid #d7dbe2;
        border-radius: 8px;
        background: #f8f9fa;
      }

      #modalChat .tm-chat-bulk-top {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
        font-size: 13px;
        color: #495057;
      }

      #modalChat .tm-chat-bulk-top label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        user-select: none;
        cursor: pointer;
      }

      #modalChat .tm-chat-bulk-row-input {
        display: flex;
        gap: 8px;
      }

      #modalChat .tm-chat-bulk-message {
        flex: 1 1 auto;
        height: 40px;
        min-height: 40px;
        max-height: 80px;
        resize: vertical;
      }

      #modalChat .tm-chat-bulk-send {
        width: 126px;
        flex: 0 0 126px;
      }

      #modalChat .tm-chat-bulk-status {
        display: none !important;
      }

      #modalChat ul.list-group.tm-chat-bulk-enabled li.list-group-item.tm-chat-bulk-row {
        display: grid !important;
        grid-template-columns: 24px minmax(0, 1fr) auto !important;
        align-items: center !important;
        column-gap: 8px !important;
      }

      #modalChat .tm-chat-bulk-cell {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 24px !important;
        min-width: 24px !important;
      }

      #modalChat .tm-chat-bulk-check {
        display: inline-block !important;
        width: 16px !important;
        height: 16px !important;
        margin: 0 !important;
        opacity: 1 !important;
        visibility: visible !important;
        appearance: auto !important;
        -webkit-appearance: checkbox !important;
        cursor: pointer !important;
        position: static !important;
      }

      #modalChat .tm-chat-bulk-check:not(:disabled) {
        cursor: pointer !important;
        opacity: 1 !important;
      }

      #modalChat .tm-chat-bulk-check:disabled {
        cursor: not-allowed !important;
        opacity: 0.45 !important;
      }

      #modalChat ul.list-group.tm-chat-bulk-enabled li.list-group-item > a.card-link,
      #modalChat ul.list-group.tm-chat-bulk-enabled li.list-group-item > span.text-muted {
        min-width: 0 !important;
      }

      #modalChat .modal-content {
        position: relative !important;
      }

      #modalChat.tm-chat-bulk-modal-sending .tm-chat-bulk-bar,
      #modalChat.tm-chat-bulk-modal-sending ul.list-group,
      #modalChat.tm-chat-bulk-modal-sending .modal-footer {
        pointer-events: none !important;
      }

      #modalChat .tm-chat-bulk-sending-overlay {
        position: absolute !important;
        inset: 0 !important;
        z-index: 100000001 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(255, 255, 255, 0.97) !important;
        border-radius: 4px !important;
        color: #343a40 !important;
        text-align: center !important;
        padding: 24px !important;
      }

      #modalChat .tm-chat-bulk-sending-box {
        width: min(420px, 90%) !important;
        padding: 18px 20px !important;
        border: 1px solid #d7dbe2 !important;
        border-radius: 10px !important;
        background: #ffffff !important;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
      }

      #modalChat .tm-chat-bulk-sending-title {
        font-size: 18px !important;
        font-weight: 600 !important;
        margin-bottom: 8px !important;
      }

      #modalChat .tm-chat-bulk-sending-progress {
        font-size: 14px !important;
        color: #6c757d !important;
        line-height: 1.4 !important;
        min-height: 22px !important;
      }

      #modalChat .tm-chat-bulk-sending-spinner {
        width: 28px !important;
        height: 28px !important;
        border: 3px solid #d7dbe2 !important;
        border-top-color: #007bff !important;
        border-radius: 50% !important;
        margin: 0 auto 12px auto !important;
        animation: tmChatBulkSpin 0.75s linear infinite !important;
      }

      @keyframes tmChatBulkSpin {
        to { transform: rotate(360deg); }
      }


      /* TM FIX 15.4 - composer fixo abaixo da lista */
      #modalChat .modal-body {
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }

      #modalChat ul.list-group.tm-chat-bulk-enabled {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        margin-bottom: 12px !important;
      }

      #modalChat .tm-chat-bulk-bar {
        flex: 0 0 auto !important;
        order: 9999 !important;
        position: sticky !important;
        bottom: 0 !important;
        z-index: 5 !important;
        margin: 0 !important;
        padding: 10px 12px 12px 12px !important;
        border: 1px solid #d7dbe2 !important;
        border-radius: 8px !important;
        background: #f8f9fa !important;
        box-shadow: 0 -6px 16px rgba(0,0,0,0.06) !important;
      }

      #modalChat .tm-chat-bulk-top {
        margin-bottom: 8px !important;
      }

      #modalChat .tm-chat-bulk-clear {
        display: none !important;
      }

      #modalChat .tm-chat-bulk-row-input {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
      }

      #modalChat .tm-chat-bulk-message {
        width: 100% !important;
        min-height: 68px !important;
        height: 68px !important;
        max-height: 120px !important;
        resize: vertical !important;
        padding: 12px 70px 12px 12px !important;
        font-size: 15px !important;
        line-height: 1.35 !important;
        border-radius: 6px !important;
      }

      #modalChat .tm-chat-bulk-send {
        position: absolute !important;
        right: 10px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 42px !important;
        height: 42px !important;
        min-width: 42px !important;
        padding: 0 !important;
        border-radius: 8px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 0 !important;
        z-index: 2 !important;
      }

      #modalChat .tm-chat-bulk-send::before {
        content: '➤' !important;
        font-size: 18px !important;
        line-height: 1 !important;
      }


      /* TM FIX 15.5 - remover flicker e separar lista/composer */
      #modalChat .modal-body.tm-chat-bulk-active {
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
        height: calc(100vh - 190px) !important;
        max-height: calc(100vh - 190px) !important;
        overflow: hidden !important;
        padding-bottom: 12px !important;
      }

      #modalChat .modal-body.tm-chat-bulk-active > .input-group,
      #modalChat .modal-body.tm-chat-bulk-active > .btn-group {
        flex: 0 0 auto !important;
      }

      #modalChat.tm-chat-bulk-connected-active .modal-body.tm-chat-bulk-active ul.list-group.tm-chat-bulk-enabled {
        flex: 1 1 auto !important;
        min-height: 120px !important;
        overflow-y: auto !important;
        margin-bottom: 10px !important;
        position: relative !important;
        z-index: 1 !important;
      }

      #modalChat .modal-body.tm-chat-bulk-active .tm-chat-bulk-bar {
        flex: 0 0 auto !important;
        position: relative !important;
        bottom: auto !important;
        order: 9999 !important;
        z-index: 2 !important;
        margin: 0 !important;
        background: #f8f9fa !important;
      }

      #modalChat:not(.tm-chat-bulk-connected-active) .tm-chat-bulk-bar,
      #modalChat:not(.tm-chat-bulk-connected-active) .tm-chat-bulk-cell {
        display: none !important;
      }


      /* TM FIX 15.6 - confirmação dentro do modal */
      #modalChat .tm-chat-bulk-confirm-overlay {
        position: absolute !important;
        inset: 0 !important;
        z-index: 100000002 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(0,0,0,0.38) !important;
        border-radius: 4px !important;
        padding: 20px !important;
      }

      #modalChat .tm-chat-bulk-confirm-box {
        width: min(440px, 92%) !important;
        background: #ffffff !important;
        border: 1px solid #d7dbe2 !important;
        border-radius: 12px !important;
        box-shadow: 0 16px 36px rgba(0,0,0,0.22) !important;
        padding: 18px 18px 16px 18px !important;
      }

      #modalChat .tm-chat-bulk-confirm-title {
        font-size: 18px !important;
        font-weight: 600 !important;
        color: #212529 !important;
        margin-bottom: 8px !important;
      }

      #modalChat .tm-chat-bulk-confirm-text {
        font-size: 14px !important;
        color: #495057 !important;
        line-height: 1.45 !important;
        margin-bottom: 14px !important;
      }

      #modalChat .tm-chat-bulk-confirm-actions {
        display: flex !important;
        justify-content: flex-end !important;
        gap: 10px !important;
      }

      #modalChat .tm-chat-bulk-confirm-actions .btn {
        min-width: 96px !important;
      }

      /* TM FIX 15.7 - não renderizar composer no chat individual */
      #modalChat.tm-chat-bulk-conversation-view .tm-chat-bulk-bar,
      #modalChat.tm-chat-bulk-conversation-view .tm-chat-bulk-cell {
        display: none !important;
      }

      #modalChat.tm-chat-bulk-conversation-view .modal-body {
        display: block !important;
        height: auto !important;
        max-height: none !important;
        overflow: auto !important;
      }

      #modalChat ul.list-group.tm-chat-bulk-enabled li.list-group-item:not(.tm-chat-bulk-row) {
        display: block !important;
      }


      /* TM FIX 15.8 - retorno sem flicker do chat individual */
      #modalChat.tm-chat-bulk-returning-to-list:not(.tm-chat-bulk-connected-active) ul.list-group {
        visibility: hidden !important;
      }

      #modalChat.tm-chat-bulk-returning-to-list .tm-chat-bulk-bar {
        visibility: hidden !important;
      }

      #modalChat.tm-chat-bulk-connected-active.tm-chat-bulk-returning-to-list ul.list-group,
      #modalChat.tm-chat-bulk-connected-active.tm-chat-bulk-returning-to-list .tm-chat-bulk-bar {
        visibility: visible !important;
      }

`;

    document.head.appendChild(style);
  }

  function tmChatBulkRows() {
    const modal = tmChatBulkModal();
    if (!modal || !tmChatBulkConnectedActive()) return [];

    const list = modal.querySelector('ul.list-group');
    if (!list) return [];

    return Array.from(list.querySelectorAll(':scope > li.list-group-item'));
  }

  function tmChatBulkName(row) {
    const node = row.querySelector(':scope > a.card-link, :scope > span.text-muted');
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function tmChatBulkSelected() {
    return tmChatBulkRows().filter((row) => {
      const check = row.querySelector(':scope > .tm-chat-bulk-cell .tm-chat-bulk-check');
      return check && !check.disabled && check.checked;
    });
  }

  function tmChatBulkUpdateCounter() {
    const modal = tmChatBulkModal();
    if (!modal) return;

    const checks = tmChatBulkRows()
      .map((row) => row.querySelector(':scope > .tm-chat-bulk-cell .tm-chat-bulk-check'))
      .filter((check) => check && !check.disabled);

    const selected = checks.filter((check) => check.checked);

    const counter = modal.querySelector('.tm-chat-bulk-counter');
    if (counter) {
      counter.textContent = `${selected.length} selecionado${selected.length === 1 ? '' : 's'}`;
    }

    const all = modal.querySelector('.tm-chat-bulk-select-all');
    if (all) {
      all.checked = checks.length > 0 && selected.length === checks.length;
      all.indeterminate = selected.length > 0 && selected.length < checks.length;
    }

    const send = modal.querySelector('.tm-chat-bulk-send');
    if (send) {
      send.disabled = TM_CHAT_BULK.sending || selected.length === 0;
    }
  }

  function tmChatBulkEnsureBar() {
    const modal = tmChatBulkModal();
    if (!modal || !tmChatBulkIsConnectedListView()) return;

    const body = modal.querySelector('.modal-body');
    const list = modal.querySelector('ul.list-group');
    if (!body || !list) return;

    modal.classList.remove('tm-chat-bulk-conversation-view');
    modal.classList.remove('tm-chat-bulk-returning-to-list');
    modal.classList.add('tm-chat-bulk-connected-active');
    body.classList.add('tm-chat-bulk-active');
    list.classList.add('tm-chat-bulk-enabled');

    if (modal.querySelector('.tm-chat-bulk-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'tm-chat-bulk-bar';
    bar.innerHTML = `
      <div class="tm-chat-bulk-top">
        <label><input type="checkbox" class="tm-chat-bulk-select-all"> Selecionar todos</label>
        <span class="tm-chat-bulk-counter">0 selecionados</span>
      </div>
      <div class="tm-chat-bulk-row-input">
        <textarea class="form-control tm-chat-bulk-message" rows="2" placeholder="Mensagem para usuários selecionados..."></textarea>
        <button type="button" class="btn btn-primary tm-chat-bulk-send" disabled title="Enviar">Enviar</button>
      </div>
      <div class="tm-chat-bulk-status"></div>
    `;

    body.insertBefore(bar, list.nextSibling);

    bar.querySelector('.tm-chat-bulk-select-all').addEventListener('change', (event) => {
      const checked = event.currentTarget.checked;

      tmChatBulkRows().forEach((row) => {
        const check = row.querySelector(':scope > .tm-chat-bulk-cell .tm-chat-bulk-check');
        if (check && !check.disabled) check.checked = checked;
      });

      tmChatBulkUpdateCounter();
    });

    bar.querySelector('.tm-chat-bulk-send').addEventListener('click', tmChatBulkSendSelected);
  }

  function tmChatBulkEnsureCheckboxes() {
    const modal = tmChatBulkModal();
    if (!modal || !tmChatBulkConnectedActive()) return;

    const list = modal.querySelector('ul.list-group');
    if (!list) return;

    list.classList.add('tm-chat-bulk-enabled');

    tmChatBulkRows().forEach((row) => {
      const directCell = row.querySelector(':scope > .tm-chat-bulk-cell');
      if (directCell) {
        const check = directCell.querySelector('.tm-chat-bulk-check');
        const name = tmChatBulkName(row);
        const userId = tmChatBulkResolveFromMap(name);

        if (check && userId && !check.dataset.tmChatBulkUserId) {
          check.dataset.tmChatBulkUserId = String(userId);
          check.disabled = false;
          check.title = `Selecionar ${name}`;
        }

        return;
      }

      const name = tmChatBulkName(row);
      const link = row.querySelector(':scope > a.card-link');
      const user = TM_CHAT_BULK.usersByName.get(tmChatBulkNorm(name));

      const cell = document.createElement('span');
      cell.className = 'tm-chat-bulk-cell';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'tm-chat-bulk-check';
      check.dataset.tmChatBulkName = name;

      if (!link) {
        check.disabled = true;
        check.title = 'Usuário atual ou indisponível';
      } else {
        check.disabled = false;
        check.title = `Selecionar ${name}`;

        if (user?.id) {
          check.dataset.tmChatBulkUserId = String(user.id);
        }
      }

      check.addEventListener('click', (event) => {
        event.stopPropagation();
      }, true);

      check.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      }, true);

      check.addEventListener('change', async (event) => {
        event.stopPropagation();

        const target = event.currentTarget;

        if (target.checked && !target.dataset.tmChatBulkUserId) {
          target.dataset.tmChatBulkResolving = '1';
          target.title = 'Resolvendo usuário...';

          const resolvedId = await tmChatBulkResolveUserIdByName(target.dataset.tmChatBulkName || '');

          delete target.dataset.tmChatBulkResolving;

          if (resolvedId) {
            target.dataset.tmChatBulkUserId = String(resolvedId);
            target.title = `Selecionar ${target.dataset.tmChatBulkName || ''}`;
          } else {
            target.checked = false;
            target.title = 'Não foi possível identificar o ID deste usuário';
            const status = tmChatBulkModal()?.querySelector('.tm-chat-bulk-status');
            if (status) status.textContent = `ID não encontrado para: ${target.dataset.tmChatBulkName || ''}. Aguarde alguns segundos e tente novamente.`;
          }
        }

        tmChatBulkUpdateCounter();
      });

      cell.appendChild(check);
      row.classList.add('tm-chat-bulk-row');
      row.insertBefore(cell, row.firstChild);
    });
  }


  async function tmChatBulkOpenConversation(userId) {
    const payload = {
      q: [{
        name: 'chat.index',
        id: 'lista',
        parms: {
          to: Number(userId)
        }
      }]
    };

    const result = await tmChatBulkApiPost('https://api.klingo.app/api/aql?a=chat.index', payload);
    const json = result.json;

    const status =
      json?.lista?.status ??
      json?.status ??
      null;

    if (!result.ok || Number(status) !== 200) {
      console.error('[klingo chat bulk] chat.index falhou', {
        via: result.via,
        httpStatus: result.status,
        apiStatus: status,
        userId,
        payload,
        response: json,
        raw: result.raw
      });

      throw new Error(`chat.index HTTP ${result.status} / API ${status || 'sem status'}`);
    }

    return json;
  }

  function tmChatBulkFindMessageInIndex(indexJson, userId, message) {
    const expectedText = String(message || '').trim();
    if (!expectedText) return false;

    const msgs =
      indexJson?.lista?.data?.msgs ||
      indexJson?.data?.msgs ||
      [];

    if (!Array.isArray(msgs) || !msgs.length) return false;

    return msgs.some((msg) => {
      const msgText = String(msg?.st_mensagem || '').trim();
      const dest = Number(msg?.id_usuario_destino);
      return msgText === expectedText && dest === Number(userId);
    });
  }

  async function tmChatBulkValidateSentMessage(userId, message) {
    const indexJson = await tmChatBulkOpenConversation(userId);
    return tmChatBulkFindMessageInIndex(indexJson, userId, message);
  }

  async function tmChatBulkSendMessage(userId, message) {
    const payload = {
      q: [{
        name: 'chat.send',
        id: 'atualizar',
        parms: {
          to: Number(userId),
          text: String(message || '')
        }
      }]
    };

    const result = await tmChatBulkApiPost('https://api.klingo.app/api/aql?a=chat.send', payload);
    const json = result.json;

    const status =
      json?.atualizar?.status ??
      json?.lista?.status ??
      json?.status ??
      null;

    const data =
      json?.atualizar?.data ??
      json?.data ??
      null;

    if (!result.ok || Number(status) !== 200) {
      console.error('[klingo chat bulk] chat.send falhou', {
        via: result.via,
        httpStatus: result.status,
        apiStatus: status,
        userId,
        payload,
        response: json,
        raw: result.raw
      });

      if (Number(result.status) === 401) {
        throw new Error('HTTP 401: autenticação não capturada. Abra/envie uma mensagem individual uma vez e tente novamente.');
      }

      throw new Error(`HTTP ${result.status} / API ${status || 'sem status'}`);
    }

    console.info('[klingo chat bulk] chat.send OK', {
      via: result.via,
      userId,
      response: json
    });

    return json;
  }

  function tmChatBulkSleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }


  function tmChatBulkSetNativeValue(element, value) {
    if (!element) return;

    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
  }

  function tmChatBulkWaitFor(condition, timeout = 5000, step = 120) {
    return new Promise((resolve, reject) => {
      const started = Date.now();

      const tick = () => {
        let result = null;

        try {
          result = condition();
        } catch (e) {}

        if (result) {
          resolve(result);
          return;
        }

        if (Date.now() - started >= timeout) {
          reject(new Error('tempo esgotado'));
          return;
        }

        setTimeout(tick, step);
      };

      tick();
    });
  }


  function tmChatBulkIsConversationView() {
    const modal = tmChatBulkModal();
    if (!modal) return false;

    return !!(
      modal.querySelector('.modal-header .modal-title a .fa-chevron-left, .modal-header .modal-title a.mr-3') ||
      modal.querySelector('.modal-footer textarea.form-control, .modal-footer textarea')
    );
  }

  function tmChatBulkIsConnectedListView() {
    const modal = tmChatBulkModal();
    if (!modal) return false;

    if (tmChatBulkIsConversationView()) return false;
    if (!tmChatBulkConnectedActive()) return false;

    const list = modal.querySelector('ul.list-group');
    if (!list) return false;

    return !!list.querySelector(':scope > li.list-group-item a.card-link, :scope > li.list-group-item span.text-muted');
  }

  function tmChatBulkResetRowsOnly() {
    const modal = tmChatBulkModal();
    if (!modal) return;

    modal.querySelectorAll('.tm-chat-bulk-cell').forEach((cell) => cell.remove());
    modal.querySelectorAll('li.tm-chat-bulk-row').forEach((row) => row.classList.remove('tm-chat-bulk-row'));
    modal.querySelectorAll('li.tm-chat-bulk-row').forEach((row) => row.classList.remove('tm-chat-bulk-row'));
  }



  async function tmChatBulkBackToList() {
    const modal = tmChatBulkModal();
    if (!modal) return;

    if (!tmChatBulkIsConversationView()) return;

    const back =
      modal.querySelector('.modal-title a.mr-3') ||
      modal.querySelector('.modal-title a');

    if (back) {
      back.click();
    }

    await tmChatBulkWaitFor(() => {
      return tmChatBulkConnectedActive() && modal.querySelector('ul.list-group li.list-group-item a.card-link');
    }, 5000).catch(() => null);

    await tmChatBulkSleep(250);
    await tmChatBulkApply();
  }

  function tmChatBulkFindUserLinkByName(name) {
    const modal = tmChatBulkModal();
    if (!modal) return null;

    const target = tmChatBulkNorm(name);

    return Array.from(modal.querySelectorAll('ul.list-group li.list-group-item a.card-link'))
      .find((link) => tmChatBulkNorm(link.textContent) === target) || null;
  }

  async function tmChatBulkOpenUserNative(name) {
    await tmChatBulkBackToList();

    const link = await tmChatBulkWaitFor(() => tmChatBulkFindUserLinkByName(name), 5000)
      .catch(() => null);

    if (!link) {
      throw new Error(`usuário não encontrado na lista: ${name}`);
    }

    link.click();

    await tmChatBulkWaitFor(() => {
      const modal = tmChatBulkModal();
      if (!modal) return false;

      const title = modal.querySelector('.modal-title span');
      const textarea = modal.querySelector('.modal-footer textarea.form-control, .modal-footer textarea');

      return textarea && title && tmChatBulkNorm(title.textContent) === tmChatBulkNorm(name);
    }, 7000);

    await tmChatBulkSleep(250);
  }

  async function tmChatBulkSendMessageNative(name, message) {
    await tmChatBulkOpenUserNative(name);

    const modal = tmChatBulkModal();
    const textarea = modal.querySelector('.modal-footer textarea.form-control, .modal-footer textarea');
    const sendBtn = modal.querySelector('.modal-footer button.btn-success');

    if (!textarea || !sendBtn) {
      throw new Error('campo de mensagem ou botão enviar não encontrado');
    }

    textarea.focus();
    tmChatBulkSetNativeValue(textarea, message);

    await tmChatBulkWaitFor(() => {
      const btn = modal.querySelector('.modal-footer button.btn-success');
      return btn && !btn.disabled ? btn : null;
    }, 3000).catch(() => null);

    if (sendBtn.disabled) {
      throw new Error('botão nativo de envio permaneceu desabilitado');
    }

    sendBtn.click();

    const delivered = await tmChatBulkWaitFor(() => {
      const sentMessages = Array.from(modal.querySelectorAll('ul.list-group li.list-group-item-success .text-right'));
      return sentMessages.some((node) => (node.textContent || '').trim() === message);
    }, 7000).catch(() => false);

    if (!delivered) {
      throw new Error('mensagem não apareceu no histórico após envio nativo');
    }

    await tmChatBulkSleep(250);
  }


  function tmChatBulkShowSendingOverlay(total) {
    return;
  }

  function tmChatBulkUpdateSendingOverlay(text) {
    return;
  }

  function tmChatBulkHideSendingOverlay() {
    return;
  }


  function tmChatBulkConfirmSend(total) {
    const modal = tmChatBulkModal();
    const content = modal?.querySelector('.modal-content');

    if (!modal || !content) {
      return Promise.resolve(window.confirm(`Enviar esta mensagem para ${total} usuário${total === 1 ? '' : 's'} conectado${total === 1 ? '' : 's'}?`));
    }

    modal.querySelector('.tm-chat-bulk-confirm-overlay')?.remove();

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'tm-chat-bulk-confirm-overlay';
      overlay.innerHTML = `
        <div class="tm-chat-bulk-confirm-box" role="dialog" aria-modal="true" aria-label="Confirmar envio em massa">
          <div class="tm-chat-bulk-confirm-title">Confirmar envio</div>
          <div class="tm-chat-bulk-confirm-text">Enviar esta mensagem para <strong>${total}</strong> usuário${total === 1 ? '' : 's'} conectado${total === 1 ? '' : 's'}?</div>
          <div class="tm-chat-bulk-confirm-actions">
            <button type="button" class="btn btn-secondary tm-chat-bulk-confirm-cancel">Cancelar</button>
            <button type="button" class="btn btn-primary tm-chat-bulk-confirm-ok">Enviar</button>
          </div>
        </div>
      `;

      const finish = (value) => {
        overlay.remove();
        resolve(value);
      };

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) finish(false);
      });

      overlay.querySelector('.tm-chat-bulk-confirm-cancel')?.addEventListener('click', () => finish(false));
      overlay.querySelector('.tm-chat-bulk-confirm-ok')?.addEventListener('click', () => finish(true));

      overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') finish(false);
      });

      content.appendChild(overlay);
      overlay.tabIndex = -1;
      overlay.focus();
    });
  }

  async function tmChatBulkSendSelected() {
    if (TM_CHAT_BULK.sending) return;

    const modal = tmChatBulkModal();
    if (!modal || !tmChatBulkConnectedActive()) return;

    const message = (modal.querySelector('.tm-chat-bulk-message')?.value || '').trim();
    const status = modal.querySelector('.tm-chat-bulk-status');

    if (!message) {
      if (status) status.textContent = 'Digite uma mensagem antes de enviar.';
      modal.querySelector('.tm-chat-bulk-message')?.focus();
      return;
    }

    const recipients = [];

    for (const row of tmChatBulkSelected()) {
      const check = row.querySelector(':scope > .tm-chat-bulk-cell .tm-chat-bulk-check');
      const name = check?.dataset.tmChatBulkName || tmChatBulkName(row);
      let id = Number(check?.dataset.tmChatBulkUserId);

      if (!id) {
        id = Number(await tmChatBulkResolveUserIdByName(name));
        if (id && check) {
          check.dataset.tmChatBulkUserId = String(id);
        }
      }

      if (id) {
        recipients.push({ id, name });
      }
    }

    if (!recipients.length) {
      if (status) status.textContent = 'Selecione pelo menos um usuário com ID resolvido.';
      return;
    }

    const confirmed = await tmChatBulkConfirmSend(recipients.length);
    if (!confirmed) {
      return;
    }

    TM_CHAT_BULK.sending = true;
    tmChatBulkUpdateCounter();


    let ok = 0;
    let fail = 0;

    try {

      const results = await Promise.allSettled(
        recipients.map(async (item) => {
          await tmChatBulkOpenConversation(item.id);
          await tmChatBulkSleep(80);

          const sendResponse = await tmChatBulkSendMessage(item.id, message);
          await tmChatBulkSleep(180);

          const delivered = await tmChatBulkValidateSentMessage(item.id, message);

          if (!delivered) {
            throw new Error('mensagem não encontrada no histórico após envio');
          }

          return {
            item,
            sendResponse
          };
        })
      );

      results.forEach((result, index) => {
        const item = recipients[index];

        if (result.status === 'fulfilled') {
          ok += 1;
          console.info('[klingo chat bulk] API direta paralela validada', {
            user: item,
            sendResponse: result.value?.sendResponse
          });
        } else {
          fail += 1;
          console.error('[klingo chat bulk] falha no envio paralelo em massa', item, result.reason);
        }
      });


      if (!fail) {
        const msg = modal.querySelector('.tm-chat-bulk-message');
        if (msg) msg.value = '';
      }

      tmChatBulkRows().forEach((row) => {
        const check = row.querySelector(':scope > .tm-chat-bulk-cell .tm-chat-bulk-check');
        if (check) check.checked = false;
      });
    } finally {

      TM_CHAT_BULK.sending = false;
      tmChatBulkUpdateCounter();
    }
  }


  function tmChatBulkCleanupVisualState() {
    const modal = tmChatBulkModal();
    if (!modal) return;

    const body = modal.querySelector('.modal-body');

    modal.classList.remove('tm-chat-bulk-connected-active');
    modal.classList.remove('tm-chat-bulk-conversation-view');
    body?.classList.remove('tm-chat-bulk-active');

    modal.querySelector('.tm-chat-bulk-bar')?.remove();
    modal.querySelectorAll('.tm-chat-bulk-cell').forEach((cell) => cell.remove());
    modal.querySelector('ul.list-group')?.classList.remove('tm-chat-bulk-enabled');
    TM_CHAT_BULK.lastSignature = '';
  }

  function tmChatBulkScheduleApply(delay = 80) {
    clearTimeout(TM_CHAT_BULK.applyTimer);
    TM_CHAT_BULK.applyTimer = setTimeout(() => {
      tmChatBulkApply().catch((e) => {
        console.error('[klingo chat bulk] erro ao aplicar UI agendada', e);
      });
    }, delay);
  }

  function tmChatBulkScheduleApplyBurst() {
    [0, 30, 80, 150, 260, 420, 650].forEach((delay) => {
      setTimeout(() => {
        tmChatBulkApply().catch((e) => {
          console.error('[klingo chat bulk] erro ao aplicar UI em rajada', e);
        });
      }, delay);
    });
  }

  function tmChatBulkInstallFastUiHooks() {
    if (window.__tmChatBulkFastUiHooksInstalled) return;
    window.__tmChatBulkFastUiHooksInstalled = true;

    document.addEventListener('click', (event) => {
      const modal = event.target?.closest?.('#modalChat');
      if (!modal) return;

      const backButton = event.target.closest('.modal-title a, .modal-header a');
      if (backButton && backButton.querySelector('.fa-chevron-left')) {
        const modalEl = backButton.closest('#modalChat');
        if (modalEl) {
          tmChatBulkCleanupVisualState();
          modalEl.classList.add('tm-chat-bulk-returning-to-list');
        }

        tmChatBulkScheduleApplyBurst();
        return;
      }

      const userLink = event.target.closest('ul.list-group li.list-group-item a.card-link');
      if (userLink) {
        tmChatBulkCleanupVisualState();
        return;
      }

      const tabButton = event.target.closest('.btn-group button');
      if (!tabButton) return;

      const tabText = tmChatBulkNorm(tabButton.textContent);

      if (tabText !== 'CONECTADOS') {
        tmChatBulkCleanupVisualState();
        return;
      }

      tmChatBulkScheduleApply(30);
    }, true);

    document.addEventListener('shown.bs.modal', (event) => {
      if (event.target?.id === 'modalChat') {
        tmChatBulkScheduleApply(30);
      }
    }, true);

    document.addEventListener('input', (event) => {
      const modal = event.target?.closest?.('#modalChat');
      if (!modal) return;

      if (event.target.matches('input[placeholder*="Pesquisar"], input[placeholder*="pesquisar"]')) {
        tmChatBulkScheduleApply(120);
      }
    }, true);
  }

  async function tmChatBulkApply() {
    const modal = tmChatBulkModal();

    if (!modal) {
      TM_CHAT_BULK.lastSignature = '';
      return;
    }

    if (!tmChatBulkIsConnectedListView()) {
      tmChatBulkCleanupVisualState();
      if (tmChatBulkIsConversationView()) {
        modal.classList.add('tm-chat-bulk-conversation-view');
      }
      return;
    }

    const list = modal.querySelector('ul.list-group');
    if (!list) return;

    modal.classList.add('tm-chat-bulk-connected-active');
    modal.querySelector('.modal-body')?.classList.add('tm-chat-bulk-active');
    list.classList.add('tm-chat-bulk-enabled');

    const rowNames = tmChatBulkRows().map(tmChatBulkName).join('|');
    const signature = `${rowNames}::${TM_CHAT_BULK.usersByName.size}`;

    if (signature === TM_CHAT_BULK.lastSignature && modal.querySelector('.tm-chat-bulk-bar') && modal.querySelector('.tm-chat-bulk-cell')) {
      return;
    }

    TM_CHAT_BULK.lastSignature = signature;

    tmChatBulkCSS();
    tmChatBulkInstallPageNetworkCapture();
    tmChatBulkInstallNetworkCapture();
    await tmChatBulkLoadUsers();
    tmChatBulkEnsureBar();
    tmChatBulkEnsureCheckboxes();
    tmChatBulkUpdateCounter();

    if (modal.querySelector('.tm-chat-bulk-bar') && modal.querySelector('.tm-chat-bulk-cell')) {
      modal.classList.remove('tm-chat-bulk-returning-to-list');
    }
  }

  tmChatBulkInstallPageNetworkCapture();
  tmChatBulkInstallNetworkCapture();
  tmChatBulkInstallPageNetworkCapture();
  tmChatBulkInstallFastUiHooks();
  setInterval(tmChatBulkApply, 700);


/* TM 16.3: fechamento extra removido. */

