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
