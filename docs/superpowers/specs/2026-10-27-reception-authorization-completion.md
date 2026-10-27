# Atualização da autorização ao concluir a recepção

- Após o sucesso nativo de Concluir na etapa de guias (etapa 8), atualizar somente os procedimentos do atendimento deste agendamento. Escopo confirmado pelo usuário em 2026-10-27.
- Para cada item em Aberto (0), Em análise (2) ou Pendente (11), gravar Enviado (6) e aguardar sucesso antes de gravar Em Sessão (10).
- Usar a consulta de edição e o serviço `solicitacao_autorizacoes.store` utilizados pelo modal nativo. Preservar todos os demais campos e itens.
- Não acionar ao fechar o modal, imprimir, voltar, falhar a conclusão ou não haver vínculo de autorização.
- Consultar novamente entre gravações, serializar por autorização entre abas e impedir atualização de itens cujo estado tenha mudado. Não tentar adivinhar itens duplicados com o mesmo ID de procedimento.
- Falhas devem informar que a recepção foi concluída, mas a autorização precisa de revisão; não refazer a recepção nem esconder uma gravação parcial.
- Testes reais com gravação dependem de autorização específica para o registro TESTE; nenhum paciente real deve ser alterado durante a validação.
