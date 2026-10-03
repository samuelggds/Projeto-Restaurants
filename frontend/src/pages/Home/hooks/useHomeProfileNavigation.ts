import { useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { HomeProfileView } from '../types';
import { buildTenantPublicPath } from '../../../shared/navigation/authNavigation';

export function useHomeProfileNavigation({
  navigate,
  navigateToLogin,
  restaurantSlug,
  userLoggedIn,
}: {
  navigate: NavigateFunction;
  navigateToLogin: () => void;
  restaurantSlug?: string;
  userLoggedIn: boolean;
}) {
  const openProfile = useCallback(() => {
    if (userLoggedIn) {
      navigate('/profile');
      return;
    }
    navigateToLogin();
  }, [navigate, navigateToLogin, userLoggedIn]);

  const openOrders = useCallback(() => {
    if (userLoggedIn) {
      navigate('/profile?view=orders');
      return;
    }
    navigate(buildTenantPublicPath(restaurantSlug, '/pedidos'));
  }, [navigate, restaurantSlug, userLoggedIn]);

  const openProfileView = useCallback(
    (view: HomeProfileView) => {
      if (userLoggedIn) {
        navigate(`/profile?view=${encodeURIComponent(view)}`);
        return;
      }
      navigateToLogin();
    },
    [navigate, navigateToLogin, userLoggedIn],
  );

  return { openProfile, openOrders, openProfileView };
}
