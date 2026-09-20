import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import { reconcileAiCreditReservation } from './_shared/reconcileAiCreditReservation.js';
import {
  assertAllowedOptions,
  hasFlag,
  optionalString,
  parseCliArgs,
  rejectPositionals,
  requiredPositiveInteger,
  requiredNonNegativeNumber,
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
    'allow-production',
    'apply',
    'dry-run',
    'confirm',
    'actor',
    'reason',
    'evidence',
    'restaurant-id',
    'admin-id',
    'reservation-id',
    'cost-usd',
  ]);
  const context = assertOperationalEnvironment({
    targetEnvironment: requiredString(parsed, 'Ambiente', 'environment'),
    allowProduction: hasFlag(parsed, 'allow-production'),
  });
  const mode = resolveExecutionMode({
    apply: hasFlag(parsed, 'apply'),
    dryRun: hasFlag(parsed, 'dry-run'),
  });
  const input = {
    restaurantId: requiredPositiveInteger(parsed, 'Restaurante', 'restaurant-id'),
    adminUserId: requiredPositiveInteger(parsed, 'Administrador', 'admin-id'),
    reservationId: requiredString(parsed, 'Reserva', 'reservation-id'),
    costUsd: requiredNonNegativeNumber(
      parsed,
      'Custo confirmado em USD (zero somente com prova de ausência de cobrança)',
      'cost-usd',
    ),
    actor: requiredString(parsed, 'Operador', 'actor'),
    reason: requiredString(parsed, 'Motivo', 'reason'),
    evidence: requiredString(parsed, 'Referência da confirmação do provedor', 'evidence'),
    apply: mode === 'write',
  };
  requireReason(mode, input.reason);
  const expected = `RECONCILE_AI:${context.databaseLabel}:${input.reservationId}:${input.costUsd}`;
  requireWriteConfirmation({
    mode,
    provided: optionalString(parsed, 'confirm'),
    expected,
    action: 'conciliar cobrança comprovada de IA',
  });
  const plan = await reconcileAiCreditReservation(input);
  console.log(JSON.stringify(plan, null, 2));
  if (mode === 'dry-run')
    console.log(`DRY_RUN: após conferir a evidência, use --apply --confirm="${expected}".`);
}

main()
  .catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
