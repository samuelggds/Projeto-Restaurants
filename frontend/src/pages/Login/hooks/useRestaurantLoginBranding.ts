import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import {
  DEFAULT_LOGIN_BRANDING,
  mapLoginBranding,
  resolveLoginRestaurant,
} from '../domain/loginBranding';
import { getRestaurantSlugFromAuthPath } from '../domain/loginPortal';

export function useRestaurantLoginBranding(searchParams: URLSearchParams) {
  const location = useLocation();
  const [branding, setBranding] = useState(DEFAULT_LOGIN_BRANDING);
  const restaurantReference = searchParams.toString();
  const pathSlug = getRestaurantSlugFromAuthPath(location.pathname);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(restaurantReference);
    if (pathSlug && !params.has('slug') && !params.has('restaurantSlug')) {
      params.set('slug', pathSlug);
    }

    const { restaurantId, slug } = resolveLoginRestaurant(params);
    const storedRestaurantId = Number(localStorage.getItem('menuRestaurantId') || 0);
    const request = slug
      ? restaurantSettingsService.getPublicSettingsBySlug(slug)
      : restaurantId
        ? restaurantSettingsService.getPublicSettings(restaurantId)
        : storedRestaurantId > 0
          ? restaurantSettingsService.getPublicSettings(storedRestaurantId)
          : restaurantSettingsService.getDefaultPublicSettings();

    Promise.resolve(request)
      .then((settings) => {
        if (!active) return;
        if (Number(settings?.restaurantId) > 0) {
          localStorage.setItem('menuRestaurantId', String(settings.restaurantId));
        }
        setBranding(mapLoginBranding(settings));
      })
      .catch(() => {
        if (active) setBranding(DEFAULT_LOGIN_BRANDING);
      });

    return () => {
      active = false;
    };
  }, [pathSlug, restaurantReference]);

  return branding;
}
