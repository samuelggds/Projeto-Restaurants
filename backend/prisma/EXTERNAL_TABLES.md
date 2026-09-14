# Tabelas externas ao Prisma Client

Este arquivo registra tabelas que pertencem ao schema PostgreSQL da aplicação, mas são mantidas deliberadamente fora do `schema.prisma` e do Prisma Client.

## `PlatformBillingProfile`

`PlatformBillingProfile` é criada e evoluída exclusivamente por migrations SQL versionadas em `backend/prisma/migrations/` e acessada somente por SQL parametrizado (`Prisma.sql`, `$queryRaw` e `$executeRaw`). Ela não deve ser criada, alterada, removida nem introspectada automaticamente por mudanças geradas a partir do `schema.prisma`.

A decisão é intencional porque a tabela usa invariantes PostgreSQL que precisam continuar explícitas no SQL de migration, incluindo `CHECK` constraints e índice único parcial em `providerSubscriptionId`. O código de billing não depende de um model Prisma para essa tabela.

Regras para mudanças futuras:

1. Toda alteração estrutural em `PlatformBillingProfile` deve ser feita em uma nova migration SQL versionada.
2. A migration deve preservar as constraints de método, provedor, status, validade do cartão e consistência entre `billingMethod`, `autoRenew` e `providerSubscriptionId`.
3. O índice único parcial de `providerSubscriptionId` deve continuar existindo enquanto o identificador do provedor precisar ser globalmente único.
4. A FK para `Restaurant(id)` com `ON DELETE CASCADE` deve ser preservada.
5. Código de aplicação deve continuar usando queries parametrizadas; não concatenar valores do usuário em SQL.
6. Antes de merge, CI deve executar `prisma validate`, `prisma migrate deploy` em banco limpo e os testes de segurança/RLS existentes.
7. Se a tabela passar a ser representada no `schema.prisma`, este registro deve ser removido no mesmo PR e a migration correspondente deve demonstrar que não há drift nem perda das constraints PostgreSQL.

Essa exceção é específica de `PlatformBillingProfile`; novas tabelas não devem ser tratadas como externas sem uma decisão explícita equivalente.
