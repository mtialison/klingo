// ==UserScript==
// @name         klingo
// @namespace    http://tampermonkey.net/
// @version      26.63
// @description  Ajustes de interface, cadastro, chat, recepção e autorizações do Klingo
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

const TM_LOGIN_ICON_DATA = '__TM_LOGIN_ICON_DATA__';

// Uma única fila coordena atualizações dos recursos da página ativa.
const tmRuntime = (() => {
  const jobs = new Map();
  let pending = null;
  let observer = null;
  let running = false;
  let lastRoute = null;

  function flush() {
    pending = null;
    if (running) return;
    running = true;
    const route = window.location.hash.split('?')[0];
    const routeChanged = route !== lastRoute;
    const previousRoute = lastRoute;
    lastRoute = route;
    jobs.forEach(({ job, routes }, name) => {
      const onRoute = (value) => routes?.some((prefix) => value === prefix || value.startsWith(prefix + '/'));
      if (routes && !onRoute(route) && !(routeChanged && previousRoute !== null && onRoute(previousRoute))) return;
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
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', () => schedule(0));
    window.addEventListener('pageshow', () => schedule(0));
    window.addEventListener('focus', () => schedule(0));
    schedule(0);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  return {
    register(name, job, routes = null) {
      jobs.set(name, { job, routes });
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
    loginIcon.src = TM_LOGIN_ICON_DATA;
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

      .tm-datecalc-header-trigger .tm-datecalc-trigger-icon {
        position: relative !important;
        z-index: 1 !important;
        display: block !important;
        font-size: 20px !important;
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

      .tm-datecalc-header-trigger:hover .tm-datecalc-trigger-icon,
      .tm-datecalc-header-trigger:focus .tm-datecalc-trigger-icon {
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

    if (isOpen) document.dispatchEvent(new Event('tm-datecalc-opened'));

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

  function ensureScriptUpdateLink(navbar) {
    let link = navbar.querySelector('#tm-script-update-link');
    if (!link) {
      link = document.createElement('a');
      link.id = 'tm-script-update-link';
      link.className = 'nav-link tm-datecalc-header-trigger';
      link.href = 'https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = 'Atualizar o script';
      link.setAttribute('aria-label', 'Atualizar o script');
      const icon = document.createElement('span');
      icon.className = 'tm-datecalc-trigger-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '🐵';
      link.appendChild(icon);
      link.style.setProperty('position', 'absolute', 'important');
      link.style.setProperty('left', 'calc(50% + 36px)', 'important');
      link.style.setProperty('top', '50%', 'important');
      link.style.setProperty('transform', 'translateY(-50%)', 'important');
      link.style.setProperty('margin', '0', 'important');
      link.style.setProperty('z-index', '5', 'important');
      navbar.appendChild(link);
    }
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

    const expected = String(getDisplayVersion());
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
    ensureScriptUpdateLink(navbar);
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
    const icon = document.createElement('span');
    icon.className = 'tm-datecalc-trigger-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🧮';
    trigger.appendChild(icon);

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

      const panel = getDateCalculatorPanel();
      if (panel && !panel.classList.contains('tm-datecalc-hidden') && !panel.contains(e.target)) {
        setDateCalculatorOpen(false);
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

  document.addEventListener('click', (event) => {
    const btn = event.target?.closest?.('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"]');
    if (!btn) return;
    tmDateCalcDisableCopyTooltip(btn);
    setTimeout(() => tmDateCalcDisableCopyTooltip(btn), 0);
  }, true);

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
