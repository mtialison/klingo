# Editar marcações faltosas no perfil

**Objetivo:** incluir Editar imediatamente à direita de Remarcar nas faltas do perfil.

**Desenho:** aproveitar o render nativo do PEP e a referência `marcacao` passada ao componente `pre-atendimento-view` de cada card. Acrescentar um botão Vue no mesmo grupo do Remarcar e chamar `editar_marcacao(marcacao)`, exatamente como no agendamento futuro. O módulo 33 já mantém o perfil sob o editor. Não alterar estado, data, atendimento ou fluxo de gravação.

**Restrições:** somente perfil, usuário interno, falta sem atendimento e sem cancelamento/bloqueio. Revalidar vínculo e status ao clicar. Nada de gravações em pacientes para testar; main e alterações manuais preservadas.

## Execução

- [x] Reproduzir em testes a ausência do botão, associação correta entre cards e chamada nativa.
- [x] Criar módulo 40 com patch de render por instância e restauração ao desmontar.
- [x] Cobrir rerender, fechamento, mudança de status/registro, histórico/impressão e usuário externo.
- [x] Executar suíte e checagens, revisar diff e gerar versão 2.11.
- [x] Preparar versão 2.11 para publicação em testes-codex; confirmar remoto após o envio.

**Evidência nativa:** bundle público app.688309f0.js: ramo `faltoso` do PEP contém apenas Remarcar; método `editar_marcacao(a)` chama `$root.editar_marcacao(a.id_marcacao)`; editor nativo considera inativas apenas marcações B/C.

**Validação:** 343 testes aprovados, incluindo 7 novos casos; build e sintaxe dos dois scripts aprovados. RED observado para ausência do botão e, depois, para reutilização do objeto/disabled vazio antes das correções. O teste de arquitetura foi atualizado para a versão publicada. Revisão independente indisponível por limite de uso do agente; revisão própria feita contra o bundle nativo. Sem teste visual ou gravação real no Klingo nesta tarefa.
