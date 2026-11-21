# Aula — Transações ACID na GastroNexa

Base: Aula 27 do Notion — Transações, isolamento, locks e concorrência sem perda de dados.

## Propriedades e limites

- Atomicidade: operações SQL no mesmo commit confirmam ou revertem juntas.
- Consistência: regras de domínio dependem de validações e constraints; transações não criam invariantes sozinhas.
- Isolamento: Serializable exige resultado equivalente a alguma execução serial, mas conflitos podem abortar transações.
- Durabilidade: alterações confirmadas persistem segundo garantias/configuração PostgreSQL; backup continua necessário.
- Uma cobrança externa não pode ser automaticamente revertida por rollback local.

## Evidências verificadas em main

- backend/src/modules/orders/services/CreateOrderService.ts: pedido, itens e estoque na mesma transação Prisma Serializable com update condicional por restaurantId.
- backend/src/modules/orders/services/orderCreationRequest.ts: retry limitado de P2034 e idempotência.
- backend/src/database/tenantDbContext.ts: contexto do restaurante local à transação.
- backend/src/e2e/multiTenant/notificationOutbox.e2e.ts: teste real de rollback de status e outbox.

## Mudança proposta

- backend/src/e2e/multiTenant/stockOrderAtomicity.e2e.ts: testa rollback após falha sintética antes do commit, commit com pedido/item/estoque consistentes e nenhum efeito sobre produto de outro restaurante.
- Executa apenas em banco PostgreSQL E2E descartável mediante runner protegido; sem gateway real ou dados de clientes.

## Critérios de aceite

- Executar testes, typecheck, lint, multi-tenant E2E, RLS, escala e demais checks no SHA final.
- Revisar diff; não reduzir políticas de segurança, não modificar produção nem executar teste em banco real de clientes.
- Status: documento de auditoria inicial; existência do teste não equivale a aprovação.