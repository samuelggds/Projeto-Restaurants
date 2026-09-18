import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import PixPaymentPanel from '../Cart/components/PixPaymentPanel';
import type { PixPaymentData, PixPaymentStatus } from '../Home/hooks/useCheckoutPayments';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';

type RecoveryPayload = {
  orderId: number;
  orderPublicId: string;
  restaurantId: number;
  restaurantName?: string;
  totalAmount: number;
  paid: boolean;
  paymentId?: string | null;
  provider?: string | null;
  status?: string | null;
  isApproved?: boolean;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  requiresStatusCheck?: boolean;
  expiresAt?: string | null;
};

const Loading = styled.main`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f2f4f0;
  color: #34443b;
  text-align: center;

  div {
    display: grid;
    gap: 8px;
  }

  strong {
    font-size: 18px;
  }

  span {
    color: #6c756f;
    font-size: 13px;
  }
`;

const ErrorCard = styled.main`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f2f4f0;

  section {
    width: min(460px, 100%);
    padding: 24px;
    border: 1px solid #e1e5df;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 18px 45px rgba(25, 38, 31, 0.1);
  }

  h1 {
    margin: 0 0 8px;
    color: #25322d;
    font-size: 20px;
  }

  p {
    margin: 0 0 18px;
    color: #657069;
    line-height: 1.5;
  }

  button {
    min-height: 44px;
    padding: 0 16px;
    border: 0;
    border-radius: 10px;
    background: #25322d;
    color: #fff;
    font-weight: 800;
    cursor: pointer;
  }
`;

function normalizeStatus(payload: RecoveryPayload): PixPaymentStatus {
  if (payload.paid === true) return 'PAID';
  const status = String(payload.status || '').trim().toLowerCase();
  if (['rejected', 'declined', 'failed'].includes(status)) return 'FAILED';
  if (['cancelled', 'canceled'].includes(status)) return 'CANCELED';
  if (status === 'expired') return 'EXPIRED';
  if (['refunded', 'charged_back'].includes(status)) return 'REFUNDED';
  return status ? 'PENDING' : 'WAITING';
}

export default function OrderPixPaymentPage() {
  const navigate = useNavigate();
  const { restaurantSlug, orderPublicId } = useParams();
  const [payment, setPayment] = useState<RecoveryPayload | null>(null);
  const [status, setStatus] = useState<PixPaymentStatus>('WAITING');
  const [error, setError] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#bd4b1d');

  const homePath = restaurantSlug ? `/${restaurantSlug}` : '/';

  const loadPayment = useCallback(
    async (background = false) => {
      if (!orderPublicId) return;
      if (!background) setError('');
      try {
        let recovered = (await ordersService.recoverPixPayment(orderPublicId)) as RecoveryPayload;
        if (recovered.isApproved === true && recovered.paid !== true) {
          recovered = (await ordersService.confirmRecoveredPixPayment(
            orderPublicId,
          )) as RecoveryPayload;
        }
        setPayment(recovered);
        setStatus(normalizeStatus(recovered));
      } catch (requestError: unknown) {
        const typed = requestError as { response?: { data?: { error?: string } }; message?: string };
        const message =
          typed.response?.data?.error ||
          typed.message ||
          'Não foi possível recuperar o pagamento deste pedido.';
        setError(message);
        if (background) setStatus('ERROR');
      }
    },
    [orderPublicId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPayment();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPayment]);

  useEffect(() => {
    if (!payment?.restaurantId) return;
    let active = true;
    restaurantSettingsService
      .getPublicSettings(payment.restaurantId)
      .then((settings) => {
        if (!active) return;
        const nextColor = String(settings?.primaryColor || '').trim();
        if (nextColor) setPrimaryColor(nextColor);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [payment?.restaurantId]);

  useEffect(() => {
    if (!payment || ['PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'].includes(status)) {
      return;
    }
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadPayment(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadPayment, payment, status]);

  if (!payment && !error) {
    return (
      <Loading>
        <div>
          <strong>Recuperando seu pagamento Pix</strong>
          <span>Estamos buscando a cobrança vinculada ao seu pedido.</span>
        </div>
      </Loading>
    );
  }

  if (!payment) {
    return (
      <ErrorCard>
        <section>
          <h1>Não foi possível abrir este pagamento</h1>
          <p>{error}</p>
          <button type="button" onClick={() => navigate(homePath)}>
            Voltar ao cardápio
          </button>
        </section>
      </ErrorCard>
    );
  }

  const pixPaymentData: PixPaymentData = {
    restaurantId: payment.restaurantId,
    orderId: payment.orderId,
    total: Number(payment.totalAmount || 0),
    paymentId: String(payment.paymentId || ''),
    provider: String(payment.provider || 'PIX'),
    pixCode: String(payment.qrCode || ''),
    qrCodeBase64: payment.qrCodeBase64 ? String(payment.qrCodeBase64) : null,
    requiresStatusCheck: payment.requiresStatusCheck !== false,
    paid: payment.paid === true,
    expiresAt: payment.expiresAt ? String(payment.expiresAt) : null,
  };

  return (
    <PixPaymentPanel
      pixPaymentData={pixPaymentData}
      paymentStatus={status}
      paymentError={error || null}
      primaryColor={primaryColor}
      restaurantName={payment.restaurantName}
      formatCurrency={(value) =>
        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      }
      onCopyPixKey={() => navigator.clipboard.writeText(pixPaymentData.pixCode)}
      onVerify={() => loadPayment()}
      onBackToCart={() => navigate(homePath)}
    />
  );
}
