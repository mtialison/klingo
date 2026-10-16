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
    root.querySelectorAll('.tm-datecalc-final-close-row, .tm-datecalc-close-btn, .tm-datecalc-close-main, .tm-datecalc-safe-close, .tm-datecalc-safe-close-row')
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
  }

  document.addEventListener('click', () => {
    window.setTimeout(ensureFinalStructure, 0);
    window.setTimeout(ensureFinalStructure, 60);
    window.setTimeout(ensureFinalStructure, 160);
  }, true);

  tmRuntime.register('estrutura da calculadora', ensureFinalStructure);
})();
