import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z, ZodError } from 'zod';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { nfcInventoryVisualState } from '../domain/nfcInventoryVisualState.js';
import { linkedNfcCustomerMatches, linkedNfcPaymentState } from '../domain/nfcLinkedCustomersSearch.js';
import { nfcCpfFingerprints, decryptNfcPii, maskNfcCpf, maskNfcPhone } from '../security/nfcCustomerPii.js';
import { NfcRegistrationError } from '../domain/nfcRegistrationRules.js';

const router = Router();
const pageSize = 20;

function safe(res: import('express').Response, error: unknown) {
  const status = error instanceof ZodError ? 422 : error instanceof NfcRegistrationError ? error.statusCode : error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' ? 409 : 500;
  const message = error instanceof ZodError ? error.issues[0]?.message : error instanceof NfcRegistrationError ? error.message : status === 409 ? 'Já existe um cadastro ou cartão ativo para este cliente.' : 'Não foi possível concluir a operação NFC.';
  return res.status(status).json({ error: message });
}

// Staff-only inventory. Tenant scoping applies to cards, customers and accounts;
 // never return the NDEF token/hash or unmasked personal data in a listing.
const cardInventorySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(['ALL', 'READY', 'ACTIVE', 'REVOKED', 'PENDING_WRITE']).default('ALL'),
});
const cardInventoryPageSize = 40;
router.get('/cards/inventory', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId);
    const { page, status } = cardInventorySchema.parse(req.query);
    const result = await withTenantDbContext(restaurantId, async tx => {
      const where: Prisma.NfcCardWhereInput = { restaurantId, ...(status !== 'ALL' ? { status } : {}) };
      const [cards, total, grouped] = await Promise.all([
        tx.nfcCard.findMany({
          where,
          select: { id: true, displayCode: true, status: true, customerId: true, createdAt: true, activatedAt: true, revokedAt: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * cardInventoryPageSize,
          take: cardInventoryPageSize,
        }),
        tx.nfcCard.count({ where }),
        tx.nfcCard.groupBy({ by: ['status'], where: { restaurantId }, _count: { _all: true } }),
      ]);
      // The inventory must not offer deletion for a returned/reused card with
      // financial or order history, even though customerId was cleared.
      const visibleCardIds = cards.map(card => card.id);
      const [usedComandas, usedConfirmations] = visibleCardIds.length ? await Promise.all([
        tx.nfcComanda.groupBy({ by: ['cardId'], where: { restaurantId, cardId: { in: visibleCardIds } } }),
        tx.nfcOrderConfirmation.groupBy({ by: ['cardId'], where: { restaurantId, cardId: { in: visibleCardIds } } }),
      ]) : [[], []];
      const cardsWithHistory = new Set<string>([
        ...usedComandas.map(item => item.cardId),
        ...usedConfirmations.map(item => item.cardId),
      ]);
      const customerIds = cards.map(card => card.customerId).filter((id): id is string => !!id);
      const customers = customerIds.length ? await tx.nfcCustomer.findMany({
        where: { restaurantId, id: { in: customerIds } },
        select: { id: true, nameEncrypted: true, cpfEncrypted: true, phoneEncrypted: true },
      }) : [];
      const customersById = new Map(customers.map(customer => [customer.id, customer]));
      // Include paid comandas for the latest visit and historical revoked tags.
      // Revoked cards remain history; they are not ACTIVE customer links.
      const assignedCardIds = cards.filter(card => card.customerId !== null).map(card => card.id);
      const accounts = assignedCardIds.length ? await tx.nfcComanda.findMany({
        where: { restaurantId, cardId: { in: assignedCardIds }, status: { in: ['OPEN', 'UNPAID', 'PAID'] } },
        orderBy: { openedAt: 'desc' },
        select: { id: true, cardId: true, tableNumber: true, totalCents: true, paidCents: true, status: true, dueAt: true },
      }) : [];
      const customerDebts = customerIds.length ? await tx.nfcComanda.findMany({
        where: { restaurantId, customerId: { in: customerIds },
          status: { in: ['OPEN', 'UNPAID'] }, dueAt: { lte: new Date() } },
        select: { customerId: true, totalCents: true, paidCents: true },
      }) : [];
      const counts = { READY: 0, ACTIVE: 0, REVOKED: 0, PENDING_WRITE: 0 };
      for (const item of grouped) counts[item.status] = item._count._all;
      return {
        page, pageSize: cardInventoryPageSize, total, counts,
        cards: cards.map(card => {
          const customer = card.customerId ? customersById.get(card.customerId) : undefined;
          const comanda = accounts.find(account => account.cardId === card.id);
          return {
            id: card.id, displayCode: card.displayCode, status: card.status, createdAt: card.createdAt,
            canDelete: card.customerId === null && card.activatedAt === null && card.revokedAt === null
              && (card.status === 'READY' || card.status === 'PENDING_WRITE')
              && !cardsWithHistory.has(card.id),
            blockedByDebt: card.status === 'ACTIVE' && customerDebts.some(debt => debt.customerId === card.customerId && debt.totalCents > debt.paidCents),
            visualStatus: nfcInventoryVisualState(card.status, card.status === 'ACTIVE' && customerDebts.some(debt => debt.customerId === card.customerId && debt.totalCents > debt.paidCents), comanda),
            customer: customer ? {
              id: customer.id,
              name: decryptNfcPii(restaurantId, customer.id, 'name', customer.nameEncrypted),
              cpfMasked: maskNfcCpf(decryptNfcPii(restaurantId, customer.id, 'cpf', customer.cpfEncrypted)),
              phoneMasked: maskNfcPhone(decryptNfcPii(restaurantId, customer.id, 'phone', customer.phoneEncrypted)),
            } : null,
            comanda: comanda ? {
              id: comanda.id, tableNumber: comanda.tableNumber, status: comanda.status,
              totalCents: Number(comanda.totalCents), paidCents: Number(comanda.paidCents),
              outstandingCents: Math.max(0, Number(comanda.totalCents - comanda.paidCents)),
            } : null,
          };
        }),
      };
    });
    res.setHeader('Cache-Control', 'no-store, private');
    return res.json(result);
  } catch (error) { return safe(res, error); }
});

const linkedSearchSchema = z.strictObject({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
router.get('/linked-customers', async (req, res) => {
  try {
    const restaurantId = Number(req.user.restaurantId);
    const { q = '', page } = linkedSearchSchema.parse(req.query);
    const digits = q.replace(/\D/g, '');
    // CPF is matched only by the scoped HMAC; raw CPF never leaves this endpoint.
    const cpfKeys = digits.length === 11 ? nfcCpfFingerprints(restaurantId, digits) : [];
    const result = await withTenantDbContext(restaurantId, async (tx) => {
      const activeCards = await tx.nfcCard.findMany({
        where: { restaurantId, status: 'ACTIVE', customerId: { not: null } },
        select: { id: true, customerId: true, displayCode: true, activatedAt: true },
        orderBy: { createdAt: 'desc' },
      });
      const linkedIds = activeCards.map(card => card.customerId).filter((value): value is string => !!value);
      if (!linkedIds.length) return { customers: [], total: 0, totalLinked: 0, page, pageSize };
      const customers = await tx.nfcCustomer.findMany({
        where: { restaurantId, id: { in: linkedIds } },
        select: { id: true, nameEncrypted: true, phoneEncrypted: true, cpfFingerprint: true, cpfEncrypted: true },
      });
      const byId = new Map(customers.map(customer => [customer.id, customer]));
      const matching = activeCards.flatMap(card => {
        if (!card.customerId) return [];
        const customer = byId.get(card.customerId);
        if (!customer) return [];
        const name = decryptNfcPii(restaurantId, customer.id, 'name', customer.nameEncrypted);
        const phone = decryptNfcPii(restaurantId, customer.id, 'phone', customer.phoneEncrypted);
        const cpfMatch = cpfKeys.includes(customer.cpfFingerprint);
        if (!linkedNfcCustomerMatches(q, name, phone, cpfMatch)) return [];
        return [{ card, customer, name, phone }];
      });
      const selected = matching.slice((page - 1) * pageSize, page * pageSize);
      const ids = selected.map(item => item.customer.id);
      const accounts = ids.length ? await tx.nfcComanda.findMany({
        where: { restaurantId, customerId: { in: ids }, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
        select: { id: true, cardId: true, customerId: true, tableNumber: true, status: true,
          totalCents: true, paidCents: true, openedAt: true },
      }) : [];
      return {
        page, pageSize, total: matching.length, totalLinked: new Set(linkedIds).size,
        customers: selected.map(({ card, customer, name, phone }) => {
          const current = accounts.find(a => a.customerId === customer.id && a.cardId === card.id);
          const amounts = current ? { totalCents: Number(current.totalCents), paidCents: Number(current.paidCents) } : null;
          return {
            customerId: customer.id,
            name,
            cpfMasked: maskNfcCpf(decryptNfcPii(restaurantId, customer.id, 'cpf', customer.cpfEncrypted)),
            phoneMasked: maskNfcPhone(phone),
            card: { id: card.id, displayCode: card.displayCode },
            comanda: current ? { id: current.id, tableNumber: current.tableNumber, openedAt: current.openedAt,
              status: linkedNfcPaymentState({ status: current.status, ...amounts! }),
              totalCents: amounts!.totalCents, paidCents: amounts!.paidCents,
              outstandingCents: Math.max(0, amounts!.totalCents - amounts!.paidCents) } : null,
          };
        }),
      };
    });
    res.setHeader('Cache-Control', 'no-store, private');
    return res.json(result);
  } catch (error) { return safe(res, error); }
});

export default router;
