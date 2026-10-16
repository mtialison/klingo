/* =========================
   CALL CENTER - TEXTO DE COPIAR RESUMO
========================= */
(function () {
  'use strict';

  const SEPARATOR = '----------------------------------';
  const UNIT_REFERENCES = {
    SAMEC: 'A clínica está localizada na rua do fórum regional de Bangu e ao lado da CIA do Médico.',
    BANGU: 'A clínica está localizada no prédio comercial Centro Profissional de Bangu, ao lado da casa lotérica e próximo ao ponto final do ônibus 864',
    BARRA: 'Unidade localizada próxima à concessionária Mercedes-Benz em frente ao Shopping Downtown | (Estação BRT - Bosque Marapendi)',
    COPACABANA: 'Unidade localizada ao lado da Brinka Brinquedos, entre a rua Bolivar e Barão de Ipanema, próximo ao antigo cinema Roxy | (Estação Metro - Canta Galo)'
  };

  function clean(value) {
    return String(value ?? '').trim();
  }

  function getSummaryComponent(button) {
    for (let node = button; node; node = node.parentElement) {
      const component = node.__vue__;
      if (component?.$options?.methods?.copiar_resumo && component.resumo) {
        return component;
      }
    }
    return null;
  }

  function formatAddress(address) {
    const street = clean(address?.st_logradouro);
    const number = clean(address?.st_numero);
    const complement = clean(address?.st_complemento);
    const cepDigits = clean(address?.in_cep).replace(/\D/g, '').padStart(8, '0');
    if (!street || !/^\d{8}$/.test(cepDigits)) return '';

    const parts = [street];
    if (number) parts.push(`No. ${number}`);
    if (complement) parts.push(complement);
    return `${parts.join(', ')} - CEP: ${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`;
  }

  function referenceForUnit(name) {
    const normalized = clean(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const unit = Object.keys(UNIT_REFERENCES).find(key =>
      new RegExp(`\\b${key}\\b`).test(normalized));
    return unit ? UNIT_REFERENCES[unit] : '';
  }

  function formatAppointment(item, component) {
    const procedure = clean(item?.procedimento?.search);
    const doctor = clean(item?.medico?.st_nome_exibicao);
    const dateTime = clean(item?.dt_inicio);
    const date = dateTime && component.$util?.getFormatDate?.(dateTime);
    const weekday = dateTime && component.$util?.getFormatDate?.(dateTime, 'dddd');
    const time = dateTime.slice(11, 16);
    if (!procedure || !date || !/^\d{2}:\d{2}$/.test(time) || !weekday) return '';

    return [
      `*️⃣ Procedimento: ${procedure}`,
      `🧑‍⚕️ Profissional: ${doctor}`,
      `📅 Data: ${date} ${time} - ${weekday}`
    ].join('\n');
  }

  function buildSummary(component) {
    const summary = component.resumo;
    const appointments = summary?.lista_resumo;
    const units = summary?.resumo_unidades;
    if (!Array.isArray(appointments) || !appointments.length || !Array.isArray(units)) return '';

    const unitsById = new Map(units
      .filter((unit) => unit?.id_unidade_operacao != null)
      .map((unit) => [String(unit.id_unidade_operacao), unit]));
    const groups = new Map();

    for (const item of appointments) {
      const unitId = item?.id_unidade_operacao ?? item?.unidade_operacao?.id_unidade_operacao;
      if (unitId == null) return '';
      const key = String(unitId);
      const unit = unitsById.get(key);
      const name = clean(unit?.st_nome || item?.unidade_operacao?.st_nome);
      const address = formatAddress(unit?.endereco);
      const appointment = formatAppointment(item, component);
      // Se a unidade não puder ser associada com segurança, manter a cópia nativa.
      if (!unit || !name || !address || !appointment) return '';

      if (!groups.has(key)) groups.set(key, { name, address, reference: referenceForUnit(name), appointments: [] });
      groups.get(key).appointments.push(appointment);
    }

    const patient = clean(summary.paciente?.st_nome || summary.cadastro_temporario?.st_nome) || '---';
    const oneUnit = groups.size === 1;
    const groupTexts = Array.from(groups.values(), (group) => {
      const appointmentsText = group.appointments.join(`\n${SEPARATOR}\n`);
      const unitText = `🏥 Unidade: ${group.name}\n📍 Endereço: ${group.address}` +
        (group.reference ? `\n🚏 Referência: ${group.reference}` : '');
      return `${appointmentsText}\n${oneUnit ? `${SEPARATOR}\n` : ''}${unitText}`;
    });

    return `Agendamento concluído ✅\n\n👤 Paciente: ${patient}\n${SEPARATOR}\n` +
      groupTexts.join(`\n${SEPARATOR}\n`);
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('a.btn.btn-secondary.btn-lg.ml-1')
      : null;
    if (!button || clean(button.textContent) !== 'Copiar Resumo') return;

    const component = getSummaryComponent(button);
    if (!component) return;
    const text = buildSummary(component);
    if (!text) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      component.copiar_texto(text, 'Resumo da marcação copiado!');
    } catch (error) {
      console.error('[TM] Falha ao copiar o resumo personalizado; tentando a cópia original.', error);
      component.copiar_resumo();
    }
  }, true);
})();
