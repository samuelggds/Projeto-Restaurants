import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import { FigmaDeliveryExperience } from './FigmaDeliveryExperience';
import { FigmaCheckoutFlow, type FigmaCheckoutStep } from './FigmaCheckoutFlow';
import * as S from './Home.styles';
import {
  useDefaultRestaurantId,
  useResolvedRestaurantId,
  useRestaurantCatalog,
} from './hooks/useRestaurantCatalog';
import { useFavorites } from './hooks/useFavorites';
import { useCart } from './hooks/useCart';
import { useDeliveryAddress } from './hooks/useDeliveryAddress';
import { getCheckoutErrorMessage, useCheckoutPayments } from './hooks/useCheckoutPayments';
import { useTableSession } from './hooks/useTableSession';
import { useTableAccount } from './hooks/useTableAccount';
import { useTableOrderNotice } from './hooks/useTableOrderNotice';
import { buildHomeData } from '../Home/adapters/homeDataAdapter';
import { TableAccessGate } from './components/TableAccessGate';
import { PaymentOptions } from '../Home/components/PaymentOptions';
import { LoyaltyCouponPanel } from '../Home/components/LoyaltyCouponPanel';
import { ProductConfigurator } from '../Home/components/ProductConfigurator';
import { ComboConfigurator } from '../Home/components/ComboConfigurator';
import { GuestAddressCheckout } from '../Home/components/GuestAddressCheckout';
import { AuthenticatedAddressCheckout } from '../Home/components/AuthenticatedAddressCheckout';
import { AuthenticatedEmptyAddressCheckout } from '../Home/components/AuthenticatedEmptyAddressCheckout';
import { FigmaPaymentCheckout } from '../Home/components/FigmaPaymentCheckout';
import { HomePaymentOutcome } from './components/HomePaymentOutcome';
import { HomeFeedback, type HomeNotification } from '../Home/components/HomeFeedback';
import {
  buildOrderPayload,
  resolveOrderType,
  validateCheckout,
  type CheckoutPaymentMethod,
} from './domain/checkout';
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
import { useCardPaymentReturn } from './hooks/useCardPaymentReturn';
import { buildLoginUrl } from '../../shared/navigation/authNavigation';
import TableMenuExperience from '../digital-menu/TableMenuExperience';
import type { HomeProduct } from './types';

type GuestCheckoutDetails = {
  name: string;
  cpf?: string;
  phone?: string;
};

type NotifType = 'success' | 'error' | 'info' | 'warning';
type HomeNavigationState = {
  openCart?: boolean;
  openSearch?: boolean;
  loyaltyRedemptionId?: number;
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableNumber: routeTableNumber, restaurantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [availabilityClock, setAvailabilityClock] = useState(() => new Date());
  const navigateToLogin = useCallback(
    () =>
      navigate(
        buildLoginUrl({
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        }),
      ),
    [location.hash, location.pathname, location.search, navigate],
  );

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
  const [checkoutStep, setCheckoutStep] = useState<FigmaCheckoutStep>('cart');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('pix');
  const [guestCheckoutDetails, setGuestCheckoutDetails] = useState<GuestCheckoutDetails>({
    name: '',
    cpf: '',
    phone: '',
  });
  const {
    deliveryAddress,
    setDeliveryAddress,
    cepStatus,
    cepMessage,
    handleCepLookup,
    handleCepChange,
    savedAddresses,
    savedAddressesLoading,
    selectedAddressId,
    handleSavedAddressChange,
  } = useDeliveryAddress(user);
  const [notifs, setNotifs] = useState<HomeNotification[]>([]);
  const [tableServiceLoading, setTableServiceLoading] = useState<'WAITER' | 'BILL' | null>(null);
  const [tableOrderLoading, setTableOrderLoading] = useState(false);
  const [tableMenuReviewCartOpen, setTableMenuReviewCartOpen] = useState(false);
  const [crossSellProduct, setCrossSellProduct] = useState<HomeProduct | null>(null);
  const [crossSellCombo, setCrossSellCombo] = useState<HomeProduct | null>(null);

  useEffect(() => {
    if (!cartOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setCartOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [cartOpen]);
  const notify = useCallback(
    (
      type: NotifType,
      title: string,
      msg?: string,
      duration = 3500,
      action?: HomeNotification['action'],
    ) => {
      const id = Date.now();
      setNotifs((prev) => {
        const current =
          action === 'open-cart' ? prev.filter((item) => item.action !== action) : prev;
        const duplicate = current.some(
          (notification) =>
            notification.title === title &&
            notification.msg === msg &&
            notification.action === action,
        );
        if (duplicate) return current;
        return [...current.slice(-2), { id, type, title, msg, visible: false, action }];
      });
      requestAnimationFrame(() =>
        setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, visible: true } : n))),
      );
      setTimeout(() => {
        setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, visible: false } : n)));
        setTimeout(() => setNotifs((prev) => prev.filter((n) => n.id !== id)), 400);
      }, duration);
    },
    [],
  );

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

  const authenticatedRestaurantId =
    Number((user as { restaurantId?: number })?.restaurantId) || null;
  const rememberedRestaurantId = Number(localStorage.getItem('menuRestaurantId')) || null;
  const defaultRestaurantId = useDefaultRestaurantId(
    !mesaMode &&
      !normalizedSlug &&
      !authenticatedRestaurantId &&
      !rememberedRestaurantId &&
      !storedSessionRestaurantId,
  );
  const restaurantId = mesaMode
    ? routeRestaurantId || storedSessionRestaurantId || resolvedRestaurantId || null
    : normalizedSlug
      ? resolvedRestaurantId
      : authenticatedRestaurantId ||
        rememberedRestaurantId ||
        storedSessionRestaurantId ||
        defaultRestaurantId ||
        null;
  const activeTableId =
    routeTableId || (mesaSessionIsActive ? Number(tableSession?.tableId || 0) : 0) || null;

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

  const requireFavoriteLogin = navigateToLogin;
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

  const catalogHomeData = useMemo(
    () =>
      buildHomeData(backendProducts, settings, new Date(), {
        allowImageFallbacks: false,
        useLegacyBannerCopy: false,
      }),
    [backendProducts, settings],
  );
  const homeIsOpen = useMemo(
    () =>
      getRestaurantAvailability(
        catalogHomeData.businessHours,
        catalogHomeData.isOpenForOrders,
        availabilityClock,
      ).isOpen,
    [availabilityClock, catalogHomeData.businessHours, catalogHomeData.isOpenForOrders],
  );
  const homeData = useMemo(
    () =>
      homeIsOpen === catalogHomeData.isOpen
        ? catalogHomeData
        : { ...catalogHomeData, isOpen: homeIsOpen },
    [catalogHomeData, homeIsOpen],
  );

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
  const rawCardReturnStatus = String(searchParams.get('cardCheckoutStatus') || '').toLowerCase();
  const cardProviderReturnStatus = ['success', 'pending', 'cancel'].includes(rawCardReturnStatus)
    ? rawCardReturnStatus
    : '';
  const cardReturnOrderPublicId = String(searchParams.get('orderPublicId') || '').trim();
  const hasCardPaymentReturn = Boolean(cardProviderReturnStatus && cardReturnOrderPublicId);
  const allowPayOnDelivery = !mesaMode && availableOrderType === 'delivery';
  const availablePaymentMethods = useMemo(
    () =>
      getAvailablePaymentMethods({
        allowPayOnDelivery,
        allowPix: homeData.acceptsPix,
        allowOpenFinancePix: homeData.openFinancePixEnabled,
        allowCard: homeData.acceptsCard,
      }),
    [allowPayOnDelivery, homeData.acceptsCard, homeData.acceptsPix, homeData.openFinancePixEnabled],
  );
  const checkoutChannelAvailable =
    mesaMode ||
    (availableOrderType === 'delivery' ? homeData.acceptsDelivery : homeData.acceptsPickup);
  const selectedCheckoutPaymentMethod = availablePaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : (availablePaymentMethods[0] ?? paymentMethod);
  const paymentAvailable = availablePaymentMethods.length > 0;
  const tableAccountEnabled = tableAccount.snapshot?.capabilities.enabled === true;
  const orderQuote = useOrderQuote({
    restaurantId: checkoutChannelAvailable ? restaurantId : null,
    type: checkoutOrderType,
    cart,
    deliveryAddress,
    couponRedemptionId: appliedRedemptionId,
  });
  const checkoutTotal = orderQuote.quote?.total ?? cartTotal;
  const checkoutRecommendations = useMemo(() => {
    const cartProductIds = new Set(cart.map((item) => String(item.productId)));
    return homeData.products
      .filter((product) => product.available && !cartProductIds.has(String(product.id)))
      .slice(0, 3);
  }, [cart, homeData.products]);

  const handleCrossSellAdd = (product: HomeProduct) => {
    if (product.kind === 'COMBO') {
      setCrossSellCombo(product);
      return;
    }

    if (product.saleMode === 'COMPLETE') {
      addToCart(
        product.id,
        {
          selectedOptions: [],
          selectedOptionIds: [],
          observation: '',
          configurationVersion: product.configurationVersion,
        },
        1,
      );
      return;
    }

    setCrossSellProduct(product);
  };

  function applyPurchasedStockToHome() {
    const purchased = new Map<string, number>();

    cart.forEach((item) => {
      const homeProduct = homeData.products.find(
        (product) => String(product.id) === String(item.productId),
      );
      if (homeProduct?.kind === 'COMBO') {
        (item.comboSelections || []).forEach((selection) => {
          const group = (homeProduct.comboGroups || []).find(
            (candidate) => candidate.id === selection.groupId,
          );
          selection.items.forEach((selectedItem) => {
            const option = group?.options.find(
              (candidate) => candidate.id === selectedItem.optionId,
            );
            if (!option) return;
            const quantity = Number(selectedItem.quantity) * Number(item.quantity);
            purchased.set(
              String(option.productId),
              (purchased.get(String(option.productId)) || 0) + quantity,
            );
          });
        });
        return;
      }

      purchased.set(
        String(item.productId),
        (purchased.get(String(item.productId)) || 0) + Number(item.quantity),
      );
    });

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
          active: nextStock > 0 ? product.active : false,
        };
      }),
    );
  }

  const {
    checkoutLoading,
    pixPaymentData,
    pixPaymentStatus,
    pixPaymentError,
    verifyPixPayment,
    clearPixPayment,
    paymentResult,
    clearPaymentResult,
    executePayment,
  } = useCheckoutPayments({
    restaurantId,
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
    onPixPaymentCreated: ({ orderPublicId }) => {
      if (!restaurantSlug || mesaMode) return;
      navigate(`/${restaurantSlug}/pedido/${orderPublicId}/pagamento`);
    },
    onActivePaymentExists: ({ orderPublicId, paymentMethod }) => {
      if (!['PIX', 'CARTAO'].includes(paymentMethod) || !restaurantSlug || mesaMode) return;
      navigate(`/${restaurantSlug}/pedido/${orderPublicId}/pagamento`);
    },
    onClearCart: () => setCart([]),
    onCloseCart: () => setCartOpen(false),
  });

  const cardPaymentReturn = useCardPaymentReturn({
    restaurantId,
    orderPublicId: hasCardPaymentReturn ? cardReturnOrderPublicId : '',
    orderType: checkoutOrderType,
    providerReturnStatus: cardProviderReturnStatus,
    onPaymentConfirmed: async () => {
      await loyalty.refresh();
      if (mesaMode) {
        await tableAccount.refresh({ silent: true });
        await refreshTableOrder();
      }
    },
  });

  const closeCardPaymentReturn = useCallback(() => {
    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.delete('cardCheckoutStatus');
    nextSearch.delete('orderPublicId');
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch.toString() ? `?${nextSearch.toString()}` : '',
        hash: location.hash,
      },
      { replace: true },
    );
  }, [location.hash, location.pathname, navigate, searchParams]);

  async function handleCheckout() {
    if (tableClosingRequested) {
      notify(
        'warning',
        'Conta já solicitada',
        'Novos pedidos estão bloqueados. Confira e pague os itens que já estão na conta.',
      );
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
        'Este restaurante ainda não aceita este tipo de pagamento para este pedido.',
      );
      return;
    }

    const customer = (user || guestCheckoutDetails) as Record<string, unknown>;
    const type = checkoutOrderType;

    const issue = validateCheckout({
      type,
      customerPhone: customer.phone,
      customerName: customer.name,
      customerCpf: customer.cpf,
      requireGuestIdentity: !user,
      deliveryAddress,
      cepStatus,
      paymentMethod: selectedCheckoutPaymentMethod,
    });
    if (issue) {
      notify('warning', issue.title, issue.message);
      return;
    }

    if (mesaMode) {
      await addOrderToTableAccount();
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
      void loyalty.refresh();
      await tableAccount.refresh({ silent: true });
      await refreshTableOrder();
      notify(
        'success',
        `Pedido #${String(order?.id || '')} enviado para a cozinha`,
        'A cozinha recebeu seu pedido. Você pode acompanhar o preparo e escolher quando pagar.',
        5000,
      );
      return order;
    } catch (error: unknown) {
      notify(
        'error',
        'Não foi possível enviar o pedido',
        getCheckoutErrorMessage(error) || 'Tente novamente em alguns instantes.',
      );
      return null;
    } finally {
      setTableOrderLoading(false);
    }
  }

  const primary = homeData.brand.primaryColor || '#d64d08';
  const whatsappUrl = buildWhatsAppUrl(
    homeData.brand.whatsapp,
    homeData.brand.whatsappDefaultMessage,
  );
  const whatsappLabel =
    homeData.brand.whatsappDisplayName || homeData.brand.name || 'Atendimento do restaurante';
  const openMenu = useCallback(() => {
    const menu = document.getElementById('cardapio');
    if (!menu) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    menu.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, []);

  const manageDeliveryAddresses = useCallback(() => {
    if (!user) {
      navigateToLogin();
      return;
    }

    if (String(user.role || '').toUpperCase() !== 'CLIENTE') {
      notify(
        'info',
        'Endereços de entrega são do cliente',
        'Entre com uma conta de cliente para cadastrar um endereço de entrega.',
      );
      return;
    }

    navigate('/profile?view=addresses&newAddress=1');
  }, [navigate, navigateToLogin, notify, user]);

  const selectDeliveryAddress = useCallback(
    (addressId: string) => {
      handleSavedAddressChange(addressId);
      notify(
        'success',
        'Endereço selecionado',
        'Este endereço será usado automaticamente no carrinho.',
      );
    },
    [handleSavedAddressChange, notify],
  );
  const openHomeCart = useCallback(() => {
    setCheckoutStep('cart');
    setCartOpen(true);
  }, []);
  const openProfile = useCallback(() => {
    if (user) {
      navigate('/profile');
      return;
    }
    navigateToLogin();
  }, [navigate, navigateToLogin, user]);
  const openOrders = useCallback(() => {
    if (user) {
      navigate('/profile?view=orders');
      return;
    }
    navigateToLogin();
  }, [navigate, navigateToLogin, user]);
  const openAdmin = useCallback(() => navigate('/admin'), [navigate]);
  const handleLogout = useCallback(() => logout(), [logout]);

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

  if (hasCardPaymentReturn || paymentResult || pixPaymentData) {
    return (
      <HomePaymentOutcome
        hasCardPaymentReturn={hasCardPaymentReturn}
        cardPaymentReturn={cardPaymentReturn}
        paymentResult={paymentResult}
        pixPaymentData={pixPaymentData}
        pixPaymentStatus={pixPaymentStatus}
        pixPaymentError={pixPaymentError}
        primaryColor={primary}
        homeData={homeData}
        restaurantId={restaurantId}
        visitor={!user}
        onCloseCardPaymentReturn={closeCardPaymentReturn}
        onClearPaymentResult={clearPaymentResult}
        onVerifyPixPayment={verifyPixPayment}
        onClearPixPayment={clearPixPayment}
        onTrackOrder={(orderId) => navigate('/orders/' + orderId + '/tracking')}
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

  if (mesaMode) {
    const applyTableCouponCode = (rawCode: string) => {
      const code = rawCode.trim().toLocaleUpperCase('pt-BR');
      if (!code) return;

      const match = loyaltyRedemptionEntries(loyalty.summary).find(
        ({ coupon, redemption }) =>
          coupon.code.trim().toLocaleUpperCase('pt-BR') === code &&
          isUsableLoyaltyRedemption(redemption, loyaltyClock),
      );

      if (!match) {
        notify(
          'warning',
          'Cupom indisponível',
          isLoyaltyCustomer
            ? 'Este cupom não está disponível na sua carteira ou já expirou.'
            : 'Entre com sua conta de cliente para usar um cupom disponível na sua carteira.',
        );
        return;
      }

      setSelectedRedemptionId(match.redemption.id);
      notify('success', 'Cupom aplicado', `O cupom ${match.coupon.code} foi aplicado ao pedido.`);
    };

    const createPixPaymentForOrder = async (orderPublicId: string) => {
      const snapshot = await tableAccount.refresh({ silent: true });
      if (!snapshot?.capabilities.allowPix) {
        notify(
          'warning',
          'PIX indisponível',
          'Este restaurante não habilitou pagamento PIX online para a mesa.',
        );
        return null;
      }

      const billItemPublicIds = snapshot.items
        .filter(
          (item) =>
            item.orderPublicId === orderPublicId &&
            item.orderedByParticipantPublicId === snapshot.currentParticipantPublicId &&
            item.availableCents > 0,
        )
        .map((item) => item.publicId);

      if (!billItemPublicIds.length) {
        notify(
          'warning',
          'Pagamento indisponível',
          'Os itens deste pedido ainda não estão disponíveis para pagamento.',
        );
        return null;
      }

      const result = await tableAccount.createPayment({
        selectionMode: 'SELECTED_ITEMS',
        method: 'PIX',
        billItemPublicIds,
        includeOptionalServiceFee: false,
      });
      return result?.payment || null;
    };

    return (
      <TableMenuExperience
        data={homeData}
        tableLabel={mesaLabel}
        cart={cart}
        cartTotal={cartTotal}
        orderingLocked={tableClosingRequested}
        tableOrder={tableOrder}
        accountSnapshot={tableAccount.snapshot}
        activePayment={tableAccount.snapshot?.activePayment || null}
        paymentLoading={tableAccount.actionLoading}
        waiterCallEnabled={tableSession?.waiterCallEnabled !== false}
        billRequestEnabled={tableSession?.billRequestEnabled !== false}
        onAddProduct={addToCart}
        onIncrease={increaseCart}
        onDecrease={decreaseCart}
        onSubmitOrder={addOrderToTableAccount}
        onCallWaiter={() => void requestTableService('WAITER')}
        onRequestBill={() => void requestTableService('BILL')}
        onCreatePixPayment={createPixPaymentForOrder}
        onReconcilePayment={tableAccount.reconcilePayment}
        onCancelPayment={tableAccount.cancelPayment}
        couponCode={orderQuote.quote?.couponCode || null}
        couponDiscount={orderQuote.quote?.couponDiscount || 0}
        onApplyCouponCode={applyTableCouponCode}
        reviewCartOpen={tableMenuReviewCartOpen}
        onReviewCartClose={() => setTableMenuReviewCartOpen(false)}
      />
    );
  }

  return (
    <S.HomeExperience $fontFamily={homeData.fontFamily} $primary={primary} $tableMenu={mesaMode}>
      <FigmaDeliveryExperience
        data={homeData}
        cartCount={tableClosingRequested ? 0 : cartCount}
        cart={tableClosingRequested ? [] : cart}
        cartTotal={tableClosingRequested ? 0 : cartTotal}
        initialSearchOpen={Boolean(navigationState?.openSearch)}
        userName={user ? String((user as Record<string, unknown>).name || '') : undefined}
        userEmail={user ? String((user as Record<string, unknown>).email || '') : undefined}
        userAvatar={user ? String((user as Record<string, unknown>).avatar || '') : undefined}
        userLoggedIn={!!user}
        isAdmin={user?.role === 'ADMIN'}
        isTableMenu={mesaMode}
        orderingLocked={tableClosingRequested}
        tableLabel={mesaMode ? mesaLabel : undefined}
        favoriteProductIds={!mesaMode && user?.role === 'CLIENTE' ? favoriteProductIds : undefined}
        savedAddresses={savedAddresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={selectDeliveryAddress}
        onManageAddresses={manageDeliveryAddresses}
        onOpenCart={openHomeCart}
        onOpenMenu={openMenu}
        onOpenProfile={mesaMode ? undefined : openProfile}
        onOpenOrders={mesaMode ? undefined : openOrders}
        onOpenAdmin={openAdmin}
        onAddProduct={tableClosingRequested ? () => undefined : addToCart}
        onToggleFavorite={mesaMode ? undefined : toggleFavorite}
        onLogout={handleLogout}
        whatsappUrl={whatsappUrl}
        whatsappLabel={whatsappLabel}
      />

      {cartOpen ? (
        <FigmaCheckoutFlow
          primaryColor={primary}
          brandName={homeData.brand.name}
          logoUrl={homeData.brand.logoUrl}
          isOpen={homeData.isOpen}
          deliveryTime={homeData.deliveryTime}
          step={checkoutStep}
          cart={cart}
          cartCount={cartCount}
          cartTotal={cartTotal}
          quote={orderQuote.quote}
          loading={checkoutLoading}
          canContinue={
            checkoutStep !== 'payment' || (checkoutChannelAvailable && paymentAvailable)
          }
          onStepChange={(nextStep) => {
            if (nextStep === 'payment') {
              const customer = (user || guestCheckoutDetails) as Record<string, unknown>;
              const issue = validateCheckout({
                type: checkoutOrderType,
                customerPhone: customer.phone,
                customerName: customer.name,
                customerCpf: customer.cpf,
                requireGuestIdentity: false,
                deliveryAddress,
                cepStatus,
                paymentMethod: selectedCheckoutPaymentMethod,
              });
              if (issue) {
                notify('warning', issue.title, issue.message);
                return;
              }
            }
            setCheckoutStep(nextStep);
          }}
          onIncrease={increaseCart}
          onDecrease={decreaseCart}
          onRemove={(cartId) =>
            setCart((current) =>
              current.filter((item) => (item.cartId || item.productId) !== cartId),
            )
          }
          onClear={() => setCart([])}
          onClose={() => setCartOpen(false)}
          onSubmit={() => void handleCheckout()}
          recommendations={checkoutRecommendations}
          onAddRecommendation={handleCrossSellAdd}
          guestAddressScreen={
            !user ? (
              <GuestAddressCheckout
                primaryColor={primary}
                brandName={homeData.brand.name}
                logoUrl={homeData.brand.logoUrl}
                isOpen={homeData.isOpen}
                deliveryTime={homeData.deliveryTime}
                cartCount={cartCount}
                guestName={guestCheckoutDetails.name}
                onGuestNameChange={(name) =>
                  setGuestCheckoutDetails((current) => ({ ...current, name }))
                }
                total={checkoutTotal}
                deliveryFee={orderQuote.quote?.deliveryFeeAmount || 0}
                orderType={availableOrderType}
                allowDelivery={homeData.acceptsDelivery}
                allowPickup={homeData.acceptsPickup}
                address={deliveryAddress}
                setAddress={setDeliveryAddress}
                cepStatus={cepStatus}
                cepMessage={cepMessage}
                onCepChange={handleCepChange}
                onCepLookup={handleCepLookup}
                onOrderTypeChange={setOrderType}
                onLogin={navigateToLogin}
                onBack={() => setCheckoutStep('cart')}
                onContinue={() => setCheckoutStep('payment')}
                disabled={!checkoutChannelAvailable}
                loading={orderQuote.loading}
              />
            ) : undefined
          }
          authenticatedEmptyAddressScreen={
            user &&
            String(user.role || '').toUpperCase() === 'CLIENTE' &&
            !savedAddressesLoading &&
            savedAddresses.length === 0 ? (
              <AuthenticatedEmptyAddressCheckout
                primaryColor={primary}
                brandName={homeData.brand.name}
                logoUrl={homeData.brand.logoUrl}
                userName={String((user as Record<string, unknown>).name || '')}
                isOpen={homeData.isOpen}
                deliveryTime={homeData.deliveryTime}
                cart={cart}
                cartCount={cartCount}
                subtotal={
                  orderQuote.quote
                    ? orderQuote.quote.itemsSubtotal + orderQuote.quote.productDiscountTotal
                    : cartTotal
                }
                total={checkoutTotal}
                deliveryFee={orderQuote.quote?.deliveryFeeAmount || 0}
                orderType={availableOrderType}
                allowDelivery={homeData.acceptsDelivery}
                allowPickup={homeData.acceptsPickup}
                address={deliveryAddress}
                setAddress={setDeliveryAddress}
                cepStatus={cepStatus}
                cepMessage={cepMessage}
                onCepChange={handleCepChange}
                onCepLookup={handleCepLookup}
                onOrderTypeChange={setOrderType}
                onRegisterAddress={manageDeliveryAddresses}
                onBack={() => setCheckoutStep('cart')}
                onContinue={() => {
                  const customer = user as Record<string, unknown>;
                  const issue = validateCheckout({
                    type: checkoutOrderType,
                    customerPhone: customer.phone,
                    customerName: customer.name,
                    customerCpf: customer.cpf,
                    requireGuestIdentity: false,
                    deliveryAddress,
                    cepStatus,
                    paymentMethod: selectedCheckoutPaymentMethod,
                  });
                  if (issue) {
                    notify('warning', issue.title, issue.message);
                    return;
                  }
                  setCheckoutStep('payment');
                }}
                disabled={!checkoutChannelAvailable}
                loading={orderQuote.loading}
              />
            ) : undefined
          }
          authenticatedAddressScreen={
            user &&
            String(user.role || '').toUpperCase() === 'CLIENTE' &&
            !savedAddressesLoading &&
            savedAddresses.length > 0 ? (
              <AuthenticatedAddressCheckout
                primaryColor={primary}
                brandName={homeData.brand.name}
                logoUrl={homeData.brand.logoUrl}
                userName={String((user as Record<string, unknown>).name || 'Cliente').split(' ')[0]}
                isOpen={homeData.isOpen}
                deliveryTime={homeData.deliveryTime}
                cart={cart}
                cartCount={cartCount}
                subtotal={
                  orderQuote.quote
                    ? orderQuote.quote.itemsSubtotal + orderQuote.quote.productDiscountTotal
                    : cartTotal
                }
                total={checkoutTotal}
                deliveryFee={orderQuote.quote?.deliveryFeeAmount || 0}
                orderType={availableOrderType}
                allowDelivery={homeData.acceptsDelivery}
                allowPickup={homeData.acceptsPickup}
                savedAddresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                address={deliveryAddress}
                setAddress={setDeliveryAddress}
                cepStatus={cepStatus}
                cepMessage={cepMessage}
                onCepChange={handleCepChange}
                onCepLookup={handleCepLookup}
                onOrderTypeChange={setOrderType}
                onSelectAddress={selectDeliveryAddress}
                onManageAddresses={manageDeliveryAddresses}
                onBack={() => setCheckoutStep('cart')}
                onContinue={() => {
                  const issue = validateCheckout({
                    type: checkoutOrderType,
                    customerPhone: user.phone,
                    customerName: user.name,
                    customerCpf: user.cpf,
                    requireGuestIdentity: false,
                    deliveryAddress,
                    cepStatus,
                    paymentMethod: selectedCheckoutPaymentMethod,
                  });
                  if (issue) {
                    notify('warning', issue.title, issue.message);
                    return;
                  }
                  setCheckoutStep('payment');
                }}
                disabled={!checkoutChannelAvailable}
                loading={orderQuote.loading}
              />
            ) : undefined
          }
          paymentScreen={
            <FigmaPaymentCheckout
              primaryColor={primary}
              loggedIn={Boolean(user)}
              brandName={homeData.brand.name}
              cart={cart}
              cartCount={cartCount}
              subtotal={
                orderQuote.quote
                  ? orderQuote.quote.itemsSubtotal + orderQuote.quote.productDiscountTotal
                  : cartTotal
              }
              deliveryFee={orderQuote.quote?.deliveryFeeAmount || 0}
              total={checkoutTotal}
              paymentMethods={
                <PaymentOptions
                  paymentMethod={selectedCheckoutPaymentMethod}
                  allowPayOnDelivery={allowPayOnDelivery}
                  allowPix={homeData.acceptsPix}
                  allowOpenFinancePix={homeData.openFinancePixEnabled}
                  allowCard={homeData.acceptsCard}
                  restaurantId={restaurantId}
                  loggedIn={Boolean(user)}
                  userEmail={user ? String((user as Record<string, unknown>).email || '') : undefined}
                  onChange={setPaymentMethod}
                  figmaCheckout
                />
              }
              onBack={() => setCheckoutStep('address')}
              onContinue={() => void handleCheckout()}
              disabled={!checkoutChannelAvailable || !paymentAvailable}
              loading={checkoutLoading}
            />
          }
          couponContent={
            <LoyaltyCouponPanel
              loggedIn={isLoyaltyCustomer}
              loading={loyalty.loading}
              error={loyalty.error}
              summary={loyalty.summary}
              selectedRedemptionId={appliedRedemptionId}
              redeemingCouponId={loyalty.redeemingCouponId}
              onSelect={setSelectedRedemptionId}
              onLogin={navigateToLogin}
              onRetry={() => void loyalty.refresh()}
              onRedeem={(couponId) => void loyalty.redeem(couponId)}
            />
          }
        />
      ) : null}

      {crossSellProduct ? (
        <ProductConfigurator
          product={crossSellProduct}
          primaryColor={primary}
          enableProductQuantity
          onClose={() => setCrossSellProduct(null)}
          onConfirm={(configuration, quantity) => {
            addToCart(crossSellProduct.id, configuration, quantity || 1);
            setCrossSellProduct(null);
          }}
        />
      ) : null}

      {crossSellCombo ? (
        <ComboConfigurator
          product={crossSellCombo}
          primaryColor={primary}
          onClose={() => setCrossSellCombo(null)}
          onConfirm={(configuration) => {
            addToCart(crossSellCombo.id, configuration, 1);
            setCrossSellCombo(null);
          }}
        />
      ) : null}

      <HomeFeedback
        notifications={notifs}
        onDismissNotification={dismissNotif}
        onOpenCart={openHomeCart}
      />
      {mesaMode && tableSession ? (
        <TableServiceActions
          tableNumber={mesaLabel}
          waiterEnabled={tableSession.waiterCallEnabled !== false}
          loading={tableServiceLoading}
          onCallWaiter={() => void requestTableService('WAITER')}
        />
      ) : null}
    </S.HomeExperience>
  );
}
