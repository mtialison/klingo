/* Configurações > Agendas: recarrega os dados quando a rota volta com médico restaurado. */
(function () {
  'use strict';

  const ROUTE = '#/config/agendas';
  const AUDIT_ROUTE = '#/audits';
  const EDIT_RETURN_KEY = 'tm_agendas_edit_return_v1';
  const EDIT_RETURN_TTL_MS = 10 * 60 * 1000;
  const loadRequested = new WeakSet();
  const restoreStarted = new WeakSet();
  let readyRetry = null;
  let cachedComponent = null;

  function onRoute() {
    return window.location.hash.split('?')[0] === ROUTE;
  }

  function findAgendasComponent() {
    if (cachedComponent && !cachedComponent._isDestroyed && cachedComponent.$el?.isConnected &&
        cachedComponent.$route?.path === '/config/agendas') return cachedComponent;

    const roots = [window.app, document.getElementById('app')?.__vue__].filter(Boolean);
    const seen = new Set();

    function scan(queue) {
      for (let index = 0; index < queue.length; index++) {
        const component = queue[index];
        if (!component || seen.has(component) || component._isDestroyed) continue;
        seen.add(component);

        if (component.$route?.path === '/config/agendas' &&
            typeof component.load === 'function' &&
            typeof component.medico_inicial === 'function' &&
            Object.prototype.hasOwnProperty.call(component, 'dados') &&
            Object.prototype.hasOwnProperty.call(component, 'montando') &&
            !component.setup) {
          return component;
        }

        queue.push(...(component.$children || []));
      }
      return null;
    }

    const fromRoots = scan(roots);
    if (fromRoots) return (cachedComponent = fromRoots);

    // O Klingo às vezes substitui #app; nesse caso, encontre as raízes Vue atuais no DOM.
    const domRoots = Array.from(document.querySelectorAll('body *'), element => element.__vue__).filter(Boolean);
    return (cachedComponent = scan(domRoots));

  }

  function cloneJson(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function clearEditReturnState() {
    try { sessionStorage.removeItem(EDIT_RETURN_KEY); } catch (_) { /* storage indisponível */ }
  }

  function readEditReturnState() {
    try {
      const state = JSON.parse(sessionStorage.getItem(EDIT_RETURN_KEY) || 'null');
      if (!state || state.version !== 1 || !Number.isFinite(state.createdAt) ||
          Date.now() - state.createdAt > EDIT_RETURN_TTL_MS ||
          !state.item || !state.item.id_agenda) {
        clearEditReturnState();
        return null;
      }
      return state;
    } catch (_) {
      clearEditReturnState();
      return null;
    }
  }

  function captureEditReturnState(event) {
    if (!onRoute()) return;

    const modal = document.getElementById('agendaEdicaoModal');
    if (!modal?.classList.contains('show')) return;

    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const control = target?.closest?.('button, a');
    if (!control || !modal.contains(control) ||
        control.textContent.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR') !== 'log') return;

    const component = findAgendasComponent();
    if (!component?.item?.id_agenda || !component.procedimentos) return;

    try {
      const state = {
        version: 1,
        createdAt: Date.now(),
        doctorId: component.medico?.id_pessoa || component.item.id_medico || null,
        item: cloneJson(component.item),
        procedimentos: cloneJson(component.procedimentos),
        expandedSections: Array.from(component.$el.querySelectorAll('.collapse.show[id]'))
          .map(element => element.id)
          .filter(id => /^collapse-\d+-\d+$/.test(id))
      };
      sessionStorage.setItem(EDIT_RETURN_KEY, JSON.stringify(state));
    } catch (error) {
      clearEditReturnState();
      console.warn('[TM] Não foi possível preservar a edição da agenda antes do Log.', error);
    }
  }

  function expandSavedSections(component, sectionIds) {
    const root = component.$el;
    const triggers = Array.from(root.querySelectorAll('[data-toggle="collapse"]'));

    sectionIds.forEach(id => {
      const panel = document.getElementById(id);
      if (!panel || !root.contains(panel) || panel.classList.contains('show')) return;

      const selector = `#${id}`;
      const trigger = triggers.find(element =>
        element.getAttribute('href') === selector || element.getAttribute('data-target') === selector);
      trigger?.click();
    });
  }

  function restoreEditReturnState(component, state) {
    if (restoreStarted.has(component)) return;

    const activeDoctorId = component.medico?.id_pessoa || null;
    if (state.doctorId && activeDoctorId && String(state.doctorId) !== String(activeDoctorId)) {
      clearEditReturnState();
      return;
    }
    if (typeof component.editar !== 'function' ||
        !component.procedimentos?.medico_procedimento_unidades?.length) return;

    restoreStarted.add(component);
    clearEditReturnState();
    component.$nextTick(() => {
      if (!onRoute() || component._isDestroyed || !component.$el?.isConnected) return;

      expandSavedSections(component, state.expandedSections || []);
      component.editar(cloneJson(state.item));

      // editar() recompõe os controles a partir do registro salvo; reaplique o estado
      // do formulário capturado antes da navegação para manter alterações não salvas.
      if (state.procedimentos) {
        component.$nextTick(() => {
          if (!onRoute() || component._isDestroyed) return;
          component.procedimentos = cloneJson(state.procedimentos);
        });
      }
    });
  }

  function checkAgendasList() {
    if (!onRoute()) {
      const route = window.location.hash.split('?')[0];
      if (route !== AUDIT_ROUTE) clearEditReturnState();
      cachedComponent = null;
      if (readyRetry !== null) {
        window.clearTimeout(readyRetry);
        readyRetry = null;
      }
      return;
    }

    const component = findAgendasComponent();
    if (!component) return;

    if (component.montando) {
      if (readyRetry === null) {
        readyRetry = window.setTimeout(() => {
          readyRetry = null;
          checkAgendasList();
        }, 120);
      }
      return;
    }

    if (!component.medico?.id_pessoa) return;

    if (component.dados !== null) {
      const state = readEditReturnState();
      if (state) restoreEditReturnState(component, state);
      return;
    }

    if (loadRequested.has(component)) return;

    loadRequested.add(component);
    try {
      component.load();
    } catch (error) {
      loadRequested.delete(component);
      throw error;
    }
  }

  document.addEventListener('click', captureEditReturnState, true);
  window.addEventListener('hashchange', () => {
    const route = window.location.hash.split('?')[0];
    if (route !== ROUTE && route !== AUDIT_ROUTE) clearEditReturnState();
  });

  tmRuntime.register('recarregar agendas ao retornar do log', checkAgendasList, [ROUTE]);
})();
