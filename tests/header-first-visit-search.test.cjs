const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const filename = path.join(__dirname, '..', 'src', '26-cabecalho-busca-primeira-vez.js');

function helpers() {
  const source = fs.readFileSync(filename, 'utf8');
  const c = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('  function isHeaderPatientSearch('),
    source.indexOf('  function ensureHeaderPatientSearch(')), c);
  return c;
}

function component(header = true) {
  return { service: 'pacientes.index', $parent: { $options: { name: 'AutocompletePaciente' } },
    $el: { closest: () => header ? {} : null }, $route: { path: '/recepcao' },
    obj2QueryString: params => JSON.stringify(params), items: [], results: [], searched: '',
    isOpen: false, search: '', searchAutoComplete() {} };
}

test('busca do cabeçalho consulta Primeira Vez em qualquer módulo sem mudar a rota atual', () => {
  const vue = component();
  helpers().patchHeaderPatientSearch(vue);
  const params = { bm: 1, rota: '/recepcao', extra: 'mantido' };
  assert.deepEqual(JSON.parse(vue.obj2QueryString(params)), { bm: 1, rota: '/call-center', extra: 'mantido' });
  assert.equal(params.rota, '/recepcao');
  assert.equal(vue.$route.path, '/recepcao');
});

test('outros autocompletes e serviços não recebem o comportamento do cabeçalho', () => {
  const c = helpers();
  const form = component(false);
  const original = form.obj2QueryString;
  c.patchHeaderPatientSearch(form);
  assert.equal(form.obj2QueryString, original);
  const other = component(); other.service = 'medicos.index';
  const originalOther = other.obj2QueryString;
  c.patchHeaderPatientSearch(other);
  assert.equal(other.obj2QueryString, originalOther);
});

test('cache de resultados sem temporários é invalidado e a pesquisa aberta é refeita', () => {
  const vue = component();
  let canceled = 0, refreshed = 0;
  vue.search = vue.searched = 'PACIENTE DE TESTE';
  vue.items = vue.results = [{ id_pessoa: 1 }];
  vue.isOpen = true;
  vue.canceltoken = { cancel() { canceled++; } };
  vue.searchAutoComplete = () => { refreshed++; };
  const nativeSelect = () => {};
  vue.setResult = nativeSelect;
  const c = helpers(); c.patchHeaderPatientSearch(vue); c.patchHeaderPatientSearch(vue);
  assert.equal(canceled, 1);
  assert.equal(refreshed, 1);
  assert.equal(vue.items.length, 0);
  assert.equal(vue.results.length, 0);
  assert.equal(vue.searched, '');
  assert.equal(vue.search, 'PACIENTE DE TESTE');
  assert.equal(vue.setResult, nativeSelect);
});

test('cabeçalho remontado após navegação recebe a mesma correção', () => {
  const c = helpers();
  for (const route of ['/recepcao', '/autorizacoes/lista', '/', '/call-center']) {
    const vue = component(); vue.$route.path = route;
    c.patchHeaderPatientSearch(vue);
    assert.equal(JSON.parse(vue.obj2QueryString({ rota: route })).rota, '/call-center');
    assert.equal(vue.$route.path, route);
  }
});
