import { useState } from 'react';
import { TableAccountPanel } from '../../Home/components/TableAccountPanel';
import { readDemoAdminData } from './demoAdminData';
import {
  cancelDemoTablePayment,
  createDemoTablePayment,
  demoTableAccount,
} from './demoTableAccount';
import type { DemoState } from './demoDomain';

export function DemoTableAccountPanel({
  open,
  state,
  onState,
  onClose,
}: {
  open: boolean;
  state: DemoState;
  onState: (next: DemoState) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  const snapshot = demoTableAccount(state);
  const { tableAccount } = readDemoAdminData().settings;
  snapshot.capabilities = {
    ...snapshot.capabilities,
    enabled: tableAccount.enabled,
    allowCash: tableAccount.allowCash,
    allowCardMachine: tableAccount.allowCardMachine,
    allowOnlinePayment: tableAccount.allowOnlinePayment,
    allowSplit: tableAccount.allowSplit,
  };
  return (
    <TableAccountPanel
      open={open}
      tableNumber="08"
      snapshot={snapshot}
      loading={false}
      actionLoading={false}
      error={error}
      onRefresh={() => setError('')}
      onCreatePayment={async (draft) => {
        try {
          const result = createDemoTablePayment(state, draft);
          onState(result.state);
          setError('');
          return { payment: result.payment, idempotentReplay: false };
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : 'Não foi possível simular o pagamento.',
          );
          return null;
        }
      }}
      onCancelPayment={async (id) => {
        onState(cancelDemoTablePayment(state, id));
        return true;
      }}
      onReconcilePayment={async (id) =>
        state.tablePayments?.find((entry) => entry.payment.publicId === id)?.payment ?? null
      }
      onClose={onClose}
    />
  );
}
