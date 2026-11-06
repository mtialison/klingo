# Configurações: procedimentos de todas as especialidades

**Objetivo:** carregar a listagem nativa sem exigir escolha de especialidade; o filtro vazio passa a significar Todas as especialidades.

**Evidência:** chunk público `chunk-15c7a508.8f51f128.js`, componente c-procedimentos. `load` envia `where.id_especialidade:-1` quando o filtro está vazio, com paginação100; o render pede seleção da especialidade. A consulta procedures.index já é usada sem especialidade em outros componentes nativos.

**Desenho:** envolver somente o load da instância da página, retirando o sentinela -1 do payload da listagem via fachada temporária do cliente. Manter o load nativo, cancelamento, paginação, busca, classificação, modo ativo e edição. Ajustar placeholder e estado vazio no render; não simular especialidade nem habilitar inclusão/ações em lote sem ela. Padrão Todas ao entrar, escolha manual preservada depois.

**Limites:** somente rota de configuração; não atuar no setup nem em abertura direta por ID; sem alteração no servidor ou outras buscas. Não consultar pacientes, não gravar cadastros. Main e alterações manuais preservadas.

- [x] Testes RED: filtro vazio, seleção manual, paginação/busca, detalhe, erros, desmontagem e isolamento do cliente.
- [x] Implementar módulo41 e verificar GREEN.
- [x] Build2.12, 351 testes, sintaxe e diff-check; preparar publicação em testes-codex e conferir o remoto após o envio.

Validação no servidor da clínica depende de sessão conectada; Playwright disponível está isolado e não possui a sessão do usuário. Em teste de integração isolado, Vue2.6.14 com render/load originais do chunk público e transporte fictício exibiu2procedimentos de especialidades7/8, enviou where:{} comsize100, exibiu placeholderTodas e removeu o pedido de seleção. Nenhuma consulta clínica nem gravação foi feita.

## Correção2.13 após retorno do usuário
- O teste anterior preservava artificialmente id=app no render raiz. O bootstrap público do Klingo usa mount(#app) e render de componente, podendo substituí-lo. Sem o ID, o módulo nem era ativado.
- Regressão RED sem #app confirmada; descoberta de instâncias Vue no DOM resolve a ativação sem depender do ID.
- Integração isolada com montagem substituindo #app: mountPointRemains=false antes; após correção calls=1/where={}/rows=2/prompt=false/allSpecialties=true. Não substitui teste com resposta real da clínica.
