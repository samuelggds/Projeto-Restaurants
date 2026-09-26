import { MonthlyBilling } from './MonthlyBilling';
import type { BillingView } from './BillingTabs';

type SubscriptionBillingAreaProps = {
  restricted?: boolean;
  initialView?: BillingView;
};

export function SubscriptionBillingArea({
  restricted = false,
  initialView,
}: SubscriptionBillingAreaProps = {}) {
  return <MonthlyBilling restricted={restricted} initialView={initialView} />;
}
