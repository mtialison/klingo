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
