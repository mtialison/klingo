# Diagnóstico de Server Error — 1.78

- Relato: erro esporádico em vários módulos, sem padrão. Nenhuma requisição correspondente capturada nesta tarefa; causa ainda desconhecida. Não alegar correção.
- Observar somente respostas do cliente Axios já utilizado pelo Klingo. Não iniciar consultas, repetir gravações ou ocultar avisos. Conservar retorno/rejeição e interceptores nativos.
- Capturar HTTP5xx, resultados AQL5xx e Error com mensagem literal Server Error/Server Erro. Registrar data/hora, versão, módulo da chamada, método, códigos e nomes dos serviços; sem parâmetros, IDs de paciente, nomes, CPF, contatos, buscas, URL, headers, resposta ou mensagem livre.
- Marcar chamadas diretas do script apenas na configuração local Axios. Marca ausente significa origem não identificada; não prova que a solicitação é nativa. Chamadas nativas iniciadas indiretamente por eventos ou métodos do script podem ficar sem marca.
- Guardar até40 ocorrências em sessionStorage, chave tm_server_failures_v1:<id_usuario>, separada por conta/aba e sobrevivendo ao reload. Não transmitir logs. Descartar respostas de conta anterior, revalidar histórico e tolerar storage bloqueado.
- Captura começa após o userscript anexar os observadores ao cliente; consultas iniciais que já estavam em andamento podem não ser capturadas. Limite da instrumentação, não garantia de ausência de falha.
- Agente consulta o histórico local na próxima ocorrência; usuário só precisa atualizar e avisar quando aparecer. Nenhum comando de Console solicitado.
- Validação: testes de privacidade, limitação/reload, conta, retorno/rejeição, cancelamentos, falha em lote, módulo de início e compatibilidade do script completo. Publicação exclusiva em testes-codex.
