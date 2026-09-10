import { CheckCircle2, MapPin, RefreshCw, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDialogFocusManagement } from '../../../shared/hooks/useDialogFocusManagement';
import { toast } from 'react-toastify';
import { useOperationServices } from './services';
import type { AttendantOrder } from '../types';
import { type Raw } from './types';
import { asRecord, money, statusText, errorMessage } from './format';
import {
  DrawerBackdrop,
  Drawer,
  DrawerHead,
  DrawerBody,
  InfoGrid,
  Info,
  ItemBox,
  ActionBox,
} from './OrderDrawer.styles';
import { EmptyState } from './EmptyState';

export function OrderDrawer({
  orderId,
  fallback,
  onClose,
  onCompleted,
}: {
  orderId: number;
  fallback: AttendantOrder;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const services = useOperationServices();
  const [data, setData] = useState<Raw | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const close = () => {
    if (!finishing) onClose();
  };
  const dialogRef = useDialogFocusManagement<HTMLElement>(close);

  useEffect(() => {
    let active = true;
    services
      .getOrder(orderId)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, attempt, services]);

  function retry() {
    setLoadError(false);
    setLoading(true);
    setAttempt((current) => current + 1);
  }

  const order = data || {};
  const customer = asRecord(order.user);
  const items = Array.isArray(order.items) ? order.items : [];
  const type = String(order.type || fallback.type);
  const status = String(order.status || fallback.status);
  const paid = Boolean(order.paid);
  const canFinishPickup = type === 'RETIRADA' && status === 'PRONTO';

  async function finishPickup() {
    if (finishing || loading || loadError || !data || !paid || !canFinishPickup) return;
    setFinishing(true);
    try {
      await services.completePickup(orderId);
      toast.success('Retirada concluída.');
      onCompleted();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível concluir a retirada.'));
    } finally {
      setFinishing(false);
    }
  }

  return (
    <DrawerBackdrop onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <Drawer ref={dialogRef} role="dialog" aria-modal="true" aria-label="Detalhes do pedido">
        <DrawerHead>
          <div>
            <small>Pedido</small>
            <strong>{fallback.code}</strong>
            <em>{statusText(status)}</em>
          </div>
          <button type="button" aria-label="Fechar detalhes" onClick={close} disabled={finishing}>
            <X />
          </button>
        </DrawerHead>
        {loading ? (
          <EmptyState
            icon={RefreshCw}
            title="Carregando pedido..."
            text="Buscando os dados completos."
          />
        ) : loadError ? (
          <DrawerBody>
            <ActionBox $warning role="alert">
              <strong>Não foi possível carregar o pedido</strong>
              <p>
                O total e o pagamento ainda não puderam ser consultados. Atualize os detalhes antes
                de concluir a retirada.
              </p>
              <button type="button" onClick={retry}>
                <RefreshCw /> Tentar carregar novamente
              </button>
            </ActionBox>
          </DrawerBody>
        ) : (
          <DrawerBody>
            <InfoGrid>
              <Info>
                <small>Cliente</small>
                <b>{String(customer.name || fallback.customerName || 'Cliente')}</b>
                <span>{String(customer.phone || 'Telefone não informado')}</span>
              </Info>
              <Info>
                <small>Canal</small>
                <b>{type === 'DELIVERY' ? 'Delivery' : type === 'MESA' ? 'Mesa' : 'Retirada'}</b>
                <span>{paid ? 'Pagamento confirmado' : 'Pagamento pendente'}</span>
              </Info>
            </InfoGrid>
            {type === 'DELIVERY' && (
              <Info>
                <small>Endereço</small>
                <b>
                  <MapPin /> {String(order.address || 'Endereço não informado')},{' '}
                  {String(order.number || '')}
                </b>
                <span>{[order.district, order.city, order.state].filter(Boolean).join(' · ')}</span>
              </Info>
            )}
            <ItemBox>
              <h3>Itens do pedido</h3>
              {items.length
                ? items.map((item, index) => {
                    const itemData = asRecord(item);
                    const product = asRecord(itemData.product);
                    return (
                      <div key={String(itemData.id || index)}>
                        <b>
                          {Number(itemData.quantity || 1)}×{' '}
                          {String(product.name || itemData.productName || 'Item')}
                        </b>
                        {itemData.observation ? <span>{String(itemData.observation)}</span> : null}
                      </div>
                    );
                  })
                : fallback.items.map((item) => (
                    <div key={item.productName}>
                      <b>
                        {item.quantity}× {item.productName}
                      </b>
                    </div>
                  ))}
            </ItemBox>
            <InfoGrid>
              <Info>
                <small>Total</small>
                <b className="total">{money(order.total)}</b>
              </Info>
              <Info>
                <small>Próximo passo</small>
                <b>
                  {canFinishPickup
                    ? paid
                      ? 'Entregar ao cliente'
                      : 'Confirmar pagamento'
                    : status === 'PRONTO'
                      ? 'Encaminhar ao responsável'
                      : 'Acompanhar preparo'}
                </b>
              </Info>
            </InfoGrid>
            {canFinishPickup && (
              <ActionBox $warning={!paid}>
                <strong>
                  {paid ? 'Pedido pronto para retirada' : 'Pagamento ainda não confirmado'}
                </strong>
                <p>
                  {paid
                    ? 'Entregue ao cliente e conclua a retirada.'
                    : 'A retirada só pode ser concluída depois da confirmação do pagamento.'}
                </p>
                <button
                  type="button"
                  disabled={!paid || finishing}
                  onClick={() => void finishPickup()}
                >
                  <CheckCircle2 /> {finishing ? 'Concluindo...' : 'Confirmar retirada entregue'}
                </button>
              </ActionBox>
            )}
          </DrawerBody>
        )}
      </Drawer>
    </DrawerBackdrop>
  );
}
