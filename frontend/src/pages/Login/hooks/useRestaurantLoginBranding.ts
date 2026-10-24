import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import api from '../../../Services/api';
import { getAdminPortalGrant } from '../domain/adminPortalSession';
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
    const isAdminPortal = /^\/[^/]+\/admin\/?$/u.test(location.pathname);
    const adminGrant = isAdminPortal && slug ? getAdminPortalGrant(slug) : '';
    // The private ADMIN entry can read only branding using its tenant grant.
    const request = isAdminPortal && slug && adminGrant
      ? api.post(`/admin-portal/${encodeURIComponent(slug)}/branding`, { grant: adminGrant })
          .then((response) => response.data)
      : slug
      ? restaurantSettingsService.getPublicSettingsBySlug(slug)
      : restaurantId
        ? restaurantSettingsService.getPublicSettings(restaurantId)
        : Promise.resolve(null);

    Promise.resolve(request)
      .then((settings) => {
        if (!active) return;
        setBranding(settings ? mapLoginBranding(settings) : DEFAULT_LOGIN_BRANDING);
      })
      .catch(() => {
        if (active) setBranding(DEFAULT_LOGIN_BRANDING);
      });

    return () => {
      active = false;
    };
  }, [location.pathname, pathSlug, restaurantReference]);

  return branding;
}
