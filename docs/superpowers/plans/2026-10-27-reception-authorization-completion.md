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
