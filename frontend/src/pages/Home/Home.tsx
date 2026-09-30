import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import { useAppDialog } from '../../components/AppDialog/context';
import { FigmaDeliveryExperience } from './FigmaDeliveryExperience';
import type { FigmaCheckoutStep } from './FigmaCheckoutFlow';
import * as S from './Home.styles';
import {
  useDefaultRestaurantId,
  useResolvedRestaurantId,
  useRestaurantCatalog,
} from './hooks/useRestaurantCatalog';
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
import { GuestAddressCheckout } from '../Home/components/GuestAddressCheckout';
import { AuthenticatedAddressCheckout } from '../Home/components/AuthenticatedAddressCheckout';
import { AuthenticatedEmptyAddressCheckout } from '../Home/components/AuthenticatedEmptyAddressCheckout';
import { FigmaPaymentCheckout } from '../Home/components/FigmaPaymentCheckout';
import { HomePaymentOutcome } from './components/HomePaymentOutcome';
import { HomeFeedback } from '../Home/components/HomeFeedback';
import { useHomeNotifications } from './hooks/useHomeNotifications';
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
  resolveDefaultCheckoutPaymentMethod,
} from './domain/publicSettings';
import { TableServiceActions } from './components/TableServiceActions';
import { useCardPaymentReturn } from './hooks/useCardPaymentReturn';
import { buildLoginUrl } from '../../shared/navigation/authNavigation';
import TableMenuExperience from '../digital-menu/TableMenuExperience';
import type { HomeProduct } from './types';
import { createReadyProductConfiguration, resolveProductEntryKind } from './domain/productEntryFlow';
import { validateDeliveryAddressLocationForCheckout } from './domain/deliveryAddress';

const FigmaCheckoutFlow = lazy(() =>
  import('./FigmaCheckoutFlow').then((module) => ({
    default: module.FigmaCheckoutFlow,
  })),
);

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

type GuestCheckoutDetails = { name: string; cpf?: string; phone?: string };

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
  const { confirmDialog } = useAppDialog();
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
  const [checkoutCustomerPhone, setCheckoutCustomerPhone] = useState(() =>
    String((user as Record<string, unknown> | null)?.phone || ''),
  );
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
  const {
    notifications: notifs,
    notify,
    dismissNotification: dismissNotif,
  } = useHomeNotifications();
  const [tableServiceLoading, setTableServiceLoading] = useState<'WAITER' | 'BILL' | null>(null);
  const [tableOrderLoading, setTableOrderLoading] = useState(false);
  const [tableMenuReviewCartOpen, setTableMenuReviewCartOpen] = useState(false);
  const [crossSellProduct, setCrossSellProduct] = useState<HomeProduct | null>(null);
  const [crossSellCombo, setCrossSellCombo] = useState<HomeProduct | null>(null);
  const [addressValidationLoading, setAddressValidationLoading] = useState(false);

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

  const applyCheckoutCouponCode = useCallback(
    (value: string) => {
      const code = String(value || '').trim().toUpperCase();
      if (!code) return;

      if (!isLoyaltyCustomer) {
        notify(
          'info',
          'Entre para usar seu cupom',
          'Faça login para consultar e aplicar os cupons disponíveis na sua conta.',
        );
        return;
      }

      const match = loyaltyRedemptionEntries(loyalty.summary).find(
        ({ coupon, redemption }) =>
          isUsableLoyaltyRedemption(redemption, loyaltyClock) &&
          String(coupon.code || '').trim().toUpperCase() === code,
      );

      if (!match) {
        notify(
          'warning',
          'Cupom não disponível',
          'Confira o código ou escolha um dos cupons disponíveis na sua conta.',
        );
        return;
      }

      setSelectedRedemptionId(match.redemption.id);
    },
    [isLoyaltyCustomer, loyalty.summary, loyaltyClock, notify],
  );

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
        allowDebitCard: homeData.acceptsDebitCard,
      }),
    [
      allowPayOnDelivery,
      homeData.acceptsCard,
      homeData.acceptsDebitCard,
      homeData.acceptsPix,
      homeData.openFinancePixEnabled,
    ],
  );
  const checkoutChannelAvailable =
    mesaMode ||
    (availableOrderType === 'delivery' ? homeData.acceptsDelivery : homeData.acceptsPickup);
  const defaultCheckoutPaymentMethod =
    resolveDefaultCheckoutPaymentMethod(availablePaymentMethods) ?? paymentMethod;
  const selectedCheckoutPaymentMethod = availablePaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : defaultCheckoutPaymentMethod;
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
    const entryKind = resolveProductEntryKind(product);

    if (entryKind === 'COMBO') {
      setCrossSellCombo(product);
      return;
    }

    if (entryKind === 'READY') {
      addToCart(product.id, createReadyProductConfiguration(product.configurationVersion), 1);
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

    const customer = {
      ...((user || guestCheckoutDetails) as Record<string, unknown>),
      phone: user ? resolvedCheckoutCustomerPhone : guestCheckoutDetails.phone,
    } as Record<string, unknown>;
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

  const continueToPayment = useCallback(
    async (customer: {
      phone?: unknown;
      name?: unknown;
      cpf?: unknown;
      requireGuestIdentity: boolean;
    }) => {
      if (addressValidationLoading) return;

      const issue = validateCheckout({
        type: checkoutOrderType,
        customerPhone: customer.phone,
        customerName: customer.name,
        customerCpf: customer.cpf,
        requireGuestIdentity: customer.requireGuestIdentity,
        deliveryAddress,
        cepStatus,
        paymentMethod: selectedCheckoutPaymentMethod,
      });
      if (issue) {
        notify('warning', issue.title, issue.message);
        return;
      }

      if (availableOrderType === 'delivery') {
        setAddressValidationLoading(true);
        try {
          const validation = await validateDeliveryAddressLocationForCheckout({
            restaurantId,
            address: deliveryAddress,
            resolveLocation: (payload) => ordersService.getDeliveryAddressLocation(payload),
          });
          if (!validation.ok) {
            notify('warning', validation.title, validation.message);
            return;
          }
          if (!validation.verified) {
            const confirmed = await confirmDialog({
              title: validation.title,
              description: `${validation.message} Se os dados estiverem corretos, você pode continuar com o pedido.`,
              confirmLabel: 'Continuar com este endereço',
              cancelLabel: 'Revisar endereço',
            });
            if (!confirmed) return;
            notify(
              'info',
              'Pedido seguirá com o endereço informado',
              'O restaurante receberá o endereço digitado por você mesmo sem a confirmação do mapa.',
            );
          }
        } finally {
          setAddressValidationLoading(false);
        }
      }

      setPaymentMethod(defaultCheckoutPaymentMethod);
      setCheckoutStep('payment');
    },
    [
      addressValidationLoading,
      availableOrderType,
      cepStatus,
      checkoutOrderType,
      confirmDialog,
      defaultCheckoutPaymentMethod,
      deliveryAddress,
      notify,
      restaurantId,
      selectedCheckoutPaymentMethod,
    ],
  );

  const resolvedCheckoutCustomerPhone = checkoutCustomerPhone;

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
    navigate(`/${restaurantSlug}/pedidos`);
  }, [navigate, restaurantSlug, user]);
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
        onLogout={handleLogout}
        whatsappUrl={whatsappUrl}
        whatsappLabel={whatsappLabel}
      />

      {cartOpen ? (
        <Suspense fallback={null}>
          <FigmaCheckoutFlow
          primaryColor={primary}
          brandName={homeData.brand.name}
          logoUrl={homeData.brand.logoUrl}
          isOpen={homeData.isOpen}
          deliveryTime={homeData.deliveryTime}
          userName={user ? String((user as Record<string, unknown>).name || '') : undefined}
          step={checkoutStep}
          cart={cart}
          cartCount={cartCount}
          cartTotal={cartTotal}
          quote={orderQuote.quote}
          loading={checkoutLoading}
          canContinue={
            homeData.isOpen &&
            (checkoutStep !== 'payment' || (checkoutChannelAvailable && paymentAvailable))
          }
          onStepChange={(nextStep) => {
            if (nextStep !== 'cart' && !homeData.isOpen) {
              notify(
                'warning',
                'Restaurante fechado',
                'O restaurante não está recebendo pedidos no momento.',
              );
              return;
            }
            if (nextStep === 'payment') {
              const customer = (user || guestCheckoutDetails) as Record<string, unknown>;
              void continueToPayment({
                phone: customer.phone,
                name: customer.name,
                cpf: customer.cpf,
                requireGuestIdentity: !user,
              });
              return;
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
          onLogin={user ? openProfile : navigateToLogin}
          onSubmit={() => void handleCheckout()}
          recommendations={checkoutRecommendations}
          onAddRecommendation={handleCrossSellAdd}
          guestAddressScreen={
            !user ? (
              <GuestAddressCheckout
                primaryColor={primary}
                restaurantId={restaurantId}
                brandName={homeData.brand.name}
                logoUrl={homeData.brand.logoUrl}
                isOpen={homeData.isOpen}
                deliveryTime={homeData.deliveryTime}
                cartCount={cartCount}
                guestName={guestCheckoutDetails.name}
                onGuestNameChange={(name) =>
                  setGuestCheckoutDetails((current) => ({ ...current, name }))
                }
                guestPhone={guestCheckoutDetails.phone || ''}
                onGuestPhoneChange={(phone) =>
                  setGuestCheckoutDetails((current) => ({ ...current, phone }))
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
                onContinue={() =>
                  void continueToPayment({
                    phone: guestCheckoutDetails.phone,
                    name: guestCheckoutDetails.name,
                    cpf: guestCheckoutDetails.cpf,
                    requireGuestIdentity: true,
                  })
                }
                disabled={!homeData.isOpen || !checkoutChannelAvailable}
                loading={orderQuote.loading || addressValidationLoading}
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
                restaurantId={restaurantId}
                brandName={homeData.brand.name}
                logoUrl={homeData.brand.logoUrl}
                userName={String((user as Record<string, unknown>).name || '')}
                customerPhone={resolvedCheckoutCustomerPhone}
                onCustomerPhoneChange={setCheckoutCustomerPhone}
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
                  void continueToPayment({
                    phone: resolvedCheckoutCustomerPhone,
                    name: customer.name,
                    cpf: customer.cpf,
                    requireGuestIdentity: false,
                  });
                }}
                disabled={!homeData.isOpen || !checkoutChannelAvailable}
                loading={orderQuote.loading || addressValidationLoading}
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
                restaurantId={restaurantId}
                brandName={homeData.brand.name}
                logoUrl={homeData.brand.logoUrl}
                userName={String((user as Record<string, unknown>).name || 'Cliente').split(' ')[0]}
                customerPhone={resolvedCheckoutCustomerPhone}
                onCustomerPhoneChange={setCheckoutCustomerPhone}
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
                onContinue={() =>
                  void continueToPayment({
                    phone: resolvedCheckoutCustomerPhone,
                    name: user.name,
                    cpf: user.cpf,
                    requireGuestIdentity: false,
                  })
                }
                disabled={!homeData.isOpen || !checkoutChannelAvailable}
                loading={orderQuote.loading || addressValidationLoading}
              />
            ) : undefined
          }
          paymentScreen={
            <FigmaPaymentCheckout
              primaryColor={primary}
              loggedIn={Boolean(user)}
              brandName={homeData.brand.name}
              logoUrl={homeData.brand.logoUrl}
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
                  allowDebitCard={homeData.acceptsDebitCard}
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
          onApplyCouponCode={applyCheckoutCouponCode}
          couponContent={
            <LoyaltyCouponPanel
              loggedIn={isLoyaltyCustomer}
              loading={loyalty.loading}
              error={loyalty.error}
              summary={loyalty.summary}
              selectedRedemptionId={appliedRedemptionId}
              redeemingCouponId={loyalty.redeemingCouponId}
              onSelect={(redemptionId) => setSelectedRedemptionId(redemptionId)}
              onLogin={navigateToLogin}
              onRetry={() => void loyalty.refresh()}
              onRedeem={(couponId) => void loyalty.redeem(couponId)}
            />
          }
          />
        </Suspense>
      ) : null}

      {crossSellProduct ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}

      {crossSellCombo ? (
        <Suspense fallback={null}>
          <ComboConfigurator
            product={crossSellCombo}
            primaryColor={primary}
            onClose={() => setCrossSellCombo(null)}
            onConfirm={(configuration) => {
              addToCart(crossSellCombo.id, configuration, 1);
              setCrossSellCombo(null);
            }}
          />
        </Suspense>
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
