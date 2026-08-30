import type { ProfileView } from '../types';

const profileViews = new Set<ProfileView>([
  'overview',
  'orders',
  'coupons',
  'addresses',
  'paymentMethods',
  'favorites',
  'personalData',
  'security',
]);

export function resolveProfileView(value: string | null): ProfileView {
  return value && profileViews.has(value as ProfileView) ? value as ProfileView : 'overview';
}
