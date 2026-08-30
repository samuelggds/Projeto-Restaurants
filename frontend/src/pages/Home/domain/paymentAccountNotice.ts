import type { CheckoutPaymentMethod } from './checkout';

export function shouldShowSavedCardAccountNotice(
  loggedIn: boolean,
  method: CheckoutPaymentMethod,
) {
  return !loggedIn && method === 'card';
}
