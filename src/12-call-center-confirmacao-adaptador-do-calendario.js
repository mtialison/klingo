/* =========================
   CALL CENTER / CONFIRMAÇÃO - ADAPTADOR DO CALENDÁRIO
========================= */
const tmConfirmationCalendarAdapter = (() => {
  const ROUTE = '#/call-center/confirmacao';
  const EVENT = 'tm-confirmacao-calendar-context';
  let lastContext = '';

  function selectByPlaceholder(root, label) {
    return [...root.querySelectorAll('select')].find((select) =>
      select.options[0]?.textContent.trim() === label) || null;
  }

  function read(root = document, route = window.location.hash) {
    if (route !== ROUTE) return null;
    const refresh = root.querySelector('#refresh-button');
    const toolbar = refresh?.closest('.card.dashcard');
    const startInput = refresh?.closest('.input-group')?.querySelector('input[type="date"]');
    const endInput = [...(toolbar?.querySelectorAll('input[type="date"]') || [])]
      .find((input) => input !== startInput);
    const unitSelect = toolbar && selectByPlaceholder(toolbar, 'Unidades...');
    const doctorSelect = toolbar && selectByPlaceholder(toolbar, 'Todos os Médicos...');
    if (!toolbar || !startInput || !endInput || !unitSelect || !doctorSelect) return null;
    return {
      startInput, endInput, unitSelect, doctorSelect, refresh,
      context: {
        start: startInput.value, end: endInput.value,
        unit: unitSelect.value, doctor: doctorSelect.value
      }
    };
  }

  function sync() {
    const current = read();
    const key = current ? JSON.stringify(current.context) : '';
    if (key === lastContext) return;
    lastContext = key;
    document.dispatchEvent(new CustomEvent(EVENT, { detail: current?.context || null }));
  }

  // Publica o contexto sem alterar o intervalo mantido pelo Klingo.
  const onFilter = (event) => {
    const current = read();
    if (current && [current.startInput, current.endInput, current.unitSelect,
      current.doctorSelect].includes(event.target)) sync();
  };
  document.addEventListener('input', onFilter, true);
  document.addEventListener('change', onFilter, true);
  tmRuntime.register('contexto do calendário da Confirmação', sync, ['#/call-center/confirmacao']);
  return { read, event: EVENT };
})();
