import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { workspaceMock } from './data';
import type { EmployeeWorkspaceData, EmployeeWorkspaceProps, OrderStatus } from './types';

export type KitchenModuleProps = Omit<
  EmployeeWorkspaceProps,
  'role' | 'onGenerateAccessCode' | 'onUpdateCall'
>;
export type KitchenContextValue = KitchenModuleProps &
  EmployeeWorkspaceData & {
    role: 'KITCHEN';
    updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
    reprintOrder: (id: string) => Promise<void>;
    updatingOrderIds: ReadonlySet<string>;
    reprintingOrderIds: ReadonlySet<string>;
    orderUpdateError: { orderId: string; message: string } | null;
    reprintError: { orderId: string; message: string } | null;
    reprintSuccessOrderId: string | null;
  };
// eslint-disable-next-line react-refresh/only-export-components
export const KitchenContext = createContext<KitchenContextValue | null>(null);

export function KitchenProvider({
  children,
  data = workspaceMock,
  ...props
}: PropsWithChildren<KitchenModuleProps>) {
  const orders = data.orders;
  const actionLocksRef = useRef(new Set<string>());
  const reprintLocksRef = useRef(new Set<string>());
  const reprintSuccessTimerRef = useRef<number | null>(null);
  const [updatingOrderIds, setUpdatingOrderIds] = useState<ReadonlySet<string>>(new Set());
  const [reprintingOrderIds, setReprintingOrderIds] = useState<ReadonlySet<string>>(new Set());
  const [orderUpdateError, setOrderUpdateError] = useState<{
    orderId: string;
    message: string;
  } | null>(null);
  const [reprintError, setReprintError] = useState<{ orderId: string; message: string } | null>(
    null,
  );
  const [reprintSuccessOrderId, setReprintSuccessOrderId] = useState<string | null>(null);
  const onUpdateOrderStatus = props.onUpdateOrderStatus;
  const onReprintOrder = props.onReprintOrder;

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const current = orders.find((order) => order.id === id);
      const allowed =
        current &&
        ((current.status === 'PENDENTE' && status === 'PREPARANDO') ||
          (current.status === 'PREPARANDO' && status === 'PRONTO'));
      if (!allowed) return;
      if (actionLocksRef.current.has(id)) return;
      if (!onUpdateOrderStatus) {
        setOrderUpdateError({
          orderId: id,
          message: 'A atualização de pedidos não está disponível neste momento.',
        });
        return;
      }

      actionLocksRef.current.add(id);
      setUpdatingOrderIds(new Set(actionLocksRef.current));
      setOrderUpdateError((currentError) => (currentError?.orderId === id ? null : currentError));
      try {
        await onUpdateOrderStatus(id, status);
        setOrderUpdateError((currentError) => (currentError?.orderId === id ? null : currentError));
      } catch (error: unknown) {
        const typed = error as {
          message?: string;
          response?: { data?: { error?: string; message?: string } };
        };
        setOrderUpdateError({
          orderId: id,
          message: String(
            typed.response?.data?.error ||
              typed.response?.data?.message ||
              typed.message ||
              'Não foi possível atualizar o pedido. Atualize a fila e tente novamente.',
          ),
        });
      } finally {
        actionLocksRef.current.delete(id);
        setUpdatingOrderIds(new Set(actionLocksRef.current));
      }
    },
    [onUpdateOrderStatus, orders],
  );

  const reprintOrder = useCallback(
    async (id: string) => {
      if (reprintLocksRef.current.has(id)) return;
      if (!orders.some((order) => order.id === id)) return;
      if (!onReprintOrder) {
        setReprintError({
          orderId: id,
          message: 'A reimpressão não está disponível neste momento.',
        });
        return;
      }

      reprintLocksRef.current.add(id);
      setReprintingOrderIds(new Set(reprintLocksRef.current));
      setReprintError((current) => (current?.orderId === id ? null : current));
      setReprintSuccessOrderId((current) => (current === id ? null : current));
      try {
        await onReprintOrder(id);
        setReprintError((current) => (current?.orderId === id ? null : current));
        setReprintSuccessOrderId(id);
        if (reprintSuccessTimerRef.current) window.clearTimeout(reprintSuccessTimerRef.current);
        reprintSuccessTimerRef.current = window.setTimeout(() => {
          setReprintSuccessOrderId((current) => (current === id ? null : current));
        }, 3200);
      } catch (error: unknown) {
        const typed = error as {
          message?: string;
          response?: { data?: { error?: string; message?: string } };
        };
        setReprintError({
          orderId: id,
          message: String(
            typed.response?.data?.error ||
              typed.response?.data?.message ||
              typed.message ||
              'Não foi possível solicitar a reimpressão.',
          ),
        });
      } finally {
        reprintLocksRef.current.delete(id);
        setReprintingOrderIds(new Set(reprintLocksRef.current));
      }
    },
    [onReprintOrder, orders],
  );

  const value = useMemo(
    () => ({
      ...props,
      data,
      role: 'KITCHEN' as const,
      orders,
      tables: data.tables,
      calls: data.calls,
      updateOrderStatus,
      reprintOrder,
      updatingOrderIds,
      reprintingOrderIds,
      orderUpdateError,
      reprintError,
      reprintSuccessOrderId,
    }),
    [
      props,
      data,
      orders,
      updateOrderStatus,
      reprintOrder,
      updatingOrderIds,
      reprintingOrderIds,
      orderUpdateError,
      reprintError,
      reprintSuccessOrderId,
    ],
  );
  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>;
}
