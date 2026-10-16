/* =========================
   AUTORIZAÇÕES - MODAL COMPACTO
   v26.11
========================= */
(function () {
  'use strict';

  const STYLE_ID = 'tm-authorization-modal-compact-style';

  function injectAuthorizationModalStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #autorizarModal.modal.show {
        align-items: center !important;
        display: flex !important;
        justify-content: center !important;
        overflow-y: auto !important;
        padding: 16px !important;
      }

      #autorizarModal .modal-dialog.modal-dialog-total {
        height: auto !important;
        margin: 0 !important;
        max-height: calc(100vh - 32px) !important;
        max-width: 1120px !important;
        min-height: 0 !important;
        width: min(1120px, 100%) !important;
      }

      #autorizarModal .modal-content.modal-content-total {
        height: auto !important;
        max-height: calc(100vh - 32px) !important;
        min-height: 0 !important;
        width: 100% !important;
      }

      #autorizarModal .modal-body {
        flex: 0 1 auto !important;
        max-height: calc(100vh - 184px) !important;
        overflow-y: auto !important;
      }

      #autorizarModal .modal-body > br {
        display: none !important;
      }

    `;

    document.head.appendChild(style);
  }

  tmRuntime.register('modal compacto de autorização', injectAuthorizationModalStyle);
})();
