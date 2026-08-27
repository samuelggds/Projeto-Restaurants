import './_shared/disabledLegacyScript.mjs';
import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import { hasFlag, optionalString, parseCliArgs, rejectPositionals, requiredPositiveInteger, requiredString } from './_shared/cli.mjs';
import { requireReason, requireWriteConfirmation, resolveExecutionMode } from './_shared/confirmation.mjs';
import { assertOperationalEnvironment } from './_shared/environmentGuard.mjs';
import { safeError } from './_shared/redaction.mjs';

const parsed = parseCliArgs(process.argv.slice(2));
rejectPositionals(parsed);
const restaurantId = requiredPositiveInteger(parsed, 'Restaurante', 'restaurant-id');
const environment = requiredString(parsed, 'Ambiente alvo', 'environment');
const mode = resolveExecutionMode({ apply: hasFlag(parsed, 'apply'), dryRun: hasFlag(parsed, 'dry-run') });
const reason = optionalString(parsed, 'reason');
const expectedConfirmation = `RELEASE_BILLING:${restaurantId}`;
const context = assertOperationalEnvironment({ targetEnvironment: environment, allowProduction: hasFlag(parsed, 'allow-production') });
requireReason(mode, reason);
requireWriteConfirmation({ mode, provided: optionalString(parsed, 'confirm'), expected: expectedConfirmation, action: 'liberar faturamento do restaurante' });

async function main() {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, name: true, active: true } });
  if (!restaurant) throw new Error(`Restaurante ${restaurantId} não encontrado.`);
  const openInvoices = await prisma.invoice.count({ where: { restaurantId, status: { in: ['PENDENTE', 'ATRASADO'] } } });
  const plan = { mode, environment: context.target, database: context.database, restaurant, invoicesToMarkPaid: openInvoices, reason: reason || null };
  if (mode === 'dry-run') {
    console.log(JSON.stringify(plan, null, 2));
    console.log(`DRY_RUN: use --apply --reason="..." --confirm=${expectedConfirmation} para aplicar.`);
    return;
  }
  const result = await prisma.$transaction(async (transaction) => {
    const paidInvoices = await transaction.invoice.updateMany({ where: { restaurantId, status: { in: ['PENDENTE', 'ATRASADO'] } }, data: { status: 'PAGO', paidAt: new Date() } });
    const subscription = await transaction.subscription.updateMany({ where: { restaurantId }, data: { status: 'ATIVA' } });
    const updatedRestaurant = await transaction.restaurant.update({ where: { id: restaurantId }, data: { active: true }, select: { id: true, active: true } });
    return { paidInvoices: paidInvoices.count, subscriptions: subscription.count, updatedRestaurant };
  });
  console.log(JSON.stringify({ status: 'applied', ...plan, result }, null, 2));
}

main().catch((error) => { console.error(safeError(error)); process.exitCode = 1; }).finally(() => prisma.$disconnect());
