/* =========================
   CALL CENTER - SINALIZADORES POR DATA
========================= */
(function () {
  'use strict';
  const CLASS = 'tm-callcenter-day-flags', STYLE = CLASS + '-style';
  const TTL = 120000, RETRY = 15000, LIMIT = 120;
  const cache = new Map(), hosts = new Set();
  let session = '', activeKey = '', generation = 0, running = false, cancel = null;
  let client = null, interceptor = null;

  function component() {
    if (window.location.hash !== '#/call-center') return null;
    for (let el = document.getElementById('listaPacientesModal'); el; el = el.parentElement) {
      const vue = el.__vue__;
      if (vue?.$refs?.listaPac && typeof vue.listaPacientes === 'function') return vue;
    }
    return null;
  }

  // Espelha listaPacientes -> listaPac.abrir. Não usa os filtros da Recepção
  // nem amplia o conjunto de profissionais/unidades da consulta nativa.
  function queryContext(page) {
    const modal = page.$refs.listaPac;
    if (page.$store?.state?.user?.id_plano) return null; // mesma restrição nativa
    const doctors = (page.medicos || []).filter((_, i) => page.medicosSelecionados[i]);
    if (!doctors.length) return null;
    const procedures = page.procedimentos || [], selected = procedures.filter((p) => p.selected);
    let doctor = doctors.length === 1 ? doctors[0].id_pessoa : null;
    if (!doctor && procedures.length === 1 && procedures[0].medico) doctor = procedures[0].medico.id_pessoa;
    const parms = { medico: doctor, group: 'none', livres: true,
      medicos: doctors.map((d) => d.id_pessoa), confirmacao: true, detalhe: !!modal.listaproc,
      id_paciente: modal.id_paciente, cc: modal.cc, infusao: modal.infusao,
      block_filtro_regiao: modal.block_filtro_regiao };
    if (modal.listaproc && ((page.tem_medico_unico && page.marcacao_unico_profissional) || selected.length === 1)) {
      const p = selected[0];
      if (p?.procedimento) {
        parms.procedimento = p.procedimento.id_procedimento;
        parms.plano = p.plano?.id_plano;
        parms.recursos = p.procedimento_equipamentos;
        if (p.regiao_cd && p.unidade_operacao) {
          parms.id_regiao_cd = p.regiao_cd.id_regiao_cd;
          parms.unidade_operacao = p.unidade_operacao.id_unidade_operacao;
        }
      }
    } else if (modal.listaproc && selected.length) {
      const resources = new Map();
      selected.forEach((p) => (p.procedimento_equipamentos || []).forEach((r) => {
        if (!resources.has(r.id_equipamento)) resources.set(r.id_equipamento, r);
      }));
      parms.recursos = [...resources.values()];
    }
    parms.confirmacao = !parms.procedimento;
    return JSON.parse(JSON.stringify(parms));
  }

  function bookableUnits(page) {
    const byDate = new Map();
    for (const slot of Array.isArray(page.horarios) ? page.horarios : []) {
      if (slot?.status !== 'livre' || slot.bloqueado || slot.restricao) continue;
      const date = String(slot.data || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const unitId = slot.id_unidade_operacao ?? slot.unidade_operacao?.id_unidade_operacao;
      if (unitId == null) {
        byDate.set(date, null); // sem unidade, não atribuir sinalizadores por suposição
      } else if (byDate.get(date) !== null) {
        const doctorId = slot.medico?.id_pessoa ?? slot.id_medico;
        const agendaId = slot.id_agenda ?? slot.agenda?.id_agenda;
        if (doctorId == null && agendaId == null) continue;
        if (!byDate.has(date)) byDate.set(date, new Map());
        const units = byDate.get(date), id = String(unitId);
        if (!units.has(id)) units.set(id, { doctors: new Set(), agendas: new Set() });
        if (doctorId != null) units.get(id).doctors.add(String(doctorId));
        if (agendaId != null) units.get(id).agendas.add(String(agendaId));
      }
    }
    return byDate;
  }

  function availableKey(units) {
    return units ? [...units].map(([unit, ids]) => [unit,
      [...ids.doctors].sort(), [...ids.agendas].sort()]).sort((a, b) => a[0].localeCompare(b[0])) : null;
  }

  function summarize(data, date, context, availableUnits) {
    if (!Array.isArray(data?.agendas) || data.paginate ||
        (data.parms?.data && data.parms.data.slice(0, 10) !== date)) throw new Error('Resposta incompleta');
    const doctors = new Set(context.medicos.map(String)), seen = new Set(), groups = new Map(), units = new Set();
    for (const row of data.agendas) {
      if (row.data && row.data.slice(0, 10) !== date) throw new Error('Data inesperada');
      const mark = row.marcacao;
      if (row.status === 'passado' ||
          (!doctors.has(String(row.medico?.id_pessoa)) && !doctors.has(String(mark?.id_medico)))) continue;
      const unit = mark?.unidade_operacao || row.unidade_operacao;
      const unitId = mark?.id_unidade_operacao ?? row.id_unidade_operacao ?? unit?.id_unidade_operacao;
      const available = unitId == null ? null : availableUnits.get(String(unitId));
      if (!available) continue;
      const agendaId = mark?.id_agenda ?? row.id_agenda ?? row.agenda?.id_agenda;
      const doctorId = mark?.id_medico ?? row.medico?.id_pessoa;
      if (agendaId != null && available.agendas.size) {
        if (!available.agendas.has(String(agendaId))) continue;
      } else if (doctorId == null || !available.doctors.has(String(doctorId))) continue;
      units.add(String(unitId));
      if (!mark) continue;
      const flag = mark.sinalizador_atendimento;
      if (!flag) {
        if (mark.id_sinalizador_atendimento) throw new Error('Sinalizador incompleto');
        continue;
      }
      if (!mark.id_marcacao || !flag.id_sinalizador_atendimento || !flag.st_icon) throw new Error('Sinalizador incompleto');
      if (seen.has(String(mark.id_marcacao))) continue;
      seen.add(String(mark.id_marcacao));
      const id = String(unitId), flagId = String(flag.id_sinalizador_atendimento);
      if (!groups.has(id)) groups.set(id, { id, name: unit?.st_sigla || unit?.st_nome || unit?.search || 'Unidade ' + id, flags: new Map() });
      const group = groups.get(id);
      if (!group.flags.has(flagId)) group.flags.set(flagId, {
        id: flagId, label: flag.st_sinalizador_atendimento || flag.search || 'Sinalizador',
        icon: String(flag.st_icon).split(/\s+/).filter((s) => /^fa[a-z0-9-]*$/.test(s)).join(' '),
        color: /^(primary|secondary|success|danger|warning|info|dark|muted)$/.test(flag.st_cor) ? flag.st_cor : 'primary',
        order: Number(flag.in_regra_ordem) || 0, count: 0
      });
      const item = group.flags.get(flagId);
      if (!item.icon) throw new Error('Ícone não identificado');
      item.count++;
    }
    // Somente totais e catálogo visual ficam no cache; nenhum paciente/marcação.
    return { multipleUnits: units.size > 1, groups: [...groups.values()].map((g) => ({ id: g.id, name: g.name,
      flags: [...g.flags.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    })).sort((a, b) => a.name.localeCompare(b.name)) };
  }

  function bindings(page) {
    const dates = Object.keys(page.exibicao || {}).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    const byLabel = new Map();
    dates.forEach((d) => {
      const label = d.slice(8, 10) + '/' + d.slice(5, 7);
      byLabel.set(label, byLabel.has(label) ? null : d); // não confundir anos diferentes
    });
    return [...page.$el.querySelectorAll('li.list-group-item > .row > .col-md-2')].flatMap((box) => {
      const link = box.querySelector('h4 a.card-link');
      const date = link && byLabel.get(link.textContent.trim());
      return date ? [{ box, date }] : [];
    });
  }

  function stop() {
    generation++;
    cancel?.(); cancel = null;
    activeKey = '';
  }

  function listen(page) {
    const next = page.axios || page.$http;
    if (next === client) return;
    if (interceptor != null) client?.interceptors?.response?.eject(interceptor);
    client = next;
    interceptor = client?.interceptors?.response?.use((response) => {
      try {
        if (response.config?.tmDayFlags) return response;
        const body = typeof response.config?.data === 'string' ? JSON.parse(response.config.data) : response.config?.data;
        if (body?.q?.some((q) => /^(marcacoes|agendas|sinalizadores_atendimento)\./.test(q.name) &&
            !/\.(index|show|stats|horarios|verificar_horarios_agenda|campos_customizados|get_doc_pre_atends)$/.test(q.name) &&
            response.data?.[q.id]?.status >= 200 && response.data?.[q.id]?.status < 300)) {
          stop(); cache.clear(); tmRuntime.schedule(0);
        }
      } catch (_) { /* Não modifica respostas nem erros nativos. */ }
      return response;
    });
  }

  function paint(items, contextKey, availableByDate) {
    if (!document.getElementById(STYLE)) {
      const style = document.createElement('style'); style.id = STYLE;
      style.textContent = `.${CLASS}{font:inherit;font-size:12px;line-height:1.5;text-align:center;max-width:100%;cursor:default}
        .${CLASS} .tm-day-flags-line{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:4px 8px}
        .${CLASS} .tm-day-flag{display:inline-flex;gap:3px;align-items:center;white-space:nowrap}
        .${CLASS} .tm-day-flags-unit{font-size:10px;color:#6c757d}
        .${CLASS} .tm-day-flags-pending{color:#6c757d;font-size:11px}
        .bg-primary .${CLASS} .tm-day-flags-unit{color:inherit}`;
      document.head.appendChild(style);
    }
    for (const { box, date } of items) {
      let host = box.querySelector('.' + CLASS);
      if (!host) { host = document.createElement('div'); host.className = CLASS; box.appendChild(host); hosts.add(host); }
      const entry = cache.get(contextKey + '|' + date);
      const available = availableByDate.get(date);
      const signature = JSON.stringify([contextKey, availableKey(available),
        entry ? [entry.value, entry.error, entry.time] : 'loading']);
      if (host.dataset.signature === signature) continue;
      host.dataset.signature = signature;
      host.replaceChildren();
      host.setAttribute('aria-live', 'polite');
      host.setAttribute('aria-busy', String(!!available?.size && !entry));
      if (!available?.size) {
        const status = document.createElement('span');
        status.className = 'tm-day-flags-pending';
        status.textContent = '?';
        status.title = 'Não foi possível identificar a unidade da vaga disponível.';
        status.setAttribute('aria-label', status.title); host.appendChild(status);
        continue;
      }
      if (!entry || entry.error) {
        const status = document.createElement('span');
        status.className = 'tm-day-flags-pending';
        status.textContent = entry?.error ? '!' : '…';
        status.title = entry?.error ? 'Não foi possível consultar os sinalizadores. Nova tentativa automática.' : 'Consultando sinalizadores';
        status.setAttribute('aria-label', status.title); host.appendChild(status);
        continue;
      }
      for (const group of entry.value.groups) {
        const line = document.createElement('div'); line.className = 'tm-day-flags-line';
        const label = document.createElement('span'); label.className = 'tm-day-flags-unit';
        label.textContent = group.name.match(/^\(([^)]+)\)/)?.[1] || group.name;
        line.appendChild(label);
        for (const flag of group.flags) {
          const item = document.createElement('span'); item.className = 'tm-day-flag text-' + flag.color;
          item.title = `${group.name}: ${flag.label} — ${flag.count}`;
          item.setAttribute('aria-label', item.title);
          const icon = document.createElement('i'); icon.className = flag.icon; icon.setAttribute('aria-hidden', 'true');
          const count = document.createElement('span'); count.textContent = String(flag.count);
          item.append(icon, count); line.appendChild(item);
        }
        host.appendChild(line);
      }
    }
    for (const host of hosts) if (!host.isConnected) hosts.delete(host);
  }

  async function run(page, context, key, items, availableByDate) {
    if (running) return;
    const pending = items.filter(({ date }) => {
      if (!availableByDate.get(date)?.size) return false;
      const entry = cache.get(key + '|' + date);
      return !entry || Date.now() - entry.time >= (entry.error ? RETRY : TTL);
    });
    if (!pending.length) return;
    running = true;
    const ticket = generation;
    try {
      // Uma requisição por vez, até três datas por lote. Nunca abre modais,
      // troca filtros, aciona loading global ou impede a busca de horários.
      for (let i = 0; i < pending.length; i += 3) {
        if (ticket !== generation || document.hidden || window.location.hash !== '#/call-center') break;
        const batch = pending.slice(i, i + 3);
        const token = (page.axios || page.$http)?.CancelToken?.source();
        cancel = () => token?.cancel('#BC#');
        try {
          const response = await (page.axios || page.$http).post('/aql?a=listapaciente', {
            q: batch.map(({ date }, n) => ({ name: 'agendas.index', id: 'flags' + n, parms: { ...context, data: date } }))
          }, { tmDayFlags: true, timeout: 20000, ...(token ? { cancelToken: token.token } : {}) });
          if (ticket !== generation) break;
          batch.forEach(({ date }, n) => {
            let entry;
            try {
              const result = response.data?.['flags' + n];
              if (result?.status !== 200) throw new Error('Consulta recusada');
              entry = { value: summarize(result.data, date, context, availableByDate.get(date)), time: Date.now() };
            } catch (_) { entry = { error: true, time: Date.now() }; }
            cache.delete(key + '|' + date); cache.set(key + '|' + date, entry);
          });
        } catch (_) {
          if (ticket !== generation) break;
          batch.forEach(({ date }) => cache.set(key + '|' + date, { error: true, time: Date.now() }));
        } finally { cancel = null; }
        while (cache.size > LIMIT) cache.delete(cache.keys().next().value);
        if (ticket === generation) paint(items, key, availableByDate);
      }
    } finally {
      running = false;
      if (ticket !== generation) tmRuntime.schedule(0);
    }
  }

  function sync() {
    const page = component();
    if (!page || document.hidden) {
      if (activeKey) stop();
      if (!page) { hosts.forEach((h) => h.remove()); hosts.clear(); }
      return;
    }
    const user = String(page.$store?.state?.user?.id_usuario || '');
    if (session !== user) { stop(); cache.clear(); session = user; }
    listen(page);
    const context = queryContext(page), items = bindings(page);
    if (!context || !items.length) {
      if (activeKey) stop();
      hosts.forEach((h) => h.remove()); hosts.clear();
      return;
    }
    const availableByDate = bookableUnits(page);
    const key = JSON.stringify([context, items.map(({ date }) =>
      [date, availableKey(availableByDate.get(date))])]);
    const workKey = key + '|' + items.map((item) => item.date).join(',');
    if (activeKey !== workKey) { stop(); activeKey = workKey; }
    paint(items, key, availableByDate);
    run(page, context, key, items, availableByDate);
  }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('hashchange', sync);
  tmRuntime.register('sinalizadores por data no Call Center', sync, ['#/call-center']);
})();
