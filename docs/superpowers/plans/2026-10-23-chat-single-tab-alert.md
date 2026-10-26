# Chat Single-Tab Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um som e um título piscando em exatamente uma aba do destinatário por mensagem recebida, somente quando nenhuma aba do Klingo estiver em foco.

**Architecture:** Usar a chegada de mensagem (toast novo ou linha recebida no chat aberto) como entrada, sem confiar no último toast nem no `play` do vídeo como identidade. Coordenar foco, reivindicação de evento e aba executora por estado compartilhado; silenciar o player nativo e usar seu arquivo `/notific.mp3` na aba eleita.

**Tech Stack:** Userscript JavaScript, Tampermonkey GM storage, Web Locks do Chrome, testes Node `vm`.

**Spec:** `docs/superpowers/specs/2026-10-23-chat-single-tab-alert-design.md`

## Global Constraints

- Não transmitir nem registrar conteúdo das mensagens.
- Nenhum aviso se qualquer aba Klingo do destinatário estiver em foco.
- Som e piscar pertencem à mesma aba; áudio usa `/notific.mp3`.
- Não reproduzir avisos antigos ao abrir, atualizar ou trocar de aba.
- Não concluir agendamentos ou enviar mensagens durante os testes.

## Review Focus

- Toasters diferentes entre três abas: um aviso, não dois sons.
- Conversa aberta sem toast: mensagem recebida ainda alerta em segundo plano.
- Troca rápida de foco durante a chegada: nenhum som quando Klingo assume o foco.
- Dois textos idênticos em mensagens sucessivas: não colapsar eventos distintos.
- Reprodução rejeitada pelo Chrome: nenhuma outra aba deve repetir o mesmo aviso.

---

### Task 1: Foco global e player nativo

**Files:** `src/01-notificacao-visual-nova-mensagem.js`, `tests/chat-open-notifications.test.cjs`

**Interfaces:** `isAnyKlingoTabFocused(): boolean`; `syncNativeChatAudio()` mantém `#beepChatId` mudo em todas as abas.

- [ ] Escrever testes para foco de três abas, expiração do heartbeat, troca de foco e player nativo permanentemente mudo.
- [ ] Executar `node --test tests/chat-open-notifications.test.cjs` e confirmar RED pelo comportamento antigo.
- [ ] Implementar presença de foco compartilhada por aba, renovada e removida no `pagehide`; retirar a liberação do vídeo nativo.
- [ ] Executar o teste até GREEN, depois a suíte completa `node --test tests/*.test.cjs`.
- [ ] Commit da tarefa.

### Task 2: Detecção de chegada sem depender de toast antigo

**Files:** `src/01-notificacao-visual-nova-mensagem.js`, `tests/chat-open-notifications.test.cjs`

**Interfaces:** `detectIncomingChatEvents(mutations)` emite apenas novos eventos recebidos; eventos têm chave efêmera sem texto persistido.

- [ ] Escrever testes para toast novo, chat aberto sem toast, linha reutilizada, linha enviada, inicialização e dois textos iguais sucessivos.
- [ ] Confirmar RED.
- [ ] Implementar detector de novas mensagens a partir da estrutura do chat/toast, com baseline por instância e sem ler o último toast como identidade global.
- [ ] Confirmar GREEN e suíte completa.
- [ ] Commit da tarefa.

### Task 3: Uma aba executa som e piscar

**Files:** `src/01-notificacao-visual-nova-mensagem.js`, `tests/chat-open-notifications.test.cjs`

**Interfaces:** `publishChatAlert(event)` reivindica uma vez via Web Lock e estado compartilhado; `runChatAlert(event)` inicia `/notific.mp3` e `startBlink()` na mesma aba.

- [ ] Escrever testes multiaba para 0/6/3 toasts, foco ativo, perda de foco, evento duplicado, dois eventos distintos e rejeição de `play()`.
- [ ] Confirmar RED.
- [ ] Implementar coordenação por evento, prioridade da aba com a conversa aberta quando existir e seleção determinística de uma única aba; parar piscar ao focar Klingo.
- [ ] Confirmar GREEN e suíte completa.
- [ ] Commit da tarefa.

### Task 4: Empacotar e validar no Chrome

**Files:** `tools/build.cjs`, `tests/architecture.test.cjs`, `README.md`, `klingo.test.user.js`

- [ ] Escrever teste RED para a próxima versão de testes.
- [ ] Atualizar versão, documentação e gerar `klingo.test.user.js` com `node tools/build.cjs`.
- [ ] Rodar `node --test tests/*.test.cjs`, `node --check klingo.test.user.js`, `git diff --check`.
- [ ] Revisar a alteração; testar nas abas reais sem enviar mensagem por conta própria. Se faltar uma chegada nova, solicitar ao usuário uma mensagem de teste.
- [ ] Publicar somente `testes-codex` após evidência suficiente; comunicar limites de validação com precisão.
