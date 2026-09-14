import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import {
  createSalesLeadSchema,
  listSalesLeadsSchema,
  parseSalesLeadInput,
  salesLeadIdSchema,
  SalesLeadError,
  updateSalesLeadSchema,
} from '../domain/salesLeadSchemas.js';
import { salesLeadEmailConfiguration } from './salesLeadEmailTransport.js';

type Database = Pick<typeof prisma, 'salesLead' | '$transaction'>;
const publicFields = {
  id: true,
  name: true,
  restaurantName: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  businessType: true,
  channels: true,
  planInterest: true,
  message: true,
  consent: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  emailOutbox: { select: { status: true, sentAt: true } },
} satisfies Prisma.SalesLeadSelect;
type LeadView = Prisma.SalesLeadGetPayload<{ select: typeof publicFields }>;

function presentLead({ emailOutbox, ...lead }: LeadView) {
  return {
    ...lead,
    emailStatus: emailOutbox?.status || 'PENDING',
    emailSentAt: emailOutbox?.sentAt || null,
  };
}

export class SalesLeadService {
  constructor(private readonly db: Database = prisma) {}

  async create(payload: unknown, requestKey: unknown) {
    const idempotencyKey = parseSalesLeadInput(salesLeadIdSchema, requestKey);
    // Zod enforces these required fields at runtime; this project compiles without strictNullChecks.
    const { website, ...data } = parseSalesLeadInput(createSalesLeadSchema, payload) as Required<
      ReturnType<typeof createSalesLeadSchema.parse>
    >;
    if (website?.trim()) {
      return {
        created: true,
        response: { id: randomUUID(), received: true, emailStatus: 'PENDING' },
      };
    }
    const payloadHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const replay = async () => {
      const existing = await this.db.salesLead.findUnique({
        where: { idempotencyKey },
        select: { id: true, payloadHash: true, emailOutbox: { select: { status: true } } },
      });
      if (!existing) return null;
      if (existing.payloadHash !== payloadHash) {
        throw new SalesLeadError(
          'Esta solicitação já foi utilizada com outros dados. Reenvie o formulário.',
          409,
        );
      }
      return {
        created: false,
        response: {
          id: existing.id,
          received: true,
          emailStatus: existing.emailOutbox?.status || 'PENDING',
        },
      };
    };
    const existing = await replay();
    if (existing) return existing;
    try {
      const lead = await this.db.salesLead.create({
        data: { ...data, idempotencyKey, payloadHash, emailOutbox: { create: {} } },
        select: { id: true },
      });
      return { created: true, response: { id: lead.id, received: true, emailStatus: 'PENDING' } };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        const raced = await replay();
        if (raced) return raced;
      }
      throw error;
    }
  }

  async list(query: unknown) {
    const { page, pageSize, status, q } = parseSalesLeadInput(listSalesLeadsSchema, query);
    const where: Prisma.SalesLeadWhereInput = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: ['name', 'restaurantName', 'email', 'phone', 'city'].map((field) => ({
              [field]: { contains: q, mode: 'insensitive' as const },
            })),
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.db.salesLead.findMany({
        where,
        select: publicFields,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.salesLead.count({ where }),
    ]);
    return {
      items: items.map(presentLead),
      total,
      page,
      pageSize,
      emailConfigured: Boolean(salesLeadEmailConfiguration()),
    };
  }

  async updateStatus(rawId: unknown, payload: unknown, actorUserId: number) {
    const id = parseSalesLeadInput(salesLeadIdSchema, rawId);
    const { status } = parseSalesLeadInput(updateSalesLeadSchema, payload);
    return this.db.$transaction(async (tx) => {
      const actor = await tx.user.findFirst({
        where: { id: actorUserId, active: true, role: 'SUPER_ADMIN' },
        select: { id: true, name: true },
      });
      if (!actor) throw new SalesLeadError('Acesso negado.', 403);
      const before = await tx.salesLead.findUnique({ where: { id }, select: { status: true } });
      if (!before) throw new SalesLeadError('Contato não encontrado.', 404);
      const updated = await tx.salesLead.update({
        where: { id },
        data: { status },
        select: publicFields,
      });
      if (before.status !== status) {
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            userName: actor.name,
            userRole: 'SUPER_ADMIN',
            action: 'UPDATE_SALES_LEAD_STATUS',
            resource: `SalesLead:${id}`,
            metadata: { before: before.status, after: status },
          },
        });
      }
      return presentLead(updated);
    });
  }
}

export default new SalesLeadService();
