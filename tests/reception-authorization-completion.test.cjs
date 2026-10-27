const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const filename = path.join(__dirname, '..', 'src', '27-recepcao-concluir-status-autorizacao.js');

function helpers(extra = {}) {
  const code = fs.readFileSync(filename, 'utf8');
  const context = vm.createContext({ ELIGIBLE: new Set(['0', '2', '11']),
    completionIntents: new WeakMap(), firstVisits: new WeakMap(), ...extra });
  vm.runInContext(code.slice(code.indexOf('  function positiveId('),
    code.indexOf('  function findReceptionWorkflow(')), context);
  return context;
}

function fixture({ primary = 0, secondary = 11, failStore = 0, procedures = [100] } = {}) {
  let record = { id_solicitacao_autorizacao: 20, id_procedimento: 100, in_status: primary,
    st_codigo_autorizacao: 'preservar', dt_autorizacao: '2026-10-01',
    js_secundarios: [{ id_procedimento: 200, in_status: secondary, in_quantidade: 3 }] };
  const context = { appointmentId: '1', attendanceId: '10', authorizationId: '20' };
  const appointment = { id_marcacao: 1, id_atendimento: 10, id_solicitacao_autorizacao: 20,
    item_status: { etapas: { e1: false, e2: false, e8: false } },
    atendimento: { id_atendimento: 10,
      atendimento_procedimentos: procedures.map(id_procedimento => ({ id_procedimento, fl_ativo: true })) } };
  const stores = [], calls = [];
  const axios = { post: async (_url, body) => {
    const q = body.q[0]; calls.push(q.name);
    if (q.name === 'marcacoes.show') return { data: { item: { status: 200, data: structuredClone(appointment) } } };
    if (q.name === 'solicitacao_autorizacoes.index') return { data: { lista: { status: 200,
      data: [structuredClone(record)] } } };
    if (q.name === 'solicitacao_autorizacoes.marcar_envio') {
      assert.equal(q.parms.envio, true);
      record.dt_envio = '2026-10-27 00:00:00'; record.id_usuario_envio = 7;
      record.in_status = 6;
      return { data: { atualizar: { status: 200 } } };
    }
    stores.push(structuredClone(q.parms));
    if (stores.length === failStore) return { data: { atualizar: { status: 422 } } };
    record = structuredClone(q.parms);
    return { data: { atualizar: { status: 200, data: record } } };
  } };
  return { context, appointment, axios, stores, calls, record: () => record };
}

test('Concluir registra Enviado e depois Em Sessão preservando outros procedimentos e campos', async () => {
  const f = fixture();
  const result = await helpers().transitionAuthorization(f.axios, f.context);
  assert.equal(result.changed, true);
  assert.deepEqual(f.stores.map(x => x.in_status), [6, 10]);
  assert.deepEqual(f.stores.map(x => x.js_secundarios[0].in_status), [11, 11]);
  assert.ok(f.stores.every(x => x.st_codigo_autorizacao === 'preservar' && x.dt_autorizacao === '2026-10-01'));
  assert.equal(f.calls.filter(x => x === 'solicitacao_autorizacoes.index').length, 4);
  assert.ok(f.calls.indexOf('solicitacao_autorizacoes.marcar_envio') > f.calls.indexOf('solicitacao_autorizacoes.store'));
  assert.ok(f.record().dt_envio);
  assert.equal(f.record().id_usuario_envio, 7);
});

test('procedimento secundário deste agendamento muda sem alterar o principal', async () => {
  const f = fixture({ procedures: [200] });
  Object.assign(f.record(), { dt_envio: '2026-10-01 00:00:00', id_usuario_envio: 9 });
  await helpers().transitionAuthorization(f.axios, f.context);
  assert.deepEqual(f.stores.map(x => x.in_status), [0, 0]);
  assert.deepEqual(f.stores.map(x => x.js_secundarios[0].in_status), [6, 10]);
});

test('somente Aberto, Em análise e Pendente participam da sequência', async () => {
  for (const status of [0, 2, 11]) {
    const f = fixture({ primary: status });
    await helpers().transitionAuthorization(f.axios, f.context);
    assert.equal(f.stores.length, 2);
  }
  for (const status of [1, 3, 4, 5, 6, 9, 10, 12, null, '']) {
    const f = fixture({ primary: status });
    assert.equal((await helpers().transitionAuthorization(f.axios, f.context)).changed, false);
    assert.equal(f.stores.length, 0);
  }
});

test('falha em Enviado impede Em Sessão; falha posterior preserva informação de gravação parcial', async () => {
  for (const failStore of [1, 2]) {
    const f = fixture({ failStore });
    await assert.rejects(helpers().transitionAuthorization(f.axios, f.context), error => {
      assert.equal(!!error.sentStored, failStore === 2);
      return true;
    });
    assert.equal(f.stores.length, failStore);
  }
});

test('mudança concorrente do item após Enviado não é sobrescrita', async () => {
  const f = fixture();
  const post = f.axios.post;
  f.axios.post = async (...args) => {
    if (args[1].q[0].name === 'solicitacao_autorizacoes.index' && f.stores.length === 1) f.record().in_status = 1;
    return post(...args);
  };
  await assert.rejects(helpers().transitionAuthorization(f.axios, f.context));
  assert.equal(f.stores.length, 1);
  assert.equal(f.record().in_status, 1);
});

test('mesmo ID de procedimento repetido na autorização impede associação ambígua', async () => {
  const f = fixture();
  f.record().js_secundarios[0].id_procedimento = 100;
  await assert.rejects(helpers().transitionAuthorization(f.axios, f.context));
  assert.equal(f.stores.length, 0);
});

test('vínculo ou atendimento divergente interrompe a atualização', async () => {
  for (const key of ['id_atendimento', 'id_solicitacao_autorizacao']) {
    const f = fixture(); f.appointment[key] = 999;
    await assert.rejects(helpers().transitionAuthorization(f.axios, f.context));
    assert.equal(f.stores.length, 0);
  }
});

test('gatilho depende do callback nativo de sucesso e não de imprimir ou fechar o modal', () => {
  const completed = [];
  const contexts = new WeakMap();
  const util = { atualizar(_component, options) { this.last = options; } };
  const guide = { print(imprimindo, modal) {
    util.atualizar(this, { service: 'guias', func: 'set_numero_atribuido',
      dados: { imprimindo }, callback() {} });
  }, lista: [{ id_guia: 1 }], marcacao: { id_marcacao: 1 } };
  const workflow = { etapa: 8, $refs: { listaguias: guide }, $util: util,
    abrir(a) { this.marcacao = a; },
    marcacao: { id_marcacao: 1, id_atendimento: 10, id_solicitacao_autorizacao: 20,
      item_status: { etapas: { e1: false, e2: false, e8: false } } } };
  const c = helpers({ completionIntents: contexts,
    queueCompletion: snapshot => completed.push(snapshot) });
  c.installCompletionHook(workflow);
  workflow.abrir(workflow.marcacao, 1);
  guide.print(true, null); util.last.callback();
  assert.equal(completed.length, 0);
  guide.print(false, 'iniciarAtendimentoModal');
  assert.equal(completed.length, 0);
  util.last.callback();
  assert.equal(completed.length, 1);
  assert.equal(completed[0].authorizationId, '20');
  workflow.etapa = 2;
  guide.print(false, 'iniciarAtendimentoModal'); util.last.callback();
  assert.equal(completed.length, 1);
});

test('segunda gravação preserva mudanças recentes nos itens fora do agendamento', async () => {
  const f = fixture();
  await helpers().transitionAuthorization(f.axios, f.context, { onStored() {
    if (f.stores.length === 1) {
      f.record().js_secundarios[0].in_status = 1;
      f.record().st_codigo_autorizacao = 'atualizado-no-servidor';
    }
  } });
  assert.equal(f.stores[1].js_secundarios[0].in_status, 1);
  assert.equal(f.stores[1].st_codigo_autorizacao, 'atualizado-no-servidor');
});

test('procedimento excluído do atendimento não sofre alteração de status', async () => {
  const f = fixture({ procedures: [100, 200] });
  f.appointment.atendimento.atendimento_procedimentos[1].excluido = true;
  await helpers().transitionAuthorization(f.axios, f.context);
  assert.equal(f.stores[1].js_secundarios[0].in_status, 11);
});

async function runHookIntegration({ stale = false } = {}) {
  const f = fixture();
  const localAppointment = structuredClone(f.appointment);
  if (stale) f.appointment.item_status.etapas.e1 = true;
  let register, locks = 0, invalidations = 0;
  const messages = [];
  const util = { atualizar(_component, config) { config.callback?.(); } };
  const guide = { lista: [{ id_guia: 1 }], marcacao: localAppointment,
    print(imprimindo) { util.atualizar(this, { service: 'guias', func: 'set_numero_atribuido',
      dados: { imprimindo }, callback() {} }); } };
  const workflow = { etapa: 8, marcacao: localAppointment, axios: f.axios,
    abrir(a) { this.marcacao = a; },
    $refs: { listaguias: guide }, $util: util, $store: { state: { user: { id_usuario: 7 } } },
    $toast: { add: item => messages.push(item) } };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { console,
    navigator: { locks: { async request(_name, job) { locks++; return job(); } } },
    window: { location: { hash: '#/recepcao' } },
    document: { getElementById: () => ({ __vue__: { $refs: { ini_atd: workflow } } }),
      dispatchEvent() { invalidations++; } },
    CustomEvent: class {}, tmRuntime: { register(_name, job) { register = job; } } });
  register();
  workflow.abrir(localAppointment, 1);
  guide.print(false, 'iniciarAtendimentoModal');
  guide.print(false, 'iniciarAtendimentoModal');
  await new Promise(resolve => setImmediate(resolve));
  return { f, locks, invalidations, messages };
}

test('duplo clique concluído só executa uma sequência sob trava e atualiza as badges', async () => {
  const { f, locks, invalidations, messages } = await runHookIntegration();
  assert.equal(locks, 1);
  assert.equal(f.stores.length, 2);
  assert.equal(invalidations, 2);
  assert.equal(messages[0].severity, 'success');
});

test('histórico consultado no servidor impede armar a partir de uma lista desatualizada', async () => {
  const { f, locks, invalidations } = await runHookIntegration({ stale: true });
  assert.equal(locks, 0);
  assert.equal(invalidations, 0);
  assert.equal(f.stores.length, 0);
});

function hookFixture() {
  const completed = [];
  const util = { atualizar(_component, config) { this.last = config; } };
  const appointment = fixture().appointment;
  const guide = { lista: [{}], marcacao: appointment, print(imprimindo) {
    util.atualizar(this, { service: 'guias', func: 'set_numero_atribuido',
      dados: { imprimindo }, callback() {} });
  } };
  const workflow = { etapa: 8, marcacao: appointment, $refs: { listaguias: guide }, $util: util,
    abrir(a, _step, _local, callback) { this.marcacao = a; guide.marcacao = a; callback?.(); } };
  helpers({ queueCompletion: context => completed.push(context) }).installCompletionHook(workflow);
  return { workflow, appointment, guide, util, completed, conclude() {
    guide.print(false, 'iniciarAtendimentoModal'); util.last.callback();
  } };
}

test('reabrir qualquer etapa de um atendimento já manipulado não rearma a automação', () => {
  for (const step of [1, 2, 8]) {
    for (const done of ['e1', 'e2', 'e8']) {
      const f = hookFixture(); f.appointment.item_status.etapas[done] = true;
      f.workflow.abrir(f.appointment, step); f.conclude();
      assert.equal(f.completed.length, 0, `${step}/${done}`);
    }
  }
});

test('histórico de progresso concluído, cancelamento, finalização ou dados desconhecidos impedem armar', () => {
  for (const mutate of [
    a => { a.atendimento.progresso_atendimentos = [{ id_etapa_atendimento: 8, dt_conclusao: '2026-10-27', fl_ativo: true }]; },
    a => { a.item_status.finalizado = true; },
    a => { a.item_status.valor = 'cancelado'; },
    a => { delete a.item_status; }
  ]) {
    const f = hookFixture(); mutate(f.appointment);
    f.workflow.abrir(f.appointment, 1); f.conclude();
    assert.equal(f.completed.length, 0);
  }
});

test('apenas abrir via Iniciar arma; recursão interna preserva a primeira visita e sucesso a consome', () => {
  const f = hookFixture();
  f.conclude(); assert.equal(f.completed.length, 0);
  f.workflow.abrir(f.appointment, 8); f.conclude(); assert.equal(f.completed.length, 0);
  f.workflow.abrir(f.appointment, 1);
  f.appointment.item_status.etapas.e1 = true;
  f.workflow.abrir(f.appointment, 1, null, () => {});
  f.conclude(); f.util.last.callback(); f.conclude();
  assert.equal(f.completed.length, 1);
  f.appointment.item_status.etapas.e8 = true;
  f.workflow.abrir(f.appointment, 1); f.conclude();
  assert.equal(f.completed.length, 1);
});

test('falha no registro nativo de envio impede Em Sessão', async () => {
  const f = fixture(); const original = f.axios.post;
  f.axios.post = (...args) => args[1].q[0].name.endsWith('.marcar_envio')
    ? Promise.resolve({ data: { atualizar: { status: 422 } } }) : original(...args);
  await assert.rejects(helpers().transitionAuthorization(f.axios, f.context));
  assert.equal(f.stores.length, 1);
});

test('resposta positiva sem data e usuário persistidos não permite Em Sessão', async () => {
  const f = fixture(); const original = f.axios.post;
  f.axios.post = (...args) => args[1].q[0].name.endsWith('.marcar_envio')
    ? Promise.resolve({ data: { atualizar: { status: 200 } } }) : original(...args);
  await assert.rejects(helpers().transitionAuthorization(f.axios, f.context));
  assert.equal(f.stores.length, 1);
});

test('envio já registrado conserva a data e o usuário sem chamar marcar_envio novamente', async () => {
  const f = fixture();
  Object.assign(f.record(), { dt_envio: '2026-10-01 00:00:00', id_usuario_envio: 9 });
  await helpers().transitionAuthorization(f.axios, f.context);
  assert.ok(!f.calls.some(x => x.endsWith('.marcar_envio')));
  assert.equal(f.record().dt_envio, '2026-10-01 00:00:00');
  assert.equal(f.record().id_usuario_envio, 9);
});

test('secundário sem envio registrado não usa ação global que alteraria o principal protegido', async () => {
  for (const primary of [1, 3, 5, 9, 10, 12]) {
    const f = fixture({ primary, procedures: [200] });
    await assert.rejects(helpers().transitionAuthorization(f.axios, f.context), /compartilhada/);
    assert.equal(f.record().in_status, primary);
    assert.equal(f.record().js_secundarios[0].in_status, 11);
    assert.equal(f.stores.length, 0);
    assert.ok(!f.calls.some(x => x.endsWith('.marcar_envio')));
  }
});

test('perda dos metadados na gravação final é sinalizada como falha parcial', async () => {
  const f = fixture(); const original = f.axios.post;
  f.axios.post = async (...args) => {
    const result = await original(...args);
    if (f.stores.length === 2) f.record().dt_envio = null;
    return result;
  };
  await assert.rejects(helpers().transitionAuthorization(f.axios, f.context), error =>
    error.sentStored === true && error.sessionStored === true);
});
