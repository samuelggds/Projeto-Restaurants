import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../Services/api';
import ordersService from '../../Services/ordersService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import favoritesService from '../../Services/favoritesService';
import loyaltyService from '../../Services/loyaltyService';
import customerAddressService, {
  type CustomerAddressInput,
} from '../../Services/customerAddressService';
import { useAuth } from '../../contexts/authContext';
import { getAccessToken } from '../../modules/auth/session/authSession';
import { ProfilePage } from './ProfilePage';
import { buildProfileData } from '../Profile/adapters/profileDataAdapter';
import { AddressModal } from './components/AddressModal';
import { buildReorderCart, findOrderByDisplayId } from '../Profile/domain/reorderCart';
import { addFavoriteToCart } from '../Profile/domain/favoriteCart';
import { readJsonStorage } from '../../shared/storage/jsonStorage';
import type { CartItem } from '../Home/hooks/useCart';
import type { LoyaltySummary } from '../Home/types';
import type { ProfileFavorite } from './types';

function resizeToSquareBase64(file: File, size: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.drawImage(img, (size - sw) / 2, (size - sh) / 2, sw, sh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem'));
    };
    img.src = url;
  });
}

export default function Profile() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [favorites, setFavorites] = useState<Record<string, unknown>[]>([]);
  const [addresses, setAddresses] = useState<Record<string, unknown>[]>([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [loyaltySummary, setLoyaltySummary] = useState<LoyaltySummary | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState('');
  const loyaltyRequestSequence = useRef(0);
  const [localAvatar, setLocalAvatar] = useState('');
  // Derived: prefer a locally-uploaded photo until the auth context reflects the new avatar
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

  // Brand info from public settings of the user's restaurant
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

  // User's orders
  useEffect(() => {
    let active = true;
    ordersService
      .listMyOrders()
      .then((raw: unknown) => {
        if (!active) return;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as Record<string, unknown>)?.orders)
            ? ((raw as Record<string, unknown>).orders as unknown[])
            : [];
        setOrders(list as Record<string, unknown>[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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

  useEffect(() => {
    let active = true;
    favoritesService
      .list()
      .then((items) => {
        if (active) setFavorites(items as Record<string, unknown>[]);
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
        favorites,
        addresses,
        avatarUrl,
      }),
    [user, settings, orders, favorites, addresses, avatarUrl],
  );
  const restaurantMenuPath = useMemo(() => {
    const restaurant = (settings?.restaurant as Record<string, unknown> | null) || {};
    const slug = String(restaurant.slug || settings?.slug || '')
      .trim()
      .toLowerCase();
    return slug ? `/${slug}` : '/';
  }, [settings]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleUploadAvatar = useCallback(
    async (file: File) => {
      const base64 = await resizeToSquareBase64(file, 160, 0.8);
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

  const handleSavePersonalData = useCallback(
    async (payload: { name: string; email: string; phone: string }) => {
      const { data: updated } = await api.put('/auth/profile', payload);
      // Sync auth context immediately so useMemo recomputes without a refresh
      const token = getAccessToken() || '';
      if (token && updated) login({ ...(user ?? {}), ...updated }, token);
    },
    [user, login],
  );

  const handleChangePassword = useCallback(
    async (payload: { currentPassword: string; newPassword: string }) => {
      await api.put('/auth/password', {
        oldPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      });
      logout();
      toast.success('Senha atualizada. Entre novamente para continuar.');
      navigate('/login');
    },
    [logout, navigate],
  );

  const handleToggleTwoFactor = useCallback(
    async (enabled: boolean) => {
      await api.patch('/auth/mfa', { enabled });
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
      navigate('/', { state: { openCart: true } });
    },
    [navigate, orders],
  );

  const handleAddFavoriteToCart = useCallback(
    (favorite: ProfileFavorite) => {
      const result = addFavoriteToCart(readJsonStorage<CartItem[]>('cartItems', []), favorite);

      if (result.error === 'unavailable') {
        toast.warning('Este produto está indisponível no momento.');
        return;
      }

      if (result.error === 'stockLimit') {
        toast.warning('Você já adicionou a quantidade máxima disponível.');
        return;
      }

      localStorage.setItem('cartItems', JSON.stringify(result.cart));
      toast.success(`${favorite.name} adicionado à sacola.`);
      navigate('/', { state: { openCart: true } });
    },
    [navigate],
  );

  return (
    <>
      <ProfilePage
        data={data}
        cartCount={0}
        onGoHome={() => navigate('/')}
        onOpenMenu={() => navigate('/')}
        onLogout={handleLogout}
        onUploadAvatar={handleUploadAvatar}
        onSavePersonalData={handleSavePersonalData}
        onChangePassword={handleChangePassword}
        twoFactorEnabled={Boolean((user as Record<string, unknown>)?.mfaEnabled)}
        onToggleTwoFactor={handleToggleTwoFactor}
        onDeactivateAccount={handleDeactivateAccount}
        onNewAddress={() => setAddressModalOpen(true)}
        onSelectAddress={selectAddress}
        onAddFavoriteToCart={handleAddFavoriteToCart}
        onToggleFavorite={async (productId) => {
          await favoritesService.remove(productId);
          setFavorites((current) => current.filter((item) => String(item.id) !== productId));
        }}
        onTrackOrder={handleTrackOrder}
        onViewOrder={handleTrackOrder}
        onReorder={handleReorder}
        loyaltySummary={loyaltySummary}
        loyaltyLoading={loyaltyLoading}
        loyaltyError={loyaltyError}
        onRetryLoyalty={() => void loadLoyaltyWallet()}
        onUseCoupon={(redemptionId) =>
          navigate(restaurantMenuPath, {
            state: { openCart: true, loyaltyRedemptionId: redemptionId },
          })
        }
      />
      {addressModalOpen && (
        <AddressModal onClose={() => setAddressModalOpen(false)} onSave={saveAddress} />
      )}
    </>
  );
}
