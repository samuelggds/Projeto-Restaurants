import {
  Bell,
  Check,
  CookingPot,
  Eye,
  Clock3,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import type { HomeData, HomeProduct } from '../Home/types';
import type { CartItem } from '../Home/hooks/useCart';
import type { ProductConfiguration } from '../Home/domain/productCustomization';
import {
  createReadyProductConfiguration,
  resolveProductEntryKind,
} from '../Home/domain/productEntryFlow';
import {
  currentParticipantAccount,
  shouldReuseActiveTablePayment,
  tablePaymentMethodLabel,
  tablePaymentStatusLabel,
  type TableAccountSnapshot,
  type TablePaymentIntent,
} from '../Home/domain/tableAccount';
import type { TableOrderNotice } from '../Home/domain/tableOrderNotice';
import {
  captureCartFlyOrigin,
  scheduleProductToCartAnimation,
  type CartFlyOrigin,
} from '../Home/cartFlyAnimation';
import { TablePaymentStatusView } from '../Home/components/TablePaymentStatusView';
import { ReadyProductDetail } from '../Home/components/ReadyProductDetail';
import { QuantityStepper } from '../../components/QuantityStepper/QuantityStepper';
import { PixMark } from '../../components/payment/PixMark';
import { TableMenuHome } from './TableMenuHome';
import { FlowHeader } from './TableMenuFlow';
import {
  confirmationSteps,
  formatTableNumber,
  trackingHeadline,
  trackingSteps,
} from './TableMenuFlow.domain';
import { TablePaymentChoiceView } from './TableMenuPaymentViews';
import * as S from './TableMenuExperience.styles';

const ProductConfigurator = lazy(() =>
  import('../Home/components/ProductConfigurator').then((module) => ({
    default: module.ProductConfigurator,
  })),
);

const ComboConfigurator = lazy(() =>
  import('../Home/components/ComboConfigurator').then((module) => ({
    default: module.ComboConfigurator,
  })),
);

type SubmitResult = {
  id?: number | string;
  publicId?: string;
  total?: number;
};

type Props = {
  data: HomeData;
  tableLabel: string | number;
  cart: CartItem[];
  cartTotal: number;
  orderingLocked?: boolean;
  tableOrder: TableOrderNotice | null;
  accountSnapshot: TableAccountSnapshot | null;
  activePayment: TablePaymentIntent | null;
  paymentToOpen?: TablePaymentIntent | null;
  paymentLoading?: boolean;
  waiterCallEnabled?: boolean;
  onAddProduct: (productId: string, configuration: ProductConfiguration) => void;
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onClearCart: () => void;
  onSubmitOrder: () => Promise<SubmitResult | null | undefined>;
  onCallWaiter: () => void;
  onViewAccount: () => void;
  onCreateAccountPayment: (method: 'PIX' | 'CASH') => Promise<TablePaymentIntent | null>;
  onReconcilePayment: (paymentPublicId: string) => Promise<TablePaymentIntent | null>;
  onCancelPayment: (paymentPublicId: string) => Promise<boolean>;
  couponCode?: string | null;
  couponDiscount?: number;
  onApplyCouponCode?: (code: string) => void;
  reviewCartOpen?: boolean;
  onReviewCartClose?: () => void;
  userName?: string;
  userLoggedIn?: boolean;
};

type View = 'menu' | 'cart' | 'confirmation' | 'tracking' | 'payment' | 'pix';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const centsToBrl = (value: number) => brl(Number(value || 0) / 100);

function paymentCreatedTime(createdAt?: string | null) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const tableNumber = formatTableNumber;

export default function TableMenuExperience({
  data,
  tableLabel,
  cart,
  cartTotal,
  orderingLocked = false,
  tableOrder,
  accountSnapshot,
  activePayment,
  paymentToOpen = null,
  paymentLoading = false,
  waiterCallEnabled = true,
  onAddProduct,
  onIncrease,
  onDecrease,
  onClearCart,
  onSubmitOrder,
  onCallWaiter,
  onViewAccount,
  onCreateAccountPayment,
  onReconcilePayment,
  onCancelPayment,
  couponCode = null,
  couponDiscount = 0,
  onApplyCouponCode,
  reviewCartOpen = false,
  onReviewCartClose,
  userName,
  userLoggedIn = false,
}: Props) {
  const [view, setView] = useState<View>('menu');
  const effectiveView: View = reviewCartOpen ? 'cart' : view;
  const [selectedProduct, setSelectedProduct] = useState<HomeProduct | null>(null);
  const [configuringProduct, setConfiguringProduct] = useState<HomeProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    orderId: string;
    orderPublicId: string;
    items: CartItem[];
    total: number;
  } | null>(null);
  const [pixPayment, setPixPayment] = useState<TablePaymentIntent | null>(null);
  const [copied, setCopied] = useState(false);
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const pendingCartFlyOriginRef = useRef<CartFlyOrigin | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const primary = data.brand.primaryColor || '#d64d08';
  const paymentBase =
    activePayment?.publicId === pixPayment?.publicId ? activePayment : pixPayment;
  const paymentSnapshot = paymentBase
    ? accountSnapshot?.payments.find((payment) => payment.publicId === paymentBase.publicId)
    : null;
  const currentPayment = paymentBase
    ? { ...paymentBase, status: paymentSnapshot?.status || paymentBase.status }
    : null;
  const pixPending = Boolean(
    currentPayment && ['RESERVED', 'PROCESSING'].includes(currentPayment.status),
  );
  const pixRemainingSeconds =
    pixPending && currentPayment?.expiresAt
      ? Math.max(0, Math.ceil((new Date(currentPayment.expiresAt).getTime() - now) / 1000))
      : null;

  useEffect(() => {
    if (!paymentToOpen?.publicId) return undefined;
    const timeoutId = window.setTimeout(() => {
      setPixPayment(paymentToOpen);
      setView('pix');
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [paymentToOpen]);

  useEffect(() => {
    if (!pixPending || pixRemainingSeconds === null) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [pixPending, pixRemainingSeconds]);

  useEffect(() => {
    const onlinePending =
      pixPending &&
      currentPayment?.method === 'PIX' &&
      Boolean(currentPayment.publicId);
    if (!onlinePending || !currentPayment?.publicId) return undefined;

    const paymentPublicId = currentPayment.publicId;
    const interval = window.setInterval(() => {
      if (document.hidden || paymentLoading) return;
      void onReconcilePayment(paymentPublicId).then((payment) => {
        if (payment) setPixPayment(payment);
      });
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [
    currentPayment?.method,
    currentPayment?.publicId,
    onReconcilePayment,
    paymentLoading,
    pixPending,
  ]);

  function flyProduct(product: HomeProduct, origin?: CartFlyOrigin | null) {
    scheduleProductToCartAnimation({
      origin,
      imageUrl: product.image,
      accentColor: primary,
    });
  }

  function openProduct(product: HomeProduct, sourceElement?: HTMLElement | null) {
    if (orderingLocked) return;
    pendingCartFlyOriginRef.current = captureCartFlyOrigin(sourceElement);
    const entryKind = resolveProductEntryKind(product);

    if (entryKind === 'READY') {
      setSelectedProduct(product);
      return;
    }

    setConfiguringProduct(product);
  }

  function quickAdd(product: HomeProduct, sourceElement?: HTMLElement | null) {
    if (orderingLocked) return;
    pendingCartFlyOriginRef.current = captureCartFlyOrigin(sourceElement);
    const entryKind = resolveProductEntryKind(product);

    if (entryKind !== 'READY') {
      setConfiguringProduct(product);
      return;
    }

    onAddProduct(
      product.id,
      createReadyProductConfiguration(product.configurationVersion),
    );
    flyProduct(product, pendingCartFlyOriginRef.current);
    pendingCartFlyOriginRef.current = null;
  }

  function addComplete(
    product: HomeProduct,
    quantity: number,
    observation: string,
    sourceElement: HTMLElement | null,
  ) {
    const configuration = {
      selectedOptions: [],
      selectedOptionIds: [],
      observation,
      configurationVersion: product.configurationVersion,
    };
    const origin = captureCartFlyOrigin(sourceElement) || pendingCartFlyOriginRef.current;
    for (let index = 0; index < quantity; index += 1) {
      onAddProduct(product.id, configuration);
    }
    setSelectedProduct(null);
    flyProduct(product, origin);
    pendingCartFlyOriginRef.current = null;
  }

  async function submitOrder() {
    if (!cart.length || submitting) return;
    const snapshot = cart.map((item) => ({ ...item }));
    setSubmitting(true);
    try {
      const order = await onSubmitOrder();
      if (!order) return;
      const orderId = String(order.id || order.publicId || '');
      const orderPublicId = String(order.publicId || order.id || '');
      setConfirmation({ orderId, orderPublicId, items: snapshot, total: cartTotal });
      setView('confirmation');
    } finally {
      setSubmitting(false);
    }
  }

  async function startPayment(method: 'PIX' | 'CASH') {
    if (paymentLoading) return;
    const pendingPayment = accountSnapshot?.activePayment;
    if (shouldReuseActiveTablePayment(pendingPayment, method)) {
      setPixPayment(pendingPayment);
      setView('pix');
      return;
    }
    const payment = await onCreateAccountPayment(method);
    if (!payment) return;
    setPixPayment(payment);
    setView('pix');
  }

  async function copyPix() {
    const code = currentPayment?.paymentCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function goToMenu() {
    onReviewCartClose?.();
    setView('menu');
  }

  function clearReviewCart() {
    if (!cart.length) return;
    onClearCart();
    setCouponInput('');
  }

  if (
    effectiveView === 'pix' &&
    currentPayment?.method === 'CASH' &&
    ['RESERVED', 'PROCESSING'].includes(currentPayment.status)
  ) {
    const requestedAt = paymentCreatedTime(currentPayment.createdAt);

    return (
      <S.FigmaShell $primary="#ff4b4b" $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Pagamento em dinheiro"
          onBack={() => setView('payment')}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />
        <S.FlowPage className="cash-payment-page">
          <S.CashPendingLayout aria-live="polite">
            <S.CashPendingHero>
              <S.CashMoneyMark aria-label="Pagamento em dinheiro">
                <span>R$</span>
              </S.CashMoneyMark>

              <h1>Aguardando pagamento em dinheiro</h1>
              <p>
                Sua solicitação foi registrada para a equipe. Aguarde o atendimento na Mesa{' '}
                {tableNumber(tableLabel)}.
              </p>

              <S.CashRequestBadge>
                <span aria-hidden="true" />
                {requestedAt ? `Solicitação enviada · ${requestedAt}` : 'Solicitação enviada'}
              </S.CashRequestBadge>
            </S.CashPendingHero>

            <S.CashAmountCard>
              <span>
                <small>Valor reservado</small>
                <b>Pagamento presencial</b>
              </span>
              <strong>{centsToBrl(currentPayment.totalCents)}</strong>
            </S.CashAmountCard>

            <S.CashStatusCard>
              <h2>Status do pagamento</h2>
              <ol>
                <li className="completed">
                  <span className="status-dot"><Check size={15} /></span>
                  <span>
                    <b>Solicitação recebida</b>
                    <small>A equipe do restaurante foi avisada</small>
                  </span>
                </li>
                <li className="current">
                  <span className="status-dot"><i /></span>
                  <span>
                    <b>Aguardando o dinheiro</b>
                    <small>Entregue o valor a um funcionário</small>
                  </span>
                </li>
                <li className="pending">
                  <span className="status-dot"><i /></span>
                  <span>
                    <b>Confirmação do pagamento</b>
                    <small>Liberada após o funcionário receber o dinheiro</small>
                  </span>
                </li>
              </ol>
            </S.CashStatusCard>

            <S.CashConfirmationNotice>
              <Clock3 size={19} aria-hidden="true" />
              <span>O pagamento só será confirmado após o funcionário receber o dinheiro.</span>
            </S.CashConfirmationNotice>

            <S.CashActions>
              <S.PrimaryAction type="button" onClick={onViewAccount}>
                <ReceiptText size={18} aria-hidden="true" /> Acompanhar conta
              </S.PrimaryAction>
              {waiterCallEnabled ? (
                <S.SecondaryAction type="button" onClick={onCallWaiter}>
                  <Bell size={18} aria-hidden="true" /> Chamar o garçom
                </S.SecondaryAction>
              ) : null}
            </S.CashActions>
          </S.CashPendingLayout>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'pix' && currentPayment) {
    if (currentPayment.status === 'PAID') {
      const paymentMethodLabel = tablePaymentMethodLabel(currentPayment.method);
      const paymentStatusLabel = tablePaymentStatusLabel(currentPayment.status);
      const paymentDescription =
        currentPayment.method === 'PIX'
          ? 'Recebemos seu pagamento via PIX com sucesso.'
          : currentPayment.method === 'CASH'
            ? 'O pagamento em dinheiro foi confirmado com sucesso.'
            : `Recebemos seu pagamento por ${paymentMethodLabel} com sucesso.`;

      return (
        <S.FigmaShell $primary="#ff4b4b" $fontFamily={data.fontFamily}>
          <FlowHeader
            data={data}
            tableLabel={tableLabel}
            title="Conta Confirmada"
            onBack={() => setView('tracking')}
            onHome={goToMenu}
            onMenu={goToMenu}
            onOrders={() => setView('tracking')}
          />
          <S.FlowPage>
            <S.PaymentSuccessLayout>
              <S.PaymentSuccessMain>
                <div className="ring">
                  <div className="check">
                    <Check size={28} />
                  </div>
                </div>
                <h1>Pagamento Confirmado!</h1>
                <p>{paymentDescription}</p>
                <S.PaidReceipt>
                  <div className="receipt-head">
                    {confirmation?.orderId ? <small>Pedido #{confirmation.orderId}</small> : <small>Pedido</small>}
                    <span className="status">{paymentStatusLabel.toUpperCase()}</span>
                  </div>
                  <strong>{centsToBrl(currentPayment.totalCents)}</strong>
                  <div className="receipt-divider" />
                  <div className="receipt-row">
                    <small>Forma de Pagamento</small>
                    <b>{paymentMethodLabel}</b>
                  </div>
                  <div className="receipt-row">
                    <small>Status</small>
                    <b className="confirmed">{paymentStatusLabel}</b>
                  </div>
                </S.PaidReceipt>
                <div className="prep-banner">
                  <CookingPot size={18} />
                  <span>
                    <b>Pedido continua em preparo</b>
                    <small>Acompanhe o andamento na tela seguinte.</small>
                  </span>
                </div>
                <S.PrimaryAction type="button" onClick={() => setView('tracking')}>
                  <Eye size={16} /> Acompanhar preparo
                </S.PrimaryAction>
                <S.SecondaryAction type="button" onClick={goToMenu}>
                  Voltar ao cardápio
                </S.SecondaryAction>
              </S.PaymentSuccessMain>
            </S.PaymentSuccessLayout>
          </S.FlowPage>
        </S.FigmaShell>
      );
    }

    if (currentPayment.method === 'CARD') {
      return (
        <S.FigmaShell $primary="#ff4b4b" $fontFamily={data.fontFamily}>
          <FlowHeader
            data={data}
            tableLabel={tableLabel}
            title="Pagamento com cartão"
            onBack={() => setView('payment')}
            onHome={goToMenu}
            onMenu={goToMenu}
            onOrders={() => setView('tracking')}
          />
          <S.FlowPage>
            <TablePaymentStatusView
              payment={currentPayment}
              status={currentPayment.status}
              actionLoading={paymentLoading}
              restaurantCategory={data.brand.category}
              onVerify={() => onReconcilePayment(currentPayment.publicId)}
              onCancel={() => onCancelPayment(currentPayment.publicId)}
              onStartOver={() => setView('payment')}
              onClose={() => setView('tracking')}
            />
          </S.FlowPage>
        </S.FigmaShell>
      );
    }

    if (!pixPending) {
      return (
        <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
          <FlowHeader
            data={data}
            tableLabel={tableLabel}
            title="Pagamento"
            onBack={() => setView('payment')}
            onHome={goToMenu}
            onMenu={goToMenu}
            onOrders={() => setView('tracking')}
          />
          <S.FlowPage>
            <TablePaymentStatusView
              payment={currentPayment}
              status={currentPayment.status}
              actionLoading={paymentLoading}
              restaurantCategory={data.brand.category}
              onVerify={() => onReconcilePayment(currentPayment.publicId)}
              onCancel={() => onCancelPayment(currentPayment.publicId)}
              onStartOver={() => setView('payment')}
              onClose={() => setView('tracking')}
            />
          </S.FlowPage>
        </S.FigmaShell>
      );
    }

    return (
      <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Pagamento PIX"
          onBack={() => setView('payment')}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />
        <S.FlowPage>
          <S.PixLayout>
            <S.PixQrCard>
              <span className="pix-label">
                <span className="desktop-only">PAGAMENTO PIX</span>
                <span className="mobile-only">VALOR TOTAL</span>
              </span>
              <span className="amount">{centsToBrl(currentPayment.totalCents)}</span>
              <span className="order">
                {confirmation?.orderId ? `Pedido #${confirmation.orderId} · ` : ''}
                Mesa {tableNumber(tableLabel)}
              </span>

              {currentPayment.paymentCode ? (
                <>
                  <div className="qr" aria-label="QR Code PIX">
                    <QRCode value={currentPayment.paymentCode} size={160} level="M" />
                  </div>
                  <p className="instructions">
                    <span className="desktop-only">
                      Aponte a câmera do seu banco para o QR code ou copie a chave PIX abaixo.
                    </span>
                    <span className="mobile-only">
                      Aponte a câmera do seu banco para o QR code ou copie a chave abaixo.
                    </span>
                  </p>
                  <S.PixCopyBox>
                    <code>{currentPayment.paymentCode}</code>
                    <button type="button" onClick={() => void copyPix()}>
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </S.PixCopyBox>
                </>
              ) : null}

              <S.PixStatusCard>
                <div>
                  <h2>Aguardando Pagamento</h2>
                  <p>A confirmação do PIX é imediata e automática.</p>
                </div>
                {pixRemainingSeconds !== null ? (
                  <span className="timer">
                    {String(Math.floor(pixRemainingSeconds / 60)).padStart(2, '0')}:
                    {String(pixRemainingSeconds % 60).padStart(2, '0')}
                  </span>
                ) : null}
              </S.PixStatusCard>

              <S.PrimaryAction
                type="button"
                disabled={paymentLoading}
                onClick={() => void onReconcilePayment(currentPayment.publicId)}
              >
                Já paguei · Verificar status
              </S.PrimaryAction>
            </S.PixQrCard>
          </S.PixLayout>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'payment' && accountSnapshot) {
    return (
      <TablePaymentChoiceView
        data={data}
        tableLabel={tableLabel}
        accountSnapshot={accountSnapshot}
        paymentLoading={paymentLoading}
        onStartPayment={(method) => void startPayment(method)}
        onBack={() => setView('tracking')}
        onHome={goToMenu}
        onOrders={() => setView('tracking')}
      />
    );
  }

  if (effectiveView === 'tracking') {
    const ownAccount = currentParticipantAccount(accountSnapshot);
    const activeTablePayment = accountSnapshot?.activePayment || null;
    const activePaymentPending = Boolean(
      activeTablePayment && ['RESERVED', 'PROCESSING'].includes(activeTablePayment.status),
    );
    const activePixPending = Boolean(activePaymentPending && activeTablePayment?.method === 'PIX');
    const pixBlockedByOtherPayment = Boolean(
      activePaymentPending && activeTablePayment?.method !== 'PIX',
    );
    const canPayOwnAccount = Boolean(ownAccount && ownAccount.remainingCents > 0);
    const allowPix = accountSnapshot?.capabilities.allowPix === true;
    const pixUnavailable = !allowPix || pixBlockedByOtherPayment;
    const pixButtonLabel = !allowPix
      ? 'PIX indisponível'
      : pixBlockedByOtherPayment
        ? 'PIX indisponível no momento'
        : 'Pagar agora com PIX';
    const preparationMinutes = Number.parseInt(String(data.deliveryTime || ''), 10);
    const confirmedAt = tableOrder?.createdAt
      ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
          new Date(tableOrder.createdAt),
        )
      : '';
    const trackingDescriptions = trackingSteps(tableOrder, confirmedAt);

    return (
      <S.FigmaShell $primary="#ff4b4b" $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Painel da Mesa"
          onBack={goToMenu}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />

        <S.FlowPage>
          <S.TrackingLayout>
            <div className="tracking-main">
              <S.FlowTitle className="tracking-title">
                <h1>Painel da Mesa</h1>
                <p>Veja o andamento de seus pratos e bebidas em tempo real</p>
              </S.FlowTitle>
              <S.StatusCard>
                <span className="icon"><Clock3 size={28} /></span>
                <div>
                  <h2>{trackingHeadline(tableOrder)}</h2>
                  <p>
                    {Number.isFinite(preparationMinutes) && preparationMinutes > 0
                      ? `A cozinha estimou cerca de ${preparationMinutes} minutos para servir.`
                      : 'O status será atualizado em tempo real pela cozinha.'}
                  </p>
                </div>
              </S.StatusCard>

              <S.SectionHeading>
                <div className="title"><h2>Status de Produção</h2></div>
              </S.SectionHeading>
              <S.TimelineCard className="tracking-timeline">
                <S.Timeline>
                  {trackingDescriptions.map((step, index) => {
                    const stateClass = step.current
                      ? 'tracking-step current'
                      : step.active
                        ? 'tracking-step completed'
                        : 'tracking-step pending';

                    return (
                      <S.TimelineStep
                        key={step.label}
                        className={stateClass}
                        $active={step.active}
                        $current={step.current}
                      >
                        <span className="dot">
                          {step.active ? (
                            index === 1 && step.current ? (
                              <CookingPot size={13} />
                            ) : (
                              <Check size={14} />
                            )
                          ) : null}
                        </span>
                        <div className="copy">
                          <b>{step.label}</b>
                          {step.description ? <p>{step.description}</p> : null}
                        </div>
                      </S.TimelineStep>
                    );
                  })}
                </S.Timeline>
              </S.TimelineCard>
            </div>

            <S.OrderItemsCard>
              <h2>
                <span className="desktop-only">Itens do Pedido</span>
                <span className="mobile-only">Itens em Produção</span>
              </h2>
              {tableOrder?.items.length ? (
                tableOrder.items.map((item, index) => (
                  <S.OrderItemLine key={`${item.name}-${index}`}>
                    <div className="copy">
                      <b>{item.quantity}x</b>
                      <span>
                        <b>{item.name}</b>
                        {item.observation ? <small>{item.observation}</small> : null}
                      </span>
                    </div>
                    {typeof item.unitPrice === 'number' ? (
                      <strong>{brl(item.unitPrice * item.quantity)}</strong>
                    ) : null}
                  </S.OrderItemLine>
                ))
              ) : (
                <S.EmptyCatalog>Os itens aparecerão aqui assim que houver um pedido ativo.</S.EmptyCatalog>
              )}

              {accountSnapshot ? (
                <div className="account-total">
                  <span>Consumo total</span>
                  <strong>{centsToBrl(accountSnapshot.summary.consumedCents)}</strong>
                </div>
              ) : null}

              {waiterCallEnabled ? (
                <S.SecondaryAction type="button" onClick={onCallWaiter}>
                  <Bell size={17} /> Chamar garçom para mesa
                </S.SecondaryAction>
              ) : null}

              {canPayOwnAccount ? (
                <>
                  <S.TrackingPixAction
                    type="button"
                    disabled={paymentLoading || pixUnavailable}
                    aria-label={pixButtonLabel}
                    title={
                      !allowPix
                        ? 'O PIX será liberado quando o administrador configurar um provedor no restaurante.'
                        : pixBlockedByOtherPayment
                          ? 'Há outro pagamento em andamento para este consumo.'
                          : undefined
                    }
                    onClick={() => {
                      if (activePixPending && activeTablePayment) {
                        setPixPayment(activeTablePayment);
                        setView('pix');
                        return;
                      }
                      void startPayment('PIX');
                    }}
                  >
                    <PixMark /> {pixButtonLabel}
                  </S.TrackingPixAction>

                  <S.TrackingOtherPaymentAction
                    type="button"
                    disabled={paymentLoading}
                    onClick={() => setView('payment')}
                  >
                    <WalletCards size={18} aria-hidden="true" />
                    Outras formas de pagamento
                  </S.TrackingOtherPaymentAction>
                </>
              ) : null}
            </S.OrderItemsCard>
          </S.TrackingLayout>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'confirmation' && confirmation) {
    return (
      <S.FigmaShell $primary="#ff4b4b" $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Pedido Enviado"
          onBack={goToMenu}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />
        <S.FlowPage>
          <S.ConfirmationCard>
            <S.SuccessHero>
            <div className="ring">
              <div className="check"><Check size={27} /></div>
            </div>
            <h1>Pedido Enviado!</h1>
            <p>A cozinha do restaurante recebeu seu pedido com sucesso da Mesa {tableNumber(tableLabel)}.</p>
          </S.SuccessHero>

          <S.OrderSummaryBar>
            <div className="label">
              {confirmation.orderId ? <small>Pedido #{confirmation.orderId}</small> : null}
              <strong>
                {confirmation.items.length} {confirmation.items.length === 1 ? 'item' : 'itens'}
              </strong>
            </div>
            <span className="amount">{brl(confirmation.total)}</span>
          </S.OrderSummaryBar>

          <S.TimelineCard className="confirmation-timeline">
            <S.Timeline>
              {confirmationSteps(tableOrder).map((step, index) => (
                <S.TimelineStep
                  key={step.label}
                  className={
                    step.completed
                      ? 'confirmation-step completed'
                      : step.current
                        ? 'confirmation-step current'
                        : 'confirmation-step pending'
                  }
                  $active={step.active}
                  $current={step.current}
                >
                  <span className="dot">
                    {step.completed ? <Check size={12} /> : step.current ? <span className="pulse" /> : index + 1}
                  </span>
                  <div className="copy">
                    <b>{step.label}</b>
                    {step.completed ? <small className="completed-label">Concluído</small> : null}
                    {step.current ? <small className="current-label">Iniciado agora</small> : null}
                  </div>
                </S.TimelineStep>
              ))}
            </S.Timeline>
          </S.TimelineCard>

          <S.ConfirmationActions>
            {confirmation.total > 0 ? (
              <>
                <S.SecondaryAction
                  className="pix-action"
                  type="button"
                  disabled={paymentLoading}
                  onClick={() => void startPayment('PIX')}
                >
                  <PixMark />
                  Pagar agora no PIX
                </S.SecondaryAction>

                <S.TrackingOtherPaymentAction
                  type="button"
                  disabled={paymentLoading}
                  onClick={() => setView('payment')}
                >
                  <WalletCards size={18} aria-hidden="true" />
                  Outras formas de pagamento
                </S.TrackingOtherPaymentAction>
              </>
            ) : null}
            <S.SecondaryAction type="button" onClick={goToMenu}>
              Continuar pedindo
            </S.SecondaryAction>
            <S.HelperText>A conta continuará aberta na mesa enquanto você faz novos pedidos.</S.HelperText>
          </S.ConfirmationActions>
          </S.ConfirmationCard>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'cart') {
    const serviceFeeCents =
      accountSnapshot?.capabilities.serviceFeeMode === 'MANDATORY'
        ? Math.round(
            cartTotal *
              100 *
              (accountSnapshot.capabilities.serviceFeeBasisPoints / 10_000),
          )
        : 0;
    const serviceFee = serviceFeeCents / 100;
    const totalWithFee = Math.max(0, cartTotal - couponDiscount + serviceFee);

    return (
      <S.FigmaShell $primary="#ff4b4b" $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Meu Pedido"
          onBack={goToMenu}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />

        <S.FlowPage>
          <S.FlowTitle className="cart-title">
            <div className="cart-title-row">
              <h1 aria-label="Minha sacola">Revisar Pedido</h1>
              {cart.length ? (
                <button
                  className="clear-cart-inline"
                  type="button"
                  aria-label="Limpar carrinho"
                  onClick={clearReviewCart}
                >
                  Limpar
                </button>
              ) : null}
            </div>
            <p>Confirme os itens selecionados antes do preparo</p>
          </S.FlowTitle>

          <S.CartDesktopLayout>
            <div>
              <S.CartLines>
                {cart.length ? (
                  cart.map((item) => (
                    <S.CartLine key={item.cartId || item.productId} $hasImage={Boolean(item.image)}>
                      {item.image ? (
                        <span className="image">
                          <img src={item.image} alt={item.name} />
                        </span>
                      ) : null}
                      <div className="info">
                        <b>{item.name}</b>
                        {item.options?.length ? (
                          <small>{item.options.map((option) => option.name).join(' · ')}</small>
                        ) : item.observation ? (
                          <small>{item.observation}</small>
                        ) : null}
                        <strong className="price">{brl(item.price * item.quantity)}</strong>
                      </div>
                      <div className="side">
                        <S.QuantityControl>
                          <QuantityStepper
                            value={item.quantity}
                            ariaLabel={`Quantidade de ${item.name}`}
                            decreaseLabel={`Diminuir ${item.name}`}
                            increaseLabel={`Aumentar ${item.name}`}
                            onDecrease={() => item.cartId && onDecrease(item.cartId)}
                            onIncrease={() => item.cartId && onIncrease(item.cartId)}
                          />
                        </S.QuantityControl>
                      </div>
                    </S.CartLine>
                  ))
                ) : (
                  <S.EmptyCatalog>Seu pedido ainda está vazio.</S.EmptyCatalog>
                )}
              </S.CartLines>

              <S.AddMoreButton type="button" onClick={goToMenu}>
                + Adicionar mais itens ao pedido
              </S.AddMoreButton>
            </div>

            <div className="cart-summary-column">
              <h2 className="desktop-only">Resumo</h2>
              <S.CartSummaryPanel>
                <S.CouponRow>
                  <input
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="Cupom promocional"
                    aria-label="Cupom promocional"
                  />
                  <button
                    type="button"
                    disabled={!couponInput.trim() || !onApplyCouponCode}
                    onClick={() => onApplyCouponCode?.(couponInput.trim())}
                  >
                    Aplicar
                  </button>
                </S.CouponRow>

                <S.SummaryCard>
                  <div className="row"><span>Subtotal</span><strong>{brl(cartTotal)}</strong></div>
                  {couponDiscount > 0 ? (
                    <div className="row discount">
                      <span>{couponCode ? `Cupom · ${couponCode}` : 'Cupom promocional'}</span>
                      <strong>− {brl(couponDiscount)}</strong>
                    </div>
                  ) : null}
                  <div className="row">
                    <span>
                      <span className="desktop-only">Taxa de Serviço (Opcional)</span>
                      <span className="mobile-only">Serviço (Opcional)</span>
                    </span>
                    <strong>{brl(serviceFee)}</strong>
                  </div>
                  <div className="divider" />
                  <div className="row total"><span>Total</span><strong>{brl(totalWithFee)}</strong></div>
                </S.SummaryCard>

                <div className="submit-block">
                  <S.CartSubmitAction
                    type="button"
                    disabled={!cart.length || submitting || orderingLocked}
                    onClick={() => void submitOrder()}
                  >
                    <span className="action-copy">
                      <b>{submitting ? 'Enviando pedido...' : 'Enviar pedido para a cozinha'}</b>
                      {!submitting ? <small>Seu pedido iniciará o preparo imediatamente</small> : null}
                    </span>
                  </S.CartSubmitAction>
                  <S.CartHelperText>
                    Depois você escolhe pagar agora pelo celular ou no fim.
                  </S.CartHelperText>
                </div>
              </S.CartSummaryPanel>
            </div>
          </S.CartDesktopLayout>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  const tableCartCount = cart.reduce(
    (total, item) => total + Math.max(1, Number(item.quantity || 1)),
    0,
  );

  return (
    <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
      <TableMenuHome
        data={data}
        tableLabel={tableLabel}
        cartCount={tableCartCount}
        orderingLocked={orderingLocked}
        waiterCallEnabled={waiterCallEnabled}
        userName={userName}
        userLoggedIn={userLoggedIn}
        onOpenProduct={openProduct}
        onQuickAdd={quickAdd}
        onOpenCart={() => setView('cart')}
        onCallWaiter={onCallWaiter}
        onViewAccount={onViewAccount}
        onTrackOrder={() => setView('tracking')}
      />

      {selectedProduct ? (
        <ReadyProductDetail
          product={selectedProduct}
          restaurantName={data.brand.name}
          restaurantCategory={data.brand.category}
          categoryName={data.categories.find((category) => category.id === selectedProduct.categoryId)?.name}
          preparationTime={selectedProduct.preparationTime}
          cartCount={tableCartCount}
          onBack={() => {
            setSelectedProduct(null);
            pendingCartFlyOriginRef.current = null;
          }}
          onOpenCart={() => {
            setSelectedProduct(null);
            pendingCartFlyOriginRef.current = null;
            setView('cart');
          }}
          onConfirm={({ quantity, observation, sourceElement }) =>
            addComplete(selectedProduct, quantity, observation, sourceElement)
          }
        />
      ) : null}

      {configuringProduct ? (
        <Suspense fallback={null}>
          {configuringProduct.kind === 'COMBO' ? (
            <ComboConfigurator
              product={configuringProduct}
              primaryColor={primary}
              onClose={() => {
                setConfiguringProduct(null);
                pendingCartFlyOriginRef.current = null;
              }}
              onConfirm={(configuration) => {
                const product = configuringProduct;
                const origin =
                  captureCartFlyOrigin(
                    document.querySelector<HTMLElement>('[data-cart-fly-source="dialog"]'),
                  ) || pendingCartFlyOriginRef.current;
                onAddProduct(product.id, configuration);
                setConfiguringProduct(null);
                flyProduct(product, origin);
                pendingCartFlyOriginRef.current = null;
              }}
            />
          ) : (
            <ProductConfigurator
              product={configuringProduct}
              primaryColor={primary}
              onClose={() => {
                setConfiguringProduct(null);
                pendingCartFlyOriginRef.current = null;
              }}
              enableProductQuantity
              tableMenuVariant
              onConfirm={(configuration, quantity = 1) => {
                const product = configuringProduct;
                const origin =
                  captureCartFlyOrigin(
                    document.querySelector<HTMLElement>('[data-cart-fly-source="dialog"]'),
                  ) || pendingCartFlyOriginRef.current;
                for (let index = 0; index < quantity; index += 1) {
                  onAddProduct(product.id, configuration);
                }
                setConfiguringProduct(null);
                flyProduct(product, origin);
                pendingCartFlyOriginRef.current = null;
              }}
            />
          )}
        </Suspense>
      ) : null}
    </S.FigmaShell>
  );
}
