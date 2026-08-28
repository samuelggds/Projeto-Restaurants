import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import prisma from '../src/config/prisma.js';
import {
  credentialEncryptionContext,
  credentialNeedsReencryption,
  encryptCredential,
  isEncryptedCredential,
  parseCredentialEncryptionKey,
  reencryptCredential,
  RESTAURANT_CREDENTIAL_FIELDS,
} from '../src/modules/restaurantSettings/security/credentialEncryption.js';
import {
  assertAllowedOptions,
  hasFlag,
  optionalString,
  parseCliArgs,
  rejectPositionals,
  requiredString,
} from './_shared/cli.mjs';
import {
  requireReason,
  requireWriteConfirmation,
  resolveExecutionMode,
} from './_shared/confirmation.mjs';
import { assertOperationalEnvironment } from './_shared/environmentGuard.mjs';
import { safeError } from './_shared/redaction.mjs';

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));
  rejectPositionals(parsed);
  assertAllowedOptions(parsed, [
    'environment',
    'apply',
    'dry-run',
    'reason',
    'actor',
    'confirm',
    'allow-production',
    'rotate',
  ]);
  const environment = requiredString(parsed, 'Ambiente alvo', 'environment');
  const mode = resolveExecutionMode({
    apply: hasFlag(parsed, 'apply'),
    dryRun: hasFlag(parsed, 'dry-run'),
  });
  const reason = optionalString(parsed, 'reason');
  const actor = optionalString(parsed, 'actor');
  const context = assertOperationalEnvironment({
    targetEnvironment: environment,
    allowProduction: hasFlag(parsed, 'allow-production'),
  });
  const rotate = hasFlag(parsed, 'rotate');
  const encryptionKey = String(process.env.CREDENTIAL_ENCRYPTION_KEY || '').trim();
  if (!encryptionKey) throw new Error('CREDENTIAL_ENCRYPTION_KEY é obrigatória.');
  parseCredentialEncryptionKey(encryptionKey);
  if (rotate) {
    const previousKey = String(process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS || '').trim();
    if (!previousKey) {
      throw new Error('CREDENTIAL_ENCRYPTION_KEY_PREVIOUS é obrigatória com --rotate.');
    }
    const parsedCurrent = parseCredentialEncryptionKey(encryptionKey);
    const parsedPrevious = parseCredentialEncryptionKey(previousKey);
    if (parsedCurrent?.equals(parsedPrevious)) {
      throw new Error('A chave anterior deve ser diferente da chave atual.');
    }
  }
  requireReason(mode, reason);
  if (mode === 'write' && actor.length < 3) {
    throw new Error('--actor é obrigatório para escrita e identifica o operador/ticket.');
  }
  const operation = rotate ? 'ROTATE_GATEWAY_CREDENTIALS' : 'ENCRYPT_GATEWAY_CREDENTIALS';
  const expectedConfirmation = `${operation}:${context.databaseLabel}`;
  requireWriteConfirmation({
    mode,
    provided: optionalString(parsed, 'confirm'),
    expected: expectedConfirmation,
    action: rotate
      ? 'rotacionar a criptografia das credenciais de gateways'
      : 'criptografar credenciais legadas de gateways',
  });

  const rows = await prisma.restaurantSettings.findMany({
    select: {
      id: true,
      restaurantId: true,
      stripeSecretKey: true,
      stripeWebhookSecret: true,
      pagbankToken: true,
      pagbankRefreshToken: true,
      mercadoPagoAccessToken: true,
      picpayToken: true,
      asaasAccessToken: true,
    },
    orderBy: { id: 'asc' },
  });
  const pending = rows
    .map((row) => ({
      row,
      fields: RESTAURANT_CREDENTIAL_FIELDS.filter((field) => {
        const value = String(row[field] || '').trim();
        if (!value) return false;
        if (!rotate) return !isEncryptedCredential(value);
        return credentialNeedsReencryption(
          value,
          credentialEncryptionContext(row.restaurantId, field),
        );
      }),
    }))
    .filter(({ fields }) => fields.length > 0);
  const plan = {
    mode,
    operation,
    environment: context.target,
    database: context.database,
    rowsScanned: rows.length,
    rowsToProcess: pending.length,
    credentialsToProcess: pending.reduce((total, item) => total + item.fields.length, 0),
    restaurantIds: pending.map(({ row }) => row.restaurantId),
    reason: reason || null,
  };

  if (mode === 'dry-run') {
    console.log(JSON.stringify(plan, null, 2));
    console.log(
      `DRY_RUN: use --apply --actor="..." --reason="..." --confirm="${expectedConfirmation}".`,
    );
    return;
  }

  const updates = pending.map(({ row, fields }) => {
    const data = Object.fromEntries(
      fields.map((field) => [
        field,
        rotate
          ? reencryptCredential(row[field], credentialEncryptionContext(row.restaurantId, field))
          : encryptCredential(row[field], credentialEncryptionContext(row.restaurantId, field)),
      ]),
    ) as Prisma.RestaurantSettingsUpdateManyMutationInput;
    const expectedValues = Object.fromEntries(fields.map((field) => [field, row[field]])) as
      Prisma.RestaurantSettingsWhereInput;
    return { id: row.id, data, expectedValues };
  });

  await prisma.$transaction(
    async (transaction) => {
      for (const update of updates) {
        const result = await transaction.restaurantSettings.updateMany({
          where: { id: update.id, ...update.expectedValues },
          data: update.data,
        });
        if (result.count !== 1) {
          throw new Error('Credencial alterada durante a rotação; nenhuma mudança foi aplicada.');
        }
      }
      await transaction.auditLog.create({
        data: {
          userName: actor,
          userRole: 'OPS_OPERATOR',
          action: operation,
          resource: JSON.stringify({
            database: context.databaseLabel,
            rows: pending.length,
            credentials: plan.credentialsToProcess,
            reason,
          }),
        },
      });
    },
    { timeout: 60_000 },
  );
  console.log(JSON.stringify({ status: 'applied', ...plan }, null, 2));
}

main()
  .catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
