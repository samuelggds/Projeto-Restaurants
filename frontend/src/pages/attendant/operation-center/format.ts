import type { AttendantOrder, AttendantWorkspaceSnapshot } from '../types';
import type { Raw } from './types';

export function asRecord(value: unknown): Raw {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};
}

export function money(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
}

export function snapshotTime(snapshot: AttendantWorkspaceSnapshot) {
  const parsed = new Date(snapshot.generatedAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function elapsed(value: string, referenceTime: number) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || !referenceTime) return 'agora';
  const minutes = Math.max(0, Math.floor((referenceTime - timestamp) / 60_000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

export function pendingDays(value: string, referenceTime: number) {
  const source = new Date(value);
  const reference = new Date(referenceTime);
  if (!Number.isFinite(source.getTime()) || !Number.isFinite(reference.getTime())) return 0;
  const sourceDay = new Date(source.getFullYear(), source.getMonth(), source.getDate()).getTime();
  const referenceDay = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  ).getTime();
  return Math.max(0, Math.floor((referenceDay - sourceDay) / 86_400_000));
}

export function ageLabel(value: string, referenceTime: number) {
  const days = pendingDays(value, referenceTime);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Desde ontem';
  return `Há ${days} dias`;
}

export function isDelayed(order: AttendantOrder, referenceTime: number) {
  const created = new Date(order.createdAt).getTime();
  return (
    order.status !== 'PRONTO' &&
    Number.isFinite(created) &&
    referenceTime > 0 &&
    referenceTime - created >= 35 * 60_000
  );
}

export function orderPlace(order: AttendantOrder) {
  if (order.type === 'MESA') return `Mesa ${order.tableNumber ?? '?'}`;
  if (order.type === 'DELIVERY') return 'Delivery';
  return 'Retirada';
}

export function statusText(status: string) {
  if (status === 'PREPARANDO') return 'Em preparo';
  if (status === 'PRONTO') return 'Pronto';
  if (status === 'SAIU_PARA_ENTREGA') return 'Em rota';
  if (status === 'ENTREGUE') return 'Concluído';
  return 'Pendente';
}

export function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
}
