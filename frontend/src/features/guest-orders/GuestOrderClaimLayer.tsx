import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/authContext';
import ordersService, { getGuestOwnedOrderProofs } from '../../Services/ordersService';
import { getAccessToken } from '../../modules/auth/session/authSession';

export function GuestOrderClaimLayer() {
  const { user, login } = useAuth();
  const runningRef = useRef(false);
  const lastUserRef = useRef<number | null>(null);
  const userId = Number(user?.id || 0) || null;
  const isCustomer = String(user?.role || '').toUpperCase() === 'CLIENTE';

  useEffect(() => {
    if (!isCustomer || !userId || runningRef.current) return;
    if (lastUserRef.current === userId) return;
    const proofs = getGuestOwnedOrderProofs();
    const accessToken = getAccessToken() || '';
    if (!proofs.length || !accessToken) {
      lastUserRef.current = userId;
      return;
    }

    runningRef.current = true;
    void ordersService
      .claimGuestOrders(proofs, accessToken)
      .then((result) => {
        lastUserRef.current = userId;
        if (!result.claimedCount) return;
        login(
          {
            ...(user ?? {}),
            ...(result.restaurantId ? { restaurantId: result.restaurantId } : {}),
          },
          accessToken,
        );
        toast.success(
          result.claimedCount === 1
            ? 'Encontramos seu pedido feito como visitante e adicionamos ao seu histórico.'
            : `Encontramos ${result.claimedCount} pedidos feitos como visitante e adicionamos ao seu histórico.`,
          { autoClose: 5500 },
        );
      })
      .catch(() => {
        lastUserRef.current = null;
      })
      .finally(() => {
        runningRef.current = false;
      });
  }, [isCustomer, login, user, userId]);

  return null;
}
