import type { SupportChatSenderRole } from '@prisma/client';

export type SupportConversationStatus = 'OPEN' | 'WAITING_CUSTOMER' | 'CLOSED';

export function deriveSupportConversationStatus(
  lastSenderRole: SupportChatSenderRole | string,
  issueStatus?: string | null,
): SupportConversationStatus {
  if (String(issueStatus || '').toUpperCase() === 'CLOSED') return 'CLOSED';
  return String(lastSenderRole).toUpperCase() === 'SUPER_ADMIN' ? 'WAITING_CUSTOMER' : 'OPEN';
}
