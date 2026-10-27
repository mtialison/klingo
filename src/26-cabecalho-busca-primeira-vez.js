/* CABEÇALHO — incluir os cadastros Primeira Vez na busca global de pacientes. */
(function () {
  'use strict';

  function isHeaderPatientSearch(vue) {
    return vue?.service === 'pacientes.index' &&
      vue.$parent?.$options?.name === 'AutocompletePaciente' &&
      !!vue.$el?.closest('nav.navbar') &&
      typeof vue.obj2QueryString === 'function';
  }

  function patchHeaderPatientSearch(vue) {
    if (!isHeaderPatientSearch(vue) || vue.obj2QueryString.__tmHeaderFirstVisit) return;
    const original = vue.obj2QueryString;
    const wrapped = function (parameters) {
      // pacientes.index inclui cadastro_temporario no contexto do Call Center.
      // Altere apenas esse parâmetro da busca; $route e a seleção nativa continuam intactos.
      return original.call(this, isHeaderPatientSearch(this) && parameters && typeof parameters === 'object'
        ? { ...parameters, rota: '/call-center' } : parameters);
    };
    wrapped.__tmHeaderFirstVisit = true;
    vue.obj2QueryString = wrapped;

    // O autocomplete otimizado reutiliza resultados de prefixos já consultados.
    // Não deixe o cache antigo, sem temporários, alimentar a busca corrigida.
    vue.canceltoken?.cancel('#BC#');
    vue.items = [];
    vue.results = [];
    vue.searched = '';
    if (vue.isOpen && typeof vue.search === 'string' && vue.search.trim().length >= 2) {
      vue.searchAutoComplete();
    }
  }

  function ensureHeaderPatientSearch() {
    const input = document.querySelector('nav.navbar #autcomplete-paciente input');
    for (let node = input; node; node = node.parentElement) {
      if (isHeaderPatientSearch(node.__vue__)) {
        patchHeaderPatientSearch(node.__vue__);
        return;
      }
    }
  }

  tmRuntime.register('busca global de pacientes Primeira Vez', ensureHeaderPatientSearch);
})();
