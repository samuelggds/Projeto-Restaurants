# PostgreSQL RLS — fundação (fase 1)

## Objetivo e limites desta fase

O RLS é defesa em profundidade. Os filtros `restaurantId` e as autorizações da aplicação continuam obrigatórios. A fase 1 ativa RLS somente em `CustomerPaymentMethod` e `OrderIssueThread`; não existe bypass genérico para `SUPER_ADMIN`.

## Inventário do Prisma schema

Classificação feita sobre todos os 44 modelos atuais. “Direto” significa `restaurantId` obrigatório na própria linha; relações, por si só, não tornam uma tabela direta.

| Modelo                    | Classificação principal                       | Observação / decisão da fase 1                                                         |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `User`                    | global/misto                                  | Papéis de tenant, cliente global e `SUPER_ADMIN`; explicitamente sem RLS nesta fase.   |
| `PlatformSettings`        | plataforma                                    | Configuração única da plataforma.                                                      |
| `PlatformPlan`            | plataforma                                    | Catálogo administrado pelo `SUPER_ADMIN`.                                              |
| `UserAddress`             | global indireto por usuário                   | Endereço do cliente global, sem `restaurantId`.                                        |
| `Restaurant`              | plataforma/raiz de tenant                     | Registro que define o tenant; não é dado filho tenant-scoped.                          |
| `CustomerPaymentMethod`   | tenant direto                                 | Piloto: privado, `restaurantId` NOT NULL, sem job/webhook/SUPER_ADMIN.                 |
| `SupportChatMessage`      | tenant direto + plataforma                    | Suporte interno atravessado pelo `SUPER_ADMIN`; exige desenho de acesso de plataforma. |
| `Category`                | tenant direto + público                       | Usado pelo cardápio público.                                                           |
| `Product`                 | tenant direto + público                       | Usado pelo cardápio, avaliações e pedidos públicos.                                    |
| `ProductDiscount`         | tenant direto + público                       | Promoções publicadas no cardápio.                                                      |
| `ProductIngredient`       | tenant indireto                               | Tenant herdado de `Product`; sem `restaurantId` próprio.                               |
| `Ingredient`              | tenant direto + público                       | Composição e personalização do cardápio.                                               |
| `ProductOptionGroup`      | tenant direto + público                       | Opções do cardápio público.                                                            |
| `ProductOption`           | tenant indireto                               | Tenant herdado do grupo/produto e ingrediente.                                         |
| `ProductFavorite`         | tenant direto + cliente global                | O perfil agrega favoritos de vários restaurantes.                                      |
| `ProductRating`           | tenant direto + público                       | Leitura/escrita ligada à experiência pública.                                          |
| `Table`                   | tenant direto + público autenticado por token | Entrada do cardápio de mesa.                                                           |
| `TableSession`            | tenant direto                                 | Sessão também acessada por token/participante.                                         |
| `TableParticipant`        | tenant direto                                 | Participação derivada de sessão de mesa.                                               |
| `TableServiceCall`        | tenant direto                                 | Fluxos de cliente, garçom e eventos realtime.                                          |
| `Order`                   | tenant direto + jobs/webhooks                 | Núcleo de pedidos; pagamentos, entregas, workers e webhooks.                           |
| `OrderIssueThread`        | tenant direto                                 | Piloto: chat privado, sem rota pública, job ou acesso de plataforma.                   |
| `OrderIssueMessage`       | tenant indireto                               | Tenant herdado de `OrderIssueThread`; é prioridade da próxima fase.                    |
| `OrderItem`               | misto/indireto                                | `restaurantId` é opcional e há vínculos com pedido/sessão/participante.                |
| `TableBillItem`           | tenant direto                                 | Ledger de mesa; operações transacionais complexas.                                     |
| `TablePaymentIntent`      | tenant direto + jobs/webhooks                 | Reservas, expiração, confirmação, estorno e webhook.                                   |
| `TablePaymentAllocation`  | tenant direto                                 | Parte do ledger transacional de pagamentos.                                            |
| `TablePaymentEvent`       | tenant direto                                 | Histórico de eventos do pagamento da mesa.                                             |
| `TableAccountSettings`    | tenant direto + fluxo público de mesa         | Consultado durante pedidos e sessões públicas.                                         |
| `RestaurantSettings`      | tenant direto + público/jobs/webhooks         | Mistura configuração pública e credenciais privadas.                                   |
| `DeliveryFeeRange`        | tenant direto + público                       | Cálculo público de entrega.                                                            |
| `AsaasWithdrawalRequest`  | tenant direto + webhook                       | Validação assíncrona do saque pelo Asaas.                                              |
| `DeliveryLocation`        | tenant indireto + realtime/job                | Tenant herdado de `Order`; GPS do entregador.                                          |
| `Banner`                  | tenant direto + público                       | Conteúdo da Home/cardápio.                                                             |
| `Coupon`                  | tenant direto + público                       | Validação durante compra e administração privada.                                      |
| `CouponRedemption`        | tenant direto                                 | Reserva/uso ligado a pedido, cupom e cliente.                                          |
| `Subscription`            | tenant direto + plataforma/job                | Cobrança e controle pelo `SUPER_ADMIN`.                                                |
| `Invoice`                 | tenant direto + plataforma/job                | Reconciliação e cobrança cross-tenant.                                                 |
| `AuthRefreshSession`      | global indireto por usuário                   | Sessão de autenticação, inclusive cliente e plataforma.                                |
| `LoginLockout`            | global                                        | Bloqueio por e-mail normalizado.                                                       |
| `AuthMfaChallenge`        | global indireto por usuário                   | MFA para qualquer papel.                                                               |
| `OAuthAuthorizationState` | tenant direto + autenticação                  | Estado temporário; requer desenho específico contra troca de tenant.                   |
| `ScheduledJobState`       | jobs/cross-tenant                             | Lease global do scheduler.                                                             |
| `AuditLog`                | plataforma/misto                              | `restaurantId` opcional e auditoria cross-tenant.                                      |

## Por que estas duas tabelas

- `CustomerPaymentMethod` contém identificadores tokenizados privados, tem tenant direto e não é usada por workers, webhooks ou `SUPER_ADMIN`. O cliente pode ser global, por isso a aplicação ainda valida restaurante ativo e filtra simultaneamente por `userId + restaurantId`.
- `OrderIssueThread` contém metadados privados de atendimento, tem tenant direto e seus acessos partem de pedido/identidade já validados. Chamadas de gateway feitas durante cancelamento/estorno permanecem fora da transação RLS.

`OrderIssueMessage` é tenant indireto e ficou intencionalmente fora do piloto. A aplicação só o acessa após localizar o thread tenant-scoped, mas uma policy própria baseada no thread será necessária na próxima etapa para defesa completa contra SQL direto nessa tabela.

## Contexto transacional

`withTenantDbContext(restaurantId, callback)` abre uma transação Prisma curta e executa uma query parametrizada:

```sql
SELECT set_config('app.restaurant_id', $1, true)
```

O terceiro argumento mantém o contexto apenas na transação. Não há `SET` de sessão, `PrismaClient` por request, estado tenant global ou transação envolvendo Stripe, Mercado Pago, PagBank, Asaas, e-mail ou trabalho demorado. Contextos A e B concorrentes recebem transaction clients separados.

## Roles de banco

Produção deve usar duas credenciais diferentes:

- owner/migration (`DIRECT_URL`): aplica migrations e possui as tabelas;
- runtime (`DATABASE_URL`): `NOSUPERUSER`, `NOBYPASSRLS`, sem ownership das tabelas piloto e apenas com privilégios DML necessários.

Exemplo conceitual para um administrador do banco (substitua identificadores e forneça a senha pelo gerenciador de segredos; não grave a senha no repositório ou histórico):

```sql
CREATE ROLE pizza_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE sua_base TO pizza_runtime;
GRANT USAGE ON SCHEMA public TO pizza_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pizza_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pizza_runtime;
```

Defina a senha por um canal seguro do provedor. Depois de cada migration que criar tabelas/sequences, reaplique os grants ou configure default privileges para a role owner correta. O backend e o worker em `NODE_ENV=production` recusam inicialização se a conexão runtime for superuser, tiver `BYPASSRLS` ou possuir uma tabela piloto. Nenhuma URL ou credencial é registrada nessa validação.

No Supabase ou outro serviço gerenciado, crie uma role de login dedicada conforme os recursos do provedor. A role `postgres`/owner não é uma alternativa segura para o runtime. Se o plano não permitir uma role separada, mantenha o deploy bloqueado e trate a limitação de infraestrutura; `FORCE ROW LEVEL SECURITY` foi habilitado, mas não detém superusers ou roles com `BYPASSRLS`.

## Policies e comportamento fail-closed

A migration `20260831150000_add_rls_foundation_pilot` usa `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` e uma policy `FOR ALL`, com a mesma comparação em `USING` e `WITH CHECK`. Ela é `PERMISSIVE` porque o PostgreSQL exige ao menos uma policy permissiva para conceder acesso; não existe outra policy capaz de ampliar o acesso nesta fase. Contexto ausente, vazio, zero, negativo ou não numérico resulta em `NULL`, portanto nenhuma linha fica visível e escritas são rejeitadas.

Não existe policy `USING (true)` nem bypass para `SUPER_ADMIN`. As duas tabelas piloto não são necessárias às rotinas atuais de plataforma. Nenhum job ou webhook consulta diretamente essas tabelas; os fluxos de pagamento apenas leem cartão salvo após o pedido já fornecer um `restaurantId` confiável.

## CI e testes

O executor E2E cria/usa:

1. uma conexão owner para migrations, reset e fixtures;
2. uma conexão runtime separada para a aplicação e para os ataques RLS.

Antes dos cenários, a suíte consulta `pg_roles` e falha se runtime for superuser, `BYPASSRLS` ou owner. Também consulta `pg_class` e `pg_policy`, prova acesso legítimo, ataque por ID real sem filtro `restaurantId`, ausência de contexto, `INSERT`/`UPDATE` adulterados, `DELETE` cross-tenant e concorrência A/B.

Comandos:

```bash
npm run test:e2e:rls
npm run test:e2e:tenant
```

As credenciais existentes no script SQL E2E são fixas e exclusivamente descartáveis/loopback. Elas nunca devem ser reutilizadas fora da suíte.

## Rollback emergencial (não automático)

Use somente durante resposta a incidente, com a conexão owner e aprovação explícita:

```sql
DROP POLICY IF EXISTS "CustomerPaymentMethod_tenant_isolation" ON "CustomerPaymentMethod";
ALTER TABLE "CustomerPaymentMethod" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "CustomerPaymentMethod" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "OrderIssueThread_tenant_isolation" ON "OrderIssueThread";
ALTER TABLE "OrderIssueThread" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrderIssueThread" DISABLE ROW LEVEL SECURITY;
```

Esse rollback remove apenas a segunda barreira; os filtros e autorizações da aplicação permanecem. Registre o motivo, preserve evidências, restaure as policies e reexecute a suíte RLS antes de encerrar o incidente. Nunca edite nem marque a migration antiga como revertida manualmente.

## Próxima etapa segura

1. adicionar RLS indireto a `OrderIssueMessage` por `EXISTS` no thread e testar custo/índices;
2. desenhar contexto público validado antes de tocar catálogo, avaliações e mesas;
3. converter jobs de pedidos/pagamentos para descoberta de tenants seguida de processamento tenant a tenant;
4. separar operações de plataforma em conexão/role explícita, mínima e não controlável por request;
5. promover novas tabelas em lotes pequenos, sempre com testes reais, catálogo e rollback.
