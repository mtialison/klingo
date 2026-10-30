const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const marker = script.indexOf('RECEPÇÃO - CALENDÁRIO COM DIAS');
const start = script.indexOf("  const BUTTON_ID =", marker);
const end = script.indexOf('  // Uma única fila e um único cache', start);
assert.ok(marker > 0 && end > start);
const scope = { setTimeout, clearTimeout, console };
vm.runInNewContext(script.slice(start, end) + '\nthis.api = { createCalendarSource, calendarDates, weekAnchor };', scope);
const { createCalendarSource, calendarDates, weekAnchor } = scope.api;
const dates = Array.from(calendarDates(new Date(2026, 9, 1, 12)));
const delay = () => new Promise((resolve) => setImmediate(resolve));
const empty = () => ({ agendas: [], bloqueio: null, feriado: null });
const slot = (status, regular = true) => ({ hora: '08:00', status,
  ...(regular ? { id_agenda: 42 } : {}), marcacao: status === 'ocupado' });

function fixture({ data = {}, schedules = {}, records = [], onRequest, busy, paused, failHoliday = false,
  failDaily = false, failRange = false } = {}) {
  let time = 1000, active = 0, peak = 0, painted = 0;
  const calls = [];
  const source = createCalendarSource({
    now: () => time, busy, paused, changed: () => painted++,
    post: async (_component, q, cancels) => {
      calls.push(q); active++; peak = Math.max(peak, active);
      try {
        await onRequest?.(q, cancels);
        await delay();
        return { data: Object.fromEntries(q.map((query) => {
          const p = query.parms;
          if (query.name === 'agenda_feriados.index') return [query.id,
            { status: failHoliday ? 403 : 200, data: records }];
          if (query.name === 'medicos.agenda_semanal') {
            const agendas = {};
            for (let day = 0; day < 7; day++) {
              const date = new Date(p.data + 'T12:00:00'); date.setDate(date.getDate() + day);
              const key = date.toISOString().slice(0, 10);
              if (schedules[key]) agendas[key] = schedules[key];
            }
            return [query.id, { status: 200, data: { agendas } }];
          }
          if (p.data) return [query.id, { status: failDaily ? 500 : 200, data: data[p.data] || empty() }];
          const agendas = Object.entries(data).filter(([date]) => date >= p.inicio && date <= p.fim)
            .flatMap(([date, item]) => item.agendas.map((row) => ({ ...row, data: date })));
          return [query.id, { status: failRange ? 500 : 200, data: { agendas } }];
        })) };
      } finally { active--; }
    }
  });
  return { source, calls, peak: () => peak, painted: () => painted,
    advance: (ms) => { time += ms; }, total: () => calls.reduce((n, q) => n + q.length, 0) };
}

test('busca fria agrupa períodos, limita concorrência a 2 e cacheia inclusive dias neutros', async () => {
  const f = fixture();
  const first = f.source.ensure(dates, 19, '5', {});
  assert.equal(f.source.ensure(dates, 19, '5', {}), first, 'pré-busca e abertura compartilham a promessa');
  const result = await first;
  assert.equal(result.size, 42);
  assert.equal(f.total(), 11, '7 semanas + feriados + 3 períodos de 14 dias');
  assert.ok(f.peak() <= 2);
  assert.ok([...result.values()].every((value) => value.kind === ''));
  assert.equal(f.painted(), 42);
  await f.source.ensure(dates, 19, '5', {});
  assert.equal(f.total(), 11, 'reabrir não consulta novamente');
});

test('meses vizinhos reaproveitam datas e semanas; unidades nunca compartilham cores', async () => {
  const f = fixture();
  await f.source.ensure(dates, 19, '5', {});
  const count = f.calls.length;
  const november = Array.from(calendarDates(new Date(2026, 10, 1, 12)));
  await f.source.ensure(november, 19, '5', {});
  const ranges = f.calls.slice(count).flat().filter((q) => q.parms.inicio);
  assert.ok(ranges.every((q) => q.parms.inicio > '2026-11-07'));
  assert.equal(f.source.read(november, 19, '6').size, 0);
});

test('feriado, bloqueio total/parcial, lotação e paciente fora de agenda preservam as cores', async () => {
  const block = { fl_ativo: true, hora_inicio: '00:00', hora_termino: '23:59' };
  const schedule = [{ id_unidade_operacao: 6, fl_pode_feriado: false }];
  const f = fixture({
    schedules: { '2026-10-07': schedule, '2026-10-08': schedule, '2026-10-13': schedule,
      '2026-10-14': schedule, '2026-10-15': schedule, '2026-10-16': schedule },
    records: [{ dt_inicio: '2000-10-12', dt_termino: '2000-10-12', fl_recorrente: true, fl_ativo: true }],
    data: {
      '2026-10-06': { agendas: [slot('ocupado', false)] },
      '2026-10-07': { agendas: [slot('bloqueado'), slot('ocupado')], bloqueio: block },
      '2026-10-08': { agendas: [slot('bloqueado')], bloqueio: block },
      '2026-10-12': { agendas: [], feriado: { fl_ativo: true, st_descricao: 'Feriado' } },
      '2026-10-13': { agendas: [slot('ocupado')] },
      '2026-10-14': { agendas: [slot('livre'), { ...slot('bloqueado'), hora: '14:00' }],
        bloqueio: { fl_ativo: true, hora_inicio: '13:00', hora_termino: '15:00' } },
      '2026-10-15': empty(),
      '2026-10-16': { agendas: [slot('ocupado')], bloqueio: block }
    }
  });
  const result = await f.source.ensure(dates, 19, '6', {});
  for (const [date, kind] of Object.entries({ '2026-10-06': 'booked', '2026-10-07': 'booked',
    '2026-10-08': 'blocked', '2026-10-12': 'blocked', '2026-10-13': 'attendance',
    '2026-10-14': 'attendance', '2026-10-15': '', '2026-10-16': 'booked' })) {
    assert.equal(result.get(date).kind, kind, date);
  }
  const daily = f.calls.flat().filter((q) => q.parms.data && q.name === 'agendas.index');
  assert.equal(daily.length, 7);
  const ranges = f.calls.flat().filter((q) => q.parms.inicio);
  assert.ok(daily.every((q) => ranges.every((range) =>
    q.parms.data < range.parms.inicio || q.parms.data > range.parms.fim)),
  'não baixa novamente os pacientes dos dias já lidos diretamente');
  assert.equal(f.peak(), 2);
  assert.ok(f.total() < 49);
});

test('feriado permitido e feriado com paciente têm regras próprias', () => {
  const { source } = fixture();
  const feriado = { fl_ativo: true, fl_pode_agendar: false, st_descricao: 'Feriado' };
  assert.equal(source.classify({ agendas: [slot('livre')], feriado }, { holidayAllowed: true }).kind, 'attendance');
  assert.equal(source.classify({ agendas: [slot('ocupado')], feriado }, {}).kind, 'booked');
  assert.equal(source.holidayCandidate('2027-01-01', [{ fl_recorrente: true,
    dt_inicio: '2000-12-31', dt_termino: '2001-01-02' }]), true);
  assert.equal(source.holidayCandidate('2026-02-17', [{ fl_recorrente: false,
    dt_inicio: '2026-02-14 00:00:00', dt_termino: '2026-02-18 18:00:00' }]), true);
});

test('sem permissão de feriados ou período, fallback diário continua correto', async () => {
  for (const flags of [{ failHoliday: true }, { failRange: true }]) {
    const f = fixture(flags);
    const result = await f.source.ensure(dates, 19, '5', {});
    assert.equal(result.size, 42);
    assert.equal(f.calls.flat().filter((q) => q.name === 'agendas.index' && q.parms.data).length, 42);
    assert.ok(f.peak() <= 2);
  }
});

test('falha em exceção não vira dia neutro; cores já confirmadas sobrevivem', async () => {
  const f = fixture({ failDaily: true,
    schedules: { '2026-10-07': [{ id_unidade_operacao: 5 }] } });
  await assert.rejects(f.source.ensure(dates, 19, '5', {}));
  const result = f.source.read(dates, 19, '5');
  assert.equal(result.size, 41);
  assert.equal(result.has('2026-10-07'), false);
});

test('mês já pintado permanece visível durante a revalidação e expira após 15 minutos', async () => {
  const f = fixture();
  await f.source.ensure(dates, 19, '5', {});
  const november = Array.from(calendarDates(new Date(2026, 10, 1, 12)));
  await f.source.ensure(november, 19, '5', {});
  f.advance(120001);
  assert.equal(f.source.read(dates, 19, '5').size, 42);
  assert.equal(f.source.freshCount(dates, 19, '5'), 0);
  await f.source.ensure(dates, 19, '5', {});
  assert.equal(f.source.read(dates, 19, '5').size, 42);
  f.source.invalidate(19, '5');
  assert.equal(f.source.read(dates, 19, '5').size, 0);
  await f.source.ensure(dates, 19, '5', {});
  f.advance(15 * 60000 + 1);
  assert.equal(f.source.read(dates, 19, '5').size, 0);
});

test('renovação antecipada mantém cache válido e atualiza cores antes de expirar', async () => {
  const data = {};
  const f = fixture({ data });
  await f.source.ensure(dates, 19, '5', {});
  const count = f.total();
  f.advance(45000);
  data['2026-10-06'] = { agendas: [slot('ocupado', false)] };
  const pending = f.source.ensure(dates, 19, '5', {}, { refresh: true });
  assert.equal(f.source.read(dates, 19, '5').size, 42);
  assert.equal(f.source.ensure(dates, 19, '5', {}), pending);
  const result = await pending;
  assert.ok(f.total() > count);
  assert.equal(result.get('2026-10-06').kind, 'booked');
  assert.ok(f.peak() <= 2);
});

test('mudança rápida de contexto descarta fila e ignora respostas antigas', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const f = fixture({ onRequest: () => gate });
  const old = f.source.ensure(dates, 19, '5', {}).catch((error) => error);
  await delay();
  const latest = f.source.ensure(dates, 20, '6', {});
  release();
  const error = await old;
  assert.equal(error.cancelled, true);
  await latest;
  assert.equal(f.source.read(dates, 19, '5').size, 0);
  assert.equal(f.source.read(dates, 20, '6').size, 42);
  assert.ok(f.peak() <= 2);
});

test('começa durante o carregamento nativo, mas usa somente uma conexão', async () => {
  const f = fixture({ busy: () => true });
  const pending = f.source.ensure(dates, 19, '5', {});
  await delay();
  assert.ok(f.calls.length > 0);
  await pending;
  assert.equal(f.peak(), 1);
});

test('resposta nativa completa é reaproveitada e filtros restritivos são rejeitados', async () => {
  const f = fixture();
  const q = [{ name: 'agendas.index', id: 'lista', parms: { data: '2026-10-14', medico: 19,
    unidade_operacao: '5', group: 'none', livres: 1, status: 'T', turno: 'G', na_recepcao: true } },
  { name: 'medicos.agenda_semanal', id: 'hormedico', parms: { id_medico: 19, data: '2026-10-14' } }];
  const response = { lista: { status: 200, data: { agendas: [slot('livre')] } },
    hormedico: { status: 200, data: { agendas: { '2026-10-14': [{ id_unidade_operacao: 5 }] } } } };
  f.source.ingestNative(q, response);
  assert.equal(f.source.read(['2026-10-14'], 19, '5').get('2026-10-14').kind, 'attendance');
  await f.source.ensure(dates, 19, '5', {});
  assert.ok(f.calls.flat().filter((x) => x.parms.inicio)
    .every((x) => x.parms.fim < '2026-10-14' || x.parms.inicio > '2026-10-14'));
  for (const restrictive of [{ search: 'nome' }, { recepcao: 1 }, { status: 'B' },
    { livres: 0 }, { especialidade: 3 }, { turno: 'M' }, { view_status: 'RP' },
    { na_recepcao: false }, { procedimento: 12 }, { plano: 42 }, { confirmacao: true }]) {
    const other = fixture();
    other.source.ingestNative([{ ...q[0], parms: { ...q[0].parms, ...restrictive } }, q[1]], response);
    assert.equal(other.source.read(['2026-10-14'], 19, '5').size, 0);
  }
});

test('resposta nativa recente prevalece sobre uma busca anterior em trânsito', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const f = fixture({ onRequest: () => gate });
  const pending = f.source.ensure(dates, 19, '5', {});
  await delay();
  f.source.ingestNative([
    { name: 'agendas.index', id: 'lista', parms: { data: '2026-10-14', medico: 19,
      unidade_operacao: '5', group: 'none', livres: 1, na_recepcao: true } },
    { name: 'medicos.agenda_semanal', id: 'week', parms: { id_medico: 19, data: '2026-10-14' } }
  ], { lista: { status: 200, data: { agendas: [slot('ocupado', false)] } },
    week: { status: 200, data: { agendas: {} } } });
  release();
  const result = await pending;
  assert.equal(result.get('2026-10-14').kind, 'booked');
});

function uiFixture() {
  const handlers = {}, timers = new Map(), timerDelays = new Map(), elements = new Map();
  let contextChanged, watcherDetached = false;
  let nextTimer = 1, posts = 0, redraws = 0, refreshes = 0, nativeHook, ejections = 0;
  class Element {
    constructor(tag = 'div') {
      this.tag = tag; this.children = []; this.dataset = {}; this.style = {};
      this.textContent = ''; this.title = ''; this.attributes = {};
      this.classList = { contains: () => false, add() {}, remove() {} };
    }
    set id(value) { this._id = value; elements.set(value, this); }
    get id() { return this._id; }
    get isConnected() { return !!this.parentElement; }
    appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
    append(...children) { children.forEach((child) => this.appendChild(child)); }
    replaceChildren() { redraws++; this.children.forEach((child) => { child.parentElement = null; }); this.children = []; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; if (name === 'title') this.title = ''; }
    getBoundingClientRect() { return { left: 10, top: 20, bottom: 50 }; }
    get offsetHeight() { return 320; }
    get offsetWidth() { return 322; }
    addEventListener() {}
    dispatchEvent() {}
    remove() { elements.delete(this.id); this.parentElement = null; }
    closest(selector) { return selector === '#refresh-button' && this.id === 'refresh-button' ? this : null; }
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [
        ...(selector === 'button[data-date]' && child.dataset.date ? [child] : []),
        ...child.querySelectorAll(selector)
      ]);
    }
    querySelector(selector) {
      if (selector === '.tm-cal-status' && this.className === 'tm-cal-status') return this;
      for (const child of this.children) { const value = child.querySelector(selector); if (value) return value; }
      return null;
    }
  }
  const body = new Element(), head = new Element(), group = new Element();
  const input = new Element('input'); input.id = 'ref-data'; input.value = '2026-10-14';
  input.closest = () => group; group.appendChild(input); body.appendChild(group);
  const doctor = new Element('select'); doctor.id = 'filtro-medico'; doctor.value = '19';
  const refresh = new Element('button'); refresh.id = 'refresh-button';
  refresh.click = () => { refreshes++; handlers.click?.forEach((fn) => fn({ target: refresh })); };
  const http = { post: async (_url, payload) => {
    posts++;
    return { data: Object.fromEntries(payload.q.map((q) => [q.id, { status: 200, data:
      q.name === 'medicos.agenda_semanal' ? { agendas: {} } :
        q.name === 'agenda_feriados.index' ? [] : { agendas: [] } }])) };
  }, interceptors: { request: { use: () => 2, eject() {} }, response: { use: (fn) => { nativeHook = fn; return 1; },
    eject: () => { nativeHook = null; ejections++; } } } };
  const component = { medico: 19, referencia: '2026-10-14', unidade_operacao: '5', turno: 'G', $http: http, axios: http,
    $watch: (_getter, callback) => { contextChanged = callback; return () => { watcherDetached = true; }; },
    $nextTick: (callback) => callback(),
    $store: { state: { loading: false } } };
  doctor.__vue__ = component;
  const document = { body, head, hidden: false,
    querySelector: (selector) => selector.includes('ref-data') ? input :
      selector === '#filtro-medico' ? doctor : selector === '#refresh-button' ? refresh : null,
    querySelectorAll: () => [], getElementById: (id) => elements.get(id),
    createElement: (tag) => new Element(tag),
    addEventListener: (event, fn) => { (handlers[event] ||= []).push(fn); }
  };
  const context = { document, Element, Event: class {}, console, window: {
    location: { hash: '#/recepcao' }, innerWidth: 1300, innerHeight: 800, addEventListener() {}
  }, setTimeout: (fn, ms) => { const id = nextTimer++; timers.set(id, fn); timerDelays.set(id, ms); return id; },
  clearTimeout: (id) => timers.delete(id), requestAnimationFrame: () => 1,
  tmRuntime: { register() {} } };
  const finish = script.indexOf('\n})();', end);
  vm.runInNewContext(script.slice(start, finish) +
    '\nthis.ui = { source, state, selectDate, ensureCalendar, openCalendar, closeCalendar, paintDays, loadMonth, bindNative, preloader, prefetchSelectedMonth };', context);
  return { ...context, context, input, doctor, component, timers, handlers,
    contextChanged: () => contextChanged(), watcherDetached: () => watcherDetached,
    runTimer: (ms) => {
      const entry = [...timers].find(([id]) => timerDelays.get(id) === ms);
      assert.ok(entry, `timer de ${ms}ms agendado`);
      timers.delete(entry[0]); entry[1]();
    },
    posts: () => posts, redraws: () => redraws, refreshes: () => refreshes,
    nativeHook: () => nativeHook, ejections: () => ejections };
}

test('meses sobrepostos em trânsito não duplicam datas nem metadados', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const f = fixture({ onRequest: () => gate });
  const november = Array.from(calendarDates(new Date(2026, 10, 1, 12)));
  const october = f.source.ensure(dates, 19, '5', {}, { priority: 1 });
  await delay();
  const next = f.source.ensure(november, 19, '5', {});
  assert.equal(f.source.ensure(november, 19, '5', {}), next);
  release();
  assert.equal((await october).size, 42);
  assert.equal((await next).size, 42);
  const weeks = f.calls.flat().filter((q) => q.name === 'medicos.agenda_semanal');
  assert.equal(new Set(weeks.map((q) => q.parms.data)).size, weeks.length);
  assert.equal(f.calls.flat().filter((q) => q.name === 'agenda_feriados.index').length, 1);
  const counts = new Map();
  for (const q of f.calls.flat().filter((q) => q.parms.inicio)) {
    const date = new Date(q.parms.inicio + 'T12:00:00');
    while (date.toISOString().slice(0, 10) <= q.parms.fim) {
      const key = date.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
      date.setDate(date.getDate() + 1);
    }
  }
  assert.equal(counts.size, new Set([...dates, ...november]).size);
  assert.ok([...counts.values()].every((n) => n === 1));
  assert.ok(f.peak() <= 2);
});

test('aba oculta pausa as consultas e stop cancela a fila sem perder cache', async () => {
  let hidden = false;
  const f = fixture({ paused: () => hidden });
  await f.source.ensure(dates, 19, '5', {});
  hidden = true;
  const count = f.calls.length;
  const pending = f.source.ensure(calendarDates(new Date(2026, 10, 1)), 19, '5', {}).catch((e) => e);
  await delay();
  assert.equal(f.calls.length, count);
  f.source.stop();
  assert.equal((await pending).cancelled, true);
  assert.equal(f.source.read(dates, 19, '5').size, 42);
});

test('mês aberto ultrapassa meses secundários na fila sem cancelar seus resultados', async () => {
  const gates = [];
  let hold = true;
  const schedules = Object.fromEntries(dates.map((date) => [date, [{ id_unidade_operacao: 5 }]]));
  const f = fixture({ schedules, busy: () => true,
    onRequest: (q) => hold ? new Promise((resolve) => gates.push({ q, resolve })) : undefined });
  const background = f.source.ensure(dates, 19, '5', {}, { priority: 1 });
  await delay();
  gates.shift().resolve(); // libera metadados do mês secundário
  await delay(); await delay();
  assert.ok(gates[0].q[0].id.startsWith('day'));
  const foreground = f.source.ensure(calendarDates(new Date(2027, 1, 1)), 19, '5', {});
  gates.shift().resolve(); // uma consulta ativa não é interrompida
  await delay(); await delay();
  assert.equal(gates[0].q[0].name, 'medicos.agenda_semanal');
  assert.ok(gates[0].q[0].parms.data.startsWith('2027'));
  hold = false;
  gates.shift().resolve();
  assert.equal((await foreground).size, 42);
  assert.equal((await background).size, 42);
  assert.equal(f.peak(), 1);
});

test('Recepção inicia pelo filtro sem clique, temporizador ou espera pelo carregamento nativo', async () => {
  const f = uiFixture();
  f.component.$store.state.loading = true;
  f.handlers.input.forEach((fn) => fn({ target: f.doctor }));
  await delay();
  assert.ok(f.posts() > 0);
  assert.equal(f.document.getElementById('tm-recepcao-calendario-popover'), undefined);
  assert.equal(f.ui.source.read(dates, 19, '5').size, 42);
  f.ui.preloader.stop();
  f.ui.source.stop();
});

test('carrega o mês selecionado imediatamente e prepara apenas o próximo mês em repouso', async () => {
  const f = uiFixture(), requested = [];
  const ensure = f.ui.source.ensure;
  f.ui.source.ensure = (...args) => {
    requested.push({ month: args[0][15].slice(0, 7), priority: args[4]?.priority });
    return ensure(...args);
  };
  await f.ui.prefetchSelectedMonth();
  await delay();
  assert.deepEqual(requested.map((x) => x.month), ['2026-10']);
  f.runTimer(2000);
  await delay();
  assert.deepEqual(requested.map((x) => x.month), ['2026-10', '2026-11']);
  assert.deepEqual(requested.map((x) => x.priority), [0, 1]);
  const count = f.posts();
  f.ui.openCalendar();
  assert.equal(f.ui.state.days.size, 42, 'cores disponíveis antes de qualquer resposta nova');
  assert.equal(f.ui.state.loading, false);
  await delay();
  assert.equal(f.posts(), count);
  f.ui.preloader.stop();
});

test('falha na pré-busca agenda nova tentativa, sem precisar abrir o calendário', async () => {
  const f = uiFixture();
  const post = f.component.$http.post;
  f.component.$http.post = async () => { throw new Error('indisponível'); };
  await f.ui.prefetchSelectedMonth().catch(() => {});
  f.component.$http.post = post;
  f.runTimer(15000);
  await delay();
  assert.equal(f.ui.source.read(dates, 19, '5').size, 42);
  f.ui.preloader.stop();
});

test('renovação automática mantém calendário fechado pronto e sem médico não busca', async () => {
  const f = uiFixture();
  f.doctor.value = '';
  await f.ui.prefetchSelectedMonth();
  await delay();
  assert.equal(f.posts(), 0);
  f.doctor.value = '19';
  await f.ui.prefetchSelectedMonth();
  await delay();
  const count = f.posts();
  f.runTimer(90000);
  await delay();
  assert.ok(f.posts() > count);
  assert.equal(f.ui.source.read(dates, 19, '5').size, 42);
  f.ui.preloader.stop();
});

test('alteração nativa invalida e recarrega; sessão diferente não herda cores', async () => {
  const f = uiFixture();
  f.ui.bindNative(f.component);
  await f.ui.prefetchSelectedMonth();
  await delay();
  const before = f.posts();
  f.nativeHook()({ config: { data: { q: [{ name: 'marcacoes.store', id: 'save' }] } },
    data: { save: { status: 200 } } });
  assert.equal(f.ui.source.read(dates, 19, '5').size, 0);
  await delay();
  assert.ok(f.posts() > before);
  assert.equal(f.ui.source.read(dates, 19, '5').size, 42);
  f.component.$store.state.user = { id_usuario: 77 };
  f.ui.bindNative(f.component);
  assert.equal(f.ui.source.read(dates, 19, '5').size, 0);
  await delay();
  f.ui.preloader.stop();
});

function mountConfirmation(f) {
  f.window.location.hash = '#/call-center/confirmacao';
  f.ui.ensureCalendar();
  const startInput = new f.Element('input'), endInput = new f.Element('input');
  startInput.value = '2026-10-14'; endInput.value = '2026-10-20';
  const unitSelect = { value: '5', options: [{ textContent: 'Unidades...' }] };
  const doctorSelect = { value: '19', options: [{ textContent: 'Todos os Médicos...' }] };
  const toolbar = { querySelectorAll: (selector) => selector === 'select'
    ? [unitSelect, doctorSelect] : [startInput, endInput] };
  const refresh = { __vue__: f.component, closest: (selector) => selector === '.card.dashcard'
    ? toolbar : { querySelector: () => startInput } };
  f.document.querySelector = (selector) => selector === '#refresh-button' ? refresh : null;
  f.document.dispatchEvent = (event) => f.handlers[event.type]?.forEach((fn) => fn(event));
  f.context.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
  const adapterStart = script.indexOf('const tmConfirmationCalendarAdapter = (() => {');
  const calendarStart = script.indexOf('CALL CENTER / CONFIRMAÇÃO - CALENDÁRIO DE ATENDIMENTOS', adapterStart);
  const bodyStart = script.indexOf("  'use strict';", calendarStart);
  const bodyEnd = script.indexOf('\n})();', bodyStart);
  vm.runInContext(script.slice(adapterStart, script.lastIndexOf('/* ===', calendarStart)), f.context);
  vm.runInContext('(function () {\n' + script.slice(bodyStart, bodyEnd) +
    '\nthis.confirm = { source, state, preload, openCalendar, loadMonth, stopWork }; }).call(this);', f.context);
  return { ...f.context.confirm, startInput, endInput, doctorSelect };
}

test('Confirmação inicia diretamente no input do médico e reutiliza o cache da Recepção', async () => {
  const f = uiFixture();
  await f.ui.prefetchSelectedMonth();
  await delay();
  const before = f.posts(), c = mountConfirmation(f);
  assert.equal(c.source, f.ui.source);
  f.handlers.input.forEach((fn) => fn({ target: c.doctorSelect }));
  await delay();
  assert.equal(f.posts(), before, 'trocar módulo não repete as consultas do mesmo contexto');
  c.doctorSelect.value = '20';
  f.handlers.input.forEach((fn) => fn({ target: c.doctorSelect }));
  await delay();
  assert.ok(f.posts() > before, 'novo médico consultado com o calendário fechado');
  assert.equal(c.source.read(dates, 20, '5').size, 42);
  c.openCalendar(c.startInput);
  assert.equal(c.state.days.size, 42);
  c.stopWork(); c.source.stop();
  await delay();
});

test('data final não pinta nem consulta seu mês; médico ainda inicia pré-busca com ela aberta', async () => {
  const f = uiFixture(), c = mountConfirmation(f);
  c.endInput.value = '2030-02-20';
  c.openCalendar(c.endInput);
  await delay();
  assert.equal(f.posts(), 0);
  assert.equal(c.state.days.size, 0);
  c.doctorSelect.value = '20';
  f.handlers.change.forEach((fn) => fn({ target: c.doctorSelect }));
  await delay();
  assert.ok(f.posts() > 0);
  assert.equal(c.source.read(dates, 20, '5').size, 42);
  assert.equal(c.source.read(calendarDates(new Date(2030, 1, 1)), 20, '5').size, 0);
  assert.equal(c.state.days.size, 0);
  c.stopWork();
});
