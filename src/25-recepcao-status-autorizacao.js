/* RECEPÇÃO — status e consulta nativa da autorização vinculada ao agendamento. */
(function () {
  'use strict';
  const BATCH_SIZE = 10;
  const CACHE_TTL = 30000;
  const CARD_SELECTOR = '.dashcard.my-2[class*="atendimento-"]';
  const buttonBindings = new WeakMap();
  let activeState = null;

  function authorizationId(appointment) {
    const id = appointment?.id_solicitacao_autorizacao;
    return /^\d+$/.test(String(id)) && Number(id) > 0 ? String(id) : '';
  }

  function nativeAuthorizationStatus(status) {
    if (!status || typeof status.msg !== 'string' || !status.msg.trim()) return null;
    const color = String(status.color || '').toLowerCase();
    return { msg: status.msg.trim(), color: ['primary', 'success', 'info', 'danger',
      'warning', 'dark', 'secondary', 'light'].includes(color) ? color : 'secondary' };
  }

  async function fetchAuthorizationStatuses(axios, ids, cancelToken) {
    const unique = [...new Set(ids)];
    const batches = [];
    for (let i = 0; i < unique.length; i += BATCH_SIZE) batches.push(unique.slice(i, i + BATCH_SIZE));
    const statuses = new Map();
    let next = 0;
    const worker = async () => {
      while (next < batches.length) {
        const batch = batches[next++];
        const q = batch.map((id, i) => ({ name: 'solicitacao_autorizacoes.show',
          id: `authorization_${i}`, parms: { id, para_agendar: true } }));
        const response = await axios.post('/aql?a=solicitacao_autorizacoes.show', { q }, { cancelToken });
        batch.forEach((id, i) => {
          const result = response.data?.[`authorization_${i}`];
          if (result?.status !== 200 || String(result.data?.id_solicitacao_autorizacao) !== id) return;
          const status = nativeAuthorizationStatus(result.data.status_solicitacao);
          if (status) statuses.set(id, status);
        });
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, batches.length) }, worker));
    return statuses;
  }

  function bindAuthorizationButton(button, vue, appointment) {
    buttonBindings.set(button, { vue, appointment });
    if (button.onclick) return;
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const binding = buttonBindings.get(button);
      if (authorizationId(binding?.appointment)) binding.vue.ver_autorizacao(binding.appointment);
    };
  }

  function injectStyle() {
    if (document.getElementById('tm-reception-authorization-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-reception-authorization-style';
    style.textContent = `
      .tm-reception-authorization-slot { display: flex; align-items: center; justify-content: center; }
      .tm-reception-authorization-button { border: 0; cursor: pointer; width: 100%; white-space: normal; }
      @media (min-width: 768px) {
        .tm-reception-authorization-time { flex: 0 0 8.333333% !important; max-width: 8.333333% !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function receptionVue() {
    if (!/^#\/recepcao(?:\/|$)/.test(window.location.hash)) return null;
    for (let node = document.getElementById('refresh-button'); node; node = node.parentElement) {
      const vue = node.__vue__;
      if (Array.isArray(vue?.lista) && typeof vue.ver_autorizacao === 'function' && vue.$refs?.ver_autorizacao) return vue;
    }
    return null;
  }

  function renderCard(card, vue, state) {
    const row = card.querySelector(':scope > .row.py-1.px-2.align-items-center');
    const time = row?.querySelector(':scope > .col.col-12.col-md-2');
    const cell = time?.querySelector('.d-flex.flex-md-column.flex-row');
    const appointment = cell?.__vue__?.hor?.marcacao;
    const id = authorizationId(appointment);
    let slot = row?.querySelector(':scope > .tm-reception-authorization-slot');
    if (!time || !id) {
      slot?.remove();
      time?.classList.remove('tm-reception-authorization-time');
      return '';
    }
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'col col-12 col-md-1 tm-reception-authorization-slot';
      const button = document.createElement('button');
      button.type = 'button';
      slot.appendChild(button);
      row.insertBefore(slot, time.nextElementSibling);
    }
    time.classList.add('tm-reception-authorization-time');
    const button = slot.firstElementChild;
    const cached = state.cache.get(id);
    const status = nativeAuthorizationStatus(appointment.autorizacao?.status_solicitacao) || cached?.status;
    const text = status?.msg || (cached ? 'Ver autorização' : 'Autorização…');
    const classes = `badge badge-${status?.color || 'secondary'} tm-reception-authorization-button`;
    if (button.className !== classes) button.className = classes;
    if (button.textContent !== text) button.textContent = text;
    const title = `Ver autorização: ${text}`;
    if (button.title !== title) {
      button.title = title;
      button.setAttribute('aria-label', title);
    }
    bindAuthorizationButton(button, vue, appointment);
    if (appointment.autorizacao?.status_solicitacao) return '';
    return !cached || Date.now() - cached.at >= CACHE_TTL ? id : '';
  }

  function ensureReceptionAuthorization() {
    const vue = receptionVue();
    if (!vue) {
      activeState?.token.cancel('Saiu da Recepção');
      activeState = null;
      return;
    }
    injectStyle();
    const scope = `${vue.referencia}:${vue.unidade_operacao}:${vue.$store.state.user?.id_usuario || ''}`;
    if (!activeState || activeState.vue !== vue || activeState.source !== vue.marcacoes || activeState.scope !== scope) {
      activeState?.token.cancel('Listagem alterada');
      activeState = { vue, source: vue.marcacoes, scope,
        token: vue.axios.CancelToken.source(), cache: new Map(), loading: false };
    }
    const state = activeState;
    const ids = [...new Set(Array.from(document.querySelectorAll(CARD_SELECTOR),
      card => renderCard(card, vue, state)).filter(Boolean))];
    if (!ids.length || state.loading) return;
    state.loading = true;
    fetchAuthorizationStatuses(vue.axios, ids, state.token.token).then(statuses => {
      if (activeState !== state || state.source !== vue.marcacoes) return;
      ids.forEach(id => state.cache.set(id, { status: statuses.get(id) || null, at: Date.now() }));
    }).catch(error => {
      if (activeState !== state || vue.axios.isCancel?.(error)) return;
      // A consulta da badge nunca deve bloquear o funcionamento da Recepção.
      ids.forEach(id => state.cache.set(id, { status: null, at: Date.now() }));
      console.warn('[TM] Não foi possível consultar os status de autorização', error);
    }).finally(() => {
      state.loading = false;
      if (activeState === state) tmRuntime.schedule(0);
    });
  }

  document.addEventListener('tm-reception-authorization-updated', event => {
    const id = String(event.detail?.id || '');
    if (id && activeState) {
      activeState.cache.delete(id);
      tmRuntime.schedule(0);
    }
  });

  tmRuntime.register('status de autorização na Recepção', ensureReceptionAuthorization, ['#/recepcao']);
})();
