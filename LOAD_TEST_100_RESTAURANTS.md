# Load Test Plan - 100+ Restaurantes

## Objetivo

Validar se a plataforma suporta operacao simultanea de mais de 100 restaurantes com:

- criacao de pedidos
- confirmacao de pagamentos
- processamento de webhooks
- geracao e leitura de faturamento

## Escopo dos testes

1. API de pedidos

- POST /orders
- POST /orders/card/checkout
- POST /orders/pix/payment/create
- POST /orders/pix/payment/confirm

2. Webhooks

- POST /orders/webhook/stripe
- POST /orders/webhook/mercadopago
- POST /orders/webhook/pagbank

3. Billing

- endpoints de listagem de invoices
- fluxos de reativacao apos pagamento

4. Realtime (Socket)

- eventos new-order
- eventos order:status-changed

## Perfil de carga recomendado

### Fase A - Baseline (15 min)

- 100 restaurantes ativos
- 1 pedido/min por restaurante
- 100 req/min de criacao de pedido

### Fase B - Pico moderado (20 min)

- 100 restaurantes
- 3 pedidos/min por restaurante
- 300 req/min de criacao de pedido
- 300 eventos webhook/min

### Fase C - Pico agressivo (10 min)

- 150 restaurantes
- 4 pedidos/min por restaurante
- 600 req/min de criacao de pedido
- 600 eventos webhook/min

### Fase D - Stress curto (5 min)

- subir gradualmente ate erro controlado
- identificar gargalo principal (DB, CPU, webhook externo, socket)

## Metricas obrigatorias

- p95 de latencia por endpoint
- p99 de latencia por endpoint
- taxa de erro por endpoint
- throughput (req/s)
- uso de CPU e memoria do backend
- conexoes ativas no PostgreSQL
- tempo de fila de jobs/webhooks (se houver fila)

## Criterios de aprovacao do teste

- erro total < 1% em carga de pico moderado
- erro total < 3% em pico agressivo
- p95 < 500 ms para endpoints criticos internos
- p95 < 1200 ms para endpoints dependentes de gateway externo
- nenhum restaurante bloqueado indevidamente por falha transiente

## Comandos uteis no projeto

### Qualidade do codigo antes de teste

```bash
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

### Scripts de apoio no backend

```bash
npm --prefix backend exec tsx backend/scripts/listRestaurants.ts
npm --prefix backend exec tsx backend/scripts/listSubscriptions.mjs
npm --prefix backend exec tsx backend/scripts/listOpenInvoicesByRestaurant.mjs <restaurantId>
npm --prefix backend exec tsx backend/scripts/verifyRealtimeOrderGate.ts
npm --prefix backend exec tsx backend/scripts/verifyDeliveryPaidFlow.ts
```

### Runner de carga executavel (ja no projeto)

```bash
npm --prefix backend run loadtest:orders -- --baseUrl http://127.0.0.1:3000 --durationSec 300 --targetRpm 300
```

Parametros:

- --baseUrl: URL da API
- --durationSec: duracao total do teste
- --targetRpm: volume alvo de requisicoes por minuto
- --timeoutMs: timeout por request (padrao 10000)
- --restaurantIds: lista separada por virgula para fixar tenants (ex.: 1,3,4)

Saida:

- imprime resumo JSON no terminal
- salva relatorio em load-test-reports/LOAD\_<timestamp>.json

Exemplo com restaurantes especificos:

```bash
npm --prefix backend run loadtest:orders -- --baseUrl http://127.0.0.1:3000 --durationSec 600 --targetRpm 600 --restaurantIds 1,3,4
```

## Roteiro de execucao recomendado

1. Executar baseline (Fase A) e salvar relatorio
2. Corrigir gargalos evidentes
3. Executar pico moderado (Fase B)
4. Executar pico agressivo (Fase C)
5. Executar stress curto (Fase D)
6. Consolidar relatorio final com comparativo das fases

### Evidencias minimas por fase

- 1 arquivo JSON de relatorio salvo por fase
- print das metricas p95/p99 e errorRate
- anotacao de CPU/RAM/DB no mesmo horario da fase

## Resultado esperado para ir a producao com 100+

- fases A, B e C aprovadas
- sem regressao de faturamento
- sem regressao de isolamento multi-tenant
- sem perda de eventos de pagamento
