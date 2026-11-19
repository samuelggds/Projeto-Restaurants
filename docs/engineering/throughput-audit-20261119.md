# Engenharia de Software — throughput: auditoria e mudanca incremental

## Conceitos estudados

- **Taxa oferecida:** quantas requisicoes o gerador envia por intervalo.
- **Throughput HTTP observado:** quantas requisicoes obtiveram resposta no intervalo de medicao.
- **Throughput de sucesso:** quantas operacoes retornaram resposta HTTP considerada bem-sucedida por intervalo.
- **Latencia:** tempo de resposta de cada operacao; nao e a mesma grandeza que throughput.
- **Capacidade:** limite sustentavel sob metas de erro, latencia e integridade, que um unico ensaio nao determina.

## Evidencias verificadas no repositorio

1. `backend/scripts/loadTestOrders.ts` ja registrava `sent`, `ok`, `failed`, `throughputRps` e latencias. Entretanto, `throughputRps` usava `sent`, portanto um ensaio com todas as requisicoes em HTTP 429 podia informar throughput positivo sem nenhum pedido concluido.
2. `backend/src/e2e/multiTenant/runtimeScale.e2e.ts` ja exercita um perfil *open-loop* com 120 restaurantes, duas replicas Node e 120 sockets, simulando 600 criacoes e 1200 leituras por minuto, com checagem de isolamentos, contagens e p95. A aprovacao desse ensaio nao comprova producao.
3. `docs/operations/operational-health-readonly.md` afirma que metricas continuas p95/p99 e alertas externos dependem de configuracao operacional; isso nao e corrigido neste PR.

## Mudanca de baixo risco neste PR

- Introduz `calculateLoadRps` com validacao de argumentos e testes unitarios.
- Preserva o campo historico `throughputRps`, calculado por tentativas enviadas.
- Adiciona `successfulThroughputRps` no JSON, calculado com `ok`.
- Nao altera cadencia, ambiente, confirmacao de execucao, tratamento de falhas, transacoes, autenticacao, pagamentos nem limites de testes.

## Criterios de aceite

- Testes novos passam: `cd backend && node ./scripts/runTsxWithOsUserInfoFallback.cjs --test src/metrics/loadTestThroughput.test.ts`.
- Typecheck, lint, testes gerais e checks de seguranca/tenant/RLS/scale do CI passam no SHA final.
- Nenhum teste de carga executado em producao.
- Revisar dados reais em homologacao antes de reivindicar qualquer capacidade sustentavel.

## Seguimento

Adicionar, em escopo separado e com dados de carga autorizados, relatorios que distingam taxa oferecida, respostas HTTP totais, respostas bem-sucedidas, falhas e latencias por endpoint.
