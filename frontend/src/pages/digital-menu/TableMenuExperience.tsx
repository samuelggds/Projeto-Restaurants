import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Utensils,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import type { HomeData, HomeProduct } from '../Home/types';
import type { CartItem } from '../Home/hooks/useCart';
import type { ProductConfiguration } from '../Home/domain/productCustomization';
import type {
  TableAccountSnapshot,
  TablePaymentIntent,
} from '../Home/domain/tableAccount';
import type { TableOrderNotice } from '../Home/domain/tableOrderNotice';
import { ProductConfigurator } from '../Home/components/ProductConfigurator';
import { ComboConfigurator } from '../Home/components/ComboConfigurator';
import { TablePaymentStatusView } from '../Home/components/TablePaymentStatusView';
import * as S from './TableMenuExperience.styles';

type SubmitResult = {
  id?: number | string;
  publicId?: string;
  total?: number;
};

type Props = {
  data: HomeData;
  tableLabel: string | number;
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  orderingLocked?: boolean;
  tableOrder: TableOrderNotice | null;
  accountSnapshot: TableAccountSnapshot | null;
  activePayment: TablePaymentIntent | null;
  paymentLoading?: boolean;
  waiterCallEnabled?: boolean;
  billRequestEnabled?: boolean;
  onAddProduct: (productId: string, configuration: ProductConfiguration) => void;
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onSubmitOrder: () => Promise<SubmitResult | null | undefined>;
  onCallWaiter: () => void;
  onRequestBill?: () => void;
  onCreatePixPayment: (orderPublicId: string) => Promise<TablePaymentIntent | null>;
  onReconcilePayment: (paymentPublicId: string) => Promise<TablePaymentIntent | null>;
  onCancelPayment: (paymentPublicId: string) => Promise<boolean>;
  reviewCartOpen?: boolean;
  onReviewCartClose?: () => void;
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
  cartCount,
  cartTotal,
  orderingLocked = false,
  tableOrder,
  accountSnapshot,
  activePayment,
  paymentLoading = false,
  waiterCallEnabled = true,
  billRequestEnabled = false,
  onAddProduct,
  onIncrease,
  onDecrease,
  onSubmitOrder,
  onCallWaiter,
  onRequestBill,
  onCreatePixPayment,
  onReconcilePayment,
  onCancelPayment,
  reviewCartOpen = false,
  onReviewCartClose,
}: Props) {
  const [view, setView] = useState<View>('menu');
  const effectiveView: View = reviewCartOpen ? 'cart' : view;
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return data.categories.find((category) => category.id !== 'todos')?.id || 'todos';
  });
  const [bannerIndex, setBannerIndex] = useState(0);
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
  const [now, setNow] = useState(() => Date.now());

  const primary = data.brand.primaryColor || '#d64d08';
  const combos = useMemo(
    () => data.products.filter((product) => product.available && product.kind === 'COMBO'),
    [data.products],
  );
  const realCategories = useMemo(
    () => data.categories.filter((category) => category.id !== 'todos'),
    [data.categories],
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return data.products.filter((product) => {
      if (!product.available || product.kind === 'COMBO') return false;
      const categoryMatch =
        selectedCategory === 'todos' || product.categoryId === selectedCategory;
      const searchMatch =
        !normalizedQuery ||
        product.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
        product.description.toLocaleLowerCase('pt-BR').includes(normalizedQuery);
      return categoryMatch && searchMatch;
    });
  }, [data.products, query, selectedCategory]);

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
    if (!data.banners.length || data.banners.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % data.banners.length);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [data.banners.length]);

  useEffect(() => {
    if (!pixPending || pixRemainingSeconds === null) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [pixPending, pixRemainingSeconds]);

  useEffect(() => {
    if (!pixPending || !currentPayment?.publicId) return undefined;
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

  function openProduct(product: HomeProduct) {
    if (orderingLocked) return;
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

  function quickAdd(product: HomeProduct) {
    if (orderingLocked) return;
    if (product.kind === 'COMBO' && product.comboGroups?.length) {
      setConfiguringProduct(product);
      return;
    }
    if (product.saleMode === 'BUILDABLE') {
      setConfiguringProduct(product);
      return;
    }
    onAddProduct(product.id, emptyConfiguration(product));
  }

  function addComplete(product: HomeProduct) {
    const configuration = {
      selectedOptions: [],
      selectedOptionIds: [],
      observation: completeProductObservation.trim(),
      configurationVersion: product.configurationVersion,
    };
    for (let index = 0; index < completeProductQuantity; index += 1) {
      onAddProduct(product.id, configuration);
    }
    setSelectedProduct(null);
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

  async function startPix() {
    if (!confirmation?.orderPublicId || paymentLoading) return;
    const pendingPayment = accountSnapshot?.activePayment;
    if (
      pendingPayment?.method === 'PIX' &&
      ['RESERVED', 'PROCESSING'].includes(pendingPayment.status)
    ) {
      setPixPayment(pendingPayment);
      setView('pix');
      return;
    }
    const payment = await onCreatePixPayment(confirmation.orderPublicId);
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

  function scrollToCatalog() {
    document.getElementById('table-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (effectiveView === 'pix' && currentPayment) {
    if (currentPayment.status === 'PAID') {
      return (
        <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
          <FlowHeader
            data={data}
            tableLabel={tableLabel}
            title="Pagamento"
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
                    <Check size={32} />
                  </div>
                </div>
                <h1>Pagamento confirmado!</h1>
                <p>O pagamento foi confirmado e seu pedido continua normalmente.</p>
                <S.PaidReceipt>
                  <div className="copy">
                    {confirmation?.orderId ? <small>Pedido #{confirmation.orderId}</small> : null}
                    <strong>{centsToBrl(currentPayment.totalCents)}</strong>
                    <small>PIX · pagamento confirmado</small>
                  </div>
                  <span className="status">PAGO</span>
                </S.PaidReceipt>
                <S.PrimaryAction type="button" onClick={() => setView('tracking')}>
                  Acompanhar pedido
                </S.PrimaryAction>
              </S.PaymentSuccessMain>

              <S.PaymentSuccessSide>
                <h2>Seu pedido continua em preparo</h2>
                <p>O fluxo do pedido continua normalmente até ser servido na mesa.</p>
                <S.Timeline>
                  {trackingSteps(tableOrder).map((step, index) => (
                    <S.TimelineStep key={step.label} $active={step.active} $current={step.current}>
                      <span className="dot">{step.active ? <Check size={14} /> : index + 1}</span>
                      <div className="copy">
                        <b>{step.label}</b>
                      </div>
                    </S.TimelineStep>
                  ))}
                </S.Timeline>
                <S.SecondaryAction type="button" onClick={goToMenu}>
                  Voltar ao cardápio
                </S.SecondaryAction>
              </S.PaymentSuccessSide>
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
          title="Pagar com PIX"
          onBack={() => setView('payment')}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />
        <S.FlowPage>
          <S.PixLayout>
            <S.PixQrCard>
              <span className="amount">{centsToBrl(currentPayment.totalCents)}</span>
              <span className="order">
                {confirmation?.orderId ? `Pedido #${confirmation.orderId} · ` : ''}
                Mesa {tableNumber(tableLabel)}
              </span>

              {currentPayment.paymentCode ? (
                <>
                  <div className="qr" aria-label="QR Code PIX">
                    <QRCode value={currentPayment.paymentCode} size={302} level="M" />
                  </div>
                  <span className="pix-badge">PIX</span>
                  <S.PixCopyBox>
                    <code>{currentPayment.paymentCode}</code>
                    <button type="button" onClick={() => void copyPix()}>
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </S.PixCopyBox>
                </>
              ) : null}
            </S.PixQrCard>

            <S.PixSide>
              <S.PixStatusCard>
                <h2>Aguardando pagamento</h2>
                <p>
                  A confirmação acontece automaticamente assim que o PIX for aprovado.
                </p>
                <p>Você pode manter esta tela aberta.</p>
                {pixRemainingSeconds !== null ? (
                  <span className="timer">
                    Expira em {String(Math.floor(pixRemainingSeconds / 60)).padStart(2, '0')}:
                    {String(pixRemainingSeconds % 60).padStart(2, '0')}
                  </span>
                ) : null}
                <div className="buttons">
                  <S.PrimaryAction
                    type="button"
                    disabled={paymentLoading}
                    onClick={() => void onReconcilePayment(currentPayment.publicId)}
                  >
                    Já paguei · verificar
                  </S.PrimaryAction>
                  <S.SecondaryAction
                    type="button"
                    disabled={paymentLoading}
                    onClick={() => void onCancelPayment(currentPayment.publicId)}
                  >
                    Cancelar pagamento
                  </S.SecondaryAction>
                </div>
              </S.PixStatusCard>

              <S.HowToPayCard>
                <h2>Como pagar</h2>
                <ol>
                  <li><span>1</span>Abra o app do seu banco</li>
                  <li><span>2</span>Escolha pagar com PIX</li>
                  <li><span>3</span>Escaneie o QR ou cole o código</li>
                  <li><span>4</span>Aguarde a confirmação automática</li>
                </ol>
              </S.HowToPayCard>
            </S.PixSide>
          </S.PixLayout>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'payment' && confirmation) {
    const allowPix = accountSnapshot?.capabilities.allowPix === true;
    return (
      <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Pagamento"
          onBack={() => setView('confirmation')}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />
        <S.FlowPage>
          <S.FlowTitle>
            <h1>Como você prefere pagar?</h1>
            <p>Escolha pagar agora pelo celular ou deixar o valor na conta da mesa.</p>
          </S.FlowTitle>

          <S.PaymentOptionsGrid>
            {allowPix ? (
              <S.PaymentChoiceCard>
                <span className="icon"><WalletCards size={28} /></span>
                <h2>Pagar agora</h2>
                <p>Finalize pelo celular sem esperar o atendimento.</p>
                <small>PIX · confirmação automática</small>
                <button
                  className="primary"
                  type="button"
                  disabled={paymentLoading}
                  onClick={() => void startPix()}
                >
                  Continuar com PIX
                </button>
              </S.PaymentChoiceCard>
            ) : null}

            <S.PaymentChoiceCard>
              <span className="icon"><ReceiptText size={26} /></span>
              <h2>Pagar depois</h2>
              <p>O valor permanece na conta da mesa.</p>
              <small>Continue utilizando o cardápio normalmente.</small>
              <button className="secondary" type="button" onClick={() => setView('tracking')}>
                Deixar na conta
              </button>
            </S.PaymentChoiceCard>
          </S.PaymentOptionsGrid>

          <S.PaymentSummary>
            <div className="label">
              <small>Resumo deste pedido</small>
              {confirmation.orderId ? <strong>Pedido #{confirmation.orderId}</strong> : null}
            </div>
            <span className="amount">{brl(confirmation.total)}</span>
          </S.PaymentSummary>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  if (effectiveView === 'tracking') {
    return (
      <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Acompanhar pedido"
          onBack={goToMenu}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />

        <S.FlowPage>
          <S.TrackingLayout>
            <div>
              <S.StatusCard>
                <span className="icon"><Clock3 size={28} /></span>
                <div>
                  <h2>{tableOrder?.statusLabel || 'Aguardando pedido'}</h2>
                  <p>{tableOrder?.summary || 'O status será atualizado em tempo real.'}</p>
                </div>
              </S.StatusCard>

              <S.SectionHeading>
                <div className="title"><h2>Andamento</h2></div>
              </S.SectionHeading>
              <S.TimelineCard>
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
              <h2>Itens do pedido</h2>
              {tableOrder?.items.length ? (
                tableOrder.items.map((item, index) => (
                  <S.OrderItemLine key={`${item.name}-${index}`}>
                    <div className="copy">
                      <b>{item.name}</b>
                      <small>{item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'}</small>
                      {item.observation ? <small>{item.observation}</small> : null}
                    </div>
                  </S.OrderItemLine>
                ))
              ) : (
                <S.EmptyCatalog>Os itens aparecerão aqui assim que houver um pedido ativo.</S.EmptyCatalog>
              )}

              {waiterCallEnabled ? (
                <S.PrimaryAction type="button" onClick={onCallWaiter}>
                  <Bell size={17} /> Chamar garçom
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
          title="Pedido confirmado"
          onBack={goToMenu}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />
        <S.FlowPage>
          <S.SuccessHero>
            <div className="ring">
              <div className="check"><Check size={27} /></div>
            </div>
            <h1>Pedido enviado!</h1>
            <p>Seu pedido foi enviado para a cozinha da Mesa {tableNumber(tableLabel)}.</p>
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

          <S.TimelineCard>
            <S.Timeline>
              {trackingSteps(tableOrder).map((step, index) => (
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
              Acompanhar pedido
            </S.PrimaryAction>
            {accountSnapshot?.capabilities.allowPix ? (
              <S.SecondaryAction type="button" onClick={() => setView('payment')}>
                Pagar agora
              </S.SecondaryAction>
            ) : null}
            <S.HelperText>O pedido permanece vinculado à conta da mesa até o pagamento.</S.HelperText>
          </S.ConfirmationActions>
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
    const totalWithFee = cartTotal + serviceFee;

    return (
      <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
        <FlowHeader
          data={data}
          tableLabel={tableLabel}
          title="Meu pedido"
          onBack={goToMenu}
          onHome={goToMenu}
          onMenu={goToMenu}
          onOrders={() => setView('tracking')}
        />

        <S.FlowPage>
          <S.FlowTitle>
            <h1 aria-label="Minha sacola">Meu pedido</h1>
            <p>Mesa {tableNumber(tableLabel)}</p>
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
                        <S.QuantityControl>
                          <button
                            type="button"
                            aria-label={`Diminuir ${item.name}`}
                            onClick={() => item.cartId && onDecrease(item.cartId)}
                          >
                            <Minus size={13} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Aumentar ${item.name}`}
                            onClick={() => item.cartId && onIncrease(item.cartId)}
                          >
                            <Plus size={13} />
                          </button>
                        </S.QuantityControl>
                      </div>
                      <div className="side">
                        <strong className="price">{brl(item.price * item.quantity)}</strong>
                        <button
                          className="remove"
                          type="button"
                          aria-label={`Remover ${item.name}`}
                          onClick={() => {
                            if (!item.cartId) return;
                            for (let index = 0; index < item.quantity; index += 1) {
                              onDecrease(item.cartId);
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </S.CartLine>
                  ))
                ) : (
                  <S.EmptyCatalog>Seu pedido ainda está vazio.</S.EmptyCatalog>
                )}
              </S.CartLines>

              <S.AddMoreButton type="button" onClick={goToMenu}>
                + Adicionar mais itens
              </S.AddMoreButton>
            </div>

            <div>
              <S.SummaryCard>
                <div className="row"><span>Subtotal</span><strong>{brl(cartTotal)}</strong></div>
                <div className="row"><span>Serviço</span><strong>{brl(serviceFee)}</strong></div>
                <div className="divider" />
                <div className="row total"><span>Total</span><strong>{brl(totalWithFee)}</strong></div>
              </S.SummaryCard>

              <S.PrimaryAction
                type="button"
                disabled={!cart.length || submitting || orderingLocked}
                onClick={() => void submitOrder()}
              >
                {submitting ? 'Enviando pedido...' : 'Enviar pedido para a cozinha'}
              </S.PrimaryAction>
              <S.HelperText>Depois você pode escolher pagar agora ou deixar na conta da mesa.</S.HelperText>
            </div>
          </S.CartDesktopLayout>
        </S.FlowPage>
      </S.FigmaShell>
    );
  }

  const activeBanner = data.banners[bannerIndex] || data.banners[0];
  const heroTitle =
    [activeBanner?.title, activeBanner?.highlight].filter(Boolean).join(' ') ||
    [data.hero.title, data.hero.highlight].filter(Boolean).join(' ') ||
    'Peça direto da mesa com praticidade';
  const heroDescription =
    activeBanner?.description ||
    data.hero.description ||
    'Seu pedido vai direto para a cozinha.';
  const heroImage = activeBanner?.image || data.hero.image;

  return (
    <S.FigmaShell $primary={primary} $fontFamily={data.fontFamily}>
      <FlowHeader
        data={data}
        tableLabel={tableLabel}
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onMenu={scrollToCatalog}
        onOrders={() => setView('tracking')}
      />

      <S.MenuHero>
        {heroImage ? <img className="hero-bg" src={heroImage} alt="" /> : null}
        <div className="hero-overlay" aria-hidden="true" />
        <div className="copy">
          <span className="eyebrow">
            {data.brand.name.toUpperCase()} · MESA {tableNumber(tableLabel)}
          </span>
          <h1>{heroTitle}</h1>
          <p>{heroDescription}</p>
          <button className="cta" type="button" onClick={scrollToCatalog}>
            {activeBanner?.buttonLabel || 'Ver Cardápio'}
          </button>
        </div>

        {data.banners.length > 1 ? (
          <div className="indicators" aria-label="Banners em destaque">
            {data.banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Mostrar banner ${index + 1}`}
                className={index === bannerIndex ? 'active' : ''}
                onClick={() => setBannerIndex(index)}
              />
            ))}
          </div>
        ) : null}
      </S.MenuHero>

      <S.MenuPage>

        <S.SearchCategoryRow>
          <S.MenuSearch>
            <Search size={21} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar pratos, bebidas, sobremesas..."
              aria-label="Buscar no cardápio"
            />
          </S.MenuSearch>

          {realCategories.length ? (
            <S.CategoryRail aria-label="Categorias do cardápio">
              {realCategories.slice(0, 4).map((category) => (
                <S.CategoryPill
                  key={category.id}
                  type="button"
                  $active={selectedCategory === category.id}
                  onClick={() =>
                    setSelectedCategory((current) =>
                      current === category.id ? 'todos' : category.id,
                    )
                  }
                >
                  <span>{category.name}</span>
                </S.CategoryPill>
              ))}
            </S.CategoryRail>
          ) : null}
        </S.SearchCategoryRow>

        {combos.length ? (
          <>
            <S.SectionHeading>
              <div className="title"><h2>Combos em Destaque</h2><p>Os favoritos da casa para compartilhar</p></div>
              <button type="button" onClick={() => setSelectedCategory('todos')}>
                Ver todos <ChevronRight size={14} />
              </button>
            </S.SectionHeading>
            <S.ComboRail>
              {combos.map((combo) => (
                <FigmaComboCard
                  key={combo.id}
                  product={combo}
                  disabled={orderingLocked}
                  onOpen={() => openProduct(combo)}
                  onAdd={() => quickAdd(combo)}
                />
              ))}
            </S.ComboRail>
          </>
        ) : null}

        <S.TableActionsSection>
          <h2>Ações Rápidas</h2>
          <S.TableActionsGrid>
            <S.TableActionCard type="button" onClick={() => setView('cart')}>
              <span className="icon"><ClipboardList size={20} /></span>
              <span className="copy">
                <b>Meu pedido</b>
                <small>{cartCount > 0 ? `${cartCount} ${cartCount === 1 ? 'item' : 'itens'} · Veja e edite itens` : 'Veja e edite itens'}</small>
              </span>
            </S.TableActionCard>

            {waiterCallEnabled ? (
              <S.TableActionCard type="button" aria-label="Chamar garçom" onClick={onCallWaiter}>
                <span className="icon"><Bell size={20} /></span>
                <span className="copy"><b>Chamar garçom</b><small>Solicite atendimento</small></span>
              </S.TableActionCard>
            ) : null}

            {billRequestEnabled && onRequestBill ? (
              <S.TableActionCard type="button" onClick={onRequestBill}>
                <span className="icon"><ReceiptText size={20} /></span>
                <span className="copy"><b>Ver conta</b><small>Pagar agora ou depois</small></span>
              </S.TableActionCard>
            ) : null}
          </S.TableActionsGrid>
        </S.TableActionsSection>

        <S.CatalogSection id="table-catalog">
          <S.SectionHeading>
            <div className="title">
              <h2>
                {selectedCategory === 'todos'
                  ? 'Cardápio'
                  : realCategories.find((category) => category.id === selectedCategory)?.name ||
                    'Cardápio'}
              </h2>
              {query ? <p>Resultados para “{query}”</p> : null}
            </div>
            {selectedCategory !== 'todos' ? (
              <button type="button" onClick={() => setSelectedCategory('todos')}>
                Ver todos <ChevronRight size={14} />
              </button>
            ) : null}
          </S.SectionHeading>

          {filteredProducts.length ? (
            <S.CatalogGrid>
              {filteredProducts.map((product) => (
                <FigmaCatalogCard
                  key={product.id}
                  product={product}
                  disabled={orderingLocked}
                  onOpen={() => openProduct(product)}
                  onAdd={() => quickAdd(product)}
                />
              ))}
            </S.CatalogGrid>
          ) : (
            <S.EmptyCatalog>Nenhum produto disponível para este filtro.</S.EmptyCatalog>
          )}
        </S.CatalogSection>
      </S.MenuPage>

      {selectedProduct ? (
        <S.ProductOverlay role="dialog" aria-modal="true" aria-label={selectedProduct.name}>
          <S.CompleteProductDetail>
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
                onClick={() => setSelectedProduct(null)}
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
                  <button
                    type="button"
                    aria-label="Diminuir quantidade"
                    disabled={completeProductQuantity <= 1}
                    onClick={() =>
                      setCompleteProductQuantity((quantity) => Math.max(1, quantity - 1))
                    }
                  >
                    <Minus size={15} />
                  </button>
                  <strong>{completeProductQuantity}</strong>
                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    onClick={() => setCompleteProductQuantity((quantity) => quantity + 1)}
                  >
                    <Plus size={15} />
                  </button>
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
        configuringProduct.kind === 'COMBO' ? (
          <ComboConfigurator
            product={configuringProduct}
            primaryColor={primary}
            onClose={() => setConfiguringProduct(null)}
            onConfirm={(configuration) => {
              onAddProduct(configuringProduct.id, configuration);
              setConfiguringProduct(null);
            }}
          />
        ) : (
          <ProductConfigurator
            product={configuringProduct}
            primaryColor={primary}
            onClose={() => setConfiguringProduct(null)}
            enableProductQuantity
            tableMenuVariant
            onConfirm={(configuration, quantity = 1) => {
              for (let index = 0; index < quantity; index += 1) {
                onAddProduct(configuringProduct.id, configuration);
              }
              setConfiguringProduct(null);
            }}
          />
        )
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
  return (
    <S.FigmaHeader $hasTitle={Boolean(title)}>
      <div className="left">
        {title && onBack ? (
          <button className="mobile-back" type="button" aria-label="Voltar" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <S.FigmaBrand>
          {data.brand.logoUrl ? (
            <img src={data.brand.logoUrl} alt={data.brand.name} />
          ) : (
            <span className="mark">{data.brand.monogram || data.brand.name.slice(0, 1)}</span>
          )}
          <span className="name">
            <b>{data.brand.name}</b>
            <small>{data.brand.category || 'Mesa Inteligente'}</small>
          </span>
        </S.FigmaBrand>
        {title ? (
          <span className="context-title">
            <b>{title}</b>
            <small>{data.brand.name}</small>
          </span>
        ) : null}
      </div>

      <nav aria-label="Navegação da mesa">
        <button className={!title ? 'active' : ''} type="button" onClick={onHome}>Início</button>
        <button className={title === 'Meu pedido' ? 'active' : ''} type="button" onClick={onMenu}>Cardápio</button>
        <button className={title && title !== 'Meu pedido' ? 'active' : ''} type="button" onClick={onOrders}>Pedidos</button>
      </nav>

      <div className="right">
        <S.FigmaTablePill aria-label={`Mesa ${tableLabel}`}>
          <Utensils size={21} />
          <span>Mesa {tableNumber(tableLabel)}</span>
        </S.FigmaTablePill>
      </div>
    </S.FigmaHeader>
  );
}

function FigmaComboCard({
  product,
  disabled,
  onOpen,
  onAdd,
}: {
  product: HomeProduct;
  disabled: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <S.ComboCard $hasImage={Boolean(product.image)}>
      <button
        className="main"
        type="button"
        disabled={disabled}
        aria-label={`Ver detalhes de ${product.name}`}
        onClick={onOpen}
      />
      {product.image ? (
        <div className="media"><img src={product.image} alt={product.name} /></div>
      ) : null}
      <div className="copy">
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
        <strong className="price">{brl(product.price)}</strong>
      </div>
      <button
        className="add"
        type="button"
        disabled={disabled}
        aria-label={`Adicionar ${product.name}`}
        onClick={onAdd}
      >
        <Plus size={20} />
      </button>
    </S.ComboCard>
  );
}

function FigmaCatalogCard({
  product,
  disabled,
  onOpen,
  onAdd,
}: {
  product: HomeProduct;
  disabled: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  return (
    <S.CatalogCard $hasImage={Boolean(product.image)}>
      <button
        className="main"
        type="button"
        disabled={disabled}
        aria-label={`Ver detalhes de ${product.name}`}
        onClick={onOpen}
      />
      {product.image ? (
        <div className="media">
          <img src={product.image} alt={product.name} />
        </div>
      ) : null}
      <div className="copy">
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
        {product.promotion?.active && product.originalPrice > product.price ? (
          <span className="original">{brl(product.originalPrice)}</span>
        ) : null}
        <strong className="price">{brl(product.price)}</strong>
      </div>
      <button
        className="add"
        type="button"
        disabled={disabled}
        aria-label={`Adicionar ${product.name}`}
        onClick={onAdd}
      >
        <Plus size={17} />
      </button>
    </S.CatalogCard>
  );
}

function trackingSteps(tableOrder: TableOrderNotice | null) {
  const progress = tableOrder?.progress || 0;
  const descriptions = [
    'Seu pedido chegou à cozinha.',
    'A equipe está preparando tudo.',
    'Avisaremos assim que estiver pronto.',
    'Pedido entregue na sua mesa.',
  ];
  return ['Recebido', 'Em preparo', 'Pronto', 'Servido'].map((label, index) => {
    const step = index + 1;
    return {
      label,
      description: descriptions[index],
      active: progress >= step,
      current: progress === step,
    };
  });
}
