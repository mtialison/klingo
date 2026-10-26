# Alerta único do chat entre abas — design

## Intenção

Para cada mensagem recebida pelo destinatário, chamar sua atenção somente quando ele estiver fora de todas as abas do Klingo: um som e um título piscando, ambos na mesma e única aba. Ao voltar ao Klingo, o piscar cessa. A aba remetente não participa da eleição do destinatário.

## Evidência e restrições

- O Klingo usa `<video id="beepChatId" src="/notific.mp3">` em cada aba; cada instância toca de forma independente.
- As três abas reais do destinatário tinham 0, 6 e 3 toasts. Logo, o último toast não identifica a mesma mensagem entre abas.
- A rotina atual de piscar depende de toast; a conversa aberta pode não produzir toast, e a supressão global o remove.
- O estado de foco precisa ser compartilhado entre todas as abas do Klingo. Não se deve supor que `document.hasFocus()` de uma aba descreve as demais.
- A rotina nativa `receberMensagem(a)` recebe `id_chat_sala_mensagem`, que identifica mensagens distintas mesmo com texto igual. O listener do socket chama `a.receberMensagem(t.data)` dinamicamente.
- Não ler ou armazenar conteúdo de mensagens em logs persistentes. Não enviar mensagens automaticamente durante os testes.

## Abordagens

1. **Continuar interceptando `play` nativo:** mudança menor, mas não fornece identidade estável de mensagem, depende do momento em que cada aba inicia o vídeo e não aciona o piscar quando não há toast. Rejeitada após falhas repetidas.
2. **Usar somente toasts:** simples quando o chat está fechado, mas não cobre conversa aberta e os conjuntos de toasts divergem entre abas. Rejeitada.
3. **Coordenar o alerta no userscript, reproduzindo o arquivo nativo do Klingo:** escolhida pelo usuário. Detectar a chegada pelo ID no método nativo; usar toast ou lista da conversa como alternativa; publicar apenas uma chave efêmera compartilhada; eleger uma aba do destinatário para som e piscar; bloquear o vídeo nativo nas demais.

## Comportamento

- Na inicialização, registrar o estado atual sem alertar por mensagens antigas.
- Reconhecer apenas novas mensagens recebidas, não mensagens enviadas pelo próprio usuário nem re-renderizações de mensagens antigas.
- Se qualquer aba do Klingo estiver ativa no navegador, não reproduzir som nem piscar.
- Se nenhuma estiver ativa, uma única aba reivindica o evento e executa som e piscar. O áudio usa `/notific.mp3`, sem novo arquivo.
- Se o som for bloqueado pelo navegador, não tentar dispará-lo em outras abas para o mesmo evento; registrar erro técnico sem conteúdo da mensagem.
- Ao focar qualquer aba do Klingo, parar o piscar, preservando toasts e contadores nativos fora do escopo desta mudança.
- Se o browser não oferecer exclusão entre abas, falhar sem som duplicado; o título pode continuar como alerta.

## Verificação

Testes automatizados para: três abas destinatárias com toasts diferentes; chat aberto sem toast; mensagem enviada versus recebida; alternância de foco; duas mensagens sucessivas; re-renderização; bloqueio de áudio. Depois, teste manual com as quatro abas reais antes de declarar correção definitiva.
