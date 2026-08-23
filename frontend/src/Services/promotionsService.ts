import type { AdminCoupon, CouponPayload, ProductDiscountPayload } from '../pages/admin/types';
import api from './api';

function unwrapCoupons(payload: unknown): AdminCoupon[] {
  if (Array.isArray(payload)) return payload as AdminCoupon[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  return Array.isArray(record.coupons) ? (record.coupons as AdminCoupon[]) : [];
}

export function toProductDiscountApiPayload(payload: ProductDiscountPayload) {
  return {
    kind: payload.type,
    value: payload.value,
    label: payload.badgeLabel,
    active: payload.active,
    ...(payload.startsAt ? { startsAt: payload.startsAt } : {}),
    ...(payload.endsAt ? { endsAt: payload.endsAt } : {}),
  };
}

class PromotionsService {
  async applyProductDiscount(productId: string | number, payload: ProductDiscountPayload) {
    const response = await api.put(
      `/products/${productId}/discount`,
      toProductDiscountApiPayload(payload),
    );
    return response.data;
  }

  async deleteProductDiscount(productId: string | number) {
    const response = await api.delete(`/products/${productId}/discount`);
    return response.data;
  }

  async listCoupons() {
    const response = await api.get('/coupons');
    return unwrapCoupons(response.data);
  }

  async createCoupon(payload: CouponPayload) {
    const response = await api.post('/coupons', payload);
    return response.data;
  }

  async updateCoupon(id: string | number, payload: CouponPayload) {
    const response = await api.put(`/coupons/${id}`, payload);
    return response.data;
  }

  async deleteCoupon(id: string | number) {
    const response = await api.delete(`/coupons/${id}`);
    return response.data;
  }
}

export default new PromotionsService();
