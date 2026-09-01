import api from './api';

export type CompensationModel = 'FIXED_PER_DELIVERY' | 'DISTANCE_RANGES' | 'BASE_PLUS_DISTANCE';

export type CompensationPolicy = {
  model: CompensationModel;
  fixedAmount: number;
  baseAmount: number;
  includedDistanceMeters: number;
  extraPerKmAmount: number;
  ranges: Array<{ maxDistanceMeters: number; amount: number }>;
  source?: 'RESTAURANT_DEFAULT' | 'COURIER_OVERRIDE' | 'LEGACY_FIXED_FALLBACK';
};

export type CourierConfiguration = {
  timezone: string;
  defaultPolicy: CompensationPolicy;
  couriers: Array<{
    id: number;
    name: string;
    email: string;
    active: boolean;
    override: CompensationPolicy | null;
  }>;
};

export type PendingCourierOrder = {
  id: number;
  publicId: string;
  assignedCourierId: number;
  courierEarning: number;
  cashCollectedAmount: number;
  total: number;
  deliveredAt: string | null;
  district: string | null;
  city: string | null;
  assignedCourier: { id: number; name: string } | null;
};

export type CourierSettlement = {
  publicId: string;
  status: 'AWAITING_COURIER_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED' | 'CANCELED';
  grossCourierEarnings: number;
  cashCollectedAmount: number;
  netAmount: number;
  direction: 'RESTAURANT_PAYS_COURIER' | 'COURIER_RETURNS_CASH' | 'BALANCED';
  createdAt: string;
  courier: { id: number; name: string; email: string };
  disputeReason?: string | null;
  items: Array<{ orderId: number }>;
};

class CourierCompensationService {
  async getConfiguration() {
    const response = await api.get<CourierConfiguration>(
      '/courier-compensation/admin/configuration',
    );
    return response.data;
  }

  async updateDefault(policy: CompensationPolicy, timezone: string) {
    const response = await api.put('/courier-compensation/admin/configuration', {
      ...policy,
      timezone,
    });
    return response.data;
  }

  async updateCourierOverride(courierId: number, policy: CompensationPolicy) {
    const response = await api.put(
      `/courier-compensation/admin/couriers/${courierId}/rule`,
      policy,
    );
    return response.data;
  }

  async removeCourierOverride(courierId: number) {
    const response = await api.delete(`/courier-compensation/admin/couriers/${courierId}/rule`);
    return response.data;
  }

  async listPendingOrders(courierId?: number) {
    const response = await api.get<PendingCourierOrder[]>(
      '/courier-compensation/admin/pending-orders',
      { params: courierId ? { courierId } : undefined },
    );
    return response.data;
  }

  async listAdminSettlements() {
    const response = await api.get<CourierSettlement[]>('/courier-compensation/admin/settlements');
    return response.data;
  }

  async createSettlement(input: {
    courierId: number;
    orderIds: number[];
    paymentMethod?: 'PIX' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';
    adminNote?: string;
  }) {
    const response = await api.post<CourierSettlement>(
      '/courier-compensation/admin/settlements',
      input,
    );
    return response.data;
  }

  async cancelSettlement(publicId: string) {
    const response = await api.patch(`/courier-compensation/admin/settlements/${publicId}/cancel`);
    return response.data;
  }

  async listCourierSettlements() {
    const response = await api.get<CourierSettlement[]>(
      '/courier-compensation/courier/settlements',
    );
    return response.data;
  }

  async confirmSettlement(publicId: string) {
    const response = await api.post<CourierSettlement>(
      `/courier-compensation/courier/settlements/${publicId}/confirm`,
    );
    return response.data;
  }

  async disputeSettlement(publicId: string, reason: string) {
    const response = await api.post<CourierSettlement>(
      `/courier-compensation/courier/settlements/${publicId}/dispute`,
      { reason },
    );
    return response.data;
  }
}

export default new CourierCompensationService();
