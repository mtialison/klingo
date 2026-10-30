/* RECEPÇÃO — filtros da própria aba sobrevivem ao recarregamento. */
(function () {
  'use strict';
  const PREFIX = 'tm_reception_filters_v1:';
  const FIELDS = ['referencia', 'medico', 'viewEspec', 'viewStatus', 'viewMode',
    'tipo_proced', 'search', 'turno', 'faixa_hora', 'filtrar_faixa_hora',
    'block_view_pacotes', 'filtro_teleatend', 'apenas_editados', 'id_fila_laudo'];
  const TYPES = ['', 'marcado', 'extra', 'demanda'];
  let active = null;

  function receptionVue() {
    if (window.location.hash.split('?')[0] !== '#/recepcao') return null;
    for (let node = document.getElementById('refresh-button'); node; node = node.parentElement) {
      const vue = node.__vue__;
      if (vue?.$refs?.ini_atd && typeof vue.load === 'function' && vue.unidade_operacao !== undefined) return vue;
    }
    return null;
  }

  function keyFor(vue) {
    const user = String(vue.$store?.state?.user?.id_usuario || '');
    if (!user) return '';
    const unit = String(vue.unidade_operacao || 'all');
    const reception = String(vue.$util?.getCookie?.('id_recepcao') || '');
    return PREFIX + [user, unit, reception].map(encodeURIComponent).join(':');
  }

  function scalar(value) {
    return value === null || typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && value.length <= 1000);
  }

  function typeControl() {
    return document.querySelector('#tm-recepcao-tipo-filter select');
  }

  function snapshot(state) {
    const values = {};
    for (const field of FIELDS) {
      if (Object.hasOwn(state.vue.$data, field) && scalar(state.vue[field])) values[field] = state.vue[field];
    }
    const ids = state.vue.filtro_lista_medicos;
    if (Array.isArray(ids)) values.filtro_lista_medicos = ids.filter(id => /^\d+$/.test(String(id))).slice(0, 500);
    const type = state.pendingType ?? typeControl()?.value ?? '';
    return { version: 1, values, type: TYPES.includes(type) ? type : '' };
  }

  function save(state) {
    if (!state?.initialized || state.restoring || keyFor(state.vue) !== state.key || state.vue._isDestroyed) return;
    try {
      const text = JSON.stringify(snapshot(state));
      if (text !== state.last) {
        sessionStorage.setItem(state.key, text);
        state.last = text;
      }
    } catch (_) { /* Storage bloqueado não deve interferir na Recepção. */ }
  }

  function read(key) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      return saved?.version === 1 && saved.values && typeof saved.values === 'object' &&
        !Array.isArray(saved.values) ? saved : null;
    } catch (_) { return null; }
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    return year > 0 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function restoreType(state) {
    const control = typeControl();
    if (state.pendingType === null || !control) return;
    if (control.value !== state.pendingType) {
      control.value = state.pendingType;
      control.dispatchEvent(new Event('change', { bubbles: true }));
    }
    state.pendingType = null;
  }

  function restore(state, saved) {
    const vue = state.vue;
    const options = document.getElementById('filtro-medico')?.options;
    const available = options ? new Set(Array.from(options, option => option.value)) : null;
    let changed = false;
    for (const field of FIELDS) {
      const value = saved.values[field];
      if (!Object.hasOwn(saved.values, field) || !Object.hasOwn(vue.$data, field) || !scalar(value)) continue;
      if (typeof vue[field] === 'boolean' && typeof value !== 'boolean') continue;
      if (field === 'referencia' && !validDate(value)) continue;
      if (field === 'medico' && value && available && !available.has(String(value))) continue;
      if (vue[field] !== value) { vue[field] = value; changed = true; }
    }
    if (Object.hasOwn(vue.$data, 'filtro_lista_medicos') && Array.isArray(saved.values.filtro_lista_medicos)) {
      const ids = saved.values.filtro_lista_medicos.filter(id => /^\d+$/.test(String(id)) &&
        (!available || available.has(String(id)))).slice(0, 500);
      if (JSON.stringify(vue.filtro_lista_medicos) !== JSON.stringify(ids)) {
        vue.filtro_lista_medicos = ids;
        changed = true;
      }
    }
    state.pendingType = TYPES.includes(saved.type) ? saved.type : '';
    restoreType(state);
    return changed;
  }

  function dispose() {
    if (!active) return;
    save(active);
    active.unwatch?.();
    active.unwatchReady?.();
    active = null;
  }

  function ensurePersistence() {
    const vue = receptionVue();
    const key = vue && keyFor(vue);
    if (!vue || !key) { dispose(); return; }
    if (!active || active.vue !== vue || active.key !== key) {
      dispose();
      const state = active = { vue, key, initialized: false, restoring: false,
        interrupted: false, pendingType: null, last: null, unwatch: null, unwatchReady: null };
      state.unwatch = vue.$watch(() => JSON.stringify(snapshot(state)), () => save(state));
      state.unwatchReady = vue.$watch(() => vue.firstLoad && !vue.montando && !vue.$store.state.loading,
        ready => { if (ready) tmRuntime.schedule(0); });
    }
    const state = active;
    if (state.initialized) { restoreType(state); save(state); return; }
    if (vue.montando || !vue.firstLoad || vue.$store.state.loading) return;
    const explicitNavigation = Object.values(vue.$route?.params || {}).some(value =>
      value !== null && value !== undefined && value !== '');
    const saved = !state.interrupted && !explicitNavigation ? read(key) : null;
    state.initialized = true;
    let changed = false;
    state.restoring = true;
    try { if (saved) changed = restore(state, saved); }
    finally { state.restoring = false; }
    // Uma navegação específica não deve substituir a última configuração da barra.
    if (explicitNavigation) state.last = JSON.stringify(snapshot(state));
    // Sem histórico do contexto, guardar o que o Klingo já exibe, inclusive após trocar a unidade.
    // Não redefinir filtros que a navegação nativa optou por conservar.
    else save(state);
    if (changed) vue.load(false);
  }

  function manualInteraction(event) {
    if (!event.isTrusted || !active || receptionVue() !== active.vue) return;
    const card = document.getElementById('refresh-button')?.closest('.card');
    if (!card?.contains(event.target) && !event.target?.closest?.('#tm-recepcao-calendario-popover')) return;
    const state = active;
    if (!state.initialized) state.interrupted = true;
    if (event.type === 'change' && event.target?.closest?.('#tm-recepcao-tipo-filter')) state.pendingType = null;
    Promise.resolve().then(() => save(state));
  }

  for (const name of ['input', 'change', 'click']) document.addEventListener(name, manualInteraction, true);
  window.addEventListener('pagehide', () => save(active));
  tmRuntime.register('permanência dos filtros da Recepção', ensurePersistence, ['#/recepcao']);
})();
