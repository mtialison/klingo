# Remover o alerta personalizado da conversa aberta

## Intenção

O aviso personalizado de som e título piscando para uma conversa de chat aberta não funcionou de forma confiável no Chrome. Retirar essa função experimental e o complemento de foco, mantendo os demais ajustes do userscript para o chat.

## Abordagens

- **Escolhida:** remover apenas o aviso personalizado da conversa aberta e a extensão que informa o foco. Preserva a supressão de avisos duplicados em outras abas, a contagem ajustada e outros recursos do userscript.
- Alternativa não escolhida: remover todos os ajustes de chat e usar integralmente o comportamento nativo do Klingo. Isso alteraria mais recursos do que o usuário pediu.

## Escopo

- Apagar `chrome-focus-extension/` e suas instruções/testes específicos.
- Remover do módulo de chat o detector de mensagens da conversa aberta, o `Audio('/notific.mp3')` associado, o piscar específico e a leitura dos atributos de foco da extensão.
- Manter a coordenação entre abas já existente para avisos nativos e contagem, bem como o piscar de outros avisos que não pertencem à conversa aberta.
- Eliminar testes obsoletos, atualizar a versão do userscript de testes e gerar o artefato. Executar toda a suíte e publicar somente em `testes-codex`.

## Limites

Não é uma correção da política nativa de som do Klingo. Ao retirar o aviso personalizado, a conversa aberta deixa de receber esse som/piscar criado pelo script; os avisos nativos permanecem sujeitos à supressão entre abas já implementada.
