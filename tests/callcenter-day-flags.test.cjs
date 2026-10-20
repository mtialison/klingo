const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '..', 'klingo.user.js'), 'utf8');
const start = script.indexOf("  'use strict';", script.indexOf('CALL CENTER - SINALIZADORES POR DATA'));
const end = script.indexOf('\n})();', start);
const date = '2026-11-30';
const flag = (id = 7) => ({ id_sinalizador_atendimento: id, st_icon: id === 7 ? 'fa-solid fa-car' : 'fas fa-wheelchair',
  st_cor: 'primary', st_sinalizador_atendimento: id === 7 ? 'Estacionamento' : 'Cadeirante' });
const row = (id, unit = 5, doctor = 10, signal = flag()) => ({ data: date, status: 'ocupado',
  medico: { id_pessoa: doctor }, marcacao: { id_marcacao: id, id_medico: doctor,
    id_unidade_operacao: unit, unidade_operacao: { st_nome: unit === 5 ? '(BANGU) - CLINICA' :
      unit === 6 ? '(BARRA) - CLINICA' : '(COPACABANA) - CLINICA' },
    id_sinalizador_atendimento: signal?.id_sinalizador_atendimento, sinalizador_atendimento: signal,
    arquivos: [{ filename: 'nao-contar.pdf' }], nome_paciente: 'NUNCA CONSERVAR' } });

function setup() {
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.attributes = {}; this.isConnected = true; this.textContent = ''; }
    appendChild(c) { this.children.push(c); return c; }
    append(...cs) { cs.forEach((c) => this.appendChild(c)); }
    replaceChildren() { this.children = []; }
    setAttribute(k, v) { this.attributes[k] = v; }
    remove() { this.isConnected = false; }
    querySelector(s) { return s.startsWith('.') ? this.children.find((c) => c.className === s.slice(1)) : null; }
  }
  let sync, scheduled = 0, requests = [], respond = async (body) => ({ data: Object.fromEntries(body.q.map((q) =>
    [q.id, { status: 200, data: { agendas: [row(1)] } }])) });
  const client = { post: async (_url, body) => { requests.push(body); return respond(body); },
    interceptors: { response: { use() { return 1; }, eject() {} } } };
  const page = { $store: { state: { user: { id_usuario: 1 } } },
    $refs: { listaPac: { listaproc: true, cc: false, infusao: false } },
    medicos: [{ id_pessoa: 10 }, { id_pessoa: 11 }], medicosSelecionados: [true, true],
    procedimentos: [{ selected: true, procedimento: { id_procedimento: 20 }, plano: { id_plano: 30 } }],
    listaPacientes() {}, axios: client, exibicao: { [date]: {} },
    horarios: [{ data: date, status: 'livre', id_unidade_operacao: 5 }] };
  const box = new Element();
  const querySelector = box.querySelector.bind(box);
  box.querySelector = (s) => s === 'h4 a.card-link' ? { textContent: '30/11' } : querySelector(s);
  page.$el = { querySelectorAll: () => [box] };
  const document = { hidden: false, head: new Element(), createElement: () => new Element(), addEventListener() {},
    getElementById: (id) => id === 'listaPacientesModal' ? { __vue__: page } : document.head.children.find((e) => e.id === id) };
  const window = { location: { hash: '#/call-center' }, addEventListener() {} };
  const context = vm.createContext({ document, window, console, Date,
    tmRuntime: { register(_name, job) { sync = job; }, schedule() { scheduled++; } } });
  vm.runInContext(script.slice(start, end) + '\nthis.api = { queryContext, bookableUnits, summarize, bindings, sync, stop, cache, paint };', context);
  return { ...context.api, page, document, window, box, requests, sync: () => sync(),
    respond(fn) { respond = fn; }, scheduled: () => scheduled };
}
const settle = () => new Promise((r) => setImmediate(r));

test('replica filtros do modal, incluindo médico, plano, procedimento e recursos', () => {
  const f = setup(), q = f.queryContext(f.page);
  assert.deepEqual(Array.from(q.medicos), [10, 11]);
  assert.equal(q.medico, null);
  assert.equal(q.procedimento, 20); assert.equal(q.plano, 30);
  assert.equal(q.confirmacao, false); assert.equal(q.detalhe, true);
  assert.equal(q.unidade_operacao, undefined, 'não inventa filtro diferente do modal');
  f.page.medicosSelecionados = [false, true];
  assert.equal(f.queryContext(f.page).medico, 11);
  f.page.procedimentos[0].regiao_cd = { id_regiao_cd: 2 };
  f.page.procedimentos[0].unidade_operacao = { id_unidade_operacao: 5 };
  assert.equal(f.queryContext(f.page).unidade_operacao, 5);
  f.page.$store.state.user.id_plano = 30;
  assert.equal(f.queryContext(f.page), null, 'respeita restrição nativa de acesso');
});

test('vários procedimentos mantêm consulta nativa sem restringir a um procedimento arbitrário', () => {
  const f = setup();
  f.page.procedimentos.push({ selected: true, procedimento: { id_procedimento: 21 }, procedimento_equipamentos: [{ id_equipamento: 3 }] });
  f.page.procedimentos[0].procedimento_equipamentos = [{ id_equipamento: 3 }, { id_equipamento: 4 }];
  const q = f.queryContext(f.page);
  assert.equal(q.procedimento, undefined); assert.equal(q.confirmacao, true);
  assert.deepEqual(Array.from(q.recursos, (r) => r.id_equipamento), [3, 4]);
});

test('conta somente sinalizadores, deduplica marcação e separa unidades/profissionais', () => {
  const f = setup();
  const summary = f.summarize({ agendas: [row(1), row(1), row(2), row(3, 6, 11), row(4, 5, 10, flag(4)),
    row(5, 5, 999), row(6, 5, 10, null), { ...row(7), status: 'passado' }] },
  date, f.queryContext(f.page), new Set(['5', '6']));
  assert.equal(summary.multipleUnits, true);
  assert.equal(summary.groups.length, 2);
  assert.equal(summary.groups[0].flags.find((f) => f.id === '7').count, 2);
  assert.equal(summary.groups[0].flags.find((f) => f.id === '4').count, 1);
  assert.equal(summary.groups[1].flags[0].count, 1);
  assert.ok(!JSON.stringify(summary).includes('NUNCA CONSERVAR'));
  assert.ok(!JSON.stringify(summary).includes('pdf'));
});

test('rotula unidade mesmo se apenas uma das unidades possui sinalizadores', () => {
  const f = setup();
  const summary = f.summarize({ agendas: [row(1), row(2, 6, 11, null)] },
    date, f.queryContext(f.page), new Set(['5', '6']));
  assert.equal(summary.multipleUnits, true); assert.equal(summary.groups.length, 1);
});

test('falha/paginação/sinalizador incompleto não viram ausência de sinalizadores', () => {
  const f = setup(), q = f.queryContext(f.page);
  for (const data of [{ agendas: [], paginate: true }, {}, { agendas: [{ ...row(1), data: '2026-12-01' }] },
    { agendas: [{ ...row(1), marcacao: { ...row(1).marcacao, sinalizador_atendimento: null } }] }]) {
    assert.throws(() => f.summarize(data, date, q, new Set(['5', '6'])));
  }
});

test('busca começa sem modal, chamadas repetidas usam cache, ícones não têm botões', async () => {
  const f = setup();
  f.sync();
  assert.equal(f.requests.length, 1);
  assert.equal(f.box.children[0].attributes['aria-busy'], 'true');
  f.sync(); await settle(); f.sync(); await settle();
  assert.equal(f.requests.length, 1);
  const host = f.box.children[0], line = host.children[0], item = line.children[1];
  assert.equal(host.attributes['aria-busy'], 'false');
  assert.equal(line.children[0].textContent, 'BANGU');
  assert.equal(item.children[0].className, 'fa-solid fa-car');
  assert.equal(item.children[1].textContent, '1');
  assert.equal(item.title, '(BANGU) - CLINICA: Estacionamento — 1');
});

test('11/11 mostra somente sinalizadores da unidade com vaga livre', async () => {
  const f = setup();
  f.page.horarios = [
    { data: date, status: 'ocupado', id_unidade_operacao: 5 },
    { data: date, status: 'livre', id_unidade_operacao: 6 },
    { data: date, status: 'livre', id_unidade_operacao: 5, bloqueado: true }
  ];
  f.respond(async () => ({ data: { flags0: { status: 200, data: {
    agendas: [row(1, 5), row(2, 6), row(3, 7)]
  } } } }));
  assert.deepEqual([...f.bookableUnits(f.page).get(date)], ['6']);
  f.sync(); await settle();
  const host = f.box.children[0];
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0].children[0].textContent, 'BARRA');
  assert.equal(host.children[0].children[1].title, '(BARRA) - CLINICA: Estacionamento — 1');
  assert.equal(f.cache.values().next().value.value.groups.length, 1);
});

test('sem unidade identificada na vaga livre não atribui ícones de outra unidade', async () => {
  const f = setup();
  f.page.horarios = [{ data: date, status: 'livre' }];
  f.sync(); await settle();
  assert.equal(f.requests.length, 0);
  assert.equal(f.box.children[0].children[0].textContent, '?');
});

test('troca da unidade disponível invalida o resumo anterior da mesma data', async () => {
  const f = setup();
  f.sync(); await settle();
  assert.equal(f.box.children[0].children[0].children[0].textContent, 'BANGU');
  f.page.horarios = [{ data: date, status: 'livre', id_unidade_operacao: 6 }];
  f.respond(async () => ({ data: { flags0: { status: 200, data: { agendas: [row(1), row(2, 6)] } } } }));
  f.sync(); await settle();
  assert.equal(f.requests.length, 2);
  assert.equal(f.box.children[0].children[0].children[0].textContent, 'BARRA');
});

test('mudança de contexto descarta resposta antiga e troca de conta limpa cache', async () => {
  const f = setup(); let release;
  f.respond((body) => new Promise((r) => { release = () => r({ data: { flags0: { status: 200, data: { agendas: [row(1)] } } } }); }));
  f.sync();
  f.page.medicosSelecionados = [false, true]; f.sync();
  release(); await settle();
  assert.equal(f.cache.size, 0);
  assert.ok(f.scheduled() > 0);
  f.respond(async () => ({ data: { flags0: { status: 200, data: { agendas: [row(2, 6, 11)] } } } }));
  f.sync(); await settle();
  assert.equal(f.cache.size, 1);
  f.page.$store.state.user.id_usuario = 2;
  f.sync(); assert.equal(f.cache.size, 0); await settle();
});

test('erro exibe aviso, não refaz a cada render e permite retry após prazo', async () => {
  const f = setup(); f.respond(async () => { throw new Error('offline'); });
  f.sync(); await settle();
  assert.equal(f.box.children[0].children[0].textContent, '!');
  f.sync(); await settle(); assert.equal(f.requests.length, 1);
  f.cache.forEach((entry) => { entry.time -= 16000; });
  f.sync(); await settle(); assert.equal(f.requests.length, 2);
});

test('aba oculta e outros módulos não iniciam buscas', async () => {
  const f = setup(); f.document.hidden = true; f.sync();
  f.document.hidden = false; f.window.location.hash = '#/recepcao'; f.sync();
  await settle(); assert.equal(f.requests.length, 0);
});
