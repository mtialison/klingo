/* =========================
   CALL CENTER - FOCO E SUGESTÕES INICIAIS
========================= */
(function () {
  'use strict';

  const PLAN = 'input[placeholder="Operadora/Plano..."]';
  const STYLE_ID = 'tm-callcenter-initial-suggestions-style';
  const manuallyFocused = new WeakSet();
  let keyboardIntentUntil = 0;

  function isCallCenter() {
    return window.location.hash === '#/call-center';
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    // Estas listas são as sugestões fixas do formulário. O autocomplete
    // pesquisável fica dentro de .form-group e continua disponível.
    style.textContent = `
      .row:has(> .col > .form-group ${PLAN}) > .col > ul.list-group,
      .row:has(> .col > .form-group input[placeholder="Selecione o Procedimento..."]) > .col > ul.list-group {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('pointerdown', (event) => {
    if (!isCallCenter() || !(event.target instanceof Element)) return;
    const input = event.target.closest(PLAN);
    if (input) manuallyFocused.add(input);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (isCallCenter() && event.key === 'Tab') keyboardIntentUntil = Date.now() + 500;
  }, true);

  document.addEventListener('focusin', (event) => {
    const input = event.target;
    if (!isCallCenter() || !(input instanceof Element) || !input.matches(PLAN)) return;
    if (Date.now() <= keyboardIntentUntil) manuallyFocused.add(input);
    if (!manuallyFocused.has(input)) input.blur();
  }, true);

  document.addEventListener('focusout', (event) => {
    if (event.target instanceof Element && event.target.matches(PLAN)) {
      manuallyFocused.delete(event.target);
    }
  }, true);

  tmRuntime.register('Call Center sem foco e sugestões iniciais', () => {
    if (!isCallCenter()) return;
    ensureStyle();
    const input = document.querySelector(PLAN);
    if (input && document.activeElement === input && !manuallyFocused.has(input)) input.blur();
  }, ['#/call-center']);
})();
