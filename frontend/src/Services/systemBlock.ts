const SYSTEM_BLOCK_KEY = 'system_block_state';
const SYSTEM_BLOCK_EVENT = 'system-block-state-changed';

export type SystemBlockState = {
  blocked: true;
  reason: 'BILLING' | 'MANUAL';
  message: string;
  paymentLink: string | null;
  invoiceId: number | string | null;
  dueDate: string | null;
  restaurantId?: number | null;
  updatedAt: string;
};

export type BillingInvoiceLike = {
  id?: number | string | null;
  status?: string | null;
  dueDate?: string | Date | null;
  paymentLink?: string | null;
};

function notifySystemBlockChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SYSTEM_BLOCK_EVENT));
  }
}

function addBusinessDays(date: Date, businessDays: number) {
  const result = new Date(date);
  let added = 0;

  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }

  return result;
}

export function isBillingInvoiceBlocking(invoice: BillingInvoiceLike, now = new Date()) {
  const status = String(invoice?.status || '').toUpperCase();
  if (status === 'ATRASADO' || status === 'VENCIDO') return true;
  if (status !== 'PENDENTE' || !invoice?.dueDate) return false;

  const dueDate = new Date(invoice.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  return now > addBusinessDays(dueDate, 5);
}

export function findBlockingInvoice(invoices: BillingInvoiceLike[] = [], now = new Date()) {
  const blockingInvoices = invoices.filter((invoice) => isBillingInvoiceBlocking(invoice, now));
  return (
    blockingInvoices.find((invoice) => Boolean(invoice.paymentLink)) || blockingInvoices[0] || null
  );
}

export function getSystemBlockState(): SystemBlockState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SYSTEM_BLOCK_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SystemBlockState>;
    if (parsed?.blocked !== true) return null;

    return {
      blocked: true,
      reason: parsed.reason === 'MANUAL' ? 'MANUAL' : 'BILLING',
      message: String(parsed.message || 'Sistema bloqueado por inadimplência'),
      paymentLink: typeof parsed.paymentLink === 'string' ? parsed.paymentLink : null,
      invoiceId: parsed.invoiceId ?? null,
      dueDate: parsed.dueDate ? String(parsed.dueDate) : null,
      restaurantId:
        Number.isInteger(Number(parsed.restaurantId)) && Number(parsed.restaurantId) > 0
          ? Number(parsed.restaurantId)
          : null,
      updatedAt: String(parsed.updatedAt || new Date(0).toISOString()),
    };
  } catch {
    window.localStorage.removeItem(SYSTEM_BLOCK_KEY);
    return null;
  }
}

export function setSystemBlockState(
  payload: Partial<Omit<SystemBlockState, 'blocked' | 'updatedAt'>>,
) {
  if (typeof window === 'undefined') return;

  const state: SystemBlockState = {
    blocked: true,
    reason: payload.reason === 'MANUAL' ? 'MANUAL' : 'BILLING',
    message: String(payload.message || 'Sistema bloqueado por inadimplência'),
    paymentLink: typeof payload.paymentLink === 'string' ? payload.paymentLink : null,
    invoiceId: payload.invoiceId ?? null,
    dueDate: payload.dueDate ? String(payload.dueDate) : null,
    restaurantId:
      Number.isInteger(Number(payload.restaurantId)) && Number(payload.restaurantId) > 0
        ? Number(payload.restaurantId)
        : null,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(SYSTEM_BLOCK_KEY, JSON.stringify(state));
  notifySystemBlockChange();
}

export function clearSystemBlockState() {
  if (typeof window === 'undefined') return;
  const hadState = Boolean(window.localStorage.getItem(SYSTEM_BLOCK_KEY));
  window.localStorage.removeItem(SYSTEM_BLOCK_KEY);
  if (hadState) notifySystemBlockChange();
}

export function subscribeSystemBlockState(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === SYSTEM_BLOCK_KEY) listener();
  };
  window.addEventListener(SYSTEM_BLOCK_EVENT, listener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(SYSTEM_BLOCK_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
