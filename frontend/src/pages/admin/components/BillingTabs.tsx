import { CreditCard, Layers3, ReceiptText } from 'lucide-react';
import { ViewTabs } from './MonthlyBilling.styles';

export type BillingView = 'payment' | 'plans' | 'charges';

export function BillingTabs({
  view,
  onChange,
  restricted,
  openInvoices,
}: {
  view: BillingView;
  onChange: (view: BillingView) => void;
  restricted: boolean;
  openInvoices: number;
}) {
  const tabs = [
    {
      id: 'payment' as const,
      label: 'Pagamento',
      description: 'Sua forma de pagamento',
      Icon: CreditCard,
    },
    ...(!restricted
      ? [
          {
            id: 'plans' as const,
            label: 'Planos',
            description: 'Compare os benefícios',
            Icon: Layers3,
          },
        ]
      : []),
    {
      id: 'charges' as const,
      label: 'Cobranças',
      description: 'Vencimentos e histórico',
      Icon: ReceiptText,
    },
  ];
  return (
    <ViewTabs role="tablist" aria-label="Seções de cobrança e assinatura">
      {tabs.map(({ id, label, description, Icon }, index) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`billing-tab-${id}`}
          aria-controls={`billing-panel-${id}`}
          aria-selected={view === id}
          tabIndex={view === id ? 0 : -1}
          className={view === id ? 'active' : ''}
          onClick={() => onChange(id)}
          onKeyDown={(event) => {
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : event.key === 'ArrowRight'
                    ? (index + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (index + tabs.length - 1) % tabs.length
                      : null;
            if (next === null) return;
            event.preventDefault();
            onChange(tabs[next].id);
            document.getElementById(`billing-tab-${tabs[next].id}`)?.focus();
          }}
        >
          <Icon aria-hidden="true" />
          <span>
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
          {id === 'charges' && openInvoices > 0 ? (
            <em aria-label={`${openInvoices} em aberto`}>{openInvoices}</em>
          ) : null}
        </button>
      ))}
    </ViewTabs>
  );
}
