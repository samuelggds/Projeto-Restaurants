import { ArrowLeft, Table2, Utensils } from 'lucide-react';
import type { HomeData } from '../Home/types';
import type { TableOrderNotice } from '../Home/domain/tableOrderNotice';
import * as S from './TableMenuExperience.styles';

export function formatTableNumber(label: string | number) {
  const numeric = Number(label);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : String(label);
}

export function FlowHeader({
  data,
  tableLabel,
  title,
  onBack,
  onHome,
  onMenu,
  onOrders,
}: {
  data: HomeData;
  tableLabel: string | number;
  title?: string;
  onBack?: () => void;
  onHome: () => void;
  onMenu: () => void;
  onOrders: () => void;
}) {
  const isCartHeader = title === 'Meu Pedido';
  const headerBrandName = isCartHeader ? 'GastroNexa' : data.brand.name;

  return (
    <S.FigmaHeader $hasTitle={Boolean(title)} className={isCartHeader ? 'cart-header' : undefined}>
      <div className="left">
        {title && onBack ? (
          <button
            className="mobile-back"
            type="button"
            aria-label={isCartHeader ? 'Voltar para o cardápio' : 'Voltar'}
            onClick={onBack}
          >
            <ArrowLeft size={30} />
          </button>
        ) : null}
        <S.FigmaBrand>
          {isCartHeader ? (
            <span className="mark">G</span>
          ) : data.brand.logoUrl ? (
            <img src={data.brand.logoUrl} alt={data.brand.name} />
          ) : (
            <span className="mark">{data.brand.monogram || data.brand.name.slice(0, 1)}</span>
          )}
          <span className="name">
            <b>{headerBrandName}</b>
            <small className="brand-subtitle desktop-subtitle">Mesa Inteligente</small>
            <small className="brand-subtitle mobile-subtitle">{data.brand.name}</small>
          </span>
        </S.FigmaBrand>
        {title ? (
          <span className="context-title">
            <b>{title}</b>
            <small>{isCartHeader ? 'GastroNexa' : data.brand.name}</small>
          </span>
        ) : null}
      </div>

      <nav aria-label="Navegação da mesa">
        <button className={!title ? 'active' : ''} type="button" onClick={onHome}>Início</button>
        <button className={title === 'Meu Pedido' ? 'active' : ''} type="button" onClick={onMenu}>Cardápio</button>
        <button className={title && title !== 'Meu Pedido' ? 'active' : ''} type="button" onClick={onOrders}>Pedidos</button>
      </nav>

      <div className="right">
        <S.FigmaTablePill
          className={isCartHeader ? 'cart-table-pill' : undefined}
          aria-label={`Mesa ${tableLabel}`}
        >
          {isCartHeader ? <Table2 size={14} /> : <Utensils size={21} />}
          <span>Mesa {formatTableNumber(tableLabel)}</span>
        </S.FigmaTablePill>
      </div>
    </S.FigmaHeader>
  );
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
