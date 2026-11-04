/* Abrir os fluxos nativos sem retirar o bloqueio da marcação. */
(function () {
  'use strict';
  const CLASS = 'tm-blocked-appointment-actions';
  const owners = new WeakMap();
  const onRoute = () => /^#\/(recepcao|call-center\/confirmacao)(\/|$)/.test(window.location.hash.split('?')[0]);

  function context(cell) {
    if (!cell || cell._isDestroyed || cell.block_editar) return null;
    let owner = null;
    for (let vue = cell; vue; vue = vue.$parent) {
      if (vue.viewonly || vue._isDestroyed) return null;
      if (!owner && typeof vue.remarcar === 'function' && typeof vue.load === 'function') owner = vue;
    }
    const appointment = cell.hor?.marcacao;
    if (!owner || !appointment || !/^[1-9]\d*$/.test(String(appointment.id_marcacao)) ||
        appointment.ch_estado_marcacao !== 'B' || appointment.id_atendimento ||
        appointment.item_status?.valor !== 'bloqueado' ||
        typeof cell.$root?.editar_marcacao !== 'function') return null;
    return { cell, owner, appointment, id: String(appointment.id_marcacao) };
  }

  function update() {
    const active = new Set();
    if (onRoute()) document.querySelectorAll('.dashcard').forEach(card => {
      if (card.closest('.modal')) return;
      const cell = Array.from(card.querySelectorAll('*')).map(node => node.__vue__)
        .find(vue => vue?.$options?._componentTag === 'celula-horarios-marcacao');
      const ctx = context(cell);
      const menu = card.querySelector('.dropleft .dropdown-menu');
      if (!ctx || !menu || cell.$el.closest('.dashcard') !== card) return;
      let group = menu.querySelector(`.${CLASS}`);
      if (!group) {
        group = document.createElement('div'); group.className = CLASS;
        for (const [action, text] of [['edit', 'Editar marcação'], ['reschedule', 'Remarcar']]) {
          const button = document.createElement('button'); button.type = 'button';
          button.className = 'dropdown-item'; button.textContent = text;
          button.dataset.tmBlockedAction = action; group.appendChild(button);
        }
        menu.appendChild(group);
      }
      owners.set(group, ctx); active.add(group);
    });
    document.querySelectorAll(`.${CLASS}`).forEach(group => {
      if (!active.has(group)) { owners.delete(group); group.remove(); }
    });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-tm-blocked-action]');
    const group = button?.closest(`.${CLASS}`);
    const previous = group && owners.get(group);
    if (!previous) return;
    event.preventDefault();
    if (!onRoute()) return;
    const ctx = context(previous.cell);
    // Vue reaproveita cards: nunca abrir a marcação anterior após uma troca da lista.
    if (!ctx || ctx.id !== previous.id ||
        ctx.cell.$el.closest('.dashcard') !== group.closest('.dashcard')) {
      tmRuntime.schedule(0); return;
    }
    try {
      if (button.dataset.tmBlockedAction === 'reschedule') ctx.owner.remarcar(ctx.appointment);
      else if (button.dataset.tmBlockedAction === 'edit') {
        ctx.cell.$root.editar_marcacao(ctx.appointment.id_marcacao, () => ctx.owner.load(false), {
          remarcar: appointment => ctx.owner.remarcar(appointment)
        });
      }
    } catch (_) {
      ctx.owner.$toast?.add({ severity: 'warn', summary: 'Atenção',
        detail: 'Não foi possível abrir a marcação. Atualize a listagem e tente novamente.', life: 5000 });
    }
  });
  tmRuntime.register('ações em marcações bloqueadas', update, ['#/recepcao', '#/call-center/confirmacao']);
})();
