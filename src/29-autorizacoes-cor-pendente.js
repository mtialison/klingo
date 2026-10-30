/* AUTORIZAÇÕES/RECEPÇÃO — Pendente usa o mesmo visual nativo de Autorizado Parcialmente. */
(function () {
  'use strict';
  const ATTRIBUTE = 'data-tm-pending-authorization';
  const MARKED = `.badge[${ATTRIBUTE}="true"]`;
  const STYLE_ID = 'tm-pending-authorization-style';
  let textObserver = null;
  let watchedSelector = null;

  function ensurePendingColor() {
    const route = window.location.hash.split('?')[0];
    const reception = /^#\/recepcao(?:\/|$)/.test(route);
    const authorization = /^#\/autorizacoes(?:\/|$)/.test(route);
    const selector = reception ? '.tm-reception-authorization-button' : authorization ? '.badge' : null;
    watchedSelector = selector;
    if (!selector) {
      textObserver?.disconnect();
      textObserver = null;
    } else if (!textObserver && document.body) {
      // Vue também altera textNode.data sem substituir o elemento da badge.
      textObserver = new MutationObserver(records => {
        if (watchedSelector && records.some(record => {
          const badge = record.target.parentElement?.closest(watchedSelector);
          return badge && !badge.closest('.modal, nav.navbar');
        })) tmRuntime.schedule(0);
      });
      textObserver.observe(document.body, { characterData: true, subtree: true });
    }
    const pending = new Set(selector ? Array.from(document.querySelectorAll(selector)).filter(badge =>
      !badge.closest('.modal, nav.navbar') &&
      badge.textContent.replace(/[✓✔]/g, '').replace(/\s+/g, ' ').trim().toLowerCase() === 'pendente') : []);
    // O Klingo reaproveita elementos; retirar a cor quando a badge muda de status ou de módulo.
    document.querySelectorAll(MARKED).forEach(badge => {
      if (!pending.has(badge)) badge.removeAttribute(ATTRIBUTE);
    });
    if (!pending.size) return;
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      // Valores das regras .badge-warning nativas, incluindo hover e foco.
      style.textContent = `
        ${MARKED} { color: #212529 !important; background-color: #ffc107 !important; }
        a${MARKED}:hover, a${MARKED}:focus {
          color: #212529 !important; background-color: #d39e00 !important;
        }
        a${MARKED}.focus, a${MARKED}:focus {
          outline: 0; box-shadow: 0 0 0 .2rem rgba(255, 193, 7, .5) !important;
        }
      `;
      document.head.appendChild(style);
    }
    pending.forEach(badge => {
      if (badge.getAttribute(ATTRIBUTE) !== 'true') badge.setAttribute(ATTRIBUTE, 'true');
    });
  }

  tmRuntime.register('cor de autorização Pendente', ensurePendingColor, ['#/autorizacoes', '#/recepcao']);
})();
