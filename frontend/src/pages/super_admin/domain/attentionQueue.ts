import type { SuperAdminData } from '../types';
import type { QuickSearchTarget } from './quickSearch';

export type AttentionCategory = 'support' | 'billing' | 'trial' | 'access';
export interface AttentionItem {
  key: string;
  category: AttentionCategory;
  title: string;
  description: string;
  date: string | null;
  dateLabel: string;
  amount?: number;
  target: QuickSearchTarget;
}

const categoryOrder: Record<AttentionCategory, number> = {
  support: 0,
  billing: 1,
  trial: 2,
  access: 3,
};
const validTime = (value: string | null) => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : Infinity;
};

/** Organiza o snapshot; não recalcula status financeiros ou permissões de acesso. */
export function buildAttentionQueue(data: SuperAdminData, now: number): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const ticket of data.tickets) {
    if (ticket.status !== 'OPEN') continue;
    items.push({
      key: `support:${ticket.id}`,
      category: 'support',
      title: ticket.restaurant,
      description: ticket.subject || 'Conversa aguardando resposta da equipe.',
      date: ticket.lastMessageAt,
      dateLabel: 'Última mensagem',
      target: { kind: 'support', id: ticket.id },
    });
  }
  for (const invoice of data.invoices) {
    if (invoice.status !== 'OVERDUE') continue;
    items.push({
      key: `billing:${invoice.id}`,
      category: 'billing',
      title: invoice.restaurant,
      description: `${invoice.code} · Fatura em atraso`,
      date: invoice.dueDate,
      dateLabel: 'Vencimento',
      amount: invoice.value,
      target: { kind: 'invoice', id: invoice.id },
    });
  }
  for (const restaurant of data.restaurants) {
    const subscription = restaurant.subscription;
    if (!restaurant.active || subscription?.status !== 'TESTE') continue;
    const end = validTime(subscription.trialEndsAt);
    if (!Number.isFinite(now) || !Number.isFinite(end) || end > now + 7 * 86_400_000) continue;
    items.push({
      key: `trial:${restaurant.id}`,
      category: 'trial',
      title: restaurant.name,
      description:
        end <= now ? 'Período de teste encerrado · Revisar ciclo' : 'Teste termina em até 7 dias',
      date: subscription.trialEndsAt,
      dateLabel: 'Fim do teste',
      target: { kind: 'restaurant', id: restaurant.id },
    });
  }
  for (const admin of data.administrators) {
    if (admin.status !== 'ACTIVE' || (!admin.mustChangePassword && admin.effectiveMfa)) continue;
    items.push({
      key: `access:${admin.id}`,
      category: 'access',
      title: admin.name,
      description: [
        admin.restaurant,
        admin.mustChangePassword ? 'Troca de senha pendente' : '',
        !admin.effectiveMfa ? 'MFA não habilitado' : '',
      ]
        .filter(Boolean)
        .join(' · '),
      date: admin.createdAt,
      dateLabel: 'Cadastro',
      target: { kind: 'administrator', id: admin.id },
    });
  }
  return items.sort(
    (a, b) =>
      categoryOrder[a.category] - categoryOrder[b.category] ||
      validTime(a.date) - validTime(b.date) ||
      a.key.localeCompare(b.key),
  );
}
