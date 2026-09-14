import type { DemoState } from './demoDomain';

export type DemoSupportMessage = {
  id: string;
  channel: 'internal' | 'platform';
  senderRole: 'FUNCIONARIO' | 'ADMIN' | 'SUPER_ADMIN';
  senderLabel: string;
  message: string;
  issueStatus: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  issueResponse?: string;
  sentAt: string;
};

export function addDemoSupportMessage(
  state: DemoState,
  input: { subject: string; message: string; reporterName?: string; reporterRole?: string },
) {
  const employee = Boolean(input.reporterRole);
  const message: DemoSupportMessage = {
    id: `demo-support-${Date.now()}-${(state.supportMessages?.length ?? 0) + 1}`,
    channel: employee ? 'internal' : 'platform',
    senderRole: employee ? 'FUNCIONARIO' : 'ADMIN',
    senderLabel: input.reporterName || 'Administrador Demo',
    message: `${input.subject.trim()}\n${input.message.trim()}`,
    issueStatus: 'OPEN',
    sentAt: new Date().toISOString(),
  };
  return { ...state, supportMessages: [...(state.supportMessages ?? []), message] };
}

export function sanitizeDemoSupport(value: unknown): DemoSupportMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.message === 'string' &&
      typeof item.senderLabel === 'string' &&
      typeof item.sentAt === 'string' &&
      ['internal', 'platform'].includes(item.channel) &&
      ['FUNCIONARIO', 'ADMIN', 'SUPER_ADMIN'].includes(item.senderRole) &&
      ['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(item.issueStatus) &&
      (item.issueResponse === undefined || typeof item.issueResponse === 'string'),
  );
}
