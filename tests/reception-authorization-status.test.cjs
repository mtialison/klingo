const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const filename = path.join(__dirname, '..', 'src', '25-recepcao-status-autorizacao.js');

function helpers(extra = {}, includeRender = false) {
  const source = fs.readFileSync(filename, 'utf8');
  const start = source.indexOf('  function authorizationId(');
  const end = source.indexOf(includeRender ? '  function ensureReceptionAuthorization(' : '  function injectStyle(', start);
  const context = vm.createContext({ BATCH_SIZE: 10, CACHE_TTL: 30000, buttonBindings: new WeakMap(), console, ...extra });
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

function queue(excluded = [1], extra = {}) {
  return { fl_ativo: true, filtros: excluded.map(model_id => ({
    model_type: 'App\\azure\\operadora', model_id, fl_regra: false, excluido: false })), ...extra };
}

test('regras nativas de fila excluem operadoras, sem usar sinalizador de autorização on-line', async () => {
  const c = helpers();
  const calls = [];
  const axios = { post: async (url, body) => {
    calls.push({ url, body });
    return { data: { rules: { status: 200, data: [queue([1, 7])] } } };
  } };
  const policy = await c.fetchAuthorizationPolicy(axios, {});
  assert.equal(calls[0].body.q[0].name, 'fila_autorizacoes.index');
  assert.equal(c.authorizationApplies({ id_solicitacao_autorizacao: 47,
    plano: { id_operadora: 1 } }, policy), false);
  assert.equal(c.authorizationApplies({ id_solicitacao_autorizacao: 47,
    plano: { id_operadora: 7 } }, policy), false);
  assert.equal(c.authorizationApplies({ id_solicitacao_autorizacao: 47,
    plano: { id_operadora: 8, operadora: { fl_servico_autorizacao: false } } }, policy), true);
});

test('operadora é ocultada somente quando excluída de todas as filas ativas acessíveis', () => {
  const c = helpers();
  const policy = c.authorizationPolicy([queue([1, 7]), queue([1]), queue([9], { fl_ativo: false })]);
  assert.deepEqual([...policy.excludedOperators], ['1']);
  assert.equal(c.authorizationPolicy([]).excludedOperators.size, 0);
  const ignored = queue([], { filtros: [
    { model_type: 'App\\azure\\operadora', model_id: 1, fl_regra: true },
    { model_type: 'App\\azure\\operadora', model_id: 2, fl_regra: false, excluido: true },
    { model_type: 'App\\azure\\procedimento', model_id: 3, fl_regra: false }
  ] });
  assert.equal(c.authorizationPolicy([ignored]).excludedOperators.size, 0);
});

function cardFixture() {
  let slot;
  const create = () => ({ className: '', textContent: '', setAttribute() {},
    appendChild(child) { this.firstElementChild = child; },
    remove() { if (slot === this) slot = undefined; } });
  const timeClasses = new Set();
  const appointment = { id_marcacao: 55, id_plano: 20, id_solicitacao_autorizacao: 47,
    plano: { id_plano: 20, id_operadora: 8 } };
  const cell = { __vue__: { hor: { marcacao: appointment } } };
  const time = { classList: { add: x => timeClasses.add(x), remove: x => timeClasses.delete(x) },
    querySelector: () => cell };
  const row = { querySelector: selector => selector.includes('tm-reception-authorization-slot') ? slot : time,
    insertBefore(value) { slot = value; } };
  const card = { querySelector: () => row };
  const c = helpers({ document: { createElement: create } }, true);
  const state = { policy: c.authorizationPolicy([queue()]),
    cache: new Map([['47', { status: { msg: 'Aberto', color: 'primary' }, at: Date.now() }]]) };
  return { c, appointment, state, card, create, timeClasses, slot: () => slot, render: () => c.renderCard(card, {}, state) };
}

test('trocar plano para operadora excluída remove badge e restaura a coluna de horário mesmo com ID antigo', () => {
  const f = cardFixture();
  f.render(); assert.equal(f.slot().firstElementChild.textContent, 'Aberto');
  f.appointment.id_plano = 30;
  f.appointment.plano = { id_plano: 30, id_operadora: 1 };
  assert.equal(f.render(), '');
  assert.equal(f.slot(), undefined);
  assert.equal(f.timeClasses.has('tm-reception-authorization-time'), false);
  f.state.cache.set('47', { status: { msg: 'Aberto', color: 'primary' }, at: Date.now() });
  f.appointment.autorizacao = { status_solicitacao: { msg: 'Aberto', color: 'primary' } };
  f.render(); assert.equal(f.slot(), undefined); // resposta atrasada ou status nativo antigo não recriam a badge
  f.appointment.id_plano = 40;
  f.appointment.plano = { id_plano: 40, id_operadora: 8 };
  f.render(); assert.equal(f.slot().firstElementChild.textContent, 'Aberto');
});

test('plano em transição e política ainda não carregada não exibem uma badge antiga', () => {
  const f = cardFixture();
  f.render();
  f.appointment.id_plano = 99;
  f.render(); assert.equal(f.slot(), undefined);
  f.appointment.id_plano = 20;
  f.state.policy = null;
  f.render(); assert.equal(f.slot(), undefined);
});

test('runtime reutiliza política após edição e resposta antiga não recria badge da operadora excluída', async () => {
  const f = cardFixture();
  let run, finishStatus, policyCalls = 0, statusCalls = 0;
  const axios = { CancelToken: { source: () => ({ token: {}, cancel() {} }) },
    post: async (_url, body) => {
      if (body.q[0].name === 'fila_autorizacoes.index') {
        policyCalls++;
        return { data: { rules: { status: 200, data: [queue()] } } };
      }
      statusCalls++;
      return new Promise(resolve => { finishStatus = () => resolve({ data: { authorization_0: {
        status: 200, data: { id_solicitacao_autorizacao: 47,
          status_solicitacao: { msg: 'Aberto', color: 'primary' } } } } }); });
    } };
  const vue = { lista: [f.appointment], marcacoes: [], referencia: '2027-10-01', unidade_operacao: 5,
    $store: { state: { user: { id_usuario: 7 } } }, $refs: { ver_autorizacao: {} },
    ver_autorizacao() {}, axios };
  const document = { getElementById: id => id === 'refresh-button' ? { __vue__: vue } : {},
    querySelectorAll: () => [f.card], createElement: f.create, addEventListener() {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { console, document,
    window: { location: { hash: '#/recepcao' } },
    tmRuntime: { register(_name, job) { run = job; }, schedule() {} } });
  run(); await new Promise(resolve => setImmediate(resolve));
  run(); assert.equal(statusCalls, 1);
  f.appointment.id_plano = 30; f.appointment.plano = { id_plano: 30, id_operadora: 1 };
  run(); assert.equal(f.slot(), undefined);
  finishStatus(); await new Promise(resolve => setImmediate(resolve));
  run(); assert.equal(f.slot(), undefined);
  vue.marcacoes = []; // edição salva e listagem nativa recarregada
  run(); assert.equal(f.slot(), undefined);
  assert.equal(policyCalls, 1);
  assert.equal(statusCalls, 1);
});

test('status consultado prevalece sobre incorporado e invalidação exige nova consulta', () => {
  const f = cardFixture();
  f.appointment.autorizacao = { status_solicitacao: { msg: 'Aberto', color: 'primary' } };
  f.state.cache.set('47', { status: { msg: 'Em Sessão', color: 'success' }, at: Date.now() });
  assert.equal(f.render(), '');
  assert.equal(f.slot().firstElementChild.textContent, 'Em Sessão');
  f.state.cache.delete('47');
  assert.equal(f.render(), '47');
});

test('card reaproveitado como horário livre remove badge e vínculo mesmo com resposta atrasada', async () => {
  const f = cardFixture();
  f.card.className = 'dashcard my-2 atendimento-primary bg-white';
  let appointment = f.appointment;
  const freeTime = { classList: { add: name => f.timeClasses.add(name),
    remove: name => f.timeClasses.delete(name) },
    querySelector: () => ({ __vue__: { hor: { marcacao: appointment } } }) };
  const originalRow = f.card.querySelector();
  const nativeQuery = originalRow.querySelector;
  originalRow.querySelector = selector => selector.includes('tm-reception-authorization-slot')
    ? nativeQuery(selector) : freeTime;
  let run, finishStatus, statusCalls = 0;
  const axios = { CancelToken: { source: () => ({ token: {}, cancel() {} }) },
    post: async (_url, body) => {
      if (body.q[0].name === 'fila_autorizacoes.index') {
        return { data: { rules: { status: 200, data: [queue()] } } };
      }
      statusCalls++;
      return new Promise(resolve => { finishStatus = () => resolve({ data: {
        authorization_0: { status: 200, data: { id_solicitacao_autorizacao: 47,
          status_solicitacao: { msg: 'Aberto', color: 'primary' } } }
      } }); });
    }
  };
  const vue = { lista: [f.appointment], marcacoes: [], referencia: '2026-10-30', unidade_operacao: 5,
    $store: { state: { user: { id_usuario: 7 } } }, $refs: { ver_autorizacao: {} },
    ver_autorizacao() { assert.fail('Horário livre não pode abrir autorização antiga.'); }, axios };
  const document = {
    getElementById: id => id === 'refresh-button' ? { __vue__: vue } : {},
    querySelectorAll: selector => {
      // Reproduz o seletor real: a classe atendimento-* some quando o card vira livre.
      if (!f.card.className.includes('dashcard')) return [];
      return selector.includes('[class*="atendimento-"]') && !f.card.className.includes('atendimento-')
        ? [] : [f.card];
    },
    createElement: f.create, addEventListener() {}
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { console, document,
    window: { location: { hash: '#/recepcao' } },
    tmRuntime: { register(_name, job) { run = job; }, schedule() {} } });
  run(); await new Promise(resolve => setImmediate(resolve));
  run();
  assert.ok(f.slot());
  assert.equal(statusCalls, 1);
  // Vue recicla o mesmo DOM; a div adicionada pelo userscript permanece.
  f.card.className = 'dashcard my-2 bg-white';
  appointment = null;
  run();
  assert.equal(f.slot(), undefined);
  assert.equal(f.timeClasses.has('tm-reception-authorization-time'), false);
  finishStatus(); await new Promise(resolve => setImmediate(resolve));
  run();
  assert.equal(f.slot(), undefined);
  assert.equal(statusCalls, 1);
  // O mesmo card pode voltar a representar um agendamento válido depois.
  appointment = f.appointment;
  f.card.className = 'dashcard my-2 atendimento-primary bg-white';
  run();
  assert.equal(f.slot().firstElementChild.textContent, 'Aberto');
});

// Reproduz o interceptor nativo: cancelamentos também passam por handleError;
// apenas a mensagem #BC# é silenciosa, e o interceptor resolve o próprio Error.
function cancellationFixture(withCards = false) {
  const cards = Array.from({ length: Number(withCards) }, (_, i) => {
    const f = cardFixture(); f.appointment.id_solicitacao_autorizacao = 47 + i; return f;
  });
  const notices = [], cancellations = [], requests = [], warnings = [];
  let run, rootAvailable = true;
  const location = { hash: '#/recepcao' };
  const axios = {
    isCancel: error => !!error?.__CANCEL__,
    CancelToken: { source() {
      let cancelled;
      const token = { promise: new Promise(resolve => { cancelled = resolve; }) };
      return { token, cancel(message) {
        if (token.reason) return;
        cancellations.push(message);
        token.reason = Object.assign(new Error(message), { __CANCEL__: true });
        cancelled(token.reason);
      } };
    } },
    post(_url, body, { cancelToken }) {
      return new Promise(resolve => {
        let settled = false;
        const request = { body,
          success(data) { if (!settled) { settled = true; resolve({ data }); } },
          fail(error) {
            if (settled) return;
            settled = true;
            if (error.message !== '#BC#') notices.push(error.message);
            resolve(error); // retorno real do interceptor do Klingo
          }
        };
        requests.push(request);
        if (cancelToken.reason) request.fail(cancelToken.reason);
        else cancelToken.promise.then(request.fail);
      });
    }
  };
  const vue = { lista: [], marcacoes: [], referencia: '2026-10-21', unidade_operacao: 5,
    $store: { state: { user: { id_usuario: 7 } } }, $refs: { ver_autorizacao: {} },
    ver_autorizacao() {}, axios };
  const document = {
    getElementById: id => id === 'refresh-button' ? (rootAvailable ? { __vue__: vue } : null) : {},
    querySelectorAll: () => cards.map(f => f.card), createElement: cards[0]?.create, addEventListener() {}
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { document,
    console: { warn: (...args) => warnings.push(args) }, window: { location },
    tmRuntime: { register(_name, job) { run = job; }, schedule() {} } });
  return { vue, notices, cancellations, requests, warnings, run: () => run(),
    root(value) { rootAvailable = value; },
    leave() { location.hash = '#/call-center/confirmacao'; run(); },
    flush: () => new Promise(resolve => setImmediate(resolve)) };
}

test('remontagem temporária da Recepção cancela a consulta sem toast de saída', async () => {
  const f = cancellationFixture(); f.run();
  f.root(false); f.run(); await f.flush();
  f.root(true); f.run(); assert.equal(f.requests.length, 2);
  f.leave(); await f.flush();
  assert.deepEqual(f.notices, []);
  assert.equal(f.cancellations.length, 2);
});

test('trocas de data e recarga da lista cancelam buscas antigas silenciosamente', async () => {
  const f = cancellationFixture(); f.run();
  for (const date of ['2026-10-22', '2026-10-23', '2026-10-23']) {
    f.vue.referencia = date; f.vue.marcacoes = []; f.run();
  }
  assert.equal(f.requests.length, 4);
  f.leave(); await f.flush();
  assert.deepEqual(f.notices, []);
  assert.equal(f.cancellations.length, 4);
});

test('sair do módulo com consulta pendente não exibe um erro de atendimento', async () => {
  const f = cancellationFixture(); f.run(); f.leave(); await f.flush();
  assert.deepEqual(f.notices, []);
});

test('cancelar consultas paralelas de status também é silencioso', async () => {
  const f = cancellationFixture(11); f.run();
  f.requests[0].success({ rules: { status: 200, data: [queue()] } }); await f.flush();
  f.run(); assert.equal(f.requests.length, 3); // política + dois lotes simultâneos de status
  assert.equal(f.requests[1].body.q.length, 10); assert.equal(f.requests[2].body.q.length, 1);
  f.root(false); f.run(); await f.flush();
  assert.deepEqual(f.notices, []);
});

test('falhas reais continuam passando pelo aviso nativo e fallback da badge', async () => {
  const f = cancellationFixture(); f.run();
  f.requests[0].fail(new Error('Falha de rede simulada')); await f.flush();
  assert.deepEqual(f.notices, ['Falha de rede simulada']);
  assert.equal(f.warnings.length, 1);
  f.leave(); await f.flush();
  assert.deepEqual(f.notices, ['Falha de rede simulada']);
});
