import { createHash, randomUUID } from 'node:crypto';
import prisma from '../../../config/prisma.js';
import { commercialWhatsappAiEnabled } from './CommercialWhatsappAiService.js';
import {
  COMMERCIAL_WHATSAPP_HUMAN_HANDOFF_TIMEOUT_MS,
  commercialWhatsappAutoReplyAvailableAt,
} from '../domain/commercialWhatsappAutomation.js';

const HUMAN_RETURN_TEXT =
  'Olá novamente! 😊 Nossa equipe não conseguiu assumir sua conversa nos últimos 10 minutos. Vou continuar por aqui para ajudar no que você precisar sobre a GastroNexa.';

/**
 * Expire only customer-requested handoffs; an explicit Super Admin takeover
 * clears handoffRequestedAt, so it cannot be automatically overridden.
 */
export async function resumeUnansweredCustomerHandoffs(
  notify: (conversationId: string, reason: string) => void,
  now = new Date(),
) {
  if (!commercialWhatsappAiEnabled()) return 0;
  const threshold = new Date(now.getTime() - COMMERCIAL_WHATSAPP_HUMAN_HANDOFF_TIMEOUT_MS);
  const candidates = await prisma.salesLeadWhatsappConversation.findMany({
    where: { automationMode: 'HUMAN', handoffRequestedAt: { lte: threshold } },
    select: { id: true, handoffRequestedAt: true },
    take: 50,
  });

  let resumed = 0;
  for (const candidate of candidates) {
    if (!candidate.handoffRequestedAt) continue;
    const changed = await prisma.$transaction(async (tx) => {
      const updated = await tx.salesLeadWhatsappConversation.updateMany({
        where: {
          id: candidate.id,
          automationMode: 'HUMAN',
          handoffRequestedAt: candidate.handoffRequestedAt,
        },
        data: { automationMode: 'BOT', handoffRequestedAt: null, closedAt: null },
      });
      if (updated.count !== 1) return false;

      const key = createHash('sha256')
        .update(`AI_TIMEOUT:${candidate.id}:${candidate.handoffRequestedAt.toISOString()}`)
        .digest('hex');
      await tx.salesLeadWhatsappOutbox.create({
        data: {
          id: randomUUID(),
          conversationId: candidate.id,
          deduplicationKey: key,
          kind: 'AI_TIMEOUT',
          body: HUMAN_RETURN_TEXT,
          availableAt: commercialWhatsappAutoReplyAvailableAt(now),
        },
      });
      return true;
    });

    if (changed) {
      resumed++;
      notify(candidate.id, 'ai_resumed_after_handoff_timeout');
    }
  }
  return resumed;
}
