/* =========================
   RECEPÇÃO - CALENDÁRIO COM DIAS DE ATENDIMENTO E BLOQUEIO
========================= */
let tmAppointmentCalendarCore;
(function () {
  'use strict';

  const BUTTON_ID = 'tm-recepcao-calendario-botao';
  const BUTTON_HOST_ID = 'tm-recepcao-calendario-host';
  const POPOVER_ID = 'tm-recepcao-calendario-popover';
  const STYLE_ID = 'tm-recepcao-calendario-style';
  const HIDDEN_TURNO_CLASS = 'tm-recepcao-turno-oculto';
  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const CACHE_MS = 120000;
  const METADATA_CACHE_MS = CACHE_MS;
  const RETAIN_MS = 15 * 60000;
  const BACKGROUND_REFRESH_MS = 90000;
  let automaticRefresh = false;
  let boundComponent = null;
  let detachContext = null;
  let mountedInput = null;
  let mountedContext = '';
  const state = { month: null, days: new Map(), loading: false, error: '', request: 0, context: '' };

  function isReceptionPage() {
    return window.location.hash === '#/recepcao' &&
      !!document.querySelector('input#ref-data[type="date"]');
  }

  function iso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function selectedMonth() {
    const raw = document.querySelector('#ref-data')?.value || '';
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, 1, 12) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }

  function receptionComponent() {
    let element = document.querySelector('#filtro-medico');
    while (element) {
      const component = element.__vue__;
      if (component && typeof component.$http?.post === 'function' &&
          component.unidade_operacao !== undefined) return component;
      element = element.parentElement;
    }
    return null;
  }

  function weekAnchor(date) {
    const cursor = new Date(`${date}T12:00:00`);
    cursor.setDate(cursor.getDate() - (cursor.getDay() + 6) % 7);
    return iso(cursor);
  }

  function calendarDates(month) {
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    first.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) =>
      iso(new Date(first.getFullYear(), first.getMonth(), first.getDate() + index, 12)));
  }

  function matchesUnit(agenda, unit) {
    if (!unit) return true;
    const agendaUnit = agenda?.id_unidade_operacao ??
      agenda?.local?.centro_custo?.id_unidade_operacao;
    return agendaUnit != null && String(agendaUnit) === unit;
  }

  function minutes(value) {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function blockCoversSchedule(block, appointments) {
    if (!block || [false, 0, '0'].includes(block.fl_ativo)) return false;
    const start = minutes(block.hora_inicio);
    const end = minutes(block.hora_termino);
    if (start == null || end == null) return false;
    if (start === 0 && end >= 23 * 60 + 59) return true;
    const times = appointments.map((entry) => minutes(entry.hora));
    return times.length > 0 && times.every((time) => time != null && time >= start && time <= end);
  }

  function monthKey(month, doctor, unit) {
    return doctor + '|' + unit + '|' + iso(month).slice(0, 7);
  }

  // Núcleo independente da interface. Só conserva resumos; nunca pacientes.
  function createCalendarSource({ post, busy = () => false, paused = () => false, changed = () => {}, now = Date.now }) {
    const days = new Map(), weeks = new Map(), holidays = new Map();
    const runs = new Map(), pendingDays = new Map(), pendingMetadata = new Map(), listeners = new Set();
    let activeContext = '', sequence = 0, invalidatedAt = 0, active = 0, wake = null;
    const stats = { requests: 0, queries: 0, joined: 0, cacheHits: 0 };
    const queue = [];
    const cancelled = () => Object.assign(new Error('Busca substituída.'), { cancelled: true });
    const contextKey = (doctor, unit) => String(doctor) + '|' + String(unit);
    const dayKey = (context, date) => context + '|' + date;
    function fresh(map, key) {
      const entry = map.get(key);
      if (entry && now() - entry.time < (map === days ? CACHE_MS : METADATA_CACHE_MS)) return entry.value;
      if (entry && now() - entry.time >= RETAIN_MS) map.delete(key);
      return undefined;
    }
    function retained(map, key) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (now() - entry.time < RETAIN_MS) return entry.value;
      map.delete(key);
      return undefined;
    }
    function needsDay(run, date) {
      const key = dayKey(run.context, date);
      return fresh(days, key) === undefined ||
        (run.refresh && (days.get(key)?.stamp || 0) < run.stamp);
    }
    function remember(map, key, value, stamp, limit) {
      if ((map.get(key)?.stamp || 0) > stamp) return;
      map.delete(key);
      map.set(key, { value, time: now(), stamp });
      while (map.size > limit) map.delete(map.keys().next().value);
    }
    function read(dates, doctor, unit) {
      const context = contextKey(doctor, unit), result = new Map();
      for (const date of dates) {
        const value = retained(days, dayKey(context, date));
        if (value !== undefined) result.set(date, value);
      }
      return result;
    }
    function freshCount(dates, doctor, unit) {
      const context = contextKey(doctor, unit);
      return dates.filter((date) => fresh(days, dayKey(context, date)) !== undefined).length;
    }
    function stop() {
      runs.forEach((run) => {
        run.cancelled = true;
        run.cancels.forEach((cancel) => cancel());
      });
      runs.clear();
      pendingDays.clear();
      pendingMetadata.clear();
      while (queue.length) queue.shift().reject(cancelled());
      clearTimeout(wake);
      wake = null;
      activeContext = '';
    }
    function notify(event = 'days') {
      changed(event);
      listeners.forEach((listener) => listener(event));
    }
    function promote(run, priority) {
      run.priority = Math.min(run.priority, priority);
      run.dependencies.forEach((dependency) => promote(dependency, priority));
    }
    function pump() {
      clearTimeout(wake);
      wake = null;
      queue.sort((a, b) => a.run.priority - b.run.priority);
      while (active < 2 && queue.length) {
        const job = queue[0];
        if (job.run.cancelled) { queue.shift().reject(cancelled()); continue; }
        // A seleção do médico começa imediatamente, mesmo durante a busca nativa.
        // Nessa situação e nos meses secundários usamos só uma conexão própria.
        const limit = busy(job.run.component) || job.run.priority > 0 ? 1 : 2;
        if (paused()) {
          wake = setTimeout(pump, 200);
          return;
        }
        if (active >= limit) return; // A conclusão da consulta ativa já acorda a fila.
        queue.shift();
        active++;
        Promise.resolve().then(() => {
          if (job.run.cancelled) throw cancelled();
          stats.requests++;
          stats.queries += job.q.length;
          return post(job.run.component, job.q, job.run.cancels);
        }).then((response) => {
          if (job.run.cancelled) throw cancelled();
          job.resolve(response);
        }).catch(job.reject).finally(() => { active--; pump(); });
      }
    }
    function query(run, q) {
      if (run.cancelled) return Promise.reject(cancelled());
      return new Promise((resolve, reject) => {
        queue.push({ run, q, resolve, reject });
        pump();
      });
    }
    function result(response, id) {
      const item = response?.data?.[id];
      if (item?.status !== 200 || !item.data) throw new Error('Consulta recusada: ' + id);
      return item.data;
    }
    function scheduleMap(data, unit) {
      if (!data || !data.agendas || typeof data.agendas !== 'object') {
        throw new Error('Agenda semanal incompleta.');
      }
      const map = new Map();
      Object.entries(data.agendas).forEach(([date, list]) => {
        if (!Array.isArray(list)) throw new Error('Agenda semanal inválida.');
        const matching = list.filter((agenda) => matchesUnit(agenda, unit));
        if (matching.length) map.set(date, {
          holidayAllowed: matching.some((agenda) => [true, 1, '1'].includes(agenda.fl_pode_feriado))
        });
      });
      return map;
    }
    function compact(data) {
      if (!Array.isArray(data?.agendas) || data.paginate) throw new Error('Agenda incompleta.');
      return {
        agendas: data.agendas.map((entry) => ({
          hora: entry.hora, status: entry.status,
          id_agenda: entry.id_agenda, marcacao: !!entry.marcacao
        })),
        bloqueio: data.bloqueio && {
          fl_ativo: data.bloqueio.fl_ativo,
          hora_inicio: data.bloqueio.hora_inicio, hora_termino: data.bloqueio.hora_termino
        },
        feriado: data.feriado && {
          fl_ativo: data.feriado.fl_ativo, fl_pode_agendar: data.feriado.fl_pode_agendar,
          st_descricao: data.feriado.st_descricao
        }
      };
    }
    function classify(data, schedule) {
      const appointments = data.agendas, block = data.bloqueio, holiday = data.feriado;
      const hasPatient = appointments.some((entry) => !!entry.marcacao);
      const hasFree = appointments.some((entry) => entry.status === 'livre');
      const hasRegular = appointments.some((entry) => entry.status === 'ocupado' && entry.id_agenda != null);
      const hasBlocked = appointments.some((entry) => entry.status === 'bloqueado');
      const hasBlock = !!block && ![false, 0, '0'].includes(block.fl_ativo);
      const holidayActive = !!holiday && ![false, 0, '0'].includes(holiday.fl_ativo);
      const holidayClosed = holidayActive && ![true, 1, '1'].includes(holiday.fl_pode_agendar) &&
        !schedule?.holidayAllowed;
      const usable = !holidayClosed && !blockCoversSchedule(block, appointments) && (hasFree || hasRegular);
      return {
        kind: usable ? 'attendance' : hasPatient ? 'booked' :
          holidayClosed || (!!schedule && (hasBlock || hasBlocked)) ? 'blocked' : '',
        holiday: holidayActive ? holiday.st_descricao || 'Feriado' : '',
        holidayClosed: !!holidayClosed, block: hasBlock || hasBlocked
      };
    }
    function put(run, date, data, schedule) {
      if (run.cancelled) return;
      remember(days, dayKey(run.context, date), classify(data, schedule), run.stamp, 1008);
      notify();
    }
    function holidayCandidate(date, records) {
      return records.some((holiday) => {
        if ([false, 0, '0'].includes(holiday.fl_ativo)) return false;
        const start = holiday.dt_inicio?.slice(0, 10), end = holiday.dt_termino?.slice(0, 10);
        // Um cadastro inesperado deve aumentar a conferência, não ocultar feriados.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return true;
        if (![true, 1, '1'].includes(holiday.fl_recorrente)) return date >= start && date <= end;
        const year = Number(date.slice(0, 4));
        return [year - 1, year].some((base) => {
          const first = base + start.slice(4);
          const last = (base + (end.slice(5) < start.slice(5) ? 1 : 0)) + end.slice(4);
          return date >= first && date <= last;
        });
      });
    }
    async function metadata(run, dates) {
      const anchors = [...new Set(dates.map(weekAnchor))];
      const years = [...new Set(dates.map((date) => date.slice(0, 4)))];
      const holidayKey = (year) => run.unit + '|' + year;
      const missingWeeks = anchors.filter((date) => fresh(weeks, dayKey(run.context, date)) === undefined);
      const missingYears = years.filter((year) => fresh(holidays, holidayKey(year)) === undefined);
      const flightKey = (type, key) => type + '|' + key;
      const dependencies = [];
      const ownWeeks = missingWeeks.filter((date) => {
        const flight = pendingMetadata.get(flightKey('week', dayKey(run.context, date)));
        if (flight) { promote(flight.run, run.priority); dependencies.push(flight.promise); }
        return !flight;
      });
      const ownYears = missingYears.filter((year) => {
        const flight = pendingMetadata.get(flightKey('holiday', holidayKey(year)));
        if (flight) { promote(flight.run, run.priority); dependencies.push(flight.promise); }
        return !flight;
      });
      const q = ownWeeks.map((date, i) => ({
        name: 'medicos.agenda_semanal', id: 'week' + i,
        parms: { id_medico: Number(run.doctor), data: date }
      })).concat(ownYears.map((year, i) => ({
        name: 'agenda_feriados.index', id: 'holiday' + i, parms: { ano: Number(year), cadastro: true }
      })));
      if (q.length) {
        const response = query(run, q);
        function track(key, consume) {
          const flight = { run, promise: null };
          flight.promise = response.then(consume).finally(() => {
            if (pendingMetadata.get(key) === flight) pendingMetadata.delete(key);
          });
          pendingMetadata.set(key, flight);
          dependencies.push(flight.promise);
        }
        ownWeeks.forEach((date, i) => track(flightKey('week', dayKey(run.context, date)), (value) =>
          remember(weeks, dayKey(run.context, date), scheduleMap(result(value, 'week' + i), run.unit), run.stamp, 168)));
        ownYears.forEach((year, i) => track(flightKey('holiday', holidayKey(year)), (value) => {
          const records = result(value, 'holiday' + i);
          if (!Array.isArray(records)) throw new Error('Cadastro de feriados incompleto.');
          remember(holidays, holidayKey(year), records.map((h) => ({
            dt_inicio: h.dt_inicio, dt_termino: h.dt_termino,
            fl_recorrente: h.fl_recorrente, fl_ativo: h.fl_ativo
          })), run.stamp, 12);
        }));
      }
      const outcomes = await Promise.allSettled(dependencies);
      if (run.cancelled) throw cancelled();
      const failure = outcomes.find((item) => item.status === 'rejected');
      if (failure) throw failure.reason;
      const scheduled = new Map();
      anchors.forEach((date) => {
        const week = fresh(weeks, dayKey(run.context, date));
        if (!week) throw new Error('Agenda semanal expirada.');
        week.forEach((value, key) => scheduled.set(key, value));
      });
      const records = years.flatMap((year) => {
        const value = fresh(holidays, holidayKey(year));
        if (!value) throw new Error('Cadastro de feriados expirado.');
        return value;
      });
      return { scheduled, records };
    }
    function parms(run) {
      return { medico: Number(run.doctor), unidade_operacao: run.unit,
        group: 'none', livres: 1, status: 'T', tipo_proced: 'T', na_recepcao: true };
    }
    async function daily(run, dates, scheduled) {
      const jobs = [];
      for (let start = 0; start < dates.length; start += 7) {
        const batch = dates.slice(start, start + 7).filter((date) =>
          needsDay(run, date));
        if (!batch.length) continue;
        jobs.push(query(run, batch.map((date, i) => ({
          name: 'agendas.index', id: 'day' + i, parms: { ...parms(run), data: date }
        }))).then((response) => batch.forEach((date, i) => {
          const data = result(response, 'day' + i);
          if (data.parms?.data && data.parms.data.slice(0, 10) !== date) throw new Error('Data diária inesperada.');
          put(run, date, compact(data), scheduled.get(date));
        })));
      }
      const settled = await Promise.allSettled(jobs);
      const failure = settled.find((item) => item.status === 'rejected');
      if (failure) throw failure.reason;
    }
    async function ranges(run, chunks, meta) {
      const response = await query(run, chunks.map((dates, i) => ({
        name: 'agendas.index', id: 'range' + i,
        parms: { ...parms(run), inicio: dates[0], fim: dates[dates.length - 1] }
      })));
      const { scheduled, records } = meta;
      const exceptions = [];
      chunks.forEach((dates, i) => {
        const data = result(response, 'range' + i);
        if (!Array.isArray(data.agendas) || data.paginate) throw new Error('Período incompleto.');
        if ((data.parms?.inicio && data.parms.inicio.slice(0, 10) > dates[0]) ||
            (data.parms?.fim && data.parms.fim.slice(0, 10) < dates[dates.length - 1])) {
          throw new Error('Período limitado pelo servidor.');
        }
        const grouped = new Map(dates.map((date) => [date, []]));
        data.agendas.forEach((entry) => {
          if (!grouped.has(entry.data)) throw new Error('Data inesperada no período.');
          grouped.get(entry.data).push(entry);
        });
        dates.forEach((date) => {
          if (!needsDay(run, date)) return;
          const rows = grouped.get(date), schedule = scheduled.get(date);
          const hasFree = rows.some((entry) => entry.status === 'livre');
          const hasRegular = rows.some((entry) => entry.id_agenda != null);
          // Uma divergência entre semana e período exige a confirmação diária.
          if (holidayCandidate(date, records) ||
              rows.some((entry) => entry.bloqueio || entry.status === 'bloqueado') ||
              ((!hasFree) && (schedule || hasRegular))) {
            exceptions.push(date);
          } else {
            put(run, date, compact({ agendas: rows }), schedule);
          }
        });
        // Somente a consulta própria é descartada; nunca a resposta nativa.
        grouped.clear();
        data.agendas = null;
      });
      await daily(run, exceptions, scheduled);
    }
    function ensure(dates, doctor, unit, component, { refresh = false, priority = 0 } = {}) {
      dates = [...new Set(dates)].sort();
      doctor = String(doctor || ''); unit = String(unit || '');
      if (!doctor || !component || !dates.length) return Promise.resolve(new Map());
      const context = contextKey(doctor, unit), key = context + '|' + dates.join(',');
      if (activeContext && activeContext !== context) stop();
      activeContext = context;
      if (priority === 0) runs.forEach((run) => { run.priority = 1; });
      const existing = runs.get(key);
      if (existing) {
        stats.joined++;
        promote(existing, priority);
        pump();
        return existing.promise;
      }
      const needed = dates.filter((date) => refresh || fresh(days, dayKey(context, date)) === undefined);
      stats.cacheHits += dates.length - needed.length;
      if (!needed.length) return Promise.resolve(read(dates, doctor, unit));
      const dependencies = new Set();
      const missing = needed.filter((date) => {
        const owner = pendingDays.get(dayKey(context, date));
        if (owner) { dependencies.add(owner); promote(owner, priority); stats.joined++; }
        return !owner;
      });
      const run = { key, context, doctor, unit, component, stamp: ++sequence,
        refresh, priority, dependencies, cancelled: false, cancels: new Set(), promise: null };
      runs.set(key, run);
      missing.forEach((date) => pendingDays.set(dayKey(context, date), run));
      // As datas são reservadas antes da primeira microtarefa. Abrir o popup ou
      // pedir um mês sobreposto adere à consulta existente, sem reiniciá-la.
      const own = Promise.resolve().then(async () => {
        if (run.cancelled) throw cancelled();
        if (!missing.length) return;
        // Se feriados não forem acessíveis, usa a consulta diária já autorizada.
        // As semanas continuam obrigatórias para as exceções de feriado/expediente.
        let meta;
        try {
          meta = await metadata(run, missing);
        } catch (error) {
          if (run.cancelled) throw cancelled();
          const scheduled = new Map();
          for (const anchor of new Set(missing.map(weekAnchor))) {
            const week = fresh(weeks, dayKey(context, anchor));
            if (!week) throw error;
            week.forEach((value, date) => scheduled.set(date, value));
          }
          await daily(run, missing, scheduled);
          return read(dates, doctor, unit);
        }
        // Dias previstos (inclusive lotados/bloqueados) e feriados são lidos
        // diretamente UMA vez. O período agrega somente as lacunas: evita
        // baixar o mesmo conjunto de pacientes na busca e na conferência.
        const direct = missing.filter((date) => meta.scheduled.has(date) || holidayCandidate(date, meta.records));
        const directSet = new Set(direct);
        const chunks = [];
        for (const date of missing.filter((date) => !directSet.has(date))) {
          const last = chunks[chunks.length - 1];
          const next = last && new Date(last[last.length - 1] + 'T12:00:00');
          if (next) next.setDate(next.getDate() + 1);
          if (!last || last.length >= 14 || iso(next) !== date) chunks.push([date]);
          else last.push(date);
        }
        const jobs = [daily(run, direct, meta.scheduled)];
        for (let start = 0; start < chunks.length; start += 7) {
          jobs.push(ranges(run, chunks.slice(start, start + 7), meta));
        }
        const outcomes = await Promise.allSettled(jobs);
        if (run.cancelled) throw cancelled();
        if (outcomes.some((item) => item.status === 'rejected')) {
          const scheduled = new Map();
          for (const anchor of new Set(missing.map(weekAnchor))) {
            const week = fresh(weeks, dayKey(context, anchor));
            if (!week) throw new Error('Não foi possível conferir as agendas.');
            week.forEach((value, date) => scheduled.set(date, value));
          }
          await daily(run, missing, scheduled);
        }
      });
      run.promise = Promise.allSettled([own, ...[...dependencies].map((owner) => owner.promise)])
        .then((outcomes) => {
          if (run.cancelled) throw cancelled();
          const failure = outcomes.find((item) => item.status === 'rejected');
          // Uma falha em datas de outro mês não invalida as datas já completas deste.
          if (failure && needed.some((date) => fresh(days, dayKey(context, date)) === undefined)) throw failure.reason;
          if (outcomes[0].status === 'rejected') throw outcomes[0].reason;
          return read(dates, doctor, unit);
        }).finally(() => {
          if (runs.get(key) === run) runs.delete(key);
          missing.forEach((date) => {
            const key = dayKey(context, date);
            if (pendingDays.get(key) === run) pendingDays.delete(key);
          });
        });
      return run.promise;
    }
    function invalidate(doctor, unit) {
      stop();
      invalidatedAt = ++sequence;
      const prefix = doctor == null ? '' : contextKey(doctor, unit) + '|';
      [days, weeks].forEach((map) => {
        for (const key of map.keys()) if (key.startsWith(prefix)) map.delete(key);
      });
      holidays.clear();
      notify('invalidate');
    }
    function nativeTicket() { return ++sequence; }
    function ingestNative(queries, response, stamp = nativeTicket()) {
      if (stamp < invalidatedAt) return;
      for (const q of queries) {
        if (q.name !== 'agendas.index') continue;
        const p = q.parms || {}, data = response?.[q.id]?.data;
        // Uma busca filtrada/paginada não prova ausência de pacientes no dia.
        if (response?.[q.id]?.status !== 200 || !p.na_recepcao || !p.data || !p.medico || p.group !== 'none' ||
            !p.livres || (p.status && p.status !== 'T') || (p.turno && p.turno !== 'G') ||
            (p.tipo_proced && p.tipo_proced !== 'T') || p.search || p.especialidade ||
            p.recepcao || p.id_recepcao || p.view_status || p.id_atendimento || p.id_fila_laudo ||
            p.editados || p.agora || p.te_max || p.block_view_pacotes || p.filtro_teleatend ||
            p.procedimento || p.plano || p.paciente || p.id_paciente || p.para_marcar ||
            p.confirmacao || p.detalhe || p.recursos?.length || p.id_regiao_cd ||
            p.consultorio || p.logado || p.local ||
            (p.faixa_hora && p.faixa_hora !== 'D') || p.medicos?.length || data?.paginate ||
            (data?.parms?.data && data.parms.data.slice(0, 10) !== p.data)) continue;
        try {
          const context = contextKey(p.medico, p.unidade_operacao || '');
          const weekQuery = queries.find((item) => item.name === 'medicos.agenda_semanal' &&
            String(item.parms?.id_medico) === String(p.medico) && weekAnchor(item.parms.data) === weekAnchor(p.data));
          if (weekQuery && response[weekQuery.id]?.status === 200) {
            remember(weeks, dayKey(context, weekAnchor(p.data)),
              scheduleMap(response[weekQuery.id].data, String(p.unidade_operacao || '')), stamp, 168);
          }
          const week = fresh(weeks, dayKey(context, weekAnchor(p.data)));
          if (!week) continue;
          const value = classify(compact(data), week.get(p.data));
          remember(days, dayKey(context, p.data), value, stamp, 1008);
          notify();
        } catch (_) { /* Resposta nativa desconhecida: conserva a busca independente. */ }
      }
    }
    return { read, freshCount, ensure, stop, invalidate, ingestNative, nativeTicket, classify, holidayCandidate,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      diagnostics: () => ({ ...stats, active, queued: queue.length, cachedDays: days.size, running: runs.size }) };
  }

  // Uma única fila e um único cache para as duas telas. Nenhum dado de paciente é persistido.
  const source = createCalendarSource({
    busy: (component) => !!component?.$store?.state?.loading,
    paused: () => document.hidden,
    post: (component, q, cancels) => {
      const axios = component.axios || component.$http;
      const token = axios.CancelToken?.source();
      // O interceptor global do Klingo mostra qualquer mensagem de erro,
      // exceto "#BC#", usado pelo próprio sistema ao substituir uma busca.
      // Cancelar só a nossa requisição, sem modificar/silenciar erros globais.
      const cancel = () => token?.cancel('#BC#');
      cancels.add(cancel);
      return component.$http.post('aql?a=agendas.index&page=1', { q, modulo: 4 }, {
        tmAppointmentCalendar: true, timeout: 20000,
        ...(token ? { cancelToken: token.token } : {})
      }).finally(() => cancels.delete(cancel));
    }
  });

  let nativeClient = null, detachNative = null, account = null;
  function prepare(component) {
    if (!component) return;
    const nextAccount = String(component.$store?.state?.user?.id_usuario || '');
    if (account !== null && nextAccount !== account) source.invalidate();
    account = nextAccount;
    const client = component.axios || component.$http;
    if (client === nativeClient) return;
    detachNative?.();
    nativeClient = client;
    const interceptors = client?.interceptors;
    if (!interceptors?.request || !interceptors?.response) return;
    const requestId = interceptors.request.use((config) => {
      if (!config.tmAppointmentCalendar) config.tmCalendarNativeTicket = source.nativeTicket();
      return config;
    });
    const responseId = interceptors.response.use((response) => {
      try {
        if (response.config?.tmAppointmentCalendar) return response;
        const body = typeof response.config?.data === 'string'
          ? JSON.parse(response.config.data) : response.config?.data;
        if (!Array.isArray(body?.q)) return response;
        const mutated = body.q.some((q) =>
          /^(agendas|marcacoes|bloqueios|agenda_feriados|cadastro_agendas|agenda_grupos|agenda_grupo_datas|reserva_horarios)\./.test(q.name) &&
          !/\.(index|show|stats|agenda_semanal|horarios|verificar_horarios_agenda|get_doc_pre_atends|campos_customizados)$/.test(q.name) &&
          response.data?.[q.id]?.status >= 200 && response.data?.[q.id]?.status < 300);
        if (mutated) source.invalidate();
        if (Number.isFinite(response.config?.tmCalendarNativeTicket)) {
          source.ingestNative(body.q, response.data, response.config.tmCalendarNativeTicket);
        }
      } catch (_) { /* Nunca interfere no retorno/erro da requisição nativa. */ }
      return response;
    });
    detachNative = () => {
      interceptors.request.eject(requestId);
      interceptors.response.eject(responseId);
    };
  }

  // O mês solicitado começa agora; vizinhos usam uma única conexão e nunca
  // cancelam o mês que o usuário abriu. Reabrir aproveita promessas e dias já prontos.
  function createCalendarPreloader({ source, active, context, onError = () => {} }) {
    let key = '', generation = 0, timer = null, neighborTimer = null, pending = null;
    function stop() {
      generation++;
      clearTimeout(timer);
      clearTimeout(neighborTimer);
      timer = null;
      neighborTimer = null;
      key = '';
      pending = null;
    }
    function sync({ force = false, refresh = false } = {}) {
      if (!active()) return Promise.resolve();
      const current = context();
      if (!current?.component) return Promise.resolve();
      const { month, doctor, unit, component } = current;
      if (!doctor) { stop(); source.stop(); return Promise.resolve(); }
      const nextKey = monthKey(month, doctor, unit);
      if (!force && key === nextKey && pending) return pending;
      key = nextKey;
      const ticket = ++generation;
      clearTimeout(timer);
      clearTimeout(neighborTimer);
      const valid = () => ticket === generation && active();
      const armRefresh = (failed) => {
        if (!valid()) return;
        timer = setTimeout(() => {
          timer = null;
          sync({ force: true, refresh: true });
        }, failed ? 15000 : BACKGROUND_REFRESH_MS);
      };
      pending = source.ensure(calendarDates(month), doctor, unit, component, { refresh, priority: 0 });
      pending.then(() => {
        armRefresh(false);
        if (refresh) return;
        // O mês visível fica pronto primeiro. Só o próximo mês é preparado
        // quando a interface fica ociosa; os demais são consultados ao navegar.
        neighborTimer = setTimeout(() => {
          neighborTimer = null;
          if (!valid()) return;
          const adjacent = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12);
          source.ensure(calendarDates(adjacent), doctor, unit, component, { priority: 1 })
            .catch((error) => { if (valid() && !error.cancelled) onError(error); });
        }, 2000);
      }, (error) => {
        if (!valid()) return;
        armRefresh(true);
        if (!error.cancelled) onError(error);
      });
      return pending;
    }
    source.subscribe((event) => {
      if (event === 'invalidate' && active()) {
        stop();
        // Não reentra no interceptor nem na limpeza do cache.
        Promise.resolve().then(() => sync());
      }
    });
    return { sync, stop };
  }

  tmAppointmentCalendarCore = { source, prepare, createCalendarSource, createCalendarPreloader, calendarDates, iso, monthNames };
  const supportedRoute = () => ['#/recepcao', '#/call-center/confirmacao'].includes(window.location.hash);
  window.addEventListener('hashchange', () => { if (!supportedRoute()) source.stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) source.stop(); });

  let paintFrame = null;
  source.subscribe(() => {
      if (!document.getElementById(POPOVER_ID) || paintFrame != null) return;
      paintFrame = requestAnimationFrame(() => {
        paintFrame = null;
        const component = receptionComponent();
        const doctor = document.querySelector('#filtro-medico')?.value || '';
        const unit = String(component?.unidade_operacao || '');
        if (!state.month || state.context !== doctor + '|' + unit) return;
        state.days = source.read(calendarDates(state.month), doctor, unit);
        if (state.days.size === 42 && source.freshCount(calendarDates(state.month), doctor, unit) === 42) state.loading = false;
        paintDays();
      });
  });

  function bindNative(component) {
    prepare(component);
    if (component === boundComponent) return;
    detachContext?.();
    detachContext = null;
    boundComponent = component;
    // Fallback para alterações programáticas do Vue; a seleção manual usa o evento direto.
    if (typeof component?.$watch === 'function') {
      detachContext = component.$watch(() =>
        `${component.medico || ''}|${component.unidade_operacao || ''}|${String(component.referencia || '').slice(0, 7)}`,
      () => {
        component.$nextTick(() => {
          if (boundComponent !== component || !isReceptionPage() || document.hidden) return;
          if (document.getElementById(POPOVER_ID)) loadMonth();
          else prefetchSelectedMonth();
        });
      });
    }
  }

  const preloader = createCalendarPreloader({
    source,
    active: () => isReceptionPage() && !document.hidden,
    context: () => {
      const component = receptionComponent();
      prepare(component);
      return {
        component, doctor: document.querySelector('#filtro-medico')?.value || '',
        unit: String(component?.unidade_operacao || ''),
        month: document.getElementById(POPOVER_ID) && state.month ? state.month : selectedMonth()
      };
    },
    onError: (error) => console.warn('[TM] Pré-busca do calendário:', error.message)
  });

  function prefetchSelectedMonth(force = false, refresh = false) {
    return preloader.sync({ force, refresh });
  }

  async function loadMonth() {
    if (document.hidden || !isReceptionPage()) return;
    const doctor = document.querySelector('#filtro-medico')?.value || '';
    const component = receptionComponent();
    prepare(component);
    const unit = String(component?.unidade_operacao || '');
    const dates = calendarDates(state.month), request = ++state.request;
    state.context = doctor + '|' + unit;
    state.days = source.read(dates, doctor, unit);
    state.error = '';
    state.loading = !!doctor && source.freshCount(dates, doctor, unit) !== dates.length;
    render();
    if (!doctor || !component) { preloader.sync(); state.loading = false; paintDays(); return; }
    try {
      const days = await prefetchSelectedMonth(true);
      if (request === state.request && days) state.days = days;
    } catch (error) {
      if (request === state.request && !error.cancelled) {
        state.error = 'Algumas datas não puderam ser verificadas. Reabra para tentar novamente.';
        console.warn('[TM] Calendário:', error.message);
      }
    } finally {
      if (request === state.request) { state.loading = false; paintDays(); }
    }
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #ref-data::-webkit-calendar-picker-indicator { opacity: 0; pointer-events: none; }
      .${HIDDEN_TURNO_CLASS} { display: none !important; }
      #${BUTTON_ID} { height: 100%; min-width: 42px; border-radius: 0 .25rem .25rem 0; }
      #${POPOVER_ID} { position: fixed; z-index: 1080; width: 322px; max-width: calc(100vw - 16px);
        background: #fff; color: #344054; border: 1px solid #cbd5e1; border-radius: 8px;
        box-shadow: 0 10px 28px rgba(16, 24, 40, .22); padding: 12px; font-size: 13px; }
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
      #${POPOVER_ID} .tm-cal-footer { display: flex; align-items: center;
        justify-content: flex-start; gap: 10px; margin-top: 10px; }
      #${POPOVER_ID} .tm-cal-footer button { border: 0; background: transparent;
        color: #007bff; padding: 3px 5px; font-size: 13px; margin-left: auto; }
      #${POPOVER_ID} .tm-cal-footer button:hover { text-decoration: underline; }
      #${POPOVER_ID} .tm-cal-status { color: #667085; font-size: 13px; }
    `;
    document.head.appendChild(style);
  }

  function positionPopover() {
    const popover = document.getElementById(POPOVER_ID);
    const input = document.querySelector('#ref-data');
    if (!popover || !input) return;
    const rect = input.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8));
    const below = rect.bottom + 6;
    const top = below + popover.offsetHeight <= window.innerHeight - 8
      ? below : Math.max(8, rect.top - popover.offsetHeight - 6);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function render() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover || !state.month) return;
    popover.replaceChildren();

    const header = document.createElement('div');
    header.className = 'tm-cal-header';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'tm-cal-nav';
    previous.dataset.action = 'previous';
    previous.setAttribute('aria-label', 'Mês anterior');
    previous.textContent = '‹';
    const title = document.createElement('strong');
    title.textContent = `${monthNames[state.month.getMonth()]} de ${state.month.getFullYear()}`;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'tm-cal-nav';
    next.dataset.action = 'next';
    next.setAttribute('aria-label', 'Próximo mês');
    next.textContent = '›';
    header.append(previous, title, next);
    popover.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'tm-cal-grid';
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((label) => {
      const weekday = document.createElement('div');
      weekday.className = 'tm-cal-weekday';
      weekday.textContent = label;
      grid.appendChild(weekday);
    });
    const selected = document.querySelector('#ref-data')?.value;
    const todayIso = iso(new Date());
    for (const dateKey of calendarDates(state.month)) {
      const detail = state.days.get(dateKey);
      const day = document.createElement('button');
      day.type = 'button';
      day.className = 'tm-cal-day';
      day.dataset.date = dateKey;
      day.dataset.kind = detail?.kind || '';
      day.dataset.today = String(dateKey === todayIso);
      if (dateKey === todayIso) day.setAttribute('aria-current', 'date');
      day.dataset.selected = String(dateKey === selected);
      day.dataset.outside = String(Number(dateKey.slice(5, 7)) !== state.month.getMonth() + 1);
      day.textContent = String(Number(dateKey.slice(8, 10)));
      grid.appendChild(day);
    }
    popover.appendChild(grid);

    const footer = document.createElement('div');
    footer.className = 'tm-cal-footer';
    const message = document.createElement('span');
    message.className = 'tm-cal-status';
    footer.appendChild(message);
    const today = document.createElement('button');
    today.type = 'button';
    today.dataset.action = 'today';
    today.textContent = 'Hoje';
    footer.appendChild(today);
    popover.appendChild(footer);
    paintDays();
    positionPopover();
  }

  function dayTitle(detail) {
    if (!detail) return state.loading ? 'Data ainda em consulta' : 'Data não verificada';
    return detail.kind === 'booked' && detail.holidayClosed
        ? `Paciente marcado no feriado: ${detail.holiday}`
        : detail?.kind === 'booked' && detail?.block
        ? 'Paciente marcado apesar do bloqueio da agenda'
        : detail?.kind === 'booked'
        ? 'Paciente marcado sem horários regulares disponíveis nesta data'
        : detail?.kind === 'blocked' && detail?.holidayClosed
        ? `Feriado: ${detail.holiday}`
        : detail?.kind === 'blocked' ? 'Agenda bloqueada nesta data'
        : detail?.kind === 'attendance' && detail?.holiday
        ? `Atendimento permitido no feriado: ${detail.holiday}`
        : detail?.kind === 'attendance' && detail?.block
        ? 'Médico atende nesta data (bloqueio parcial)'
        : detail?.kind === 'attendance' ? 'Médico atende nesta data'
        : 'Sem agenda identificada nesta unidade';
  }

  function paintDays() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    popover.querySelectorAll('button[data-date]').forEach((day) => {
      const detail = state.days.get(day.dataset.date), kind = detail?.kind || '';
      if (day.dataset.kind !== kind) day.dataset.kind = kind;
      const title = dayTitle(detail);
      if (detail && (detail.kind === 'blocked' || detail.block || detail.holiday)) {
        if (day.title !== title) day.title = title;
      } else day.removeAttribute('title');
      day.setAttribute('aria-label', day.dataset.date + ': ' + title);
    });
    const message = popover.querySelector('.tm-cal-status');
    const status = state.loading ? 'Buscando...' : state.error;
    if (message && message.textContent !== status) message.textContent = status;
    popover.setAttribute('aria-busy', String(state.loading));
  }

  function selectDate(date) {
    const input = document.querySelector('input#ref-data[type="date"]');
    if (!input) return;
    input.value = date;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const component = receptionComponent();
    if (component) component.referencia = date;
    closeCalendar();
    // Atualização nativa necessária para mostrar a data, não uma invalidação
    // do mês. O interceptor aproveitará a resposta quando ela for completa.
    if (date) {
      automaticRefresh = true;
      try { document.querySelector('#refresh-button')?.click(); }
      finally { automaticRefresh = false; }
    }
  }

  function closeCalendar() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    state.request += 1;
    popover.remove();
    prefetchSelectedMonth(true);
  }

  function openCalendar() {
    if (document.getElementById(POPOVER_ID)) {
      closeCalendar();
      return;
    }
    state.month = selectedMonth();
    const popover = document.createElement('div');
    popover.id = POPOVER_ID;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Calendário de atendimentos');
    popover.addEventListener('click', (event) => {
      // render() substitui a seta clicada; sem isto, o clique chega ao documento
      // com alvo já desconectado e é interpretado como clique fora do calendário.
      event.stopPropagation();
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest('button[data-action]')?.dataset.action;
      if (action === 'today') return selectDate(iso(new Date()));
      if (action === 'previous' || action === 'next') {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() +
          (action === 'next' ? 1 : -1), 1, 12);
        loadMonth();
        return;
      }
      const date = event.target.closest('button[data-date]')?.dataset.date;
      if (date) selectDate(date);
    });
    document.body.appendChild(popover);
    loadMonth();
  }

  function ensureCalendar() {
    if (window.location.hash !== '#/recepcao') {
      preloader.stop();
      if (boundComponent || mountedInput) {
        detachContext?.();
        detachContext = null;
        boundComponent = null;
        mountedInput = null;
        mountedContext = '';
      }
      closeCalendar();
      document.getElementById(BUTTON_HOST_ID)?.remove();
      document.querySelectorAll(`.${HIDDEN_TURNO_CLASS}`).forEach((element) =>
        element.classList.remove(HIDDEN_TURNO_CLASS));
      document.getElementById(STYLE_ID)?.remove();
      return;
    }
    const input = document.querySelector('input#ref-data[type="date"]');
    const group = input?.closest('.input-group.mb-1');
    if (!group) return;
    const component = receptionComponent();
    const context = monthKey(selectedMonth(), document.querySelector('#filtro-medico')?.value || '',
      String(component?.unidade_operacao || ''));
    if (mountedInput === input && mountedContext === context &&
        boundComponent === component && document.getElementById(BUTTON_ID)?.isConnected) return;
    mountedInput = input;
    mountedContext = context;
    bindNative(component);
    injectStyle();
    const turno = input.nextElementSibling;
    if (turno?.classList.contains('input-group-append') &&
        turno.querySelector('button.dropdown-toggle') &&
        !turno.classList.contains(HIDDEN_TURNO_CLASS)) {
      turno.classList.add(HIDDEN_TURNO_CLASS);
    }
    if (component && component.turno !== 'G') {
      component.turno = 'G';
      automaticRefresh = true;
      try { document.querySelector('#refresh-button')?.click(); }
      finally { automaticRefresh = false; }
    }
    let host = document.getElementById(BUTTON_HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = BUTTON_HOST_ID;
      host.className = 'input-group-append';
    }
    let button = document.getElementById(BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.className = 'btn btn-outline-secondary';
      button.innerHTML = '<i class="fas fa-calendar-alt" aria-hidden="true"></i>';
      button.setAttribute('aria-label', 'Abrir calendário de atendimentos');
      button.title = 'Calendário de atendimentos';
      button.addEventListener('pointerenter', () => prefetchSelectedMonth(true));
      button.addEventListener('focus', () => prefetchSelectedMonth(true));
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openCalendar();
      });
    }
    if (button.parentElement !== host) host.appendChild(button);
    if (host.parentElement !== group) group.appendChild(host);
    if (document.getElementById(POPOVER_ID) &&
        state.context !== `${document.querySelector('#filtro-medico')?.value || ''}|${String(component?.unidade_operacao || '')}`) {
      loadMonth();
    }
    if (!document.getElementById(POPOVER_ID)) prefetchSelectedMonth();
  }

  document.addEventListener('click', (event) => {
    if (!document.getElementById(POPOVER_ID)) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(`#${POPOVER_ID}, #${BUTTON_ID}`)) return;
    closeCalendar();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCalendar();
  });
  const onReceptionFilter = (event) => {
    if (!isReceptionPage()) return;
    if (event.target?.id === 'filtro-medico') {
      if (document.getElementById(POPOVER_ID)) loadMonth();
      else prefetchSelectedMonth();
    }
  };
  document.addEventListener('input', onReceptionFilter, true);
  document.addEventListener('change', onReceptionFilter, true);
  document.addEventListener('click', (event) => {
    if (!automaticRefresh && isReceptionPage() && event.target instanceof Element && event.target.closest('#refresh-button')) {
      const component = receptionComponent();
      source.invalidate(document.querySelector('#filtro-medico')?.value || '', String(component?.unidade_operacao || ''));
    }
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      preloader.stop();
    } else if (isReceptionPage()) {
      if (document.getElementById(POPOVER_ID)) loadMonth();
      else prefetchSelectedMonth(true);
    }
  });
  window.addEventListener('resize', positionPopover);
  window.addEventListener('scroll', positionPopover, true);
  tmRuntime.register('calendário de atendimentos da Recepção', ensureCalendar, ['#/recepcao']);
})();
