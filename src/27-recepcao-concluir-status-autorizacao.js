/* RECEPÇÃO — registrar Enviado e Em Sessão após a conclusão nativa das guias. */
(function () {
  'use strict';
  const ELIGIBLE = new Set(['0', '2', '11']);
  const completionIntents = new WeakMap();
  const pending = new Map();

  function positiveId(value) {
    return /^\d+$/.test(String(value)) && Number(value) > 0 ? String(value) : '';
  }

  async function readAppointment(axios, context) {
    const response = await axios.post('/aql?a=marcacoes.show', { q: [{ name: 'marcacoes.show',
      id: 'item', parms: { id: context.appointmentId, para_atendimento: true, guia_tiss: true } }] });
    const result = response.data?.item;
    const appointment = result?.data;
    if (result?.status !== 200 || positiveId(appointment?.id_marcacao) !== context.appointmentId ||
        positiveId(appointment?.id_atendimento) !== context.attendanceId ||
        positiveId(appointment?.id_solicitacao_autorizacao) !== context.authorizationId ||
        positiveId(appointment?.atendimento?.id_atendimento) !== context.attendanceId) {
      throw new Error('O vínculo entre agendamento, atendimento e autorização mudou.');
    }
    return appointment;
  }

  async function readAuthorization(axios, id) {
    const response = await axios.post('/aql?a=solicitacao_autorizacoes.index', {
      q: [{ name: 'solicitacao_autorizacoes.index', id: 'lista',
        parms: { id_solicitacao_autorizacao: id, autorizar: true } }]
    });
    const result = response.data?.lista;
    if (result?.status !== 200 || !Array.isArray(result.data) || result.data.length !== 1 ||
        positiveId(result.data[0]?.id_solicitacao_autorizacao) !== id) {
      throw new Error('Não foi possível consultar a autorização para atualização.');
    }
    if (result.data[0].js_secundarios != null && !Array.isArray(result.data[0].js_secundarios)) {
      throw new Error('Formato dos procedimentos secundários não reconhecido.');
    }
    return result.data[0];
  }

  function authorizationItems(record, ids) {
    const selected = new Set(ids);
    const items = [record, ...(record.js_secundarios || [])]
      .filter(item => selected.has(positiveId(item.id_procedimento)));
    const seen = new Set();
    items.forEach(item => {
      const id = positiveId(item.id_procedimento);
      if (seen.has(id)) throw new Error('Há itens repetidos; não é possível associar o procedimento com segurança.');
      seen.add(id);
    });
    return items;
  }

  function statusDraft(record, ids, status, expected) {
    const draft = JSON.parse(JSON.stringify(record));
    const items = authorizationItems(draft, ids);
    if (items.length !== ids.length || items.some(item => !expected.has(String(item.in_status)))) {
      throw new Error('O status de um procedimento mudou durante a atualização.');
    }
    items.forEach(item => { item.in_status = status; });
    return draft;
  }

  async function storeAuthorization(axios, draft) {
    const response = await axios.post('/aql?a=solicitacao_autorizacoes.store', {
      q: [{ name: 'solicitacao_autorizacoes.store', id: 'atualizar', parms: draft }]
    });
    if (![200, 290].includes(response.data?.atualizar?.status)) {
      throw new Error('O Klingo não confirmou a gravação do status da autorização.');
    }
  }

  async function transitionAuthorization(axios, context, options = {}) {
    let sentStored = false, sessionStored = false;
    try {
      const appointment = await readAppointment(axios, context);
      const procedures = appointment.atendimento.atendimento_procedimentos;
      if (!Array.isArray(procedures)) throw new Error('Não foi possível identificar os procedimentos deste atendimento.');
      const ids = [...new Set(procedures.filter(item =>
        ![true, 1, '1'].includes(item.excluido) && ![false, 0, '0'].includes(item.fl_ativo))
        .map(item => positiveId(item.id_procedimento)).filter(Boolean))];
      const record = await readAuthorization(axios, context.authorizationId);
      const targets = authorizationItems(record, ids).filter(item => ELIGIBLE.has(String(item.in_status)))
        .map(item => positiveId(item.id_procedimento));
      if (!targets.length) return { changed: false };
      options.beforeStore?.();
      await storeAuthorization(axios, statusDraft(record, targets, 6, ELIGIBLE));
      sentStored = true;
      options.onStored?.();
      const sent = await readAuthorization(axios, context.authorizationId);
      options.beforeStore?.();
      await storeAuthorization(axios, statusDraft(sent, targets, 10, new Set(['6'])));
      sessionStored = true;
      options.onStored?.();
      const final = await readAuthorization(axios, context.authorizationId);
      const finalItems = authorizationItems(final, targets);
      if (finalItems.length !== targets.length || finalItems.some(item => String(item.in_status) !== '10')) {
        throw new Error('Não foi possível confirmar o status final Em Sessão.');
      }
      return { changed: true, procedureIds: targets };
    } catch (error) {
      error.sentStored = sentStored;
      error.sessionStored = sessionStored;
      throw error;
    }
  }

  function completionContext(workflow, guide) {
    const appointment = workflow.marcacao;
    if (Number(workflow.etapa) !== 8 || workflow.$refs.listaguias !== guide ||
        !Array.isArray(guide.lista) || !guide.lista.length ||
        positiveId(guide.marcacao?.id_marcacao) !== positiveId(appointment?.id_marcacao)) return null;
    const context = { appointmentId: positiveId(appointment?.id_marcacao),
      attendanceId: positiveId(appointment?.id_atendimento),
      authorizationId: positiveId(appointment?.id_solicitacao_autorizacao) };
    return Object.values(context).every(Boolean) ? context : null;
  }

  function installCompletionHook(workflow) {
    const util = workflow.$util;
    if (!util || typeof util.atualizar !== 'function') return;
    if (!util.atualizar.__tmReceptionAuthorizationCompletion) {
      const originalUpdate = util.atualizar;
      const wrappedUpdate = function (component, config) {
        const intent = completionIntents.get(component);
        if (!intent || config?.service !== 'guias' || config.func !== 'set_numero_atribuido' ||
            config.dados?.imprimindo !== false) return originalUpdate.apply(this, arguments);
        const callback = config.callback;
        return originalUpdate.call(this, component, { ...config, callback: function (...args) {
          try { return callback?.apply(this, args); }
          finally { queueCompletion(intent.context, intent.workflow); }
        } });
      };
      wrappedUpdate.__tmReceptionAuthorizationCompletion = true;
      util.atualizar = wrappedUpdate;
    }
    const guide = workflow.$refs.listaguias;
    if (!guide || typeof guide.print !== 'function' || guide.print.__tmReceptionAuthorizationCompletion) return;
    const originalPrint = guide.print;
    const wrappedPrint = function (...args) {
      const context = args[0] === false && args[1] === 'iniciarAtendimentoModal'
        ? completionContext(workflow, this) : null;
      if (context) completionIntents.set(this, { context, workflow });
      try { return originalPrint.apply(this, args); }
      finally { completionIntents.delete(this); }
    };
    wrappedPrint.__tmReceptionAuthorizationCompletion = true;
    guide.print = wrappedPrint;
  }

  function findReceptionWorkflow() {
    if (!/^#\/recepcao(?:\/|$)/.test(window.location.hash)) return null;
    for (let node = document.getElementById('refresh-button'); node; node = node.parentElement) {
      if (node.__vue__?.$refs?.ini_atd) return node.__vue__.$refs.ini_atd;
    }
    return null;
  }

  function queueCompletion(context, workflow) {
    const account = positiveId(workflow.$store.state.user?.id_usuario);
    const key = `${account}:${context.appointmentId}:${context.attendanceId}`;
    if (pending.has(key)) return;
    const notify = (severity, detail) => workflow.$toast?.add({ severity,
      summary: 'Autorização', detail, life: severity === 'error' ? 10000 : 5000 });
    const updated = () => document.dispatchEvent(new CustomEvent('tm-reception-authorization-updated',
      { detail: { id: context.authorizationId } }));
    const job = Promise.resolve().then(() => {
      if (!account || !navigator.locks?.request) throw new Error('Coordenação entre abas indisponível.');
      return navigator.locks.request(`klingo-reception-authorization:${account}:${context.authorizationId}`, () =>
        transitionAuthorization(workflow.axios, context, { onStored: updated, beforeStore: () => {
          if (positiveId(workflow.$store.state.user?.id_usuario) !== account) throw new Error('A conta conectada mudou.');
        } }));
    }).then(result => {
      if (result.changed) notify('success', 'Procedimentos deste agendamento: Enviado → Em Sessão.');
    }).catch(error => {
      const detail = error.sessionStored
        ? 'Atualização enviada, mas o estado final não pôde ser confirmado. Revise a autorização.'
        : error.sentStored
          ? 'Enviado foi registrado, mas Em Sessão não foi confirmado. Revise a autorização.'
          : 'Recepção concluída. Não foi possível atualizar a autorização. Revise no módulo Autorizações.';
      notify('error', detail);
      console.warn('[TM] Atualização de autorização após concluir recepção:', error.message);
    }).finally(() => pending.delete(key));
    pending.set(key, job);
  }

  tmRuntime.register('autorização após concluir a Recepção', () => {
    const workflow = findReceptionWorkflow();
    if (workflow) installCompletionHook(workflow);
  }, ['#/recepcao']);
})();
