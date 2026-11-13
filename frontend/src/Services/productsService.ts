import api from './api';
import { resolvePublicProductImages } from './publicMediaSource';
import { readSessionUserRaw } from '../modules/auth/session/authSession';

type ProductPayload = Record<string, unknown>;

function resolveRestaurantIdFromStorage() {
  try {
    const user = JSON.parse(readSessionUserRaw() || 'null');
    const fromUser = Number(
      user?.restaurantId || user?.restaurant?.id || user?.restaurant?.restaurantId || 0,
    );
    if (fromUser > 0) {
      return fromUser;
    }

    const tableSession = JSON.parse(localStorage.getItem('tableSession') || 'null');
    const fromSession = Number(tableSession?.restaurantId || 0);
    const fromMenu = Number(localStorage.getItem('menuRestaurantId') || 0);

    if (fromSession > 0) {
      return fromSession;
    }

    return fromMenu > 0 ? fromMenu : null;
  } catch {
    return null;
  }
}

function internalCatalogTenant() {
  try {
    const user = JSON.parse(readSessionUserRaw() || 'null');
    const role = String(user?.role || '').toUpperCase();
    const tenant = Number(user?.restaurantId || user?.restaurant?.id || 0);
    return ['ADMIN', 'FUNCIONARIO'].includes(role) &&
      Number.isSafeInteger(tenant) && tenant > 0 ? tenant : null;
  } catch {
    return null;
  }
}

class ProductsService {
  async listProducts(restaurantId?: string | number | null) {
    const resolvedRestaurantId =
      Number(restaurantId || 0) > 0 ? Number(restaurantId) : resolveRestaurantIdFromStorage();

    const internalTenant = internalCatalogTenant();
    const isOwnStaffCatalog = internalTenant !== null &&
      internalTenant === Number(resolvedRestaurantId);
    const response = isOwnStaffCatalog
      ? await api.get('/products/manage')
      : await api.get('/products', {
          params: resolvedRestaurantId ? { restaurantId: resolvedRestaurantId } : undefined,
        });
    const payload = response.data;

    const products = Array.isArray(payload) ? payload : payload?.products;
    return resolvePublicProductImages(
      products,
      response.config?.baseURL || api.defaults?.baseURL || '',
    );
  }

  async createProduct(payload: ProductPayload) {
    const response = await api.post('/products', payload);
    return response.data;
  }

  async updateProduct(id: string | number, payload: ProductPayload) {
    const response = await api.put(`/products/${id}`, payload);
    return response.data;
  }

  async deleteProduct(id: string | number) {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  }
}

export default new ProductsService();
