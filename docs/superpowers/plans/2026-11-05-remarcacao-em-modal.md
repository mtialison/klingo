# Remarcação em modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remarcar sem sair da Recepção ou Confirmação.
**Architecture:** Interceptar somente a navegação selecionada pelo modal nativo Remarcar. Montar Marcacao em host local com router/route isolados; manter gravação nativa e fechar/atualizar origem após Avançar.
**Tech Stack:** Userscript JavaScript, Vue2, Bootstrap4, testes node:test.
**Spec:** ../specs/2026-11-05-remarcacao-em-modal-design.md

## Global Constraints
- Publicar somente testes-codex, main e alterações manuais preservadas.
- Sem concluir remarcações reais sem autorização específica.
- Rotas-alvo: /recepcao e /call-center/confirmacao; demais origens permanecem nativas.

## Review Focus
- Clique repetido/duplo envio: uma instância ativa e fechamento bloqueado enquanto buscando.
- Voltar/Escape/X e navegação externa: desmontagem e restauração do contexto.
- Rota global e outros módulos: navegação isolada e fallback nativo.
- Modais internos e IDs: seleção do horário abre o formulário correto.
- Falha/cancelamento e timers: não atualizar origem como sucesso nem vazar recursos.

### Task 1: Integração nativa e ciclo de vida
**Files:** Create src/38-remarcacao-em-modal.js; tests/reschedule-modal.test.cjs.
**Interfaces:** consumir remarcar-combo.selecionar, dados e $router.push; usar componente Marcacao, props remarcacao/params, método avancar_aviso_final. Produzir host modal e cleanup.
- [x] Registrar testes que falham: payload da seleção nativa, rota original intacta, fluxo de sucesso sem go(-1), filtros/rolagem, fechamento bloqueado e cleanup.
- [x] Implementar interceptação por instância, montagem local e isolamento de rota.
- [x] Validar abertura, datas e cancelamento no Klingo sem gravação.
- [x] Verificar modal de horário/formulário e tratamento de erros antes da publicação.

### Task 2: Entrega
**Files:** tools/build.cjs; tests/architecture.test.cjs; klingo.test.user.js.
- [x] Atualizar versão de testes e gerar bundles.
- [x] Rodar suíte completa, sintaxe e git diff --check (338 testes).
- [x] Revisar escopo e limites; publicação e confirmação remota executadas na entrega 2.00.

## Execution ledger
- BASE: 951e8ac, checkout existente klingo-test-branch/testes-codex, inicialmente limpo. Sem nova worktree; main preservada.
- Ruling: host é filho Vue do root estável, não do componente da rota — permite encerrar com segurança mesmo após navegação externa durante um envio.
- Ruling: root de roteamento local fornece params/rota /call-center ao componente e filhos; nenhum estado de rota global é alterado.
- Ruling: IDs de modais ocultos colidentes da origem são mascarados enquanto o host existe e restaurados no fechamento. Reproduzido na Recepção; Confirmação não tinha colisões inicialmente.
- Ruling: gravação continua exclusivamente pelo marcar/axios nativo. Wrapper só deduplica agendas.store e confirma status200 para controlar encerramento/refresh. Sem endpoint de gravação novo.
- Integração: seleção inicial nativa, datas reais, minutoModal e cadastroModal abertos nas duas rotas; saída sem gravar preservou médico/data/modo e removeu backdrops/IDs temporários.
- Revisão independente: um P2 de foco corrigido com teste RED/GREEN. Ampliada cobertura para Escape com modal interno, mudança de rota com gravação pendente e rejeição de rede/retry.
- Limite: nenhuma remarcação foi gravada nos testes reais. Conclusão real fica para validação manual do usuário; conclusão e falhas cobertas com contrato dos métodos nativos no teste automatizado.
