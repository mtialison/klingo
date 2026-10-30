const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const file = path.join(__dirname, '../src/28-recepcao-permanencia-dos-filtros.js');
function fixture(values = new Map(), options = {}) {
  let run;
  const watchers = [], events = {}, windowEvents = {}, typeEvents = [], scheduled = [];
  const type = { value: '', dispatchEvent(event) { typeEvents.push(event.type); } };
  const card = { contains: () => true };
  const nativeData = { referencia: '2026-10-30', medico: '', viewEspec: '', viewStatus: 0,
    viewMode: 'G', tipo_proced: 'T', search: '', turno: 'G', faixa_hora: 'D',
    filtrar_faixa_hora: false, block_view_pacotes: false, filtro_teleatend: false,
    apenas_editados: false, id_fila_laudo: '', filtro_lista_medicos: [] };
  const vue = { ...nativeData, $data: nativeData,
    $route: { path: '/recepcao', params: options.params || {} },
    $store: { state: { user: { id_usuario: options.user || 7 }, loading: false } },
    $refs: { ini_atd: {} }, unidade_operacao: options.unit || 5,
    montando: false, firstLoad: options.ready !== false, loads: 0,
    $util: { getCookie: () => '218' },
    load() { this.loads++; },
    $watch(getter, callback) { const w = { getter, callback, live: true }; watchers.push(w); return () => { w.live = false; }; }
  };
  const refresh = { __vue__: options.childVue ? {} : vue,
    parentElement: options.childVue ? { __vue__: vue } : null, closest: () => card };
  const doctorOptions = options.availableDoctors?.map(id => ({ value: String(id) }));
  let typeVisible = !options.delayedType;
  const document = { getElementById: id => id === 'refresh-button' ? refresh :
      id === 'filtro-medico' && doctorOptions ? { options: doctorOptions } : null,
    querySelector: selector => selector.includes('tm-recepcao-tipo-filter') && typeVisible ? type : null,
    addEventListener(name, cb) { events[name] = cb; } };
  const sessionStorage = { getItem: key => values.get(key) || null,
    setItem: (key, value) => { if (options.blocked) throw Error('Storage bloqueado'); values.set(key, value); } };
  const context = vm.createContext({ document, sessionStorage,
    window: { location: { hash: '#/recepcao' }, addEventListener(name, cb) { windowEvents[name] = cb; } },
    tmRuntime: { register(_name, callback) { run = callback; }, schedule(delay) { scheduled.push(delay); } },
    Event: class { constructor(type) { this.type = type; } }, console });
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  const flush = () => watchers.filter(w => w.live).forEach(w => w.callback(w.getter()));
  return { vue, type, typeEvents, run: () => run(), flush, values, events, windowEvents, context, scheduled,
    showType() { typeVisible = true; } };
}
function savedState() {
  const f = fixture(); f.run();
  Object.assign(f.vue, { referencia: '2026-10-16', medico: 107, viewMode: 'A',
    viewEspec: '12', viewStatus: 'RP', search: 'busca de teste', filtro_lista_medicos: [107, 108] });
  f.type.value = 'extra'; f.flush(); f.windowEvents.pagehide?.();
  assert.equal(f.values.size, 1, 'Filtros devem ser salvos antes do reload');
  return f.values;
}
test('restaura filtros nativos e tipo na mesma aba após reload, com uma carga', () => {
  const f = fixture(savedState()); f.run();
  assert.equal(f.vue.referencia, '2026-10-16'); assert.equal(f.vue.medico, 107);
  assert.equal(f.vue.viewMode, 'A'); assert.equal(f.vue.viewEspec, '12');
  assert.equal(f.vue.viewStatus, 'RP'); assert.equal(f.vue.search, 'busca de teste');
  assert.deepEqual(Array.from(f.vue.filtro_lista_medicos), [107, 108]);
  assert.equal(f.type.value, 'extra'); assert.deepEqual(f.typeEvents, ['change']);
  assert.equal(f.vue.loads, 1); f.run(); assert.equal(f.vue.loads, 1);
});
test('não mistura filtros de outra conta, unidade ou aba', () => {
  const values = savedState();
  for (const opts of [{ user: 9 }, { unit: 6 }]) {
    const f = fixture(new Map(values), opts); f.run();
    assert.equal(f.vue.referencia, '2026-10-30'); assert.equal(f.vue.loads, 0);
  }
  const otherTab = fixture(); otherTab.run(); assert.equal(otherTab.vue.medico, '');
});
test('aguarda carga inicial sem sobrescrever filtros salvos com defaults', () => {
  const f = fixture(savedState(), { ready: false }); f.run(); f.flush();
  assert.equal(f.vue.medico, ''); assert.equal(f.scheduled.length, 0);
  f.vue.firstLoad = true; f.flush(); assert.deepEqual(f.scheduled, [0]); f.run();
  assert.equal(f.vue.medico, 107); assert.equal(f.vue.loads, 1);
});
test('não substitui a navegação explícita para atendimento ou paciente', () => {
  const f = fixture(savedState(), { params: { id_atendimento: '123' } }); f.run();
  assert.equal(f.vue.medico, ''); assert.equal(f.vue.loads, 0);
});
test('intervenção manual durante carga tem prioridade sobre restauração', () => {
  const f = fixture(savedState(), { ready: false }); f.run();
  f.events.input({ isTrusted: true, target: { closest: () => null } });
  f.vue.search = 'nova busca'; f.vue.firstLoad = true; f.run();
  assert.equal(f.vue.search, 'nova busca'); assert.equal(f.vue.medico, '');
});
test('filtros limpos também permanecem após novo reload', () => {
  const f = fixture(savedState()); f.run();
  Object.assign(f.vue, { medico: '', viewEspec: '', search: '', viewStatus: 0 });
  f.type.value = ''; f.flush(); f.windowEvents.pagehide?.();
  const reload = fixture(f.values); reload.run();
  assert.equal(reload.vue.medico, ''); assert.equal(reload.vue.search, '');
  assert.equal(reload.type.value, '');
});
test('falha de storage e JSON inválido não impedem o funcionamento', () => {
  const f = fixture(undefined, { blocked: true }); assert.doesNotThrow(() => f.run());
  const values = savedState(); values.set([...values.keys()][0], '{invalido');
  const reload = fixture(values); assert.doesNotThrow(() => reload.run());
  assert.equal(reload.vue.loads, 0);
});
test('troca de contexto não grava estado da nova unidade na chave antiga', () => {
  const values = savedState(), oldEntries = JSON.stringify([...values]);
  const f = fixture(values); f.run();
  f.vue.unidade_operacao = 6; f.vue.search = 'outra unidade'; f.flush();
  assert.equal(JSON.stringify([...values]), oldEntries);
});

test('descarta profissionais que não existem mais nas opções da unidade', () => {
  const f = fixture(savedState(), { availableDoctors: ['', 108] }); f.run();
  assert.equal(f.vue.medico, '');
  assert.deepEqual(Array.from(f.vue.filtro_lista_medicos), [108]);
});

test('aguarda o controle de tipo sem perder seu valor nem repetir a consulta', () => {
  const f = fixture(savedState(), { delayedType: true }); f.run(); f.flush();
  assert.equal(f.type.value, ''); assert.equal(f.vue.loads, 1);
  f.showType(); f.run();
  assert.equal(f.type.value, 'extra'); assert.equal(f.vue.loads, 1);
  assert.deepEqual(f.typeEvents, ['change']);
});

test('alterar somente o tipo salva pelo evento mesmo sem watcher nativo', async () => {
  const f = fixture(savedState()); f.run(); f.type.value = 'marcado';
  f.events.change({ isTrusted: true, target: { closest: () => ({}) } });
  await Promise.resolve();
  const reload = fixture(f.values); reload.run(); assert.equal(reload.type.value, 'marcado');
});

test('descarta data inválida, campos extras, objetos e booleanos corrompidos', () => {
  const values = savedState(), key = [...values.keys()][0], saved = JSON.parse(values.get(key));
  Object.assign(saved.values, { referencia: '2026-02-31', medico: {},
    filtrar_faixa_hora: 'false', id_paciente: 999, filtro_lista_medicos: [{}, 'abc', 108] });
  values.set(key, JSON.stringify(saved));
  const f = fixture(values); f.run();
  assert.equal(f.vue.referencia, '2026-10-30'); assert.equal(f.vue.medico, '');
  assert.equal(f.vue.filtrar_faixa_hora, false); assert.equal(f.vue.id_paciente, undefined);
  assert.deepEqual(Array.from(f.vue.filtro_lista_medicos), [108]);
});

test('ao trocar unidade sem histórico, conserva os filtros exibidos pelo Klingo', () => {
  const values = savedState(), firstKey = [...values.keys()][0], previous = values.get(firstKey);
  const f = fixture(values); f.run(); f.vue.unidade_operacao = 6; f.run();
  const secondKey = [...values.keys()].find(key => key !== firstKey);
  const current = JSON.parse(values.get(secondKey));
  assert.equal(current.values.medico, 107); assert.equal(current.type, 'extra');
  assert.equal(values.get(firstKey), previous);
  f.vue.search = 'busca da outra unidade'; f.flush();
  assert.equal(values.get(firstKey), previous);
  const reload = fixture(values, { unit: 6 }); reload.run();
  assert.equal(reload.vue.search, 'busca da outra unidade');
});

test('encontra o componente da Recepção acima de um Vue filho', () => {
  const f = fixture(savedState(), { childVue: true }); f.run();
  assert.equal(f.vue.medico, 107); assert.equal(f.vue.loads, 1);
});
