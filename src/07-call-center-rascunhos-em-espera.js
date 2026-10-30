/* =========================
   CALL CENTER - RASCUNHOS EM ESPERA
========================= */
(function () {
  'use strict';

  const DOCK_ID = 'tm-callcenter-drafts';
  const STYLE_ID = 'tm-callcenter-drafts-style';
  const MODAL_BUTTON_ID = 'tm-callcenter-draft-modal-save';
  const MAX_DRAFTS = 20;
  // Dados de pacientes ficam apenas na memória desta aba; não usar storage persistente.
  const drafts = [];
  const savedFields = ['dados', 'procedimentos', 'cadastro_temporario', 'st_observacoes',
    'campos_customizados_base', 'fl_tele_atendimento', 'sinalizador_atendimento',
    'extra', 'ordem_chegada', 'slots', 'confirm_docs', 'espera'];
  let nextId = 1;
  let owner = null;
  let open = false;
  let notice = '';
  let pendingResume = null;
  let restoring = false;
  let saving = false;
  let rendered = '';
  let lastRoute = '';
  let unloadGuardAttached = false;

  function confirmLeavingWithDrafts(event) {
    if (!drafts.length) return;
    event.preventDefault();
    // Compatibilidade com navegadores que ainda exigem returnValue.
    event.returnValue = true;
  }

  function syncUnloadGuard() {
    const shouldAttach = drafts.length > 0;
    if (shouldAttach === unloadGuardAttached) return;
    if (shouldAttach) window.addEventListener('beforeunload', confirmLeavingWithDrafts);
    else window.removeEventListener('beforeunload', confirmLeavingWithDrafts);
    unloadGuardAttached = shouldAttach;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value, (key, item) => {
      if (key === '__ob__' || typeof item === 'function') return undefined;
      if (typeof File !== 'undefined' && item instanceof File) throw new Error('Anexos não podem ficar em espera.');
      if (typeof Blob !== 'undefined' && item instanceof Blob) throw new Error('Anexos não podem ficar em espera.');
      return item;
    }));
  }

  function component() {
    if (window.location.hash !== '#/call-center') return null;
    const input = document.querySelector('input[placeholder="Operadora/Plano..."]');
    const firstVisit = input || [...document.querySelectorAll('a')]
      .find((item) => item.textContent.trim() === 'Primeira Vez');
    // O formulário inicial some quando o usuário passa para horários. O modal
    // continua dentro da árvore do mesmo componente em todas as etapas.
    for (const start of [document.getElementById('cadastroModal'), firstVisit]) {
      for (let element = start; element; element = element.parentElement) {
        const vue = element.__vue__;
        if (vue?.$route?.path === '/call-center' &&
            typeof vue.$options?.methods?.marcar === 'function' &&
            typeof vue.startFluxo === 'function') return vue;
      }
    }
    return null;
  }

  function hasWork(vue) {
    return !!(vue?.dados?.paciente || vue?.dados?.plano || vue?.dados?.procedimento ||
      vue?.procedimentos?.length || vue?.cadastro_temporario?.st_nome || vue?.st_observacoes?.trim());
  }

  function safeFlow(vue) {
    return [1, 2].includes(vue?.fluxo) && !vue?.remarcacao && !vue?.orcamento &&
      !vue?.id_infusao && vue?.$route?.path === '/call-center';
  }

  function userId(vue) {
    return String(vue?.$store?.state?.user?.id_usuario || '');
  }

  function headerUserId() {
    for (let element = document.querySelector('nav.navbar'); element; element = element.parentElement) {
      const id = userId(element.__vue__);
      if (id) return id;
    }
    return '';
  }

  function checkOwner(vue) {
    const current = userId(vue) || headerUserId();
    if (!current) return false;
    if (owner && owner !== current) {
      drafts.length = 0;
      pendingResume = null;
      open = false;
      notice = '';
    }
    owner = current;
    return true;
  }

  function label(snapshot) {
    const data = snapshot.dados || {};
    const patient = data.paciente?.st_nome || snapshot.cadastro_temporario?.st_nome || '';
    const procedures = snapshot.procedimentos || [];
    const name = procedures.map((item) => item.procedimento?.search).filter(Boolean).slice(0, 2).join(' · ');
    const display = (value) => typeof value === 'string' ? value.trim() :
      ['search', 'st_nome_exibicao', 'st_nome', 'nome', 'nm_pessoa', 'descricao', 'st_descricao']
        .map((key) => value?.[key]).find((text) => typeof text === 'string' && text.trim())?.trim() || '';
    const professional = procedures.map((item) => display(item.medico || item.profissional))
      .find(Boolean) || display(data.medico || data.profissional);
    const operator = display(data.plano || data.operadora || procedures[0]?.plano);
    return { patient, procedure: name || data.procedimento?.search || '',
      professional, operator };
  }

  function displayDate(date) {
    const value = String(date || '');
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '';
  }

  function selectedTimes(snapshot) {
    return (snapshot.procedimentos || []).filter((item) => item.data && item.hora)
      .map((item) => {
        const date = displayDate(item.data);
        return date ? `${date} • ${item.hora}` : '';
      }).filter(Boolean).slice(0, 3);
  }

  function draftProcedureGroups(snapshot, slots = []) {
    const data = snapshot.dados || {};
    const procedures = snapshot.procedimentos?.length ? snapshot.procedimentos :
      (data.procedimento ? [data] : []);
    const display = (value) => typeof value === 'string' ? value.trim() :
      ['search', 'st_nome_exibicao', 'st_nome', 'nome', 'nm_pessoa', 'descricao', 'st_descricao']
        .map((key) => value?.[key]).find((text) => typeof text === 'string' && text.trim())?.trim() || '';
    return procedures.map((item, index) => {
      const slot = slots.find((entry) => entry.procedureIndex === index) ||
        (procedures.length === 1 ? slots[0] : null);
      const date = displayDate(item.data || slot?.date);
      const time = item.hora || slot?.time;
      return {
        procedure: display(item.procedimento),
        professional: display(item.medico || item.profissional ||
          (procedures.length === 1 ? data.medico || data.profissional : null)),
        dateTime: [date, time].filter(Boolean).join(' • ')
      };
    });
  }

  function slotPreference(source, fallbackIndex = null) {
    const date = String(source?.data || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !source?.hora) return null;
    return {
      date,
      time: String(source.hora),
      agendaId: Number(source.id_agenda) || null,
      procedureIndex: Number.isInteger(source.index) ? source.index : fallbackIndex,
      doctorId: Number(source.medico?.id_pessoa || source.id_medico) || null,
      procedureId: Number(source.procedimento?.id_procedimento) || null,
      unitId: Number(source.id_unidade_operacao || source.unidade_operacao?.id_unidade_operacao ||
        source.unidade?.id_unidade_operacao) || null
    };
  }

  function preferredSlots(vue) {
    const procedures = vue.procedimentos || [];
    const selected = procedures.map((item, index) =>
      slotPreference(item, procedures.length > 1 ? index : null)).filter(Boolean);
    if (selected.length) return selected;
    const fallback = slotPreference(vue.horario_selecionado);
    return fallback ? [fallback] : [];
  }

  function preferredSlot(vue) {
    const selected = preferredSlots(vue)[0];
    if (selected) return selected;
    const source = vue.horario_selecionado || null;
    const date = String(source?.data || Object.keys(vue.exibicao || {})[vue.selecao?.dia] || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return { date };
  }

  function capture(vue) {
    if (!safeFlow(vue) || !hasWork(vue)) throw new Error('Preencha ao menos paciente, plano ou procedimento.');
    if (vue.buscando || vue.buscando_paciente || vue.buscando_procedimento ||
        vue.$store?.state?.loading) throw new Error('Aguarde a busca em andamento terminar.');
    if ([...document.querySelectorAll('input[type="file"]')].some((input) => input.files?.length) ||
        vue.marcacao_anexo) {
      throw new Error('Anexos não podem ficar em espera.');
    }
    const values = Object.fromEntries(savedFields.map((field) => [field, vue[field]]));
    const snapshot = clone(values);
    if (JSON.stringify(snapshot).length > 250000) throw new Error('Este preenchimento é grande demais para ficar em espera.');
    return { flow: vue.fluxo, snapshot, preferred: preferredSlot(vue),
      preferredSlots: preferredSlots(vue) };
  }

  function clearTimes(snapshot) {
    // A seleção anterior pode ter criado uma reserva temporária no servidor; nunca a reutilizar.
    const copy = clone(snapshot);
    for (const item of copy.procedimentos || []) {
      for (const field of ['hora', 'data', 'hg', 'vg', 'base', 'id_agenda', 'slots',
        'duracao', 'local_nome', 'id_local', 'doc_pre_atends']) {
        if (field in item) item[field] = null;
      }
      if (item.repeticao && typeof item.repeticao === 'object') {
        item.repeticao.hora = null;
        if ('base' in item.repeticao) item.repeticao.base = null;
      }
      item.selected = true;
      item.novo = true;
    }
    for (const field of ['hora', 'data', 'id_agenda']) {
      if (field in (copy.dados || {})) copy.dados[field] = null;
    }
    if (copy.dados) {
      copy.dados.selected = false;
      if (copy.dados.repeticao && typeof copy.dados.repeticao === 'object') {
        copy.dados.repeticao.hora = null;
        if ('base' in copy.dados.repeticao) copy.dados.repeticao.base = null;
      }
    }
    return copy;
  }

  function notify(message) {
    notice = message;
    open = true;
    render();
  }

  function notifyUnavailable(vue, message) {
    if (typeof vue.$toast?.add === 'function') {
      try {
        vue.$toast.add({ severity: 'error', summary: 'Vaga indisponível',
          detail: message, life: 8000 });
        return;
      } catch (error) {
        console.warn('[TM] Não foi possível exibir o alerta de vaga indisponível.', error);
      }
    }
    notify(message);
  }

  async function save() {
    if (saving || restoring) return;
    const vue = component();
    if (!vue || !checkOwner(vue)) return notify('Abra uma marcação para colocá-la em espera.');
    if (drafts.length >= MAX_DRAFTS) return notify(`Limite de ${MAX_DRAFTS} rascunhos nesta aba.`);
    let captured;
    try { captured = capture(vue); }
    catch (error) { return notify(error.message); }
    saving = true;
    const description = label(captured.snapshot);
    drafts.unshift({ id: nextId++, user: owner, created: Date.now(), ...captured,
      ...description, times: selectedTimes(captured.snapshot),
      groups: draftProcedureGroups(captured.snapshot, captured.preferredSlots) });
    open = true;
    notice = '';
    render();
    try {
      const modal = document.querySelector('#cadastroModal.show');
      if (modal) {
        const jq = window.jQuery || window.$;
        if (jq?.fn?.modal) jq('#cadastroModal').modal('hide');
        else modal.querySelector('[data-dismiss="modal"]')?.click();
      }
      if (vue.horarios && vue.procedimentos?.some((item) => item.data && item.hora)) vue.voltar();
      await vue.reiniciar();
    }
    catch (error) {
      console.error('[TM] Rascunho salvo, mas não foi possível reiniciar a marcação.', error);
      notice = 'Rascunho salvo; reinicie a marcação manualmente para começar outra.';
    } finally {
      saving = false;
      render();
    }
  }

  async function fetchPatient(vue, snapshot) {
    const id = snapshot.dados?.paciente?.id_pessoa;
    if (!(Number(id) > 0)) return;
    const response = await vue.axios.post('/aql?a=pacientes.show', {
      q: [{ name: 'pacientes.show', id: 'paciente', parms: { id } }]
    }, { tmFeature: 'callcenter-drafts' });
    if (response?.data?.paciente?.status !== 200 || !response.data.paciente.data) {
      throw new Error('Não foi possível confirmar o cadastro do paciente.');
    }
    snapshot.dados.paciente = response.data.paciente.data;
  }

  async function waitForDefaultPlan(vue, flow) {
    const defaultId = flow === 1 ? Number(vue.$store?.state?.user?.id_plano) : 0;
    if (!(defaultId > 0)) return;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (Number(vue.dados?.plano?.id_plano) === defaultId) return;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    throw new Error('O plano padrão ainda não carregou. Aguarde e tente retomar novamente.');
  }

  function dayBefore(date) {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() - 1);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  async function waitForSearch(vue) {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (!vue.buscando && Array.isArray(vue.horarios)) return;
      if (component() !== vue) throw new Error('A página mudou durante a busca.');
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    throw new Error('A busca de horários demorou demais. Use Buscar Horários para tentar novamente.');
  }

  function waitForModalShown(modal) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        document.removeEventListener('shown.bs.modal', onShown, true);
        resolve();
      };
      const onShown = (event) => { if (event.target === modal) finish(); };
      document.addEventListener('shown.bs.modal', onShown, true);
      // O evento pode ter ocorrido antes do registro; nunca bloqueie a retomada.
      window.setTimeout(finish, 450);
    });
  }

  function matchingSlot(vue, preferred, used = new Set()) {
    return (vue.horarios || []).find((slot) =>
      !used.has(slot) &&
      slot.status === 'livre' && !slot.bloqueado && !slot.restricao &&
      Number.isInteger(slot.index) &&
      slot.data === preferred.date &&
      String(slot.hora) === preferred.time &&
      (preferred.procedureIndex === null || slot.index === preferred.procedureIndex) &&
      (!preferred.agendaId || Number(slot.id_agenda) === preferred.agendaId) &&
      (!preferred.doctorId || Number(slot.medico?.id_pessoa || slot.id_medico) === preferred.doctorId) &&
      (!preferred.procedureId || Number(slot.procedimento?.id_procedimento) === preferred.procedureId) &&
      (!preferred.unitId || Number(slot.id_unidade_operacao ||
        slot.unidade_operacao?.id_unidade_operacao || slot.unidade?.id_unidade_operacao) === preferred.unitId));
  }

  function unitName(value) {
    if (typeof value === 'string') return value.trim();
    return String(value?.st_nome || value?.search || '').trim();
  }

  function catalogUnit(vue, unitId) {
    if (!unitId) return '';
    for (const source of [vue.unidadesTodas, vue.unidadesSelecionadas]) {
      const units = Array.isArray(source) ? source : Array.isArray(source?.data) ? source.data : [];
      const unit = units.find((item) =>
        Number(item?.id_unidade_operacao ?? item?.id) === unitId);
      if (unitName(unit)) return unitName(unit);
    }
    return '';
  }

  function restoreSlotUnit(vue, target, saved, currentSlot) {
    if (!target || !currentSlot) return;
    const savedUnit = Number(saved?.id_unidade_operacao || saved?.unidade_operacao?.id_unidade_operacao ||
      saved?.unidade?.id_unidade_operacao);
    const currentUnit = Number(currentSlot.id_unidade_operacao ||
      currentSlot.unidade_operacao?.id_unidade_operacao || currentSlot.unidade?.id_unidade_operacao);
    const targetUnit = Number(target.id_unidade_operacao || target.unidade_operacao?.id_unidade_operacao ||
      target.unidade?.id_unidade_operacao);
    if (savedUnit && currentUnit && savedUnit !== currentUnit) return;
    if (savedUnit && targetUnit && savedUnit !== targetUnit) return;
    if (currentUnit && targetUnit && currentUnit !== targetUnit) return;
    if (saved?.id_local && currentSlot.id_local &&
        Number(saved.id_local) !== Number(currentSlot.id_local)) return;
    if (saved?.id_local && target.id_local && Number(saved.id_local) !== Number(target.id_local)) return;
    if (unitName(target.unidade)) return;
    const unitId = currentUnit || targetUnit || savedUnit;
    const name = unitName(saved?.unidade) || unitName(currentSlot.unidade) ||
      unitName(currentSlot.unidade_operacao) || catalogUnit(vue, unitId);
    if (name) target.unidade = name;
  }

  async function restoreDate(vue, preference, savedProcedures = []) {
    if (typeof vue.buscarHorarios !== 'function') return '';
    const preferences = Array.isArray(preference) ? preference : preference ? [preference] : [];
    const preferred = preferences[0];
    if (!preferred) {
      if (!vue.procedimentos?.length && !vue.dados?.procedimento) {
        return 'Preenchimento retomado. Adicione um procedimento para buscar horários.';
      }
      vue.buscarHorarios();
      await waitForSearch(vue);
      return 'Horários atualizados. Escolha uma data e uma vaga disponíveis.';
    }
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (preferences.some((item) => item.date < todayIso)) {
      return 'Uma das datas preferidas já passou. Escolha novas vagas.';
    }
    vue.buscadoAte = dayBefore(preferences.reduce((earliest, item) =>
      item.date < earliest ? item.date : earliest, preferred.date));
    vue.buscarHorarios();
    await waitForSearch(vue);
    // listaPacientes abre a agenda completa do dia, não o cadastro do paciente.
    // A vaga já está na busca; selecioná-la diretamente abre apenas o cadastro.
    if (preferences.some((item) => !item.time)) {
      return 'Horários atualizados. Escolha uma vaga disponível na lista.';
    }
    const used = new Set();
    const slots = preferences.map((item) => {
      const slot = matchingSlot(vue, item, used);
      if (slot) used.add(slot);
      return slot;
    });
    const missing = preferences.filter((item, index) => !slots[index]);
    if (missing.length) {
      const when = missing.slice(0, 2).map((item) =>
        `${displayDate(item.date)} • ${item.time}`).join(', ');
      const message = missing.length === 1 ?
        `A vaga de ${when} não está mais disponível. Escolha outro horário na lista.` :
        `${missing.length} vagas não estão mais disponíveis (${when}). Escolha outros horários na lista.`;
      return { unavailable: true, message };
    }
    for (const [index, slot] of slots.entries()) {
      if (component() !== vue) throw new Error('A página mudou durante a reserva das vagas.');
      const procedureIndex = preferences[index].procedureIndex ?? index;
      const savedProcedure = savedProcedures[procedureIndex];
      restoreSlotUnit(vue, slot, savedProcedure, slot);
      await vue.selecionar_horario(slot);
      await new Promise((resolve) => vue.$nextTick(resolve));
      restoreSlotUnit(vue, vue.procedimentos?.[procedureIndex], savedProcedure, slot);
    }
    for (let attempt = 0; attempt < 120; attempt++) {
      const modal = document.querySelector('#cadastroModal.show');
      if (modal) {
        // A abertura do modal ainda pode reconstruir `procedimentos` após a
        // seleção do horário. Reponha a unidade só depois dessa montagem.
        await waitForModalShown(modal);
        if (!document.querySelector('#cadastroModal.show') || component() !== vue) return '';
        await new Promise((resolve) => vue.$nextTick(resolve));
        for (const [index, slot] of slots.entries()) {
          const procedureIndex = preferences[index].procedureIndex ?? index;
          const selected = vue.procedimentos?.[procedureIndex];
          const preferredSlot = preferences[index];
          if (!selected || (preferredSlot.agendaId && selected.id_agenda &&
              Number(selected.id_agenda) !== preferredSlot.agendaId) ||
              (selected.data && selected.data !== preferredSlot.date) ||
              (selected.hora && String(selected.hora) !== preferredSlot.time)) continue;
          restoreSlotUnit(vue, selected, savedProcedures[procedureIndex], slot);
        }
        vue.$forceUpdate?.();
        return '';
      }
      if (component() !== vue) throw new Error('A página mudou durante a reserva da vaga.');
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return { unavailable: true,
      message: 'Não foi possível reabrir as vagas. Elas podem ter sido ocupadas durante a retomada. Confira os horários exibidos.' };
  }

  async function resume(id) {
    const draft = drafts.find((item) => item.id === id);
    if (!draft || restoring || saving) return;
    const vue = component();
    if (!vue) {
      pendingResume = id;
      window.location.hash = '#/call-center';
      tmRuntime.schedule(0);
      return;
    }
    if (!checkOwner(vue) || draft.user !== owner) return notify('Este rascunho pertence a outra sessão.');
    if (hasWork(vue) && (safeFlow(vue) || vue.remarcacao || vue.orcamento || vue.id_infusao)) {
      return notify('Guarde ou reinicie a marcação atual antes de retomar outra.');
    }
    pendingResume = null;
    restoring = true;
    notify('Restaurando rascunho...');
    try {
      const snapshot = clearTimes(draft.snapshot);
      await fetchPatient(vue, snapshot);
      if (window.location.hash !== '#/call-center' || component() !== vue || userId(vue) !== draft.user) {
        throw new Error('A página mudou durante a restauração. Tente novamente.');
      }
      vue.startFluxo(draft.flow);
      await new Promise((resolve) => vue.$nextTick(resolve));
      await waitForDefaultPlan(vue, draft.flow);
      for (const field of savedFields) {
        if (Object.hasOwn(snapshot, field) && Object.hasOwn(vue.$data, field)) vue[field] = snapshot[field];
      }
      if (snapshot.dados?.plano && typeof vue.selecionarPlano === 'function') {
        vue.selecionarPlano(snapshot.dados.plano);
        if (!vue.dados.plano) throw new Error('O plano salvo não está mais disponível. Reinicie e escolha outro plano.');
      }
      vue.$forceUpdate();
      if (snapshot.dados?.paciente) await vue.selecionarPaciente(true);
      drafts.splice(drafts.indexOf(draft), 1);
      open = false;
      notice = '';
      try {
        const status = await restoreDate(vue,
          draft.preferredSlots?.length ? draft.preferredSlots : draft.preferred,
          draft.snapshot.procedimentos);
        if (status?.unavailable) notifyUnavailable(vue, status.message);
        else if (status) notify(status);
      } catch (error) {
        notify(error.message || 'Preenchimento retomado; faça a busca de horários manualmente.');
      } finally {
        // A vaga reaberta recompõe o cabeçalho depois do formulário; execute
        // mais uma passagem de layout quando o modal já tiver sido montado.
        tmRuntime.schedule(0);
      }
    } catch (error) {
      console.warn('[TM] Falha ao retomar rascunho:', error);
      notice = error.message || 'Não foi possível retomar o rascunho.';
    } finally {
      restoring = false;
      render();
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${DOCK_ID} { position: relative; display: flex; align-items: center;
        font-family: "Open Sans", "Helvetica Neue", sans-serif; font-size: 13px;
        color: #343a40; margin-right: 8px; }
      #${DOCK_ID} .tm-draft-trigger { position: relative; display: inline-flex;
        align-items: center; justify-content: center; width: 38px; height: 38px;
        min-width: 38px; min-height: 38px; padding: 0; border-radius: 13px;
        border: 1px solid rgba(255,255,255,.34); background: rgba(255,255,255,.12);
        color: #fff; line-height: 1; box-shadow: 0 4px 10px rgba(0,0,0,.10);
        backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
        transition: transform .16s ease, background .16s ease, border-color .16s ease,
          box-shadow .16s ease; }
      #${DOCK_ID} .tm-draft-trigger:hover, #${DOCK_ID} .tm-draft-trigger:focus,
      #${DOCK_ID} .tm-draft-trigger[aria-expanded="true"] { background: rgba(255,255,255,.22);
        border-color: rgba(255,255,255,.58); box-shadow: 0 7px 16px rgba(0,0,0,.18);
        transform: translateY(-1px); }
      #${DOCK_ID} .tm-draft-trigger:active { transform: translateY(0); }
      #${DOCK_ID} .tm-draft-icon { font-size: 20px; line-height: 1; }
      #${DOCK_ID} .tm-draft-count { position: absolute; top: -5px; right: -5px;
        min-width: 17px; height: 17px; padding: 0 3px; border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        background: #fff; color: #075d48; border: 1px solid #075d48;
        font-size: 10px; font-weight: 700; line-height: 1; }
      #${DOCK_ID} button { border: 1px solid #adb5bd; background: #fff; color: #344054;
        border-radius: 5px; padding: 7px 10px; cursor: pointer; font: inherit; }
      #${DOCK_ID} button:hover { background: #f1f4f7; }
      #${DOCK_ID} button:disabled { opacity: .55; cursor: default; }
      #${DOCK_ID} .tm-draft-panel { position: absolute; top: calc(100% + 8px); right: 0;
        width: min(370px, calc(100vw - 24px)); z-index: 1100; max-height: min(460px, 75vh);
        overflow: auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 7px;
        box-shadow: 0 8px 24px #0003; padding: 10px; }
      #${DOCK_ID} .tm-draft-item { position: relative; border-top: 1px solid #e6e9ed;
        padding: 11px 0; cursor: pointer; }
      #${DOCK_ID} .tm-draft-item:first-of-type { border-top: 0; }
      #${DOCK_ID} .tm-draft-name { display: block; color: #273444; }
      #${DOCK_ID} .tm-draft-operator { display: block; color: #273444;
        margin-bottom: 7px; overflow-wrap: anywhere; }
      #${DOCK_ID} .tm-draft-procedure-group + .tm-draft-procedure-group {
        border-top: 1px solid #d9dee5; margin-top: 6px; padding-top: 6px; }
      #${DOCK_ID} .tm-draft-line { min-height: 1.45em; color: #526171;
        line-height: 1.45; overflow-wrap: anywhere; }
      #${DOCK_ID} .tm-draft-date { padding-right: 36px; }
      #${DOCK_ID} .tm-draft-resume-hitbox { position: absolute; inset: 0; z-index: 1;
        width: 100%; height: 100%; padding: 0; border: 0 !important;
        background: transparent !important; box-shadow: none !important; }
      #${DOCK_ID} .tm-draft-resume-hitbox:focus:not(:focus-visible) {
        outline: none !important; }
      #${DOCK_ID} .tm-draft-resume-hitbox:focus-visible { outline: 2px solid #007bff !important;
        outline-offset: -2px; }
      #${DOCK_ID} .tm-draft-discard { position: absolute; right: 3px; bottom: 7px;
        z-index: 2; width: 28px; height: 28px; padding: 0; border: 0;
        background: transparent; color: #dc3545; font-size: 16px;
        opacity: 0; pointer-events: none; transition: opacity .15s ease; }
      #${DOCK_ID} .tm-draft-discard:hover { background: #fff1f2; color: #bd2130; }
      #${DOCK_ID} .tm-draft-item:hover .tm-draft-discard,
      #${DOCK_ID} .tm-draft-item:focus-within .tm-draft-discard {
        opacity: 1; pointer-events: auto; }
      @media (hover: none) {
        #${DOCK_ID} .tm-draft-discard { opacity: 1; pointer-events: auto; }
      }
      #${DOCK_ID} .tm-draft-note { margin-top: 7px; color: #6b4d00; }
      #${DOCK_ID} .tm-draft-empty { color: #667085; }
      #cadastroModal #${MODAL_BUTTON_ID}.btn-primary { background: #007bff;
        border-color: #007bff; color: #fff; }
      #cadastroModal #${MODAL_BUTTON_ID}.btn-primary:hover { background: #0069d9;
        border-color: #0062cc; }
    `;
    document.head.appendChild(style);
  }

  function ensureModalSave(canSave) {
    const modal = document.getElementById('cadastroModal');
    const existing = document.getElementById(MODAL_BUTTON_ID);
    if (!canSave || !modal) { existing?.remove(); return; }
    // Há outros modais aninhados no cadastro; o primeiro .modal-footer é oculto.
    const footer = modal.querySelector(':scope > .modal-dialog > .modal-content > .modal-footer');
    if (!footer || existing?.parentElement === footer) {
      if (existing) existing.disabled = saving || restoring;
      return;
    }
    existing?.remove();
    const button = document.createElement('button');
    button.id = MODAL_BUTTON_ID;
    button.type = 'button';
    button.className = 'btn btn-primary mr-auto';
    button.textContent = 'Colocar em espera';
    button.disabled = saving || restoring;
    button.addEventListener('click', save);
    footer.prepend(button);
  }

  function render() {
    const vue = component();
    const canSave = safeFlow(vue);
    const headerHost = document.querySelector('nav.navbar ul.navbar-nav.ml-auto');
    const currentUser = headerUserId();
    if (currentUser) checkOwner(vue || { $store: { state: { user: { id_usuario: currentUser } } } });
    syncUnloadGuard();
    ensureModalSave(canSave);
    let dock = document.getElementById(DOCK_ID);
    if (!headerHost || !currentUser) {
      dock?.remove();
      rendered = '';
      return;
    }
    ensureStyle();
    if (!dock || dock.parentElement !== headerHost) {
      dock?.remove();
      dock = document.createElement('li');
      dock.id = DOCK_ID;
      dock.className = 'nav-item';
      dock.setAttribute('aria-label', 'Rascunhos de agendamento');
      dock.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action, id = Number(button.dataset.id);
        if (action === 'toggle') { open = !open; notice = ''; render(); }
        if (action === 'resume') resume(id);
        if (action === 'discard' && !saving && !restoring) {
          const item = drafts.find((draft) => draft.id === id);
          if (!item || !window.confirm(`Descartar o rascunho de ${item.patient}?`)) return;
          drafts.splice(drafts.indexOf(item), 1);
          notice = 'Rascunho descartado.';
          render();
        }
      });
      const calculator = headerHost.querySelector('[data-tm-datecalc-header-trigger="1"]')?.closest('li');
      headerHost.insertBefore(dock, calculator || headerHost.firstElementChild);
      rendered = '';
    }
    const signature = JSON.stringify([canSave, drafts.map((draft) => draft.id), open, notice, restoring, saving]);
    if (rendered === signature) return;
    rendered = signature;
    dock.replaceChildren();
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tm-draft-trigger';
    toggle.dataset.action = 'toggle';
    toggle.title = `Em espera`;
    toggle.setAttribute('aria-label', `Em espera (${drafts.length})`);
    toggle.setAttribute('aria-expanded', String(open));
    const icon = document.createElement('span');
    icon.className = 'tm-draft-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📅';
    toggle.appendChild(icon);
    if (drafts.length) {
      const count = document.createElement('span');
      count.className = 'tm-draft-count';
      count.setAttribute('aria-hidden', 'true');
      count.textContent = String(drafts.length);
      toggle.appendChild(count);
    }
    dock.appendChild(toggle);
    if (open) {
      const panel = document.createElement('div');
      panel.className = 'tm-draft-panel';
      if (!drafts.length) {
        const empty = document.createElement('div');
        empty.className = 'tm-draft-empty';
        empty.textContent = 'Nenhuma marcação em espera';
        panel.appendChild(empty);
      }
      for (const draft of drafts) {
        const item = document.createElement('div');
        item.className = 'tm-draft-item';
        const name = document.createElement('strong');
        name.className = 'tm-draft-name';
        name.textContent = draft.patient;
        const line = (text) => {
          const element = document.createElement('div');
          element.className = 'tm-draft-line';
          element.textContent = text;
          return element;
        };
        const operator = document.createElement('strong');
        operator.className = 'tm-draft-operator';
        operator.textContent = draft.operator || '—';
        const groups = draft.groups?.length ? draft.groups : [{
          procedure: draft.procedure, professional: draft.professional,
          dateTime: draft.times?.join(' · ') || displayDate(draft.preferred?.date)
        }];
        const groupElements = groups.map((group) => {
          const element = document.createElement('div');
          element.className = 'tm-draft-procedure-group';
          const date = line(group.dateTime || '—');
          date.classList.add('tm-draft-date');
          element.append(line(group.procedure || '—'), line(group.professional || '—'), date);
          return element;
        });
        const resumeButton = document.createElement('button');
        resumeButton.type = 'button';
        resumeButton.className = 'tm-draft-resume-hitbox';
        resumeButton.dataset.action = 'resume';
        resumeButton.dataset.id = String(draft.id);
        resumeButton.setAttribute('aria-label', `Retomar agendamento de ${draft.patient}`);
        resumeButton.disabled = saving || restoring;
        const discard = document.createElement('button');
        discard.type = 'button';
        discard.className = 'tm-draft-discard';
        discard.dataset.action = 'discard';
        discard.dataset.id = String(draft.id);
        discard.setAttribute('aria-label', `Descartar rascunho de ${draft.patient}`);
        discard.title = 'Descartar rascunho';
        discard.disabled = saving || restoring;
        const trash = document.createElement('i');
        trash.className = 'far fa-trash-alt';
        trash.setAttribute('aria-hidden', 'true');
        discard.appendChild(trash);
        item.append(name, operator, ...groupElements, resumeButton, discard);
        panel.appendChild(item);
      }
      if (notice) {
        const message = document.createElement('div');
        message.className = 'tm-draft-note';
        message.setAttribute('role', 'status');
        message.textContent = notice;
        panel.appendChild(message);
      }
      dock.appendChild(panel);
    }
  }

  function ensureDrafts() {
    const route = window.location.hash;
    if (route !== lastRoute) {
      lastRoute = route;
      open = false;
      rendered = '';
    }
    if (pendingResume && !restoring && component()) resume(pendingResume);
    render();
  }

  document.addEventListener('click', (event) => {
    // O render troca o botão durante o clique; target.closest() deixa de achar
    // o dock depois da remoção, mas composedPath() preserva o caminho original.
    const inside = event.composedPath().some((node) =>
      node?.id === DOCK_ID || node?.id === MODAL_BUTTON_ID);
    if (open && !inside) {
      open = false;
      render();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (open && event.key === 'Escape') {
      open = false;
      render();
    }
  });
  document.addEventListener('tm-datecalc-opened', () => {
    if (open) {
      open = false;
      render();
    }
  });

  // O botão mora no cabeçalho global; somente salvar/retomar exige o Call Center.
  tmRuntime.register('rascunhos de agendamento do Call Center', ensureDrafts);
})();
