/* Remarcação nativa sobre a listagem, sem trocar a rota da Recepção/Confirmação. */
(function () {
  'use strict';
  const ID = 'tm-reschedule-modal';
  const FILTERS = ['medico', 'referencia', 'referencia_fim', 'refUnidOper', 'status', 'status_confirmacao',
    'turno', 'search', 'especialidade', 'paciente', 'page', 'filtro_lista_medicos', 'viewEspec', 'viewStatus',
    'viewMode', 'tipo_proced', 'faixa_hora', 'block_view_pacotes', 'filtro_teleatend', 'apenas_editados', 'id_fila_laudo'];
  let patch = null, bridge = null, active = null;
  const onRoute = () => /^#\/(recepcao|call-center\/confirmacao)(\/|$)/.test(window.location.hash.split('?')[0]);
  const context = origin => [origin.$store.state.user?.id_usuario || '', origin.unidade_operacao ?? origin.refUnidOper ?? '',
    origin.$util?.getCookie?.('id_recepcao') || ''].join(':');
  function originVue() {
    for (let node = document.getElementById('refresh-button'); node; node = node.parentElement) {
      const v = node.__vue__;
      if (typeof v?.load === 'function' && (v.$refs?.ini_atd || v.$options?.components?.Marcacao)) return v;
    }
    return null;
  }
  function snapshot(origin) {
    const filters = {};
    for (const key of FILTERS) {
      const computed = origin.$options.computed?.[key];
      if (key in origin && (!computed || typeof computed.set === 'function')) filters[key] = origin[key];
    }
    const scroll = [];
    for (let e = origin.$el; e; e = e.parentElement) scroll.push([e, e.scrollTop, e.scrollLeft]);
    return { filters, scroll, x: window.scrollX, y: window.scrollY, focus: document.activeElement,
      overflow: document.body.style.overflow, inert: origin.$el.hasAttribute('inert') };
  }
  function restorePosition(s) {
    if (s.origin._isDestroyed || window.location.hash !== s.hash || context(s.origin) !== s.context) return;
    for (const [element, top, left] of s.snapshot.scroll) if (element.isConnected) {
      element.scrollTop = top; element.scrollLeft = left;
    }
    window.scrollTo(s.snapshot.x, s.snapshot.y);
  }
  function restoreRouter() {
    if (!bridge) return;
    const b = bridge; bridge = null; window.clearTimeout(b.timer);
    if (b.vm.$router === b.router) {
      if (b.descriptor) Object.defineProperty(b.vm, '$router', b.descriptor);
      else delete b.vm.$router;
    }
  }
  function hideOwnedModals(s) {
    const root = s.host?.$el;
    for (const element of root?.querySelectorAll('.modal') || []) {
      for (const key of Object.keys(element)) {
        const bs = key.startsWith('jQuery') && element[key]?.['bs.modal'];
        if (bs?._element !== element) continue;
        // Encerramento definitivo desta instância: não deixar backdrop/foco presos à árvore removida.
        element.classList.remove('fade'); bs._backdrop?.classList.remove('fade');
        if (bs._isShown) { bs._isTransitioning = false; bs.hide(); }
        bs._backdrop?.remove();
        break;
      }
    }
    if (!document.querySelector('.modal.show')) document.body.classList.remove('modal-open');
  }
  function maskSourceModals(s) {
    const ids = new Set(Array.from(s.host?.$el?.querySelectorAll('.modal[id]') || [], e => e.id));
    for (const element of s.origin.$el.querySelectorAll('.modal[id]')) {
      if (!ids.has(element.id) || element.classList.contains('show')) continue;
      const id = element.id, replacement = ID + '-source-' + s.masked.length;
      s.masked.push({ element, id, replacement }); element.id = replacement;
    }
  }
  function close(s, force = false) {
    if (!s || active !== s || (s.ui.saving && !force)) return false;
    active = null; s.closed = true;
    const child = s.host?.$refs.booking;
    if (!s.ui.saved && child?.horarios && child.hora_selecionada && typeof child.voltar === 'function') {
      // Mesmo descarte de seleção/reserva temporária usado pelo botão Voltar nativo.
      try { child.voltar(); } catch (error) { console.warn('[TM] Falha ao liberar a seleção temporária.', error); }
    }
    if (child?.aviso_final) window.clearTimeout(child.aviso_final);
    if (child?.tmaInterval) window.clearInterval(child.tmaInterval);
    hideOwnedModals(s);
    s.host?.$destroy(); (s.host?.$el || s.element)?.remove();
    for (const entry of s.masked) if (entry.element.isConnected && entry.element.id === entry.replacement) entry.element.id = entry.id;
    document.body.style.overflow = s.snapshot.overflow;
    if (!s.snapshot.inert) s.origin.$el.removeAttribute('inert');
    if (!s.origin._isDestroyed && window.location.hash === s.hash && context(s.origin) === s.context) {
      for (const [key, value] of Object.entries(s.snapshot.filters)) if (s.origin[key] !== value) s.origin[key] = value;
      if (s.ui.saved) s.origin.load(false);
      s.origin.$nextTick(() => {
        restorePosition(s);
        const focus = s.snapshot.focus;
        if (focus?.isConnected && !focus.closest?.('.modal')) focus.focus({ preventScroll: true });
        else {
          const target = s.origin.$el.querySelector?.('#filtro-medico') || s.origin.$el.querySelector?.('#refresh-button') || s.origin.$el;
          const previous = target.getAttribute('tabindex');
          target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
          if (previous === null) target.removeAttribute('tabindex'); else target.setAttribute('tabindex', previous);
        }
      });
      if (s.ui.saved && s.origin.$watch) {
        let stop, timer;
        const done = () => { stop?.(); window.clearTimeout(timer); s.origin.$nextTick(() => restorePosition(s)); };
        stop = s.origin.$watch(() => s.origin.$store.state.loading, loading => { if (!loading) done(); });
        timer = window.setTimeout(done, 5000);
      }
    }
    return true;
  }
  function style() {
    if (document.getElementById(ID + '-style')) return;
    const el = document.createElement('style'); el.id = ID + '-style';
    el.textContent = `
      #${ID}{position:fixed;inset:0;z-index:1045;background:rgba(0,0,0,.5);padding:16px;
        display:flex;align-items:center;justify-content:center;}
      #${ID}>.tm-reschedule-dialog{width:1500px;max-width:100%;max-height:calc(100dvh - 32px);
        background:#ecf0f5;border-radius:4px;box-shadow:0 8px 32px #0005;display:flex;flex-direction:column;}
      #${ID} .tm-reschedule-header{display:flex;align-items:center;justify-content:space-between;
        padding:12px 16px;background:white;border-bottom:1px solid #dee2e6;flex:0 0 auto;}
      #${ID} .tm-reschedule-content{padding:12px;overflow:auto;max-height:calc(100dvh - 92px);position:relative;}
      #${ID} .tm-reschedule-content>.container{max-width:100%;}
      #${ID} .tm-reschedule-note{padding:0 12px 8px;font-size:.875rem;color:#495057;}
      @media(max-width:575px){#${ID}{padding:6px;}#${ID}>.tm-reschedule-dialog{max-height:calc(100dvh - 12px);}}
    `;
    document.head.appendChild(el);
  }
  function open(origin, location) {
    if (active) return;
    const Native = origin.$options.components?.Marcacao || origin.$refs?.marcacao?.constructor;
    const options = Native?.options || Native, Base = origin.$options._base;
    if (!Native || !Base || typeof options?.methods?.marcar !== 'function') throw new Error('Marcação nativa indisponível.');
    style();
    const ui = Base.observable({ saving: false, saved: false });
    const s = active = { origin, hash: window.location.hash, context: context(origin), snapshot: snapshot(origin), ui, closed: false,
      submitStarted: false, finishing: false, external: false, masked: [] };
    const router = Object.create(origin.$router);
    router.go = () => { if (!s.finishing) close(s); };
    router.push = (...args) => {
      if (s.closed) return Promise.resolve();
      if (s.ui.saving) return Promise.resolve();
      close(s); return origin.$router.push(...args);
    };
    const routeRoot = { _router: router, _route: { ...origin.$route, path: '/call-center', name: 'call-center',
      fullPath: '/call-center', params: { ...location.params } } };
    const Local = {
      extends: Native,
      beforeCreate() {
        const originalAxios = this.axios;
        if (!originalAxios?.post) return;
        const localAxios = Object.create(originalAxios);
        localAxios.post = (...args) => {
          const saving = args[1]?.q?.some(q => q.name === 'agendas.store');
          if (!saving) return originalAxios.post(...args);
          if (s.closed || s.ui.saved) return Promise.reject(new Error('Remarcação já concluída ou encerrada.'));
          if (s.pendingSave) return s.pendingSave;
          s.ui.saving = true;
          try {
            s.pendingSave = Promise.resolve(originalAxios.post(...args)).then(response => {
              if (response?.data?.marcar?.status === 200) s.ui.saved = true;
              return response;
            }).finally(() => {
              s.ui.saving = false; s.submitStarted = false; s.pendingSave = null;
              if (s.external) window.setTimeout(() => close(s, true), 0);
            });
            return s.pendingSave;
          } catch (error) { s.ui.saving = false; s.submitStarted = false; throw error; }
        };
        Object.defineProperty(this, 'axios', { configurable: true, value: localAxios });
      },
      methods: {
        marcar(...args) {
          if (s.closed || s.ui.saved || s.ui.saving || s.submitStarted) return;
          s.submitStarted = true;
          try { return options.methods.marcar.apply(this, args); }
          finally { this.$nextTick(() => { if (!s.ui.saving) s.submitStarted = false; }); }
        },
        avancar_aviso_final(...args) {
          if (s.closed || !s.ui.saved || s.ui.saving) return;
          s.finishing = true;
          try { return options.methods.avancar_aviso_final.apply(this, args); }
          finally { s.finishing = false; Promise.resolve().then(() => close(s)); }
        }
      }
    };
    try {
      const element = s.element = document.createElement('div');
      document.body.insertBefore(element, document.body.firstChild);
      s.origin.$el.setAttribute('inert', ''); document.body.style.overflow = 'hidden';
      s.host = new Base({
        parent: origin.$root,
        beforeCreate() { this._routerRoot = routeRoot; },
        render(h) {
          return h('div', { attrs: { id: ID, role: 'dialog', tabindex: '-1', 'aria-modal': 'true', 'aria-label': 'Remarcar' } }, [
            h('div', { staticClass: 'tm-reschedule-dialog', attrs: { role: 'document' } }, [
              h('div', { staticClass: 'tm-reschedule-header' }, [h('strong', ['Remarcar']),
                h('button', { staticClass: 'close', attrs: { type: 'button', disabled: ui.saving, 'aria-label': 'Fechar remarcação' },
                  on: { click: () => close(s) } }, ['×'])]),
              h('div', { staticClass: 'tm-reschedule-content' }, [h(Local, { ref: 'booking',
                props: { remarcacao: location.params.remarcacao, params: location.params } })]),
              ...(ui.saving ? [h('div', { staticClass: 'tm-reschedule-note', attrs: { role: 'status' } }, ['Salvando remarcação…'])] : [])
            ])
          ]);
        }
      });
      s.host.$mount(element);
      maskSourceModals(s);
      origin.$nextTick(() => { if (active === s && !s.closed) s.host.$el?.focus({ preventScroll: true }); });
    } catch (error) { close(s, true); throw error; }
  }
  function unpatch() {
    restoreRouter();
    if (patch && patch.vm.selecionar === patch.wrapped) patch.vm.selecionar = patch.original;
    patch = null;
  }
  function update() {
    if (active && (!onRoute() || active.hash !== window.location.hash || active.origin._isDestroyed || context(active.origin) !== active.context)) {
      if (active.ui.saving) active.external = true;
      else close(active, true);
    }
    if (active && !active.external) maskSourceModals(active);
    if (!onRoute()) { unpatch(); return; }
    let combo;
    for (let node = document.getElementById('remarcarComboModal'); node; node = node.parentElement) {
      if (typeof node.__vue__?.selecionar === 'function' && node.__vue__?.$options?.methods?.remarcar) { combo = node.__vue__; break; }
    }
    if (!combo || combo._isDestroyed) { unpatch(); return; }
    if (patch?.vm === combo) return;
    unpatch();
    const original = combo.selecionar;
    const wrapped = function (...args) {
      if (active || bridge) return;
      const origin = originVue();
      if (!onRoute() || !origin || this.dados?.cc || this.dados?.infusao) return original.apply(this, args);
      const real = this.$router, descriptor = Object.getOwnPropertyDescriptor(this, '$router');
      const local = Object.create(real);
      local.push = location => {
        restoreRouter();
        if (location?.name !== 'call-center' || !location.params?.remarcacao || !onRoute()) return real.push(location);
        try { open(origin, location); return Promise.resolve(); }
        catch (error) {
          console.error('[TM] Não foi possível abrir a remarcação em modal.', error);
          origin.$toast?.add({ severity: 'error', summary: 'Remarcação', detail: 'Não foi possível abrir a remarcação. Tente novamente.', life: 5000 });
          return Promise.resolve();
        }
      };
      bridge = { vm: this, router: local, descriptor, timer: null };
      Object.defineProperty(this, '$router', { configurable: true, value: local });
      bridge.timer = window.setTimeout(restoreRouter, 2000);
      try { return original.apply(this, args); }
      catch (error) { restoreRouter(); throw error; }
    };
    combo.selecionar = wrapped; patch = { vm: combo, original, wrapped };
  }
  const escape = event => {
    if (!active || document.querySelector('.modal.show')) return;
    if (event.key === 'Tab') {
      const root = active.host?.$el;
      const controls = Array.from(root?.querySelectorAll('a[href],button,input,select,textarea,[tabindex]') || [])
        .filter(e => e.tabIndex >= 0 && !e.disabled && e.getClientRects().length);
      const first = controls[0] || root, last = controls[controls.length - 1] || root;
      if (!root?.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first || document.activeElement === root : document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first)?.focus({ preventScroll: true });
      }
      return;
    }
    if (event.key !== 'Escape') return;
    if (close(active)) { event.preventDefault(); event.stopPropagation(); }
  };
  document.addEventListener('keydown', escape, true);
  tmRuntime.register('remarcação nativa em modal', update);
  return () => { if (active) close(active, true); unpatch(); document.removeEventListener('keydown', escape, true); };
})();
