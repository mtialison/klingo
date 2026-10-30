/* AUTORIZAÇÕES — opção combinada de status, sem alterar os status de edição. */
(function () {
  'use strict';
  const COMBINED_STATUS = 'tm-open-sent';

  async function fetchCombinedStatusPage(axios, filters, cancelToken) {
    const compare = combinedComparator(filters);
    if (!compare) return fetchAllStatusesPage(axios, filters, cancelToken);
    const size = Math.max(1, Math.trunc(Number(filters.size) || 100));
    const request = async jobs => {
      cancelToken?.throwIfRequested?.();
      const response = await axios.post('/aql?a=solicitacao_autorizacoes.index', {
        q: jobs.map(job => ({ name: 'solicitacao_autorizacoes.index', id: job.id,
          parms: { ...filters, status: job.status, page: job.page, size },
          configs: ['solic-aut-block-incluir-agenda-direto'] }))
      }, { cancelToken, tmFeature: 'authorization-combined-status' });
      const payload = response.data;
      const results = jobs.map(job => {
        const result = payload?.[job.id], page = result?.data;
        if (result?.status !== 200 || !Array.isArray(page?.data) ||
            !Number.isFinite(Number(page.total)) || Number(page.total) < page.data.length ||
            page.data.some(row => String(row.in_status) !== job.status)) {
          throw new Error('Não foi possível consultar as autorizações por status.');
        }
        return { ...job, data: page.data, meta: page };
      });
      return { results, configs: payload.configs_lista || payload.configs_sent };
    };
    const first = await request([{ id: 'lista', status: '0', page: 1 }, { id: 'sent', status: '6', page: 1 }]);
    const total = first.results.reduce((sum, part) => sum + Number(part.meta.total), 0);
    const current = Math.min(Math.max(1, Math.ceil(total / size)), Math.max(1, Math.trunc(Number(filters.page) || 1)));
    const parts = first.results.map(part => ({ ...part, pages: [part.data] }));
    const jobs = [];
    parts.forEach((part, stream) => {
      const last = Math.min(current, Math.max(1, Math.ceil(Number(part.meta.total) / size)));
      for (let page = 2; page <= last; page++) jobs.push({ id: `status_${part.status}_${page}`, status: part.status, page, stream });
    });
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const batch = jobs.slice(next, next += 2);
        const response = await request(batch);
        response.results.forEach(part => { parts[part.stream].pages[part.page - 1] = part.data; });
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, Math.ceil(jobs.length / 2)) }, worker));
    while (true) {
      const streams = parts.map(part => part.pages.flat());
      // Validar cada sequência: linhas de um status não compensam um prefixo incompleto do outro.
      // A API pode ordenar empates arbitrariamente; validar apenas sua chave primária.
      if (streams.some((rows, index) => rows.length !== Math.min(Number(parts[index].meta.total), parts[index].pages.length * size) ||
          rows.some((row, i) => i && compare.primary(rows[i - 1], row) > 0))) {
        return fetchAllStatusesPage(axios, filters, cancelToken);
      }
      const rows = streams.flat();
      const ids = rows.map(row => String(row.id_solicitacao_autorizacao));
      if (new Set(ids).size !== ids.length) return fetchAllStatusesPage(axios, filters, cancelToken);
      rows.sort(compare);
      const boundary = rows[Math.min(total, current * size) - 1];
      const extensions = parts.flatMap((part, stream) => {
        const records = streams[stream];
        return boundary && records.length < Number(part.meta.total) &&
          compare.primary(records[records.length - 1], boundary) <= 0
          ? [{ id: `status_${part.status}_${part.pages.length + 1}`, status: part.status,
            page: part.pages.length + 1, stream }] : [];
      });
      if (!extensions.length) {
        return { configs: first.configs, page: combinedPagination(rows, total, filters, first.results[0].meta) };
      }
      // Fechar empates na fronteira evita perder IDs menores em páginas ainda não consultadas.
      const extra = await request(extensions);
      if (extra.results.some(part => Number(part.meta.total) !== Number(parts[part.stream].meta.total))) {
        return fetchAllStatusesPage(axios, filters, cancelToken);
      }
      extra.results.forEach(part => { parts[part.stream].pages[part.page - 1] = part.data; });
    }
  }

  function combinedComparator(filters) {
    const type = filters.tipo_ordem || '';
    const direction = filters.ordem_dir === 'D' ? -1 : 1;
    let primary;
    if (type === 'NS') primary = (a, b) => direction * (Number(a.id_solicitacao_autorizacao) - Number(b.id_solicitacao_autorizacao));
    else if (type === 'PC') {
      const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
      const name = row => row.paciente?.st_nome || row.cadastro_temporario?.st_nome || '';
      primary = (a, b) => direction * collator.compare(name(a), name(b));
    } else {
      let value, multiplier = direction;
      if (type === 'DS') value = row => row.dt_solicitacao || '';
      else if (!type && filters.ref_data === 'G') {
        value = row => row.marcacao?.dt_inicio || '';
        multiplier = 1; // O modo Padrão ignora ordem_dir na API nativa.
      } else return null;
      primary = (a, b) => multiplier * (value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0);
    }
    const compare = (a, b) => primary(a, b) || Number(a.id_solicitacao_autorizacao) - Number(b.id_solicitacao_autorizacao);
    compare.primary = primary;
    return compare;
  }

  function combinedPagination(rows, total, filters, first) {
    const size = Math.max(1, Math.trunc(Number(filters.size) || 100));
    const last = Math.max(1, Math.ceil(total / size));
    const current = Math.min(last, Math.max(1, Math.trunc(Number(filters.page) || 1)));
    const from = (current - 1) * size;
    const url = page => page ? `${first.path || ''}?page=${page}` : null;
    return { ...first, data: rows.slice(from, from + size), total, per_page: size,
      current_page: current, last_page: last,
      from: total ? from + 1 : null, to: total ? Math.min(from + size, total) : null,
      first_page_url: url(1), last_page_url: url(last),
      prev_page_url: url(current > 1 ? current - 1 : null), next_page_url: url(current < last ? current + 1 : null),
      links: [{ url: url(current > 1 ? current - 1 : null), label: '&laquo; Previous', active: false },
        ...Array.from({ length: last }, (_, i) => ({ url: url(i + 1), label: String(i + 1), active: current === i + 1 })),
        { url: url(current < last ? current + 1 : null), label: 'Next &raquo;', active: false }] };
  }

  async function fetchAllStatusesPage(axios, filters, cancelToken) {
    const size = Number(filters.size) || 100;
    const request = async (page) => {
      cancelToken?.throwIfRequested?.();
      const response = await axios.post('/aql?a=solicitacao_autorizacoes.index', {
        q: [{ name: 'solicitacao_autorizacoes.index', id: 'lista',
          parms: { ...filters, status: '', page, size },
          configs: ['solic-aut-block-incluir-agenda-direto'] }]
      }, { cancelToken, tmFeature: 'authorization-combined-status' });
      const payload = response.data;
      if (payload?.lista?.status !== 200 || !Array.isArray(payload.lista.data?.data)) {
        throw new Error('Não foi possível consultar as autorizações.');
      }
      return { page: payload.lista.data, configs: payload.configs_lista };
    };
    const first = await request(1);
    const pages = [first.page.data];
    const count = Math.max(1, Number(first.page.last_page) || 1);
    let next = 2;
    const worker = async () => {
      while (next <= count) {
        const page = next++;
        pages[page - 1] = (await request(page)).page.data;
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, count - 1) }, worker));
    // Ler todas as páginas antes de filtrar preserva a ordenação do servidor.
    const rows = pages.flat().filter(row => ['0', '6'].includes(String(row.in_status)));
    return { configs: first.configs, page: combinedPagination(rows, rows.length, filters, first.page) };
  }

  function hookAuthorizationLoad(vue) {
    if (vue.load.__tmCombinedStatus) return;
    const original = vue.load;
    let sequence = 0;
    const wrapped = function (page = null) {
      const run = ++sequence;
      if (this.filtros.status !== COMBINED_STATUS) return original.apply(this, arguments);
      if (this.montando) return;
      this.canceltoken?.cancel('#BC#');
      if (page) this.page = page;
      this.canceltoken = this.axios.CancelToken.source();
      this.$util.setCookie('sol-aut-fila', this.filtros.id_fila_autorizacao);
      this.ja_buscou = true;
      this.$store.commit('loading', true);
      return fetchCombinedStatusPage(this.axios, { ...this.filtros, pacotes: true,
        page: this.page, size: 100 }, this.canceltoken.token).then(result => {
        if (run !== sequence || this._isDestroyed || this.filtros.status !== COMBINED_STATUS) return;
        if (result.configs) this.$store.commit('setContexto', result.configs);
        this.block_incluir_direto = !!this.$store.state.contexto['solic-aut-block-incluir-agenda-direto'];
        this.page = result.page.current_page;
        this.dados = result.page;
        this.options_classes = [...new Set(result.page.data.flatMap(row => row.js_classes || []))].sort();
      }).catch(error => {
        if (run !== sequence || this.axios.isCancel?.(error)) return;
        console.error('[TM] Falha no filtro Aberto + Enviado', error);
        window.alert('Não foi possível carregar Aberto + Enviado. Atualize a listagem para tentar novamente.');
      }).finally(() => {
        if (run === sequence) this.$store.commit('loading', false);
      });
    };
    wrapped.__tmCombinedStatus = true;
    vue.load = wrapped;
  }

  function ensureCombinedStatus() {
    const active = document.querySelector('.nav-pills .nav-link.active');
    if (active?.textContent.trim() !== 'Autorizações') return;
    const card = document.getElementById('refresh-button')?.closest('.card');
    const select = Array.from(card?.querySelectorAll('select') || []).find(select => {
      const labels = Array.from(select.options, option => option.textContent.trim());
      return labels.includes('Todos os Status Ativos...') && labels.includes('Aberto') && labels.includes('Enviado');
    });
    if (!select) return;
    let vue = null;
    for (let node = select; node; node = node.parentElement) {
      if (node.__vue__?.filtros && typeof node.__vue__.load === 'function') {
        vue = node.__vue__;
        break;
      }
    }
    if (!vue) return;
    hookAuthorizationLoad(vue);
    if (!Array.from(select.options).some(option => option.value === COMBINED_STATUS)) {
      const open = Array.from(select.options).find(option => option.value === '0');
      if (!open) return;
      const option = document.createElement('option');
      option.value = COMBINED_STATUS;
      option.textContent = 'Aberto + Enviado';
      select.insertBefore(option, open);
    }
    // O Vue pode remontar o select após outro filtro mudar.
    if (vue.filtros.status === COMBINED_STATUS && select.value !== COMBINED_STATUS) {
      select.value = COMBINED_STATUS;
    }
  }

  tmRuntime.register('autorizações Aberto + Enviado', ensureCombinedStatus, ['#/autorizacoes']);
})();
