/* =========================
   RECEPÇÃO E CONFIRMAÇÃO - OCULTAR PRÉVIA DE DIAS DA AGENDA
========================= */
(function () {
  'use strict';

  const HIDDEN_CLASS = 'tm-agenda-previa-oculta';
  const STYLE_ID = 'tm-agenda-previa-style';

  function hideSchedulePreview() {
    document.getElementById('tm-recepcao-agenda-resumo')?.remove();
    document.getElementById('tm-recepcao-agenda-resumo-style')?.remove();
    const route = window.location.hash;
    if (route !== '#/recepcao' && route !== '#/call-center/confirmacao') {
      document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((element) =>
        element.classList.remove(HIDDEN_CLASS));
      document.getElementById(STYLE_ID)?.remove();
      return;
    }

    const scope = route === '#/call-center/confirmacao'
      ? document.querySelector('#refresh-button')?.closest('.card.dashcard')?.parentElement
      : document;
    const source = Array.from(scope?.querySelectorAll('.card-group') || [])
      .find((group) => group.querySelector(':scope > .card > .card-body.small.p-2 a.card-link'));
    if (!source) return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `.${HIDDEN_CLASS} { display: none !important; }`;
      document.head.appendChild(style);
    }
    if (!source.classList.contains(HIDDEN_CLASS)) source.classList.add(HIDDEN_CLASS);
    if (source.previousElementSibling?.matches('hr')) {
      if (!source.previousElementSibling.classList.contains(HIDDEN_CLASS)) {
        source.previousElementSibling.classList.add(HIDDEN_CLASS);
      }
    }
  }

  tmRuntime.register('ocultar prévia da agenda na Recepção e Confirmação', hideSchedulePreview,
    ['#/recepcao', '#/call-center/confirmacao']);
})();
