const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/00-request-diagnostics.js'), 'utf8');
function fixture(options = {}) {
  const handlers = [], requestHandlers = [], values = options.values || new Map();
  let run;
  const client = { interceptors: { request: {
    use(fulfilled) { requestHandlers.push(fulfilled); return requestHandlers.length - 1; },
    eject(id) { requestHandlers[id] = null; }
  }, response: {
    use(fulfilled, rejected) { handlers.push({ fulfilled, rejected }); return handlers.length - 1; },
    eject(id) { handlers[id] = null; }
  } } };
  const app = { axios: client, $store: { state: { user: { id_usuario: 7 } } } };
  const window = { app, location: { hash: '#/recepcao' } };
  vm.runInNewContext(source, { window,
    document: { getElementById: () => null, querySelector: () => null },
    sessionStorage: { getItem: key => values.get(key) || null,
      setItem(key, value) { if (options.blocked) throw Error('bloqueado'); values.set(key, value); } },
    GM_info: { script: { version: '1.78' } },
    tmRuntime: { register(_name, callback) { run = callback; } }, console
  });
  const start = () => { run(); assert.equal(handlers.filter(Boolean).length, 1); };
  return { app, window, client, handlers, requestHandlers, values, start, run: () => run(),
    hook: () => handlers.find(Boolean),
    entries: () => [...values.values()].flatMap(value => JSON.parse(value)) };
}
function config(extra = {}) {
  return { method: 'post', url: '/aql?token=SEGREDO',
    headers: { Authorization: 'TOKEN-PRIVADO' },
    data: JSON.stringify({ q: [{ name: 'agendas.index', id: 'lista', parms: {
      nome: 'PACIENTE PRIVADO', cpf: '123.456.789-00', celular: '21999999999', search: 'BUSCA PRIVADA'
    } }] }), ...extra };
}
function serverError(extra = {}) {
  return Object.assign(new Error('Server Error PACIENTE PRIVADO'), {
    config: config(extra), response: { status: 500, data: { message: 'PACIENTE PRIVADO' } }
  });
}

test('registra HTTP500 resolvido como Error pelo interceptor nativo e devolve o mesmo valor', () => {
  const f = fixture(); f.start(); const error = serverError({ tmFeature: 'reception-authorization-badge' });
  assert.equal(f.hook().fulfilled(error), error);
  const [entry] = f.entries();
  assert.equal(entry.httpStatus, 500); assert.equal(entry.origin, 'userscript');
  assert.equal(entry.feature, 'reception-authorization-badge');
  assert.deepEqual(entry.queries, ['agendas.index']); assert.equal(entry.module, 'recepcao');
  assert.equal(entry.version, '1.78');
  const text = JSON.stringify([...f.values]);
  assert.doesNotMatch(text, /PRIVADO|SEGREDO|123\.456|219999|Authorization|message|headers|parms/);
});

test('rejeição continua rejeitada com a mesma identidade do erro', async () => {
  const f = fixture(); f.start(); const error = serverError();
  await assert.rejects(f.hook().rejected(error), received => received === error);
  assert.equal(f.entries().length, 1); assert.equal(f.entries()[0].origin, 'unmarked');
});

test('registra Server Error literal mesmo quando o cliente não fornece status', () => {
  const f = fixture(); f.start(); const error = new Error('Server Error');
  error.config = config(); assert.equal(f.hook().fulfilled(error), error);
  assert.equal(f.entries().length, 1); assert.equal(f.entries()[0].httpStatus, 0);
  assert.deepEqual(f.entries()[0].queries, ['agendas.index']);
});

test('HTTP200 com falha AQL registra só as consultas que falharam, sem conteúdo', () => {
  const f = fixture(); f.start();
  const response = { status: 200, config: config({ data: { q: [
    { id: 'ok', name: 'pacientes.show' }, { id: 'fail', name: 'marcacoes.show' }
  ] } }), data: { ok: { status: 200 }, fail: { status: 500, data: { msg: 'PRIVADO' } } } };
  assert.equal(f.hook().fulfilled(response), response);
  assert.deepEqual(f.entries()[0].aqlStatus, [500]);
  assert.deepEqual(f.entries()[0].queries, ['marcacoes.show']);
});

test('sucesso, cancelamento, validação400 e erro de rede sem5xx não geram falso ServerError', async () => {
  const f = fixture(); f.start();
  for (const response of [{ status: 200, config: config(), data: {} },
    { message: '#BC#', __CANCEL__: true }, { response: { status: 400 }, config: config() },
    new Error('Network Error')]) assert.equal(f.hook().fulfilled(response), response);
  assert.equal(f.entries().length, 0);
});

test('reconhece os marcadores já existentes de calendário e sinalizadores', () => {
  const f = fixture(); f.start();
  f.hook().fulfilled(serverError({ tmAppointmentCalendar: true }));
  f.hook().fulfilled(serverError({ tmDayFlags: true }));
  assert.deepEqual(f.entries().map(x => x.feature), ['appointment-calendar', 'callcenter-day-flags']);
});

test('limita histórico a40 erros e continua disponível em recarregamento', () => {
  const f = fixture(); f.start();
  for (let i = 0; i < 50; i++) f.hook().fulfilled(serverError());
  assert.equal(f.entries().length, 40);
  const reload = fixture({ values: f.values }); reload.start(); reload.hook().fulfilled(serverError());
  assert.equal(reload.entries().length, 40);
});

test('não duplica interceptores e separa contas, ignorando respostas da conta anterior', () => {
  const f = fixture(); f.start(); f.start(); assert.equal(f.handlers.length, 1);
  const previous = f.hook(); previous.fulfilled(serverError());
  f.app.$store.state.user.id_usuario = 8; f.run();
  previous.fulfilled(serverError()); f.hook().fulfilled(serverError());
  assert.equal(f.handlers.filter(Boolean).length, 1);
  assert.equal(f.values.size, 2); assert.deepEqual([...f.values.values()].map(x => JSON.parse(x).length), [1, 1]);
});

test('falhas do armazenamento, JSON corrompido e dados incomuns não alteram a resposta', () => {
  const f = fixture({ blocked: true }); f.start(); const error = serverError();
  assert.equal(f.hook().fulfilled(error), error);
  const normal = fixture(); normal.start(); normal.hook().fulfilled(serverError());
  const key = [...normal.values.keys()][0]; normal.values.set(key, '{invalido');
  assert.equal(normal.hook().fulfilled(error), error); assert.equal(normal.entries().length, 1);
  assert.doesNotThrow(() => normal.hook().fulfilled(null));
});

test('metadados desconhecidos e parâmetros da rota não guardam dados pessoais', () => {
  const f = fixture(); f.start(); f.window.location.hash = '#/pacientes/123?nome=PACIENTE-PRIVADO';
  f.hook().fulfilled(serverError({ tmFeature: 'NOME-PRIVADO' }));
  const [entry] = f.entries(); assert.equal(entry.module, 'pacientes');
  assert.equal(entry.origin, 'unmarked'); assert.equal(entry.feature, '');
  assert.doesNotMatch(JSON.stringify(entry), /PRIVADO|pacientes\/123|nome=/);
});

test('registra o módulo no início da consulta e preserva configuração e payload', () => {
  const f = fixture(); f.start(); const error = serverError();
  assert.equal(typeof f.requestHandlers[0], 'function');
  const before = JSON.stringify(error.config);
  assert.equal(f.requestHandlers[0](error.config), error.config);
  assert.equal(JSON.stringify(error.config), before);
  f.window.location.hash = '#/autorizacoes';
  f.hook().fulfilled(error); assert.equal(f.entries()[0].module, 'recepcao');
  f.app.$store.state.user.id_usuario = 8; f.run();
  assert.equal(f.requestHandlers.filter(Boolean).length, 1);
});

test('ao reaproveitar histórico, descarta conteúdo estranho fora da whitelist', () => {
  const f = fixture(); f.start(); f.hook().fulfilled(serverError());
  const key = [...f.values.keys()][0], [seed] = f.entries();
  f.values.set(key, JSON.stringify([{ ...seed, patient: 'PRIVADO', headers: { token: 'SEGREDO' },
    queries: ['pacientes.show', '(21)99999-9999', 'NOME PACIENTE'] }]));
  f.hook().fulfilled(serverError());
  assert.doesNotMatch(f.values.get(key), /PRIVADO|SEGREDO|99999|NOME PACIENTE|headers|patient/);
});
