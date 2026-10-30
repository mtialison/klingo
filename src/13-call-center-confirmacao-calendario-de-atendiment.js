/* =========================
   CALL CENTER / CONFIRMAÇÃO - CALENDÁRIO DE ATENDIMENTOS
========================= */
(function () {
  'use strict';

  const { source, prepare, createCalendarPreloader, calendarDates, iso, monthNames } = tmAppointmentCalendarCore;
  const STYLE_ID = 'tm-confirmacao-calendario-style';
  const POPOVER_ID = 'tm-confirmacao-calendario-popover';
  const BUTTON_CLASS = 'tm-confirmacao-calendario-botao';
  const INPUT_CLASS = 'tm-confirmacao-calendario-input';
  const state = { input: null, month: null, days: new Map(), loading: false, error: '', request: 0 };
  let mounted = [null, null], contextKey = '', paintFrame = null;

  function componentFor(current) {
    let element = current?.refresh;
    while (element) {
      const component = element.__vue__;
      if (typeof component?.$http?.post === 'function') return component;
      element = element.parentElement;
    }
    return null;
  }

  source.subscribe(() => {
    if (!document.getElementById(POPOVER_ID) || paintFrame != null) return;
    paintFrame = requestAnimationFrame(() => {
      paintFrame = null;
      const current = tmConfirmationCalendarAdapter.read();
      if (!current || !state.month || state.input !== current.startInput) return;
      state.days = source.read(calendarDates(state.month), current.context.doctor, current.context.unit);
      if (source.freshCount(calendarDates(state.month), current.context.doctor, current.context.unit) === 42) state.loading = false;
      paintDays();
    });
  });

  function monthOf(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-\d{2}$/);
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, 1, 12) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }

  function requestContext(current, month) {
    return [current.context.doctor, current.context.unit, iso(month).slice(0, 7)].join('|');
  }

  const preloader = createCalendarPreloader({
    source,
    active: () => !!tmConfirmationCalendarAdapter.read() && !document.hidden,
    context: () => {
      const current = tmConfirmationCalendarAdapter.read();
      if (!current) return null;
      const component = componentFor(current);
      prepare(component);
      return {
        component, doctor: current.context.doctor, unit: current.context.unit,
        month: document.getElementById(POPOVER_ID) && state.input === current.startInput && state.month
          ? state.month : monthOf(current.context.start)
      };
    },
    onError: (error) => console.warn('[TM] Pré-busca do calendário da Confirmação:', error.message)
  });

  function stopWork() { preloader.stop(); }

  function preload(force = false) {
    return preloader.sync({ force: force === true });
  }

  function dayTitle(detail) {
    if (!detail) return state.loading ? 'Data ainda em consulta' : 'Data não verificada';
    if (detail.kind === 'booked') return 'Paciente marcado sem atendimento regular disponível';
    if (detail.kind === 'blocked') return detail.holidayClosed ? `Feriado: ${detail.holiday}` : 'Agenda bloqueada';
    if (detail.kind === 'attendance') return detail.holiday ?
      `Atendimento permitido no feriado: ${detail.holiday}` : 'Médico atende nesta data';
    return 'Sem agenda identificada nesta unidade';
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      input.${INPUT_CLASS}[type="date"]::-webkit-calendar-picker-indicator { display: none !important; }
      .${BUTTON_CLASS} { height: 100%; min-width: 42px; border-radius: 0 .25rem .25rem 0; }
      #${POPOVER_ID} { position: fixed; z-index: 1080; width: 322px; max-width: calc(100vw - 16px);
        background: #fff; color: #344054; border: 1px solid #cbd5e1; border-radius: 8px;
        box-shadow: 0 10px 28px rgba(16,24,40,.22); padding: 12px; font-size: 13px; }
      #${POPOVER_ID} .tm-cal-header { display: flex; align-items: center; justify-content: space-between;
        gap: 8px; margin-bottom: 9px; }
      #${POPOVER_ID} .tm-cal-header strong { text-transform: capitalize; font-size: 14px; }
      #${POPOVER_ID} button { cursor: pointer; }
      #${POPOVER_ID} .tm-cal-nav { width: 30px; height: 30px; border: 1px solid #cbd5e1;
        border-radius: 5px; background: #fff; color: #344054; }
      #${POPOVER_ID} .tm-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
      #${POPOVER_ID} .tm-cal-weekday { text-align: center; color: #667085; font-size: 11px;
        font-weight: 600; padding: 5px 0; }
      #${POPOVER_ID} .tm-cal-day { height: 34px; border: 1px solid transparent; border-radius: 5px;
        background: #f5f7fa; color: #344054; }
      #${POPOVER_ID} .tm-cal-day:hover { background: #e2e6ea; }
      #${POPOVER_ID} .tm-cal-day[data-kind="attendance"] { background: #198754; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-kind="blocked"] { background: #dc3545; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-kind="booked"] { background: #0d6efd; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-kind="attendance"]:hover { background: #146c43; }
      #${POPOVER_ID} .tm-cal-day[data-kind="blocked"]:hover { background: #b02a37; }
      #${POPOVER_ID} .tm-cal-day[data-kind="booked"]:hover { background: #0b5ed7; }
      #${POPOVER_ID} .tm-cal-day[data-today="true"],
      #${POPOVER_ID} .tm-cal-day[data-selected="true"] {
        outline: 3px solid #2B7FFF; outline-offset: 1px;
        box-shadow: 0 0 0 1px #fff; position: relative; z-index: 1;
      }
      #${POPOVER_ID} .tm-cal-day[data-selected="true"] { outline-color: #F6339A; }
      #${POPOVER_ID} .tm-cal-day[data-outside="true"] { opacity: .45; }
      #${POPOVER_ID} .tm-cal-footer { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
      #${POPOVER_ID} .tm-cal-status { color: #667085; }
      #${POPOVER_ID} .tm-cal-footer button { border: 0; background: transparent; color: #007bff;
        padding: 3px 5px; font-size: 13px; margin-left: auto; }
    `;
    document.head.appendChild(style);
  }

  function positionPopover() {
    const popover = document.getElementById(POPOVER_ID), input = state.input;
    if (!popover || !input) return;
    const rect = input.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8));
    const below = rect.bottom + 6;
    const top = below + popover.offsetHeight <= window.innerHeight - 8 ?
      below : Math.max(8, rect.top - popover.offsetHeight - 6);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function paintDays() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    const painted = state.input === tmConfirmationCalendarAdapter.read()?.startInput;
    popover.querySelectorAll('button[data-date]').forEach((day) => {
      const detail = painted ? state.days.get(day.dataset.date) : null;
      day.dataset.kind = detail?.kind || '';
      const title = painted ? dayTitle(detail) : 'Selecionar data';
      if (detail && (detail.kind === 'blocked' || detail.block || detail.holiday)) {
        if (day.title !== title) day.title = title;
      } else day.removeAttribute('title');
      day.setAttribute('aria-label', day.dataset.date + ': ' + title);
    });
    const message = popover.querySelector('.tm-cal-status');
    if (message) message.textContent = painted ? (state.loading ? 'Buscando...' : state.error) : '';
    popover.setAttribute('aria-busy', String(painted && state.loading));
  }

  function render() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover || !state.month) return;
    popover.replaceChildren();
    const header = document.createElement('div');
    header.className = 'tm-cal-header';
    const previous = document.createElement('button'), next = document.createElement('button');
    for (const [button, action, label, icon] of [
      [previous, 'previous', 'Mês anterior', '‹'], [next, 'next', 'Próximo mês', '›']
    ]) {
      button.type = 'button'; button.className = 'tm-cal-nav'; button.dataset.action = action;
      button.setAttribute('aria-label', label); button.textContent = icon;
    }
    const title = document.createElement('strong');
    title.textContent = `${monthNames[state.month.getMonth()]} de ${state.month.getFullYear()}`;
    header.append(previous, title, next);
    popover.appendChild(header);
    const grid = document.createElement('div');
    grid.className = 'tm-cal-grid';
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((label) => {
      const weekday = document.createElement('div');
      weekday.className = 'tm-cal-weekday'; weekday.textContent = label; grid.appendChild(weekday);
    });
    const todayIso = iso(new Date());
    for (const dateKey of calendarDates(state.month)) {
      const day = document.createElement('button');
      day.type = 'button'; day.className = 'tm-cal-day'; day.dataset.date = dateKey;
      day.dataset.today = String(dateKey === todayIso);
      if (dateKey === todayIso) day.setAttribute('aria-current', 'date');
      day.dataset.selected = String(dateKey === state.input?.value);
      day.dataset.outside = String(Number(dateKey.slice(5, 7)) !== state.month.getMonth() + 1);
      day.textContent = String(Number(dateKey.slice(8, 10)));
      grid.appendChild(day);
    }
    popover.appendChild(grid);
    const footer = document.createElement('div');
    footer.className = 'tm-cal-footer';
    const message = document.createElement('span'); message.className = 'tm-cal-status';
    const today = document.createElement('button'); today.type = 'button';
    today.dataset.action = 'today'; today.textContent = 'Hoje';
    footer.append(message, today); popover.appendChild(footer);
    paintDays(); positionPopover();
  }

  async function loadMonth() {
    const current = tmConfirmationCalendarAdapter.read();
    if (!current || !state.month || document.hidden) return;
    const request = ++state.request, dates = calendarDates(state.month);
    if (state.input === current.endInput) {
      state.days = new Map();
      state.loading = false;
      state.error = '';
      render();
      return;
    }
    const { doctor, unit } = current.context;
    prepare(componentFor(current));
    state.days = source.read(dates, doctor, unit);
    state.error = '';
    state.loading = !!doctor && source.freshCount(dates, doctor, unit) !== dates.length;
    render();
    if (!doctor || !componentFor(current)) { preload(); state.loading = false; paintDays(); return; }
    try {
      const days = await preload(true);
      if (request === state.request && days) state.days = days;
    } catch (error) {
      if (request === state.request && !error.cancelled) {
        state.error = 'Algumas datas não puderam ser verificadas.';
        console.warn('[TM] Calendário da Confirmação:', error.message);
      }
    } finally {
      if (request === state.request) { state.loading = false; paintDays(); }
    }
  }

  function closeCalendar() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    state.request++;
    popover.remove();
    state.input = null;
  }

  function chooseDate(date) {
    const input = state.input;
    if (!input) return;
    input.value = date;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    closeCalendar();
    tmRuntime.schedule(0);
  }

  function openCalendar(input) {
    if (document.getElementById(POPOVER_ID) && state.input === input) {
      closeCalendar(); return;
    }
    closeCalendar();
    state.input = input;
    state.month = monthOf(input.value);
    const popover = document.createElement('div');
    popover.id = POPOVER_ID;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', input === tmConfirmationCalendarAdapter.read()?.startInput ?
      'Calendário de atendimentos' : 'Calendário da data final');
    popover.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest('button[data-action]')?.dataset.action;
      if (action === 'today') return chooseDate(iso(new Date()));
      if (action === 'previous' || action === 'next') {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() +
          (action === 'next' ? 1 : -1), 1, 12);
        loadMonth(); return;
      }
      const date = event.target.closest('button[data-date]')?.dataset.date;
      if (date) chooseDate(date);
    });
    document.body.appendChild(popover);
    loadMonth();
  }

  function ensureCalendar() {
    const current = tmConfirmationCalendarAdapter.read();
    if (!current) {
      if (mounted.some(Boolean)) {
        stopWork(); contextKey = ''; mounted = [null, null];
        closeCalendar();
        document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => button.parentElement?.remove());
        document.querySelectorAll(`input.${INPUT_CLASS}`).forEach((input) => input.classList.remove(INPUT_CLASS));
        document.getElementById(STYLE_ID)?.remove();
      }
      return;
    }
    injectStyle();
    [current.startInput, current.endInput].forEach((input, index) => {
      input.classList.add(INPUT_CLASS);
      if (mounted[index] === input && input.parentElement?.querySelector(`.${BUTTON_CLASS}`)) return;
      const group = input.closest('.input-group');
      if (!group) return;
      const host = document.createElement('div'); host.className = 'input-group-append';
      const button = document.createElement('button');
      button.type = 'button'; button.className = `btn btn-outline-secondary ${BUTTON_CLASS}`;
      button.innerHTML = '<i class="fas fa-calendar-alt" aria-hidden="true"></i>';
      button.setAttribute('aria-label', index ? 'Abrir calendário da data final' : 'Abrir calendário da data inicial');
      button.title = index ? 'Selecionar data final' : 'Calendário de atendimentos';
      if (!index) {
        button.addEventListener('pointerenter', preload);
        button.addEventListener('focus', preload);
      }
      button.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation(); openCalendar(input);
      });
      host.appendChild(button); group.appendChild(host); mounted[index] = input;
    });
    preload();
  }

  document.addEventListener(tmConfirmationCalendarAdapter.event, () => {
    const current = tmConfirmationCalendarAdapter.read();
    if (!current) return;
    const key = requestContext(current, monthOf(current.context.start));
    if (key !== contextKey) {
      contextKey = key;
      preload();
      if (document.getElementById(POPOVER_ID)) loadMonth();
    }
  });
  document.addEventListener('click', (event) => {
    if (document.getElementById(POPOVER_ID) && event.target instanceof Element &&
        !event.target.closest(`#${POPOVER_ID}, .${BUTTON_CLASS}`)) closeCalendar();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeCalendar(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopWork();
    else if (document.getElementById(POPOVER_ID)) loadMonth();
    else preload();
  });
  document.addEventListener('click', (event) => {
    const current = tmConfirmationCalendarAdapter.read();
    if (current && event.target instanceof Element && event.target.closest('#refresh-button')) {
      source.invalidate(current.context.doctor, current.context.unit);
    }
  }, true);
  window.addEventListener('resize', positionPopover);
  window.addEventListener('scroll', positionPopover, true);
  tmRuntime.register('calendário de atendimentos da Confirmação', ensureCalendar, ['#/call-center/confirmacao']);
})();
