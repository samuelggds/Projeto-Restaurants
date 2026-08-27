import './_shared/disabledLegacyScript.mjs';
import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import mercadoPagoService from '../src/modules/billing/services/MercadoPagoService.js';
import { hasFlag, optionalString, parseCliArgs, rejectPositionals, requiredNonNegativeNumber, requiredPositiveInteger, requiredString } from './_shared/cli.mjs';
import { requireReason, requireWriteConfirmation, resolveExecutionMode } from './_shared/confirmation.mjs';
import { assertOperationalEnvironment } from './_shared/environmentGuard.mjs';
import { redactUrl, safeError } from './_shared/redaction.mjs';

const parsed = parseCliArgs(process.argv.slice(2));
rejectPositionals(parsed);
const restaurantId = requiredPositiveInteger(parsed, 'Restaurante', 'restaurant-id');
const environment = requiredString(parsed, 'Ambiente alvo', 'environment');
const monthlyFee = requiredNonNegativeNumber(parsed, 'Mensalidade', 'monthly-fee');
const systemFees = requiredNonNegativeNumber(parsed, 'Taxa do sistema', 'system-fees');
const mode = resolveExecutionMode({ apply: hasFlag(parsed, 'apply'), dryRun: hasFlag(parsed, 'dry-run') });
const reason = optionalString(parsed, 'reason');
const expectedConfirmation = `FORCE_BILLING_BLOCK:${restaurantId}`;
const context = assertOperationalEnvironment({ targetEnvironment: environment, allowProduction: hasFlag(parsed, 'allow-production') });
requireReason(mode, reason);
requireWriteConfirmation({ mode, provided: optionalString(parsed, 'confirm'), expected: expectedConfirmation, action: 'bloquear faturamento e criar pagamento externo real' });
if (mode === 'write' && !hasFlag(parsed, 'allow-external-payment')) throw new Error('A escrita também exige --allow-external-payment porque cria cobrança real.');

function overdueDate() { const date = new Date(); date.setDate(date.getDate() - 40); return date; }

async function main() {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, name: true, active: true } });
  if (!restaurant) throw new Error(`Restaurante ${restaurantId} não encontrado.`);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const total = monthlyFee + systemFees;
  const plan = { mode, environment: context.target, database: context.database, restaurant, invoice: { month, year, monthlyFee, systemFees, total, status: 'ATRASADO' }, createsExternalPayment: true, reason: reason || null };
  if (mode === 'dry-run') {
    console.log(JSON.stringify(plan, null, 2));
    console.log(`DRY_RUN: use --apply --allow-external-payment --reason="..." --confirm=${expectedConfirmation}.`);
    return;
  }
  const existingInvoice = await prisma.invoice.findFirst({ where: { restaurantId, month, year }, select: { id: true } });
  const invoice = existingInvoice
    ? await prisma.invoice.update({ where: { id: existingInvoice.id }, data: { status: 'ATRASADO', dueDate: overdueDate(), paidAt: null, monthlyFee, systemFees, total } })
    : await prisma.invoice.create({ data: { restaurantId, month, year, monthlyFee, systemFees, total, status: 'ATRASADO', dueDate: overdueDate() } });
  const payment = await mercadoPagoService.createPayment({ invoiceId: invoice.id, title: `Mensalidade restaurante ${restaurant.name}`, description: `Fatura ${month}/${year}`, amount: total });
  await prisma.$transaction([
    prisma.invoice.update({ where: { id: invoice.id }, data: { paymentLink: payment.init_point } }),
    prisma.subscription.updateMany({ where: { restaurantId }, data: { status: 'EXPIRADA' } }),
    prisma.restaurant.update({ where: { id: restaurantId }, data: { active: false } }),
  ]);
  console.log(JSON.stringify({ status: 'applied', ...plan, invoiceId: invoice.id, paymentLink: redactUrl(payment.init_point) }, null, 2));
}

main().catch((error) => { console.error(safeError(error)); process.exitCode = 1; }).finally(() => prisma.$disconnect());
