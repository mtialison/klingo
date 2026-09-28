// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      26.2
// @description  zoro > sanji
// @match        https://*.klingo.app/*
// @updateURL    https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js
// @author       alison
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_info
// @run-at       document-idle
// ==/UserScript==

// Uma única fila coordena atualizações dos recursos em páginas dinâmicas.
const tmRuntime = (() => {
  const jobs = new Map();
  let pending = null;
  let observer = null;
  let running = false;

  function flush() {
    pending = null;
    if (running) return;
    running = true;
    jobs.forEach((job, name) => {
      try {
        job();
      } catch (error) {
        console.error(`[TM] Falha em ${name}`, error);
      }
    });
    running = false;
    observer?.takeRecords();
  }

  function schedule(delay = 80) {
    if (pending !== null) return;
    pending = window.setTimeout(flush, delay);
  }

  function start() {
    if (observer || !document.body) return;
    observer = new MutationObserver(() => schedule());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.setInterval(() => schedule(), 1500);
    schedule(0);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  return {
    register(name, job) {
      jobs.set(name, job);
      schedule(0);
    },
    schedule
  };
})();

function tmCaptureAttributes(root) {
  return Array.from(root.querySelectorAll('*'), (element) => ({
    element,
    attributes: ['class', 'style', 'tabindex', 'autofocus'].map((name) => [name, element.getAttribute(name)])
  }));
}

function tmRestoreAttributes(snapshot) {
  snapshot.forEach(({ element, attributes }) => {
    if (!element.isConnected) return;
    attributes.forEach(([name, value]) => {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    });
  });
}

function tmCaptureHeaderContents(root) {
  return Array.from(root.querySelectorAll('small'))
    .filter((element) => element.querySelector('.fa-calendar-alt'))
    .map((element) => ({ element, nodes: Array.from(element.childNodes) }));
}

function tmRestoreHeaderContents(snapshot) {
  snapshot.forEach(({ element, nodes }) => {
    if (element.isConnected && (element.childNodes.length !== nodes.length ||
        nodes.some((node, index) => element.childNodes[index] !== node))) {
      element.replaceChildren(...nodes);
    }
  });
}

function tmParseDateInput(rawValue) {
  const value = String(rawValue || '').trim();
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const compact = value.match(/^(\d{2})(\d{2})(\d{4})$/);
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!br && !compact && !iso) return '';

  const year = Number(iso ? iso[1] : (br || compact)[3]);
  const month = Number(iso ? iso[2] : (br || compact)[2]);
  const day = Number(iso ? iso[3] : (br || compact)[1]);
  if (year < 1) return '';

  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

(function () {
  'use strict';

  function norm(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
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

  function tmDateCalcIsOwnCopyButton(targetEl) {
    return !!(
      targetEl &&
      targetEl.matches &&
      targetEl.matches('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"], [data-tm-copy-date-result="1"]')
    );
  }

  async function copyText(text, targetEl) {
    if (!text) return false;

    const isDateCalcCopy = tmDateCalcIsOwnCopyButton(targetEl);

    try {
      await navigator.clipboard.writeText(text);

      if (isDateCalcCopy) tmDateCalcMarkCopied(targetEl);
      return true;
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (_) {
        return false;
      } finally {
        ta.remove();
      }

      if (!copied) return false;

      if (isDateCalcCopy) tmDateCalcMarkCopied(targetEl);
      return true;
    }
  }




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

    if (card.querySelector('#tm-login-icon')) return;

    card.style.position = card.style.position || 'relative';

    const loginIcon = document.createElement('img');
    loginIcon.id = 'tm-login-icon';
    loginIcon.src = 'data:image/png;base64,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';
    loginIcon.alt = '';
    loginIcon.setAttribute('aria-hidden', 'true');

    loginIcon.style.position = 'absolute';
    loginIcon.style.width = '48px';
    loginIcon.style.height = '48px';
    loginIcon.style.objectFit = 'contain';
    loginIcon.style.right = '20px';
    loginIcon.style.top = '325px';
    loginIcon.style.zIndex = '5';
    loginIcon.style.pointerEvents = 'none';
    loginIcon.style.userSelect = 'none';

    card.appendChild(loginIcon);
  }

  const AUTO_LOGIN_LOGOUT_KEY = 'klingo_auto_login_manual_logout_v2';
  const MANUAL_LOGIN_PENDING_KEY = 'klingo_manual_login_pending_v2';
  const AUTO_LOGIN_PENDING_KEY = 'klingo_auto_login_attempt_pending_v1';
  let autoLoginAttempted = false;
  let manualLoginEntry = false;
  let autoLoginTask = null;
  let silentCredentialRequested = false;
  try { sessionStorage.removeItem('klingo_auto_login_trace_v1'); }
  catch (_) {}

  function getLoginControls() {
    const username = document.querySelector('input[name="login-username"][type="text"]');
    const password = document.querySelector('input[name="login-userpassword"][type="password"]');
    if (!username || !password) return null;

    const form = password.closest('form');
    const card = password.closest('.card, .panel');
    const scopes = [form, card].filter((scope) => scope?.contains(username));
    const submit = scopes.map((scope) =>
      Array.from(scope.querySelectorAll('button[type="submit"].btn.btn-primary.pure-material-button-contained'))
        .find((button) => norm(button.textContent).toLocaleUpperCase('pt-BR') === 'ENTRAR')
    ).find(Boolean);

    return submit ? { username, password, submit } : null;
  }

  function isBrowserAutofilled(input) {
    try {
      return input.matches(':autofill');
    } catch (_) {
      try { return input.matches(':-webkit-autofill'); }
      catch (_) { return false; }
    }
  }

  function hasPendingAutoAttempt() {
    try { return sessionStorage.getItem(AUTO_LOGIN_PENDING_KEY) === '1'; }
    catch (_) { return true; }
  }

  function markAutoAttemptPending() {
    try {
      sessionStorage.setItem(AUTO_LOGIN_PENDING_KEY, '1');
      return true;
    } catch (_) {
      return false;
    }
  }

  function tryAutoLoginAfterAutofill() {
    autoLoginTask = null;
    if (autoLoginAttempted || manualLoginEntry || hasPendingAutoAttempt() ||
        GM_getValue(AUTO_LOGIN_LOGOUT_KEY, false) || document.readyState !== 'complete') return;

    const controls = getLoginControls();
    if (!controls) return;
    const { username, password, submit } = controls;
    if (!username.value.trim() || !password.value ||
        !isBrowserAutofilled(username) || !isBrowserAutofilled(password) ||
        username.disabled || password.disabled || username.readOnly || password.readOnly ||
        submit.disabled || submit.getAttribute('aria-disabled') === 'true') return;

    if (!markAutoAttemptPending()) return;
    autoLoginAttempted = true;
    submit.click();
  }

  function tryAutoLoginWithSavedCredential() {
    if (silentCredentialRequested || autoLoginAttempted || manualLoginEntry || hasPendingAutoAttempt() ||
        GM_getValue(AUTO_LOGIN_LOGOUT_KEY, false) || document.readyState !== 'complete' ||
        typeof PasswordCredential !== 'function' || typeof navigator.credentials?.get !== 'function') return;

    const controls = getLoginControls();
    if (!controls || document.querySelector('nav.navbar') ||
        !controls.username.getClientRects().length || !controls.password.getClientRects().length ||
        controls.username.disabled || controls.password.disabled ||
        controls.username.readOnly || controls.password.readOnly ||
        controls.username.value || controls.password.value) return;
    silentCredentialRequested = true;

    // A senha permanece apenas na memória durante esta tentativa; nunca vai para GM/localStorage ou logs.
    let credentialRequest;
    try {
      credentialRequest = navigator.credentials.get({ password: true, mediation: 'silent' });
    } catch (_) {
      return;
    }
    credentialRequest.then((credential) => {
      if (credential?.type !== 'password' || !credential.id || !credential.password ||
          autoLoginAttempted || manualLoginEntry || hasPendingAutoAttempt() ||
          GM_getValue(AUTO_LOGIN_LOGOUT_KEY, false)) return;

      const current = getLoginControls();
      if (!current || current.username !== controls.username || current.password !== controls.password ||
          document.querySelector('nav.navbar') || current.username.value || current.password.value ||
          current.username.disabled || current.password.disabled ||
          current.username.readOnly || current.password.readOnly) return;

      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (!valueSetter) return;
      valueSetter.call(current.username, credential.id);
      current.username.dispatchEvent(new Event('input', { bubbles: true }));
      current.username.dispatchEvent(new Event('change', { bubbles: true }));
      valueSetter.call(current.password, credential.password);
      current.password.dispatchEvent(new Event('input', { bubbles: true }));
      current.password.dispatchEvent(new Event('change', { bubbles: true }));

      // Permite que os handlers do formulário atualizem o estado antes do envio.
      window.setTimeout(() => {
        const latest = getLoginControls();
        if (!latest || latest.username !== current.username || latest.password !== current.password ||
            latest.submit !== current.submit || latest.username.value !== credential.id ||
            latest.password.value !== credential.password || autoLoginAttempted || manualLoginEntry ||
            hasPendingAutoAttempt() || GM_getValue(AUTO_LOGIN_LOGOUT_KEY, false) ||
            document.querySelector('nav.navbar') || document.readyState !== 'complete' ||
            latest.submit.disabled || latest.submit.getAttribute('aria-disabled') === 'true') return;
        if (!markAutoAttemptPending()) return;
        autoLoginAttempted = true;
        latest.submit.click();
      }, 0);
    }).catch(() => {
      // Sem credencial silenciosa, permanece o fluxo já existente de autofill/manual.
    });
  }

  function cancelAutoLoginTask() {
    if (autoLoginTask !== null) {
      window.clearTimeout(autoLoginTask);
      autoLoginTask = null;
    }
  }

  function setManualLoginPending(value) {
    try {
      if (value) sessionStorage.setItem(MANUAL_LOGIN_PENDING_KEY, '1');
      else sessionStorage.removeItem(MANUAL_LOGIN_PENDING_KEY);
    } catch (error) {
      console.warn('[TM] Não foi possível registrar a entrada manual nesta guia', error);
    }
  }

  function clearLoginMarkersAfterSuccess() {
    if (!document.querySelector('nav.navbar')) return;
    const password = document.querySelector('input[name="login-userpassword"]');
    if (password?.getClientRects().length) return;

    try { sessionStorage.removeItem(AUTO_LOGIN_PENDING_KEY); }
    catch (_) {}

    let pending = false;
    try { pending = sessionStorage.getItem(MANUAL_LOGIN_PENDING_KEY) === '1'; }
    catch (_) { return; }
    if (!pending) return;
    setManualLoginPending(false);
    GM_setValue(AUTO_LOGIN_LOGOUT_KEY, false);
  }

  function markManualLoginSubmission() {
    autoLoginAttempted = true;
    cancelAutoLoginTask();
    setManualLoginPending(true);
  }

  document.addEventListener('keydown', (event) => {
    if (!event.isTrusted || !event.target?.matches?.(
      'input[name="login-username"], input[name="login-userpassword"]')) return;
    if (event.key === 'Enter') markManualLoginSubmission();
    else if (event.key?.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
      manualLoginEntry = true;
      cancelAutoLoginTask();
    }
  }, true);

  document.addEventListener('paste', (event) => {
    if (event.isTrusted && event.target?.matches?.(
      'input[name="login-username"], input[name="login-userpassword"]')) {
      manualLoginEntry = true;
      cancelAutoLoginTask();
    }
  }, true);

  // O navegador emite input ao preencher as credenciais. O próximo turno do event loop
  // deixa os manipuladores do Klingo processarem o valor antes da tentativa de login.
  document.addEventListener('input', (event) => {
    if (event.isTrusted && event.target?.matches?.(
      'input[name="login-username"][type="text"], input[name="login-userpassword"][type="password"]') &&
        !autoLoginAttempted && !manualLoginEntry && autoLoginTask === null) {
      autoLoginTask = window.setTimeout(tryAutoLoginAfterAutofill, 0);
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const logout = target?.closest?.('a.dropdown-item.ddip-card.d-flex.justify-content-between[href="#"]');
    if (logout?.firstElementChild?.textContent.trim().toLocaleUpperCase('pt-BR') === 'SAIR') {
      GM_setValue(AUTO_LOGIN_LOGOUT_KEY, true);
      setManualLoginPending(false);
      autoLoginAttempted = true;
      cancelAutoLoginTask();
      return;
    }
    if (target?.closest?.('button[type="submit"]') === getLoginControls()?.submit) {
      markManualLoginSubmission();
    }
  }, true);

























  function isKlingoHost() {
    return location.hostname === 'klingo.app' || location.hostname.endsWith('.klingo.app');
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

    let top = rect.bottom + 6;
    if (top + panel.offsetHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - panel.offsetHeight - 6);
    }
    const left = Math.min(
      Math.max(12, rect.left - 280),
      Math.max(12, window.innerWidth - panel.offsetWidth - 12)
    );
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }

function setDateCalculatorOpen(isOpen) {
    const panel = ensureDateCalculatorPanel();
    panel.classList.toggle('tm-datecalc-hidden', !isOpen);
    if (isOpen) positionDateCalculatorPanel();

    if (!isOpen) {
      panel.querySelectorAll('#tm-datecalc-start, #tm-datecalc-days, #tm-datecalc-end')
        .forEach((input) => {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

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
    const iso = tmParseDateInput(value);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);
    return date;
  }
  function addDaysSafe(date, days) {
    const amount = Number(days);
    if (!(date instanceof Date) || !Number.isSafeInteger(amount) || amount < 0) return null;
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12, 0, 0, 0);
    return Number.isNaN(result.getTime()) ? null : result;
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
    const resultDate = panel.querySelector('#tm-datecalc-result-date');
    const copyDateBtn = panel.querySelector('[data-tm-copy-date-result="1"]');

    if (!startInput || !daysInput || !resultDate) return;

    const startDate = parseIsoDateSafe(startInput.value);
    const daysValue = norm(daysInput.value);
    let validResult = false;

    if (startDate && /^\d+$/.test(daysValue) && Number.isSafeInteger(Number(daysValue))) {
      const targetDate = addDaysSafe(startDate, Number(daysValue));
      resultDate.textContent = targetDate
        ? formatDatePtBrShort(targetDate)
        : 'Não foi possível calcular a data.';
      validResult = !!targetDate;
    } else {
      resultDate.textContent = '';
    }

    if (copyDateBtn) {
      copyDateBtn.disabled = !validResult;
    }
  }


  function getDisplayVersion() {
    return typeof GM_info !== 'undefined' && GM_info.script?.version || '26';
  }

  function ensureScriptVersionIndicator() {
    const navbar = document.querySelector('nav.navbar');
    if (!navbar) return;

    navbar.style.setProperty('position', 'relative', 'important');
    navbar.style.setProperty('background', '#116045', 'important');

    let indicator = navbar.querySelector('#tm-script-version-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'tm-script-version-indicator';
      indicator.className = 'tm-script-version-indicator';
    }

    const expected = `v${getDisplayVersion()}`;
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
    trigger.querySelector('img').referrerPolicy = 'no-referrer';

    triggerLi.appendChild(trigger);

    if (patientItem) {
      host.insertBefore(triggerLi, patientItem);
    } else {
      host.appendChild(triggerLi);
    }
  }

  function scheduleDateCalculatorMenuRefresh() {
    if (!isKlingoHost()) return;
    clearTimeout(scheduleDateCalculatorMenuRefresh._timer);
    scheduleDateCalculatorMenuRefresh._timer = setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
    }, 120);
  }

  function bindDateCalculatorEvents() {
    document.querySelectorAll('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"]').forEach(tmDateCalcDisableCopyTooltip);

    if (document.body.dataset.tmDatecalcBound === '1') return;
    document.body.dataset.tmDatecalcBound = '1';

    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
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
      if (!(e.target instanceof Element) || !e.target.closest('#tm-datecalc-panel')) return;
      refreshDateCalculatorResults();
    }, true);

    document.addEventListener('change', (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('#tm-datecalc-panel')) return;
      refreshDateCalculatorResults();
    }, true);

    window.addEventListener('resize', positionDateCalculatorPanel);
    window.addEventListener('scroll', positionDateCalculatorPanel, true);

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

  tmRuntime.register('indicador de login', applyLoginIndicator);
  tmRuntime.register('limpeza dos bloqueios após login', clearLoginMarkersAfterSuccess);
  tmRuntime.register('login por credencial salva', tryAutoLoginWithSavedCredential);

  function initScript() {
    applyLoginIndicator();
    initDateCalculatorFeature();
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
  });
  window.addEventListener('hashchange', initScript);





/* =========================
   NOTIFICAÇÃO VISUAL - NOVA MENSAGEM
   v25.11 - alerta e fechamento coordenados entre as guias
========================= */
(function(){
  // MP3 fornecido pelo usuário, incorporado para funcionar em todas as instalações do script.
  const NOTIFICATION_AUDIO_DATA = 'data:audio/mpeg;base64,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Qn4P2ABMA0YupI////TonwEkK14HifvU6tN45xihHg/h3l8OtUNZvFCWRVGGciFow+x+pzLArJVkXOvxznlZcuV0lMhAMcEJDDEl/lss4ba8oEm6rAhsra7kDWdbwv3oecF6n/kcmizWW7POu19F3OAjkXBR2XmvBVdXCvmHP+3rXo7Yz1n3////mWVWSQG5C9xIJpYAOlWoGYTLVC06HaZFV//9kkiaNAlYJCA2giQqgtyeRCma1UxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5Rk6Yv0cEetKzN/ogAADSAAAAEUJSh8B+GzwAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5RkUY/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUQUdOZXcgU25hcGNoYXQgbm90aWZpY2F0aW9uIHNvdW4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/w==';
  const OWNER_KEY = 'klingo_message_alert_owner_v1';
  const DISMISS_KEY = 'klingo_message_alert_dismiss_v1';
  const OWNER_TTL = 7000;
  const DISMISS_TTL = 30000;
  const tabId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
  let originalTitle = document.title;
  let blinking = false;
  let blinkInterval = null;
  let notificationAudio = null;
  let audioWarningShown = false;
  let audioPrimed = false;
  let audioPriming = false;
  let pendingSounds = 0;
  let soundPlaying = false;
  let claimTimer = null;
  let dismissalSequence = 0;
  let knownToastCounts = new Map();
  const pendingDismissals = [];
  const closingToasts = new WeakSet();

  function normalizeToastText(toast) {
    const message = Array.from(toast.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ').trim();
    return message || toast.textContent.replace(/\s*(Fechar|Chat)\s*$/gi, '').replace(/\s+/g, ' ').trim();
  }

  function messageKey(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return `${text.length}:${(hash >>> 0).toString(16)}`;
  }

  function toastSender(toast) {
    return normalizeToastText(toast).match(/^De:\s*(.*?)\s*>>/i)?.[1]
      ?.replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR') || '';
  }

  function findToastAction(toast, label) {
    return Array.from(toast.querySelectorAll('*')).find((element) =>
      element.textContent.trim().toLocaleUpperCase('pt-BR') === label &&
      !Array.from(element.children).some((child) =>
        child.textContent.trim().toLocaleUpperCase('pt-BR') === label));
  }

  function isRecentDismissal(dismissal) {
    return dismissal && Number.isFinite(dismissal.at) &&
      Date.now() - dismissal.at >= 0 && Date.now() - dismissal.at < DISMISS_TTL;
  }

  function applyDismissal(dismissal) {
    if (!isRecentDismissal(dismissal)) return false;
    const matches = Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((toast) => !closingToasts.has(toast) && (dismissal.action === 'CHAT' && dismissal.sender
        ? toastSender(toast) === dismissal.sender
        : messageKey(normalizeToastText(toast)) === dismissal.toastKey));
    const targets = dismissal.action === 'CHAT' && dismissal.sender
      ? matches : [matches[dismissal.ordinal] || matches[0]].filter(Boolean);
    if (!targets.length) return false;
    targets.forEach((toast) => {
      closingToasts.add(toast);
      const close = findToastAction(toast, 'FECHAR');
      close?.click();
      window.setTimeout(() => {
        if (toast.isConnected) toast.remove();
      }, 300);
    });
    return true;
  }

  function messageToasts() {
    return Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((toast) => !closingToasts.has(toast) && /De:/i.test(normalizeToastText(toast)));
  }

  function countMessageToasts() {
    const counts = new Map();
    messageToasts().forEach((toast) => {
      const key = messageKey(normalizeToastText(toast));
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function applyPendingDismissals() {
    for (let index = pendingDismissals.length - 1; index >= 0; index--) {
      if (!isRecentDismissal(pendingDismissals[index]) || applyDismissal(pendingDismissals[index])) {
        pendingDismissals.splice(index, 1);
      }
    }
  }

  function readOwner() {
    return GM_getValue(OWNER_KEY, null);
  }

  function isOwner() {
    const owner = readOwner();
    return owner?.id === tabId && Date.now() - owner.updatedAt < OWNER_TTL;
  }

  function claimOwner(force = false) {
    const owner = readOwner();
    if (!force && owner && Date.now() - owner.updatedAt < OWNER_TTL) return;
    // Ao assumir uma guia já aberta, não reapresente mensagens antigas.
    if (owner?.id !== tabId) knownToastCounts = countMessageToasts();
    GM_setValue(OWNER_KEY, { id: tabId, updatedAt: Date.now() });
    tmRuntime.schedule(0);
  }

  function scheduleTakeover() {
    if (claimTimer !== null || document.visibilityState !== 'visible') return;
    claimTimer = window.setTimeout(() => {
      claimTimer = null;
      claimOwner();
    }, 150 + Math.random() * 350);
  }

  function maintainOwner() {
    const owner = readOwner();
    if (owner?.id === tabId) {
      GM_setValue(OWNER_KEY, { id: tabId, updatedAt: Date.now() });
    } else {
      stopBlink();
      if (!owner || Date.now() - owner.updatedAt >= OWNER_TTL) scheduleTakeover();
    }
  }

  function ensureNotificationAudio() {
    if (notificationAudio) return notificationAudio;
    try {
      notificationAudio = new Audio(NOTIFICATION_AUDIO_DATA);
      notificationAudio.preload = 'auto';
      notificationAudio.load();
    } catch (error) {
      if (!audioWarningShown) {
        audioWarningShown = true;
        console.warn('[TM] Não foi possível carregar o áudio de notificação.', error);
      }
    }
    return notificationAudio;
  }

  function primeNotificationAudio(event) {
    if (!event.isTrusted || audioPrimed || audioPriming) return;
    audioPriming = true;
    try {
      // A primeira interação libera áudio futuro; esta reprodução é inaudível.
      const silentAudio = new Audio(NOTIFICATION_AUDIO_DATA);
      silentAudio.volume = 0;
      Promise.resolve(silentAudio.play()).then(() => {
        silentAudio.pause();
        try { silentAudio.currentTime = 0; } catch (_) {}
        audioPrimed = true;
      }).catch(() => {
        // Outra interação poderá tentar novamente, sem tocar som atrasado.
      }).finally(() => {
        audioPriming = false;
      });
    } catch (_) {
      audioPriming = false;
    }
  }

  document.addEventListener('pointerdown', primeNotificationAudio, true);
  document.addEventListener('keydown', primeNotificationAudio, true);

  function playNextMessageSound() {
    if (!pendingSounds) {
      soundPlaying = false;
      return;
    }
    const audio = ensureNotificationAudio();
    if (!audio) {
      pendingSounds = 0;
      soundPlaying = false;
      return;
    }
    pendingSounds--;
    soundPlaying = true;
    audio.pause();
    try { audio.currentTime = 0; } catch (_) {}
    const finished = () => {
      audio.removeEventListener('ended', finished);
      audio.removeEventListener('error', finished);
      soundPlaying = false;
      playNextMessageSound();
    };
    audio.addEventListener('ended', finished);
    audio.addEventListener('error', finished);
    const playback = audio.play();
    playback?.then(() => { audioPrimed = true; });
    playback?.catch((error) => {
      audio.removeEventListener('ended', finished);
      audio.removeEventListener('error', finished);
      pendingSounds = 0;
      soundPlaying = false;
      audioPrimed = false;
      if (!audioWarningShown) {
        audioWarningShown = true;
        console.warn('[TM] O navegador bloqueou ou não pôde reproduzir o som da mensagem. Interaja uma vez com esta guia para liberar os próximos alertas.', error);
      }
    });
  }

  function playNewMessageSound() {
    pendingSounds++;
    if (!soundPlaying) playNextMessageSound();
  }

  ensureNotificationAudio();

  function startBlink() {
    if (blinking) return;
    blinking = true;

    blinkInterval = setInterval(() => {
      document.title = document.title === '💬 Nova mensagem'
        ? originalTitle
        : '💬 Nova mensagem';
    }, 1000);
  }

  function stopBlink() {
    if (!blinking) return;
    blinking = false;

    clearInterval(blinkInterval);
    blinkInterval = null;
    document.title = originalTitle;
  }

  function checkMessages() {
    try {
      if (!blinking) originalTitle = document.title;
      applyPendingDismissals();
      const currentCounts = countMessageToasts();
      if (!isOwner()) {
        stopBlink();
      } else {
        currentCounts.forEach((count, key) => {
          const newMessages = Math.max(0, count - (knownToastCounts.get(key) || 0));
          for (let index = 0; index < newMessages; index++) playNewMessageSound();
          if (newMessages) startBlink();
        });
        if (!currentCounts.size) {
          stopBlink();
        }
      }
      knownToastCounts = currentCounts;
    } catch (error) {
      console.error('[TM] Falha no alerta de mensagens', error);
    }
  }

  // O monitor geral da página pode atrasar durante atualizações grandes. Observe os
  // avisos diretamente para registrar cada chegada antes de uma nova renderização.
  const notificationObserver = new MutationObserver((mutations) => {
    const changedToast = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('.toasted.toastnafrente')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('.toasted.toastnafrente') || node.querySelector?.('.toasted.toastnafrente')));
    });
    if (changedToast) checkMessages();
  });
  notificationObserver.observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });

  document.addEventListener('click', (event) => {
    // Cliques sintéticos feitos nas outras guias não devem ser retransmitidos.
    if (!event.isTrusted) return;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const unreadRow = target?.closest('#modalChat button.list-group-item.list-group-item-action');
    const unreadBadge = unreadRow?.querySelector('.badge-secondary');
    if (unreadBadge && Number(unreadBadge.textContent.trim()) > 0) {
      const sender = unreadRow.textContent.replace(unreadBadge.textContent, '')
        .replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
      if (sender) {
        // Aguarde o clique nativo abrir a conversa antes de fechar os avisos.
        window.setTimeout(() => {
          const dismissal = {
            id: `${tabId}:${++dismissalSequence}`,
            action: 'CHAT',
            sender,
            at: Date.now(),
            source: tabId
          };
          applyDismissal(dismissal);
          GM_setValue(DISMISS_KEY, dismissal);
        }, 0);
      }
      return;
    }
    const toast = target?.closest('.toasted.toastnafrente');
    if (!toast) return;

    const action = target.closest('a.action');
    const label = action?.textContent.trim().toLocaleUpperCase('pt-BR');
    if (!action || !toast.contains(action) || (label !== 'FECHAR' && label !== 'CHAT')) return;

    const toastKey = messageKey(normalizeToastText(toast));
    const ordinal = Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((item) => !closingToasts.has(item) &&
        messageKey(normalizeToastText(item)) === toastKey)
      .indexOf(toast);
    const dismissal = {
      id: `${tabId}:${++dismissalSequence}`,
      action: label,
      sender: label === 'CHAT' ? toastSender(toast) : '',
      toastKey,
      ordinal: Math.max(0, ordinal),
      at: Date.now(),
      source: tabId
    };
    closingToasts.add(toast);
    if (label === 'CHAT') applyDismissal(dismissal);
    GM_setValue(DISMISS_KEY, dismissal);
    window.setTimeout(() => {
      if (toast.isConnected) toast.remove();
      tmRuntime.schedule(0);
    }, 300);
  }, true);

  GM_addValueChangeListener(DISMISS_KEY, (_key, _oldValue, dismissal, remote) => {
    if (!remote || dismissal?.source === tabId || !isRecentDismissal(dismissal)) return;
    if (dismissal.action === 'CHAT') {
      applyDismissal(dismissal);
      return;
    }
    pendingDismissals.push(dismissal);
    applyPendingDismissals();
    tmRuntime.schedule(0);
  });

  window.addEventListener('focus', () => claimOwner(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.hasFocus()) claimOwner(true);
    else if (document.visibilityState === 'hidden') stopBlink();
  });
  window.setInterval(maintainOwner, 2000);
  knownToastCounts = countMessageToasts();
  if (document.hasFocus()) claimOwner(true);
  else scheduleTakeover();

  tmRuntime.register('alerta de mensagens', checkMessages);
})();

/* Sincroniza entre guias somente a quantidade que o chat nativo marcou como lida. */
(function () {
  'use strict';

  const READ_KEY = 'klingo_chat_read_event_v1';
  const READ_TTL = 30000;
  const tabId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let sequence = 0;
  let nativeCount = null;
  let pendingDiscount = 0;
  let pendingLocalRead = null;
  let watchNewMessagesUntil = 0;
  let knownToastCounts = new Map();
  const newMessagesBySender = new Map();
  const recentEvents = new Map();
  const recentLocalReads = new Map();
  const recentNativeDrops = [];
  const hiddenBadges = new WeakMap();

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
  }

  function badgeNumber(badge) {
    const match = badge?.textContent.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function nativeBadge() {
    return document.querySelector('#botao-chat .badge-warning:not([data-tm-unread-mirror])');
  }

  function unreadRow(sender) {
    if (!sender) return null;
    return Array.from(document.querySelectorAll('#modalChat button.list-group-item.list-group-item-action'))
      .find((row) => {
        const badge = row.querySelector('.badge-secondary');
        return badge && normalize(row.textContent.replace(badge.textContent, '')) === sender;
      }) || null;
  }

  function toastMessages() {
    const counts = new Map();
    document.querySelectorAll('.toasted.toastnafrente').forEach((toast) => {
      const directText = Array.from(toast.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent).join(' ');
      const text = (directText || toast.textContent.replace(/\s*(Fechar|Chat)\s*$/gi, ''))
        .replace(/\s+/g, ' ').trim();
      const sender = normalize(text.match(/De:\s*(.*?)\s*>>/i)?.[1]);
      if (!sender) return;
      const key = `${sender}\u0000${text}`;
      const item = counts.get(key) || { count: 0, sender };
      item.count++;
      counts.set(key, item);
    });
    return counts;
  }

  function newMessageCount() {
    return Array.from(newMessagesBySender.values()).reduce((sum, count) => sum + count, 0);
  }

  function subtractNewMessages(sender, amount) {
    if (!sender || !amount) return;
    const remaining = Math.max(0, (newMessagesBySender.get(sender) || 0) - amount);
    if (remaining) newMessagesBySender.set(sender, remaining);
    else newMessagesBySender.delete(sender);
  }

  function trackNewMessages() {
    const current = toastMessages();
    if (pendingDiscount > 0 || Date.now() < watchNewMessagesUntil) {
      current.forEach((item, key) => {
        const added = item.count - (knownToastCounts.get(key)?.count || 0);
        if (added > 0) {
          newMessagesBySender.set(item.sender,
            (newMessagesBySender.get(item.sender) || 0) + added);
        }
      });
    }
    knownToastCounts = current;
  }

  function restoreBadge(badge) {
    if (!badge || !hiddenBadges.has(badge)) return;
    const original = hiddenBadges.get(badge);
    if (original.value) badge.style.setProperty('display', original.value, original.priority);
    else badge.style.removeProperty('display');
    hiddenBadges.delete(badge);
  }

  function renderCount() {
    const button = document.querySelector('#botao-chat');
    if (!button) return;
    const badge = nativeBadge();
    let mirror = button.querySelector('[data-tm-unread-mirror="1"]');
    const freshCount = newMessageCount();
    if (pendingDiscount === 0 && nativeCount >= freshCount) {
      newMessagesBySender.clear();
      mirror?.remove();
      restoreBadge(badge);
      return;
    }

    const displayed = Math.max(0, nativeCount - pendingDiscount, freshCount);
    if (displayed > 0) {
      if (!mirror) {
        mirror = badge?.cloneNode(true) || document.createElement('span');
        if (!badge) {
          mirror.className = 'badge badge-warning';
          mirror.innerHTML = '<i class="fas fa-comment-dots mr-1"></i>';
        }
        mirror.dataset.tmUnreadMirror = '1';
        mirror.style.removeProperty('display');
        if (badge) badge.insertAdjacentElement('afterend', mirror);
        else button.append(mirror);
      }
      if (mirror.dataset.tmUnreadCount !== String(displayed)) {
        const icon = (badge || mirror).querySelector('i')?.cloneNode(true);
        mirror.replaceChildren(...(icon ? [icon] : []), document.createTextNode(` ${displayed}`));
        mirror.dataset.tmUnreadCount = String(displayed);
      }
    } else {
      mirror?.remove();
    }

    if (badge && !hiddenBadges.has(badge)) {
      hiddenBadges.set(badge, {
        value: badge.style.getPropertyValue('display'),
        priority: badge.style.getPropertyPriority('display')
      });
      badge.style.setProperty('display', 'none', 'important');
    }
  }

  function pruneEvents() {
    const now = Date.now();
    recentEvents.forEach((at, id) => {
      if (now - at > READ_TTL) recentEvents.delete(id);
    });
    recentLocalReads.forEach((read, sender) => {
      if (now - read.at > 3000) recentLocalReads.delete(sender);
    });
    for (let index = recentNativeDrops.length - 1; index >= 0; index--) {
      if (now - recentNativeDrops[index].at > 3000) recentNativeDrops.splice(index, 1);
    }
  }

  function consumeNativeDrop(amount, eventAt) {
    for (const drop of recentNativeDrops) {
      if (!amount) break;
      if (Math.abs(drop.at - eventAt) > 3000) continue;
      const consumed = Math.min(amount, drop.remaining);
      drop.remaining -= consumed;
      amount -= consumed;
    }
    return amount;
  }

  function broadcastRead(delta, before, after, sender) {
    if (delta <= 0) return;
    const event = {
      id: `${tabId}:${++sequence}`,
      source: tabId,
      sender,
      delta,
      before,
      after,
      at: Date.now()
    };
    recentEvents.set(event.id, event.at);
    if (sender) {
      const previous = recentLocalReads.get(sender);
      recentLocalReads.set(sender, {
        delta: delta + (previous && event.at - previous.at < 3000 ? previous.delta : 0),
        at: event.at
      });
    }
    GM_setValue(READ_KEY, event);
  }

  function updateCount() {
    const current = badgeNumber(nativeBadge());
    if (nativeCount === null) {
      nativeCount = current;
      renderCount();
      return;
    }

    if (current < nativeCount) {
      let decrease = nativeCount - current;
      if (pendingLocalRead && Date.now() < pendingLocalRead.expiresAt) {
        const localDecrease = Math.min(decrease, pendingLocalRead.remaining);
        if (localDecrease > 0) {
          broadcastRead(localDecrease, nativeCount, current, pendingLocalRead.sender);
          subtractNewMessages(pendingLocalRead.sender, localDecrease);
          pendingLocalRead.remaining -= localDecrease;
          decrease -= localDecrease;
          if (pendingLocalRead.remaining === 0) pendingLocalRead = null;
        }
      }
      // O próprio Klingo pode atualizar a outra guia depois; nesse caso, retire
      // o desconto correspondente para não subtrair as mensagens duas vezes.
      const reconciled = Math.min(pendingDiscount, decrease);
      pendingDiscount -= reconciled;
      if (decrease > reconciled) {
        recentNativeDrops.push({ remaining: decrease - reconciled, at: Date.now() });
      }
    }
    nativeCount = current;
    renderCount();
  }

  document.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    const target = event.target?.nodeType === Node.ELEMENT_NODE
      ? event.target : event.target?.parentElement;
    if (!target) return;

    let sender = '';
    let expected = Infinity;
    const row = target.closest('#modalChat button.list-group-item.list-group-item-action');
    if (row) {
      const badge = row.querySelector('.badge-secondary');
      expected = badgeNumber(badge);
      sender = normalize(row.textContent.replace(badge?.textContent || '', ''));
      if (!expected) return;
    } else {
      const toast = target.closest('.toasted.toastnafrente');
      const action = target.closest('a.action');
      if (!toast || !action || !toast.contains(action) || normalize(action.textContent) !== 'CHAT') return;
      sender = normalize(toast.textContent.match(/De:\s*(.*?)\s*>>/i)?.[1]);
      const matchingRow = unreadRow(sender);
      if (matchingRow) expected = badgeNumber(matchingRow.querySelector('.badge-secondary'));
    }

    updateCount();
    if (!nativeCount) return;
    pendingLocalRead = { sender, remaining: expected, expiresAt: Date.now() + 8000 };
    window.setTimeout(updateCount, 50);
    window.setTimeout(updateCount, 300);
    window.setTimeout(updateCount, 1200);
  }, true);

  GM_addValueChangeListener(READ_KEY, (_key, _oldValue, event, remote) => {
    if (!remote || !event || event.source === tabId ||
        !Number.isFinite(event.at) || Date.now() - event.at < 0 ||
        Date.now() - event.at > READ_TTL || !Number.isFinite(event.delta) || event.delta <= 0) return;
    pruneEvents();
    if (recentEvents.has(event.id)) return;
    recentEvents.set(event.id, event.at);
    updateCount();

    const ownRead = recentLocalReads.get(event.sender);
    if (ownRead && ownRead.delta >= event.delta && Math.abs(ownRead.at - event.at) < 3000) return;

    let decrease = consumeNativeDrop(event.delta, event.at);
    const row = unreadRow(event.sender);
    if (row) decrease = Math.min(decrease, badgeNumber(row.querySelector('.badge-secondary')));
    pendingDiscount = Math.min(nativeCount, pendingDiscount + decrease);
    subtractNewMessages(event.sender, event.delta);
    watchNewMessagesUntil = Date.now() + 120000;
    knownToastCounts = toastMessages();
    if (pendingLocalRead?.sender && pendingLocalRead.sender === event.sender) pendingLocalRead = null;
    renderCount();
  });

  const observer = new MutationObserver((mutations) => {
    const changedToasts = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('.toasted.toastnafrente')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('.toasted.toastnafrente') || node.querySelector?.('.toasted.toastnafrente')));
    });
    const changedChatButton = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('#botao-chat')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('#botao-chat') || node.querySelector?.('#botao-chat')));
    });
    if (changedToasts) trackNewMessages();
    if (changedChatButton) updateCount();
    else if (changedToasts) renderCount();
  });
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });
  knownToastCounts = toastMessages();
  tmRuntime.register('contador de chat entre guias', updateCount);
})();



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

    const icon = document.createElement('img');
    icon.className = 'tm-slot-copy-success-icon';
    icon.src = 'https://i.imgur.com/d4xuHhG.png';
    icon.referrerPolicy = 'no-referrer';
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
  });
})();


/* =========================
   MODAL AGENDAMENTO - PRIMEIRA VEZ
   v19.4 - reorganização visual sem mover DOM
========================= */
(function () {
  'use strict';

  const TM_CADASTRO_LAYOUT_ID = 'tm-cadastro-primeira-vez-layout-22-4';
  const modalBaselines = new WeakMap();

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
        max-width: calc(100vw - 24px) !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: left !important;
      }

      #cadastroModal.tm-primeira-vez-layout .modal-content {
        width: 800px !important;
        max-width: 100% !important;
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
        flex: 0 0 min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        width: min(353.78px, 100%) !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        margin-top: 4px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col {
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        flex: 0 0 min(353.78px, 100%) !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
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

      @media (max-width: 720px) {
        #cadastroModal.tm-primeira-vez-layout #cadTemp {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col,
        #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-observacao-row {
          grid-column: 1 / -1 !important;
          grid-row: auto !important;
        }
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
      col.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
      col.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
      col.style.setProperty('width', 'min(353.78px, 100%)', 'important');
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
    auxCol.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('width', 'min(353.78px, 100%)', 'important');

    const inputGroup = auxCol.querySelector('.input-group');
    if (inputGroup) {
      inputGroup.style.setProperty('display', 'flex', 'important');
      inputGroup.style.setProperty('flex-wrap', 'nowrap', 'important');
      inputGroup.style.setProperty('width', 'min(353.78px, 100%)', 'important');
      inputGroup.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
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
    const hasExplicitLabel = lines.some((line) =>
      /^(Nome|Nascimento|CPF|E-mail|Email|Telefone|Celular)\s*:/i.test(line)
    );

    if (!hasMinimumData || (!hasExplicitLabel && Object.keys(data).length < 2)) return null;

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
      if (parsedDate) tmCadSetInputValue(nascimentoInput, parsedDate);
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
    return tmParseDateInput(rawValue);
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
    const nomeInput = tmCadFocusableInField(tmCadFieldByLabel(modal, 'Nome'));
    if (!nomeInput) return;

    modal.dataset.tmNomeInitialFocusDone = '1';
    window.setTimeout(() => {
      if (modal.classList.contains('tm-primeira-vez-layout') && nomeInput.isConnected) {
        nomeInput.focus({ preventScroll: true });
      }
    }, 50);
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

        const injectedConvenio = left.querySelector('.tm-cad-header-convenio-injetado');
        if (injectedConvenio && tmCadNorm(injectedConvenio.textContent) !== externalConvenioText) {
          injectedConvenio.remove();
        }

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

    if (document.activeElement !== textarea && textarea.value !== originalInput.value) {
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
    const baseline = modalBaselines.get(modal);
    if (!baseline) return;

    modal.querySelectorAll('.tm-cad-header-convenio-injetado, textarea.tm-cad-observacao-textarea')
      .forEach((node) => node.remove());

    const { origem } = baseline;
    if (origem?.element.isConnected && origem.parent.isConnected) {
      const next = origem.next?.parentNode === origem.parent ? origem.next : null;
      origem.parent.insertBefore(origem.element, next);
    }
    modal.querySelectorAll('.tm-cad-origem-inline-row').forEach((row) => row.remove());

    tmRestoreAttributes(baseline.attributes);
    tmRestoreHeaderContents(baseline.headers);
    modal.classList.remove('tm-primeira-vez-layout', 'tm-cad-multiple-headers');
    delete modal.dataset.tmNomeInitialFocusDone;
    delete modal.dataset.tmNomeInitialFocusLock;
    modal.querySelectorAll('[data-tm-header-date-normalized], [data-tm-observation-candidate-checked]')
      .forEach((element) => {
        delete element.dataset.tmHeaderDateNormalized;
        delete element.dataset.tmObservationCandidateChecked;
      });
    modalBaselines.delete(modal);
  }
  function tmCadApplyPrimeiraVezLayout() {
    const modal = tmCadVisibleModal();
    if (!modal) {
      tmCadClearPrimeiraVezLayout(document.querySelector('#cadastroModal'));
      return;
    }

    if (!tmCadIsPrimeiraVez(modal)) {
      tmCadClearPrimeiraVezLayout(modal);
      return;
    }

    if (!modalBaselines.has(modal)) {
      const origemField = tmCadFieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');
      modalBaselines.set(modal, {
        attributes: tmCaptureAttributes(modal),
        headers: tmCaptureHeaderContents(modal),
        origem: origemField ? {
          element: origemField,
          parent: origemField.parentNode,
          next: origemField.nextSibling
        } : null
      });
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

  // O observador roda na microtarefa em que o modal se torna visível, antes
  // de a fila geral (80 ms) ou o evento "shown" deixarem o layout original pintar.
  let observedCadastroModal = null;
  let cadastroModalObserver = null;

  function applyPrimeiraVezBeforePaint() {
    const modal = observedCadastroModal;
    if (!modal?.isConnected || modal.classList.contains('tm-primeira-vez-layout') ||
        tmCadVisibleModal() !== modal || !tmCadIsPrimeiraVez(modal)) return;
    tmCadApplyPrimeiraVezLayout();
  }

  function observeCadastroModal(modal) {
    if (modal === observedCadastroModal) return;
    cadastroModalObserver?.disconnect();
    observedCadastroModal = modal;
    if (!modal) return;

    cadastroModalObserver = new MutationObserver(applyPrimeiraVezBeforePaint);
    cadastroModalObserver.observe(modal, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });
    applyPrimeiraVezBeforePaint();
  }

  const cadastroDiscoveryObserver = new MutationObserver(() => {
    const modal = document.querySelector('#cadastroModal');
    if (modal !== observedCadastroModal) observeCadastroModal(modal);
  });
  cadastroDiscoveryObserver.observe(document.documentElement, { childList: true, subtree: true });
  observeCadastroModal(document.querySelector('#cadastroModal'));

  tmRuntime.register('cadastro de primeira vez', tmCadApplyPrimeiraVezLayout);
})();


/* =========================
   MODAL AGENDAMENTO - PACIENTE
   layout do cadastro de paciente existente
========================= */
(function () {
  'use strict';

  const STYLE_ID = 'tm-cadastro-paciente-layout-23-0';
  const modalBaselines = new WeakMap();

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
        max-width: calc(100vw - 24px) !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: left !important;
      }

      #cadastroModal.tm-paciente-layout .modal-content {
        width: 800px !important;
        max-width: 100% !important;
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
        flex: 0 0 min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        width: min(353.78px, 100%) !important;
        margin-top: 4px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
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

      @media (max-width: 720px) {
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid .tm-paciente-field,
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid .tm-paciente-observacao-row {
          grid-column: 1 / -1 !important;
          grid-row: auto !important;
        }
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
    auxCol.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('width', 'min(353.78px, 100%)', 'important');
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

    if (document.activeElement !== textarea && textarea.value !== input.value) {
      textarea.value = input.value || '';
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

        const injectedConvenio = left.querySelector('.tm-paciente-header-convenio-injetado');
        if (injectedConvenio && norm(injectedConvenio.textContent) !== externalConvenioText) {
          injectedConvenio.remove();
        }

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
    return tmParseDateInput(rawValue);
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
    if (!modal) {
      clearPacienteLayout(document.querySelector('#cadastroModal'));
      return;
    }

    if (!isPacienteModal(modal)) {
      clearPacienteLayout(modal);
      return;
    }

    if (!modalBaselines.has(modal)) {
      const origemField = fieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');
      modalBaselines.set(modal, {
        attributes: tmCaptureAttributes(modal),
        headers: tmCaptureHeaderContents(modal),
        origem: origemField ? {
          element: origemField,
          parent: origemField.parentNode,
          next: origemField.nextSibling
        } : null
      });
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
    const baseline = modalBaselines.get(modal);
    if (!baseline) return;

    modal.querySelectorAll('.tm-paciente-header-convenio-injetado, textarea.tm-paciente-observacao-textarea')
      .forEach((node) => node.remove());

    const { origem } = baseline;
    if (origem?.element.isConnected && origem.parent.isConnected) {
      const next = origem.next?.parentNode === origem.parent ? origem.next : null;
      origem.parent.insertBefore(origem.element, next);
    }
    modal.querySelectorAll('.tm-paciente-origem-inline-row').forEach((row) => row.remove());

    tmRestoreAttributes(baseline.attributes);
    tmRestoreHeaderContents(baseline.headers);
    modal.classList.remove('tm-paciente-layout', 'tm-paciente-multiple-headers');
    modalBaselines.delete(modal);
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

  // Mesmo tratamento antecipado do cadastro de primeira vez, limitado ao
  // formulário de paciente já cadastrado ("Nome do Paciente").
  let observedPacienteModal = null;
  let pacienteModalObserver = null;

  function applyPacienteBeforePaint() {
    const modal = observedPacienteModal;
    if (!modal?.isConnected || modal.classList.contains('tm-paciente-layout') ||
        visibleModal() !== modal || !isPacienteModal(modal)) return;
    applyPacienteLayout();
  }

  function observePacienteModal(modal) {
    if (modal === observedPacienteModal) return;
    pacienteModalObserver?.disconnect();
    observedPacienteModal = modal;
    if (!modal) return;

    pacienteModalObserver = new MutationObserver(applyPacienteBeforePaint);
    pacienteModalObserver.observe(modal, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });
    applyPacienteBeforePaint();
  }

  const pacienteDiscoveryObserver = new MutationObserver(() => {
    const modal = document.querySelector('#cadastroModal');
    if (modal !== observedPacienteModal) observePacienteModal(modal);
  });
  pacienteDiscoveryObserver.observe(document.documentElement, { childList: true, subtree: true });
  observePacienteModal(document.querySelector('#cadastroModal'));

  tmRuntime.register('cadastro de paciente', applyPacienteLayout);
})();

/* =========================
   CALL CENTER - TEXTO DE COPIAR RESUMO
========================= */
(function () {
  'use strict';

  const SEPARATOR = '----------------------------------';

  function clean(value) {
    return String(value ?? '').trim();
  }

  function getSummaryComponent(button) {
    for (let node = button; node; node = node.parentElement) {
      const component = node.__vue__;
      if (component?.$options?.methods?.copiar_resumo && component.resumo) {
        return component;
      }
    }
    return null;
  }

  function formatAddress(address) {
    const street = clean(address?.st_logradouro);
    const number = clean(address?.st_numero);
    const complement = clean(address?.st_complemento);
    const cepDigits = clean(address?.in_cep).replace(/\D/g, '').padStart(8, '0');
    if (!street || !/^\d{8}$/.test(cepDigits)) return '';

    const parts = [street];
    if (number) parts.push(`No. ${number}`);
    if (complement) parts.push(complement);
    return `${parts.join(', ')} - CEP: ${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`;
  }

  function formatAppointment(item, component) {
    const procedure = clean(item?.procedimento?.search);
    const doctor = clean(item?.medico?.st_nome_exibicao);
    const dateTime = clean(item?.dt_inicio);
    const date = dateTime && component.$util?.getFormatDate?.(dateTime);
    const weekday = dateTime && component.$util?.getFormatDate?.(dateTime, 'dddd');
    const time = dateTime.slice(11, 16);
    if (!procedure || !date || !/^\d{2}:\d{2}$/.test(time) || !weekday) return '';

    return [
      `*️⃣ Procedimento: ${procedure}`,
      `🧑‍⚕️ Profissional: ${doctor}`,
      `📅 Data: ${date} ${time} - ${weekday}`
    ].join('\n');
  }

  function buildSummary(component) {
    const summary = component.resumo;
    const appointments = summary?.lista_resumo;
    const units = summary?.resumo_unidades;
    if (!Array.isArray(appointments) || !appointments.length || !Array.isArray(units)) return '';

    const unitsById = new Map(units
      .filter((unit) => unit?.id_unidade_operacao != null)
      .map((unit) => [String(unit.id_unidade_operacao), unit]));
    const groups = new Map();

    for (const item of appointments) {
      const unitId = item?.id_unidade_operacao ?? item?.unidade_operacao?.id_unidade_operacao;
      if (unitId == null) return '';
      const key = String(unitId);
      const unit = unitsById.get(key);
      const name = clean(unit?.st_nome || item?.unidade_operacao?.st_nome);
      const address = formatAddress(unit?.endereco);
      const appointment = formatAppointment(item, component);
      // Se a unidade não puder ser associada com segurança, manter a cópia nativa.
      if (!unit || !name || !address || !appointment) return '';

      if (!groups.has(key)) groups.set(key, { name, address, appointments: [] });
      groups.get(key).appointments.push(appointment);
    }

    const patient = clean(summary.paciente?.st_nome || summary.cadastro_temporario?.st_nome) || '---';
    const oneUnit = groups.size === 1;
    const groupTexts = Array.from(groups.values(), (group) => {
      const appointmentsText = group.appointments.join(`\n${SEPARATOR}\n`);
      const unitText = `🏥 Unidade: ${group.name}\n📍 Endereço: ${group.address}`;
      return `${appointmentsText}\n${oneUnit ? `${SEPARATOR}\n` : ''}${unitText}`;
    });

    return `Agendamento concluído ✅\n\n👤 Paciente: ${patient}\n${SEPARATOR}\n` +
      groupTexts.join(`\n${SEPARATOR}\n`);
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('a.btn.btn-secondary.btn-lg.ml-1')
      : null;
    if (!button || clean(button.textContent) !== 'Copiar Resumo') return;

    const component = getSummaryComponent(button);
    if (!component) return;
    const text = buildSummary(component);
    if (!text) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      component.copiar_texto(text, 'Resumo da marcação copiado!');
    } catch (error) {
      console.error('[TM] Falha ao copiar o resumo personalizado; tentando a cópia original.', error);
      component.copiar_resumo();
    }
  }, true);
})();

/* =========================
   RECEPÇÃO - NOVO ATENDIMENTO
========================= */
(function () {
  'use strict';

  const MODAL_ID = 'novoAtendimento2Modal';
  const STYLE_ID = 'tm-recepcao-novo-atendimento-layout';
  let observedModal = null;
  let modalObserver = null;
  let lockedCheckbox = null;
  let checkedBeforeToday = false;
  let observationWindowStart = 0;
  let observationCount = 0;
  let observationStopped = false;

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

      #${MODAL_ID}.tm-recepcao-horario-hoje .tm-recepcao-extra-checkbox {
        cursor: not-allowed !important;
      }

      @media (min-width: 768px) {
        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-dados-row > .col.col-md-3:not(.tm-recepcao-hidden-field) {
          flex: 0 0 33.333333% !important;
          max-width: 33.333333% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-dados-row > .tm-recepcao-cpf-col {
          flex: 0 0 33.333333% !important;
          max-width: 33.333333% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .form-row > .tm-recepcao-observacao-col {
          flex: 0 0 50% !important;
          max-width: 50% !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function fieldByLabel(modal, labelText) {
    const label = Array.from(modal.querySelectorAll('small.form-text.text-muted'))
      .find((small) => small.closest('.modal') === modal && norm(small.textContent) === labelText);
    return label?.closest('.col') || null;
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

  function isSelectedDateToday() {
    const selected = document.querySelector('input#ref-data[type="date"]')?.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selected || '')) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return selected === today;
  }

  function setExtraChecked(checkbox, checked) {
    if (checkbox.checked === checked) return;
    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function syncExtraCheckbox(modal) {
    const checkbox = extraCheckbox(modal);
    const today = !!checkbox && isSelectedDateToday();
    setClass(modal, 'tm-recepcao-horario-hoje', today);

    if (today) {
      if (lockedCheckbox !== checkbox) {
        lockedCheckbox = checkbox;
        checkedBeforeToday = checkbox.checked;
      }
      setClass(checkbox, 'tm-recepcao-extra-checkbox', true);
      if (checkbox.getAttribute('aria-readonly') !== 'true') {
        checkbox.setAttribute('aria-readonly', 'true');
      }
      setExtraChecked(checkbox, true);
    } else {
      if (checkbox && lockedCheckbox === checkbox) {
        setExtraChecked(checkbox, checkedBeforeToday);
      }
      if (lockedCheckbox) {
        setClass(lockedCheckbox, 'tm-recepcao-extra-checkbox', false);
        if (lockedCheckbox.hasAttribute('aria-readonly')) {
          lockedCheckbox.removeAttribute('aria-readonly');
        }
      }
      lockedCheckbox = null;
    }
  }

  function applyReceptionLayout() {
    const modal = observedModal;
    if (!modal?.isConnected) return;

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

    syncExtraCheckbox(modal);

    const social = fieldByLabel(modal, 'Nome Social');
    const phone = fieldByLabel(modal, 'Telefone');
    const cpf = fieldByLabel(modal, 'CPF');
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

    if (!firstTime) {
      modal.querySelectorAll('.tm-recepcao-hidden-field').forEach((field) =>
        setClass(field, 'tm-recepcao-hidden-field', false));
      modal.querySelectorAll('.tm-recepcao-dados-row').forEach((row) =>
        setClass(row, 'tm-recepcao-dados-row', false));
      return;
    }

    for (const field of [phone, social]) {
      if (!field) continue;
      setClass(field, 'tm-recepcao-hidden-field', true);
      if (field.parentElement?.classList.contains('form-row')) {
        setClass(field.parentElement, 'tm-recepcao-dados-row', true);
      }
    }
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
    lockedCheckbox = null;
    observationStopped = false;
    observationCount = 0;
    observationWindowStart = performance.now();
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
    if (observationStopped || !observedModal?.isConnected || !isSelectedDateToday() ||
        event.target !== extraCheckbox(observedModal)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    queueMicrotask(() => syncExtraCheckbox(observedModal));
  }, true);

  document.addEventListener('keydown', (event) => {
    if (observationStopped || !observedModal?.isConnected || !isSelectedDateToday() ||
        event.target !== extraCheckbox(observedModal) ||
        ![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    syncExtraCheckbox(observedModal);
  }, true);

  for (const eventName of ['input', 'change']) {
    document.addEventListener(eventName, (event) => {
      if (observationStopped) return;
      if (event.target?.matches?.('input#ref-data[type="date"]')) {
        applyReceptionLayout();
      } else if (observedModal?.isConnected && event.target === extraCheckbox(observedModal) &&
          isSelectedDateToday() && !event.target.checked) {
        setExtraChecked(event.target, true);
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

/* =========================
   RECEPÇÃO - FILTRO POR TIPO DE AGENDAMENTO
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-recepcao-tipo-filter';
  const HOST_CLASS = 'tm-recepcao-tipo-filter-host';
  const HIDDEN_CLASS = 'tm-recepcao-tipo-filter-hidden';
  const STYLE_ID = 'tm-recepcao-tipo-filter-style';
  const CARD_SELECTOR = '.dashcard.my-2[class*="atendimento-"]';
  let selectedType = '';

  function isReceptionPage() {
    const breadcrumb = document.querySelector('.breadcrumb');
    return /\bRecepção\b/i.test(breadcrumb?.textContent || '');
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HIDDEN_CLASS} { display: none !important; }

      .${HOST_CLASS} {
        display: flex !important;
        align-items: flex-start;
        gap: 8px;
      }

      @media (min-width: 1200px) {
        .${HOST_CLASS} {
          flex: 0 0 calc(25% + 100px) !important;
          max-width: calc(25% + 100px) !important;
        }

        .${HOST_CLASS} + .col.col-12.col-md-3 {
          flex: 0 0 calc(25% - 100px) !important;
          max-width: calc(25% - 100px) !important;
        }
      }

      @media (min-width: 768px) and (max-width: 1199.98px) {
        .${HOST_CLASS},
        .${HOST_CLASS} + .col.col-12.col-md-3 {
          flex: 0 0 50% !important;
          max-width: 50% !important;
        }
      }

      .${HOST_CLASS} > .input-group {
        flex: 1 1 300px;
        width: auto;
        max-width: 300px;
        min-width: 0;
      }

      .${HOST_CLASS} > .input-group > input#ref-data {
        min-width: 0;
      }

      #${FILTER_ID} {
        flex: 1 1 180px;
        min-width: 180px;
        max-width: none;
        height: 36px;
      }

      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px !important;
        box-sizing: border-box !important;
      }

      #${FILTER_ID} select {
        min-width: 0;
        font-size: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  function appointmentType(card) {
    const statusColumn = card.querySelector(
      ':scope > .row.py-1.px-2.align-items-center > .col.col-12.col-md-2'
    );
    const icon = statusColumn?.querySelector('.azfloat > a > i');
    if (icon?.classList.contains('fa-dot-circle')) return 'marcado';
    if (icon?.classList.contains('fa-exclamation-circle')) return 'extra';
    if (icon?.classList.contains('fa-plus-circle')) return 'demanda';
    return '';
  }

  function applyFilter() {
    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      const hide = !!selectedType && appointmentType(card) !== selectedType;
      if (card.classList.contains(HIDDEN_CLASS) !== hide) {
        card.classList.toggle(HIDDEN_CLASS, hide);
      }
    });
    updateSectionCounters();
  }

  function updateSectionCounters() {
    const badges = document.querySelectorAll(
      '.d-flex.justify-content-between.mt-3.mb-1 > h5.mb-0 > span.badge.badge-secondary'
    );
    badges.forEach((badge) => {
      const header = badge.parentElement?.parentElement;
      const list = header?.parentElement?.querySelector(':scope > .mb-3');
      if (!list) return;
      const cards = Array.from(list.querySelectorAll(CARD_SELECTOR));
      const visibleCount = cards.filter((card) => !card.classList.contains(HIDDEN_CLASS)).length;
      const nextValue = String(visibleCount);
      if (badge.textContent.trim() !== nextValue) badge.textContent = nextValue;
    });
  }

  function clearFilter() {
    document.getElementById(FILTER_ID)?.remove();
    document.querySelectorAll(`.${HOST_CLASS}`).forEach((host) =>
      host.classList.remove(HOST_CLASS));
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) =>
      card.classList.remove(HIDDEN_CLASS));
  }

  function ensureFilter() {
    if (!isReceptionPage()) {
      clearFilter();
      return;
    }

    const dateInput = document.querySelector('input#ref-data[type="date"]');
    const dateGroup = dateInput?.closest('.input-group.mb-1');
    const host = dateGroup?.closest('.col.col-12.col-md-3');
    if (!dateGroup || !host) return;

    injectStyle();
    if (!host.classList.contains(HOST_CLASS)) host.classList.add(HOST_CLASS);

    let filter = document.getElementById(FILTER_ID);
    if (!filter) {
      filter = document.createElement('div');
      filter.id = FILTER_ID;
      filter.className = 'input-group';
      const prepend = document.createElement('div');
      prepend.className = 'input-group-prepend';
      const icon = document.createElement('span');
      icon.className = 'input-group-text';
      icon.innerHTML = '<i class="fas fa-filter"></i>';
      prepend.appendChild(icon);
      filter.appendChild(prepend);
      const select = document.createElement('select');
      select.className = 'form-control';
      select.setAttribute('aria-label', 'Filtrar agendamentos por tipo');
      for (const [value, label] of [
        ['', 'Todos...'],
        ['marcado', 'MARCADO'],
        ['extra', 'EXTRA'],
        ['demanda', 'DEMANDA ESPONTÂNEA']
      ]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      }
      select.value = selectedType;
      select.title = select.selectedOptions[0]?.textContent || '';
      select.addEventListener('change', () => {
        selectedType = select.value;
        select.title = select.selectedOptions[0]?.textContent || '';
        applyFilter();
      });
      filter.appendChild(select);
    }
    if (filter.previousElementSibling !== dateGroup || filter.parentElement !== host) {
      dateGroup.insertAdjacentElement('afterend', filter);
    }
    applyFilter();
  }

  tmRuntime.register('filtro por tipo de agendamento na Recepção', ensureFilter);
})();


/* =========================
   RECEPÇÃO - AGENDA COM DATA SELECIONADA E PRÓXIMA DATA
========================= */
(function () {
  'use strict';

  const SUMMARY_ID = 'tm-recepcao-agenda-resumo';
  const HIDDEN_CLASS = 'tm-recepcao-agenda-origem-oculta';
  const STYLE_ID = 'tm-recepcao-agenda-resumo-style';
  let lastSignature = '';

  function isReceptionPage() {
    return /\bRecepção\b/i.test(document.querySelector('.breadcrumb')?.textContent || '');
  }

  function clearSummary() {
    document.getElementById(SUMMARY_ID)?.remove();
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((element) =>
      element.classList.remove(HIDDEN_CLASS));
    lastSignature = '';
  }

  function highlightSelectedDate(summary, selectedDate) {
    const label = selectedDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2');
    Array.from(summary.children).forEach((card) => {
      card.classList.toggle('border-primary',
        card.querySelector('a.card-link')?.textContent.trim() === label);
    });
  }

  function updateSummary() {
    if (!isReceptionPage()) {
      clearSummary();
      return;
    }

    const dateInput = document.querySelector('input#ref-data[type="date"]');
    const sourceGroup = Array.from(document.querySelectorAll(`.card-group:not(#${SUMMARY_ID})`))
      .find((group) => group.querySelector(':scope > .card > .card-body.small.p-2 a.card-link'));
    const root = sourceGroup?.parentElement?.parentElement;
    const anchor = root?.querySelector(':scope > .progress.mt-1.mb-2');
    const cards = Array.from(sourceGroup?.children || []).filter((card) => card.classList.contains('card'));
    let summary = document.getElementById(SUMMARY_ID);
    const doctor = document.querySelector('#filtro-medico')?.value || '';
    if (summary?.dataset.tmDoctor && summary.dataset.tmDoctor !== doctor) {
      clearSummary();
      summary = null;
    }
    if (!dateInput || !anchor || !cards.length) {
      if (dateInput && summary?.dataset.tmFrozen === '1' && doctor &&
          summary.dataset.tmDoctor === doctor) {
        highlightSelectedDate(summary, dateInput.value);
        return;
      }
      clearSummary();
      return;
    }

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .${HIDDEN_CLASS} { display: none !important; }
        #${SUMMARY_ID} { margin-bottom: 1rem; }
      `;
      document.head.appendChild(style);
    }

    if (!summary) {
      summary = document.createElement('div');
      summary.id = SUMMARY_ID;
      summary.className = 'card-group';
      lastSignature = '';
    }
    if (summary.parentElement !== root || summary.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement('afterend', summary);
    }

    const selectedLabel = dateInput.value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2');
    let selectedIndex = cards.findIndex((card) =>
      card.querySelector('a.card-link')?.textContent.trim() === selectedLabel);
    if (selectedIndex < 0) selectedIndex = cards.findIndex((card) => card.classList.contains('border-primary'));
    if (selectedIndex < 0) selectedIndex = 0;
    selectedIndex = Math.min(selectedIndex, Math.max(0, cards.length - 2));
    const visibleCards = cards.slice(selectedIndex, selectedIndex + 2);

    const signature = visibleCards.map((card) => card.outerHTML).join('\n');
    if (signature !== lastSignature) {
      summary.replaceChildren(...visibleCards.map((card, index) => {
        const copy = card.cloneNode(true);
        copy.classList.toggle('border-primary', index === 0);
        return copy;
      }));
      lastSignature = signature;
    }
    summary.dataset.tmDoctor = doctor;
    highlightSelectedDate(summary, dateInput.value);

    sourceGroup.classList.add(HIDDEN_CLASS);
    if (sourceGroup.previousElementSibling?.matches('hr')) {
      sourceGroup.previousElementSibling.classList.add(HIDDEN_CLASS);
    }
  }

  tmRuntime.register('agenda resumida na Recepção', updateSummary);
})();


/* =========================
   RECEPÇÃO - SELECIONAR DATA PELO CARTÃO DA AGENDA
========================= */
(function () {
  'use strict';

  function isReceptionPage() {
    return /\bRecepção\b/i.test(document.querySelector('.breadcrumb')?.textContent || '');
  }

  function dateFromCard(label, selectedDate) {
    const match = label.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!match) return '';

    const day = Number(match[1]);
    const month = Number(match[2]);
    const reference = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
    if (Number.isNaN(reference.getTime())) return '';

    const candidates = [reference.getFullYear() - 1, reference.getFullYear(), reference.getFullYear() + 1]
      .map((year) => new Date(year, month - 1, day, 12))
      .filter((date) => date.getDate() === day && date.getMonth() === month - 1);
    candidates.sort((a, b) => Math.abs(a - reference) - Math.abs(b - reference));
    const date = candidates[0];
    if (!date) return '';
    return `${date.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  document.addEventListener('click', (event) => {
    if (!isReceptionPage() || !(event.target instanceof Element)) return;
    const link = event.target.closest(
      '#tm-recepcao-agenda-resumo > .card > .card-body.small.p-2 > .d-flex.justify-content-between a.card-link'
    );
    if (!link) return;

    const dateInput = document.querySelector('input#ref-data[type="date"]');
    const summary = document.getElementById('tm-recepcao-agenda-resumo');
    let component = summary;
    while (component && typeof component.__vue__?.load !== 'function') {
      component = component.parentElement;
    }
    const reception = component?.__vue__;
    if (!dateInput || !summary || !reception) return;
    const date = dateFromCard(link.textContent, dateInput.value);
    if (!date) return;

    event.preventDefault();
    summary.dataset.tmFrozen = '1';
    dateInput.value = date;
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    reception.referencia = date;
    Array.from(summary.children).forEach((card) => {
      card.classList.toggle('border-primary',
        card.querySelector('a.card-link')?.textContent.trim() === link.textContent.trim());
    });

    const instructions = reception.instrucoes;
    const schedule = reception.agenda_do_medico;
    try {
      reception.load(false);
    } finally {
      if (reception.instrucoes === null) reception.instrucoes = instructions;
      if (reception.agenda_do_medico === null) reception.agenda_do_medico = schedule;
    }
    tmRuntime.schedule(0);
  });
})();


/* =========================
   CONFIRMAÇÃO - FILTRO POR TIPO DE AGENDAMENTO
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-confirmacao-tipo-filter';
  const HOST_CLASS = 'tm-confirmacao-tipo-host';
  const HIDDEN_CLASS = 'tm-confirmacao-tipo-hidden';
  const STYLE_ID = 'tm-confirmacao-tipo-style';
  const CARD_SELECTOR = '.card.mb-2.dashcard, .dashcard.my-2[class*="atendimento-"]';
  const originalBadges = new Map();
  let selectedType = '';

  function isConfirmationPage() {
    return /\bConfirmação\b/i.test(document.querySelector('.breadcrumb')?.textContent || '');
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HIDDEN_CLASS} { display: none !important; }
      .${HOST_CLASS} {
        display: flex !important;
        align-items: flex-start;
        gap: 8px;
      }
      .${HOST_CLASS} > .input-group:not(#${FILTER_ID}) {
        flex: 1 1 0;
        width: auto;
        min-width: 0;
      }
      #${FILTER_ID} {
        flex: 0 0 calc(33.333% - 8px);
        width: calc(33.333% - 8px);
        min-width: 0;
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
      }
      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
        box-sizing: border-box !important;
      }
      #${FILTER_ID} select {
        min-width: 0;
        font-size: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-width: 575.98px) {
        .${HOST_CLASS} { flex-wrap: wrap; }
        #${FILTER_ID},
        .${HOST_CLASS} > .input-group:not(#${FILTER_ID}) {
          flex: 0 0 100%;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function filterPanel() {
    return document.querySelector('#refresh-button')?.closest('.card');
  }

  function patientGroup(panel) {
    if (!panel) return null;
    return Array.from(panel.querySelectorAll('.input-group')).find((group) =>
      Array.from(group.querySelectorAll('input, select')).some((field) =>
        /Selecionar paciente/i.test(`${field.getAttribute('placeholder') || ''} ${field.getAttribute('aria-label') || ''}`)) ||
      /Selecionar paciente/i.test(group.textContent || '')) || null;
  }

  function listCards() {
    const panel = filterPanel();
    return Array.from(document.querySelectorAll(CARD_SELECTOR)).filter((card) =>
      !card.closest('.modal') && card !== panel && !panel?.contains(card));
  }

  function appointmentType(card) {
    const icons = Array.from(card.querySelectorAll(
      'i.fa-dot-circle, i.fa-exclamation-circle, i.fa-plus-circle'
    ));
    if (!icons.length) return '';

    let icon = null;
    const time = Array.from(card.querySelectorAll('a, span, small'))
      .find((item) => /^\d{1,2}:\d{2}$/.test(item.textContent.trim()));
    if (time) {
      const box = time.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const closest = icons.map((item) => {
        const rect = item.getBoundingClientRect();
        return { item, distance: Math.hypot(rect.left + rect.width / 2 - centerX,
          rect.top + rect.height / 2 - centerY) };
      }).sort((a, b) => a.distance - b.distance)[0];
      if (closest?.distance < 100) icon = closest.item;
    }
    if (!icon) icon = icons.find((item) => item.closest('.azfloat'));

    if (icon?.classList.contains('fa-dot-circle')) return 'marcado';
    if (icon?.classList.contains('fa-exclamation-circle')) return 'extra';
    if (icon?.classList.contains('fa-plus-circle')) return 'demanda';
    return '';
  }

  function updateCounters(cards) {
    if (!selectedType) {
      originalBadges.forEach(({ original }, badge) => {
        if (badge.isConnected) badge.textContent = original;
      });
      originalBadges.clear();
      return;
    }

    const panel = filterPanel();
    const badges = Array.from(document.querySelectorAll('.badge'))
      .filter((badge) => /^\d+$/.test(badge.textContent.trim()) &&
        !badge.closest(`${CARD_SELECTOR}, .modal`) &&
        panel && !panel.contains(badge) &&
        (panel.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING));

    badges.forEach((badge, index) => {
      const next = badges[index + 1];
      const sectionCards = cards.filter((card) =>
        (badge.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        (!next || (card.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING)));
      if (!sectionCards.length) return;
      let state = originalBadges.get(badge);
      if (!state) {
        state = { original: badge.textContent, filtered: null };
        originalBadges.set(badge, state);
      } else if (badge.textContent !== state.filtered) {
        state.original = badge.textContent;
      }
      state.filtered = String(sectionCards.filter((card) => !card.classList.contains(HIDDEN_CLASS)).length);
      if (badge.textContent !== state.filtered) badge.textContent = state.filtered;
    });
  }

  function applyFilter() {
    const cards = listCards();
    cards.forEach((card) => {
      const hide = !!selectedType && appointmentType(card) !== selectedType;
      card.classList.toggle(HIDDEN_CLASS, hide);
    });
    updateCounters(cards);
  }

  function clearFilter() {
    document.getElementById(FILTER_ID)?.remove();
    document.querySelectorAll(`.${HOST_CLASS}`).forEach((host) => host.classList.remove(HOST_CLASS));
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) => card.classList.remove(HIDDEN_CLASS));
    originalBadges.forEach(({ original }, badge) => {
      if (badge.isConnected) badge.textContent = original;
    });
    originalBadges.clear();
  }

  function ensureFilter() {
    if (!isConfirmationPage()) {
      clearFilter();
      return;
    }

    const group = patientGroup(filterPanel());
    const host = group?.parentElement;
    if (!group || !host) return;
    injectStyle();
    host.classList.add(HOST_CLASS);

    let filter = document.getElementById(FILTER_ID);
    if (!filter) {
      filter = document.createElement('div');
      filter.id = FILTER_ID;
      filter.className = 'input-group';
      const prepend = document.createElement('div');
      prepend.className = 'input-group-prepend';
      const icon = document.createElement('span');
      icon.className = 'input-group-text';
      icon.innerHTML = '<i class="fas fa-filter"></i>';
      prepend.appendChild(icon);
      filter.appendChild(prepend);
      const select = document.createElement('select');
      select.className = 'form-control';
      select.setAttribute('aria-label', 'Filtrar agendamentos por tipo');
      for (const [value, label] of [
        ['', 'Todos...'],
        ['marcado', 'MARCADO'],
        ['extra', 'EXTRA'],
        ['demanda', 'DEMANDA ESPONTÂNEA']
      ]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      }
      select.value = selectedType;
      select.title = select.selectedOptions[0]?.textContent || '';
      select.addEventListener('change', () => {
        selectedType = select.value;
        select.title = select.selectedOptions[0]?.textContent || '';
        applyFilter();
      });
      filter.appendChild(select);
    }
    if (filter.parentElement !== host || filter.nextElementSibling !== group) {
      host.insertBefore(filter, group);
    }
    applyFilter();
  }

  tmRuntime.register('filtro por tipo de agendamento na Confirmação', ensureFilter);
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

  tmRuntime.register('limpeza do chat', cleanupBulkChatDom);
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
        position: fixed !important;
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
        background: transparent !important;
      }

      .tm-datecalc-final-close:focus-visible,
      .tm-datecalc-final-root .tm-datecalc-hoje-btn:focus-visible,
      .tm-datecalc-final-root .tm-datecalc-copy-result:focus-visible {
        outline: 2px solid #1679e8 !important;
        outline-offset: 2px !important;
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

      .tm-datecalc-final-hide {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function findRoot() {
    const root = document.getElementById('tm-datecalc-panel');
    return root && !root.classList.contains('tm-datecalc-hidden') ? root : null;
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
    root.classList.add('tm-datecalc-hidden');
    document.querySelector('[data-tm-datecalc-header-trigger="1"]')?.focus({ preventScroll: true });
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


  function ensureFinalStructure() {
    injectFinalDateCalcCss24_1();

    const root = findRoot();
    if (!root) return;

    root.classList.add('tm-datecalc-final-root');

    cleanupOldResultLabelNodes(root);
    root.querySelectorAll('.tm-datecalc-close-btn, .tm-datecalc-close-main, .tm-datecalc-safe-close, .tm-datecalc-safe-close-row')
      .forEach((node) => node.remove());

    const prazoInput = root.querySelector('#tm-datecalc-days, input[type="number"]');
    if (prazoInput) {
      prazoInput.setAttribute('min', '0');
      prazoInput.setAttribute('step', '1');
      prazoInput.setAttribute('inputmode', 'numeric');
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
      btn.setAttribute('aria-label', 'Fechar calculadora');
      row.appendChild(btn);
    }

    if (btn.dataset.tmDatecalcFinalBound !== '1') {
      btn.dataset.tmDatecalcFinalBound = '1';

      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeRoot(root);
      }, true);
    }
  }

  document.addEventListener('click', () => {
    window.setTimeout(ensureFinalStructure, 0);
    window.setTimeout(ensureFinalStructure, 60);
    window.setTimeout(ensureFinalStructure, 160);
  }, true);

  tmRuntime.register('estrutura da calculadora', ensureFinalStructure);
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
  let selectedAttachmentValue = '';
  let applyTimer = null;

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

    const breadcrumb = document.querySelector('.breadcrumb');
    return /(?:^|\/)\s*Autorizações\b/.test(norm(breadcrumb?.innerText || breadcrumb?.textContent || ''));
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
    return select ? select.value : selectedAttachmentValue;
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
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(applyAttachmentFilter, 80);
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
    select.setAttribute('aria-label', 'Filtrar autorizações por anexo');
    select.value = selectedAttachmentValue;
    select.addEventListener('change', () => {
      selectedAttachmentValue = select.value;
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
      document.querySelectorAll('.tm-auth-recepcao-filter-hidden')
        .forEach((element) => element.classList.remove('tm-auth-recepcao-filter-hidden'));
      applyAttachmentFilter();
      return;
    }

    if (document.getElementById(FILTER_ID)) {
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
      selectedAttachmentValue = event.target.value;
      scheduleApplyAttachmentFilter();
    }
  }, true);

  document.addEventListener('click', () => {
    tmRuntime.schedule();
  }, true);

  tmRuntime.register('filtro de autorizações', () => {
    ensureAttachmentFilter();
    applyAttachmentFilter();
  });
})();


/* =========================
   CHAT DIRETO - ENTER ENVIA / SHIFT+ENTER QUEBRA LINHA
   v25.4
========================= */
(function () {
  'use strict';

  const pendingSends = new WeakSet();

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
    if (!sendButton || sendButton.disabled || pendingSends.has(textarea)) return;

    const value = norm(textarea.value);
    if (!value) return;

    pendingSends.add(textarea);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    window.setTimeout(() => {
      if (textarea.isConnected && sendButton.isConnected && !sendButton.disabled) {
        sendButton.click();
      }
      window.setTimeout(() => pendingSends.delete(textarea), 600);
    }, 0);
  }

  function bindDirectChatTextarea(textarea) {
    if (!isDirectChatTextarea(textarea)) return;
    if (textarea.dataset.tmDirectChatEnterBound === '1') return;

    textarea.dataset.tmDirectChatEnterBound = '1';

    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;

      if (event.shiftKey || event.isComposing || event.keyCode === 229 ||
          event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
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

  tmRuntime.register('chat direto', scanDirectChatTextareas);
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
    const iso = tmParseDateInput(value);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);
    return date;
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

    if (!startDate || !/^\d+$/.test(daysRaw) || !Number.isSafeInteger(Number(daysRaw))) return;

    const validityDate = addDays(startDate, Number(daysRaw));
    if (Number.isNaN(validityDate.getTime())) return;

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
    const root = document.getElementById('tm-datecalc-panel');
    return root && !root.classList.contains('tm-datecalc-hidden') ? [root] : [];
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

  tmRuntime.register('cor da validade', applyValidityColors);
})();
