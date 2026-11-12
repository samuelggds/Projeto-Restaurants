# WhatsApp comercial GastroNexa — IA contextual (opt-in)

## Objetivo e integração

O atendimento comercial mantém a **Evolution API / Baileys** existente para receber e enviar mensagens no número comercial exclusivo da plataforma. A IA **não substitui o canal WhatsApp**: somente gera o texto de respostas comerciais com a credencial `OPENAI_API_KEY` mantida exclusivamente no backend.

A implementação não configura, contrata nem requer a WhatsApp Business Platform/Cloud API da Meta. Evolution/Baileys é uma integração não oficial; depende de sessão conectada e pode sofrer instabilidade ou restrições do WhatsApp. Avaliar termos e riscos operacionais antes da ativação. Não utilizar para spam ou disparos não solicitados.

## Ativação controlada

- Padrão: `COMMERCIAL_WHATSAPP_AI_ENABLED=false`, preservando o bot por menus.
- Para homologar, configurar `OPENAI_API_KEY` em secret de backend, `COMMERCIAL_WHATSAPP_AI_MODEL=gpt-6.1-sol`, e habilitar a flag **somente em homologação**; nenhuma chave entra no frontend ou no Git.
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

## Agente especialista de produto: informações públicas e limites

- Além dos preços e funcionalidades por plano obtidos a cada mensagem no catálogo público ativo do PostgreSQL, o agente recebe uma base de conhecimento **escrita e aprovada** com explicações comerciais públicas: cardápio digital, pedidos, delivery, retirada, mesas, QR Code, NFC, cozinha, equipe, relatórios, cupons, fidelidade, implantação, suporte e presença digital.
- O conhecimento é selecionado pela pergunta (no máximo quatro áreas), sem buscas livres no repositório, sem consulta a tabelas de clientes, funcionários, donos de restaurantes ou super_admin.
- A base de produto **não concede funcionalidades**: disponibilidade, mensalidade, teste e condições de cada plano continuam controlados pelo catálogo comercial ativo; NFC permanece sujeito à homologação anunciada.
- Perguntas sobre identidade, comportamento e acessos de indivíduos, transações privadas, credenciais, detalhes privilegiados de infraestrutura, configurações internas ou possíveis vulnerabilidades recebem recusa.
- O backend aplica filtros antes de consultar o catálogo/IA e valida as respostas de saída. Uma resposta potencialmente sensível é substituída por texto seguro. Esses filtros complementam, mas não substituem, controle de acesso e minimização da origem.
- A IA não tem acesso a ferramentas, SQL arbitrário, qualquer pedido real, tabelas pessoais, logs, secret managers, ações administrativas ou privilégios do Super Admin.
- Manter o atendimento da IA 24h e as regras já existentes de transferência humana: pedido explícito no horário humano, timeout de 10 minutos sem resposta, atendimento humano nos horários configurados e suspensão enquanto o Super Admin assume.
- Antes de publicar, validar com ataques de extração e prompt injection; nenhum filtro textual garante segurança absoluta. Em caso de dúvida, prefira recusar e registrar apenas telemetria não sensível.

## Modelo comercial de maior capacidade

- Padrão do serviço: `gpt-6.1-sol`, `reasoning_effort=medium`, saída limitada a 2.000 tokens de conclusão (inclui raciocínio interno), resposta JSON de até 1.200 caracteres e `timeout=45s`.
- A configuração `COMMERCIAL_WHATSAPP_AI_MODEL` continua substituível. **Importante:** se `.env.production` já contiver `COMMERCIAL_WHATSAPP_AI_MODEL=gpt-4o-mini`, essa variável explícita prevalece sobre os novos defaults do código e do Compose; somente alteração operacional aprovada e verificada aplicará Sol em produção. Nunca imprimir valores de `.env.production` nem chaves da API em logs.
- O modelo mais capaz pode custar mais e responder mais lentamente; validar orçamento, limites da conta, disponibilidade, casos adversariais, integração Evolution/worker e conclusão das respostas antes do deploy.
- Se a resposta estruturada falhar, continuar com resposta segura; nunca reduzir verificações de segurança para forçar uma resposta.
