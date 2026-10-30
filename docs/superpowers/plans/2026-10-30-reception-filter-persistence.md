# Reception filter persistence implementation plan

Goal: restaurar a barra de filtros da Recepção ao recarregar, conforme ../specs/2026-10-30-reception-filter-persistence.md.
Architecture: módulo28 isolado; sessionStorage com chave por contexto e whitelist de campos, watcher nativo e ciclo tmRuntime. Tech stack: JavaScript/Vue2/Node test.

- [x] Criar testes de comportamento e confirmar falhas sem persistência.
- [x] Implementar snapshot validado, restauração após carregamento e isolamento de contexto.
- [x] Preservar filtro customizado, deep links e alterações manuais.
- [x] Executar testes focados, suíte completa, build/sintaxe/diff e revisão independente.
- [x] Preparar pacote 1.75 para testes-codex. O envio remoto e o registro no Obsidian são conferidos após o commit.

Review focus: troca de conta/unidade durante carga; opção do profissional ainda ausente; filtros apagados; storage bloqueado/corrompido; retorno a módulo destruído.

Evidências: 14 testes específicos e 249 na suíte completa; build e sintaxe dos dois userscripts aprovados; diff sem erros; revisão independente aprovada. Inspeção de leitura no Chrome confirmou raiz Vue, campos reativos, identidade de usuário e controles. Sem teste de reload da versão instalada nesta tarefa.
