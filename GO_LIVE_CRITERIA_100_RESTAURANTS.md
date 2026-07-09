# Go-Live Criteria - 100+ Restaurantes

## Qualidade de software (gate tecnico)

- backend typecheck: PASS
- backend tests: PASS
- frontend lint: PASS
- frontend typecheck: PASS
- frontend build: PASS

## Metas de performance

### API interna

- p95 <= 500 ms
- p99 <= 1200 ms
- erro <= 1%

### Fluxos de pagamento

- confirmacao de pagamento concluida em <= 60s na maioria dos casos
- perda de webhook: 0 eventos sem reconciliacao
- duplicidade de confirmacao: 0 ocorrencias

### Billing

- fechamento mensal processado sem falhas criticas
- divergencia de systemFee por pedido: 0
- reativacao apos pagamento: <= 5 min

## Metas de confiabilidade

- uptime de API >= 99.5%
- tempo maximo de indisponibilidade em incidente critico <= 30 min
- backup diario + restore testado no ultimo mes

## Metas operacionais

- monitoramento ativo com alertas em tempo real
- runbook de incidente testado pela equipe
- checklist de deploy seguido sem excecao

## Criterio final de aprovacao

Go-live para 100+ restaurantes somente se:

1. Todos os gates tecnicos estiverem verdes
2. Teste de carga fase B e C aprovados
3. Webhooks e billing sem inconsistencias por 7 dias
4. Time operacional com monitoramento e runbook ativos

## Evidencia obrigatoria para assinatura de go-live

- relatorio JSON de carga das fases B e C (gerado em load-test-reports/)
- snapshot de metricas de infra durante as fases (CPU, RAM, conexoes DB)
- comprovacao de reconciliacao de webhooks sem perda
- comprovacao de consistencia de billing sem divergencia

## Execucao recente (evidencia parcial)

### Rodada A - baseline local (APROVADO)

- data/hora: 2026-07-09T00:19:30Z a 2026-07-09T00:21:00Z
- comando: npm --prefix backend run loadtest:orders -- --baseUrl http://127.0.0.1:3000 --durationSec 90 --targetRpm 180 --restaurantIds 1,6
- relatorio: backend/load-test-reports/LOAD_1783556370112.json
- resultado:
  - sent: 270
  - ok: 270
  - failed: 0
  - errorRate: 0%
  - p95: 20 ms
  - p99: 100 ms

### Rodada B - intensidade moderada local (NAO APROVADO)

- data/hora: 2026-07-09T00:27:43Z a 2026-07-09T00:29:13Z
- comando: npm --prefix backend run loadtest:orders -- --baseUrl http://127.0.0.1:3000 --durationSec 90 --targetRpm 300 --restaurantIds 1,6
- relatorio: backend/load-test-reports/LOAD_1783556863391.json
- resultado:
  - sent: 450
  - ok: 0
  - failed: 450
  - errorRate: 100%
  - p95: 2 ms
  - p99: 3 ms
  - status: 429 (Muitas requisicoes)

Interpretacao:

- latencia nao e o gargalo nesta rodada; o bloqueio foi causado por rate limit (429) em 100% das requisicoes
- com a configuracao atual, a fase B nao pode ser considerada aprovada porque a meta de erro <= 1% foi violada
- antes da aprovacao final, e necessario ajustar/parametrizar rate limiting para teste de capacidade legitimo (sem desligar protecoes de producao de forma insegura)

### Rodada C - intensidade moderada em instancia dedicada de benchmark (APROVADO)

- data/hora: 2026-07-09T00:36:22Z a 2026-07-09T00:39:22Z
- comando: npm --prefix backend run loadtest:orders -- --baseUrl http://127.0.0.1:3001 --durationSec 180 --targetRpm 300 --restaurantIds 1,6
- contexto: backend dedicado em porta 3001 com RATE_LIMIT_MAX_REQUESTS=100000 para permitir benchmark controlado
- relatorio: backend/load-test-reports/LOAD_1783557382444.json
- resultado:
  - sent: 900
  - ok: 900
  - failed: 0
  - errorRate: 0%
  - p95: 40 ms
  - p99: 47 ms
  - max: 196 ms

Interpretacao complementar:

- a aplicacao atende meta de erro e latencia em 300 RPM quando executada em ambiente de benchmark sem bloqueio de rate-limit global
- o comportamento 429 observado na Rodada B representa protecao de borda e precisa ser tratado com politica de teste (whitelist/janela dedicada), nao como falha de processamento interno

### Rodada D - fase C completa em instancia dedicada de benchmark (APROVADO)

- data/hora: 2026-07-09T00:50:00Z a 2026-07-09T01:00:00Z
- comando: npm --prefix backend run loadtest:orders -- --baseUrl http://127.0.0.1:3001 --durationSec 600 --targetRpm 600 --restaurantIds 1,6
- contexto: backend dedicado em porta 3001 com RATE_LIMIT_MAX_REQUESTS=100000 para benchmark controlado
- relatorio: backend/load-test-reports/LOAD_1783558200041.json
- resultado:
  - sent: 6000
  - ok: 6000
  - failed: 0
  - errorRate: 0%
  - p95: 32 ms
  - p99: 96 ms
  - max: 194 ms

Interpretacao complementar:

- metas de latencia (p95 <= 500 ms e p99 <= 1200 ms) atendidas com ampla folga
- meta de erro (<= 1%) atendida com folga (0%)
- para producao, manter rate-limit de borda e executar testes de escala com politica controlada (janela/whitelist dedicada)

## Status atual (desta sessao)

- Gate tecnico: APROVADO
- Performance de carga real baseline local (180 RPM): APROVADO
- Performance de carga moderada local (300 RPM): REPROVADO por rate limit 429
- Performance de carga moderada em instancia dedicada (300 RPM): APROVADO
- Performance de carga alta em instancia dedicada (600 RPM por 600s): APROVADO
- Performance de carga real em ambiente alvo (fases B e C): PENDENTE (nao executado ainda)
- Validacao operacional de 7 dias: PENDENTE

## Proximo passo imediato

Executar o load test no ambiente mais proximo de producao com janela/whitelist de teste para nao disparar bloqueio 429 indevido e anexar relatorio com:

- latencia p95/p99
- taxa de erro
- uso de CPU/RAM/DB
- status de webhooks e billing durante o teste

Comandos sugeridos:

```bash
npm --prefix backend run loadtest:orders -- --baseUrl http://127.0.0.1:3000 --durationSec 600 --targetRpm 300 --restaurantIds 1,6
npm --prefix backend run loadtest:orders -- --baseUrl http://127.0.0.1:3000 --durationSec 600 --targetRpm 600
```
