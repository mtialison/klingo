# Remarcação nativa em modal

Design aprovado pelo usuário na conversa em 2026-11-05: manter Recepção/Confirmação montadas enquanto o usuário escolhe nova data no componente nativo Marcacao, em modal amplo. Conservar seleção inicial Remarcar, mesma unidade por padrão, regras, disponibilidade, gravação e resumo nativos. Avançar fecha o modal e atualiza a lista original, preservando filtros e rolagem.

Abordagem escolhida: instância local do componente Vue nativo, com roteamento isolado no modal. Alternativas consideradas: persistir filtros no retorno de página (mantém a troca de página indesejada); incorporar página inteira (duplicaria aplicação e sessão). Sem novos endpoints de gravação.

Restrições: somente /recepcao e /call-center/confirmacao; Centro Cirúrgico/Infusão e outras origens continuam nativos. Impedir duplo envio e fechamento durante gravação. Montar sem alterar rota global; restaurar foco, scroll, filtros e recursos ao fechar. Não concluir remarcações reais em testes sem autorização específica. Publicar somente testes-codex; preservar alterações manuais e main.

Pontos a validar: props params/remarcacao, retorno go(-1), modais internos, renovação de listas sem perder contexto, timers/reservas e desmontagem.
