import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import { HomePage } from './HomePage';
import PixPaymentPanel from '../Cart/components/PixPaymentPanel';
import * as S from './Home.styles';
import { useResolvedRestaurantId, useRestaurantCatalog } from './hooks/useRestaurantCatalog';
import { useFavorites } from './hooks/useFavorites';
import { useCart } from './hooks/useCart';
import { useDeliveryAddress } from './hooks/useDeliveryAddress';
import { useCheckoutPayments } from './hooks/useCheckoutPayments';
import { useTableSession } from './hooks/useTableSession';
import { useActiveOrderNotice } from './hooks/useActiveOrderNotice';
import { buildHomeData } from '../home/adapters/homeDataAdapter';
import { TableAccessGate } from '../home/components/TableAccessGate';
import { CartItemsList } from '../home/components/CartItemsList';
import { DeliveryAddressForm } from '../home/components/DeliveryAddressForm';
import { PaymentOptions } from '../home/components/PaymentOptions';
import { DeliveryMethodSelector } from '../home/components/DeliveryMethodSelector';
import { CartCheckoutSummary } from '../home/components/CartCheckoutSummary';
import { LoyaltyCouponPanel } from '../home/components/LoyaltyCouponPanel';
import { HomeFeedback, type HomeNotification } from '../home/components/HomeFeedback';
import {
  buildOrderPayload,
  resolveOrderType,
  validateCheckout,
  type CheckoutPaymentMethod,
} from './domain/checkout';
import { ActiveOrderNotice } from './components/ActiveOrderNotice';
import { LoyaltyProgramCard } from './components/LoyaltyProgramCard';
import { WhatsAppIcon } from './components/SocialBrandIcons';
import ordersService from '../../Services/ordersService';
import { useLoyaltyRewards } from './hooks/useLoyaltyRewards';
import { useOrderQuote } from './hooks/useOrderQuote';
import { isUsableLoyaltyRedemption, loyaltyRedemptionEntries } from './domain/loyaltyRedemption';
import { useLoyaltyExpirationClock } from './hooks/useLoyaltyExpirationClock';
import { getRestaurantAvailability } from '../admin/domain/businessHours';
import {
  applyHomeSeoMetadata,
  buildWhatsAppUrl,
  getAvailablePaymentMethods,
  resolveAvailableFulfillmentMethod,
} from './domain/publicSettings';

type NotifType = 'success' | 'error' | 'info' | 'warning';
type HomeNavigationState = {
  openCart?: boolean;
  loyaltyRedemptionId?: number;
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableNumber: routeTableNumber, restaurantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [availabilityClock, setAvailabilityClock] = useState(() => new Date());

  useEffect(() => {
    const refreshAvailability = () => setAvailabilityClock(new Date());
    const intervalId = window.setInterval(refreshAvailability, 30_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshAvailability();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const normalizedSlug = String(restaurantSlug || '')
    .trim()
    .toLowerCase();
  const resolvedRestaurantId = useResolvedRestaurantId(normalizedSlug);
  const navigationState = (location.state as HomeNavigationState | null) || null;
  const [cartOpen, setCartOpen] = useState(() => Boolean(navigationState?.openCart));
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('pix');
  const {
    deliveryAddress,
    setDeliveryAddress,
    cepStatus,
    cepMessage,
    handleCepLookup,
    handleCepChange,
    savedAddresses,
    selectedAddressId,
    handleSavedAddressChange,
  } = useDeliveryAddress(user);
  const [notifs, setNotifs] = useState<HomeNotification[]>([]);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const customerId = user?.role === 'CLIENTE' ? (user as { id?: number | string }).id : null;
  const { activeOrder, refreshActiveOrder } = useActiveOrderNotice(customerId);

  // ── Notification system (defined early so useEffects can use it)
  const notify = useCallback((type: NotifType, title: string, msg?: string, duration = 3500) => {
    const id = Date.now();
    setNotifs((prev) => {
      const duplicate = prev.some(
        (notification) => notification.title === title && notification.msg === msg,
      );
      if (duplicate) return prev;
      return [...prev.slice(-3), { id, type, title, msg, visible: false }];
    });
    requestAnimationFrame(() =>
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, visible: true } : n))),
    );
    setTimeout(() => {
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, visible: false } : n)));
      setTimeout(() => setNotifs((prev) => prev.filter((n) => n.id !== id)), 400);
    }, duration);
  }, []);

  function dismissNotif(id: number) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, visible: false } : n)));
    setTimeout(() => setNotifs((prev) => prev.filter((n) => n.id !== id)), 400);
  }

  const {
    routeRestaurantId,
    routeTableId,
    mesaMode,
    tablePin,
    setTablePin,
    pinError,
    isPinValidating,
    mesaLabel,
    hasValidQrContext,
    mesaSessionIsActive,
    storedSessionRestaurantId,
    handleValidateTablePin,
  } = useTableSession({
    tableNumber: routeTableNumber,
    restaurantId: searchParams.get('restaurantId') || searchParams.get('rid'),
    restaurantSlug: normalizedSlug,
    tableId: searchParams.get('tableId') || searchParams.get('tid'),
    notify,
  });

  const restaurantId = mesaMode
    ? routeRestaurantId || storedSessionRestaurantId || resolvedRestaurantId || null
    : normalizedSlug
      ? resolvedRestaurantId
      : (user as { restaurantId?: number })?.restaurantId ||
        Number(localStorage.getItem('menuRestaurantId')) ||
        storedSessionRestaurantId ||
        null;

  const requireFavoriteLogin = useCallback(() => {
    navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }, [navigate]);
  const { favoriteProductIds, toggleFavorite } = useFavorites({
    user,
    restaurantId,
    onRequireLogin: requireFavoriteLogin,
    onAdded: () =>
      notify(
        'success',
        'Adicionado aos favoritos',
        'Você pode encontrar este produto em Favoritos no seu perfil.',
      ),
    onRemoved: () => notify('info', 'Removido dos favoritos'),
    onError: () =>
      notify(
        'error',
        'Não foi possível atualizar os favoritos',
        'Tente novamente em alguns instantes.',
      ),
  });
  const handleCatalogError = useCallback(
    (message?: string) => {
      notify('error', 'Erro ao carregar cardápio', message);
    },
    [notify],
  );
  const {
    products: backendProducts,
    setProducts: setBackendProducts,
    settings,
  } = useRestaurantCatalog({
    restaurantId,
    slug: normalizedSlug,
    onError: handleCatalogError,
  });

  const homeData = buildHomeData(backendProducts, settings, availabilityClock);

  useEffect(
    () => applyHomeSeoMetadata(document, homeData.seoTitle, homeData.seoDescription),
    [homeData.seoDescription, homeData.seoTitle],
  );

  const availableOrderType = resolveAvailableFulfillmentMethod(
    orderType,
    homeData.acceptsDelivery,
    homeData.acceptsPickup,
  );

  const { cart, setCart, addToCart, increaseCart, decreaseCart, cartCount, cartTotal } = useCart(
    homeData.products,
    notify,
    restaurantId,
  );
  const isLoyaltyCustomer = user?.role === 'CLIENTE';
  const loyalty = useLoyaltyRewards({
    restaurantId,
    enabled: isLoyaltyCustomer,
    notify,
  });
  const loyaltyClock = useLoyaltyExpirationClock(loyalty.summary);
  const [selectedRedemptionId, setSelectedRedemptionId] = useState<number | null>(() => {
    const redemptionId = Number(navigationState?.loyaltyRedemptionId || 0);
    return Number.isInteger(redemptionId) && redemptionId > 0 ? redemptionId : null;
  });
  const availableRedemptionIds = useMemo(
    () =>
      new Set(
        loyaltyRedemptionEntries(loyalty.summary)
          .filter(({ redemption }) => isUsableLoyaltyRedemption(redemption, loyaltyClock))
          .map(({ redemption }) => redemption.id),
      ),
    [loyalty.summary, loyaltyClock],
  );
  const appliedRedemptionId =
    selectedRedemptionId && availableRedemptionIds.has(selectedRedemptionId)
      ? selectedRedemptionId
      : null;
  const checkoutOrderType = resolveOrderType(mesaMode, availableOrderType);
  const allowPayOnDelivery = !mesaMode && availableOrderType === 'delivery';
  const availablePaymentMethods = useMemo(
    () =>
      getAvailablePaymentMethods({
        allowPayOnDelivery,
        allowPix: homeData.acceptsPix,
        allowCard: homeData.acceptsCard,
      }),
    [allowPayOnDelivery, homeData.acceptsCard, homeData.acceptsPix],
  );
  const checkoutChannelAvailable =
    mesaMode ||
    (availableOrderType === 'delivery' ? homeData.acceptsDelivery : homeData.acceptsPickup);
  const selectedCheckoutPaymentMethod = availablePaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : (availablePaymentMethods[0] ?? paymentMethod);
  const paymentAvailable = availablePaymentMethods.length > 0;

  const orderQuote = useOrderQuote({
    restaurantId: checkoutChannelAvailable ? restaurantId : null,
    type: checkoutOrderType,
    cart,
    couponRedemptionId: appliedRedemptionId,
  });
  const checkoutTotal = orderQuote.quote?.total ?? cartTotal;
  function applyPurchasedStockToHome() {
    const purchased = new Map(cart.map((item) => [String(item.productId), Number(item.quantity)]));
    setBackendProducts((products) =>
      products.map((product) => {
        const quantity = purchased.get(String(product.id));
        if (!quantity || product.stock === null || product.stock === undefined) {
          return product;
        }
        const nextStock = Math.max(Number(product.stock) - quantity, 0);
        return {
          ...product,
          stock: nextStock,
        };
      }),
    );
  }

  const { checkoutLoading, pixPaymentData, setPixPaymentData, executePayment } =
    useCheckoutPayments({
      restaurantId,
      pixProvider: settings?.pixProvider,
      cartTotal: checkoutTotal,
      notify,
      onPurchased: () => {
        applyPurchasedStockToHome();
        setSelectedRedemptionId(null);
        void loyalty.refresh();
      },
      onPaymentConfirmed: loyalty.refresh,
      onClearCart: () => setCart([]),
      onCloseCart: () => setCartOpen(false),
    });

  async function handleCheckout() {
    if (!restaurantId || !cart.length || checkoutLoading) return;

    const currentAvailability = getRestaurantAvailability(
      homeData.businessHours,
      homeData.isOpenForOrders ?? homeData.isOpen,
    );
    if (!currentAvailability.isOpen) {
      notify(
        'warning',
        'Restaurante fechado',
        'O restaurante não está recebendo pedidos no momento.',
      );
      return;
    }

    if (!checkoutChannelAvailable) {
      notify(
        'warning',
        'Canal indisponível',
        availableOrderType === 'delivery'
          ? 'O restaurante não está aceitando pedidos para delivery.'
          : 'O restaurante não está aceitando pedidos para retirada.',
      );
      return;
    }

    if (!paymentAvailable) {
      notify(
        'warning',
        'Pagamento indisponível',
        'O restaurante não disponibilizou uma forma de pagamento para este pedido.',
      );
      return;
    }

    const customer = (user || {}) as Record<string, unknown>;
    const type = checkoutOrderType;

    if (!mesaMode && !user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const issue = validateCheckout({
      type,
      customerPhone: customer.phone,
      deliveryAddress,
      cepStatus,
      paymentMethod: selectedCheckoutPaymentMethod,
    });
    if (issue) {
      notify('warning', issue.title, issue.message);
      return;
    }

    const { payload, payOnDelivery, resolvedPaymentMethod } = buildOrderPayload({
      restaurantId,
      type,
      paymentMethod: selectedCheckoutPaymentMethod,
      cart,
      tableId: routeTableId,
      customer,
      deliveryAddress,
      couponRedemptionId: appliedRedemptionId,
    });

    await executePayment(
      payload,
      selectedCheckoutPaymentMethod,
      payOnDelivery,
      resolvedPaymentMethod,
    );
  }

  const primary = homeData.brand.primaryColor || '#d64d08';
  const whatsappUrl = buildWhatsAppUrl(
    homeData.brand.whatsapp,
    homeData.brand.whatsappDefaultMessage,
  );
  const whatsappLabel =
    homeData.brand.whatsappDisplayName || homeData.brand.name || 'Atendimento do restaurante';
  const showLoginNudge = !user && !mesaMode && !nudgeDismissed;
  const loyaltyProgram =
    user?.role && !isLoyaltyCustomer
      ? undefined
      : {
          primaryColor: primary,
          loading: loyalty.loading,
          error: loyalty.error,
          summary: loyalty.summary,
          loggedIn: isLoyaltyCustomer,
          redeemingCouponId: loyalty.redeemingCouponId,
          onLogin: () => navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`),
          onRetry: () => void loyalty.refresh(),
          onRedeem: (couponId: number) => void loyalty.redeem(couponId),
        };

  if (pixPaymentData) {
    return (
      <PixPaymentPanel
        pixPaymentData={pixPaymentData}
        formatCurrency={(value) =>
          value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        }
        onCopyPixKey={() => navigator.clipboard.writeText(pixPaymentData.pixCode)}
        onBackToCart={() => setPixPaymentData(null)}
      />
    );
  }

  if (mesaMode && (!hasValidQrContext || !mesaSessionIsActive)) {
    return (
      <TableAccessGate
        primaryColor={primary}
        invalidQr={!hasValidQrContext}
        tableLabel={mesaLabel}
        pin={tablePin}
        pinError={pinError}
        validating={isPinValidating}
        onPinChange={setTablePin}
        onSubmit={handleValidateTablePin}
      />
    );
  }

  // ── Main render
  return (
    <S.HomeExperience $fontFamily={homeData.fontFamily} $primary={primary}>
      <HomePage
        data={homeData}
        cartCount={cartCount}
        userName={user ? String((user as Record<string, unknown>).name || '') : undefined}
        userEmail={user ? String((user as Record<string, unknown>).email || '') : undefined}
        userLoggedIn={!!user}
        isAdmin={user?.role === 'ADMIN'}
        favoriteProductIds={user?.role === 'CLIENTE' ? favoriteProductIds : []}
        savedAddresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={(addressId) => {
          handleSavedAddressChange(addressId);
          notify(
            'success',
            'Endereço selecionado',
            'Este endereço será usado automaticamente no carrinho.',
          );
        }}
        onOpenCart={() => setCartOpen(true)}
        onOpenProfile={() => navigate('/profile')}
        onOpenAdmin={() => navigate('/admin')}
        onAddProduct={addToCart}
        onToggleFavorite={toggleFavorite}
        onLogout={() => {
          logout();
        }}
        onSelectCategory={() => {
          /* handled inside HomePage */
        }}
      />

      {/* ── Cart drawer */}
      <S.CartOverlay
        $open={cartOpen}
        onClick={() => setCartOpen(false)}
        aria-label="Fechar sacola"
      />
      <S.CartDrawer $open={cartOpen}>
        <S.CartHead>
          <div className="cart-title">
            <h2>Minha sacola</h2>
            <small>
              {cartCount === 0
                ? 'Nenhum item'
                : `${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            </small>
          </div>
          <button type="button" onClick={() => setCartOpen(false)} aria-label="Fechar">
            ×
          </button>
        </S.CartHead>

        <CartItemsList items={cart} onIncrease={increaseCart} onDecrease={decreaseCart} />

        <S.CartFoot>
          <S.CartOptions>
            {cart.length > 0 && !mesaMode && (
              <DeliveryMethodSelector
                value={availableOrderType}
                allowDelivery={homeData.acceptsDelivery}
                allowPickup={homeData.acceptsPickup}
                onChange={setOrderType}
              />
            )}

            {cart.length > 0 && !mesaMode && availableOrderType === 'delivery' && (
              <DeliveryAddressForm
                address={deliveryAddress}
                setAddress={setDeliveryAddress}
                cepStatus={cepStatus}
                cepMessage={cepMessage}
                onCepChange={handleCepChange}
                onCepLookup={handleCepLookup}
              />
            )}

            {cart.length > 0 && (
              <LoyaltyCouponPanel
                loggedIn={isLoyaltyCustomer}
                loading={loyalty.loading}
                error={loyalty.error}
                summary={loyalty.summary}
                selectedRedemptionId={appliedRedemptionId}
                redeemingCouponId={loyalty.redeemingCouponId}
                onSelect={setSelectedRedemptionId}
                onLogin={() =>
                  navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`)
                }
                onRetry={() => void loyalty.refresh()}
                onRedeem={(couponId) => void loyalty.redeem(couponId)}
              />
            )}

            {cart.length > 0 && (
              <PaymentOptions
                paymentMethod={selectedCheckoutPaymentMethod}
                allowPayOnDelivery={allowPayOnDelivery}
                allowPix={homeData.acceptsPix}
                allowCard={homeData.acceptsCard}
                onChange={setPaymentMethod}
              />
            )}
          </S.CartOptions>

          <CartCheckoutSummary
            count={cartCount}
            total={cartTotal}
            quote={orderQuote.quote}
            quoteLoading={orderQuote.loading}
            quoteError={orderQuote.error}
            loading={checkoutLoading}
            paymentMethod={selectedCheckoutPaymentMethod}
            isRestaurantOpen={homeData.isOpen}
            checkoutBlockedMessage={
              !checkoutChannelAvailable
                ? 'Canal indisponível'
                : !paymentAvailable
                  ? 'Pagamento indisponível'
                  : undefined
            }
            onCheckout={() => void handleCheckout()}
          />
        </S.CartFoot>
      </S.CartDrawer>

      <HomeFeedback
        showLoginNudge={showLoginNudge}
        notifications={notifs}
        onLogin={() => navigate('/login')}
        onDismissNudge={() => setNudgeDismissed(true)}
        onDismissNotification={dismissNotif}
      />
      <S.FloatingActions $aboveNudge={showLoginNudge} $primary={primary}>
        {whatsappUrl && (
          <S.Whatsapp
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Falar com ${whatsappLabel} no WhatsApp`}
            title={`Falar com ${whatsappLabel}`}
          >
            <WhatsAppIcon size={24} />
          </S.Whatsapp>
        )}
        {loyaltyProgram && <LoyaltyProgramCard loyalty={loyaltyProgram} />}
        <ActiveOrderNotice
          primaryColor={primary}
          order={activeOrder}
          onTrack={(orderId) => navigate(`/orders/${orderId}/tracking`)}
          onConfirmDelivery={async (orderId) => {
            await ordersService.confirmDeliveryReceived(orderId);
            await refreshActiveOrder();
            notify(
              'success',
              'Recebimento confirmado',
              'A cozinha e o restaurante foram avisados.',
            );
          }}
        />
      </S.FloatingActions>
    </S.HomeExperience>
  );
}
