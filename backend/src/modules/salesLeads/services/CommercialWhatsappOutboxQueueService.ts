import { createHash, randomUUID } from 'node:crypto';
import prisma from '../../../config/prisma.js';
import { commercialWhatsappAutoReplyAvailableAt } from '../domain/commercialWhatsappAutomation.js';

export const AUTOMATIC_REPLY_KINDS = ['GREETING', 'HANDOFF', 'FORM_GREETING', 'AWAY', 'AI_REPLY', 'AI_TIMEOUT'];

export async function suppressPendingAutomaticReplies(
  db: Pick<typeof prisma, 'salesLeadWhatsappOutbox'>,
  conversationId: string,
  reason: string,
) {
  await db.salesLeadWhatsappOutbox.updateMany({
    where: {
      conversationId,
      status: 'PENDING',
      kind: { in: AUTOMATIC_REPLY_KINDS },
    },
    data: {
      status: 'SUPPRESSED',
      suppressedReason: reason,
      lockedUntil: null,
      lockToken: null,
    },
  });
}

export async function enqueueAutoReply(
  db: Pick<typeof prisma, 'salesLeadWhatsappOutbox'>,
  conversationId: string,
  phone: string,
  kind: 'GREETING' | 'HANDOFF' | 'AI_REPLY',
  body: string,
  sourceMessageKey: string,
) {
  const key = createHash('sha256')
    .update(JSON.stringify(['AUTO_REPLY', conversationId, phone, kind, sourceMessageKey]))
    .digest('hex');

    const existing = await db.salesLeadWhatsappOutbox.findUnique({
      where: { deduplicationKey: key },
      select: { id: true },
    });
    if (existing) {
      return { queued: false, reason: 'duplicate_inbound' } as const;
    }

    const pendingHandoff = await db.salesLeadWhatsappOutbox.findFirst({
      where: {
        conversationId,
        status: 'PENDING',
        kind: 'HANDOFF',
      },
      select: { id: true },
    });
    if (pendingHandoff && kind !== 'HANDOFF') {
      return { queued: false, reason: 'handoff_pending' } as const;
    }

    await db.salesLeadWhatsappOutbox.updateMany({
      where: {
        conversationId,
        status: 'PENDING',
        kind: { in: kind === 'HANDOFF' ? ['GREETING', 'HANDOFF', 'AI_REPLY', 'AI_TIMEOUT'] : ['GREETING', 'AI_REPLY', 'AI_TIMEOUT'] },
      },
      data: {
        status: 'SUPPRESSED',
        suppressedReason: 'superseded_by_new_inbound',
        lockedUntil: null,
        lockToken: null,
      },
    });

    await db.salesLeadWhatsappOutbox.create({
      data: {
        id: randomUUID(),
        conversationId,
        deduplicationKey: key,
        kind,
        body,
        availableAt: commercialWhatsappAutoReplyAvailableAt(),
      },
    });
    return { queued: true } as const;
}

