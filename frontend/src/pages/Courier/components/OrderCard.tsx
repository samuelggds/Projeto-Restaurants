import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  PackageCheck,
  Phone,
  User,
} from 'lucide-react';
import * as S from '../styles';
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
  const orderObservation = String(order.notes || order.observation || '')
    .replace(/\s*\|?\s*PAY_ON_DELIVERY:\s*(PIX|CARTAO|DINHEIRO)\s*\|?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\|\s*|\s*\|$/g, '')
    .trim();
  const orderReferencePoint = getReferencePoint(order);

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
    <S.OrderCard $status={order.status}>
      <S.OrderCardHeader
        type="button"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Ocultar' : 'Ver'} detalhes do pedido ${order.id}`}
        onClick={() => setExpanded((value) => !value)}
      >
        <S.OrderMeta>
          <S.OrderId>Pedido #{order.id}</S.OrderId>
          <S.StatusBadgeInline $color={statusInfo.color}>{statusInfo.label}</S.StatusBadgeInline>
        </S.OrderMeta>
        <S.OrderTopRight>
          <S.OrderTotal>{formatCurrency(order.total)}</S.OrderTotal>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </S.OrderTopRight>
      </S.OrderCardHeader>

      <S.OrderSummaryRow>
        {canClaim ? (
          <S.InfoChip
            $tone={order.courierEarningPreview?.available ? 'success' : 'warning'}
            title={order.courierEarningPreview?.reason || 'Valor calculado pelo servidor'}
          >
            Ganho:{' '}
            {order.courierEarningPreview?.available
              ? formatCurrency(Number(order.courierEarningPreview.amount || 0))
              : 'indisponível'}
          </S.InfoChip>
        ) : null}
        <S.InfoChip>
          <User size={13} />
          {order.user?.name || 'Cliente'}
        </S.InfoChip>
        <S.InfoChip>
          <CreditCard size={13} />
          {paymentLabel[order.paymentMethod || ''] || order.paymentMethod}
        </S.InfoChip>
        <S.InfoChip $tone={order.paid ? 'success' : 'danger'}>
          <CreditCard size={13} />
          {paymentStatusLabel}
        </S.InfoChip>
        {payOnDeliveryMethod ? (
          <S.InfoChip $tone="info">
            <CreditCard size={13} />
            {`Pagar na entrega (${paymentLabel[payOnDeliveryMethod] || payOnDeliveryMethod})`}
          </S.InfoChip>
        ) : null}
      </S.OrderSummaryRow>

      <S.AddressRow>
        <MapPin size={14} />
        <span>{getDeliveryAddress(order)}</span>
      </S.AddressRow>

      {canClaim && Number.isFinite(order.deliveryDistanceMeters) ? (
        <S.DetailRow>
          <MapPin size={14} />
          <span>Rota calculada: {(Number(order.deliveryDistanceMeters) / 1000).toFixed(1)} km</span>
        </S.DetailRow>
      ) : null}

      {orderReferencePoint ? (
        <S.DetailRow>
          <MapPin size={14} />
          <span>Ponto de referência: {orderReferencePoint}</span>
        </S.DetailRow>
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
        <S.CardActions>
          <S.DeliveryHint>
            Confirme a retirada somente quando o pedido estiver com você.
          </S.DeliveryHint>
          <S.ActionButton type="button" onClick={handleClaimDelivery} disabled={loading}>
            <PackageCheck size={17} />
            {loading ? 'Confirmando retirada...' : 'Retirar e iniciar entrega'}
          </S.ActionButton>
        </S.CardActions>
      )}

      {canDeliver && (
        <S.CardActions>
          <S.DeliveryHint>
            Peça ao cliente os 4 últimos dígitos do celular e digite abaixo para concluir a entrega.
          </S.DeliveryHint>
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
          <S.DeliverButton
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
          </S.DeliverButton>
        </S.CardActions>
      )}
    </S.OrderCard>
  );
}
