import { useState } from 'react';

export type DemoCustomerView = 'HOME' | 'QR';
const key = 'gastronexa:demo:customer-view';

export function useDemoCustomerView() {
  const [view, setView] = useState<DemoCustomerView>(() => {
    try {
      return sessionStorage.getItem(key) === 'QR' ? 'QR' : 'HOME';
    } catch {
      return 'HOME';
    }
  });
  return [
    view,
    (next: DemoCustomerView) => {
      setView(next);
      try {
        sessionStorage.setItem(key, next);
      } catch {
        /* The current tab still works. */
      }
    },
  ] as const;
}
