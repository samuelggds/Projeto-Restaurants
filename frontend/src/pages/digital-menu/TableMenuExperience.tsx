import {
  ArrowLeft,
  Check,
  CookingPot,
  Eye,
  Clock3,
  QrCode,
  Table2,
  Utensils,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import type { HomeData, HomeProduct } from '../Home/types';
import type { CartItem } from '../Home/hooks/useCart';
import type { ProductConfiguration } from '../Home/domain/productCustomization';
import {
  currentParticipantAccount,
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
import { QuantityStepper } from '../../components/QuantityStepper/QuantityStepper';
import { TableMenuHome } from './TableMenuHome';
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

function tableNumber(label: string | number) {
  const numeric = Number(label);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : String(label);
}

export default function TableMenuExperience({
  data,
  tableLabel,
  cart,
  cartTotal,
  orderingLocked = false,
  tableOrder,
  accountSnapshot,
  activePayment,
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
  const [completeProductQuantity, setCompleteProductQuantity] = useState(1);
  const [completeProductObservation, setCompleteProductObservation] = useState('');
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
    if (!pixPending || pixRemainingSeconds === null) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [pixPending, pixRemainingSeconds]);

  useEffect(() => {
    if (!pixPending || currentPayment?.method !== 'PIX' || !currentPayment.publicId) return undefined;
    const paymentPublicId = currentPayment.publicId;
    const interval = window.setInterval(() => {
      if (document.hidden || paymentLoading) return;
      void onReconcilePayment(paymentPublicId).then((payment) => {
        if (payment) setPixPayment(payment);
      });
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [currentPayment?.publicId, onReconcilePayment, paymentLoading, pixPending]);

  function emptyConfiguration(product: HomeProduct): ProductConfiguration {
    return {
      selectedOptions: [],
      selectedOptionIds: [],
      observation: '',
      configurationVersion: product.configurationVersion,
    };
  }

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
    if (product.kind === 'COMBO') {
      if (product.comboGroups?.length) {
        setConfiguringProduct(product);
        return;
      }
      setCompleteProductQuantity(1);
      setCompleteProductObservation('');
      setSelectedProduct(product);
      return;
    }
    if (product.saleMode === 'BUILDABLE') {
      setConfiguringProduct(product);
      return;
    }
    setCompleteProductQuantity(1);
    setCompleteProductObservation('');
    setSelectedProduct(product);
  }

  function quickAdd(product: HomeProduct, sourceElement?: HTMLElement | null) {
    if (orderingLocked) return;
    pendingCartFlyOriginRef.current = captureCartFlyOrigin(sourceElement);
    if (product.kind === 'COMBO' && product.comboGroups?.length) {
      setConfiguringProduct(product);
      return;
    }
    if (product.saleMode === 'BUILDABLE') {
      setConfiguringProduct(product);
      return;
    }
    onAddProduct(product.id, emptyConfiguration(product));
    flyProduct(product, pendingCartFlyOriginRef.current);
    pendingCartFlyOriginRef.current = null;
  }

  function addComplete(product: HomeProduct) {
    const configuration = {
      selectedOptions: [],
      selectedOptionIds: [],
      observation: completeProductObservation.trim(),
      configurationVersion: product.configurationVersion,
    };
    const origin =
      captureCartFlyOrigin(
        document.querySelector<HTMLElement>('[data-cart-fly-source="dialog"]'),
      ) || pendingCartFlyOriginRef.current;
    for (let index = 0; index < completeProductQuantity; index += 1) {
      onAddProduct(product.id, configuration);
    }
    setSelectedProduct(null);
    flyProduct(product, origin);
    pendingCartFlyOriginRef.current = null;
    setCompleteProductQuantity(1);
    setCompleteProductObservation('');
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
    if (
      pendingPayment?.method === method &&
      ['RESERVED', 'PROCESSING'].includes(pendingPayment.status)
    ) {
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
    return (
      <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Pagamento em Dinheiro"
          onBack={() => setView('payment')}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />
        <S.FlowPage>
          <S.PaymentCard>
            <S.FlowTitle>
              <h1>Pagamento em dinheiro solicitado</h1>
              <p>Entregue o valor ao garçom ou atendente. O pagamento só será marcado como pago depois da confirmação do administrador.</p>
            </S.FlowTitle>
            <S.PaymentSummary>
              <div className="label">
                <small>Valor da sua conta</small>
                <strong>Aguardando confirmação</strong>
              </div>
              <span className="amount">{centsToBrl(currentPayment.totalCents)}</span>
            </S.PaymentSummary>
            <S.PrimaryAction type="button" onClick={() => setView('tracking')}>
              Acompanhar pedido
            </S.PrimaryAction>
            <S.SecondaryAction type="button" onClick={goToMenu}>
              Voltar ao cardápio
            </S.SecondaryAction>
          </S.PaymentCard>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'pix' && currentPayment) {
    if (currentPayment.status === 'PAID') {
      return (
        <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
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
                <p>Recebemos seu pagamento com sucesso.</p>
                <S.PaidReceipt>
                  <div className="receipt-head">
                    {confirmation?.orderId ? <small>Pedido #{confirmation.orderId}</small> : <small>Pedido</small>}
                    <span className="status">PAGO</span>
                  </div>
                  <strong>{centsToBrl(currentPayment.totalCents)}</strong>
                  <div className="receipt-divider" />
                  <div className="receipt-row">
                    <small>Forma de Pagamento</small>
                    <b>{currentPayment.method === 'CASH' ? 'Dinheiro' : 'PIX'}</b>
                  </div>
                  <div className="receipt-row">
                    <small>Status</small>
                    <b className="confirmed">Confirmado agora</b>
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

  if (effectiveView === 'payment' && confirmation) {
    const allowPix = accountSnapshot?.capabilities.allowPix === true;
    const allowCash = accountSnapshot?.capabilities.allowCash === true;
    const ownAccount = currentParticipantAccount(accountSnapshot);
    const ownRemainingCents = ownAccount?.remainingCents || 0;
    return (
      <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Finalizar Conta"
          onBack={() => setView('confirmation')}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />
        <S.FlowPage>
          <S.PaymentCard>
            <S.FlowTitle>
              <h1>Como prefere pagar?</h1>
              <p>
                <span className="desktop-only">
                  Finalize agora pelo celular ou deixe para pagar depois com a equipe.
                </span>
                <span className="mobile-only">
                  Finalize agora pelo celular ou deixe para pagar depois.
                </span>
              </p>
            </S.FlowTitle>

            <S.PaymentOptionsGrid>
            {allowPix ? (
              <S.PaymentChoiceCard>
                <span className="icon"><QrCode size={20} /></span>
                <span className="recommended desktop-only">RECOMENDADO</span>
                <span className="pix-badge mobile-only">PIX</span>
                <h2>Pagar agora (PIX)</h2>
                <p>Finalize pelo celular com liberação automática na hora. Rápido e prático.</p>
                <button
                  className="primary"
                  type="button"
                  disabled={paymentLoading}
                  onClick={() => void startPayment('PIX')}
                >
                  Escolher PIX
                </button>
              </S.PaymentChoiceCard>
            ) : null}

            {allowCash ? (
              <S.PaymentChoiceCard>
                <span className="icon"><Clock3 size={20} /></span>
                <h2>Pagar em dinheiro</h2>
                <p>Entregue o valor ao garçom ou atendente. O administrador confirma o pagamento no sistema.</p>
                <button
                  className="secondary"
                  type="button"
                  disabled={paymentLoading}
                  onClick={() => void startPayment('CASH')}
                >
                  Escolher dinheiro
                </button>
              </S.PaymentChoiceCard>
            ) : null}

            <S.PaymentChoiceCard>
              <span className="icon"><Clock3 size={20} /></span>
              <h2>Deixar na conta</h2>
              <p>
                Os itens permanecem vinculados à Mesa {tableNumber(tableLabel)}. Pague ao sair com o garçom.
              </p>
              <small>Continue pedindo normalmente.</small>
              <button className="secondary" type="button" onClick={() => setView('tracking')}>
                Deixar aberto na Mesa
              </button>
            </S.PaymentChoiceCard>
          </S.PaymentOptionsGrid>

            <S.PaymentSummary>
              <div className="label">
                <small>
                  <span className="desktop-only">Valor restante da sua conta:</span>
                  <span className="mobile-only">Sua conta:</span>
                </small>
                <strong>Somente seu consumo</strong>
              </div>
              <span className="amount">{centsToBrl(ownRemainingCents)}</span>
            </S.PaymentSummary>
          </S.PaymentCard>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'tracking') {
    const ownAccount = currentParticipantAccount(accountSnapshot);
    const ownPaymentPending = Boolean(
      accountSnapshot?.activePayment &&
        ['RESERVED', 'PROCESSING'].includes(accountSnapshot.activePayment.status),
    );
    const canPayOwnAccount = Boolean(ownAccount && ownAccount.remainingCents > 0);

    const openOwnPayment = () => {
      if (accountSnapshot?.activePayment) {
        setPixPayment(accountSnapshot.activePayment);
        setView('pix');
        return;
      }
      if (confirmation) {
        setView('payment');
        return;
      }
      onViewAccount();
    };

    return (
      <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
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
                  <h2>{tableOrder?.statusLabel || 'Preparando seu pedido'}</h2>
                  <p>{tableOrder?.summary || 'O status será atualizado em tempo real.'}</p>
                </div>
              </S.StatusCard>

              <S.SectionHeading>
                <div className="title"><h2>Status de Produção</h2></div>
              </S.SectionHeading>
              <S.TimelineCard className="tracking-timeline">
                <S.Timeline>
                  {trackingSteps(tableOrder).map((step, index) => (
                    <S.TimelineStep key={step.label} $active={step.active} $current={step.current}>
                      <span className="dot">{step.active ? <Check size={14} /> : index + 1}</span>
                      <div className="copy">
                        <b>{step.label}</b>
                        {step.description ? <p>{step.description}</p> : null}
                      </div>
                    </S.TimelineStep>
                  ))}
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

              {canPayOwnAccount ? (
                <S.SecondaryAction type="button" onClick={openOwnPayment}>
                  {ownPaymentPending ? 'Ver pagamento' : 'Pagar minha conta'}
                </S.SecondaryAction>
              ) : null}

              {waiterCallEnabled ? (
                <S.PrimaryAction type="button" onClick={onCallWaiter}>
                  <Bell size={17} /> Chamar garçom para mesa
                </S.PrimaryAction>
              ) : null}
            </S.OrderItemsCard>
          </S.TrackingLayout>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'confirmation' && confirmation) {
    return (
      <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
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
                <S.TimelineStep key={step.label} $active={step.active} $current={step.current}>
                  <span className="dot">{step.active ? <Check size={14} /> : index + 1}</span>
                  <div className="copy">
                    <b>{step.label}</b>
                  </div>
                </S.TimelineStep>
              ))}
            </S.Timeline>
          </S.TimelineCard>

          <S.ConfirmationActions>
            <S.PrimaryAction type="button" onClick={() => setView('tracking')}>
              Acompanhar em tempo real
            </S.PrimaryAction>
            {currentParticipantAccount(accountSnapshot)?.remainingCents ? (
              <S.SecondaryAction type="button" onClick={() => setView('payment')}>
                Pagar minha conta
              </S.SecondaryAction>
            ) : null}
            <S.HelperText>Deseja continuar pedindo? A conta ficará aberta na mesa.</S.HelperText>
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
      />

      {selectedProduct ? (
        <S.ProductOverlay role="dialog" aria-modal="true" aria-label={selectedProduct.name}>
          <S.CompleteProductDetail data-cart-fly-source="dialog">
            <div className="media">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name} />
              ) : (
                <S.CompleteProductPlaceholder aria-hidden="true">
                  <Utensils />
                </S.CompleteProductPlaceholder>
              )}
              <button
                className="back"
                type="button"
                aria-label="Voltar ao cardápio"
                onClick={() => {
                  setSelectedProduct(null);
                  pendingCartFlyOriginRef.current = null;
                }}
              >
                <ArrowLeft size={19} />
              </button>
            </div>

            <div className="content">
              <div className="title-row"><h1>{selectedProduct.name}</h1></div>
              <S.ProductPrice className="price">
                {selectedProduct.promotion?.active &&
                selectedProduct.originalPrice > selectedProduct.price ? (
                  <del>{brl(selectedProduct.originalPrice)}</del>
                ) : null}
                <strong>{brl(selectedProduct.price)}</strong>
              </S.ProductPrice>
              {selectedProduct.description ? (
                <p className="description">{selectedProduct.description}</p>
              ) : null}

              <label className="observation">
                <span>Observações (opcional)</span>
                <textarea
                  maxLength={240}
                  value={completeProductObservation}
                  onChange={(event) => setCompleteProductObservation(event.target.value)}
                  placeholder="Adicione uma observação"
                />
                <small>{completeProductObservation.length}/240</small>
              </label>

              <div className="bottom-action">
                <S.CompleteProductQuantity>
                  <QuantityStepper
                    value={completeProductQuantity}
                    ariaLabel="Quantidade do produto"
                    decreaseLabel="Diminuir quantidade"
                    increaseLabel="Aumentar quantidade"
                    decreaseDisabled={completeProductQuantity <= 1}
                    onDecrease={() =>
                      setCompleteProductQuantity((quantity) => Math.max(1, quantity - 1))
                    }
                    onIncrease={() => setCompleteProductQuantity((quantity) => quantity + 1)}
                  />
                </S.CompleteProductQuantity>
                <S.CompleteProductAdd type="button" onClick={() => addComplete(selectedProduct)}>
                  <span>Adicionar</span>
                  <strong>{brl(selectedProduct.price * completeProductQuantity)}</strong>
                </S.CompleteProductAdd>
              </div>
            </div>
          </S.CompleteProductDetail>
        </S.ProductOverlay>
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

function FlowHeader({
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
    <S.FigmaHeader
      $hasTitle={Boolean(title)}
      className={isCartHeader ? 'cart-header' : undefined}
    >
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
          <span>Mesa {tableNumber(tableLabel)}</span>
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

function confirmationSteps(tableOrder: TableOrderNotice | null) {
  const progress = tableOrder?.progress || 0;
  return ['Pedido recebido', 'Em preparo', 'Pronto para servir'].map((label, index) => {
    const step = index + 1;
    return {
      label,
      description: '',
      ...stepState(progress, step),
    };
  });
}

function trackingSteps(tableOrder: TableOrderNotice | null) {
  const progress = tableOrder?.progress || 0;
  const descriptions = [
    'Enviado para a cozinha',
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
