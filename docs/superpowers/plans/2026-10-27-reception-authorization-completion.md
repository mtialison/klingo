# Reception Authorization Completion Implementation Plan

**Goal:** registrar Enviado e Em Sessão nos itens elegíveis do agendamento após Concluir na Recepção.

**Architecture:** módulo isolado observa a invocação nativa de Concluir e envolve o callback de sucesso de `guias.set_numero_atribuido`. Uma sequência sob Web Lock consulta o agendamento e a autorização, preserva campos não envolvidos e confirma duas gravações nativas ordenadas.

**Tech Stack:** userscript JavaScript, Vue 2, Axios/AQL, Web Locks, testes Node.

**Spec:** `docs/superpowers/specs/2026-10-27-reception-authorization-completion.md`.

- [x] Escrever e executar testes que inicialmente falham: escopo por procedimento, preservação, ordem, falhas parciais e gatilho de sucesso.
- [x] Implementar módulo `src/27-recepcao-concluir-status-autorizacao.js`, sem alterar a conclusão nativa.
- [ ] Verificar testes, build e sintaxe; conferir ligação ao componente real sem gravação.
- [ ] Após autorização de teste, validar gravações no registro TESTE e confirmar histórico/estado final.
- [ ] Publicar na branch `testes-codex`, confirmar remoto e registrar resultado no Obsidian.

## Correção 1.63 — reabertura e envio persistido

- [x] Reproduzir as falhas com testes: reabertura dispara indevidamente e store de status não registra envio.
- [x] Inspecionar histórico nativo de etapas e ação `marcar_envio`; testar somente TESTE #26040 autorizado, confirmando data/usuário após restaurar Em Sessão. Nenhum acesso a Relatórios.
- [x] Implementar visita inicial validada no servidor, consumir sucesso uma vez, consultar status novamente antes do envio e confirmar metadados antes e após Em Sessão.
- [x] Bloquear envio global inseguro quando somente secundários são alvo e o principal seria alterado.
- [x] Executar suíte completa (219 testes), build, sintaxe, diff e revisão independente. Formato real de `marcacoes.show` confirmado com histórico/etapas do TESTE concluído.
- [ ] Publicar 1.63 em testes-codex e confirmar remoto.
- Validação real confirmou a ação nativa de envio e a preservação dos metadados após Em Sessão. Um novo fluxo completo com a versão 1.63 e o relatório ficam para a validação manual do usuário; não reiniciar o atendimento TESTE já concluído.

## Correção 1.64 — abertura automática da Recepção

- [x] Inspecionar o token da visita no DevTools: validação rejeitada e visita não consumida no TESTE informado; constatar vínculo correto e autorização ainda Aberto.
- [x] Comparar somente em leitura as consultas em agendamento sem atendimento: consulta com guias falha HTTP 500, básica retorna 200 e histórico inicial válido.
- [x] Confirmar que a guia já tinha conclusão registrada na entrada da terceira aba, antes do Concluir; criar dois testes de integração inicialmente falhos e corrigir as guardas.
- [ ] Build, suíte completa, sintaxe, revisão e publicação 1.64 em testes-codex.
- Teste completo e Relatórios ficam com o usuário, conforme preferência expressa. Nenhum novo agendamento ou conclusão de TESTE nesta tarefa.
