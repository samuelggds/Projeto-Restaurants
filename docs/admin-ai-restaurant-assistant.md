# Assistente do Restaurante — ADMIN

## Objetivo

O Assistente do Restaurante evolui o antigo Guia com IA sem substituir as telas tradicionais do GastroNexa. O foco é o perfil `ADMIN` do restaurante autenticado. Funcionários, clientes e `SUPER_ADMIN` preservam os fluxos e permissões existentes.

A IA não consulta o banco diretamente. O backend calcula métricas e monta um contexto permitido do restaurante da sessão; o provedor de IA recebe apenas esse contexto sanitizado para explicar resultados ou preparar uma proposta tipada.

## Experiência no painel

A entrada **Assistente IA** no menu do ADMIN abre cinco áreas:

- **Perguntar**: consultas gerenciais e comandos em linguagem natural, com ditado por voz quando o navegador oferece `SpeechRecognition`.
- **Sugestões**: prioridades calculadas a partir de regras e dados reais, sem depender de uma chamada ao provedor de IA.
- **Histórico**: propostas e ações auditáveis preparadas pelo assistente.
- **Ajuda**: mantém o guia visual original para ensinar o uso das telas do GastroNexa.
- **Limites**: nível de autonomia, chave geral de automações e limites operacionais por restaurante.

A Visão geral também recebe um resumo compacto logo após o “Resumo de hoje”. Ele mostra no máximo três prioridades e não chama IA em toda renderização. O backend mantém um snapshot curto e o invalida quando pedidos, produtos ou configurações mudam.

## Métricas e períodos

O backend respeita o `timezone` do restaurante e separa conceitos financeiros:

- **Vendas registradas**: pedidos criados no período, não cancelados, independentemente de confirmação de pagamento.
- **Pagamentos confirmados**: pedidos cujo pagamento foi confirmado no período.
- **Cancelamentos**: pedidos criados no período cujo estado atual é `CANCELADO`.
- **Estornos**: pedidos com estorno concluído no período.

Comparações usam períodos equivalentes. “Vendas”, “pagamentos” e “faturamento operacional” nunca são apresentados como lucro.

Quando uma fonte de dados falha, a API falha de forma explícita em vez de transformar indisponibilidade em zero.

## Alertas de pedidos

Os atrasos básicos funcionam sem IA e usam os horários reais do pedido. Os limites padrão são editáveis pelo restaurante:

- `PENDENTE`: 15 min.
- `PREPARANDO`: 30 min.
- `PRONTO`: 15 min.
- `SAIU_PARA_ENTREGA`: 45 min.

A IA pode explicar a evidência, mas não inventa a causa do atraso.

## Atendimento de pedidos

Na caixa de suporte, o ADMIN pode pedir um rascunho de IA para o pedido selecionado. O backend primeiro confirma que o pedido pertence ao restaurante da sessão e envia ao modelo somente o contexto operacional necessário daquele pedido e da respectiva conversa.

O retorno inclui:

- resumo;
- assunto;
- urgência;
- justificativa da classificação;
- resposta sugerida editável.

O assistente **não envia** mensagens. O envio continua no botão manual já existente. As mensagens automáticas de status continuam no fluxo atual e não foram convertidas em atendimento conversacional automático por WhatsApp.

## Ações que alteram dados

A primeira allowlist de ações executáveis pelo assistente contém:

1. `CREATE_PRODUCT`;
2. `ADJUST_PRODUCT_PRICES`.

O modelo apenas prepara a proposta. O backend:

1. valida a sessão ADMIN e o tenant;
2. resolve registros reais;
3. cria uma prévia concreta;
4. persiste proposta, autor, restaurante e chave de idempotência;
5. aguarda aprovação explícita;
6. revalida registros e versões antes de executar;
7. usa os serviços de negócio existentes;
8. registra resultado ou falha.

Pagamento, transferência, credencial, cobrança, estorno e envio de campanha não pertencem à allowlist.

## Autonomia

Cada restaurante pode escolher:

- `SUGGEST_ONLY`: apenas sugerir;
- `APPROVAL_REQUIRED`: executar somente após aprovação;
- `BOUNDED_AUTOMATION`: reservado para tarefas explicitamente allowlisted e limitadas.

A chave `automationsEnabled` permite desligar rotinas automatizadas. O modo de automação delimitada não concede permissão genérica ao modelo e não habilita ações financeiras.

## Cardápio por foto

A interface nova usa o fluxo:

1. enviar foto;
2. extrair para uma **prévia**;
3. revisar nomes, descrições, categorias, preços, imagem, incertezas e duplicações;
4. escolher criar, atualizar explicitamente ou pular;
5. publicar apenas os itens selecionados.

Texto presente em imagens é tratado como dado não confiável. A extração não inventa ingredientes, tamanhos, composição, alergênicos ou informação nutricional.

Produtos existentes não são sobrescritos silenciosamente. Uma possível duplicação começa bloqueada para criação e exige decisão explícita do ADMIN.

## Geração de imagens em lote

Depois da publicação, a UI mostra uma estimativa de créditos antes de criar o job. Os jobs são persistidos em banco e processados pelo worker, portanto não dependem de a página continuar aberta.

Cada item possui estado próprio. É possível cancelar itens ainda não iniciados e reabrir somente itens que falharam. O gerador existente continua protegendo produtos de marcas conhecidas e não recria uma imagem já persistida, evitando geração e cobrança duplicadas em retries.

Produção precisa manter o processo `worker` ativo para drenar a fila.

## Sugestões comerciais e previsão

O snapshot gerencial pode apontar:

- clientes **identificados** cuja frequência diminuiu;
- pares de produtos frequentemente comprados juntos;
- produtos com queda de unidades vendidas;
- rascunhos de campanhas.

Clientes anônimos não são agrupados como uma mesma pessoa. Rascunhos não são enviados nem publicados automaticamente e não afirmam causalidade sobre vendas.

A previsão de demanda só é marcada como elegível com histórico mínimo configurado e dias suficientes. Ela é comparada com uma referência simples, mostra intervalo de incerteza e nunca é convertida em quantidade de compra de ingredientes.

## Segurança e confidencialidade

A segurança não depende apenas do prompt.

- `ADMIN` e `SUPER_ADMIN` continuam com middlewares separados.
- O restaurante vem da sessão autenticada; identificadores propostos pela IA não escolhem o tenant.
- Novas tabelas privadas possuem `restaurantId` e RLS fail-closed.
- Solicitações sobre `SUPER_ADMIN`, código-fonte, infraestrutura, banco interno, `.env`, prompts internos, tokens, chaves e credenciais são bloqueadas antes da chamada ao provedor.
- O contexto passa por sanitização de campos e padrões de segredo.
- A resposta também é inspecionada antes de ser devolvida ao ADMIN.
- Dados de outros restaurantes não entram no contexto.
- Conteúdo importado, documentos, imagens, mensagens e descrições nunca concedem permissões.
- Dados completos de cartão não são enviados nem persistidos pelo assistente.

## Créditos, limites e indisponibilidade

O assistente reutiliza a carteira `AiCreditWallet` existente. Nenhum crédito novo é concedido e nenhuma recarga é criada automaticamente por este trabalho.

O restaurante possui limite configurável de solicitações por hora e de concorrência de jobs. Chamadas ao provedor usam timeout e zero retries automáticos no cliente. Falha do provedor não bloqueia pedidos, cardápio, atendimento manual nem as regras básicas de alerta.

## Limites dos dados atuais

O GastroNexa possui estoque opcional de **produto final** e preço adicional de ingredientes/opções, mas isso não fornece os dados necessários para afirmar:

- lucro real;
- margem por prato;
- estoque físico de ingredientes;
- quantidade de compra em kg/litros;
- desperdício;
- custo de reposição.

Para uma evolução posterior são necessários, no mínimo:

- unidade e custo de compra por ingrediente;
- saldo e movimentações de ingredientes;
- ficha técnica quantitativa por produto;
- perdas e desperdício;
- despesas operacionais e critérios de rateio.

Este trabalho não transforma o GastroNexa em um ERP.

## Capacidades ainda não automatizadas

Alguns comandos conversacionais foram mantidos como orientação/preparação, não execução automática, porque exigem contratos de negócio adicionais:

- exceção de horário para uma data específica;
- áudio transformado diretamente em pedido;
- convite/cadastro completo de funcionário por conversa;
- rotinas agendadas criadas livremente por linguagem natural;
- campanhas reais por WhatsApp;
- contexto automático do registro atualmente aberto em todas as telas.

Esses itens devem ganhar schemas próprios, autorização e validações antes de entrar na allowlist. O assistente não simula que essas integrações já existem.

## Configuração externa

A IA textual e visual depende de `OPENAI_API_KEY` no backend. O valor não é exposto à interface ou ao contexto do ADMIN.

Passar em testes com mocks não valida integração produtiva. Antes de produção, é necessário validar as credenciais reais, limites da conta do provedor, worker, migração e observabilidade no ambiente de destino.
