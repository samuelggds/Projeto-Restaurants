import { useEffect, useState } from 'react';
import menuService from '../../../Services/menuService';
import restaurantSettingsService from '../../../Services/restaurantSettingsService';
import { toPositiveInteger } from '../domain/productAvailability';

export const PUBLIC_SETTINGS_REFRESH_INTERVAL_MS = 30_000;

export function useDefaultRestaurantId(enabled: boolean) {
  const [restaurantId, setRestaurantId] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    restaurantSettingsService
      .getDefaultPublicSettingsRevision()
      .then((settings) => {
        if (!active) return;
        const id = toPositiveInteger(settings?.restaurantId);
        setRestaurantId(id);
        if (id) localStorage.setItem('menuRestaurantId', String(id));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [enabled]);

  return enabled ? restaurantId : null;
}

export function useResolvedRestaurantId(slug: string) {
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  useEffect(() => {
    if (!slug) return;
    let active = true;
    restaurantSettingsService
      .getPublicSettingsRevisionBySlug(slug)
      .then((settings) => {
        if (!active) return;
        const id = toPositiveInteger(settings?.restaurantId);
        setRestaurantId(id);
        if (id) localStorage.setItem('menuRestaurantId', String(id));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [slug]);
  return restaurantId;
}

type CatalogOptions = {
  restaurantId: number | null;
  slug: string;
  onError: (message?: string) => void;
};

export function useRestaurantCatalog({ restaurantId, slug, onError }: CatalogOptions) {
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    let loading = false;
    let initialized = false;
    let currentRevision = '';

    const loadFullSettings = async (revision = '') => {
      const data = await restaurantSettingsService.getPublicSettings(restaurantId, revision);
      if (!active) return;
      currentRevision = revision;
      initialized = true;
      setSettings(data ?? null);
    };

    const refreshSettings = async (initial = false) => {
      if (loading) return;
      loading = true;
      try {
        const revisionData =
          await restaurantSettingsService.getPublicSettingsRevision(restaurantId);
        if (!active) return;
        const revision = String(revisionData?.revision || '').trim();
        if (!revision) throw new Error('Revisão pública inválida.');
        if (!initial && initialized && revision === currentRevision) return;
        await loadFullSettings(revision);
      } catch {
        if (initial && !initialized && active) {
          try {
            await loadFullSettings();
          } catch {
            // Keep the last valid settings while a transient refresh fails.
          }
        }
      } finally {
        loading = false;
      }
    };
    const refreshWhileVisible = () => {
      if (document.visibilityState !== 'hidden') void refreshSettings();
    };

    void refreshSettings(true);
    const intervalId = window.setInterval(refreshWhileVisible, PUBLIC_SETTINGS_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshWhileVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhileVisible);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let active = true;
    localStorage.setItem('menuRestaurantId', String(restaurantId));
    const request = slug
      ? menuService.listProductsBySlug(slug)
      : menuService.listProducts(restaurantId);
    request
      .then((data) => {
        if (active) setProducts(Array.isArray(data) ? (data as Record<string, unknown>[]) : []);
      })
      .catch((error) => onError(error?.response?.data?.error));
    return () => {
      active = false;
    };
  }, [restaurantId, slug, onError]);

  return { products, setProducts, settings };
}
