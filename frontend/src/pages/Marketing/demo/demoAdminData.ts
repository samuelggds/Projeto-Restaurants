import type { DemoAdminRuntime } from './demoAdminApi';
import { adminMockSettings } from '../../admin/data';
import type {
  AdminCategory,
  AdminCoupon,
  AdminIngredient,
  AdminProduct,
  AdminSettings,
  Employee,
} from '../../admin/types';
import { demoHomeData, demoProducts } from './demoCatalog';
import { createInitialDemoState } from './demoDomain';

export const DEMO_ADMIN_STORAGE_KEY = 'gastronexa:demo:admin:v1';
export type DemoAdminData = {
  runtime?: DemoAdminRuntime;
  settings: AdminSettings;
  products: AdminProduct[];
  categories: AdminCategory[];
  ingredients: AdminIngredient[];
  coupons: AdminCoupon[];
  employees: Employee[];
};
const mediaUrl = (path: string) => new URL(path, window.location.origin).href;

export function discardDemoCredentials(settings: AdminSettings): AdminSettings {
  return {
    ...settings,
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    mercadoPagoAccessToken: '',
    asaasAccessToken: '',
    pagbankToken: '',
  };
}

export function createDemoAdminData(): DemoAdminData {
  return {
    settings: {
      ...adminMockSettings,
      restaurantName: demoHomeData.brand.name,
      description: demoHomeData.about,
      primaryColor: '#ba2de1',
      coverImageUrl: mediaUrl('/demo/pizza-hero.webp'),
      businessHoursConfigured: true,
      deliveryTime: 35,
      tableAccount: {
        ...adminMockSettings.tableAccount,
        enabled: true,
        allowCash: true,
        allowCardMachine: true,
      },
      promotionalBanners: demoHomeData.banners.map((banner) => ({
        ...banner,
        image: mediaUrl(banner.image),
        localId: `demo-banner-${banner.id}`,
        highlight: banner.highlight ?? '',
        description: banner.description ?? '',
        buttonLabel: banner.buttonLabel ?? 'Ver cardápio',
      })),
    },
    products: demoProducts.map((product, index) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.originalPrice,
      discount: product.promotion?.active
        ? { type: 'PERCENTAGE', value: 20, badgeLabel: '20% OFF', active: true }
        : undefined,
      categoryId: index + 1,
      category: product.categoryId,
      image: mediaUrl(product.image),
      active: true,
      stock: null,
      saleMode: 'COMPLETE',
      optionGroups: [],
      compositionItems: [],
    })),
    categories: demoHomeData.categories
      .filter((category) => category.id !== 'todos')
      .map((category, index) => ({ id: index + 1, name: category.name })),
    ingredients: [],
    coupons: [],
    employees: createInitialDemoState()
      .accounts.filter((account) => !['ADMIN', 'CLIENTE'].includes(account.role))
      .map((account, index) => ({
        id: String(index + 3),
        name: account.name,
        email: account.email,
        role: ({ COZINHA: 'COOK', GARCOM: 'WAITER', ATENDENTE: 'ATTENDANT', MOTOQUEIRO: 'COURIER' }[
          account.role
        ] ?? 'ATTENDANT') as Employee['role'],
        active: true,
        permissions: {
          viewOrders: true,
          updateOrderStatus: true,
          manageQrTables: account.role === 'GARCOM',
        },
      })),
  };
}
export function readDemoAdminData(): DemoAdminData {
  try {
    const value = JSON.parse(localStorage.getItem(DEMO_ADMIN_STORAGE_KEY) ?? 'null');
    if (
      value?.settings &&
      typeof value.settings.restaurantName === 'string' &&
      Array.isArray(value.products) &&
      Array.isArray(value.categories) &&
      Array.isArray(value.employees) &&
      Array.isArray(value.ingredients) &&
      Array.isArray(value.coupons)
    )
      return { ...value, settings: { ...createDemoAdminData().settings, ...value.settings } };
  } catch {
    /* A broken local draft must not stop the demonstration. */
  }
  return createDemoAdminData();
}
