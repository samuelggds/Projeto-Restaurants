import { useState } from 'react';
import { TableServiceActions } from '../../Home/components/TableServiceActions';
import { FloatingActionsControl } from '../../Home/components/FloatingActionsControl';
import { TableOrderStatusNotice } from '../../Home/components/TableOrderStatusNotice';
import { getTableOrderNotice } from '../../Home/domain/tableOrderNotice';
import * as H from '../../Home/Home.styles';
import type { DemoState } from './demoDomain';

export function DemoTableActions({
  state,
  primary,
  waiterEnabled,
  billEnabled,
  accountEnabled,
  onRequest,
  onAccount,
}: {
  state: DemoState;
  primary: string;
  waiterEnabled: boolean;
  billEnabled: boolean;
  accountEnabled: boolean;
  onRequest: (type: 'WAITER' | 'BILL') => void;
  onAccount: () => void;
}) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 700);
  const latest = state.orders.find(
    (order) =>
      order.channel === 'TABLE' &&
      order.tableNumber === 8 &&
      order.customerEmail === 'cliente@demo.gastronexa.com.br',
  );
  const notice = latest
    ? getTableOrderNotice({
        ...latest,
        items: latest.items.map((item) => ({ ...item, product: { name: item.name } })),
      })
    : null;
  return (
    <H.FloatingActions $primary={primary} $aboveNudge={false}>
      <FloatingActionsControl
        mode="table"
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      {!collapsed && (
        <>
          <TableServiceActions
            embedded
            tableNumber="08"
            waiterEnabled={waiterEnabled}
            billEnabled={billEnabled}
            accountEnabled={accountEnabled}
            loading={null}
            onCallWaiter={() => onRequest('WAITER')}
            onRequestBill={() => onRequest('BILL')}
            onOpenAccount={onAccount}
          />
          <TableOrderStatusNotice primaryColor={primary} tableLabel="08" order={notice} />
        </>
      )}
    </H.FloatingActions>
  );
}
