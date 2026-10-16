# Klingo userscript

O código-fonte fica em `src/`, na ordem numérica. `klingo.user.js` é gerado pela concatenação dos módulos:

```powershell
node tools/build.cjs
```

Para testar, execute cada `tests/*.test.cjs` com Node e confirme `node --check klingo.user.js`. O teste de arquitetura também verifica se a distribuição corresponde exatamente aos módulos.

`klingo.user.js` na raiz é o canal de testes. A atualização automática aponta para `release/klingo.meta.js` e baixa `release/klingo.user.js`, que só muda com promoção explícita. Um push comum no canal de testes não altera a versão estável. Depois da validação, aumente `@version`, reconstrua, rode os testes e execute `node tools/promote-release.cjs --promote`. Inclua os arquivos `release/` no mesmo commit.

Instalações antigas que ainda apontam para o arquivo da raiz não migram sozinhas enquanto a versão de testes não for aumentada. A migração deve ocorrer junto com uma promoção validada; até lá, a versão na raiz permanece igual à versão estável para impedir uma atualização automática de código ainda em teste.
