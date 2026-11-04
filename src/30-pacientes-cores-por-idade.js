/* CONFIRMAÇÃO/RECEPÇÃO — destacar crianças e pacientes com80 anos ou mais. */
(function () {
  'use strict';
  const AGE = 'span.badge[title="idade do paciente"], span.badge[data-original-title="idade do paciente"]';
  const BAND = 'data-tm-age-band', EXTRA = 'data-tm-age-extra';
  const STYLE = 'tm-patient-age-colors';
  let observer = null, active = false;

  function years(text) {
    const match = text.trim().match(/^(\d+)\s*(a|m|d)$/i);
    if (!match) return null;
    return Number(match[1]) / ({ a: 1, m: 12, d: 365.2425 }[match[2].toLowerCase()]);
  }

  function update() {
    active = /^#\/(?:recepcao|call-center\/confirmacao)(?:\/|$)/.test(window.location.hash.split('?')[0]);
    const bands = new Map(), extras = new Set();
    if (active) document.querySelectorAll(AGE).forEach(badge => {
      if (badge.closest('.modal, nav.navbar')) return;
      const age = years(badge.textContent);
      if (age === null) return;
      if (age < 14) bands.set(badge, 'child');
      else if (age >= 80) {
        bands.set(badge, 'elder');
        badge.parentElement?.querySelectorAll('span.badge').forEach(other => {
          if (other !== badge && other.textContent.trim() === '80+') extras.add(other);
        });
      }
    });
    document.querySelectorAll(`[${BAND}]`).forEach(badge => {
      if (!bands.has(badge)) badge.removeAttribute(BAND);
    });
    document.querySelectorAll(`[${EXTRA}]`).forEach(badge => {
      if (!extras.has(badge)) badge.removeAttribute(EXTRA);
    });
    if (active && !document.getElementById(STYLE)) {
      const style = document.createElement('style'); style.id = STYLE;
      style.textContent = `
        .badge[${BAND}="child"] { background-color: #F4A8FF !important; color: #212529 !important; }
        .badge[${BAND}="elder"] { background-color: #FFD230 !important; color: #212529 !important; }
        [${EXTRA}="true"] { display: none !important; }
      `;
      document.head.appendChild(style);
    }
    bands.forEach((band, badge) => {
      if (badge.getAttribute(BAND) !== band) badge.setAttribute(BAND, band);
    });
    extras.forEach(badge => {
      if (badge.getAttribute(EXTRA) !== 'true') badge.setAttribute(EXTRA, 'true');
    });
    if (!active) { observer?.disconnect(); observer = null; }
    else if (!observer && document.body) {
      observer = new MutationObserver(records => {
        if (active && records.some(record => record.target.parentElement?.closest(`${AGE}, [${EXTRA}]`))) {
          tmRuntime.schedule(0);
        }
      });
      observer.observe(document.body, { characterData: true, subtree: true });
    }
  }

  tmRuntime.register('cores das idades dos pacientes', update, ['#/recepcao', '#/call-center/confirmacao']);
})();
