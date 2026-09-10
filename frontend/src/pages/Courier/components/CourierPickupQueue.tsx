import { CheckCircle2, ChevronRight, PackageCheck, RefreshCw } from 'lucide-react';
import type { CourierOrder } from '../domain/courierOrders';
import * as S from '../styles';

type Props = {
  ready: CourierOrder[];
  loading: boolean;
  loadError: string;
  onOpenOrder: (order: CourierOrder) => void;
};

export function CourierPickupQueue({ ready, loading, loadError, onOpenOrder }: Props) {
  return (
    <S.PickupPanel>
      <S.EarningsHeading>
        <div>
          <PackageCheck />
          <span>
            <small>PRÓXIMAS RETIRADAS</small>
            <h2>Pedidos aguardando você</h2>
          </span>
        </div>
        <S.PickupCount>{loading || loadError ? '—' : ready.length}</S.PickupCount>
      </S.EarningsHeading>
      {loading ? (
        <S.CompactEmpty role="status" aria-live="polite">
          <RefreshCw className="spinning" aria-hidden="true" />
          <span>
            <b>Carregando retiradas...</b>
            <small>Aguarde a consulta dos pedidos.</small>
          </span>
        </S.CompactEmpty>
      ) : loadError ? (
        <S.CompactEmpty>
          <PackageCheck aria-hidden="true" />
          <span>
            <b>Lista de retiradas indisponível</b>
            <small>Tente atualizar para consultar os pedidos.</small>
          </span>
        </S.CompactEmpty>
      ) : ready.length ? (
        <S.CompactOrders>
          {ready.slice(0, 5).map((order) => (
            <S.CompactOrderButton key={order.id} type="button" onClick={() => onOpenOrder(order)}>
              <span>
                <PackageCheck />
                <b>Pedido #{order.id}</b>
                <small>Pronto para retirada</small>
                <small>
                  Ganho:{' '}
                  {(
                    order.courierEarningPreview as
                      { available?: boolean; amount?: number } | undefined
                  )?.available
                    ? Number(
                        (order.courierEarningPreview as { amount?: number }).amount || 0,
                      ).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : 'aguardando cálculo'}
                </small>
              </span>
              <ChevronRight />
            </S.CompactOrderButton>
          ))}
        </S.CompactOrders>
      ) : (
        <S.CompactEmpty>
          <CheckCircle2 />
          <span>
            <b>Tudo certo por aqui</b>
            <small>Nenhum pedido aguardando retirada.</small>
          </span>
        </S.CompactEmpty>
      )}
    </S.PickupPanel>
  );
}
