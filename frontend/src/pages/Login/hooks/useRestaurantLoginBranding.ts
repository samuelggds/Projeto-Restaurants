import { useEffect, useState } from "react";
import restaurantSettingsService from "../../../Services/restaurantSettingsService";
import { DEFAULT_LOGIN_BRANDING, mapLoginBranding, resolveLoginRestaurant } from "../domain/loginBranding";

export function useRestaurantLoginBranding(searchParams: URLSearchParams) {
  const [branding, setBranding] = useState(DEFAULT_LOGIN_BRANDING);
  const restaurantReference = searchParams.toString();

  useEffect(() => {
    let active = true;
    const { restaurantId, slug } = resolveLoginRestaurant(new URLSearchParams(restaurantReference));
    const storedRestaurantId = Number(localStorage.getItem("menuRestaurantId") || 0);
    const request = slug
      ? restaurantSettingsService.getPublicSettingsBySlug(slug)
      : restaurantId
        ? restaurantSettingsService.getPublicSettings(restaurantId)
        : storedRestaurantId > 0
          ? restaurantSettingsService.getPublicSettings(storedRestaurantId)
          : null;
    if (!request) {
      Promise.resolve().then(() => {
        if (active) setBranding(DEFAULT_LOGIN_BRANDING);
      });
      return () => { active = false; };
    }
    Promise.resolve(request).then((settings) => {
      if (active) setBranding(mapLoginBranding(settings));
    }).catch(() => {
      if (active) setBranding(DEFAULT_LOGIN_BRANDING);
    });
    return () => { active = false; };
  }, [restaurantReference]);

  return branding;
}
