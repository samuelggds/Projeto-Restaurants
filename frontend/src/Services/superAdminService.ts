import api from './api';
import type {
  AdministratorAccessInput,
  AdministratorCreateInput,
  PlanUpdateInput,
  PlatformSettings,
  RestaurantAccessInput,
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
