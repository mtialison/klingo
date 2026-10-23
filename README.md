# Klingo userscript

O código-fonte fica em `src/`, na ordem numérica. Para gerar os dois arquivos finais:

```powershell
node tools/build.cjs
```

- `klingo.user.js` é gerado apenas localmente e fica fora da branch `testes-codex`. Ele está **pronto para copiar inteiro para a branch `main`**; suas URLs de atualização apontam para `main`.
- `klingo.test.user.js` é exclusivo de `testes-codex`; suas URLs de atualização apontam para `testes-codex`. Instale-o apenas no ambiente de teste. Como ambos atuam nas mesmas páginas, não deixe as duas instalações habilitadas ao mesmo tempo no mesmo perfil do navegador.

Se você já instalou o antigo arquivo de testes `klingo.user.js`, desative ou remova aquela instalação antes de instalar `klingo.test.user.js`. Esta migração é feita uma vez; depois, cada arquivo segue sua própria branch.

O ícone fica separado em `assets/` para manutenção, mas o comando de build o embute nos dois arquivos finais.

## Complemento de foco para o chat (testes)

O aviso de uma conversa aberta precisa saber qual **aba e janela** do Chrome estão ativas. O complemento em `chrome-focus-extension/` informa apenas esse estado ao userscript; não lê nem transmite conteúdo de mensagens ou dados de pacientes. Sem o complemento, o script usa o foco informado pela própria página, que se mostrou impreciso em alguns testes.

Para testar no Chrome, abra `chrome://extensions`, habilite **Modo do desenvolvedor**, clique em **Carregar sem compactação** e selecione a pasta `chrome-focus-extension` deste checkout. Mantenha habilitado o userscript `klingo (testes)` **1.48** e recarregue as abas do Klingo. Uma instalação do complemento só afeta `https://samec.klingo.app/*`.

Teste com duas abas: deixe a conversa TESTE aberta em uma, mude para a outra e provoque uma mensagem de teste. Som e título piscando devem ocorrer apenas na aba da conversa que ficou em segundo plano; não devem ocorrer quando essa aba está em primeiro plano. Na outra aba, a mensagem desse remetente não deve gerar alerta nem aumentar o contador. Nenhum agendamento deve ser concluído para validar isso.

Não promova esta versão de testes para `main` antes de validar o complemento no Chrome. O complemento deve ser instalado manualmente em cada perfil Chrome que precise desse comportamento.

Antes de promover, rode cada `tests/*.test.cjs` com Node, confirme `node --check klingo.user.js` e faça os testes visuais no Klingo. Aumente `@version` quando quiser disparar uma atualização automática. O arquivo de testes nunca deve ser copiado para `main`.
