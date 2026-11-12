export const COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS = 15_000;
export const COMMERCIAL_WHATSAPP_CLOSED_COOLDOWN_MS = 30 * 60 * 1_000;

export type CommercialWhatsappConversationMode = 'BOT' | 'HUMAN' | 'CLOSED';

const INBOUND_AUTO_REPLY_KINDS = new Set(['GREETING', 'HANDOFF', 'FORM_GREETING', 'AI_REPLY']);

export function commercialWhatsappAutoReplyAvailableAt(now = new Date()) {
  return new Date(now.getTime() + COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS);
}

/**
 * A worker that loses the atomic platform-wide send reservation retries just
 * after the reservation expires, without counting the deferral as an error.
 */
export function commercialWhatsappAutoReplyRetryAt(
  now: Date,
  nextAutomaticSendAt: Date | null | undefined,
) {
  if (nextAutomaticSendAt && nextAutomaticSendAt.getTime() > now.getTime()) {
    return new Date(nextAutomaticSendAt.getTime() + 100);
  }
  return commercialWhatsappAutoReplyAvailableAt(now);
}

export function shouldReopenCommercialWhatsappCycle(input: {
  mode: string;
  closedAt?: Date | string | null;
  open: boolean;
  now?: Date;
}) {
  if (input.mode !== 'CLOSED' || !input.open || !input.closedAt) return false;
  const closedAt = input.closedAt instanceof Date ? input.closedAt : new Date(input.closedAt);
  if (Number.isNaN(closedAt.getTime())) return false;
  const now = input.now ?? new Date();
  return now.getTime() - closedAt.getTime() >= COMMERCIAL_WHATSAPP_CLOSED_COOLDOWN_MS;
}

export function commercialWhatsappAutoReplySuppressionReason(input: {
  kind: string;
  mode: string;
  automationEnabled: boolean;
  open: boolean; // true when HUMAN service is in its configured schedule
  aiEnabled?: boolean;
}) {
  const kind = String(input.kind || '').trim().toUpperCase();

  // AWAY replies were removed. Legacy greetings still obey business hours.
  if (kind === 'AWAY') return 'outside_hours';
  if (!INBOUND_AUTO_REPLY_KINDS.has(kind)) return null;
  if (!input.automationEnabled) return 'automation_disabled';

  // The sales AI answers 24/7, including in HUMAN conversations outside
  // the human shift. When the human shift resumes, human takeover wins.
  if (kind === 'AI_REPLY') {
    if (input.aiEnabled === false) return 'ai_disabled';
    if (input.mode === 'BOT' || (input.mode === 'HUMAN' && !input.open)) return null;
    if (input.mode === 'HUMAN') return 'human_mode';
    return 'conversation_closed';
  }

  if (!input.open) return 'outside_hours';
  if (input.mode === 'HUMAN') return 'human_mode';
  if (input.mode === 'CLOSED') return 'conversation_closed';
  return null;
}
