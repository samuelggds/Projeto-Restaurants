import { confirmDemoTablePayment } from './demoTableAccount';
import { KitchenModule } from '../../kitchen/KitchenModule';
import { WaiterModule } from '../../waiter/WaiterModule';
import { useState } from 'react';
import { demoOperationalOrders, demoWaiterAccounts } from './demoEmployeeAdapter';
import { useDemoHomeData } from './useDemoHomeData';
import {
  deleteDemoCall,
  toggleDemoOrderPaid,
  toggleDemoTable,
  updateDemoCallStatus,
  updateDemoOrderStatus,
  type DemoState,
} from './demoDomain';

type Props = { state: DemoState; onState: (state: DemoState) => void; onLogout: () => void };
const help = { notificationsEnabled: false, onReport: async () => undefined };
function useRestaurant() {
  const { brand } = useDemoHomeData();
  return {
    restaurantName: brand.name,
    monogram: brand.monogram ?? 'GB',
    logoUrl: brand.logoUrl,
    primaryColor: brand.primaryColor,
    soundNotifications: false,
  };
}
const sessionId = (tableId: string) => `demo-session:${tableId}`;

export function DemoKitchen({ state, onState, onLogout }: Props) {
  const restaurant = useRestaurant();
  const account = state.accounts.find((item) => item.role === 'COZINHA')!;
  return (
    <KitchenModule
      employee={{
        ...account,
        role: 'KITCHEN',
        shift: new Date(account.createdAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }}
      restaurant={restaurant}
      readingPreferenceKey="gastronexa:demo:kitchen-reading"
      employeeHelp={help}
      data={{ orders: demoOperationalOrders(state), tables: [], calls: [] }}
      workspaceState={{
        loading: false,
        refreshing: false,
        error: null,
        lastUpdatedAt: new Date().toISOString(),
        realtimeStatus: 'connected',
      }}
      onRefresh={() => undefined}
      onLogout={onLogout}
      onUpdateOrderStatus={(id, status) => {
        const order = state.orders.find((item) => item.id === Number(id));
        if (
          !order ||
          !(
            (order.status === 'PENDENTE' && status === 'PREPARANDO') ||
            (order.status === 'PREPARANDO' && status === 'PRONTO')
          )
        )
          throw new Error('Etapa inválida para a cozinha.');
        onState(updateDemoOrderStatus(state, order.id, status));
      }}
    />
  );
}

export function DemoWaiter({ state, onState, onLogout }: Props) {
  const restaurant = useRestaurant();
  const [now] = useState(() => Date.now());
  const account = state.accounts.find((item) => item.role === 'GARCOM')!;
  const accounts = demoWaiterAccounts(state);
  const confirm = async (id: string) => {
    if (id.startsWith('demo-table-payment:')) {
      onState(confirmDemoTablePayment(state, id));
      return;
    }
    const order = state.orders.find(
      (item) => `demo-payment:${item.id}` === id && item.channel === 'TABLE',
    );
    if (!order) throw new Error('Pagamento fictício não encontrado.');
    onState(toggleDemoOrderPaid(state, order.id));
  };
  return (
    <WaiterModule
      employee={{
        ...account,
        role: 'WAITER',
        shift: new Date(account.createdAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }}
      restaurant={restaurant}
      employeeHelp={help}
      data={{
        orders: demoOperationalOrders(state).filter((order) => order.channel === 'TABLE'),
        tables: state.tables.map((table) => ({
          ...table,
          status: accounts.some((account) => account.tableId === table.id) ? 'OCCUPIED' : 'FREE',
          sessionId: sessionId(table.id),
          sessionPublicId: sessionId(table.id),
          total:
            (accounts.find((account) => account.tableId === table.id)?.summary.remainingCents ??
              0) / 100,
        })),
        calls: state.calls.map((call) => ({
          ...call,
          elapsed: `${Math.max(0, Math.floor((now - Date.parse(call.createdAt)) / 60000))} min`,
        })),
        accounts,
      }}
      tableAccountRefreshKey={
        state.orders.filter((order) => order.paid).length + (state.tablePayments?.length ?? 0)
      }
      workspaceState={{
        loading: false,
        refreshing: false,
        error: null,
        lastUpdatedAt: new Date().toISOString(),
      }}
      tableAccountClient={{
        getAdminSnapshot: async (id) => {
          const account = accounts.find((item) => item.sessionPublicId === id);
          if (!account) throw new Error('Mesa fictícia não encontrada.');
          return {
            summary: account.summary,
            paymentIntents: account.pendingManualPayments.map((payment) => ({
              ...payment,
              manualConfirmedAt: null,
              manualConfirmedByName: null,
            })),
          };
        },
        confirmManualPayment: confirm,
      }}
      onUpdateOrderStatus={(id, status) => {
        const order = state.orders.find((item) => item.id === Number(id));
        if (
          !order ||
          order.channel !== 'TABLE' ||
          order.status !== 'PRONTO' ||
          status !== 'ENTREGUE'
        )
          throw new Error('Apenas pedidos de mesa prontos podem ser entregues pelo garçom.');
        onState(updateDemoOrderStatus(state, order.id, status));
      }}
      onOpenTable={(id) => {
        const table = state.tables.find((item) => item.id === id);
        if (!table) throw new Error('Mesa não encontrada.');
        if (!table.occupied) onState(toggleDemoTable(state, id));
        return { sessionId: sessionId(id) };
      }}
      onCloseTable={(id) => {
        const account = accounts.find((item) => item.tableSessionId === id);
        if (!account) throw new Error('Conta não encontrada.');
        if (
          account.summary.remainingCents > 0 ||
          state.orders.some(
            (order) =>
              order.channel === 'TABLE' &&
              order.tableNumber === account.tableNumber &&
              !['ENTREGUE', 'CANCELADO'].includes(order.status),
          )
        )
          throw new Error('Finalize os pedidos e quite o saldo antes de fechar a mesa.');
        const table = state.tables.find((item) => item.id === account.tableId);
        if (table?.occupied) onState(toggleDemoTable(state, table.id));
      }}
      onUpdateCall={(id, status) => onState(updateDemoCallStatus(state, id, status))}
      onDeleteCall={(id) => onState(deleteDemoCall(state, id))}
      onRefresh={() => undefined}
      onLogout={onLogout}
    />
  );
}
