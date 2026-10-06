import { useOrderHistory } from '../../hooks/useOrderHistory';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../Services/api';
import ordersService, { getGuestOwnedOrderProofs } from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { acquireSocket } from '../../Services/socketService';
import loyaltyService from '../../Services/loyaltyService';
import customerAddressService, {
  type CustomerAddressInput,
} from '../../Services/customerAddressService';
import { useAuth } from '../../contexts/authContext';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { FigmaAccountExperience } from './FigmaAccountExperience';
import { buildOrderSummary, buildProfileData } from '../Profile/adapters/profileDataAdapter';
import { AddressModal } from './components/AddressModal';
import { buildReorderCart, findOrderByDisplayId } from '../Profile/domain/reorderCart';
import { readJsonStorage } from '../../shared/storage/jsonStorage';
import type { CartItem } from '../Home/hooks/useCart';
import type { LoyaltySummary } from '../Home/types';
import { resolveProfileView } from './domain/profileView';
import {
  buildProfileRestaurantHomePath,
  buildProfileRestaurantMenuPath,
} from './domain/profileRestaurantNavigation';
import {
  OrderSupportDialog,
  type OrderSupportOrder,
} from '../../features/order-support/OrderSupportDialog';
import { resizeProfileAvatar } from '../../utils/profileAvatar';

export default function Profile() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeOrders, setActiveOrders] = useState<Record<string, unknown>[]>([]);
  const history = useOrderHistory({ mine: true, refreshSignal: user?.id });
  const refreshHistory = history.refresh;
  const orders = useMemo(
    () => [...activeOrders, ...(history.orders as Record<string, unknown>[])],
    [activeOrders, history.orders],
  );
  const [addresses, setAddresses] = useState<Record<string, unknown>[]>([]);
  const [supportOpen, setSupportOpen] = useState(() => searchParams.get('support') === '1');
  const [supportOrderId, setSupportOrderId] = useState<number | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(
    () => searchParams.get('newAddress') === '1',
  );
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [loyaltySummary, setLoyaltySummary] = useState<LoyaltySummary | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState('');
  const [loyaltyRedeemingCouponId, setLoyaltyRedeemingCouponId] = useState<number | null>(null);
  const loyaltyRequestSequence = useRef(0);
  const guestClaimAttemptedRef = useRef(false);
  const [localAvatar, setLocalAvatar] = useState('');
  const avatarUrl = localAvatar || String((user as Record<string, unknown>)?.avatar || '');
  const restaurantId = useMemo(() => {
    const authUser = (user as Record<string, unknown> | null) || {};
    const restaurant = (authUser.restaurant as Record<string, unknown> | null) || {};
    const resolved = Number(
      authUser.restaurantId ||
        restaurant.id ||
        restaurant.restaurantId ||
        localStorage.getItem('menuRestaurantId') ||
        0,
    );
    return Number.isInteger(resolved) && resolved > 0 ? resolved : null;
  }, [user]);

  const loadLoyaltyWallet = useCallback(async () => {
    const requestId = ++loyaltyRequestSequence.current;
    if (!restaurantId || String(user?.role || '').toUpperCase() !== 'CLIENTE') {
      setLoyaltySummary(null);
      setLoyaltyError('Não foi possível identificar o restaurante desta conta.');
      return;
    }

    setLoyaltyLoading(true);
    setLoyaltyError('');
    try {
      const nextSummary = await loyaltyService.getSummary(restaurantId);
      if (requestId !== loyaltyRequestSequence.current) return;
      setLoyaltySummary(nextSummary);
    } catch {
      if (requestId !== loyaltyRequestSequence.current) return;
      setLoyaltySummary(null);
      setLoyaltyError('Confira sua conexão e tente carregar os benefícios novamente.');
    } finally {
      if (requestId === loyaltyRequestSequence.current) setLoyaltyLoading(false);
    }
  }, [restaurantId, user?.role]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLoyaltyWallet(), 0);
    return () => {
      window.clearTimeout(timeout);
      loyaltyRequestSequence.current += 1;
    };
  }, [loadLoyaltyWallet]);

  useEffect(() => {
    if (guestClaimAttemptedRef.current || String(user?.role || '').toUpperCase() !== 'CLIENTE') {
      return;
    }
    const proofs = getGuestOwnedOrderProofs();
    const token = getAccessToken() || '';
    if (!proofs.length || !token) return;
    guestClaimAttemptedRef.current = true;
    void ordersService
      .claimGuestOrders(proofs, token)
      .then((result) => {
        if (!result.claimedCount) return;
        login(
          {
            ...(user ?? {}),
            ...(result.restaurantId ? { restaurantId: result.restaurantId } : {}),
          },
          token,
        );
        toast.success(
          result.claimedCount === 1
            ? 'Seu pedido feito como visitante foi adicionado à sua conta.'
            : `${result.claimedCount} pedidos feitos como visitante foram adicionados à sua conta.`,
        );
        return ordersService.listMyActiveOrders().then((raw: unknown) => {
          const list = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as Record<string, unknown>)?.orders)
              ? ((raw as Record<string, unknown>).orders as unknown[])
              : [];
          setActiveOrders(list as Record<string, unknown>[]);
        });
      })
      .catch(() => {
        guestClaimAttemptedRef.current = false;
      });
  }, [login, user]);

  useEffect(() => {
    const rid = Number(
      (user as Record<string, unknown>)?.restaurantId ||
        localStorage.getItem('menuRestaurantId') ||
        0,
    );
    if (!rid) return;
    let active = true;
    restaurantSettingsService
      .getPublicSettings(rid)
      .then((d) => {
        if (active) setSettings(d ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  const refreshActiveOrders = useCallback(async () => {
    const raw: unknown = await ordersService.listMyActiveOrders();
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as Record<string, unknown>)?.orders)
        ? ((raw as Record<string, unknown>).orders as unknown[])
        : [];
    setActiveOrders(list as Record<string, unknown>[]);
  }, []);

  useEffect(() => {
    let active = true;
    void ordersService
      .listMyActiveOrders()
      .then((raw: unknown) => {
        if (!active) return;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as Record<string, unknown>)?.orders)
            ? ((raw as Record<string, unknown>).orders as unknown[])
            : [];
        setActiveOrders(list as Record<string, unknown>[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const token = getAccessToken() || '';
    if (!token || String(user?.role || '').toUpperCase() !== 'CLIENTE') return undefined;

    const { socket, release } = acquireSocket(token, 'profile-orders-realtime');
    let refreshQueued = false;

    const refreshOrders = () => {
      if (refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        void Promise.allSettled([refreshActiveOrders(), refreshHistory()]);
      });
    };

    socket.on('order:status-changed', refreshOrders);
    socket.on('new-order', refreshOrders);

    return () => {
      socket.off('order:status-changed', refreshOrders);
      socket.off('new-order', refreshOrders);
      release();
    };
  }, [refreshHistory, refreshActiveOrders, user?.role]);

  useEffect(() => {
    let active = true;
    customerAddressService
      .list()
      .then((items) => {
        if (active) setAddresses(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const data = useMemo(
    () =>
      buildProfileData({
        user: (user as Record<string, unknown> | null) || null,
        settings,
        orders,
        addresses,
        avatarUrl,
      }),
    [user, settings, orders, addresses, avatarUrl],
  );
  const supportOrders = useMemo<OrderSupportOrder[]>(
    () =>
      orders.flatMap((order) => {
        const id = Number(order.id || 0);
        if (!Number.isInteger(id) || id <= 0) return [];
        return [
          {
            id,
            status: String(order.status || ''),
            total: Number(order.total || 0),
            createdAt: String(order.createdAt || ''),
            summary: buildOrderSummary(order),
          },
        ];
      }),
    [orders],
  );
  const restaurantHomePath = useMemo(
    () =>
      buildProfileRestaurantHomePath(settings, (user as Record<string, unknown> | null) || null) ||
      '/',
    [settings, user],
  );
  const restaurantMenuPath = useMemo(
    () => buildProfileRestaurantMenuPath(restaurantHomePath),
    [restaurantHomePath],
  );
  const storedCartCount = useMemo(() => {
    if (!restaurantId) return 0;
    const namespacedCart = readJsonStorage<CartItem[]>(`cartItems:${restaurantId}`, []);
    const legacyRestaurantId = Number(
      localStorage.getItem('cartRestaurantId') || localStorage.getItem('menuRestaurantId') || 0,
    );
    const cart =
      namespacedCart.length || legacyRestaurantId !== restaurantId
        ? namespacedCart
        : readJsonStorage<CartItem[]>('cartItems', []);
    return cart.reduce((total, item) => total + Math.max(0, Number(item.quantity) || 0), 0);
  }, [restaurantId]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleUploadAvatar = useCallback(
    async (file: File) => {
      const base64 = await resizeProfileAvatar(file);
      const { data: updated } = await api.put('/auth/profile', {
        avatar: base64,
      });
      const persistedAvatar = String(updated?.avatar || base64);
      setLocalAvatar(persistedAvatar);
      const token = getAccessToken() || '';
      if (token) login({ ...(user ?? {}), ...updated, avatar: persistedAvatar }, token);
    },
    [user, login],
  );

  const handleToggleTwoFactor = useCallback(
    async (enabled: boolean, currentPassword: string) => {
      await api.patch('/auth/mfa', { enabled, currentPassword });
      toast.success(
        `${enabled ? 'Verificação em duas etapas ativada' : 'Verificação em duas etapas desativada'}. Entre novamente.`,
      );
      logout();
      navigate('/login');
    },
    [logout, navigate],
  );

  const handleDeactivateAccount = useCallback(async () => {
    await api.patch('/auth/deactivate');
    logout();
    toast.success('Solicitação concluída: sua conta foi desativada.');
    navigate('/');
  }, [logout, navigate]);

  const handleRedeemLoyaltyCoupon = useCallback(
    async (couponId: number) => {
      if (!restaurantId || loyaltyRedeemingCouponId) return;
      setLoyaltyRedeemingCouponId(couponId);
      try {
        await loyaltyService.redeem(couponId, restaurantId);
        await loadLoyaltyWallet();
        toast.success('Cupom resgatado e adicionado à sua carteira.');
      } catch (error: unknown) {
        const typed = error as { response?: { data?: { error?: unknown } } };
        const message = String(
          typed.response?.data?.error || 'Não foi possível resgatar este benefício agora.',
        );
        toast.error(message);
        throw error;
      } finally {
        setLoyaltyRedeemingCouponId(null);
      }
    },
    [loadLoyaltyWallet, loyaltyRedeemingCouponId, restaurantId],
  );

  const saveAddress = useCallback(async (payload: CustomerAddressInput) => {
    const created = await customerAddressService.create(payload);
    setAddresses((current) =>
      [created, ...current].map((item) => ({
        ...item,
        isDefault: created.isDefault
          ? String(item.id) === String(created.id)
          : Boolean(item.isDefault),
      })),
    );
  }, []);

  const selectAddress = useCallback(async (id: string) => {
    const selected = await customerAddressService.makeDefault(Number(id));
    setAddresses((current) =>
      current.map((item) => ({ ...item, isDefault: String(item.id) === String(selected.id) })),
    );
    localStorage.setItem('selectedCustomerAddressId', String(selected.id));
  }, []);

  const handleTrackOrder = useCallback(
    (orderId: string) => {
      navigate(`/orders/${String(orderId).replace(/^#/, '')}/tracking`);
    },
    [navigate],
  );

  const handleContinuePayment = useCallback(
    (orderPublicId: string) => {
      const base = restaurantHomePath.replace(/\/+$/u, '');
      navigate(`${base}/pedido/${orderPublicId}/pagamento`);
    },
    [navigate, restaurantHomePath],
  );

  const handleReorder = useCallback(
    (orderId: string) => {
      const order = findOrderByDisplayId(orders, orderId);
      const items = order ? buildReorderCart(order) : [];

      if (!items.length) {
        toast.error('Não foi possível adicionar os itens deste pedido à sacola.');
        return;
      }

      localStorage.setItem('cartItems', JSON.stringify(items));
      toast.success('Itens adicionados à sacola.');
      navigate(restaurantHomePath, { state: { openCart: true } });
    },
    [navigate, orders, restaurantHomePath],
  );

  const resolvedProfileView = resolveProfileView(searchParams.get('view'));

  return (
    <>
      <FigmaAccountExperience
        data={{
          ...data,
          user: {
            ...data.user,
          },
        }}
        initialView={resolvedProfileView}
        cartCount={storedCartCount}
        onGoHome={() => navigate(restaurantHomePath)}
        onOpenMenu={() => navigate(restaurantMenuPath)}
        onOpenCart={() =>
          navigate(restaurantHomePath, {
            state: { openCart: true },
          })
        }
        onSupport={() => {
          setSupportOrderId(null);
          setSupportOpen(true);
        }}
        onSupportOrder={(orderId) => {
          const normalized = Number(String(orderId).replace(/^#/, ''));
          setSupportOrderId(Number.isInteger(normalized) && normalized > 0 ? normalized : null);
          setSupportOpen(true);
        }}
        onLogout={handleLogout}
        onUploadAvatar={handleUploadAvatar}
        twoFactorEnabled={Boolean((user as Record<string, unknown>)?.mfaEnabled)}
        onToggleTwoFactor={handleToggleTwoFactor}
        onDeactivateAccount={handleDeactivateAccount}
        onNewAddress={() => setAddressModalOpen(true)}
        onSelectAddress={selectAddress}
        onTrackOrder={handleTrackOrder}
        onViewOrder={handleTrackOrder}
        onContinuePayment={handleContinuePayment}
        onReorder={handleReorder}
        historyPagination={history}
        loyaltySummary={loyaltySummary}
        loyaltyLoading={loyaltyLoading}
        loyaltyError={loyaltyError}
        loyaltyRedeemingCouponId={loyaltyRedeemingCouponId}
        onRetryLoyalty={() => void loadLoyaltyWallet()}
        onRedeemLoyaltyCoupon={handleRedeemLoyaltyCoupon}
        onUseCoupon={(redemptionId) =>
          navigate(restaurantHomePath, {
            state: { openCart: true, loyaltyRedemptionId: redemptionId },
          })
        }
      />
      <OrderSupportDialog
        open={supportOpen}
        onClose={() => {
          setSupportOpen(false);
          setSupportOrderId(null);
        }}
        orders={supportOrders}
        initialOrderId={supportOrderId}
      />
      {addressModalOpen && (
        <AddressModal onClose={() => setAddressModalOpen(false)} onSave={saveAddress} />
      )}
    </>
  );
}
