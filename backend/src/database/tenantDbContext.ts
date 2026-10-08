import type { Prisma } from '@prisma/client';

import prisma from '../config/prisma.js';

export type TenantDbClient = Prisma.TransactionClient;

type TenantCallback<T> = (db: TenantDbClient) => Promise<T>;

// All tables whose migrations enable and force tenant RLS. Shared with the
// catalog integration test so runtime ownership checks cannot lag its scope.
export const TENANT_RLS_TABLES = [
  'AiCreditLedgerEntry',
  'AiCreditReservation',
  'AiCreditWallet',
  'CourierCompensationPolicy',
  'CourierCompensationRange',
  'CourierSettlement',
  'CourierSettlementItem',
  'CustomerPaymentMethod',
  'EmployeeCompensationPolicy',
  'EmployeeEarning',
  'EmployeeSettlement',
  'EmployeeSettlementItem',
  'EmployeeSettlementPayment',
  'EmployeeWorkEntry',
  'KitchenPrintJob',
  'MenuImportDraft',
  'MenuImportDraftItem',
  'OrderIssueThread',
  'OrderPaymentAttempt',
  'ProductComboGroup',
  'ProductComboOption',
  'ProductCompositionItem',
  'ProductConfigurationTemplate',
  'ProductOption',
  'ProductOptionGroup',
  'ProductPortionConfiguration',
  'RestaurantAiAction',
  'RestaurantAiAssistantSettings',
  'RestaurantAiJob',
  'RestaurantAiJobItem',
  'RestaurantAiSnapshot',
  'RestaurantPrinterSettings',
  'TableAccessRequest',
  'TableParticipantState',
  'TableWaiterAssignment',
] as const;

function normalizeRestaurantId(restaurantId: number) {
  const normalized = Number(restaurantId);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError('Um restaurantId inteiro e positivo é obrigatório para o contexto RLS.');
  }
  return normalized;
}

/**
 * Aplica o tenant em uma transação que já existe. Isso permite que escritas
 * RLS da fila participem do mesmo commit do pedido/pagamento.
 */
export async function setTenantDbContext(db: TenantDbClient, restaurantId: number) {
  const normalizedRestaurantId = normalizeRestaurantId(restaurantId);
  // Prisma timestamps use UTC. SQL NOW() comparisons must use the same zone
  // for leases/retries even on hosts with a local database timezone.
  await db.$queryRaw<Array<{ set_config: string }>>`
    SELECT set_config('app.restaurant_id', ${String(normalizedRestaurantId)}, true),
           set_config('TimeZone', 'UTC', true) AS time_zone
  `;
  return normalizedRestaurantId;
}

/**
 * Executa somente o trecho de banco informado dentro de um contexto tenant.
 *
 * `set_config(..., true)` torna o valor transaction-local. Assim, o contexto é
 * descartado no commit/rollback e nunca permanece na conexão devolvida ao pool.
 * Chamadas externas e trabalhos demorados não devem ser colocados no callback.
 */
export async function withTenantDbContext<T>(
  restaurantId: number,
  callback: TenantCallback<T>,
): Promise<T> {
  const normalizedRestaurantId = normalizeRestaurantId(restaurantId);

  return prisma.$transaction(async (tx) => {
    await setTenantDbContext(tx, normalizedRestaurantId);
    return callback(tx);
  });
}

export type RuntimeDatabaseRoleSecurity = {
  roleName: string;
  isSuperuser: boolean;
  bypassesRls: boolean;
  ownsPilotTables: boolean;
};

/**
 * Falha se o processo estiver usando uma role capaz de ignorar as policies.
 * Não registra URL, senha ou qualquer outra credencial.
 */
export async function assertSecureRuntimeDatabaseRole(): Promise<RuntimeDatabaseRoleSecurity> {
  const [role] = await prisma.$queryRaw<
    Array<{
      role_name: string;
      is_superuser: boolean;
      bypasses_rls: boolean;
      owns_pilot_tables: boolean;
    }>
  >`
    SELECT
      current_user::text AS role_name,
      roles.rolsuper AS is_superuser,
      roles.rolbypassrls AS bypasses_rls,
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS relations
        JOIN pg_catalog.pg_namespace AS namespaces
          ON namespaces.oid = relations.relnamespace
        WHERE namespaces.nspname = 'public'
          AND relations.relname = ANY(${[...TENANT_RLS_TABLES]}::text[])
          AND relations.relowner = roles.oid
      ) AS owns_pilot_tables
    FROM pg_catalog.pg_roles AS roles
    WHERE roles.rolname = current_user
  `;

  if (!role) {
    throw new Error('Não foi possível verificar a role PostgreSQL de runtime.');
  }

  if (role.is_superuser || role.bypasses_rls || role.owns_pilot_tables) {
    throw new Error(
      'A role PostgreSQL de runtime é insegura para RLS: use NOSUPERUSER, NOBYPASSRLS e uma role que não seja owner das tabelas protegidas.',
    );
  }

  return {
    roleName: role.role_name,
    isSuperuser: role.is_superuser,
    bypassesRls: role.bypasses_rls,
    ownsPilotTables: role.owns_pilot_tables,
  };
}
