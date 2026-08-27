import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PanelBottomClose, PanelBottomOpen } from 'lucide-react';
import { useAuth } from '../../contexts/authContext';
import { HomePage } from './HomePage';
import PixPaymentPanel from '../Cart/components/PixPaymentPanel';
import * as S from './Home.styles';
import { useResolvedRestaurantId, useRestaurantCatalog } from './hooks/useRestaurantCatalog';
import { useFavorites } from './hooks/useFavorites';
import { useCart } from './hooks/useCart';
import { useDeliveryAddress } from './hooks/useDeliveryAddress';
import { getCheckoutErrorMessage, useCheckoutPayments } from './hooks/useCheckoutPayments';
import { useTableSession } from './hooks/useTableSession';
import { useTableAccount } from './hooks/useTableAccount';
import { useActiveOrderNotice } from './hooks/useActiveOrderNotice';
import { useTableOrderNotice } from './hooks/useTableOrderNotice';
import { buildHomeData } from '../Home/adapters/homeDataAdapter';
import { TableAccessGate } from './components/TableAccessGate';
import { CartItemsList } from '../Home/components/CartItemsList';
import { DeliveryAddressForm } from '../Home/components/DeliveryAddressForm';
import { PaymentOptions } from '../Home/components/PaymentOptions';
import { DeliveryMethodSelector } from '../Home/components/DeliveryMethodSelector';
import { CartCheckoutSummary } from '../Home/components/CartCheckoutSummary';
import { LoyaltyCouponPanel } from '../Home/components/LoyaltyCouponPanel';
import { HomeFeedback, type HomeNotification } from '../Home/components/HomeFeedback';
import {
  buildOrderPayload,
  resolveOrderType,
  validateCheckout,
  type CheckoutPaymentMethod,
} from './domain/checkout';
import { ActiveOrderNotice } from './components/ActiveOrderNotice';
import { TableOrderStatusNotice } from './components/TableOrderStatusNotice';
import { LoyaltyProgramCard } from './components/LoyaltyProgramCard';
import { WhatsAppIcon } from './components/SocialBrandIcons';
import ordersService from '../../Services/ordersService';
import waiterCallsService from '../../Services/waiterCallsService';
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
import { TableServiceActions } from './components/TableServiceActions';
import { TableOrderContinuationModal } from './components/TableOrderContinuationModal';
import { TableAccountPanel } from './components/TableAccountPanel';

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
  const [tableServiceLoading, setTableServiceLoading] = useState<'WAITER' | 'BILL' | null>(null);
  const [tableOrderLoading, setTableOrderLoading] = useState(false);
  const [tableContinuationOpen, setTableContinuationOpen] = useState(false);
  const [tableAccountOpen, setTableAccountOpen] = useState(false);
  const [floatingActionsCollapsed, setFloatingActionsCollapsed] = useState(() =>
    /\/mesa\/\d+(?:\/|$)/.test(window.location.pathname),
  );
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const customerId = user?.role === 'CLIENTE' ? (user as { id?: number | string }).id : null;

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
    tableSession,
    sessionEndedMessage,
    mesaLabel,
    hasValidQrContext,
    mesaSessionIsActive,
    storedSessionRestaurantId,
    markClosingRequested,
  } = useTableSession({
    tableNumber: routeTableNumber,
    restaurantId: searchParams.get('restaurantId') || searchParams.get('rid'),
    tableToken: searchParams.get('tk') || searchParams.get('token'),
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
  const activeTableId =
    routeTableId || (mesaSessionIsActive ? Number(tableSession?.tableId || 0) : 0) || null;

  const { activeOrder, refreshActiveOrder } = useActiveOrderNotice(mesaMode ? null : customerId);
  const { tableOrder, refreshTableOrder } = useTableOrderNotice({
    enabled: mesaMode && mesaSessionIsActive,
    sessionKey: tableSession?.sessionPublicId || tableSession?.sessionId || activeTableId,
    sessionToken: tableSession?.sessionToken,
  });

  const tableClosingRequested = Boolean(
    mesaMode &&
    (tableSession?.sessionStatus === 'CLOSING_REQUESTED' ||
      tableSession?.tableOrderingEnabled === false),
  );

  const tableAccount = useTableAccount({
    enabled: mesaMode && mesaSessionIsActive,
    sessionPublicId: tableSession?.sessionPublicId,
    sessionToken: tableSession?.sessionToken,
    notify,
  });
  const { refresh: refreshTableAccount } = tableAccount;

  const openTableAccount = useCallback(() => {
    setTableAccountOpen(true);
    void refreshTableAccount();
  }, [refreshTableAccount]);

  useEffect(() => {
    if (!tableClosingRequested || !tableSession?.sessionPublicId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setCartOpen(false);
      setTableContinuationOpen(false);
      openTableAccount();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openTableAccount, tableClosingRequested, tableSession?.sessionPublicId]);

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
  const tableAccountEnabled = tableAccount.snapshot?.capabilities.enabled === true;
  const tableCheckoutPaymentMethod = selectedCheckoutPaymentMethod === 'card' ? 'card' : 'pix';
  const tableCheckoutUnavailable = Boolean(
    mesaMode && !tableAccount.loading && !tableAccountEnabled && !paymentAvailable,
  );

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
        if (mesaMode) void tableAccount.refresh({ silent: true });
      },
      onPaymentConfirmed: async () => {
        await loyalty.refresh();
        if (mesaMode) await tableAccount.refresh({ silent: true });
      },
      onClearCart: () => setCart([]),
      onCloseCart: () => setCartOpen(false),
    });

  async function handleCheckout() {
    if (tableClosingRequested) {
      notify(
        'warning',
        'Conta já solicitada',
        'Novos pedidos estão bloqueados. Confira e pague os itens que já estão na conta.',
      );
      openTableAccount();
      return;
    }
    if (!restaurantId || !cart.length || checkoutLoading) return;

    if (mesaMode && !activeTableId) {
      notify(
        'error',
        'Mesa não identificada',
        'Escaneie novamente o QR Code oficial desta mesa antes de enviar o pedido.',
      );
      return;
    }

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

    if (!mesaMode && !paymentAvailable) {
      notify(
        'warning',
        'Serviço indisponível',
        'O restaurante ainda não configurou os pagamentos para este pedido.',
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

    if (mesaMode) {
      setTableContinuationOpen(true);
      return;
    }

    const { payload, payOnDelivery, resolvedPaymentMethod } = buildOrderPayload({
      restaurantId,
      type,
      paymentMethod: selectedCheckoutPaymentMethod,
      cart,
      tableId: activeTableId,
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

  async function addOrderToTableAccount() {
    if (!restaurantId || !cart.length || tableOrderLoading || !tableAccountEnabled) return;
    const customer = (user || {}) as Record<string, unknown>;
    const { payload } = buildOrderPayload({
      restaurantId,
      type: 'MESA',
      settlementMode: 'TABLE_ACCOUNT',
      cart,
      tableId: activeTableId,
      customer,
      deliveryAddress,
      couponRedemptionId: appliedRedemptionId,
    });

    setTableOrderLoading(true);
    try {
      const order = await ordersService.createOrder(payload);
      applyPurchasedStockToHome();
      setSelectedRedemptionId(null);
      setCart([]);
      setCartOpen(false);
      setTableContinuationOpen(false);
      void loyalty.refresh();
      await tableAccount.refresh({ silent: true });
      await refreshTableOrder();
      notify(
        'success',
        `Pedido #${String(order?.id || '')} adicionado à mesa`,
        'A cozinha recebeu o pedido. Você pode dividir e pagar pela conta da mesa depois.',
        5000,
      );
    } catch (error: unknown) {
      notify(
        'error',
        'Não foi possível adicionar à conta',
        getCheckoutErrorMessage(error) || 'Escolha pagar agora ou tente novamente.',
      );
    } finally {
      setTableOrderLoading(false);
    }
  }

  async function payTableOrderNow() {
    if (!restaurantId || !cart.length || checkoutLoading || !paymentAvailable) return;
    const customer = (user || {}) as Record<string, unknown>;
    const { payload, payOnDelivery, resolvedPaymentMethod } = buildOrderPayload({
      restaurantId,
      type: 'MESA',
      settlementMode: 'PAY_NOW',
      paymentMethod: tableCheckoutPaymentMethod,
      cart,
      tableId: activeTableId,
      customer,
      deliveryAddress,
      couponRedemptionId: appliedRedemptionId,
    });
    const succeeded = await executePayment(
      payload,
      tableCheckoutPaymentMethod,
      payOnDelivery,
      resolvedPaymentMethod,
    );
    if (succeeded) setTableContinuationOpen(false);
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

  async function requestTableService(type: 'WAITER' | 'BILL') {
    const sessionToken = String(tableSession?.sessionToken || '').trim();
    if (!sessionToken || tableServiceLoading) {
      notify(
        'warning',
        'Mesa sem atendimento ativo',
        'Peça ao garçom para abrir a mesa e escaneie o QR Code novamente.',
      );
      return;
    }

    try {
      setTableServiceLoading(type);
      const call = await waiterCallsService.createCall(type, sessionToken);
      const duplicate = call?.duplicate === true;
      notify(
        'success',
        type === 'WAITER' ? 'Garçom avisado' : 'Conta solicitada',
        duplicate
          ? 'Este aviso já está na fila de atendimento.'
          : type === 'WAITER'
            ? 'Seu chamado apareceu em tempo real no painel do salão.'
            : 'O garçom recebeu o pedido da conta em tempo real.',
      );
      if (type === 'BILL') {
        markClosingRequested();
        openTableAccount();
      }
    } catch (error: unknown) {
      const typed = error as { response?: { data?: { error?: string } }; message?: string };
      notify(
        'error',
        'Não foi possível enviar o aviso',
        typed.response?.data?.error || typed.message || 'Tente novamente em alguns instantes.',
      );
    } finally {
      setTableServiceLoading(null);
    }
  }

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
        invalidTitle={hasValidQrContext ? 'Mesa aguardando abertura' : undefined}
        invalidMessage={
          sessionEndedMessage ||
          (hasValidQrContext
            ? 'O atendimento desta mesa não está ativo. Peça ao garçom para abri-la e tente novamente.'
            : undefined)
        }
        tableLabel={mesaLabel}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // ── Main render
  return (
    <S.HomeExperience $fontFamily={homeData.fontFamily} $primary={primary} $tableMenu={mesaMode}>
      <HomePage
        data={homeData}
        cartCount={tableClosingRequested ? 0 : cartCount}
        userName={user ? String((user as Record<string, unknown>).name || '') : undefined}
        userEmail={user ? String((user as Record<string, unknown>).email || '') : undefined}
        userLoggedIn={!!user}
        isAdmin={user?.role === 'ADMIN'}
        isTableMenu={mesaMode}
        orderingLocked={tableClosingRequested}
        tableLabel={mesaMode ? mesaLabel : undefined}
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
        onOpenCart={() => (tableClosingRequested ? openTableAccount() : setCartOpen(true))}
        onOpenTableAccount={openTableAccount}
        onOpenProfile={() => navigate('/profile')}
        onOpenAdmin={() => navigate('/admin')}
        onAddProduct={
          tableClosingRequested
            ? () => {
                openTableAccount();
              }
            : addToCart
        }
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

            {cart.length > 0 && !mesaMode && (
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
            loading={checkoutLoading || tableOrderLoading}
            paymentMethod={selectedCheckoutPaymentMethod}
            isRestaurantOpen={homeData.isOpen}
            checkoutButtonLabel={mesaMode ? 'Revisar e continuar' : undefined}
            checkoutBlockedMessage={
              tableClosingRequested
                ? 'Conta solicitada: novos pedidos bloqueados'
                : !checkoutChannelAvailable
                  ? 'Canal indisponível'
                  : tableCheckoutUnavailable
                    ? 'Pagamento indisponível'
                    : !mesaMode && !paymentAvailable
                      ? 'Serviço indisponível'
                      : undefined
            }
            onCheckout={() => void handleCheckout()}
          />
        </S.CartFoot>
      </S.CartDrawer>

      <TableOrderContinuationModal
        open={tableContinuationOpen}
        accountEnabled={tableAccountEnabled}
        accountLoading={tableAccount.loading}
        payNowAvailable={paymentAvailable}
        allowPix={availablePaymentMethods.includes('pix')}
        allowCard={availablePaymentMethods.includes('card')}
        paymentMethod={tableCheckoutPaymentMethod}
        busy={checkoutLoading || tableOrderLoading}
        onPaymentMethodChange={setPaymentMethod}
        onChooseAccount={() => void addOrderToTableAccount()}
        onChoosePayNow={() => void payTableOrderNow()}
        onClose={() => setTableContinuationOpen(false)}
      />

      <TableAccountPanel
        open={tableAccountOpen}
        tableNumber={mesaLabel}
        snapshot={tableAccount.snapshot}
        loading={tableAccount.loading}
        actionLoading={tableAccount.actionLoading}
        error={tableAccount.error}
        onRefresh={() => void tableAccount.refresh()}
        onCreatePayment={tableAccount.createPayment}
        onCancelPayment={tableAccount.cancelPayment}
        onClose={() => setTableAccountOpen(false)}
      />

      <HomeFeedback
        showLoginNudge={showLoginNudge}
        notifications={notifs}
        onLogin={() => navigate('/login')}
        onDismissNudge={() => setNudgeDismissed(true)}
        onDismissNotification={dismissNotif}
      />
      <S.FloatingActions $aboveNudge={showLoginNudge} $primary={primary}>
        {mesaMode && (
          <S.FloatingActionsToggle
            type="button"
            aria-expanded={!floatingActionsCollapsed}
            aria-label={
              floatingActionsCollapsed
                ? 'Abrir cupons, status do pedido e avisos da mesa'
                : 'Minimizar cupons, status do pedido e avisos da mesa'
            }
            onClick={() => setFloatingActionsCollapsed((collapsed) => !collapsed)}
          >
            {floatingActionsCollapsed ? <PanelBottomOpen /> : <PanelBottomClose />}
            <span>{floatingActionsCollapsed ? 'Cupons e status' : 'Minimizar'}</span>
          </S.FloatingActionsToggle>
        )}
        {!floatingActionsCollapsed && (
          <>
            {mesaMode && tableSession && (
              <TableServiceActions
                tableNumber={mesaLabel}
                waiterEnabled={tableSession.waiterCallEnabled !== false}
                billEnabled={tableSession.billRequestEnabled !== false && !tableClosingRequested}
                accountEnabled={Boolean(tableSession.sessionPublicId)}
                loading={tableServiceLoading}
                onCallWaiter={() => void requestTableService('WAITER')}
                onRequestBill={() => void requestTableService('BILL')}
                onOpenAccount={openTableAccount}
              />
            )}
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
            {mesaMode ? (
              <TableOrderStatusNotice
                primaryColor={primary}
                tableLabel={mesaLabel}
                order={tableOrder}
              />
            ) : (
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
            )}
          </>
        )}
      </S.FloatingActions>
    </S.HomeExperience>
  );
}
