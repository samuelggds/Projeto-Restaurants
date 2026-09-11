import { useEffect, useState } from 'react';
import { normalizeHomeFontFamily } from '../../Home/domain/publicSettings';
import type { HomeData } from '../../Home/types';
import type { TableAccountAdminSettings } from '../../admin/types';
import { DEMO_ADMIN_STORAGE_KEY, readDemoAdminData } from './demoAdminData';
import { demoProductConfiguration } from './demoProductConfiguration';
import { demoHomeData } from './demoCatalog';

export type DemoHomeData = HomeData & {
  waiterCallEnabled?: boolean;
  billRequestEnabled?: boolean;
  tableOrderingEnabled?: boolean;
  tableAccount?: TableAccountAdminSettings;
};

function read(): DemoHomeData {
  try {
    if (!localStorage.getItem(DEMO_ADMIN_STORAGE_KEY))
      return { ...demoHomeData, tableAccount: readDemoAdminData().settings.tableAccount };
  } catch {
    return demoHomeData;
  }
  const { settings, products, categories, ingredients } = readDemoAdminData();
  return {
    ...demoHomeData,
    tableAccount: settings.tableAccount,
    brand: {
      ...demoHomeData.brand,
      name: settings.restaurantName,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
    },
    fontFamily: normalizeHomeFontFamily(settings.fontFamily),
    about: settings.description,
    banners: settings.promotionalBanners.map((banner, index) => ({
      ...banner,
      id: banner.id ?? index + 1,
    })),
    isOpen: settings.isOpenForOrders,
    tableOrderingEnabled: settings.tableOrderingEnabled,
    waiterCallEnabled: settings.waiterCallEnabled,
    billRequestEnabled: settings.billRequestEnabled,
    isOpenForOrders: settings.isOpenForOrders,
    acceptsDelivery: settings.acceptsDelivery,
    acceptsPickup: settings.acceptsPickup,
    acceptsPix: settings.acceptsPix,
    acceptsCard: settings.acceptsCard,
    minimumOrder: settings.minimumOrder,
    freeDeliveryFrom: settings.freeShippingMinimum,
    categories: [
      { id: 'todos', name: 'Todos', image: '' },
      ...categories.map((category) => ({
        id: String(category.id),
        name: category.name,
        image: products.find((product) => product.categoryId === category.id)?.image ?? '',
      })),
    ],
    products: products.map((product) => {
      const base = Number(product.price) || 0;
      const discount = product.discount;
      const value = discount?.active
        ? discount.type === 'PERCENTAGE'
          ? (base * discount.value) / 100
          : discount.value
        : 0;
      const price = Math.round(Math.max(0, base - value) * 100) / 100;
      return {
        id: product.id,
        categoryId: String(product.categoryId),
        name: product.name,
        description: product.description ?? '',
        price,
        originalPrice: base,
        image: product.image,
        rating: 0,
        stock: product.stock,
        available: product.active !== false && product.stock !== 0,
        ...demoProductConfiguration(product, ingredients),
        promotion:
          value > 0
            ? {
                active: true,
                discountAmount: value,
                discountPercentage: base ? (value / base) * 100 : 0,
                badgeLabel: discount?.badgeLabel || 'Oferta',
              }
            : undefined,
      };
    }),
  };
}

export function useDemoHomeData() {
  const [data, setData] = useState(read);
  useEffect(() => {
    const refresh = () => setData(read());
    window.addEventListener('demo-admin-data', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('demo-admin-data', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return data;
}
