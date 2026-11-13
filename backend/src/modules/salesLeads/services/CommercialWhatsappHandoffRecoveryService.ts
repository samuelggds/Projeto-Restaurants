import prisma from '../../../config/prisma.js';
import { commercialWhatsappAiEnabled } from './CommercialWhatsappAiService.js';
import { COMMERCIAL_WHATSAPP_HUMAN_HANDOFF_TIMEOUT_MS } from '../domain/commercialWhatsappAutomation.js';

/**
 * All human takeovers (panel or authenticated outgoing device messages) are
 * timed by handoffRequestedAt. Every human message resets the timestamp.
 * Customer inbound messages do NOT extend this deadline.
 *
 * On timeout, the bot is enabled silently. It responds to the customer's
 * NEXT message; it does not impersonate a human or send a surprise message.
 * Concurrent workers race on the timestamp predicate; only one can resume.
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
    const updated = await prisma.salesLeadWhatsappConversation.updateMany({
      where: {
        id: candidate.id,
        automationMode: 'HUMAN',
        handoffRequestedAt: candidate.handoffRequestedAt,
      },
      data: { automationMode: 'BOT', handoffRequestedAt: null, closedAt: null },
    });
    if (updated.count === 1) {
      resumed++;
      notify(candidate.id, 'ai_resumed_after_human_inactivity');
    }
  }
  return resumed;
}
