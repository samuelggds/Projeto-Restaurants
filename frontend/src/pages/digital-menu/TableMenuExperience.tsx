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

    const paymentItems = confirmation?.items || [];
    const minutes = pixRemainingSeconds === null ? 0 : Math.floor(pixRemainingSeconds / 60);
    const seconds = pixRemainingSeconds === null ? 0 : pixRemainingSeconds % 60;

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
          <S.PaymentBack type="button" onClick={() => setView('confirmation')}>
            <ArrowLeft size={18} /> Voltar para o pedido
          </S.PaymentBack>
        </S.PaymentHeader>

        <S.PixPage>
          <S.PixSummary>
            <header>
              <h2>Resumo do pedido</h2>
              <span>Mesa {tableLabel}</span>
            </header>
            <div className="items">
              {paymentItems.map((item) => (
                <article key={item.cartId}>
                  {item.image ? <img src={item.image} alt={item.name} /> : <S.ImagePlaceholder />}
                  <div>
                    <b>{item.name}</b>
                    {item.options?.length ? (
                      <small>{item.options.map((option) => option.name).join(' · ')}</small>
                    ) : null}
                  </div>
                  <span>{item.quantity}x</span>
                  <strong>{brl(item.price * item.quantity)}</strong>
                </article>
              ))}
            </div>
            <S.PixTotals>
              <span>
                <small>Subtotal</small>
                <b>{brl(currentPayment.subtotalCents / 100)}</b>
              </span>
              {currentPayment.serviceFeeCents > 0 ? (
                <span>
                  <small>Taxa de serviço</small>
                  <b>{brl(currentPayment.serviceFeeCents / 100)}</b>
                </span>
              ) : null}
              <span className="total">
                <strong>Total a pagar</strong>
                <b>{brl(currentPayment.totalCents / 100)}</b>
              </span>
            </S.PixTotals>
            <S.AfterPayment>
              <Clock3 />
              <div>
                <b>Após o pagamento</b>
                <p>A confirmação acontece automaticamente pelo sistema.</p>
              </div>
            </S.AfterPayment>
          </S.PixSummary>

          <S.PixPaymentCard>
            <S.PixMark aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </S.PixMark>
            <h1>Pagar com PIX</h1>
            <p>Escaneie o QR Code pelo seu banco ou copie o código abaixo.</p>

            {currentPayment.paymentCode ? (
              <>
                <S.QrFrame aria-label="QR Code PIX">
                  <QRCode value={currentPayment.paymentCode} size={220} level="M" />
                </S.QrFrame>
                <S.CopyArea>
                  <div>
                    <small>Código PIX (copia e cola)</small>
                    <code>{currentPayment.paymentCode}</code>
                  </div>
                  <button type="button" onClick={() => void copyPix()}>
                    <Copy size={18} />
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </S.CopyArea>
              </>
            ) : null}

            <S.WaitingPayment role="status" aria-live="polite">
              <Clock3 />
              <div>
                <b>Aguardando o pagamento...</b>
                <span>O QR Code expira no horário indicado.</span>
              </div>
              {pixRemainingSeconds !== null ? (
                <strong>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </strong>
              ) : null}
            </S.WaitingPayment>

            <S.PaymentBackWide type="button" onClick={() => setView('confirmation')}>
              <ArrowLeft size={18} /> Voltar para o pedido
            </S.PaymentBackWide>
          </S.PixPaymentCard>
        </S.PixPage>
      </S.Shell>
    );
  }

  if (effectiveView === 'tracking') {
    return (
      <S.Shell $primary={primary}>
        <Header
          data={data}
          tableLabel={tableLabel}
          cartCount={cartCount}
          query={query}
          setQuery={setQuery}
          onCart={() => {
            onReviewCartClose?.();
            setView('cart');
          }}
          onOpenTableAccount={onOpenTableAccount}
          onCallWaiter={onCallWaiter}
        />
        <S.Page>
          <S.BackButton
            type="button"
            onClick={() => {
              onReviewCartClose?.();
              setView('menu');
            }}
          >
            <ArrowLeft size={18} /> Voltar ao cardápio
          </S.BackButton>
          <S.TrackingHeading>
            <div>
              <small>ACOMPANHAMENTO DO PEDIDO</small>
              <h1>Acompanhe seu pedido</h1>
              <p>
                {tableOrder ? `Pedido #${tableOrder.publicId} · Mesa ${tableLabel}` : `Mesa ${tableLabel}`}
              </p>
            </div>
          </S.TrackingHeading>
          <S.ProgressRow>
            {['Pedido recebido', 'Em preparo', 'Pronto', 'Entregue na mesa'].map((label, index) => {
              const progress = tableOrder?.progress || 0;
              return (
                <S.ProgressStep key={label} $active={progress >= index + 1}>
                  <span>{progress > index ? <Check size={18} /> : index + 1}</span>
                  <b>{label}</b>
                </S.ProgressStep>
              );
            })}
          </S.ProgressRow>
          <S.TrackingGrid>
            <S.StatusPanel>
              <Utensils />
              <div>
                <h2>{tableOrder?.statusLabel || 'Aguardando atualização'}</h2>
                <p>{tableOrder?.summary || 'Seu pedido aparecerá aqui assim que for confirmado.'}</p>
              </div>
            </S.StatusPanel>
            <S.WaiterPanel>
              <BellRing />
              <div>
                <h3>Precisa de algo?</h3>
                <p>Chame o garçom da sua mesa sem precisar sair do cardápio.</p>
                <S.PrimaryButton type="button" onClick={onCallWaiter}>
                  Chamar garçom
                </S.PrimaryButton>
              </div>
            </S.WaiterPanel>
          </S.TrackingGrid>
          {tableOrder?.items?.length ? (
            <S.OrderItems>
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
            </S.OrderItems>
          ) : null}
        </S.Page>
      </S.Shell>
    );
  }

  if (effectiveView === 'confirmation' && confirmation) {
    return (
      <S.Shell $primary={primary}>
        <Header
          data={data}
          tableLabel={tableLabel}
          cartCount={cartCount}
          query={query}
          setQuery={setQuery}
          onCart={() => setView('cart')}
          onOpenTableAccount={onOpenTableAccount}
          onCallWaiter={onCallWaiter}
        />
        <S.Page>
          <S.ConfirmationHero>
            <S.StatusIcon $success>
              <Check />
            </S.StatusIcon>
            <div>
              <small>PEDIDO CONFIRMADO</small>
              <h1>Pedido #{confirmation.orderId}</h1>
              <p>
                Seu pedido foi recebido pelo restaurante e já foi enviado para a cozinha da mesa{' '}
                {tableLabel}.
              </p>
            </div>
            <S.PaymentPending>
              <Clock3 />
              <div>
                <b>Pagamento pendente</b>
                <span>Você ainda pode pagar agora ou depois.</span>
              </div>
            </S.PaymentPending>
          </S.ConfirmationHero>
          <S.ConfirmationGrid>
            <S.OrderSummary>
              <header>
                <h2>Resumo do pedido</h2>
                <button type="button" onClick={() => setView('tracking')}>
                  Ver detalhes <ChevronRight size={16} />
                </button>
              </header>
              {confirmation.items.map((item) => (
                <article key={item.cartId}>
                  {item.image ? <img src={item.image} alt={item.name} /> : <S.ImagePlaceholder />}
                  <div>
                    <b>{item.name}</b>
                    <small>{item.quantity}x</small>
                  </div>
                  <strong>{brl(item.price * item.quantity)}</strong>
                </article>
              ))}
              <footer>
                <span>Total do pedido</span>
                <strong>{brl(confirmation.total)}</strong>
              </footer>
            </S.OrderSummary>
            <S.PayChoice>
              <WalletCards />
              <h2>Como deseja pagar?</h2>
              <p>O pagamento online é opcional. Você pode pagar agora com PIX ou deixar para depois.</p>
              {accountSnapshot?.capabilities.allowPix ? (
                <S.PrimaryButton type="button" disabled={paymentLoading} onClick={() => void startPix()}>
                  Pagar com PIX agora <ChevronRight size={20} />
                </S.PrimaryButton>
              ) : null}
              <S.SecondaryButton type="button" onClick={() => setView('tracking')}>
                Pagar depois <ChevronRight size={20} />
              </S.SecondaryButton>
              <div className="or">ou</div>
              <S.SecondaryButton type="button" onClick={() => setView('tracking')}>
                Acompanhar pedido <ChevronRight size={20} />
              </S.SecondaryButton>
            </S.PayChoice>
          </S.ConfirmationGrid>
        </S.Page>
      </S.Shell>
    );
  }

  if (effectiveView === 'cart') {
    return (
      <S.Shell $primary={primary}>
        <Header
          data={data}
          tableLabel={tableLabel}
          cartCount={cartCount}
          query={query}
          setQuery={setQuery}
          onCart={() => setView('cart')}
          onOpenTableAccount={onOpenTableAccount}
          onCallWaiter={onCallWaiter}
        />
        <S.Page>
          <S.BackButton type="button" onClick={() => setView('menu')}>
            <ArrowLeft size={18} /> Voltar ao cardápio
          </S.BackButton>
          <S.CartTitle>
            <h1 aria-label="Minha sacola">
              Seu <span>pedido</span>
            </h1>
            <p>Confira os itens do seu pedido para a mesa {tableLabel}.</p>
          </S.CartTitle>
          <S.CartLayout>
            <S.CartList>
              {cart.length === 0 ? (
                <S.EmptyCart>Seu pedido ainda está vazio.</S.EmptyCart>
              ) : (
                cart.map((item) => (
                  <S.CartItem key={item.cartId}>
                    {item.image ? <img src={item.image} alt={item.name} /> : <S.ImagePlaceholder />}
                    <div className="content">
                      <b>{item.name}</b>
                      {item.options?.length ? (
                        <small>{item.options.map((option) => option.name).join(', ')}</small>
                      ) : null}
                      {item.observation ? <small>Obs.: {item.observation}</small> : null}
                      <div className="quantity">
                        <button type="button" onClick={() => item.cartId && onDecrease(item.cartId)}>
                          {item.quantity === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => item.cartId && onIncrease(item.cartId)}>
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <strong>{brl(item.price * item.quantity)}</strong>
                  </S.CartItem>
                ))
              )}
            </S.CartList>
            <S.CheckoutCard>
              <div>
                <Utensils />
                <span>
                  <b>Pedido para Mesa {tableLabel}</b>
                  <small>Os itens serão enviados para a cozinha desta mesa.</small>
                </span>
              </div>
              <S.SummaryLine>
                <span>Subtotal ({cartCount} itens)</span>
                <b>{brl(cartTotal)}</b>
              </S.SummaryLine>
              <S.SummaryTotal>
                <span>Total do pedido</span>
                <strong>{brl(cartTotal)}</strong>
              </S.SummaryTotal>
              <S.PrimaryButton
                type="button"
                aria-label="Enviar pedido para a cozinha"
                disabled={!cart.length || submitting || orderingLocked}
                onClick={() => void submitOrder()}
              >
                {submitting ? 'Enviando pedido...' : 'Finalizar pedido'} <ChevronRight size={20} />
              </S.PrimaryButton>
            </S.CheckoutCard>
          </S.CartLayout>
        </S.Page>
      </S.Shell>
    );
  }

  return (
    <S.Shell $primary={primary}>
      <Header
        data={data}
        tableLabel={tableLabel}
        cartCount={cartCount}
        query={query}
        setQuery={setQuery}
        onCart={() => setView('cart')}
        onOpenTableAccount={onOpenTableAccount}
        onCallWaiter={onCallWaiter}
      />
      <S.Page>
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
          <S.Section>
            <header>
              <h2>Destaques da casa</h2>
              <button type="button" onClick={() => setSelectedCategory('todos')}>Ver todos</button>
            </header>
            <S.ProductGrid>
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} onOpen={() => openProduct(product)} />
              ))}
            </S.ProductGrid>
          </S.Section>
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
          ) : (
            <S.Section>
              <header>
                <h2>{data.categories.find((category) => category.id === selectedCategory)?.name || 'Produtos'}</h2>
              </header>
              <S.ProductGrid>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} onOpen={() => openProduct(product)} />
                ))}
              </S.ProductGrid>
            </S.Section>
          )}
        </div>
      </S.Page>

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
