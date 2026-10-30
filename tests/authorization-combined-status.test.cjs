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
    options: ['', '0', '6'].map((value, i) => ({ value,
      textContent: ['Todos os Status Ativos...', 'Aberto', 'Enviado'][i] })),
    insertBefore(option, before) { this.options.splice(this.options.indexOf(before), 0, option); } };
  const source = fs.readFileSync(filename, 'utf8');
  let ensure;
  vm.runInNewContext(source, { document: {
    createElement: () => ({}),
    querySelector: () => ({ textContent: 'Autorizações' }),
    getElementById: () => ({ closest: () => ({ querySelectorAll: () => [select] }) })
  }, tmRuntime: { register(_name, callback) { ensure = callback; } } });
  ensure(); ensure();
  assert.equal(select.options.length, 4);
  assert.equal(select.options[1].textContent, 'Aberto + Enviado');
  assert.equal(select.options[2].textContent, 'Aberto');
  assert.equal(original.length, 2);
});

function filteredServer(totals = { '0': 250, '6': 250 }) {
  const calls = [];
  const row = (status, index) => ({ in_status: Number(status),
    id_solicitacao_autorizacao: index * 2 + (status === '0' ? 1 : 2),
    marcacao: { dt_inicio: new Date(Date.UTC(2026, 9, 1) +
      (index * 2 + (status === '0' ? 0 : 1)) * 60000).toISOString() } });
  const axios = { post: async (_url, body, config) => {
    calls.push({ q: body.q, config });
    return { data: Object.fromEntries(body.q.map(q => {
      const status = String(q.parms.status), total = totals[status] ?? 1000;
      const from = (q.parms.page - 1) * q.parms.size;
      return [q.id, { status: 200, data: { total, current_page: q.parms.page,
        last_page: Math.max(1, Math.ceil(total / q.parms.size)), per_page: q.parms.size, path: '/aql',
        data: Array.from({ length: Math.max(0, Math.min(q.parms.size, total - from)) },
          (_, i) => row(status, from + i)) } }];
    })) };
  } };
  return { calls, axios };
}

test('primeira página consulta somente Aberto/Enviado em um lote e não baixa as outras páginas', async () => {
  const f = filteredServer(), token = {};
  const result = await context().fetchCombinedStatusPage(f.axios,
    { status: 'tm-open-sent', ref_data: 'G', page: 1, size: 100, id_operadora: 14 }, token);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].q.length, 2);
  assert.deepEqual(Array.from(f.calls[0].q, q => String(q.parms.status)), ['0', '6']);
  assert.ok(f.calls[0].q.every(q => q.parms.page === 1 && q.parms.id_operadora === 14));
  assert.equal(f.calls[0].config.cancelToken, token);
  assert.equal(result.page.total, 500); assert.equal(result.page.last_page, 5);
  assert.deepEqual(Array.from(result.page.data, x => x.id_solicitacao_autorizacao),
    Array.from({ length: 100 }, (_, i) => i + 1));
});

test('página2 busca só o prefixo necessário e mantém total e links corretos', async () => {
  const f = filteredServer();
  const result = await context().fetchCombinedStatusPage(f.axios, { ref_data: 'G', page: 2, size: 100 }, {});
  assert.equal(f.calls.length, 2); assert.equal(f.calls.flatMap(x => x.q).length, 4);
  assert.ok(f.calls.flatMap(x => x.q).every(q => q.parms.page <= 2));
  assert.equal(result.page.total, 500); assert.equal(result.page.current_page, 2);
  assert.equal(result.page.from, 101); assert.equal(result.page.to, 200);
  assert.equal(result.page.prev_page_url, '/aql?page=1'); assert.equal(result.page.next_page_url, '/aql?page=3');
  assert.deepEqual(Array.from(result.page.data, x => x.id_solicitacao_autorizacao),
    Array.from({ length: 100 }, (_, i) => i + 101));
});

test('status vazio não trava a união e página fora do limite é ajustada', async () => {
  const f = filteredServer({ '0': 6, '6': 0 });
  const result = await context().fetchCombinedStatusPage(f.axios, { ref_data: 'G', page: 99, size: 100 }, {});
  assert.equal(result.page.total, 6); assert.equal(result.page.current_page, 1);
  assert.equal(result.page.data.length, 6); assert.equal(f.calls.length, 1);
});

test('cancelamento impede novas chamadas e falha de um status não vira lista parcial', async () => {
  const f = filteredServer(); const cancel = Object.assign(new Error('#BC#'), { __CANCEL__: true });
  await assert.rejects(context().fetchCombinedStatusPage(f.axios, { ref_data: 'G' },
    { throwIfRequested() { throw cancel; } }), error => error === cancel);
  assert.equal(f.calls.length, 0);
  const broken = { post: async () => ({ data: { lista: { status: 200, data: { data: [], total: 0, last_page: 1 } },
    sent: { status: 500 } } }) };
  await assert.rejects(context().fetchCombinedStatusPage(broken, { ref_data: 'G' }, {}), /autorizaç/);
});

test('união respeita Data de Abertura, Solicitação, Paciente e direção da ordenação', async () => {
  const data = [
    { id_solicitacao_autorizacao: 1, in_status: 0, dt_solicitacao: '2026-10-05', paciente: { st_nome: 'Álvaro' } },
    { id_solicitacao_autorizacao: 3, in_status: 0, dt_solicitacao: '2026-10-08', paciente: { st_nome: 'Bia' } },
    { id_solicitacao_autorizacao: 2, in_status: 6, dt_solicitacao: '2026-10-06', cadastro_temporario: { st_nome: 'Ana' } },
    { id_solicitacao_autorizacao: 4, in_status: 6, dt_solicitacao: '2026-10-07', paciente: { st_nome: 'Zuleide' } }
  ];
  for (const type of ['DS', 'NS', 'PC']) for (const direction of ['A', 'D']) {
    let calls = 0;
    const axios = { post: async (_url, body) => {
      calls++; return { data: Object.fromEntries(body.q.map(q => {
        assert.ok(['0', '6'].includes(q.parms.status));
        const rows = data.filter(r => String(r.in_status) === q.parms.status);
        const key = r => type === 'DS' ? r.dt_solicitacao : type === 'NS' ? r.id_solicitacao_autorizacao
          : r.paciente?.st_nome || r.cadastro_temporario?.st_nome;
        rows.sort((a, b) => (direction === 'D' ? -1 : 1) * (type === 'PC'
          ? key(a).localeCompare(key(b), 'pt-BR', { sensitivity: 'base' }) : key(a) < key(b) ? -1 : 1));
        return [q.id, { status: 200, data: { data: rows, total: rows.length, last_page: 1 } }];
      })) };
    } };
    const result = await context().fetchCombinedStatusPage(axios, { tipo_ordem: type, ordem_dir: direction }, {});
    const expected = type === 'DS' ? [1, 2, 4, 3] : [1, 2, 3, 4];
    if (direction === 'D') expected.reverse();
    assert.deepEqual(Array.from(result.page.data, r => r.id_solicitacao_autorizacao), expected);
    assert.equal(calls, 1);
  }
});

test('divergência da ordem nativa aciona compatibilidade sem mudar a ordem da listagem', async () => {
  let calls = 0;
  const row = (id, date) => ({ id_solicitacao_autorizacao: id, in_status: 0, marcacao: { dt_inicio: date } });
  const nativeRows = [row(2, '2026-10-23'), row(1, '2026-10-21')];
  const axios = { post: async (_url, body) => {
    calls++; return { data: Object.fromEntries(body.q.map(q => {
      const rows = q.parms.status === '6' ? [] : nativeRows;
      return [q.id, { status: 200, data: { data: rows, total: rows.length, last_page: 1 } }];
    })) };
  } };
  const result = await context().fetchCombinedStatusPage(axios, { ref_data: 'G' }, {});
  assert.deepEqual(Array.from(result.page.data, r => r.id_solicitacao_autorizacao), [2, 1]);
  assert.equal(calls, 2);
});

test('mudança concorrente de status não duplica a autorização nem seu total', async () => {
  let calls = 0;
  const axios = { post: async (_url, body) => {
    calls++; return { data: Object.fromEntries(body.q.map(q => [q.id, { status: 200, data: {
      data: [{ id_solicitacao_autorizacao: 1, in_status: q.parms.status === '' ? 6 : Number(q.parms.status),
        marcacao: { dt_inicio: '2026-10-21' } }], total: 1, last_page: 1
    } }])) };
  } };
  const result = await context().fetchCombinedStatusPage(axios, { ref_data: 'G' }, {});
  assert.equal(result.page.total, 1); assert.equal(result.page.data.length, 1);
  assert.equal(calls, 2);
});

test('cancelamento após primeira resposta evita baixar o restante do prefixo', async () => {
  const f = filteredServer(); let cancelled = false; const original = f.axios.post;
  f.axios.post = async (...args) => { const response = await original(...args); cancelled = true; return response; };
  await assert.rejects(context().fetchCombinedStatusPage(f.axios, { ref_data: 'G', page: 2, size: 100 }, {
    throwIfRequested() { if (cancelled) throw new Error('#BC#'); }
  }), /#BC#/);
  assert.equal(f.calls.length, 1);
});

test('prefixo incompleto de um status não é compensado por linhas do outro', async () => {
  let calls = 0;
  const row = (id, status) => ({ id_solicitacao_autorizacao: id, in_status: status,
    marcacao: { dt_inicio: `2026-10-${String(id).padStart(2, '0')}` } });
  const axios = { post: async (_url, body) => {
    calls++;
    return { data: Object.fromEntries(body.q.map(q => {
      const combined = q.parms.status === '', open = q.parms.status === '0';
      const rows = combined ? [row(1, 0), row(2, 0)] : open ? [row(1, 0)] : [row(10, 6), row(11, 6)];
      return [q.id, { status: 200, data: { data: rows, total: combined ? 2 : open ? 4 : 2, last_page: 1 } }];
    })) };
  } };
  const result = await context().fetchCombinedStatusPage(axios, { ref_data: 'G', size: 2 }, {});
  assert.deepEqual(Array.from(result.page.data, x => x.id_solicitacao_autorizacao), [1, 2]);
  assert.equal(calls, 2);
});

test('empates fecham a fronteira nas duas sequências antes de paginar por ID estável', async () => {
  const calls = [], streams = { '0': [9, 1, 7, 3], '6': [8, 2, 6, 4] };
  const axios = { post: async (_url, body) => {
    calls.push(body.q);
    return { data: Object.fromEntries(body.q.map(q => {
      assert.ok(['0', '6'].includes(q.parms.status));
      const ids = streams[q.parms.status], from = (q.parms.page - 1) * q.parms.size;
      return [q.id, { status: 200, data: { total: ids.length, last_page: 2,
        data: ids.slice(from, from + q.parms.size).map(id => ({ id_solicitacao_autorizacao: id,
          in_status: Number(q.parms.status), marcacao: { dt_inicio: '2026-10-21 08:00' } })) } }];
    })) };
  } };
  const result = await context().fetchCombinedStatusPage(axios, { ref_data: 'G', page: 1, size: 2 }, {});
  assert.equal(result.page.total, 8);
  assert.deepEqual(Array.from(result.page.data, x => x.id_solicitacao_autorizacao), [1, 2]);
  assert.equal(calls.length, 2); // busca apenas0/6, incluindo os IDs empatados depois da primeira página
});

test('fronteira descendente encerra ao alcançar outra data e preserva o deslocamento da página2', async () => {
  const streams = { '0': [[8, 23], [2, 23], [6, 22], [1, 22], [5, 21]],
    '6': [[9, 23], [3, 23], [7, 22], [4, 22], [10, 20]] };
  for (const page of [1, 2]) {
    const calls = [];
    const axios = { post: async (_url, body) => {
      calls.push(body.q); return { data: Object.fromEntries(body.q.map(q => {
        const from = (q.parms.page - 1) * q.parms.size, all = streams[q.parms.status];
        return [q.id, { status: 200, data: { total: all.length, data: all.slice(from, from + q.parms.size)
          .map(([id, day]) => ({ id_solicitacao_autorizacao: id, in_status: Number(q.parms.status),
            dt_solicitacao: `2026-10-${day}` })) } }];
      })) };
    } };
    const result = await context().fetchCombinedStatusPage(axios,
      { tipo_ordem: 'DS', ordem_dir: 'D', page, size: 2 }, {});
    assert.deepEqual(Array.from(result.page.data, x => x.id_solicitacao_autorizacao), page === 1 ? [2, 3] : [8, 9]);
    assert.equal(result.page.current_page, page); assert.equal(result.page.total, 10);
    assert.ok(calls.flat().every(q => q.parms.page <= 2));
  }
});
