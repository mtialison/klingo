const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const filename = path.join(__dirname, '..', 'src', '24-autorizacoes-status-aberto-enviado.js');

function context(extra = {}) {
  const source = fs.readFileSync(filename, 'utf8');
  const start = source.indexOf('  async function fetchCombinedStatusPage(');
  const end = source.indexOf('  function ensureCombinedStatus(', start);
  const context = vm.createContext({ COMBINED_STATUS: 'tm-open-sent', ...extra });
  vm.runInContext(source.slice(start, end), context);
  return context;
}

test('combinação inclui status das páginas seguintes e mantém a ordem nativa', async () => {
  const calls = [];
  const pages = [
    [{ in_status: 1, id: 1 }, { in_status: 0, id: 2 }],
    [{ in_status: 6, id: 3 }, { in_status: 5, id: 4 }],
    [{ in_status: '0', id: 5 }, { in_status: '6', id: 6 }]
  ];
  const filters = { status: 'tm-open-sent', page: 1, size: 100,
    id_operadora: 14, id_medico: 7, pesquisar: 'teste', ordem_dir: 'D' };
  const token = {};
  const axios = { post: async (_url, body, config) => {
    const parms = body.q[0].parms;
    calls.push({ parms, config });
    return { data: { lista: { status: 200, data: { data: pages[parms.page - 1],
      current_page: parms.page, last_page: 3, total: 6, path: '/aql' } } } };
  } };
  const c = context();
  const result = await c.fetchCombinedStatusPage(axios, filters, token);
  assert.deepEqual(Array.from(result.page.data, x => x.id), [2, 3, 5, 6]);
  assert.equal(result.page.total, 4);
  assert.equal(result.page.last_page, 1);
  assert.equal(filters.status, 'tm-open-sent');
  assert.equal(calls.length, 3);
  for (const { parms, config } of calls) {
    assert.equal(parms.status, '');
    assert.equal(parms.id_operadora, 14);
    assert.equal(parms.id_medico, 7);
    assert.equal(parms.pesquisar, 'teste');
    assert.equal(parms.ordem_dir, 'D');
    assert.equal(config.cancelToken, token);
  }
});

test('paginação combinada conta somente Aberto e Enviado e limita concorrência', async () => {
  let active = 0, maximum = 0;
  const axios = { post: async (_url, body) => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    const page = body.q[0].parms.page;
    return { data: { lista: { status: 200, data: { last_page: 4, path: '/aql',
      data: Array.from({ length: 60 }, (_, i) => ({ in_status: page % 2 ? 0 : 6,
        id: (page - 1) * 60 + i })) } } } };
  } };
  const result = await context().fetchCombinedStatusPage(axios, { page: 2, size: 100 }, {});
  assert.equal(result.page.total, 240);
  assert.equal(result.page.current_page, 2);
  assert.equal(result.page.last_page, 3);
  assert.equal(result.page.from, 101);
  assert.equal(result.page.to, 200);
  assert.equal(result.page.data[0].id, 100);
  assert.equal(result.page.data.length, 100);
  assert.ok(maximum <= 2);
});

test('falha de consulta não apresenta listagem parcial como completa', async () => {
  const axios = { post: async (_url, body) => {
    if (body.q[0].parms.page === 2) throw new Error('indisponível');
    return { data: { lista: { status: 200, data: { last_page: 2,
      data: [{ in_status: 0 }] } } } };
  } };
  await assert.rejects(context().fetchCombinedStatusPage(axios, {}, {}), /indisponível/);
});

test('outro status preserva o load nativo e descarta resposta combinada atrasada', async () => {
  let finish, nativeCalls = 0;
  const vue = { filtros: { status: 'tm-open-sent' }, page: 1,
    load() { nativeCalls++; }, $util: { setCookie() {} },
    $store: { commit() {}, state: { contexto: {} } },
    axios: { CancelToken: { source: () => ({ token: {}, cancel() {} }) },
      post: () => new Promise(resolve => { finish = resolve; }) } };
  const c = context({ console, window: { alert: assert.fail } });
  c.hookAuthorizationLoad(vue);
  const pending = vue.load();
  vue.filtros.status = 1;
  vue.load();
  finish({ data: { lista: { status: 200, data: { data: [{ in_status: 0 }], last_page: 1 } } } });
  await pending;
  assert.equal(nativeCalls, 1);
  assert.equal(vue.dados, undefined);
});

test('opção fica acima de Aberto apenas no filtro, sem alterar lista compartilhada de edição', () => {
  const original = [{ id: 0, search: 'Aberto' }, { id: 6, search: 'Enviado' }];
  const input = { listaJson: original };
  const vue = { filtros: {}, load() {} };
  const parent = { __vue__: vue };
  const select = { __vue__: input, parentElement: parent,
    options: ['Todos os Status Ativos...', 'Aberto', 'Enviado'].map(textContent => ({ textContent })) };
  const source = fs.readFileSync(filename, 'utf8');
  let ensure;
  vm.runInNewContext(source, { document: {
    querySelector: () => ({ textContent: 'Autorizações' }),
    getElementById: () => ({ closest: () => ({ querySelectorAll: () => [select] }) })
  }, tmRuntime: { register(_name, callback) { ensure = callback; } } });
  ensure(); ensure();
  assert.equal(input.listaJson.length, 3);
  assert.equal(input.listaJson[0].search, 'Aberto + Enviado');
  assert.equal(input.listaJson[1].search, 'Aberto');
  assert.equal(original.length, 2);
});
