/* AUTORIZAÇÕES — opção combinada de status, sem alterar os status de edição. */
(function () {
  'use strict';
  const COMBINED_STATUS = 'tm-open-sent';

  async function fetchCombinedStatusPage(axios, filters, cancelToken) {
    const size = Number(filters.size) || 100;
    const request = async (page) => {
      const response = await axios.post('/aql?a=solicitacao_autorizacoes.index', {
        q: [{ name: 'solicitacao_autorizacoes.index', id: 'lista',
          parms: { ...filters, status: '', page, size },
          configs: ['solic-aut-block-incluir-agenda-direto'] }]
      }, { cancelToken });
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
    const total = rows.length;
    const last = Math.max(1, Math.ceil(total / size));
    const current = Math.min(last, Math.max(1, Number(filters.page) || 1));
    const from = (current - 1) * size;
    const url = page => page ? `${first.page.path || ''}?page=${page}` : null;
    return { configs: first.configs, page: { ...first.page,
      data: rows.slice(from, from + size), total, per_page: size,
      current_page: current, last_page: last,
      from: total ? from + 1 : null, to: total ? Math.min(from + size, total) : null,
      first_page_url: url(1), last_page_url: url(last),
      prev_page_url: url(current > 1 ? current - 1 : null),
      next_page_url: url(current < last ? current + 1 : null),
      links: [ { url: url(current > 1 ? current - 1 : null), label: '&laquo; Previous', active: false },
        ...Array.from({ length: last }, (_, i) => ({ url: url(i + 1), label: String(i + 1), active: current === i + 1 })),
        { url: url(current < last ? current + 1 : null), label: 'Next &raquo;', active: false } ]
    } };
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
