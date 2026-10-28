# Badge de autorização após troca de plano na Recepção

## Evidência e escopo

- A troca para Particular conserva o ID da solicitação no agendamento. `solicitacao_autorizacoes.show` e `index` por ID ainda retornam a solicitação ativa como Aberto, mesmo com seu plano já atualizado.
- A fila nativa Exames tem filtro ativo de exclusão da operadora Particular (`fl_regra:false`, `model_type:App\\azure\\operadora`, `model_id:1`). Esse é um critério de fila, distinto de `fl_servico_autorizacao` (autorização on-line).
- Corrigir somente a visibilidade/vínculo visual; não apagar solicitações, alterar planos ou gravar status. Nenhum acesso ao módulo Relatórios.

## Implementação

- Consultar `fila_autorizacoes.index` e considerar apenas exclusões explícitas de operadora, não removidas, em filas ativas acessíveis. Ocultar apenas quando a operadora é excluída de todas essas filas; outra fila que a aceite preserva a badge. Não interpretar outros tipos de filtros como regra de operadora.
- Reavaliar a operadora do plano atual antes de usar status incorporado ou cache. Ao perder aplicabilidade, remover a div/botão e restaurar a largura nativa da coluna de horário. Não confiar somente no ID histórico.
- Plano com ID divergente durante atualização ou política ainda pendente não deve exibir badge antiga. Resposta atrasada de status não pode recriá-la para operadora excluída.
- Reutilizar regras por conta entre recargas da lista por até 30 segundos. Falha de rede/permissão preserva política conhecida e a funcionalidade da Recepção; sem regras conhecidas, não inferir exclusões.

## Verificação

- [x] Consultas nativas somente de leitura comprovaram vínculo histórico, status Aberto e exclusão configurada.
- [x] Testes falharam antes da implementação e passaram após a correção: troca de plano, restauração da coluna, cache/resposta atrasada, múltiplas filas e autorização on-line desativada sem exclusão.
- [x] Teste do runtime confirma reutilização da política após recarga nativa da lista e descarte visual da resposta antiga.
- [x] Revisão independente sem bloqueios concretos; 10 testes específicos passaram.
- [ ] Build, suíte completa, sintaxe, diff e publicação em testes-codex.
- Não foram editados cadastros nem criados agendamentos nesta tarefa; atualização instalada no Chrome e verificação visual final ficam com o usuário.
