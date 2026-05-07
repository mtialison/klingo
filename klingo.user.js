// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      22.4
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
      : '22.4';
    const match = version.match(/\d+(?:\.\d+)?/);
    return match ? match[0] : '22.4';
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

  
  document.addEventListener('mousedown', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('li.list-group-item button.btn')
      : null;

    if (!button || button.closest('#minutoModal')) return;

    restoreNativeHeader(document.querySelector('#minutoModal'));
  }, true);

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

    for (const label of labels) {
      if (tmCadNorm(label.innerText || label.textContent || '') !== labelText) continue;

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
      tmCadHasLabel(modal, 'Origem de Pacientes')
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
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Origem de Pacientes')),
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
      return tmCadNorm(small.innerText || small.textContent || '') === 'ORIGEM DE PACIENTES';
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
    const origem = tmCadFieldByLabel(modal, 'Origem de Pacientes');

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


