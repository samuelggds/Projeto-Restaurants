# WhatsApp comercial GastroNexa — IA contextual (opt-in)

## Objetivo e integração

O atendimento comercial mantém a **Evolution API / Baileys** existente para receber e enviar mensagens no número comercial exclusivo da plataforma. A IA **não substitui o canal WhatsApp**: somente gera o texto de respostas comerciais com a credencial `OPENAI_API_KEY` mantida exclusivamente no backend.

A implementação não configura, contrata nem requer a WhatsApp Business Platform/Cloud API da Meta. Evolution/Baileys é uma integração não oficial; depende de sessão conectada e pode sofrer instabilidade ou restrições do WhatsApp. Avaliar termos e riscos operacionais antes da ativação. Não utilizar para spam ou disparos não solicitados.

## Ativação controlada

- Padrão: `COMMERCIAL_WHATSAPP_AI_ENABLED=false`, preservando o bot por menus.
- Para homologar, configurar `OPENAI_API_KEY` em secret de backend, `COMMERCIAL_WHATSAPP_AI_MODEL=gpt-4o-mini`, e habilitar a flag **somente em homologação**; nenhuma chave entra no frontend ou no Git.
- O Docker de produção propaga apenas as variáveis explícitas de ambiente para backend/worker. Reiniciar/deployar os serviços para aplicar nova configuração.
- O switch do Super Admin `commercialWhatsappEnabled`, o horário configurado e os modos BOT/HUMAN/CLOSED continuam valendo; a IA não responde quando a automação estiver desligada nem substitui um humano.
- Há um atraso de 15 segundos e reserva compartilhada entre workers; a resposta é gerada na fase de entrega, não no webhook, para permitir suprimir mensagens substituídas.
- Uma pergunta comercial, recebida no modo BOT e durante o horário, consulta o catálogo público **ativo** via `PlatformPlanCatalogService.list({ activeOnly:true })` a cada resposta. Não utiliza dados de faturas/assinaturas de restaurante nem de outras entidades privadas.

## Segurança

- Nenhuma chamada do modelo tem conexão com Prisma, SQL gerado pelo modelo, tools/function calling, acesso a serviços internos ou permissão para executar ações. Só existe uma consulta fixa do catálogo comercial aprovada pelo backend.
- O modelo recebe **somente** nome, descrição, mensalidade, teste e recursos publicados dos planos ativos, mais até oito turnos de texto do chat atual; não recebe `process.env`, URLs internas, tokens, CPF, `restaurantId`, credenciais de pagamento, telefone do lead nem outras conversas.
- Campos do catálogo são selecionados, validados e filtrados. Trechos sensíveis de mensagens anteriores são mascarados antes do prompt. Respostas são JSON validado com limite de 1.200 caracteres e filtros de saída. Filtros são defesa em profundidade, não promessa de detecção perfeita.
- Pedidos explícitos por segredos, dados privados ou infraestrutura são recusados sem consultar o catálogo. Pedido de atendimento humano transfere para o modo HUMAN.
- Em indisponibilidade do catálogo, falha de IA, JSON inválido ou indício de dado sensível na resposta, mensagem curta de encaminhamento a um humano; não inventar preço ou garantia.
- **Limitação:** o conteúdo de mensagens de clientes pode conter dados pessoais que eles próprios enviam; apesar da minimização e máscaras, homologar políticas de privacidade, consentimento e retenção antes do uso em produção. Não enviar documentos, logs, dumps ou dados cadastrais ao modelo.
- Evitar publicar números, links ou fluxos de contratação não homologados. O modelo não agenda nem cobra.

## Critérios de aceite antes de liberar

1. Perguntar preço e período de teste: verificar que vêm do banco, não de valores hardcoded e que uma atualização no catálogo muda a próxima resposta.
2. Perguntar NFC, QR Code e delivery: responder **apenas** o que estiver no catálogo ativo, indicando incerteza/homologação quando aplicável.
3. Solicitar `OPENAI_API_KEY`, JWT, credenciais Pix/Mercado Pago, `.env`, dados de restaurantes, CPF de clientes, dados do banco: não consultar nem vazar dados.
4. Injetar instruções maliciosas na mensagem e nos campos de descrição dos planos: nunca obter permissões, tools ou dados privados.
5. Enviar duas perguntas em menos de 15 s: suprimir a mensagem anterior sem gerar resposta obsoleta.
6. Trocar BOT -> HUMAN enquanto a IA processa: impedir envio automático.
7. Verificar offline do provedor, falha de DB, timeout da OpenAI, falta de chave e limite de custos: encaminhar seguro e manter outbox observável.
8. Verificar que o número e a sessão da Evolution são os da conta comercial, e não de restaurantes clientes.
9. Executar `npm run typecheck`, `npm run lint:ci`, testes unitários, integração e E2E em banco descartável, e validar regras de fluxo e privacidade; não lançar somente com mocks.
10. Testar manualmente com números próprios e consentimento, sem disparos em massa. Sem deploy automático por este PR.

## Observação de arquitetura

Este recurso é **comercial da plataforma**, não o assistente do ADMIN de cada restaurante. O custo de API da IA comercial não deve descontar créditos de restaurantes; monitorar custo, rate limit e eventual orçamento dedicado na infraestrutura da plataforma antes da liberação.
