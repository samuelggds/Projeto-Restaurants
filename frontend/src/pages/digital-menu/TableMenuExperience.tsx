import {
  ArrowLeft,
  BellRing,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
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
import { TablePaymentStatusView } from '../Home/components/TablePaymentStatusView';
import { getFeaturedProducts } from '../Home/domain/featuredProducts';
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
  onAddProduct: (productId: string, configuration: ProductConfiguration) => void;
  onIncrease: (cartId: string) => void;
  onDecrease: (cartId: string) => void;
  onSubmitOrder: () => Promise<SubmitResult | null | undefined>;
  onCallWaiter: () => void;
  onCreatePixPayment: (orderPublicId: string) => Promise<TablePaymentIntent | null>;
  onReconcilePayment: (paymentPublicId: string) => Promise<TablePaymentIntent | null>;
  onCancelPayment: (paymentPublicId: string) => Promise<boolean>;
  onOpenTableAccount: () => void;
  reviewCartOpen?: boolean;
  onReviewCartClose?: () => void;
};

type View = 'menu' | 'cart' | 'confirmation' | 'tracking' | 'pix';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
  onAddProduct,
  onIncrease,
  onDecrease,
  onSubmitOrder,
  onCallWaiter,
  onCreatePixPayment,
  onReconcilePayment,
  onCancelPayment,
  onOpenTableAccount,
  reviewCartOpen = false,
  onReviewCartClose,
}: Props) {
  const [view, setView] = useState<View>('menu');
  const effectiveView: View = reviewCartOpen ? 'cart' : view;
  const [query, setQuery] = useState('');
  const [homeSearchOpen, setHomeSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [bannerIndex, setBannerIndex] = useState(0);
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
  const [now, setNow] = useState(() => Date.now());

  const products = useMemo(
    () =>
      data.products.filter((product) => {
        const categoryMatch =
          selectedCategory === 'todos' || product.categoryId === selectedCategory;
        const q = query.trim().toLocaleLowerCase('pt-BR');
        const searchMatch =
          !q ||
          product.name.toLocaleLowerCase('pt-BR').includes(q) ||
          product.description.toLocaleLowerCase('pt-BR').includes(q);
        return product.available && categoryMatch && searchMatch;
      }),
    [data.products, query, selectedCategory],
  );

  const featured = useMemo(
    () => getFeaturedProducts(data.products).slice(0, 4),
    [data.products],
  );

  const grouped = useMemo(
    () =>
      data.categories
        .filter((category) => category.id !== 'todos')
        .map((category) => ({
          category,
          products: products.filter((product) => product.categoryId === category.id),
        }))
        .filter((group) => group.products.length > 0),
    [data.categories, products],
  );

  const paymentBase =
    activePayment?.publicId === pixPayment?.publicId ? activePayment : pixPayment;
  const paymentSnapshot = paymentBase
    ? accountSnapshot?.payments.find((payment) => payment.publicId === paymentBase.publicId)
    : null;
  const currentPayment = paymentBase
    ? { ...paymentBase, status: paymentSnapshot?.status || paymentBase.status }
    : null;
  const primary = data.brand.primaryColor || '#e50914';
  const pixPending = Boolean(
    currentPayment && ['RESERVED', 'PROCESSING'].includes(currentPayment.status),
  );
  const pixRemainingSeconds =
    pixPending && currentPayment?.expiresAt
      ? Math.max(0, Math.ceil((new Date(currentPayment.expiresAt).getTime() - now) / 1000))
      : null;

  useEffect(() => {
    if (data.banners.length <= 1) return undefined;
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

  function openProduct(product: HomeProduct) {
    if (orderingLocked) return;
    if (product.saleMode === 'BUILDABLE') {
      setConfiguringProduct(product);
      return;
    }
    setSelectedProduct(product);
  }

  function addComplete(product: HomeProduct) {
    onAddProduct(product.id, {
      selectedOptions: [],
      selectedOptionIds: [],
      observation: '',
      configurationVersion: product.configurationVersion,
    });
    setSelectedProduct(null);
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

  if (effectiveView === 'pix' && currentPayment) {
    if (!pixPending) {
      return (
        <S.Shell $primary={primary}>
          <S.PaymentHeader>
            <S.Brand>
              {data.brand.logoUrl ? (
                <img src={data.brand.logoUrl} alt={data.brand.name} />
              ) : (
                <S.BrandMark />
              )}
              <span>
                <b>{data.brand.name}</b>
                <small>{data.about || data.brand.category || ''}</small>
              </span>
            </S.Brand>
          </S.PaymentHeader>
          <S.CenteredPage>
            <TablePaymentStatusView
              payment={currentPayment}
              status={currentPayment.status}
              actionLoading={paymentLoading}
              restaurantCategory={data.brand.category}
              onVerify={() => onReconcilePayment(currentPayment.publicId)}
              onCancel={() => onCancelPayment(currentPayment.publicId)}
              onStartOver={() => setView('confirmation')}
              onClose={() => setView('tracking')}
            />
          </S.CenteredPage>
        </S.Shell>
      );
    }

    const minutes = pixRemainingSeconds === null ? 0 : Math.floor(pixRemainingSeconds / 60);
    const seconds = pixRemainingSeconds === null ? 0 : pixRemainingSeconds % 60;

    return (
      <S.Shell $primary={primary}>
        <S.PixReferenceHeader>
          <button
            type="button"
            aria-label="Voltar para o pedido"
            onClick={() => setView('confirmation')}
          >
            <ArrowLeft size={18} />
          </button>
          <S.CartReferenceBrand>
            {data.brand.logoUrl ? (
              <img src={data.brand.logoUrl} alt={data.brand.name} />
            ) : (
              <S.BrandMark />
            )}
            <b>{data.brand.name}</b>
          </S.CartReferenceBrand>
          <span />
        </S.PixReferenceHeader>

        <S.PixReferencePage>
          <S.PixReferenceMark aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </S.PixReferenceMark>

          <h1>Pagar com PIX</h1>
          <p>Escaneie o QR Code pelo seu banco ou copie o código abaixo.</p>

          {currentPayment.paymentCode ? (
            <>
              <S.PixReferenceQr aria-label="QR Code PIX">
                <QRCode value={currentPayment.paymentCode} size={210} level="M" />
              </S.PixReferenceQr>

              <S.PixReferenceCopy>
                <div>
                  <small>Código PIX (copia e cola)</small>
                  <code>{currentPayment.paymentCode}</code>
                </div>
                <button type="button" onClick={() => void copyPix()}>
                  <Copy size={16} />
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </S.PixReferenceCopy>
            </>
          ) : null}

          <S.PixReferenceWaiting role="status" aria-live="polite">
            <Clock3 size={18} />
            <div>
              <b>Aguardando o pagamento...</b>
              <span>O QR Code expira no horário indicado.</span>
            </div>
            {pixRemainingSeconds !== null ? (
              <strong>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </strong>
            ) : null}
          </S.PixReferenceWaiting>

          <S.PixReferenceBack type="button" onClick={() => setView('confirmation')}>
            <ArrowLeft size={17} /> Voltar para o pedido
          </S.PixReferenceBack>
        </S.PixReferencePage>
      </S.Shell>
    );
  }

  if (effectiveView === 'tracking') {
    const progress = tableOrder?.progress || 0;
    const progressSteps = ['Pedido recebido', 'Em preparo', 'Pronto', 'Entregue na mesa'];

    return (
      <S.Shell $primary={primary}>
        <S.TrackingReferenceHeader>
          <button
            type="button"
            aria-label="Voltar ao cardápio"
            onClick={() => {
              onReviewCartClose?.();
              setView('menu');
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <S.CartReferenceBrand>
            {data.brand.logoUrl ? (
              <img src={data.brand.logoUrl} alt={data.brand.name} />
            ) : (
              <S.BrandMark />
            )}
            <b>{data.brand.name}</b>
          </S.CartReferenceBrand>

          <div className="actions">
            <button type="button" aria-label="Meu pedido" onClick={() => setView('cart')}>
              <ShoppingCart size={19} />
              {cartCount > 0 ? <i>{cartCount}</i> : null}
            </button>
          </div>
        </S.TrackingReferenceHeader>

        <S.TrackingReferencePage>
          <S.TrackingReferenceTitle>
            <h1>Acompanhe seu pedido</h1>
            <p>
              {tableOrder
                ? `Pedido #${tableOrder.publicId} · Mesa ${tableLabel}`
                : `Mesa ${tableLabel}`}
            </p>
          </S.TrackingReferenceTitle>

          <S.TrackingReferenceProgress>
            {progressSteps.map((label, index) => {
              const stepNumber = index + 1;
              const active = progress >= stepNumber;
              return (
                <S.TrackingReferenceStep key={label} $active={active}>
                  <span>{progress > index ? <Check size={14} /> : stepNumber}</span>
                  <b>{label}</b>
                </S.TrackingReferenceStep>
              );
            })}
          </S.TrackingReferenceProgress>

          <S.TrackingReferenceStatus>
            <div className="icon">
              <Utensils size={24} />
            </div>
            <div>
              <h2>{tableOrder?.statusLabel || 'Aguardando atualização'}</h2>
              <p>
                {tableOrder?.summary ||
                  'O status será atualizado automaticamente quando houver uma nova etapa.'}
              </p>
            </div>
          </S.TrackingReferenceStatus>

          {tableOrder?.items?.length ? (
            <S.TrackingReferenceItems>
              <h2>Itens do pedido</h2>
              {tableOrder.items.map((item, index) => (
                <article key={`${item.name}-${index}`}>
                  <div>
                    <b>{item.name}</b>
                    {item.observation ? <small>Obs.: {item.observation}</small> : null}
                  </div>
                  <strong>{item.quantity}x</strong>
                </article>
              ))}
            </S.TrackingReferenceItems>
          ) : null}

          <S.TrackingReferenceWaiter>
            <BellRing size={21} />
            <div>
              <h3>Precisa de algo?</h3>
              <p>Chame o garçom da sua mesa sem sair do cardápio.</p>
              <button type="button" aria-label="Chamar garçom" onClick={onCallWaiter}>
                Chamar garçom
              </button>
            </div>
          </S.TrackingReferenceWaiter>
        </S.TrackingReferencePage>
      </S.Shell>
    );
  }

  if (effectiveView === 'confirmation' && confirmation) {
    return (
      <S.Shell $primary={primary}>
        <S.ConfirmationReferenceHeader>
          <S.CartReferenceBrand>
            {data.brand.logoUrl ? (
              <img src={data.brand.logoUrl} alt={data.brand.name} />
            ) : (
              <S.BrandMark />
            )}
            <b>{data.brand.name}</b>
          </S.CartReferenceBrand>

          <div className="actions">
            <button type="button" aria-label="Buscar no cardápio" onClick={() => setView('menu')}>
              <Search size={18} />
            </button>
            <button type="button" aria-label="Meu pedido" onClick={() => setView('cart')}>
              <ShoppingCart size={19} />
            </button>
          </div>
        </S.ConfirmationReferenceHeader>

        <S.ConfirmationReferencePage>
          <S.ConfirmationReferenceHero>
            <S.ConfirmationCheck>
              <Check size={28} />
            </S.ConfirmationCheck>

            <h1>Pedido confirmado</h1>
            <strong>Pedido #{confirmation.orderId}</strong>
            <p>
              Seu pedido foi recebido pelo restaurante e enviado para a cozinha da Mesa {tableLabel}.
            </p>

            <S.ConfirmationPending>
              <Clock3 size={15} />
              <span>Pagamento pendente</span>
            </S.ConfirmationPending>
          </S.ConfirmationReferenceHero>

          <S.ConfirmationReferenceSummary>
            <header>
              <h2>Resumo do pedido</h2>
              <button type="button" onClick={() => setView('tracking')}>
                Ver detalhes <ChevronRight size={14} />
              </button>
            </header>

            <div className="items">
              {confirmation.items.map((item) => (
                <article key={item.cartId}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <S.ImagePlaceholder />
                  )}
                  <div>
                    <b>{item.name}</b>
                    <small>{item.quantity}x</small>
                  </div>
                  <strong>{brl(item.price * item.quantity)}</strong>
                </article>
              ))}
            </div>

            <footer>
              <span>Total do pedido</span>
              <strong>{brl(confirmation.total)}</strong>
            </footer>
          </S.ConfirmationReferenceSummary>

          <S.ConfirmationReferencePay>
            <div className="title">
              <WalletCards size={18} />
              <span>
                <b>Como deseja pagar?</b>
                <small>
                  O pagamento online é opcional. Você pode pagar agora com PIX ou deixar para depois.
                </small>
              </span>
            </div>

            {accountSnapshot?.capabilities.allowPix ? (
              <S.ConfirmationPixButton
                type="button"
                disabled={paymentLoading}
                onClick={() => void startPix()}
              >
                Pagar com PIX agora <ChevronRight size={18} />
              </S.ConfirmationPixButton>
            ) : null}

            <S.ConfirmationLaterButton type="button" onClick={() => setView('tracking')}>
              Pagar depois <ChevronRight size={18} />
            </S.ConfirmationLaterButton>

            <div className="or">ou</div>

            <S.ConfirmationTrackButton type="button" onClick={() => setView('tracking')}>
              Acompanhar pedido <ChevronRight size={18} />
            </S.ConfirmationTrackButton>
          </S.ConfirmationReferencePay>
        </S.ConfirmationReferencePage>
      </S.Shell>
    );
  }

  if (effectiveView === 'cart') {
    const serviceFeeCents = accountSnapshot?.capabilities.serviceFeeMode === 'MANDATORY'
      ? Math.round(cartTotal * 100 * (accountSnapshot.capabilities.serviceFeeBasisPoints / 10_000))
      : 0;
    const serviceFee = serviceFeeCents / 100;
    const totalWithFee = cartTotal + serviceFee;

    return (
      <S.Shell $primary={primary}>
        <S.CartReferenceHeader>
          <button
            type="button"
            aria-label="Voltar ao cardápio"
            onClick={() => {
              onReviewCartClose?.();
              setView('menu');
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <S.CartReferenceBrand>
            {data.brand.logoUrl ? (
              <img src={data.brand.logoUrl} alt={data.brand.name} />
            ) : (
              <S.BrandMark />
            )}
            <b>{data.brand.name}</b>
          </S.CartReferenceBrand>
          <div className="actions">
            <button type="button" aria-label="Buscar no cardápio" onClick={() => setView('menu')}>
              <Search size={18} />
            </button>
            <button type="button" aria-label="Meu pedido">
              <ShoppingCart size={19} />
              {cartCount > 0 ? <i>{cartCount}</i> : null}
            </button>
          </div>
        </S.CartReferenceHeader>

        <S.CartReferencePage>
          <h1 aria-label="Minha sacola">Seu pedido</h1>

          <S.CartReferenceList>
            {cart.length === 0 ? (
              <S.EmptyCart>Seu pedido ainda está vazio.</S.EmptyCart>
            ) : (
              cart.map((item) => (
                <S.CartReferenceItem key={item.cartId}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <S.ImagePlaceholder />
                  )}

                  <div className="info">
                    <div className="title-row">
                      <b>{item.name}</b>
                      <button
                        type="button"
                        aria-label={`Remover ${item.name}`}
                        onClick={() => item.cartId && onDecrease(item.cartId)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {item.options?.length ? (
                      <small>{item.options.map((option) => option.name).join(' · ')}</small>
                    ) : item.observation ? (
                      <small>{item.observation}</small>
                    ) : null}

                    <div className="item-footer">
                      <S.CartReferenceQuantity>
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
                      </S.CartReferenceQuantity>
                      <strong>{brl(item.price * item.quantity)}</strong>
                      <button
                        type="button"
                        className="remove-secondary"
                        aria-label={`Remover item ${item.name}`}
                        onClick={() => {
                          if (!item.cartId) return;
                          for (let index = 0; index < item.quantity; index += 1) {
                            onDecrease(item.cartId);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </S.CartReferenceItem>
              ))
            )}
          </S.CartReferenceList>

          <S.AddMoreItemsButton
            type="button"
            onClick={() => {
              onReviewCartClose?.();
              setView('menu');
            }}
          >
            <Plus size={16} /> Adicionar mais itens
          </S.AddMoreItemsButton>

          <S.CartReferenceSummary>
            <div>
              <span>Subtotal</span>
              <b>{brl(cartTotal)}</b>
            </div>
            {serviceFee > 0 ? (
              <div>
                <span>Taxa de serviço</span>
                <b>{brl(serviceFee)}</b>
              </div>
            ) : null}
            <div className="total">
              <strong>Total</strong>
              <b>{brl(totalWithFee)}</b>
            </div>
          </S.CartReferenceSummary>

          <S.CartReferenceSubmit
            type="button"
            aria-label="Enviar pedido para a cozinha"
            disabled={!cart.length || submitting || orderingLocked}
            onClick={() => void submitOrder()}
          >
            {submitting ? 'Enviando pedido...' : 'Finalizar pedido'}
          </S.CartReferenceSubmit>
        </S.CartReferencePage>
      </S.Shell>
    );
  }

  return (
    <S.Shell $primary={primary}>
      <HomeHeader
        data={data}
        tableLabel={tableLabel}
        cartCount={cartCount}
        searchOpen={homeSearchOpen}
        query={query}
        setQuery={setQuery}
        onSearchToggle={() => setHomeSearchOpen((open) => !open)}
        onCart={() => setView('cart')}
        onOpenTableAccount={onOpenTableAccount}
        onCallWaiter={onCallWaiter}
      />
      <S.HomePage>
        {data.banners.length ? (() => {
          const banner = data.banners[bannerIndex] || data.banners[0];
          const previousBanner = () =>
            setBannerIndex((current) =>
              current === 0 ? data.banners.length - 1 : current - 1,
            );
          const nextBanner = () =>
            setBannerIndex((current) => (current + 1) % data.banners.length);

          return (
            <S.Hero>
              <img src={banner.image} alt="" />
              <div>
                <small>{banner.title}</small>
                <h1>
                  {banner.highlight
                    ? `${banner.title} ${banner.highlight}`
                    : banner.title}
                </h1>
                {banner.description ? <p>{banner.description}</p> : null}
                <S.PrimaryButton
                  type="button"
                  onClick={() =>
                    document
                      .getElementById('table-catalog')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  {banner.buttonLabel || 'Ver o cardápio'} <ChevronRight size={18} />
                </S.PrimaryButton>
              </div>

              {data.banners.length > 1 ? (
                <>
                  <S.HeroArrow
                    type="button"
                    $side="left"
                    aria-label="Banner anterior"
                    onClick={previousBanner}
                  >
                    <ChevronRight size={20} />
                  </S.HeroArrow>
                  <S.HeroArrow
                    type="button"
                    $side="right"
                    aria-label="Próximo banner"
                    onClick={nextBanner}
                  >
                    <ChevronRight size={20} />
                  </S.HeroArrow>
                  <S.HeroIndicators aria-label="Banners em destaque">
                    {data.banners.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`Mostrar banner ${index + 1}`}
                        aria-current={index === bannerIndex ? 'true' : undefined}
                        onClick={() => setBannerIndex(index)}
                      />
                    ))}
                  </S.HeroIndicators>
                </>
              ) : null}
            </S.Hero>
          );
        })() : null}

        <S.HomeInfoRow>
          <article>
            <Utensils size={16} />
            <span>
              <b>Pedido na mesa</b>
              <small>Mesa {tableLabel}</small>
            </span>
          </article>
          <article>
            <Clock3 size={16} />
            <span>
              <b>Acompanhe seu pedido</b>
              <small>Status atualizado durante o preparo</small>
            </span>
          </article>
        </S.HomeInfoRow>

        <S.HomeSectionHeader>
          <h2>Categorias</h2>
          <button type="button" onClick={() => setSelectedCategory('todos')}>
            Ver todas <ChevronRight size={14} />
          </button>
        </S.HomeSectionHeader>

        <S.CategoryStrip aria-label="Categorias do cardápio">
          {data.categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={selectedCategory === category.id ? 'active' : ''}
              onClick={() => setSelectedCategory(category.id)}
            >
              <S.CategoryMedia aria-hidden="true">
                {category.id === 'todos' ? (
                  <Sparkles />
                ) : category.image ? (
                  <img src={category.image} alt="" />
                ) : (
                  <Utensils />
                )}
              </S.CategoryMedia>
              <span>{category.name}</span>
            </button>
          ))}
        </S.CategoryStrip>

        {selectedCategory === 'todos' && featured.length ? (
          <S.HomeProductSection>
            <S.HomeSectionHeader>
              <h2>Categorias da casa</h2>
            </S.HomeSectionHeader>
            <S.HomeProductRail>
              {featured.map((product) => (
                <HomeProductTile
                  key={product.id}
                  product={product}
                  onOpen={() => openProduct(product)}
                />
              ))}
            </S.HomeProductRail>
          </S.HomeProductSection>
        ) : null}

        <div id="table-catalog">
          {selectedCategory === 'todos' ? (
            grouped.map(({ category, products: categoryProducts }) => (
              <S.Section key={category.id}>
                <header>
                  <h2>{category.name}</h2>
                  <button type="button" onClick={() => setSelectedCategory(category.id)}>
                    Ver todos
                  </button>
                </header>
                <S.ProductGrid>
                  {categoryProducts.slice(0, 8).map((product) => (
                    <ProductCard key={product.id} product={product} onOpen={() => openProduct(product)} />
                  ))}
                </S.ProductGrid>
              </S.Section>
            ))
          ) : (() => {
            const activeCategory = data.categories.find(
              (category) => category.id === selectedCategory,
            );

            return (
              <S.CategoryListing>
                <S.CategoryListingHeader>
                  <button
                    type="button"
                    aria-label="Voltar para todas as categorias"
                    onClick={() => setSelectedCategory('todos')}
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <S.CategoryListingTitle>
                    <S.CategoryListingMedia aria-hidden="true">
                      {activeCategory?.image ? (
                        <img src={activeCategory.image} alt="" />
                      ) : (
                        <Utensils />
                      )}
                    </S.CategoryListingMedia>
                    <div>
                      <h1>{activeCategory?.name || 'Produtos'}</h1>
                      <p>
                        {products.length}
                        {' '}
                        {products.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
                      </p>
                    </div>
                  </S.CategoryListingTitle>
                </S.CategoryListingHeader>

                <S.CategoryTabs aria-label="Navegar entre categorias">
                  {data.categories
                    .filter((category) => category.id !== 'todos')
                    .map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className={selectedCategory === category.id ? 'active' : ''}
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        {category.name}
                      </button>
                    ))}
                </S.CategoryTabs>

                <S.CategoryProductList>
                  {products.map((product) => (
                    <CategoryProductRow
                      key={product.id}
                      product={product}
                      onOpen={() => openProduct(product)}
                    />
                  ))}
                </S.CategoryProductList>
              </S.CategoryListing>
            );
          })()
          }
        </div>

        {data.banners.length > 1 ? (
          <S.HomeBottomBanner>
            <img
              src={data.banners[(bannerIndex + 1) % data.banners.length].image}
              alt=""
            />
            <div>
              <b>{data.banners[(bannerIndex + 1) % data.banners.length].title}</b>
              {data.banners[(bannerIndex + 1) % data.banners.length].description ? (
                <small>{data.banners[(bannerIndex + 1) % data.banners.length].description}</small>
              ) : null}
            </div>
          </S.HomeBottomBanner>
        ) : null}
      </S.HomePage>

      {selectedProduct ? (
        <S.ProductOverlay role="dialog" aria-modal="true">
          <S.ProductDetail>
            <button className="back" type="button" onClick={() => setSelectedProduct(null)}>
              <ArrowLeft size={18} /> Voltar ao cardápio
            </button>
            <div className="visual">
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={selectedProduct.name} />
              ) : (
                <S.LargeImagePlaceholder />
              )}
            </div>
            <div className="info">
              <h1>{selectedProduct.name}</h1>
              <p>{selectedProduct.description}</p>
              <strong>{brl(selectedProduct.price)}</strong>
              {selectedProduct.saleMode === 'BUILDABLE' ? (
                <S.PrimaryButton
                  type="button"
                  onClick={() => {
                    setConfiguringProduct(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  Personalizar produto <ChevronRight size={20} />
                </S.PrimaryButton>
              ) : (
                <S.PrimaryButton type="button" onClick={() => addComplete(selectedProduct)}>
                  Adicionar ao pedido • {brl(selectedProduct.price)}
                </S.PrimaryButton>
              )}
            </div>
          </S.ProductDetail>
        </S.ProductOverlay>
      ) : null}

      {configuringProduct ? (
        <ProductConfigurator
          product={configuringProduct}
          primaryColor={primary}
          onClose={() => setConfiguringProduct(null)}
          onConfirm={(configuration) => {
            onAddProduct(configuringProduct.id, configuration);
            setConfiguringProduct(null);
          }}
        />
      ) : null}
    </S.Shell>
  );
}

function HomeHeader({
  data,
  tableLabel,
  cartCount,
  searchOpen,
  query,
  setQuery,
  onSearchToggle,
  onCart,
  onOpenTableAccount,
  onCallWaiter,
}: {
  data: HomeData;
  tableLabel: string | number;
  cartCount: number;
  searchOpen: boolean;
  query: string;
  setQuery: (value: string) => void;
  onSearchToggle: () => void;
  onCart: () => void;
  onOpenTableAccount: () => void;
  onCallWaiter: () => void;
}) {
  return (
    <S.HomeHeader>
      <S.Brand>
        {data.brand.logoUrl ? <img src={data.brand.logoUrl} alt={data.brand.name} /> : <S.BrandMark />}
        <span>
          <b>{data.brand.name}</b>
          <small>{data.brand.category || ''}</small>
        </span>
      </S.Brand>

      <S.HomeHeaderActions>
        <button type="button" aria-label="Buscar no cardápio" onClick={onSearchToggle}>
          <Search size={18} />
        </button>
        <button
          type="button"
          aria-label={`Abrir minha comanda da mesa ${tableLabel}`}
          onClick={onOpenTableAccount}
        >
          <Utensils size={18} />
        </button>
        <button type="button" aria-label="Chamar garçom" onClick={onCallWaiter}>
          <BellRing size={18} />
        </button>
        <button type="button" aria-label="Meu pedido" onClick={onCart}>
          <ShoppingCart size={19} />
          {cartCount > 0 ? <i>{cartCount}</i> : null}
        </button>
      </S.HomeHeaderActions>

      {searchOpen ? (
        <S.HomeSearch>
          <Search size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no cardápio..."
          />
        </S.HomeSearch>
      ) : null}
    </S.HomeHeader>
  );
}

function HomeProductTile({ product, onOpen }: { product: HomeProduct; onOpen: () => void }) {
  return (
    <S.HomeProductTile
      type="button"
      onClick={onOpen}
      aria-label={`Ver detalhes de ${product.name}`}
    >
      <div className="image">
        {product.image ? <img src={product.image} alt={product.name} /> : <S.ImagePlaceholder />}
        {product.promotion?.active ? (
          <S.DiscountBadge>{product.promotion.badgeLabel}</S.DiscountBadge>
        ) : null}
      </div>
      <b>{product.name}</b>
      <S.ProductPrice>
        {product.promotion?.active && product.originalPrice > product.price ? (
          <del>{brl(product.originalPrice)}</del>
        ) : null}
        <strong>{brl(product.price)}</strong>
      </S.ProductPrice>
      <span className="add"><Plus size={14} /></span>
    </S.HomeProductTile>
  );
}

function Header({
  data,
  tableLabel,
  cartCount,
  query,
  setQuery,
  onCart,
  onOpenTableAccount,
  onCallWaiter,
}: {
  data: HomeData;
  tableLabel: string | number;
  cartCount: number;
  query: string;
  setQuery: (value: string) => void;
  onCart: () => void;
  onOpenTableAccount: () => void;
  onCallWaiter: () => void;
}) {
  return (
    <S.Header>
      <S.Brand>
        {data.brand.logoUrl ? <img src={data.brand.logoUrl} alt={data.brand.name} /> : <S.BrandMark />}
        <span>
          <b>{data.brand.name}</b>
          <small>{data.about || data.brand.category || ''}</small>
        </span>
      </S.Brand>
      <S.TableActions>
        <S.TableBadge
          as="button"
          type="button"
          onClick={onOpenTableAccount}
          aria-label={`Abrir minha comanda da mesa ${tableLabel}`}
        >
          <Utensils size={17} />
          Mesa {tableLabel}
          <span
            className="table-accessible-number"
            aria-label={`Mesa ${Number(tableLabel) || tableLabel}`}
          >
            {String(tableLabel).padStart(2, '0')}
          </span>
        </S.TableBadge>
        <S.WaiterButton type="button" onClick={onCallWaiter} aria-label="Chamar garçom">
          <BellRing size={17} />
          <span>Chamar garçom</span>
        </S.WaiterButton>
      </S.TableActions>
      <S.SearchBox>
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar no cardápio..."
        />
      </S.SearchBox>
      <S.CartButton type="button" onClick={onCart}>
        <ShoppingCart size={22} />
        <span>Meu pedido</span>
        {cartCount > 0 ? <i>{cartCount}</i> : null}
      </S.CartButton>
    </S.Header>
  );
}

function CategoryProductRow({
  product,
  onOpen,
}: {
  product: HomeProduct;
  onOpen: () => void;
}) {
  return (
    <S.CategoryProductRow>
      <button
        type="button"
        className="main"
        onClick={onOpen}
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <div className="image">
          {product.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <S.ImagePlaceholder />
          )}
          {product.promotion?.active ? (
            <S.DiscountBadge>{product.promotion.badgeLabel}</S.DiscountBadge>
          ) : null}
        </div>

        <div className="content">
          <b>{product.name}</b>
          {product.description ? <p>{product.description}</p> : null}
          <S.ProductPrice>
            {product.promotion?.active && product.originalPrice > product.price ? (
              <del>{brl(product.originalPrice)}</del>
            ) : null}
            <strong>{brl(product.price)}</strong>
          </S.ProductPrice>
        </div>
      </button>

      <button
        type="button"
        className="add"
        aria-label={`Adicionar ${product.name}`}
        onClick={onOpen}
      >
        <Plus size={17} />
      </button>
    </S.CategoryProductRow>
  );
}

function ProductCard({ product, onOpen }: { product: HomeProduct; onOpen: () => void }) {
  return (
    <S.ProductCard
      type="button"
      onClick={onOpen}
      aria-label={`Ver detalhes de ${product.name}`}
    >
      <div className="image">
        {product.image ? <img src={product.image} alt={product.name} /> : <S.ImagePlaceholder />}
        {product.promotion?.active ? (
          <S.DiscountBadge
            aria-label={`Produto com desconto: ${product.promotion.badgeLabel}`}
          >
            {product.promotion.badgeLabel}
          </S.DiscountBadge>
        ) : null}
      </div>
      <div className="copy">
        <b>{product.name}</b>
        <p>{product.description}</p>
        <S.ProductPrice>
          {product.promotion?.active && product.originalPrice > product.price ? (
            <del>{brl(product.originalPrice)}</del>
          ) : null}
          <strong>{brl(product.price)}</strong>
        </S.ProductPrice>
      </div>
      <span className="add">
        <Plus size={18} />
      </span>
    </S.ProductCard>
  );
}
