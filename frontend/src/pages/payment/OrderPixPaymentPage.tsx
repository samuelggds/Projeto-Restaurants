import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import PixPaymentPanel from '../Cart/components/PixPaymentPanel';
import type { PixPaymentData, PixPaymentStatus } from '../Home/hooks/useCheckoutPayments';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import {
  OnlineCardPaymentForm,
  type CardPaymentPreparer,
} from '../Home/components/OnlineCardPaymentForm';

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
  paymentMethod?: 'PIX' | 'CARTAO';
  canRetry?: boolean;
  paymentAttempt?: {
    status?: string;
    failureCode?: string | null;
    failureMessage?: string | null;
  } | null;
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

const CardRecovery = styled.main<{ $primary: string }>`
  --home-primary: ${({ $primary }) => $primary};
  min-height: 100dvh;
  display: grid;
  place-items: start center;
  padding: 28px 16px;
  background: #f2f4f0;

  > section {
    width: min(560px, 100%);
    padding: 20px;
    border: 1px solid #e0e5e1;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 18px 45px rgba(25, 38, 31, 0.1);
  }

  h1 {
    margin: 0;
    color: #25322d;
    font-size: 21px;
  }

  .subtitle {
    margin: 5px 0 16px;
    color: #68726c;
    font-size: 12px;
    line-height: 1.5;
  }

  .summary {
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 13px;
    border-radius: 11px;
    background: #f6f8f6;
  }

  .summary span {
    color: #69736d;
    font-size: 11px;
  }

  .summary strong {
    color: #27342d;
    font-size: 15px;
  }

  .notice {
    margin-bottom: 12px;
    padding: 11px 12px;
    border: 1px solid #e8c7c2;
    border-radius: 10px;
    color: #84372f;
    background: #fff7f6;
    font-size: 11px;
    line-height: 1.45;
  }

  .notice.pending {
    border-color: #d8e4dc;
    color: #365a47;
    background: #f6faf7;
  }

  .actions {
    display: grid;
    gap: 8px;
  }

  .actions button {
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
  }

  .actions .primary {
    color: #fff;
    background: var(--home-primary);
  }

  .actions .secondary {
    color: #4e5953;
    background: #edf1ee;
  }

  .actions button:disabled {
    cursor: wait;
    opacity: 0.6;
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
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [cardFailed, setCardFailed] = useState(false);
  const cardPreparerRef = useRef<CardPaymentPreparer | null>(null);

  const homePath = restaurantSlug ? `/${restaurantSlug}` : '/';

  const loadPayment = useCallback(
    async (background = false) => {
      if (!orderPublicId) return;
      if (!background) setError('');
      try {
        const base = (await ordersService.recoverPayment(orderPublicId)) as RecoveryPayload;
        if (base.paymentMethod === 'CARTAO') {
          let resolved = base;
          if (base.paid !== true) {
            try {
              const canonical = await ordersService.getCardPaymentStatus({
                orderPublicId,
                restaurantId: base.restaurantId,
                type: 'DELIVERY',
              });
              resolved = {
                ...base,
                paid: canonical?.paid === true,
                paymentAttempt: canonical?.paymentAttempt || base.paymentAttempt,
              };
            } catch {
              // Mantém a recuperação local caso a consulta ao provedor esteja temporariamente indisponível.
            }
          }
          setPayment(resolved);
          setCardFailed(
            ['DECLINED', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'].includes(
              String(resolved.paymentAttempt?.status || '').toUpperCase(),
            ),
          );
          return;
        }

        let recovered = (await ordersService.recoverPixPayment(orderPublicId)) as RecoveryPayload;
        if (recovered.isApproved === true && recovered.paid !== true) {
          recovered = (await ordersService.confirmRecoveredPixPayment(
            orderPublicId,
          )) as RecoveryPayload;
        }
        setPayment({ ...base, ...recovered, paymentMethod: 'PIX' });
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
    if (!payment) return undefined;
    const pixPending =
      payment.paymentMethod !== 'CARTAO' &&
      !['PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED'].includes(status);
    const cardPending = payment.paymentMethod === 'CARTAO' && !payment.paid && !cardFailed;
    if (!pixPending && !cardPending) return undefined;
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadPayment(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [cardFailed, loadPayment, payment, status]);

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

  if (payment.paymentMethod === 'CARTAO') {
    const retryCard = async () => {
      if (!orderPublicId || cardSubmitting) return;
      setError('');
      setCardSubmitting(true);
      try {
        const prepare = cardPreparerRef.current;
        if (!prepare) throw new Error('Aguarde a preparação segura do cartão.');
        const result = await ordersService.retryCardPayment(orderPublicId, {
          ...(await prepare()),
          successUrl: window.location.href,
        });
        if (result?.paid === true) {
          setPayment((current) => (current ? { ...current, paid: true } : current));
          setCardFailed(false);
        } else {
          setCardFailed(false);
          await loadPayment(true);
        }
      } catch (requestError: unknown) {
        const typed = requestError as { response?: { data?: { error?: string; code?: string } }; message?: string };
        setError(
          typed.response?.data?.error ||
            typed.message ||
            'Não foi possível processar este cartão. Tente outro cartão.',
        );
        setCardFailed(typed.response?.data?.code !== 'CARD_ATTEMPT_PROCESSING');
      } finally {
        setCardSubmitting(false);
      }
    };

    return (
      <CardRecovery $primary={primaryColor}>
        <section>
          <h1>{payment.paid ? 'Pagamento confirmado' : 'Continuar pagamento'}</h1>
          <p className="subtitle">
            {payment.paid
              ? 'Seu pedido já foi pago e pode seguir para o preparo.'
              : 'O pedido foi preservado e só entra no fluxo do restaurante depois da aprovação do cartão.'}
          </p>
          <div className="summary">
            <span>Pedido #{payment.orderId}</span>
            <strong>
              {Number(payment.totalAmount || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </strong>
          </div>

          {payment.paid ? (
            <div className="actions">
              <button className="primary" type="button" onClick={() => navigate(homePath)}>
                Voltar ao cardápio
              </button>
            </div>
          ) : (
            <>
              <div className={cardFailed ? 'notice' : 'notice pending'} role={cardFailed ? 'alert' : 'status'}>
                {cardFailed
                  ? error ||
                    payment.paymentAttempt?.failureMessage ||
                    'A última tentativa não foi aprovada. Você pode tentar novamente sem criar outro pedido.'
                  : 'Aguardando pagamento. Se a tentativa anterior já terminou, use outro cartão ou tente novamente.'}
              </div>
              <OnlineCardPaymentForm
                restaurantId={payment.restaurantId}
                onPreparerChange={(preparer) => {
                  cardPreparerRef.current = preparer;
                }}
              />
              <div className="actions">
                <button
                  className="primary"
                  type="button"
                  disabled={cardSubmitting || (!cardFailed && Boolean(payment.paymentAttempt))}
                  onClick={() => void retryCard()}
                >
                  {cardSubmitting ? 'Processando...' : 'Tentar pagamento novamente'}
                </button>
                <button className="secondary" type="button" onClick={() => navigate(homePath)}>
                  Voltar ao cardápio
                </button>
              </div>
            </>
          )}
        </section>
      </CardRecovery>
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
