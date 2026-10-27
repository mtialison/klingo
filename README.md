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

Antes de promover, rode cada `tests/*.test.cjs` com Node, confirme `node --check klingo.user.js` e faça os testes visuais no Klingo. Aumente `@version` quando quiser disparar uma atualização automática. O arquivo de testes nunca deve ser copiado para `main`.
