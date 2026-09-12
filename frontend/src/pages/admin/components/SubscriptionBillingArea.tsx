import { MonthlyBilling } from './MonthlyBilling';

export function SubscriptionBillingArea({ restricted = false }: { restricted?: boolean } = {}) {
  return <MonthlyBilling restricted={restricted} />;
}
