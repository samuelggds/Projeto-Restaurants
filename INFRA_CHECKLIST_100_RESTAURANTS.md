# Infra Checklist - 100+ Restaurantes

## Banco de dados (PostgreSQL)

- pool de conexoes configurado para carga esperada
- indices nos filtros mais usados:
  - Order(restaurantId, createdAt)
  - Order(restaurantId, paid, status)
  - Invoice(restaurantId, status, dueDate)
- monitorar locks e queries lentas
- backup diario validado
- estrategia de restore testada

## Backend API

- instancia com CPU e RAM suficientes para pico
- PM2 ou orchestrator com restart automatico
- healthcheck ativo (/health)
- timeout e retry definidos para chamadas externas
- rate-limit aplicado sem bloquear fluxo legitimo

## Webhooks e pagamentos

- Stripe webhook com assinatura valida ativa em producao
- Mercado Pago/PagBank com restaurantId obrigatorio em ambiente multi-tenant
- fallback global de credenciais desativado em producao
- logs de webhook com correlation id por evento
- idempotencia para evitar dupla confirmacao

## Realtime e escalabilidade horizontal

- se usar mais de 1 instancia backend:
  - adapter de pub/sub para Socket.IO (ex.: Redis adapter)
- sticky sessions quando necessario
- monitorar backlog de eventos

## Observabilidade

- logs centralizados (API + webhooks + billing)
- metricas de latencia p95/p99 por endpoint
- alarmes para:
  - erro > 2%
  - webhook com falha repetida
  - fila atrasada
  - CPU alta sustentada

## Seguranca

- segredos apenas em variaveis de ambiente/secret manager
- CORS restrito aos dominios oficiais
- HTTPS obrigatorio
- rotacao periodica de tokens dos gateways
- auditoria de acessos admin e super-admin

## Billing SaaS

- invoice mensal criada para todos os restaurantes ativos
- calculo de systemFee validado por amostragem
- bloqueio por inadimplencia com grace period validado
- reativacao automatica apos pagamento validada

## Operacao e suporte

- runbook para incidente de webhook
- runbook para incidente de banco lento
- processo de rollback de deploy documentado
- dashboard operacional com status por restaurante

## Pronto para 100+ quando

- load test aprovado nas fases A/B/C
- alarmes testados e funcionando
- backup + restore validados
- monitoramento de billing sem inconsistencias por 7 dias consecutivos
