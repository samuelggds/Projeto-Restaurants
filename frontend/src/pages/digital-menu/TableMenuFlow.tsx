import { ArrowLeft, Table2, Utensils } from 'lucide-react';
import type { HomeData } from '../Home/types';
import * as S from './TableMenuExperience.styles';
import { formatTableNumber } from './TableMenuFlow.domain';

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
  const headerBrandName = data.brand.name.trim() || 'Restaurante';

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
          {data.brand.logoUrl ? (
            <img src={data.brand.logoUrl} alt={headerBrandName} />
          ) : (
            <span className="mark">
              {data.brand.monogram || headerBrandName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="name">
            <b>{headerBrandName}</b>
            <small className="brand-subtitle desktop-subtitle">Mesa Inteligente</small>
            <small className="brand-subtitle mobile-subtitle">{headerBrandName}</small>
          </span>
        </S.FigmaBrand>
        {title ? (
          <span className="context-title">
            <b>{title}</b>
            <small>{headerBrandName}</small>
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
