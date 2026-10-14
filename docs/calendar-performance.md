# Calendários — v26.34

## Gargalos encontrados no código

- A pré-busca tinha debounce de 180 ms e a fila aguardava o carregamento nativo terminar.
- Na Confirmação, mudanças de filtros passavam também pela fila geral de atualização da interface.
- Abrir/navegar podia cancelar a pré-busca. Os meses vizinhos só eram buscados com o popup fechado, após mais 750 ms.
- Recepção e Confirmação usavam instâncias separadas: compartilhar o classificador não compartilhava cache nem requisições.
- A Confirmação não renovava automaticamente o cache e uma falha podia deixar a chave marcada como já pré-carregada.

## Implementação

1. Eventos `input` e `change` capturados diretamente iniciam a busca, sem debounce, clique no calendário ou espera pela fila geral. Na Recepção, um watcher continua cobrindo alterações programáticas do Vue.
2. Uma fonte de dados, fila e cache em memória atendem às duas telas. A chave inclui médico, unidade e data; trocar de usuário invalida o cache.
3. Pedidos simultâneos compartilham promessas. Datas e metadados sobrepostos são deduplicados, inclusive entre meses ainda em trânsito.
4. O mês de referência/aberto tem prioridade. Depois vêm +1, +2 e -1. Abrir outro mês promove suas consultas pendentes sem reiniciar as já feitas. Navegar para fora dessa janela busca o mês solicitado sob demanda.
5. No máximo duas requisições próprias simultâneas; apenas uma quando o Klingo está carregando ou quando a fila atende meses secundários. A conclusão da requisição acorda a fila, sem polling de carregamento nativo.
6. A abertura pinta sincronamente com o cache disponível. Respostas adicionais pintam progressivamente, agrupadas por frame. Não há DOM de calendário sendo construído enquanto ele está fechado.
7. O contexto ativo renova o mês a cada 90 segundos; falhas tentam novamente após 15 segundos. Dias e metadados têm validade de 2 minutos. Cores verificadas ficam retidas por até 15 minutos durante revalidação, mas não após invalidação explícita.
8. Atualização manual, mutações de agenda reconhecidas e troca de conta invalidam os resumos. Aba oculta ou saída dos módulos interrompem trabalho pendente; trocar entre os módulos mantém cache e permite aproveitar consultas em trânsito.
9. Foram preservados filtros conservadores para reaproveitar respostas nativas, conferência de períodos incompletos, fallback diário, regras de feriado/bloqueio e ausência de cores no segundo campo da Confirmação.

Nenhum paciente é persistido no cache. Os limites são 1.008 resumos de datas, 168 semanas e 12 entradas anuais de feriados. A consulta continua somente de leitura.

## Validação

`node --check klingo.user.js` e `node --test tests/*.test.cjs`.

Os testes executam a fonte, os coordenadores e as interfaces com DOM/HTTP simulados: seleção sem popup, carregamento nativo, ordem dos meses, prioridade de navegação, datas sobrepostas sem duplicação, cache entre módulos, retorno imediato ao mês, falhas/retries, renovação, troca de contexto/conta, suspensão e regras de cores. Os antigos testes textuais de compartilhamento/pré-busca foram substituídos por verificações de comportamento.

Esses testes não medem a latência real do servidor. A primeira consulta ainda depende dos endpoints do Klingo, que retornam agendas completas. Não se deve substituir esses dados por cores presumidas. A melhoria retira espera e repetição no cliente; uma garantia de primeira abertura instantânea exigiria dados previamente carregados ou um endpoint mensal resumido no servidor.

### Roteiro de verificação no Klingo

- Com a v26.34 instalada, selecionar médico sem abrir o calendário: conferir que começam requisições `aql?a=agendas.index&page=1`.
- Abrir enquanto carrega: as consultas em andamento não devem ser canceladas/repetidas.
- Aguardar o mês ficar pronto, fechar e abrir: cores já disponíveis; navegar e voltar deve manter os resumos.
- Repetir na Confirmação e trocar entre as telas com mesmo médico/unidade.
- Trocar rapidamente de médico: não devem aparecer cores do anterior nem avisos de cancelamento.
- Verificar que o segundo campo da Confirmação continua sem pintura.

Não recarregar uma aba com rascunhos em espera para executar esse roteiro sem antes resolver esses rascunhos.
