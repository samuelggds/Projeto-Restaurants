import { useCallback, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
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
  RefreshCw,
  User,
} from 'lucide-react';
import ordersService from '../../../Services/ordersService';
import * as S from '../styles';
import * as C from './OrderCard.styles';
import * as P from './DeliveryPaymentStatus.styles';
import CourierLocationChoiceModal from './CourierLocationChoiceModal';
import { getCourierItemChoices, getCourierItemObservation } from '../domain/courierOrders';

type OrderItem = {
  quantity: number;
  price: number;
  observation?: string;
  notes?: string;
  ingredients?: unknown[];
  customizations?: unknown[];
  product?: { name?: string };
};

type Order = {
  id: number;
  status: string;
  total: number;
  paymentMethod?: string;
  payOnDelivery?: boolean;
  payOnDeliveryMethod?: string;
  paid?: boolean;
  user?: { name?: string; phone?: string };
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

type DeliveryPayment = {
  method: string;
  provider: string;
  status: string;
  amount: number;
  currency?: string;
  pixCopyPaste?: string | null;
  lastProviderStatus?: string | null;
  paidAt?: string | null;
};

type OrderCardProps = {
  order: Order;
  onClaimDelivery?: (orderId: number, options: { shareLocation: boolean }) => Promise<void>;
  onMarkDelivered: (orderId: number, deliveryConfirmationCode: string) => Promise<void>;
  digitalPaymentMethods: Set<string>;
  paymentLabel: Record<string, string>;
  statusLabel: Record<string, { label: string; color: string }>;
};

type ClaimMode = 'location' | 'without-location' | null;

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
  if (explicitReference) return explicitReference;
  const complement = String(order?.complement || '').trim();
  const complementMatch = complement.match(/(?:^|\|)\s*(?:Ref\.:|Ponto de referencia:)\s*(.+)$/i);
  if (complementMatch?.[1]) return complementMatch[1].trim();
  const observation = String(order?.observation || order?.notes || '').trim();
  const observationMatch = observation.match(/(?:^|\|)\s*(?:Ref\.:|Ponto de referencia:)\s*(.+)$/i);
  return observationMatch?.[1]?.trim() || '';
}

function getPayOnDeliveryMethod(order: Order) {
  const structuredMethod = String(order?.payOnDeliveryMethod || '').trim().toUpperCase();
  if (order?.payOnDelivery && structuredMethod) return structuredMethod;
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
  void digitalPaymentMethods;
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [deliveryPayment, setDeliveryPayment] = useState<DeliveryPayment | null>(null);
  const [paymentRefreshing, setPaymentRefreshing] = useState(false);
  const [locationChoiceOpen, setLocationChoiceOpen] = useState(false);
  const [locationChoiceError, setLocationChoiceError] = useState('');
  const [claimMode, setClaimMode] = useState<ClaimMode>(null);
  const canClaim = order.status === 'PRONTO' && Boolean(onClaimDelivery);

  const statusInfo = statusLabel[order.status] || { label: order.status, color: '#64748b' };
  const canDeliver = order.status === 'SAIU_PARA_ENTREGA';
  const payOnDeliveryMethod = getPayOnDeliveryMethod(order);
  const automatedPayOnDelivery = payOnDeliveryMethod === 'PIX' || payOnDeliveryMethod === 'CARTAO';
  const providerPaid = order.paid === true || deliveryPayment?.status === 'PAID';
  const paymentPendingConfirmation = !providerPaid;
  const normalizedDeliveryCode = String(deliveryCode || '').replace(/\D/g, '');
  const isDeliveryCodeValid = /^\d{4}$/.test(normalizedDeliveryCode);
  const paymentStatusLabel = providerPaid ? 'Pago' : 'Não pago';
  const paymentMethodLabel = paymentLabel[order.paymentMethod || ''] || order.paymentMethod || 'Não informado';
  const orderObservation = String(order.notes || order.observation || '')
    .replace(/\s*\|?\s*PAY_ON_DELIVERY:\s*(PIX|CARTAO|DINHEIRO)\s*\|?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\|\s*|\s*\|$/g, '')
    .trim();
  const orderReferencePoint = getReferencePoint(order);
  const earningAvailable = Boolean(order.courierEarningPreview?.available);

  const refreshDeliveryPayment = useCallback(async () => {
    if (!canDeliver || !automatedPayOnDelivery) return;
    try {
      const payment = payOnDeliveryMethod === 'PIX'
        ? await ordersService.reconcileDeliveryPix(order.id)
        : await ordersService.reconcileDeliveryCard(order.id);
      setDeliveryPayment(payment as DeliveryPayment | null);
    } catch {
      const payment = await ordersService.getDeliveryPayment(order.id).catch(() => null);
      if (payment) setDeliveryPayment(payment as DeliveryPayment);
    }
  }, [automatedPayOnDelivery, canDeliver, order.id, payOnDeliveryMethod]);

  useEffect(() => {
    if (!canDeliver || !automatedPayOnDelivery) return;
    const initialRefresh = window.setTimeout(() => void refreshDeliveryPayment(), 0);
    const interval = window.setInterval(() => void refreshDeliveryPayment(), 5000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [automatedPayOnDelivery, canDeliver, refreshDeliveryPayment]);

  async function handleRefreshPayment() {
    setPaymentRefreshing(true);
    try { await refreshDeliveryPayment(); } finally { setPaymentRefreshing(false); }
  }

  async function handleMarkDelivered() {
    if (paymentPendingConfirmation) {
      setError('O pagamento precisa estar confirmado antes de concluir a entrega.');
      return;
    }
    if (!isDeliveryCodeValid) {
      setError('Digite o código de 4 dígitos informado pelo cliente.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onMarkDelivered(order.id, normalizedDeliveryCode);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Erro ao atualizar';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimDelivery(shareLocation: boolean) {
    if (!onClaimDelivery) return;
    setLoading(true);
    setClaimMode(shareLocation ? 'location' : 'without-location');
    setError('');
    setLocationChoiceError('');
    try {
      await onClaimDelivery(order.id, { shareLocation });
      setLocationChoiceOpen(false);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Não foi possível retirar este pedido.';
      setLocationChoiceError(message);
    } finally {
      setLoading(false);
      setClaimMode(null);
    }
  }

  return (
    <>
      <C.Card $status={order.status}>
        <C.Header>
          <C.HeaderIdentity>
            <C.OrderId>Pedido #{order.id}</C.OrderId>
            <C.StatusBadge $color={statusInfo.color}>
              <PackageCheck size={14} aria-hidden="true" />{statusInfo.label}
            </C.StatusBadge>
          </C.HeaderIdentity>
          <C.Total>{formatCurrency(order.total)}</C.Total>
        </C.Header>

        <C.SummaryGrid>
          <C.SummaryItem>
            <User aria-hidden="true" /><small>Cliente</small>
            <strong title={order.user?.name || 'Cliente'}>{order.user?.name || 'Cliente'}</strong>
          </C.SummaryItem>
          <C.SummaryItem>
            <CreditCard aria-hidden="true" /><small>Pagamento</small>
            <strong title={paymentMethodLabel}>{paymentMethodLabel}</strong>
          </C.SummaryItem>
          <C.SummaryItem $tone={providerPaid ? 'success' : 'danger'}>
            {providerPaid ? <CheckCircle aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
            <small>Status</small><strong>{paymentStatusLabel}</strong>
          </C.SummaryItem>
        </C.SummaryGrid>

        {canClaim ? (
          <C.EarningBar $available={earningAvailable} title={order.courierEarningPreview?.reason || 'Valor calculado pelo servidor'}>
            <Banknote size={16} aria-hidden="true" /><span>Ganho</span>
            <strong>{earningAvailable ? formatCurrency(Number(order.courierEarningPreview?.amount || 0)) : 'indisponível'}</strong>
          </C.EarningBar>
        ) : null}

        {payOnDeliveryMethod ? (
          <C.PayOnDelivery><CreditCard size={14} aria-hidden="true" />{`Pagar na entrega (${paymentLabel[payOnDeliveryMethod] || payOnDeliveryMethod})`}</C.PayOnDelivery>
        ) : null}

        {canDeliver && automatedPayOnDelivery && (
          <P.Box $paid={providerPaid}>
            <P.Head><span>{payOnDeliveryMethod === 'PIX' ? 'PIX na entrega' : 'Cartão na entrega'}</span><strong>{formatCurrency(Number(deliveryPayment?.amount || order.total))}</strong></P.Head>
            <P.Status $paid={providerPaid}>
              {providerPaid ? <CheckCircle /> : <RefreshCw />}
              <span>{providerPaid
                ? 'Pagamento confirmado automaticamente pelo provedor.'
                : payOnDeliveryMethod === 'PIX'
                  ? 'Aguardando o cliente pagar. O sistema confere o Pix automaticamente.'
                  : 'Aguardando aprovação na maquininha vinculada. O motoqueiro não confirma o pagamento.'}</span>
            </P.Status>
            {!providerPaid && payOnDeliveryMethod === 'PIX' && deliveryPayment?.pixCopyPaste && (
              <P.PixArea>
                <QRCode value={deliveryPayment.pixCopyPaste} />
                <small>Mostre este QR Code ao cliente ou copie o código Pix.</small>
                <P.CopyButton type="button" onClick={() => void navigator.clipboard.writeText(deliveryPayment.pixCopyPaste || '')}>Copiar código Pix</P.CopyButton>
              </P.PixArea>
            )}
            {!providerPaid && (
              <P.RefreshButton type="button" onClick={() => void handleRefreshPayment()} disabled={paymentRefreshing}>
                <RefreshCw size={15} />{paymentRefreshing ? 'Consultando provedor...' : 'Atualizar pagamento'}
              </P.RefreshButton>
            )}
          </P.Box>
        )}

        <C.AddressBox>
          <C.AddressIcon aria-hidden="true"><MapPin /></C.AddressIcon>
          <C.AddressContent><small>Endereço de entrega</small><strong>{getDeliveryAddress(order)}</strong></C.AddressContent>
        </C.AddressBox>

        {canClaim && Number.isFinite(order.deliveryDistanceMeters) ? (
          <C.ContextRow><MapPin aria-hidden="true" /><span>Rota calculada: {(Number(order.deliveryDistanceMeters) / 1000).toFixed(1)} km</span></C.ContextRow>
        ) : null}
        {orderReferencePoint ? <C.ContextRow><MapPin aria-hidden="true" /><span>Ponto de referência: {orderReferencePoint}</span></C.ContextRow> : null}

        {expanded && (
          <S.ExpandedContent>
            {order.user?.phone && <S.DetailRow><Phone size={14} /><span>{order.user.phone}</span></S.DetailRow>}
            {(order.items || []).length ? (
              <S.ItemsList>
                {(order.items || []).map((item, index) => {
                  const choices = getCourierItemChoices(item);
                  const itemObservation = getCourierItemObservation(item);
                  return (
                    <S.ItemDetail key={`${order.id}-${index}`}>
                      <S.ItemRow><strong>{item.quantity}x {item.product?.name || 'Item'}</strong><span>{formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</span></S.ItemRow>
                      {choices.map((group, groupIndex) => <S.ItemChoice key={`${group.groupName}-${groupIndex}`}><b>{group.groupName}:</b> {group.options.join(', ')}</S.ItemChoice>)}
                      {itemObservation ? <S.ItemObservation><b>Observação do item:</b> {itemObservation}</S.ItemObservation> : null}
                    </S.ItemDetail>
                  );
                })}
              </S.ItemsList>
            ) : <S.ItemsUnavailable>Itens do pedido não informados.</S.ItemsUnavailable>}
            {orderObservation && <S.NotesBox><strong>Obs:</strong> {orderObservation}</S.NotesBox>}
          </S.ExpandedContent>
        )}

        {error && <S.ErrorMsg role="alert"><AlertCircle size={14} />{error}</S.ErrorMsg>}

        {canClaim && (
          <C.ActionArea>
            <C.Hint><Info aria-hidden="true" /><span>Confirme a retirada somente quando o pedido estiver com você. GPS e configuração de pagamento não bloqueiam a saída.</span></C.Hint>
            <C.PrimaryButton type="button" onClick={() => { setError(''); setLocationChoiceError(''); setLocationChoiceOpen(true); }} disabled={loading}>
              <PackageCheck size={18} />Retirar e iniciar entrega
            </C.PrimaryButton>
          </C.ActionArea>
        )}

        {canDeliver && (
          <C.ActionArea>
            <C.Hint><Info aria-hidden="true" /><span>{paymentPendingConfirmation
              ? 'O botão de entrega será liberado somente quando o pagamento estiver confirmado.'
              : 'Peça ao cliente o código de 4 dígitos exibido no acompanhamento do pedido.'}</span></C.Hint>
            <C.DeliveryActions>
              <S.DeliveryCodeInput
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={deliveryCode}
                onChange={(event) => { setDeliveryCode(event.target.value.replace(/\D/g, '').slice(0, 4)); if (error) setError(''); }}
                placeholder="Código de 4 dígitos"
                aria-label="Código de entrega informado pelo cliente"
              />
              <C.DeliverButton
                type="button"
                onClick={handleMarkDelivered}
                disabled={loading || paymentPendingConfirmation || !isDeliveryCodeValid}
                title={paymentPendingConfirmation ? 'Pagamento ainda não confirmado' : !isDeliveryCodeValid ? 'Digite o código de 4 dígitos' : ''}
              >
                <CheckCircle size={16} />{loading ? 'Atualizando...' : 'Marcar como Entregue'}
              </C.DeliverButton>
            </C.DeliveryActions>
          </C.ActionArea>
        )}

        <C.DetailsButton type="button" aria-expanded={expanded} aria-label={`${expanded ? 'Ocultar' : 'Ver'} detalhes do pedido ${order.id}`} onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </C.DetailsButton>
      </C.Card>

      <CourierLocationChoiceModal
        open={locationChoiceOpen && canClaim}
        orderId={order.id}
        loading={loading}
        activeChoice={claimMode}
        error={locationChoiceError}
        onClose={() => { if (!loading) { setLocationChoiceOpen(false); setLocationChoiceError(''); } }}
        onUseLocation={() => void handleClaimDelivery(true)}
        onContinueWithoutLocation={() => void handleClaimDelivery(false)}
      />
    </>
  );
}
