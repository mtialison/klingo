const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const filename = path.join(__dirname, '..', 'src', '27-recepcao-concluir-status-autorizacao.js');

function helpers(extra = {}) {
  const code = fs.readFileSync(filename, 'utf8');
  const context = vm.createContext({ ELIGIBLE: new Set(['0', '2', '11']),
    completionIntents: new WeakMap(), ...extra });
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
    atendimento: { id_atendimento: 10,
      atendimento_procedimentos: procedures.map(id_procedimento => ({ id_procedimento, fl_ativo: true })) } };
  const stores = [], calls = [];
  const axios = { post: async (_url, body) => {
    const q = body.q[0]; calls.push(q.name);
    if (q.name === 'marcacoes.show') return { data: { item: { status: 200, data: appointment } } };
    if (q.name === 'solicitacao_autorizacoes.index') return { data: { lista: { status: 200,
      data: [structuredClone(record)] } } };
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
  assert.equal(f.calls.filter(x => x === 'solicitacao_autorizacoes.index').length, 3);
});

test('procedimento secundário deste agendamento muda sem alterar o principal', async () => {
  const f = fixture({ procedures: [200] });
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
    marcacao: { id_marcacao: 1, id_atendimento: 10, id_solicitacao_autorizacao: 20 } };
  const c = helpers({ completionIntents: contexts,
    queueCompletion: snapshot => completed.push(snapshot) });
  c.installCompletionHook(workflow);
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

test('duplo clique concluído só executa uma sequência sob trava e atualiza as badges', async () => {
  const f = fixture();
  let register, locks = 0, invalidations = 0;
  const messages = [];
  const util = { atualizar(_component, config) { config.callback?.(); } };
  const guide = { lista: [{ id_guia: 1 }], marcacao: f.appointment,
    print(imprimindo) { util.atualizar(this, { service: 'guias', func: 'set_numero_atribuido',
      dados: { imprimindo }, callback() {} }); } };
  const workflow = { etapa: 8, marcacao: f.appointment, axios: f.axios,
    $refs: { listaguias: guide }, $util: util, $store: { state: { user: { id_usuario: 7 } } },
    $toast: { add: item => messages.push(item) } };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { console,
    navigator: { locks: { async request(_name, job) { locks++; return job(); } } },
    window: { location: { hash: '#/recepcao' } },
    document: { getElementById: () => ({ __vue__: { $refs: { ini_atd: workflow } } }),
      dispatchEvent() { invalidations++; } },
    CustomEvent: class {}, tmRuntime: { register(_name, job) { register = job; } } });
  register();
  guide.print(false, 'iniciarAtendimentoModal');
  guide.print(false, 'iniciarAtendimentoModal');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(locks, 1);
  assert.equal(f.stores.length, 2);
  assert.equal(invalidations, 2);
  assert.equal(messages[0].severity, 'success');
});
