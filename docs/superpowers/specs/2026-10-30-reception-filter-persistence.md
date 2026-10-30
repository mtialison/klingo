# Permanência dos filtros da Recepção

Pedido: manter os filtros mostrados na barra da Recepção após recarregar.

Implementação: sessionStorage por aba, conta, unidade e recepção. Guardar somente campos de filtro e IDs, sem objetos de pacientes. Restaurar após montagem/carga inicial; respeitar navegação explícita para paciente/atendimento e intervenção manual durante a espera. Não armazenar via GM ou localStorage nem compartilhar estado entre abas.

Campos nativos: referencia, medico, viewEspec, viewStatus, viewMode, tipo_proced, search, turno, faixa_hora, filtrar_faixa_hora, block_view_pacotes, filtro_teleatend, apenas_editados, id_fila_laudo, filtro_lista_medicos. Campo do script: tipo do agendamento (Todos/Marcado/Extra/Demanda).

Uma restauração completa pode chamar load(false) uma vez. Valores indisponíveis de profissional não devem ser repostos. Falha/corrupção do storage não pode impedir uso da Recepção. A sessão termina ao fechar a aba; filtros de outras abas/computadores não são sincronizados.

Troca nativa de unidade: cada contexto lê somente sua própria chave. Sem histórico naquela unidade, guardar os filtros que o Klingo já apresenta; não limpar data, pesquisa ou tipo que o fluxo existente conserva. Isso mantém a solicitação limitada à persistência no reload. Campos computados ficam a cargo do Klingo; persistir apenas propriedades nativas de $data. Um watcher de prontidão garante a restauração mesmo se o fim da carga não gerar mutação no DOM.

Verificação: reload simulado, isolamento de conta/unidade/aba, carga tardia, filtros limpos, deep links, intervenção manual e storage indisponível. Publicar em testes-codex após regressão completa e revisão.
