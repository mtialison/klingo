const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const filename = path.join(__dirname, '..', 'src', '25-recepcao-status-autorizacao.js');

function helpers(extra = {}) {
  const source = fs.readFileSync(filename, 'utf8');
  const start = source.indexOf('  function authorizationId(');
  const end = source.indexOf('  function injectStyle(', start);
  const context = vm.createContext({ BATCH_SIZE: 10, console, ...extra });
  vm.runInContext(source.slice(start, end), context);
  return context;
}

test('vínculo usa o ID da autorização do agendamento, sem inferir por paciente', () => {
  const c = helpers();
  assert.equal(c.authorizationId({ id_paciente: 22 }), '');
  assert.equal(c.authorizationId({ id_solicitacao_autorizacao: null }), '');
  assert.equal(c.authorizationId({ id_solicitacao_autorizacao: 0 }), '');
  assert.equal(c.authorizationId({ id_solicitacao_autorizacao: 47 }), '47');
  assert.equal(c.authorizationId({ id_solicitacao_autorizacao: '48' }), '48');
});

test('consulta agrupada deduplica vínculos e mantém as cores e textos nativos', async () => {
  const c = helpers();
  let active = 0, maximum = 0;
  const calls = [];
  const axios = { post: async (_url, body) => {
    calls.push(body.q);
    active++; maximum = Math.max(active, maximum);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return { data: Object.fromEntries(body.q.map(query => [query.id, { status: 200,
      data: { id_solicitacao_autorizacao: query.parms.id,
        status_solicitacao: { msg: 'Em Sessão', color: 'success' } } }])) };
  } };
  const ids = Array.from({ length: 25 }, (_, i) => String(i + 1));
  const statuses = await c.fetchAuthorizationStatuses(axios, [...ids, '1', '2'], {});
  assert.equal(statuses.size, 25);
  assert.equal(calls.length, 3);
  assert.ok(maximum <= 2);
  assert.equal(statuses.get('1').msg, 'Em Sessão');
  assert.equal(statuses.get('1').color, 'success');
  assert.ok(calls.every(batch => batch.length <= 10));
});

test('resposta com ID errado ou erro não cria status de autorização falso', async () => {
  const c = helpers();
  const axios = { post: async () => ({ data: {
    authorization_0: { status: 200, data: { id_solicitacao_autorizacao: 99,
      status_solicitacao: { msg: 'Autorizado', color: 'success' } } },
    authorization_1: { status: 403 }
  } }) };
  const statuses = await c.fetchAuthorizationStatuses(axios, ['1', '2'], {});
  assert.equal(statuses.size, 0);
});

test('badge aciona o método nativo com o agendamento correto e impede ação do card', () => {
  const opened = [];
  const appointment = { id_marcacao: 55, id_solicitacao_autorizacao: 47 };
  const c = helpers({ buttonBindings: new WeakMap() });
  const button = {};
  let prevented = 0, stopped = 0;
  c.bindAuthorizationButton(button, { ver_autorizacao: item => opened.push(item) }, appointment);
  button.onclick({ preventDefault: () => prevented++, stopPropagation: () => stopped++ });
  assert.equal(opened[0], appointment);
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
});

test('badge reciclada acompanha o novo agendamento e não abre vínculo antigo', () => {
  const opened = [];
  const c = helpers({ buttonBindings: new WeakMap() });
  const button = {};
  const first = { id_marcacao: 1, id_solicitacao_autorizacao: 10 };
  const second = { id_marcacao: 2, id_solicitacao_autorizacao: 20 };
  const vue = { ver_autorizacao: item => opened.push(item) };
  c.bindAuthorizationButton(button, vue, first);
  c.bindAuthorizationButton(button, vue, second);
  button.onclick({ preventDefault() {}, stopPropagation() {} });
  assert.equal(opened[0], second);
});
