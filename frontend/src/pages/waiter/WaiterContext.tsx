import { createContext, useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import { workspaceMock } from './data';
import type { CallStatus, EmployeeWorkspaceData, EmployeeWorkspaceProps } from './types';

export type WaiterModuleProps = Omit<EmployeeWorkspaceProps, 'role' | 'onUpdateOrderStatus'>;
export type WaiterContextValue = WaiterModuleProps &
  EmployeeWorkspaceData & {
    role: 'WAITER';
    generateAccessCode: (tableId: string) => Promise<string>;
    updateCall: (id: string, status: CallStatus) => Promise<void>;
  };
// eslint-disable-next-line react-refresh/only-export-components
export const WaiterContext = createContext<WaiterContextValue | null>(null);

export function WaiterProvider({
  children,
  data = workspaceMock,
  ...props
}: PropsWithChildren<WaiterModuleProps>) {
  const [tables, setTables] = useState(data.tables);
  const [calls, setCalls] = useState(data.calls);
  const generateAccessCode = useCallback(
    async (tableId: string) => {
      const generated =
        (await props.onGenerateAccessCode?.(tableId)) ??
        String(Math.floor(1000 + Math.random() * 9000));
      setTables((items) =>
        items.map((table) =>
          table.id === tableId
            ? { ...table, accessCode: generated, status: 'AWAITING_CODE' }
            : table,
        ),
      );
      return generated;
    },
    [props],
  );
  const updateCall = useCallback(
    async (id: string, status: CallStatus) => {
      setCalls((items) =>
        items.map((call) =>
          call.id === id
            ? {
                ...call,
                status,
                employeeName: status === 'IN_PROGRESS' ? props.employee.name : call.employeeName,
              }
            : call,
        ),
      );
      await props.onUpdateCall?.(id, status);
    },
    [props],
  );
  const value = useMemo(
    () => ({
      ...props,
      data,
      role: 'WAITER' as const,
      orders: data.orders,
      tables,
      calls,
      generateAccessCode,
      updateCall,
    }),
    [props, data, tables, calls, generateAccessCode, updateCall],
  );
  return <WaiterContext.Provider value={value}>{children}</WaiterContext.Provider>;
}
