import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import menuService from '../../Services/menuService';
import restaurantSettingsService from '../../Services/restaurantSettingsService';
import { DigitalMenuPage } from './DigitalMenuPage';
import type { DigitalMenuData, MenuCategory, MenuProduct } from './types';
import { createRestaurantMonogram } from '../../utils/restaurantMonogram';

const FALLBACK_CATEGORY_IMG =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60';
const FALLBACK_PRODUCT_IMG =
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=400&q=60';

function mapProducts(raw: unknown[]): MenuProduct[] {
  return (raw as Record<string, unknown>[])
    .filter((p) => p.active !== false)
    .map((p) => {
      const cat = (p.category as Record<string, unknown> | null) ?? null;
      return {
        id: String(p.id),
        categoryId: String(cat?.id ?? p.categoryId ?? ''),
        name: String(p.name || ''),
        description: String(p.description || ''),
        price: Number(p.price || 0),
        image: String(p.image || FALLBACK_PRODUCT_IMG),
        rating: Number(p.rating || 0) || 4.5,
        preparationTime: '20–30 min',
      };
    });
}

function deriveCategories(products: MenuProduct[], rawCats: unknown[]): MenuCategory[] {
  if (Array.isArray(rawCats) && rawCats.length > 0) {
    return (rawCats as Record<string, unknown>[]).map((c) => ({
      id: String(c.id),
      name: String(c.name || ''),
      image: String(c.image || FALLBACK_CATEGORY_IMG),
    }));
  }
  // Derive from product categories if no explicit list
  const seen = new Set<string>();
  return products
    .filter((p) => {
      if (seen.has(p.categoryId)) return false;
      seen.add(p.categoryId);
      return true;
    })
    .map((p) => ({
      id: p.categoryId,
      name: p.categoryId,
      image: FALLBACK_CATEGORY_IMG,
    }));
}

export default function DigitalMenuEntryPage() {
  const { tableNumber, restaurantSlug } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<DigitalMenuData | null>(null);

  const restaurantId =
    Number(searchParams.get('restaurantId') || searchParams.get('rid') || 0) || null;
  const tableNum = Number(tableNumber || searchParams.get('tableId') || 0) || 1;

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const [rawProducts, rawSettings] = await Promise.allSettled([
          restaurantSlug
            ? menuService.listProductsBySlug(restaurantSlug)
            : restaurantId
              ? menuService.listProducts(restaurantId)
              : Promise.resolve([]),
          restaurantSlug
            ? restaurantSettingsService.getPublicSettingsBySlug(restaurantSlug)
            : restaurantId
              ? restaurantSettingsService.getPublicSettings(restaurantId)
              : Promise.resolve(null),
        ]);

        const products =
          rawProducts.status === 'fulfilled' && Array.isArray(rawProducts.value)
            ? mapProducts(rawProducts.value)
            : [];
        const settingsValue =
          rawSettings.status === 'fulfilled'
            ? (rawSettings.value as Record<string, unknown> | null)
            : null;
        const restaurant =
          (settingsValue?.restaurant as Record<string, unknown> | null) ?? settingsValue ?? {};
        const name = String(restaurant?.name || settingsValue?.restaurantName || 'Restaurante');
        const monogram = createRestaurantMonogram(name);

        setData({
          restaurantName: name,
          monogram,
          primaryColor: String(settingsValue?.primaryColor || '#d64d08'),
          tableNumber: tableNum,
          categories: deriveCategories(products, []),
          products,
          orderStatus: 'received',
        });
      } catch {
        /* show empty menu rather than fake data */
        setData({
          restaurantName: 'Cardápio',
          monogram: 'C',
          tableNumber: tableNum,
          categories: [],
          products: [],
          orderStatus: 'received',
        });
      }
    };

    fetchMenu();
  }, [restaurantId, restaurantSlug, tableNum]);

  if (!data) return null;

  return <DigitalMenuPage data={data} />;
}
