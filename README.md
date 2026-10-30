# Klingo userscript

O código-fonte fica em `src/`, na ordem numérica. Para gerar os dois arquivos finais:

```powershell
node tools/build.cjs
```

- `klingo.user.js` é gerado apenas localmente e fica fora da branch `testes-codex`. Ele está **pronto para copiar inteiro para a branch `main`**; suas URLs de atualização apontam para `main`.
- `klingo.test.user.js` é exclusivo de `testes-codex`; suas URLs de atualização apontam para `testes-codex`. Instale-o apenas no ambiente de teste. Como ambos atuam nas mesmas páginas, não deixe as duas instalações habilitadas ao mesmo tempo no mesmo perfil do navegador.

Se você já instalou o antigo arquivo de testes `klingo.user.js`, desative ou remova aquela instalação antes de instalar `klingo.test.user.js`. Esta migração é feita uma vez; depois, cada arquivo segue sua própria branch.

O ícone fica separado em `assets/` para manutenção, mas o comando de build o embute nos dois arquivos finais.

O aviso personalizado (som e título piscando) para mensagens da conversa já aberta foi retirado na versão de testes **1.49**. Permanecem a supressão dos avisos duplicados em outras abas e o ajuste da contagem. Se você carregou manualmente o antigo complemento de foco, remova-o em `chrome://extensions`; o userscript já não depende dele.

Na versão de testes **1.50**, as abas coordenam o som nativo de cada novo aviso para que apenas uma o reproduza, inclusive quando a aba responsável muda ou é fechada. A regra que silencia mensagens de uma conversa aberta em outra aba continua ativa.

Na versão de testes **1.51**, o vídeo nativo de aviso é silenciado em todas as abas. Uma aba por conta usa o arquivo `/notific.mp3` para som e título piscando juntos, somente quando nenhuma aba do Klingo está em foco. O disparo usa o ID da mensagem recebida pelo chat nativo; observação de toasts e da conversa serve apenas como alternativa se o componente nativo não estiver acessível. Toasts antigos não acionam alertas.

Na versão de testes **1.52**, a aba eleita reutiliza o player nativo do Klingo em vez de criar áudio no contexto da extensão, que o Chrome bloqueava em segundo plano com `NotAllowedError`. Mensagens que chegam rapidamente entram em uma fila e cada som termina antes do próximo começar, sem reiniciar o alerta anterior.

Na versão de testes **1.53**, heartbeats simultâneos de foco vindos de várias abas são descartados como um estado impossível. Isso impede que foco emulado ou inconsistente suprima o som e o título quando o usuário está fora do Klingo.

Na versão de testes **1.54**, todo áudio de notificação foi desativado: o userscript não reproduz som e silencia os players nativos `beepChatId` e `beepPagId`. O aviso visual no título da aba permanece.

Na versão de testes **1.55**, o userscript cria um toque próprio com Web Audio para cada mensagem, na mesma aba responsável pelo título piscando. Toques rápidos são enfileirados. Os players nativos seguem silenciados. O Chrome exige uma interação prévia com o Klingo para liberar áudio; alertas bloqueados não são reproduzidos com atraso ao voltar à aba.

Na versão de testes **1.56**, a aba Autorizações oferece **Aberto + Enviado** acima de Aberto. A combinação mantém os demais filtros e a ordem do servidor, lê todas as páginas dos status ativos e apresenta somente os status 0 e 6, com paginação recalculada e até duas consultas simultâneas. Períodos extensos podem demorar mais. As opções de edição de status e o filtro inicial Aberto permanecem nativos.

Na versão de testes **1.57**, o botão 🐵 à direita da versão no cabeçalho abre em outra aba o userscript da branch `main`, como atalho para atualização manual pelo Tampermonkey.

Na versão de testes **1.59**, agendamentos da Recepção vinculados a uma solicitação exibem uma badge clicável entre horário e paciente. O texto e a cor vêm do status nativo da autorização; o clique abre o modal nativo disponível na própria Recepção. Consultas de leitura são agrupadas por ID, deduplicadas e limitadas a duas simultâneas; a atualização da listagem invalida o cache.

Na versão de testes **1.60**, autofill e cliques na página deixam de disparar login. A tentativa automática usa exclusivamente `navigator.credentials.get({password: true, mediation: 'silent'})`: o navegador só fornece uma credencial sem escolha quando existe uma única opção elegível e a entrada silenciosa está permitida. Sem essa confirmação (inclusive com várias contas), o usuário escolhe a conta e usa Entrar/Enter. Interações manuais cancelam tentativas pendentes. Referência: [guia do Chrome](https://web.dev/articles/security-credential-management-retrieve-credentials).

Na versão de testes **1.61**, a pesquisa de pacientes no cabeçalho inclui cadastros **Primeira Vez** em qualquer módulo. Apenas o parâmetro de contexto dessa busca passa a usar `/call-center`, que permite os cadastros temporários no servidor; a rota atual e a abertura nativa dos resultados permanecem intactas. O cache do autocomplete é invalidado ao aplicar a correção para não reaproveitar resultados incompletos.

Na versão de testes **1.62**, Concluir na etapa de guias da Recepção passa a atualizar a autorização vinculada após a confirmação nativa de sucesso. Somente os procedimentos ativos deste atendimento em Aberto (0), Em análise (2) ou Pendente (11) recebem duas gravações ordenadas: Enviado (6), depois Em Sessão (10). Outros procedimentos, senhas, datas e campos da solicitação são preservados. A sequência consulta novamente o registro entre gravações, usa Web Lock por autorização e informa falhas parciais. Imprimir, fechar o modal ou falhar a conclusão não aciona a sequência. Itens duplicados com o mesmo ID de procedimento exigem revisão manual. Em solicitações com vários itens, o status geral pode continuar refletindo os demais procedimentos.

Antes de promover, rode cada `tests/*.test.cjs` com Node, confirme `node --check klingo.user.js` e faça os testes visuais no Klingo. Aumente `@version` quando quiser disparar uma atualização automática. O arquivo de testes nunca deve ser copiado para `main`.

Na versão de testes **1.68**, a retomada de rascunhos protege também remarcações, orçamentos e infusões em andamento; a badge de autorização prioriza o status consultado e pode ser atualizada mesmo quando o agendamento contém um status incorporado; o filtro **Aberto + Enviado** aguarda a reinserção de sua opção antes de restaurar a seleção; ao voltar ao Klingo ou perder a responsabilidade pelos avisos, os sons ainda agendados são cancelados. Seis novos casos de regressão cobrem as correções; a suíte tem 232 testes. Validação integrada no Chrome permanece necessária.
