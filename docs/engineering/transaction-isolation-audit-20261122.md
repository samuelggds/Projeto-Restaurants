# Aula — Isolamento de transações PostgreSQL na GastroNexa

Referência didática: Notion, Aula 27 — Transações, isolamento, locks e concorrência sem perda de dados.
Referência técnica: https://www.postgresql.org/docs/current/transaction-iso.html

## Conceitos

- Read Committed: cada SELECT comum observa um snapshot do início do próprio comando; uma segunda leitura pode observar um COMMIT externo.
- Repeatable Read: o snapshot é estabelecido no primeiro comando relevante da transação e preservado durante ela; no PostgreSQL impede phantom reads, mas não todas as anomalias de serialização.
- Serializable: mantém garantia equivalente a uma ordenação serial de transações confirmadas, sob risco de abortos de serialização que precisam de tratamento correto.
- Nível de isolamento não substitui predicados por restaurantId, autorização, RLS, constraints nem idempotência.

## Evidências verificadas no código da main

- `backend/src/modules/orders/services/CreateOrderService.ts`: criação de pedido com `Prisma.TransactionIsolationLevel.Serializable` e contexto de restaurante na transação.
- `backend/src/modules/orders/services/orderCreationRequest.ts`: retry limitado de `P2034`, verificando colisões de idempotência; `orderCreationRequest.test.ts` cobre limite e casos de conflito.
- Diversos módulos de mesas, reservas, NFC e pagamentos configuram transações Serializable em fluxos selecionados. Isso não quer dizer que todas as consultas da aplicação usem esse isolamento.
- `backend/src/e2e/multiTenant/stockOrderAtomicity.e2e.ts`: teste já existente de rollback para estoque e pedido em banco descartável.

## Nova evidência proposta

`backend/src/e2e/multiTenant/transactionIsolationSnapshots.e2e.ts` compara leituras de um mesmo produto com duas transações/conexões em PostgreSQL real:

1. Primeiro SELECT lê estoque 5;
2. Uma segunda conexão confirma UPDATE para estoque 4;
3. O segundo SELECT do primeiro leitor vê 4 em Read Committed e 5 em Repeatable Read/Serializable;
4. É verificado que o UPDATE externo ficou persistido.

A ordem é controlada por promessas de sincronização e não por sleeps aleatórios.
O runner E2E usa banco PostgreSQL descartável de loopback e role runtime separada; não acessar banco de produção.

## Limites e validação

- O teste proposto demonstra snapshots de leitura; não comprova por si só proteção contra write skew, deadlocks ou serialização de todas as operações financeiras.
- Confirmar TypeScript, lint, testes unitários, E2E tenant/RLS, Security Hardening, Scale e checks no SHA final.
- O PR deve permanecer em draft até os checks passarem e o diff ser revisado.
- Não alterar o nível de isolamento existente em produção apenas para fazer um benchmark ou um teste passar.