import { useState, useCallback } from 'react';
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
import { HomeFeedback, type HomeNotification } from '../home/components/HomeFeedback';
import {
  buildOrderPayload,
  resolveOrderType,
  validateCheckout,
  type CheckoutPaymentMethod,
} from './domain/checkout';
import { ActiveOrderNotice } from './components/ActiveOrderNotice';
import ordersService from '../../Services/ordersService';

type NotifType = 'success' | 'error' | 'info' | 'warning';
export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableNumber: routeTableNumber, restaurantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();

  const normalizedSlug = String(restaurantSlug || '')
    .trim()
    .toLowerCase();
  const resolvedRestaurantId = useResolvedRestaurantId(normalizedSlug);
  const [cartOpen, setCartOpen] = useState(() =>
    Boolean((location.state as { openCart?: boolean } | null)?.openCart),
  );
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

  const homeData = buildHomeData(backendProducts, settings);

  const { cart, setCart, addToCart, increaseCart, decreaseCart, cartCount, cartTotal } = useCart(
    homeData.products,
    notify,
  );
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
      cartTotal,
      notify,
      onPurchased: applyPurchasedStockToHome,
      onClearCart: () => setCart([]),
      onCloseCart: () => setCartOpen(false),
    });

  async function handleCheckout() {
    if (!restaurantId || !cart.length || checkoutLoading) return;

    if (!homeData.isOpen) {
      notify(
        'warning',
        'Restaurante fechado',
        'O restaurante não está recebendo pedidos no momento.',
      );
      return;
    }

    const customer = (user || {}) as Record<string, unknown>;
    const type = resolveOrderType(mesaMode, orderType);

    if (!mesaMode && !user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const issue = validateCheckout({
      type,
      customerPhone: customer.phone,
      deliveryAddress,
      cepStatus,
      paymentMethod,
    });
    if (issue) {
      notify('warning', issue.title, issue.message);
      return;
    }

    const { payload, payOnDelivery, resolvedPaymentMethod } = buildOrderPayload({
      restaurantId,
      type,
      paymentMethod,
      cart,
      tableId: routeTableId,
      customer,
      deliveryAddress,
    });

    await executePayment(payload, paymentMethod, payOnDelivery, resolvedPaymentMethod);
  }

  const primary = homeData.brand.primaryColor || '#d64d08';

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
    <>
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
                value={orderType}
                onChange={(nextType) => {
                  setOrderType(nextType);
                  if (nextType === 'pickup' && paymentMethod.startsWith('delivery_')) {
                    setPaymentMethod('pix');
                  }
                }}
              />
            )}

            {cart.length > 0 && !mesaMode && orderType === 'delivery' && (
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
              <PaymentOptions
                paymentMethod={paymentMethod}
                allowPayOnDelivery={!mesaMode && orderType === 'delivery'}
                onChange={setPaymentMethod}
              />
            )}
          </S.CartOptions>

          <CartCheckoutSummary
            count={cartCount}
            total={cartTotal}
            loading={checkoutLoading}
            paymentMethod={paymentMethod}
            isRestaurantOpen={homeData.isOpen}
            onCheckout={() => void handleCheckout()}
          />
        </S.CartFoot>
      </S.CartDrawer>


      <HomeFeedback
        showLoginNudge={!user && !mesaMode && !nudgeDismissed}
        notifications={notifs}
        onLogin={() => navigate('/login')}
        onDismissNudge={() => setNudgeDismissed(true)}
        onDismissNotification={dismissNotif}
      />
      <ActiveOrderNotice
        order={activeOrder}
        onTrack={(orderId) => navigate(`/orders/${orderId}/tracking`)}
        onConfirmDelivery={async (orderId) => {
          await ordersService.confirmDeliveryReceived(orderId);
          await refreshActiveOrder();
          notify('success', 'Recebimento confirmado', 'A cozinha e o restaurante foram avisados.');
        }}
      />
    </>
  );
}
