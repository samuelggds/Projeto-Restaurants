import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { GuestOrderClaimLayer } from '../../features/guest-orders/GuestOrderClaimLayer';
import { PublicGuestOrderHelp } from '../../features/order-support/PublicGuestOrderHelp';
import { useActiveOrderNotice } from '../Home/hooks/useActiveOrderNotice';
import DeliveryConfirmationCodePrompt from './DeliveryConfirmationCodePrompt';
import { TrackingOrderSupportLauncher } from './TrackingOrderSupportLauncher';

const RESERVED_ROOT_PATHS = new Set([
  'admin',
  'login',
  'register',
  'profile',
  'orders',
  'courier',
  'garcom',
  'waiter',
  'attendant',
  'restaurant-required',
]);

type PublicRestaurantContext = {
  restaurantId: number;
  restaurantName: string;
  slug: string;
};

export default function DeliveryCustomerAlertLayer() {
  const { user } = useAuth();
  const location = useLocation();
  const customerId =
    String(user?.role || '').toUpperCase() === 'CLIENTE'
      ? Number((user as { id?: number }).id || 0) || null
      : null;
  const { activeOrder } = useActiveOrderNotice(customerId);
  const trackingMatch = location.pathname.match(/^\/orders\/(\d+)\/tracking$/u);

  const publicRestaurantSlug = useMemo(() => {
    const match = location.pathname.match(/^\/([a-z0-9][a-z0-9-]*)\/?$/iu);
    const slug = String(match?.[1] || '').trim().toLowerCase();
    return slug && !RESERVED_ROOT_PATHS.has(slug) ? slug : '';
  }, [location.pathname]);

  const [publicRestaurant, setPublicRestaurant] = useState<PublicRestaurantContext | null>(null);

  useEffect(() => {
    if (!publicRestaurantSlug || user) return undefined;

    let active = true;
    const load = async () => {
      try {
        const settings = await restaurantSettingsService.getPublicSettingsBySlug(publicRestaurantSlug);
        if (!active) return;
        const record = (settings || {}) as Record<string, unknown>;
        const restaurant = (record.restaurant || {}) as Record<string, unknown>;
        const restaurantId = Number(record.restaurantId || restaurant.id || 0);
        if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
          setPublicRestaurant(null);
          return;
        }
        setPublicRestaurant({
          restaurantId,
          restaurantName: String(restaurant.name || record.name || publicRestaurantSlug).trim(),
          slug: publicRestaurantSlug,
        });
      } catch {
        if (active) setPublicRestaurant(null);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [publicRestaurantSlug, user]);

  const visiblePublicRestaurant =
    !user && publicRestaurant?.slug === publicRestaurantSlug ? publicRestaurant : null;

  return (
    <>
      <GuestOrderClaimLayer />
      {visiblePublicRestaurant ? (
        <PublicGuestOrderHelp
          restaurantId={visiblePublicRestaurant.restaurantId}
          restaurantName={visiblePublicRestaurant.restaurantName}
        />
      ) : null}
      {trackingMatch ? (
        <TrackingOrderSupportLauncher orderId={Number(trackingMatch[1])} />
      ) : activeOrder?.status === 'SAIU_PARA_ENTREGA' &&
        /^\d{4}$/.test(activeOrder.deliveryConfirmationCode || '') ? (
        <DeliveryConfirmationCodePrompt
          code={activeOrder.deliveryConfirmationCode as string}
          orderId={Number(activeOrder.id)}
          deliveryStartedAt={activeOrder.deliveryStartedAt}
        />
      ) : null}
    </>
  );
}
