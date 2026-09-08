# Análise das cinco etapas — Restaurantes

Data: 08/09/2026. Código analisado: commit `4d1f014`, árvore inicialmente limpa.

## Parecer

O plano é adequado, mas todas as etapas já possuem trabalho aproveitável. Priorizar segurança/deploy e confiabilidade dos pedidos; implementar paginação real; iniciar homologação operacional em paralelo; fazer refatorações graduais. Não há evidência suficiente para declarar as cinco etapas concluídas ou a plataforma homologada para 100 restaurantes simultâneos.

Esta análise inspecionou código, configurações, testes e evidências locais. Não alterou código da aplicação, credenciais, banco ou configurações administrativas. Os arquivos criados em artifacts são evidências da análise.

## 1. Segurança e deploy — parcial, prioridade alta

Já feito:

- Prisma CLI prefere DIRECT_URL; Prisma Client usa DATABASE_URL.
- API e worker verificam a role PostgreSQL e rejeitam superuser, BYPASSRLS ou ownership das tabelas protegidas.
- Validação de variáveis de produção, HTTPS, segredos e opções de roteamento, com testes.
- Stripe verifica assinatura sobre o corpo bruto; Asaas verifica token.
- Mercado Pago consulta o pagamento no provedor e verifica vínculo/valor, em vez de aprovar apenas pelo JSON da notificação.
- CI inclui testes, build e jobs de isolamento multi-tenant/RLS.

Falta:

1. Separar efetivamente os segredos: API e worker ainda recebem DIRECT_URL e o arquivo de ambiente completo. A imagem inicia a API depois de executar migrações no mesmo container. Usar uma execução dedicada para migração e fornecer apenas os segredos necessários a cada processo.
2. Alinhar exemplos e deploy: Compose assume Geoapify, mas o exemplo de produção descreve OSRM/Nominatim, sem explicitar provider/chave/profile. Seguindo esse exemplo, a validação exige uma chave que não foi configurada e os serviços próprios não são iniciados.
3. Completar autenticação das notificações Mercado Pago: não encontrei validação de x-signature nos fluxos de pedidos, billing e Point. A consulta autenticada ao provedor já existente é uma proteção relevante, mas não autentica a origem da notificação.
4. Conferir proteção da main no GitHub. A presença do workflow e do job agregador não comprova obrigatoriedade antes do merge. Estado administrativo não consultado; não classificado como ausente.
5. Demonstrar instalação limpa de teste: migração, provisionamento da role, inicialização da API/worker e readiness.

Evidências principais: [Compose](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/docker-compose.production.yml:79), [Dockerfile](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/Dockerfile:27), [proteção da role](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/database/tenantDbContext.ts:59), [webhook Mercado Pago](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/controllers/MercadoPagoOrderWebhookController.ts:35), [CI](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/.github/workflows/ci.yml:386).

## 2. Confiabilidade dos pedidos — parcial, prioridade alta

Já feito:

- Criação em transação Serializable, contexto RLS, revalidação da mesa, estoque condicional, cupom e fila de impressão no mesmo commit.
- Confirmação de pagamento com atualização condicional para evitar repetir efeitos.
- PIX com identificador único entre pedidos.
- Cancelamento/estorno com mecanismos de repetição segura e recuperação após falha.
- Pagamento de mesa já tem chave de idempotência e fingerprint do conteúdo; pode orientar o desenho da criação de pedidos.

Falta:

1. Idempotência persistente de POST /orders. Controller, cliente e modelo não associam a criação a uma chave da requisição. Um reenvio após perda da resposta pode criar outro pedido válido.
2. Tratar conflitos P2034 da transação Serializable. Não encontrei tratamento desse código em backend/src. Implementar repetição limitada da transação e resposta adequada quando as tentativas esgotarem, preservando efeitos posteriores ao commit. A [documentação do Prisma 6](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions) orienta retry para esse conflito.
3. Classificar erros: o controller responde 400 com error.message para qualquer exceção, incluindo erro interno de infraestrutura. O middleware global já fornece uma base de tratamento mais adequada.
4. Testes com banco real para reenvio concorrente, resposta perdida, estoque disputado, conteúdo incompatível sob a mesma chave e isolamento entre restaurantes.

Não confirmei o defeito suspeito de contexto RLS. Criação, cotação, impressão e projeção financeira de garçom definem contexto. A suíte real contém cenários sem contexto e concorrência A/B no pool. Tratar esse item como investigação/regressão até existir reprodução concreta.

Evidências: [criação transacional](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/CreateOrderService.ts:562), [controller e erros](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/controllers/CreateOrderController.ts:92), [cliente](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/Services/ordersService.ts:186), [confirmação condicional](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/repositories/OrderRepository.ts:384), [suíte RLS](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/e2e/multiTenant/tenantRlsFoundation.rls.e2e.ts:1101).

## 3. Desempenho — necessária, com implementação parcial

Já feito: interface administrativa exibe blocos de dez; há seleção parcial de campos e visão enxuta do garçom; rate limit global e por rota, com CORS correto na resposta 429 e testes.

Falta:

- Paginação no banco/API. A listagem recebe somente status, consulta todos os pedidos e devolve um array. Mostrar mais dez usa slice sobre dados já recebidos.
- Adaptar filtros, busca, indicadores e atualização em tempo real. Acrescentar apenas take ao backend pode esconder pedidos ou calcular totais sobre uma página incompleta. Separar fila ativa e histórico na cozinha.
- Definir respostas de listagem e detalhe por perfil. Hoje são carregados produtos completos e até 40 mensagens por pedido, além de campos escalares do pedido que podem ser desnecessários à tela.
- Resolver a divergência do rate limit: valor configurado menor que 3.000 em produção ou 5.000 em desenvolvimento é elevado ao piso. Exemplo e validação anunciam 300. O teste exige deliberadamente esse comportamento; a proteção existe, mas o contrato da configuração é incoerente.

Não executei benchmark atual que comprove lentidão. A ausência de limite nas consultas é uma constatação de código.

Evidências: [consulta sem paginação](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/repositories/OrderRepository.ts:113), [paginação visual](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/admin/components/AdminOrders.tsx:139), [rate limit](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/middlewares/security/httpAccessProtection.ts:7).

## 4. Organização — parcial, melhoria gradual

Já existem módulos, serviços, repositórios, providers, extrações de preços/cupom/estoque, abstração de realtime e worker separado. O CI verifica fronteiras de dependências e limita arquivos a 1.200 linhas efetivas, com exceções CSS legadas congeladas.

Serviços de criação, Pix, estorno e repositório de pedidos continuam grandes. Vale extrair responsabilidades coesas quando essas áreas forem modificadas, preservando o mesmo tx, as regras e a emissão posterior ao commit. Tamanho sozinho não justifica uma reescrita. Não tornaria uma refatoração ampla pré-requisito para homologação operacional.

Evidência: [regras de arquitetura](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/scripts/checkArchitecture.mjs:6).

## 5. Validação operacional e expansão — evidência parcial

Já existem:

- Suítes com API, Socket.IO e PostgreSQL reais para isolamento de restaurante e RLS, configuradas no CI.
- Jornadas Playwright de interface. Os cenários centrais analisados simulam respostas da API; isso não comprova a jornada navegador + API + banco reais.
- Agente de impressão, fila persistida, confirmação de processamento, tentativas e testes sem hardware.
- Worker e leases PostgreSQL para coordenação dos jobs.
- Relatórios históricos de carga local.

Limites e pendências:

- O relatório de 09/07 registra 6.000 pedidos em dez minutos, 0% de erros e p95 de 32 ms, mas usa somente dois restaurantes e uma instância local dedicada. É evidência histórica de um cenário limitado, não homologação da revisão atual para 100 restaurantes simultâneos.
- O runner atual envia POST /orders de forma sequencial com await e pagamento em dinheiro. Ampliar para concorrência real, perfis/tenants e fluxos representativos de pagamento, webhook, billing e listagem. Os comandos antigos da documentação também diferem dos argumentos atualmente aceitos pelo runner.
- Não encontrei evidência local de restauração de backup executada e conferida. A documentação recomenda fazê-la.
- A documentação de impressão declara que não houve validação em impressora física neste ambiente. Homologar hardware, queda de rede, reinício e risco de duplicação quando o spooler imprime mas o ACK não chega.
- Realtime ainda usa transporte local em memória. Antes de múltiplas instâncias, implementar encaminhamento compartilhado de eventos e validar a configuração do balanceamento. A [documentação Socket.IO](https://socket.io/docs/v4/using-multiple-nodes/) descreve comunicação entre servidores e afinidade quando se mantém long-polling.
- Acompanhar métricas e consistência operacional no ambiente alvo, incluindo a janela de sete dias definida pelo próprio projeto.

Evidências: [carga histórica](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/load-test-reports/LOAD_1783558200041.json:1), [runner sequencial](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/scripts/loadTestOrders.ts:244), [API simulada no E2E](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/e2e/table-qr-role-flow.spec.ts:312), [limites da impressão](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/docs/kitchen-printing.md:265), [jobs e realtime](C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/jobs/README.md:3).

## Validação realizada nesta análise

| Verificação | Resultado |
| --- | --- |
| Backend, suíte completa | 950/950 passaram |
| Print agent, suíte completa | 15/15 passaram, sem impressora física |
| Frontend, pedidos e filtros | 12/12 passaram em dois arquivos |
| Teste específico de rate limit/CORS | 3/3 passaram; também incluído na suíte backend |
| Typecheck raiz | Passou nos três componentes |
| Build raiz | Passou nos três componentes |
| Regras de arquitetura | Passaram |
| Catálogo de scripts operacionais | Passou |
| Frontend, suíte completa | Interrompida após vários minutos sem conclusão, repetindo erros de conexão da API local pelo jsdom; não classificada como aprovada |
| E2E real PostgreSQL/RLS e inicialização de produção | Não executados; daemon Docker indisponível, confirmado também fora do sandbox |
| Proteção administrativa da main | Não consultada |
| Carga atual, restore e impressão física | Não executados |

A primeira execução backend forçou NODE_ENV=test e teve 949 aprovações e uma falha de expectativa de warning no teste realtimePublisher. A repetição no ambiente normal do comando npm test passou 950/950. Nas duas execuções, DATABASE_URL e DIRECT_URL foram substituídas por uma URL local com porta fechada para evitar conexão ao banco configurado do projeto. Esses testes não comprovam a camada PostgreSQL real.

## Ordem recomendada e critérios de fechamento

1. Fechar exposição de credenciais de migração e inconsistências de deploy; completar autenticação de webhook aplicável e verificar a main. Comprovar startup limpo com role restrita.
2. Implementar idempotência na criação, tratamento de conflitos e erros. Comprovar repetição/concorrência em PostgreSQL real e regressão RLS.
3. Implementar paginação, respostas menores e contrato coerente de rate limit. Testar limites, filtros, busca, totais e atualização de todas as telas consumidoras.
4. Executar desde cedo jornadas reais, restore, impressão e carga no ambiente adequado. Repetir após correções que afetem esses fluxos. Não esperar uma refatoração ampla.
5. Refatorar incrementalmente; adicionar infraestrutura realtime compartilhada antes de ativar múltiplas instâncias, com teste de clientes conectados a réplicas diferentes.
