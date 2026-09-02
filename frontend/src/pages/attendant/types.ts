export type AttendantOrderType = 'MESA' | 'RETIRADA' | 'DELIVERY';
export type AttendantOrderStatus = 'PENDENTE' | 'PREPARANDO' | 'PRONTO';
export type AttendantCallType = 'WAITER' | 'BILL';
export type AttendantCallStatus = 'WAITING' | 'IN_PROGRESS' | 'RESOLVED';
export type AttendantTableStatus = 'OPEN' | 'CLOSING_REQUESTED';
export type AttendantView = 'overview' | 'orders' | 'tables' | 'calls';

export interface AttendantOrder {
  id: string;
  code: string;
  type: AttendantOrderType;
  status: AttendantOrderStatus;
  tableNumber: number | null;
  customerName: string | null;
  createdAt: string;
  readyAt: string | null;
  items: Array<{
    quantity: number;
    productName: string;
  }>;
}

export interface AttendantCall {
  id: string;
  tableNumber: number;
  type: AttendantCallType;
  status: AttendantCallStatus;
  assignedToName: string | null;
  requestedAt: string;
  assignedAt: string | null;
  resolvedAt: string | null;
}

export interface AttendantTable {
  id: string;
  tableNumber: number;
  status: AttendantTableStatus;
  openedAt: string;
  participantCount: number;
  activeOrderCount: number;
  activeCallCount: number;
}

export interface AttendantWorkspaceSnapshot {
  generatedAt: string;
  orders: AttendantOrder[];
  calls: AttendantCall[];
  tables: AttendantTable[];
}

export interface AttendantWorkspaceState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
}

export interface AttendantRestaurantBrand {
  name: string;
  monogram: string;
  primaryColor: string;
}
