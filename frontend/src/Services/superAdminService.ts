import api from './api';
import type {
  AdministratorAccessInput,
  AdministratorCreateInput,
  PlanUpdateInput,
  PlatformSettings,
  RestaurantAccessInput,
  RestaurantDeleteInput,
  SubscriptionUpdateInput,
  AdminPortalKeyResult,
} from '../pages/super_admin/types';
import type { RestaurantCategory } from '../config/restaurantCategory';

export interface CreateRestaurantInput {
  plan: string;
  restaurant: {
    name: string;
    slug: string;
    email: string;
    phone?: string;
    category: RestaurantCategory;
  };
  admin: { name: string; email: string; password: string };
}

class SuperAdminService {
  async getDashboard(signal?: AbortSignal) {
    const response = await api.get('/super-admin/dashboard', { signal });
    return response.data;
  }

  async createRestaurant(input: CreateRestaurantInput) {
    const response = await api.post('/restaurants', input);
    return response.data;
  }

  async updateSettings(input: PlatformSettings) {
    const { updatedAt: _updatedAt, ...editable } = input;
    const response = await api.put('/super-admin/settings', editable);
    return response.data;
  }

  async updatePlan(code: string, input: PlanUpdateInput) {
    const response = await api.patch(`/super-admin/plans/${encodeURIComponent(code)}`, input);
    return response.data;
  }

  async updateRestaurantAccess(id: number, input: RestaurantAccessInput) {
    const response = await api.patch(`/super-admin/restaurants/${id}/access`, input);
    return response.data;
  }

  async deleteRestaurant(id: number, input: RestaurantDeleteInput) {
    const response = await api.delete(`/super-admin/restaurants/${id}`, { data: input });
    return response.data;
  }

  async updateRestaurantSubscription(id: number, input: SubscriptionUpdateInput) {
    const response = await api.patch(`/super-admin/restaurants/${id}/subscription`, input);
    return response.data;
  }

  async createAdministrator(restaurantId: number, input: AdministratorCreateInput) {
    const response = await api.post(
      `/super-admin/restaurants/${restaurantId}/administrators`,
      input,
    );
    return response.data;
  }

  async rotateAdminPortalKey(restaurantId: number): Promise<AdminPortalKeyResult> {
    const response = await api.post(`/super-admin/restaurants/${restaurantId}/admin-portal-key`);
    return response.data;
  }

  async revokeAdminPortalKey(restaurantId: number) {
    const response = await api.delete(`/super-admin/restaurants/${restaurantId}/admin-portal-key`);
    return response.data;
  }

  async updateAdministratorAccess(id: number, input: AdministratorAccessInput) {
    const response = await api.patch(`/super-admin/administrators/${id}/access`, input);
    return response.data;
  }

  async getSupportMessages(restaurantId: number) {
    const response = await api.get('/ai-support/messages', { params: { restaurantId } });
    return response.data;
  }

  async listCustomDomains() {
    const response = await api.get('/super-admin/custom-domains');
    return response.data;
  }

  async getCustomDomain(restaurantId: number) {
    const response = await api.get(`/super-admin/restaurants/${restaurantId}/custom-domain`);
    return response.data;
  }

  async saveCustomDomain(
    restaurantId: number,
    input: {
      hostname: string;
      mode: 'MENU_ONLY' | 'SITE_WITH_MENU_SUBDOMAIN';
      menuSubdomain?: string;
      includeWww: boolean;
      landingPublished?: boolean;
    },
  ) {
    const response = await api.put(
      `/super-admin/restaurants/${restaurantId}/custom-domain`,
      input,
    );
    return response.data;
  }

  async verifyCustomDomain(restaurantId: number) {
    const response = await api.post(
      `/super-admin/restaurants/${restaurantId}/custom-domain/verify`,
    );
    return response.data;
  }

  async activateCustomDomain(restaurantId: number) {
    const response = await api.post(
      `/super-admin/restaurants/${restaurantId}/custom-domain/activate`,
    );
    return response.data;
  }

  async disableCustomDomain(restaurantId: number) {
    const response = await api.post(
      `/super-admin/restaurants/${restaurantId}/custom-domain/disable`,
    );
    return response.data;
  }

  async listLalamoveOnboarding(cursor?: number) {
    const response = await api.get('/super-admin/delivery-partners/lalamove/requests', {
      params: cursor ? { cursor } : {},
    });
    return response.data;
  }

  async reviewLalamoveOnboarding(restaurantId: number, input: {
    status: string;
    expectedStatus: string;
    expectedUpdatedAt: string;
    reasonCode: string | null;
  }) {
    const response = await api.patch(
      '/super-admin/delivery-partners/lalamove/requests/' + restaurantId, input,
    );
    return response.data;
  }

  async getManagedServiceQueue() {
    const response = await api.get('/super-admin/managed-service');
    return response.data;
  }

  async updateImplementation(
    restaurantId: number,
    input: { status: string; notes?: string | null },
  ) {
    const response = await api.patch(
      `/super-admin/managed-service/implementations/${restaurantId}`,
      input,
    );
    return response.data;
  }

  async updateManagedRequest(
    requestId: string,
    input: { status: string; response?: string | null },
  ) {
    const response = await api.patch(
      `/super-admin/managed-service/requests/${encodeURIComponent(requestId)}`,
      input,
    );
    return response.data;
  }

  async getManagedRestaurantWorkspace(restaurantId: number) {
    const response = await api.get(
      `/super-admin/managed-service/restaurants/${restaurantId}/workspace`,
    );
    return response.data;
  }

  async createManagedProduct(restaurantId: number, input: Record<string, unknown>) {
    const response = await api.post(
      `/super-admin/managed-service/restaurants/${restaurantId}/products`,
      input,
    );
    return response.data;
  }

  async updateManagedProduct(
    restaurantId: number,
    productId: number,
    input: Record<string, unknown>,
  ) {
    const response = await api.patch(
      `/super-admin/managed-service/restaurants/${restaurantId}/products/${productId}`,
      input,
    );
    return response.data;
  }

  async createManagedIngredient(restaurantId: number, input: Record<string, unknown>) {
    const response = await api.post(
      `/super-admin/managed-service/restaurants/${restaurantId}/ingredients`,
      input,
    );
    return response.data;
  }

  async createManagedCategory(restaurantId: number, input: Record<string, unknown>) {
    const response = await api.post(
      `/super-admin/managed-service/restaurants/${restaurantId}/categories`,
      input,
    );
    return response.data;
  }

  async updateManagedCategory(
    restaurantId: number,
    categoryId: number,
    input: Record<string, unknown>,
  ) {
    const response = await api.patch(
      `/super-admin/managed-service/restaurants/${restaurantId}/categories/${categoryId}`,
      input,
    );
    return response.data;
  }

  async createManagedCombo(restaurantId: number, input: Record<string, unknown>) {
    const response = await api.post(
      `/super-admin/managed-service/restaurants/${restaurantId}/combos`,
      input,
    );
    return response.data;
  }

  async updateManagedCombo(
    restaurantId: number,
    comboId: number,
    input: Record<string, unknown>,
  ) {
    const response = await api.patch(
      `/super-admin/managed-service/restaurants/${restaurantId}/combos/${comboId}`,
      input,
    );
    return response.data;
  }

  async createManagedBanner(restaurantId: number, input: Record<string, unknown>) {
    const response = await api.post(
      `/super-admin/managed-service/restaurants/${restaurantId}/banners`,
      input,
    );
    return response.data;
  }

  async updateManagedBanner(
    restaurantId: number,
    bannerId: number,
    input: Record<string, unknown>,
  ) {
    const response = await api.patch(
      `/super-admin/managed-service/restaurants/${restaurantId}/banners/${bannerId}`,
      input,
    );
    return response.data;
  }

  async updateManagedSafeSettings(restaurantId: number, input: Record<string, unknown>) {
    const response = await api.patch(
      `/super-admin/managed-service/restaurants/${restaurantId}/settings`,
      input,
    );
    return response.data;
  }

  async sendSupportMessage(
    restaurantId: number,
    message: string,
    closeConversation = false,
  ) {
    const response = await api.post(`/super-admin/support/${restaurantId}/messages`, {
      message,
      closeConversation,
    });
    return response.data;
  }
}

export default new SuperAdminService();
