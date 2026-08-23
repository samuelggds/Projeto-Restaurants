/* eslint-disable react-refresh/only-export-components */
import { BellRing, CheckCircle2, ChefHat, Clock3, ShoppingBag, Users } from 'lucide-react';
import type { Order, OrderStatus } from '../types';
import * as S from '../Kitchen.styles';

export const statusLabel: Record<OrderStatus, string> = {
  PENDENTE: 'Pendente',
  PREPARANDO: 'Preparando',
  PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};
export const channelLabel = {
  TABLE: 'Mesa',
  PICKUP: 'Retirada',
  DELIVERY: 'Delivery',
} as const;
export const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function MetricCards({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    tone?: 'green';
    icon?: 'orders' | 'chef' | 'tables' | 'calls' | 'clock';
  }[];
}) {
  const icons = {
    orders: <ShoppingBag />,
    chef: <ChefHat />,
    tables: <Users />,
    calls: <BellRing />,
    clock: <Clock3 />,
  };
  return (
    <S.Metrics>
      {items.map((item) => (
        <S.Metric key={item.label} $tone={item.tone}>
          <i>{icons[item.icon ?? 'orders']}</i>
          <span>
            <small>{item.label}</small>
            <b>{item.value}</b>
          </span>
        </S.Metric>
      ))}
    </S.Metrics>
  );
}
export function StatusBadge({ status }: { status: OrderStatus }) {
  return <S.Status $status={status}>{statusLabel[status]}</S.Status>;
}

export function hasOrderPreparationDetails(order: Order) {
  return Boolean(
    order.observation ||
    order.itemDetails?.some(
      (item) => item.observation || item.customizations.some((group) => group.options.length),
    ),
  );
}

export function OrderItems({ order }: { order: Order }) {
  const detailedItems = order.itemDetails?.length ? order.itemDetails : null;

  return (
    <S.ItemList className="items">
      {detailedItems
        ? detailedItems.map((item, itemIndex) => (
            <div className="order-item" key={`${item.name}-${itemIndex}`}>
              <strong className="item-name">
                <span>{item.quantity}×</span>
                {item.name}
              </strong>
              {item.customizations.map((group, groupIndex) => (
                <div className="choice-group" key={`${group.groupName}-${groupIndex}`}>
                  <b>{group.groupName}</b>
                  <span>{group.options.join(', ')}</span>
                </div>
              ))}
              {item.observation && (
                <p className="item-observation">
                  <b>Observação deste item</b>
                  <span>{item.observation}</span>
                </p>
              )}
            </div>
          ))
        : order.items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
      {order.observation && (
        <aside className="order-observation">
          <b>Observação do pedido</b>
          <span>{order.observation}</span>
        </aside>
      )}
    </S.ItemList>
  );
}
export function Empty({ children }: { children: string }) {
  return (
    <S.Empty>
      <CheckCircle2 />
      <b>{children}</b>
    </S.Empty>
  );
}
