import type { SupportChatSenderRole } from '@prisma/client';

export type SupportConversationStatus = 'OPEN' | 'WAITING_CUSTOMER';

export function deriveSupportConversationStatus(
  lastSenderRole: SupportChatSenderRole | string,
): SupportConversationStatus {
  return String(lastSenderRole).toUpperCase() === 'SUPER_ADMIN' ? 'WAITING_CUSTOMER' : 'OPEN';
}
