import { MonthlyBilling } from './MonthlyBilling';
import { RecurringBillingPayment } from './RecurringBillingPayment';

export function SubscriptionBillingArea({ restricted = false }: { restricted?: boolean } = {}) {
  return (
    <>
      <RecurringBillingPayment />
      <MonthlyBilling restricted={restricted} />
    </>
  );
}
