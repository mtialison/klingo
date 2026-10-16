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
