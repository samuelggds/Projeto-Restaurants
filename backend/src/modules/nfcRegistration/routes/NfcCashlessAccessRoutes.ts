import { Router } from 'express';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { nfcRegistrationAccessMiddleware } from '../../../middlewares/nfcRegistrationAccessMiddleware.js';
import { premiumNfcPlanMiddleware } from '../../../middlewares/premiumNfcPlanMiddleware.js';
import { optionalTableSessionAuthMiddleware } from '../../../middlewares/optionalAuthMiddleware.js';
import { sessionMiddleware } from '../../../middlewares/sessionMiddleware.js';
import { tableParticipantMiddleware } from '../../../middlewares/tableParticipantMiddleware.js';
import { decryptNfcPii } from '../security/nfcCustomerPii.js';
import { enqueueWhatsappNotification } from '../../../services/notificationOutbox.js';
import { resolveWhatsAppDeliveryProvider } from '../../../services/whatsappProvider.js';

const router = Router();
const uuid = z.uuid();
const issueSchema = z.strictObject({ whatsappConsent: z.literal(true) });
const verifySchema = z.strictObject({ comandaId: uuid, code: z.string().regex(/^\d{6}$/u) });
const STAFF_CODE_TTL = 8 * 60 * 60 * 1000;
const SESSION_TTL = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
function codeHash(restaurantId: number, comandaId: string, code: string) {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret) throw new Error('Visit credential signing is not configured');
  return crypto.createHmac('sha256', secret).update('nfc-visit:' + restaurantId + ':' + comandaId + ':' + code).digest('hex');
}
function fail(res: import('express').Response, error: unknown) {
  if (error instanceof z.ZodError) return res.status(422).json({ error: 'Dados da visita inválidos.' });
  const status = error instanceof VisitError ? error.status : 500;
  return res.status(status).json({ error: status === 500 ? 'Não foi possível validar a visita.' : (error as VisitError).message });
}
class VisitError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
function assertTableBound(comanda: { tableNumber: number | null; restaurantId: number }, table: { restaurantId: number; tableId: number }, tableNumber: number) {
  if (!comanda.tableNumber || comanda.restaurantId !== table.restaurantId || comanda.tableNumber !== tableNumber) {
    throw new VisitError(403, 'Esta comanda não está vinculada à mesa atual.');
  }
}
async function loadTableNumber(tx: Prisma.TransactionClient, restaurantId: number, tableId: number) {
  const table = await tx.table.findFirst({ where: { restaurantId, id: tableId, active: true }, select: { number: true } });
  if (!table) throw new VisitError(403, 'Mesa indisponível.');
  return table.number;
}
// Staff issues a new code only when the customer has explicitly consented to the WhatsApp message.
// The message is encrypted and inserted into the outbox in the same database transaction.
router.post('/staff/comandas/:id/access-code', authMiddleware, nfcRegistrationAccessMiddleware, premiumNfcPlanMiddleware, async (req, res) => {
  try {
    issueSchema.parse(req.body);
    const restaurantId = Number(req.user.restaurantId), comandaId = uuid.parse(req.params.id);
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const result = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "NfcComanda" WHERE "restaurantId" = ${restaurantId}
          AND "id" = ${comandaId}::uuid FOR UPDATE`;
      if (!rows.length) throw new VisitError(404, 'Comanda indisponível.');
      const comanda = await tx.nfcComanda.findFirst({ where: { id: comandaId, restaurantId, status: 'OPEN' },
        select: { id: true, customerId: true, tableNumber: true } });
      if (!comanda?.tableNumber) throw new VisitError(409, 'Associe uma mesa válida à comanda antes de enviar o acesso.');
      const customer = await tx.nfcCustomer.findFirst({ where: { id: comanda.customerId, restaurantId },
        select: { id: true, phoneEncrypted: true, nameEncrypted: true } });
      const restaurant = await tx.restaurant.findFirst({ where: { id: restaurantId }, select: { name: true, whatsapp: true } });
      const settings = await tx.restaurantSettings.findFirst({ where: { restaurantId }, select: { whatsappEnabled: true } });
      if (!customer || !restaurant?.whatsapp || settings?.whatsappEnabled !== true || resolveWhatsAppDeliveryProvider() === 'none') {
        throw new VisitError(409, 'WhatsApp do restaurante indisponível para enviar o acesso.');
      }
      const table = await tx.table.findFirst({ where: { restaurantId, number: comanda.tableNumber, active: true }, select: { id: true } });
      if (!table) throw new VisitError(409, 'A mesa vinculada não está ativa neste restaurante.');
      const phone = decryptNfcPii(restaurantId, customer.id, 'phone', customer.phoneEncrypted).replace(/\D/gu, '');
      const from = restaurant.whatsapp.replace(/\D/gu, '');
      const to = phone.startsWith('55') ? phone : '55' + phone;
      const source = from.startsWith('55') ? from : '55' + from;
      if (!/^55\d{10,11}$/u.test(to) || !/^55\d{10,11}$/u.test(source)) throw new VisitError(409, 'Número WhatsApp inválido.');
      await tx.nfcComandaAccess.updateMany({ where: { restaurantId, comandaId, revokedAt: null },
        data: { revokedAt: new Date(), sessionHash: null } });
      const saved = await tx.nfcComandaAccess.create({
        data: { restaurantId, comandaId, codeHash: codeHash(restaurantId, comandaId, code),
          expiresAt: new Date(Date.now() + STAFF_CODE_TTL), createdByUserId: Number(req.user.id),
          whatsappConsentAt: new Date(), whatsappConsentByUserId: Number(req.user.id) },
        select: { id: true, expiresAt: true },
      });
      const customerName = decryptNfcPii(restaurantId, customer.id, 'name', customer.nameEncrypted);
      const queued = await enqueueWhatsappNotification({
        channel: 'whatsapp', from: source, to,
        message: 'Olá, ' + customerName + '! Seu código de acesso à comanda cashless de ' + restaurant.name +
          ' é ' + code + '. Referência da comanda: ' + comandaId + '. Escaneie o QR Code oficial da sua mesa e selecione Acessar comanda NFC. Não compartilhe este código.',
        metadata: { event: 'NFC_VISIT_ACCESS_CODE', restaurantId, credentialId: saved.id },
      }, tx);
      if (!queued.queued) throw new VisitError(409, 'Não foi possível enfileirar o código. Nenhuma nova credencial foi emitida.');
      return { expiresAt: saved.expiresAt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ queued: true, expiresAt: result.expiresAt,
      notice: 'O código foi enfileirado para o WhatsApp autorizado do cliente.' });
  } catch (error) { return fail(res, error); }
});
function cashlessPublicHomologationGate(_req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  if (process.env.NFC_CASHLESS_PUBLIC_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Acesso cashless ainda em homologação.' });
  }
  return next();
}
const guestGuards = [cashlessPublicHomologationGate, optionalTableSessionAuthMiddleware, sessionMiddleware, tableParticipantMiddleware] as const;
router.post('/guest/verify', ...guestGuards, async (req, res) => {
  try {
    const input = verifySchema.parse(req.body);
    const tableSession = req.tableSession;
    if (!tableSession || !req.tableParticipant || req.tableParticipant.tableSessionId !== tableSession.id) {
      throw new VisitError(403, 'Escaneie o QR Code oficial da mesa e identifique-se.');
    }
    const restaurantId = tableSession.restaurantId;
    const result = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, restaurantId);
      const tableNumber = await loadTableNumber(tx, restaurantId, tableSession.tableId);
      // Serialize attempts across concurrent workers. Invalid attempts persist, including at the limit.
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "NfcComandaAccess" WHERE "restaurantId" = ${restaurantId}
          AND "comandaId" = ${input.comandaId}::uuid AND "revokedAt" IS NULL FOR UPDATE`;
      if (!rows.length) throw new VisitError(403, 'Código ou comanda inválidos.');
      const access = await tx.nfcComandaAccess.findFirst({ where: { id: rows[0].id, restaurantId } });
      const comanda = await tx.nfcComanda.findFirst({ where: { restaurantId, id: input.comandaId, status: 'OPEN' },
        select: { id: true, restaurantId: true, tableNumber: true } });
      if (!access || !comanda || access.expiresAt <= new Date()) throw new VisitError(403, 'Código ou comanda inválidos.');
      assertTableBound(comanda, tableSession, tableNumber);
      if (access.attempts >= MAX_ATTEMPTS || (access.lockedUntil && access.lockedUntil > new Date())) {
        throw new VisitError(429, 'Acesso temporariamente bloqueado.');
      }
      const expected = Buffer.from(access.codeHash, 'hex');
      const supplied = Buffer.from(codeHash(restaurantId, input.comandaId, input.code), 'hex');
      if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
        await tx.nfcComandaAccess.update({ where: { id: access.id },
          data: { attempts: { increment: 1 },
            ...(access.attempts + 1 >= MAX_ATTEMPTS ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}) } });
        return null;
      }
      const rawSession = crypto.randomBytes(32).toString('base64url');
      await tx.nfcComandaAccess.update({ where: { id: access.id },
        data: { sessionHash: hash(rawSession), sessionExpiresAt: new Date(Math.min(access.expiresAt.getTime(), Date.now() + SESSION_TTL)),
          attempts: 0, lockedUntil: null } });
      return rawSession;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result) throw new VisitError(403, 'Código ou comanda inválidos.');
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ sessionToken: result, expiresInSeconds: SESSION_TTL / 1000 });
  } catch (error) { return fail(res, error); }
});
router.get('/guest/account', ...guestGuards, async (req, res) => {
  try {
    const raw = req.get('x-nfc-visit-token') || '';
    if (!/^[A-Za-z0-9_-]{43}$/u.test(raw)) throw new VisitError(401, 'Acesso à comanda expirado.');
    const table = req.tableSession;
    if (!table || !req.tableParticipant) throw new VisitError(401, 'Sessão da mesa obrigatória.');
    const account = await prisma.$transaction(async tx => {
      await setTenantDbContext(tx, table.restaurantId);
      const tableNumber = await loadTableNumber(tx, table.restaurantId, table.tableId);
      const access = await tx.nfcComandaAccess.findFirst({
        where: { restaurantId: table.restaurantId, sessionHash: hash(raw), revokedAt: null,
          sessionExpiresAt: { gt: new Date() }, expiresAt: { gt: new Date() } },
        select: { comandaId: true },
      });
      if (!access) throw new VisitError(401, 'Acesso à comanda expirado.');
      const comanda = await tx.nfcComanda.findFirst({ where: { restaurantId: table.restaurantId, id: access.comandaId, status: 'OPEN' },
        select: { id: true, restaurantId: true, tableNumber: true, totalCents: true, paidCents: true,
          items: { select: { id: true, description: true, quantity: true, totalCents: true }, orderBy: { createdAt: 'asc' } } } });
      if (!comanda) throw new VisitError(403, 'Comanda indisponível.');
      assertTableBound(comanda, table, tableNumber);
      return { id: comanda.id, tableNumber, totalCents: Number(comanda.totalCents),
        paidCents: Number(comanda.paidCents), outstandingCents: Number(comanda.totalCents - comanda.paidCents),
        items: comanda.items.map(item => ({ ...item, totalCents: Number(item.totalCents) })) };
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ comanda: account });
  } catch (error) { return fail(res, error); }
});
export default router;
