import {
  createContext,
  useCallback,
  useMemo,
  type PropsWithChildren,
} from "react";
import { workspaceMock } from "./data";
import type {
  EmployeeWorkspaceData,
  EmployeeWorkspaceProps,
  OrderStatus,
} from "./types";

export type KitchenModuleProps = Omit<
  EmployeeWorkspaceProps,
  "role" | "onGenerateAccessCode" | "onUpdateCall"
>;
export type KitchenContextValue = KitchenModuleProps &
  EmployeeWorkspaceData & {
    role: "KITCHEN";
    updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  };
// eslint-disable-next-line react-refresh/only-export-components
export const KitchenContext = createContext<KitchenContextValue | null>(null);

export function KitchenProvider({
  children,
  data = workspaceMock,
  ...props
}: PropsWithChildren<KitchenModuleProps>) {
  const orders = data.orders;

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const current = orders.find((order) => order.id === id);
      const allowed =
        current &&
        ((current.status === "PENDENTE" && status === "PREPARANDO") ||
          (current.status === "PREPARANDO" && status === "PRONTO"));
      if (!allowed) return;
      await props.onUpdateOrderStatus?.(id, status);
    },
    [orders, props],
  );
  const value = useMemo(
    () => ({
      ...props,
      data,
      role: "KITCHEN" as const,
      orders,
      tables: data.tables,
      calls: data.calls,
      updateOrderStatus,
    }),
    [props, data, orders, updateOrderStatus],
  );
  return (
    <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
  );
}
