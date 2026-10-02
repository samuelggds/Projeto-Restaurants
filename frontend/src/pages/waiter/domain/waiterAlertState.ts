import type { EmployeeWorkspaceData } from '../types';

export function waiterAlertKeys(data: EmployeeWorkspaceData) {
  const keys = new Set<string>();

  data.calls
    .filter((call) => call.status === 'WAITING')
    .forEach((call) => {
      keys.add(`call:${call.id}`);
    });

  data.accounts.forEach((account) => {
    account.pendingManualPayments
      .filter(
        (payment) =>
          payment.method === 'CASH' &&
          !payment.staffReceiptRegistered &&
          (payment.status === 'RESERVED' || payment.status === 'PROCESSING'),
      )
      .forEach((payment) => {
        keys.add(`cash:${payment.publicId}`);
      });
  });

  return Array.from(keys);
}

export function hasUnalertedWaiterEvent(keys: string[], alerted: ReadonlySet<string>) {
  return keys.some((key) => !alerted.has(key));
}
