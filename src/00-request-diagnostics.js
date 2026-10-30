/* Falhas de servidor: metadados locais, sem parâmetros, respostas ou dados de pacientes. */
(function () {
  'use strict';
  const LIMIT = 40, PREFIX = 'tm_server_failures_v1:';
  const FEATURES = new Set(['appointment-calendar', 'callcenter-day-flags', 'callcenter-drafts',
    'reception-origin', 'authorization-combined-status', 'reception-authorization-badge',
    'reception-authorization-completion']);
  const MODULES = new Set(['recepcao', 'call-center', 'autorizacoes', 'pacientes', 'atendimento',
    'atendimentos', 'financeiro', 'relatorios', 'config', 'agenda', 'orcamentos', 'home']);
  const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
  const requestModules = new WeakMap();
  let active = null;

  function context() {
    const read = vue => {
      const client = vue?.axios || vue?.$http;
      const account = String(vue?.$store?.state?.user?.id_usuario || '');
      return /^\d+$/.test(account) && client?.interceptors?.response?.use &&
        client.interceptors.response.eject ? { client, account } : null;
    };
    const globalContext = read(window.app);
    if (globalContext) return globalContext;
    for (let node = document.querySelector('nav.navbar'); node; node = node.parentElement) {
      const found = read(node.__vue__);
      if (found) return found;
    }
    return read(document.getElementById('app')?.__vue__);
  }

  function featureOf(config) {
    if (FEATURES.has(config?.tmFeature)) return config.tmFeature;
    if (config?.tmAppointmentCalendar === true) return 'appointment-calendar';
    if (config?.tmDayFlags === true) return 'callcenter-day-flags';
    return '';
  }

  function project(entry) {
    if (!entry || typeof entry.at !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.at)) return null;
    const feature = FEATURES.has(entry.feature) ? entry.feature : '';
    return { at: entry.at,
      version: /^\d+(\.\d+){1,3}$/.test(String(entry.version)) ? entry.version : 'unknown',
      module: MODULES.has(entry.module) ? entry.module : 'other',
      origin: feature ? 'userscript' : 'unmarked', feature,
      method: METHODS.has(entry.method) ? entry.method : 'OTHER',
      httpStatus: Number.isInteger(entry.httpStatus) && entry.httpStatus >= 100 && entry.httpStatus <= 599
        ? entry.httpStatus : 0,
      aqlStatus: Array.isArray(entry.aqlStatus) ? [...new Set(entry.aqlStatus.filter(serverStatus))] : [],
      queries: Array.isArray(entry.queries) ? [...new Set(entry.queries.filter(name =>
        typeof name === 'string' && name.length <= 96 && /^[a-z_]+(?:\.[a-z_]+)+$/.test(name)))].slice(0, 20) : [] };
  }

  function serverStatus(status) {
    return Number.isInteger(status) && status >= 500 && status <= 599;
  }

  function currentModule() {
    const name = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'home';
    return MODULES.has(name) ? name : 'other';
  }

  function record(value, state) {
    try {
      // As respostas antigas de outra conta não pertencem ao contexto atual.
      if (context()?.account !== state.account) return;
      const response = value?.response || value;
      const httpStatus = Number(response?.status);
      const data = response?.data;
      const failed = data && typeof data === 'object' && !Array.isArray(data) ? Object.entries(data).filter(([, item]) =>
        serverStatus(Number(item?.status))) : [];
      const genericError = typeof value?.message === 'string' && /^server\s+err(?:or|o)$/i.test(value.message.trim());
      if (!serverStatus(httpStatus) && !failed.length && !genericError) return;
      const config = value?.config || response?.config || {};
      let body = config.data;
      if (typeof body === 'string') {
        try { body = body.length <= 1000000 ? JSON.parse(body) : null; } catch (_) { body = null; }
      }
      const failedKeys = new Set(failed.map(([key]) => key));
      const queries = Array.isArray(body?.q) ? body.q.filter(query =>
        serverStatus(httpStatus) || genericError || failedKeys.has(query?.id)).map(query => query?.name) : [];
      const module = requestModules.get(config) || currentModule();
      const entry = project({ at: new Date().toISOString(),
        version: typeof GM_info !== 'undefined' ? GM_info.script?.version : 'unknown',
        module, feature: featureOf(config), method: String(config.method || '').toUpperCase(),
        httpStatus, aqlStatus: failed.map(([, item]) => Number(item.status)), queries });
      const key = PREFIX + state.account;
      let previous;
      try { previous = JSON.parse(sessionStorage.getItem(key) || '[]'); } catch (_) { previous = []; }
      const entries = Array.isArray(previous) ? previous.slice(-LIMIT).map(project).filter(Boolean) : [];
      entries.push(entry);
      sessionStorage.setItem(key, JSON.stringify(entries.slice(-LIMIT)));
    } catch (_) { /* Diagnóstico nunca altera o resultado nem o aviso nativo. */ }
  }

  function ensureDiagnostics() {
    const next = context();
    if (active?.client === next?.client && active?.account === next?.account) return;
    if (active) {
      active.client.interceptors.response.eject(active.interceptor);
      if (active.requestInterceptor !== undefined) {
        active.client.interceptors.request?.eject?.(active.requestInterceptor);
      }
    }
    active = null;
    if (!next) return;
    const state = active = next;
    state.requestInterceptor = state.client.interceptors.request?.use(config => {
      try { if (config && typeof config === 'object') requestModules.set(config, currentModule()); } catch (_) {}
      return config;
    });
    state.interceptor = state.client.interceptors.response.use(value => {
      record(value, state);
      return value;
    }, error => {
      record(error, state);
      return Promise.reject(error);
    });
  }

  // Registrado antes dos módulos que consultam a API. Não faz requisições adicionais.
  tmRuntime.register('diagnóstico de falhas de servidor', ensureDiagnostics);
})();
