import { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Info,
  MapPin,
  PackageCheck,
  Phone,
  User,
} from 'lucide-react';
import * as S from '../styles';
import * as C from './OrderCard.styles';
import { getCourierItemChoices, getCourierItemObservation } from '../domain/courierOrders';

type OrderItem = {
  quantity: number;
  price: number;
  observation?: string;
  notes?: string;
  ingredients?: unknown[];
  customizations?: unknown[];
  product?: {
    name?: string;
  };
};

type Order = {
  id: number;
  status: string;
  total: number;
  paymentMethod?: string;
  payOnDelivery?: boolean;
  payOnDeliveryMethod?: string;
  paid?: boolean;
  user?: {
    name?: string;
    phone?: string;
  };
  items?: OrderItem[];
  notes?: string;
  observation?: string;
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  pointReference?: string;
  deliveryDistanceMeters?: number | null;
  courierEarningPreview?: {
    available: boolean;
    amount: number | null;
    reason?: string;
  };
};

type OrderCardProps = {
  order: Order;
  onClaimDelivery?: (orderId: number) => Promise<void>;
  onMarkDelivered: (orderId: number, deliveryConfirmationCode: string) => Promise<void>;
  digitalPaymentMethods: Set<string>;
  paymentLabel: Record<string, string>;
  statusLabel: Record<string, { label: string; color: string }>;
};

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getDeliveryAddress(order: Order) {
  const rawComplement = String(order?.complement || '').trim();
  const complementWithoutReference = rawComplement
    .replace(/\|?\s*Ref\.:\s*.+$/i, '')
    .replace(/\|?\s*Ponto de referencia:\s*.+$/i, '')
    .trim();

  const parts = [
    order.address,
    order.number,
    complementWithoutReference,
    order.district,
    order.city,
    order.state,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : 'Endereço não informado';
}

function getReferencePoint(order: Order) {
  const explicitReference = String(order?.pointReference || '').trim();
  if (explicitReference) {
    return explicitReference;
  }

  const complement = String(order?.complement || '').trim();
  const complementMatch = complement.match(/(?:^|\|)\s*(?:Ref\.:|Ponto de referencia:)\s*(.+)$/i);
  if (complementMatch?.[1]) {
    return complementMatch[1].trim();
  }

  const observation = String(order?.observation || order?.notes || '').trim();
  const observationMatch = observation.match(/(?:^|\|)\s*(?:Ref\.:|Ponto de referencia:)\s*(.+)$/i);
  if (observationMatch?.[1]) {
    return observationMatch[1].trim();
  }

  return '';
}

function requiresConfirmedPayment(order: Order, digitalPaymentMethods: Set<string>) {
  const payOnDeliveryMethod = getPayOnDeliveryMethod(order);
  if (payOnDeliveryMethod) {
    return false;
  }

  const paymentMethod = String(order?.paymentMethod || '').toUpperCase();
  return digitalPaymentMethods.has(paymentMethod) && order?.paid !== true;
}

function getPayOnDeliveryMethod(order: Order) {
  const structuredMethod = String(order?.payOnDeliveryMethod || '')
    .trim()
    .toUpperCase();

  if (order?.payOnDelivery && structuredMethod) {
    return structuredMethod;
  }

  const rawObservation = String(order?.notes || order?.observation || '');
  const match = rawObservation.toUpperCase().match(/PAY_ON_DELIVERY:\s*(PIX|CARTAO|DINHEIRO)/);
  return match?.[1] || null;
}

export default function OrderCard({
  order,
  onClaimDelivery,
  onMarkDelivered,
  digitalPaymentMethods,
  paymentLabel,
  statusLabel,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const canClaim = order.status === 'PRONTO' && Boolean(onClaimDelivery);

  const statusInfo = statusLabel[order.status] || {
    label: order.status,
    color: '#64748b',
  };
  const canDeliver = order.status === 'SAIU_PARA_ENTREGA';
  const paymentPendingConfirmation = requiresConfirmedPayment(order, digitalPaymentMethods);
  const payOnDeliveryMethod = getPayOnDeliveryMethod(order);
  const normalizedDeliveryCode = String(deliveryCode || '').replace(/\D/g, '');
  const isDeliveryCodeValid = /^\d{4}$/.test(normalizedDeliveryCode);
  const paymentStatusLabel = order.paid ? 'Pago' : 'Não pago';
  const paymentMethodLabel =
    paymentLabel[order.paymentMethod || ''] || order.paymentMethod || 'Não informado';
  const orderObservation = String(order.notes || order.observation || '')
    .replace(/\s*\|?\s*PAY_ON_DELIVERY:\s*(PIX|CARTAO|DINHEIRO)\s*\|?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\|\s*|\s*\|$/g, '')
    .trim();
  const orderReferencePoint = getReferencePoint(order);
  const earningAvailable = Boolean(order.courierEarningPreview?.available);

  async function handleMarkDelivered() {
    if (!isDeliveryCodeValid) {
      setError('Digite exatamente 4 dígitos para confirmar a entrega.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onMarkDelivered(order.id, normalizedDeliveryCode);
    } catch (err) {
      const message =
        (
          err as {
            response?: { data?: { message?: string; error?: string } };
            message?: string;
          }
        )?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Erro ao atualizar';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimDelivery() {
    if (!onClaimDelivery) return;
    setLoading(true);
    setError('');
    try {
      await onClaimDelivery(order.id);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Não foi possível retirar este pedido.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <C.Card $status={order.status}>
      <C.Header>
        <C.HeaderIdentity>
          <C.OrderId>Pedido #{order.id}</C.OrderId>
          <C.StatusBadge $color={statusInfo.color}>
            <PackageCheck size={14} aria-hidden="true" />
            {statusInfo.label}
          </C.StatusBadge>
        </C.HeaderIdentity>
        <C.Total>{formatCurrency(order.total)}</C.Total>
      </C.Header>

      <C.SummaryGrid>
        <C.SummaryItem>
          <User aria-hidden="true" />
          <small>Cliente</small>
          <strong title={order.user?.name || 'Cliente'}>{order.user?.name || 'Cliente'}</strong>
        </C.SummaryItem>
        <C.SummaryItem>
          <CreditCard aria-hidden="true" />
          <small>Pagamento</small>
          <strong title={paymentMethodLabel}>{paymentMethodLabel}</strong>
        </C.SummaryItem>
        <C.SummaryItem $tone={order.paid ? 'success' : 'danger'}>
          {order.paid ? <CheckCircle aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
          <small>Status</small>
          <strong>{paymentStatusLabel}</strong>
        </C.SummaryItem>
      </C.SummaryGrid>

      {canClaim ? (
        <C.EarningBar
          $available={earningAvailable}
          title={order.courierEarningPreview?.reason || 'Valor calculado pelo servidor'}
        >
          <Banknote size={16} aria-hidden="true" />
          <span>Ganho</span>
          <strong>
            {earningAvailable
              ? formatCurrency(Number(order.courierEarningPreview?.amount || 0))
              : 'indisponível'}
          </strong>
        </C.EarningBar>
      ) : null}

      {payOnDeliveryMethod ? (
        <C.PayOnDelivery>
          <CreditCard size={14} aria-hidden="true" />
          {`Pagar na entrega (${paymentLabel[payOnDeliveryMethod] || payOnDeliveryMethod})`}
        </C.PayOnDelivery>
      ) : null}

      <C.AddressBox>
        <C.AddressIcon aria-hidden="true">
          <MapPin />
        </C.AddressIcon>
        <C.AddressContent>
          <small>Endereço de entrega</small>
          <strong>{getDeliveryAddress(order)}</strong>
        </C.AddressContent>
      </C.AddressBox>

      {canClaim && Number.isFinite(order.deliveryDistanceMeters) ? (
        <C.ContextRow>
          <MapPin aria-hidden="true" />
          <span>Rota calculada: {(Number(order.deliveryDistanceMeters) / 1000).toFixed(1)} km</span>
        </C.ContextRow>
      ) : null}

      {orderReferencePoint ? (
        <C.ContextRow>
          <MapPin aria-hidden="true" />
          <span>Ponto de referência: {orderReferencePoint}</span>
        </C.ContextRow>
      ) : null}

      {expanded && (
        <S.ExpandedContent>
          {order.user?.phone && (
            <S.DetailRow>
              <Phone size={14} />
              <span>{order.user.phone}</span>
            </S.DetailRow>
          )}

          {(order.items || []).length ? (
            <S.ItemsList>
              {(order.items || []).map((item, index) => {
                const choices = getCourierItemChoices(item);
                const itemObservation = getCourierItemObservation(item);
                return (
                  <S.ItemDetail key={`${order.id}-${index}`}>
                    <S.ItemRow>
                      <strong>
                        {item.quantity}x {item.product?.name || 'Item'}
                      </strong>
                      <span>
                        {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                      </span>
                    </S.ItemRow>
                    {choices.map((group, groupIndex) => (
                      <S.ItemChoice key={`${group.groupName}-${groupIndex}`}>
                        <b>{group.groupName}:</b> {group.options.join(', ')}
                      </S.ItemChoice>
                    ))}
                    {itemObservation ? (
                      <S.ItemObservation>
                        <b>Observação do item:</b> {itemObservation}
                      </S.ItemObservation>
                    ) : null}
                  </S.ItemDetail>
                );
              })}
            </S.ItemsList>
          ) : (
            <S.ItemsUnavailable>Itens do pedido não informados.</S.ItemsUnavailable>
          )}

          {orderObservation && (
            <S.NotesBox>
              <strong>Obs:</strong> {orderObservation}
            </S.NotesBox>
          )}
        </S.ExpandedContent>
      )}

      {error && (
        <S.ErrorMsg role="alert">
          <AlertCircle size={14} />
          {error}
        </S.ErrorMsg>
      )}

      {canClaim && (
        <C.ActionArea>
          <C.Hint>
            <Info aria-hidden="true" />
            <span>Confirme a retirada somente quando o pedido estiver com você.</span>
          </C.Hint>
          <C.PrimaryButton type="button" onClick={handleClaimDelivery} disabled={loading}>
            <PackageCheck size={18} />
            {loading ? 'Confirmando retirada...' : 'Retirar e iniciar entrega'}
          </C.PrimaryButton>
        </C.ActionArea>
      )}

      {canDeliver && (
        <C.ActionArea>
          <C.Hint>
            <Info aria-hidden="true" />
            <span>
              Peça ao cliente os 4 últimos dígitos do celular e digite abaixo para concluir a
              entrega.
            </span>
          </C.Hint>
          <C.DeliveryActions>
            <S.DeliveryCodeInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={deliveryCode}
              onChange={(event) => {
                setDeliveryCode(event.target.value.replace(/\D/g, '').slice(0, 4));
                if (error) {
                  setError('');
                }
              }}
              placeholder="4 últimos dígitos do celular"
            />
            <C.DeliverButton
              type="button"
              onClick={handleMarkDelivered}
              disabled={loading || paymentPendingConfirmation || !isDeliveryCodeValid}
              title={
                paymentPendingConfirmation
                  ? 'Pagamento ainda não confirmado'
                  : !isDeliveryCodeValid
                    ? 'Digite os 4 dígitos para concluir'
                    : ''
              }
            >
              <CheckCircle size={16} />
              {loading ? 'Atualizando...' : 'Marcar como Entregue'}
            </C.DeliverButton>
          </C.DeliveryActions>
        </C.ActionArea>
      )}

      <C.DetailsButton
        type="button"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Ocultar' : 'Ver'} detalhes do pedido ${order.id}`}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </C.DetailsButton>
    </C.Card>
  );
}
