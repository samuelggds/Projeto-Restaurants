import type { TableOrderNotice } from '../Home/domain/tableOrderNotice';

export function formatTableNumber(label: string | number) {
  const numeric = Number(label);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : String(label);
}

function stepState(progress: number, step: number) {
  return {
    active: progress >= step,
    current: progress === step || (progress > 3 && step === 3),
  };
}

export function confirmationSteps(tableOrder: TableOrderNotice | null) {
  const progress = tableOrder?.progress || 0;
  return ['Pedido recebido', 'Em preparo', 'Pronto para servir'].map((label, index) => {
    const step = index + 1;
    const state = stepState(progress, step);
    return {
      label,
      description: '',
      completed: progress > step,
      ...state,
    };
  });
}

export function trackingHeadline(tableOrder: TableOrderNotice | null) {
  if (!tableOrder) return 'Aguardando atualização do pedido';
  if (tableOrder.cancelled) return 'Pedido cancelado';
  if (tableOrder.status === 'PRONTO' || tableOrder.status === 'SAIU_PARA_ENTREGA') {
    return 'Seu pedido está pronto';
  }
  if (tableOrder.status === 'ENTREGUE') return 'Pedido servido';
  if (tableOrder.status === 'PREPARANDO') return 'Preparando seu pedido';
  return 'Pedido enviado à cozinha';
}

export function trackingSteps(tableOrder: TableOrderNotice | null, confirmedAt = '') {
  const progress = tableOrder?.progress || 0;
  const descriptions = [
    confirmedAt ? `Enviado para a cozinha às ${confirmedAt}` : 'Enviado para a cozinha',
    'Os chefs estão montando seus pratos',
    'Aguardando retirada do garçom',
  ];
  return ['Pedido Confirmado', 'Em Preparo', 'Pronto para Servir'].map((label, index) => {
    const step = index + 1;
    return {
      label,
      description: descriptions[index],
      ...stepState(progress, step),
    };
  });
}
