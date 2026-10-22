# Klingo userscript

O código-fonte fica em `src/`, na ordem numérica. Para gerar os dois arquivos finais:

```powershell
node tools/build.cjs
```

- `klingo.user.js` é gerado apenas localmente e fica fora da branch `testes-codex`. Ele está **pronto para copiar inteiro para a branch `main`**; suas URLs de atualização apontam para `main`.
- `klingo.test.user.js` é exclusivo de `testes-codex`; suas URLs de atualização apontam para `testes-codex`. Instale-o apenas no ambiente de teste. Como ambos atuam nas mesmas páginas, não deixe as duas instalações habilitadas ao mesmo tempo no mesmo perfil do navegador.

Se você já instalou o antigo arquivo de testes `klingo.user.js`, desative ou remova aquela instalação antes de instalar `klingo.test.user.js`. Esta migração é feita uma vez; depois, cada arquivo segue sua própria branch.

O ícone fica separado em `assets/` para manutenção, mas o comando de build o embute nos dois arquivos finais. O chat usa apenas o aviso sonoro nativo do Klingo. Portanto, promover para `main` continua sendo uma cópia de **um único arquivo**, sem dependências da branch de testes.

Antes de promover, rode cada `tests/*.test.cjs` com Node, confirme `node --check klingo.user.js` e faça os testes visuais no Klingo. Aumente `@version` quando quiser disparar uma atualização automática. O arquivo de testes nunca deve ser copiado para `main`.
