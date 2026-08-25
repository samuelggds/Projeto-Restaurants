import { createContext, useCallback, useMemo, type PropsWithChildren } from 'react';
import { workspaceMock } from './data';
import type { CallStatus, EmployeeWorkspaceData, EmployeeWorkspaceProps } from './types';

export type WaiterModuleProps = Omit<EmployeeWorkspaceProps, 'role' | 'onUpdateOrderStatus'>;
export type WaiterContextValue = WaiterModuleProps &
  EmployeeWorkspaceData & {
    role: 'WAITER';
    openTable: (tableId: string) => Promise<void>;
    closeTable: (sessionId: string) => Promise<void>;
    updateCall: (id: string, status: CallStatus) => Promise<void>;
    deleteCall: (id: string) => Promise<void>;
  };
// eslint-disable-next-line react-refresh/only-export-components
export const WaiterContext = createContext<WaiterContextValue | null>(null);

export function WaiterProvider({
  children,
  data = workspaceMock,
  ...props
}: PropsWithChildren<WaiterModuleProps>) {
  const { onOpenTable, onCloseTable, onUpdateCall, onDeleteCall } = props;

  const openTable = useCallback(
    async (tableId: string) => {
      if (!onOpenTable) {
        throw new Error('A abertura de mesas não está disponível neste momento.');
      }
      const result = await onOpenTable(tableId);
      if (!result?.sessionId) {
        throw new Error('O servidor não confirmou a abertura da mesa.');
      }
    },
    [onOpenTable],
  );
  const closeTable = useCallback(
    async (sessionId: string) => {
      if (!onCloseTable) {
        throw new Error('O fechamento de mesas não está disponível neste momento.');
      }
      await onCloseTable(sessionId);
    },
    [onCloseTable],
  );
  const updateCall = useCallback(
    async (id: string, status: CallStatus) => {
      if (!onUpdateCall) {
        throw new Error('O atendimento de chamados não está disponível neste momento.');
      }
      await onUpdateCall(id, status);
    },
    [onUpdateCall],
  );
  const deleteCall = useCallback(
    async (id: string) => {
      if (!onDeleteCall) {
        throw new Error('A exclusão de chamados não está disponível neste momento.');
      }
      await onDeleteCall(id);
    },
    [onDeleteCall],
  );
  const value = useMemo(
    () => ({
      ...props,
      data,
      role: 'WAITER' as const,
      orders: data.orders,
      tables: data.tables,
      calls: data.calls,
      openTable,
      closeTable,
      updateCall,
      deleteCall,
    }),
    [props, data, openTable, closeTable, updateCall, deleteCall],
  );
  return <WaiterContext.Provider value={value}>{children}</WaiterContext.Provider>;
}
