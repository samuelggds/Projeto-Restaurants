export const COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS = 5_000;
export const COMMERCIAL_WHATSAPP_CLOSED_COOLDOWN_MS = 30 * 60 * 1_000;

export type CommercialWhatsappConversationMode = 'BOT' | 'HUMAN' | 'CLOSED';

const INBOUND_AUTO_REPLY_KINDS = new Set(['GREETING', 'HANDOFF', 'FORM_GREETING']);

export function commercialWhatsappAutoReplyAvailableAt(now = new Date()) {
  return new Date(now.getTime() + COMMERCIAL_WHATSAPP_AUTO_REPLY_DELAY_MS);
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
  open: boolean;
}) {
  const kind = String(input.kind || '').trim().toUpperCase();

  // Respostas AWAY pertencem ao fluxo antigo. Fora do horário agora é silêncio.
  if (kind === 'AWAY') return 'outside_hours';
  if (!INBOUND_AUTO_REPLY_KINDS.has(kind)) return null;
  if (!input.automationEnabled) return 'automation_disabled';
  if (!input.open) return 'outside_hours';
  if (input.mode === 'HUMAN') return 'human_mode';
  if (input.mode === 'CLOSED') return 'conversation_closed';
  return null;
}
