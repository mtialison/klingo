# Foco confiável para alertas do chat Klingo

## Objetivo

Para mensagens de um remetente cuja conversa está aberta em uma aba do Klingo, emitir som e piscar o título **somente nessa aba** e **somente quando sua janela/aba não estiver em primeiro plano**. Continuar suprimindo alertas e a contagem desse remetente nas outras abas. Nenhum conteúdo de mensagem deve sair do userscript.

## Causa observada

O userscript usa `document.visibilityState` e `document.hasFocus()` para decidir se a aba está em segundo plano. No teste ao vivo, ambos indicaram primeiro plano durante a chegada de uma mensagem com a conversa supostamente em segundo plano. Além disso, a lista nativa mantém 50 itens e reutiliza o último elemento: quando mensagens idênticas substituem mensagens antigas, a comparação atual de contagens por texto não detecta a chegada. Não há evidência de que alterar somente o foco resolva a detecção.

## Arquitetura escolhida

Adicionar uma pequena extensão Chrome Manifest V3, limitada ao domínio Klingo, como sensor de foco. Seu service worker acompanha a aba ativa e a janela focada com as APIs `tabs` e `windows`. Um content script em páginas Klingo recebe o estado, publica na raiz do DOM apenas `foreground` e um instante de atualização, e consulta novamente o service worker periodicamente para evitar estado obsoleto. Não lê mensagens, CPF, nomes ou dados de pacientes; não envia dados pela rede.

O userscript continua responsável por identificar a conversa aberta, coordenar a supressão entre abas, atualizar a contagem, tocar o som e piscar o título. Para o chat aberto, consulta o estado publicado pela extensão. Com estado recente, só notifica quando `foreground=false`; com estado ausente ou obsoleto, usa a verificação atual do documento como fallback, sem quebrar a instalação existente. O foco recuperado interrompe o piscar.

## Detecção de novas mensagens

No modal aberto, observar as alterações da lista nativa de mensagens em vez de depender apenas da quantidade de textos iguais. Registrar uma linha de base ao abrir ou trocar a conversa; mudanças posteriores que representem uma nova mensagem recebida acionam uma única notificação por chegada, inclusive se o total permanece em 50 ou o texto se repete. Evitar notificação ao reabrir o modal, ao renderizar histórico, em alterações de mensagens enviadas pelo próprio usuário e em re-renderizações sem chegada. A lógica deve ignorar o conteúdo para logs; somente sinais efêmeros ficam na memória.

## Entrega e testes

Criar arquivos da extensão e instruções de instalação manual; nenhuma instalação automática. Acrescentar testes unitários para foco (aba ativa, janela sem foco, outra aba, ausência/expiração da extensão) e para chegadas repetidas com lista limitada a 50, troca de conversa e mensagens próprias. Rodar a suíte, checagem sintática e build. Publicar somente na branch `testes-codex`. Validar no Klingo com a extensão carregada manualmente pelo usuário, sem enviar mensagens reais nem concluir agendamentos por conta própria.

## Limites

A extensão só entrega o estado do navegador; o aviso sonoro ainda está sujeito à política de reprodução do Chrome. A instalação precisa ser feita no perfil Chrome em que o Tampermonkey opera. A versão de produção não deve ser promovida antes de validar o comportamento nas duas abas.
