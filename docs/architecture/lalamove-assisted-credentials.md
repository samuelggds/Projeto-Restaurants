# Lalamove — cofre de credenciais por restaurante (fase assistida)

## Fluxo

1. ADMIN do restaurante solicita conexão em Configurações > Entregas. Nenhuma API Key ou Secret é coletada do ADMIN.
2. SUPER_ADMIN ativo revisa a solicitação e a coloca em `IN_REVIEW`.
3. Em SUPER_ADMIN > Entregadores parceiros, o responsável consulta o cofre para o restaurante, seleciona sandbox ou produção e informa credenciais **do próprio restaurante**, recebidas por canal seguro conforme acordo com a Lalamove.
4. O backend exige `CREDENTIAL_ENCRYPTION_KEY` de 32 bytes, nunca grava segredo em texto claro, e armazena API Key e API Secret com AES-256-GCM autenticado e AAD vinculada ao `restaurantId`, ambiente e nome do campo. A chave pode ser rotacionada com suporte a `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS`, já disponível no cofre de pagamentos.
5. Somente no sandbox é permitido validar as credenciais, com operação de leitura de cidades. Nenhuma cotação, contratação, cobrança ou webhook é executado.
6. O SUPER_ADMIN pode substituir o par de credenciais, exigindo versão atual, ou revogá-lo: a revogação apaga **ambos** os segredos e seu digest. Os metadados de auditoria excluem credenciais.

## Isolamento e segurança

- `RestaurantExternalDeliveryCredential` possui unicidade em `(restaurantId, provider, environment)`, além de `(environment, apiKeyDigest)` para impedir que uma mesma conta seja copiada para outro restaurante.
- Migração habilita `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` com política fail-closed e contexto transacional definido por `withTenantDbContext`.
- Rotas são protegidas por `authMiddleware`, `superAdminMiddleware`, mais revalidação no serviço de que o usuário SUPER_ADMIN está ativo e não pertence a um restaurante.
- Nenhum tenant vem do corpo da requisição: apenas o identificador da rota e o SUPER_ADMIN autenticado escolhem o restaurante. O ADMIN comum não acessa rotas de credenciais.
- `Cache-Control: no-store` e DTOs de metadados impedem exposição de chaves em respostas. A interface nunca exibe credenciais já salvas.
- Validações `zod.strict` rejeitam campos extras e não permitem edição de status arbitrário. Verificação só no sandbox e controle otimista por versão impedem que verificações atrasadas validem chaves rotacionadas.
- Não há ativação de conta produtiva, `canDispatch` permanece `false`. Uma conta guardada ou testada **não** está habilitada para contratar entregas.
- O controle de acesso à chave mestra exige armazenamento seguro fora do repositório, como secret manager; nunca registrar seus valores nos logs ou no frontend.

## Endpoints SUPER_ADMIN

- `GET /super-admin/delivery-partners/lalamove/credentials/:restaurantId` consulta estado sanitizado por ambiente.
- `PUT /super-admin/delivery-partners/lalamove/credentials/:restaurantId` cadastra ou rotaciona `{environment, apiKey, apiSecret, expectedVersion}`, apenas em solicitação `IN_REVIEW`.
- `POST /super-admin/delivery-partners/lalamove/credentials/:restaurantId/verify-sandbox` aceita somente `{expectedVersion}`.
- `POST /super-admin/delivery-partners/lalamove/credentials/:restaurantId/:environment/revoke` aceita somente `{expectedVersion}`.

**Bloqueio operacional**: ainda não há OAuth, contas criadas automaticamente, credenciais do fornecedor disponíveis, wallet, cotação persistida, contratação, tracking ou pagamentos de frete. Antes de habilitar produção, confirmar com a Lalamove a titularidade independente de cada conta e o fluxo comercial autorizado, e completar as fases restantes com testes E2E de dispatch.

## Testes

- `backend/src/e2e/multiTenant/lalamoveReview.rls.e2e.ts` testa persistência de credenciais criptografadas usando PostgreSQL real descartável, RLS sem contexto, leitura e escrita cross-tenant, autorização, versionamento, verificação com provedor simulado, revogação e auditoria.
- Não usar chaves reais nos testes. A suíte não contrata motoqueiros.
- Antes de merge, rodar Prisma validate, TypeCheck, lint, CI geral, RLS E2E, security hardening, migration compatibility e revisão do fluxo de credenciais.
