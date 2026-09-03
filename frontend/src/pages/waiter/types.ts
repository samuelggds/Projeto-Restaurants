export type EmployeeRole = 'WAITER' | 'KITCHEN';
export type OrderChannel = 'TABLE' | 'PICKUP' | 'DELIVERY';
export type OrderStatus =
  'PENDENTE' | 'PREPARANDO' | 'PRONTO' | 'SAIU_PARA_ENTREGA' | 'ENTREGUE' | 'CANCELADO';
export type TableStatus = 'FREE' | 'OCCUPIED';
export type TableSessionStatus = 'OPEN' | 'CLOSING_REQUESTED';
export type CallType = 'WAITER' | 'BILL';
export type CallStatus = 'WAITING' | 'IN_PROGRESS' | 'RESOLVED';

export interface RestaurantBrand {
  restaurantName: string;
  monogram: string;
  primaryColor: string;
  restaurantId?: number;
  slug?: string;
}
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  shift: string;
}
export interface Order {
  id: string;
  channel: OrderChannel;
  reference: string;
  customer?: string;
  items: string[];
  createdAt: string;
  elapsed: string;
  status: OrderStatus;
  total: number;
  observation?: string;
  completedAt?: string;
}
export interface RestaurantTable {
  id: string;
  number: number;
  status: TableStatus;
  sessionStatus?: TableSessionStatus;
  sessionId?: string;
  sessionPublicId?: string;
  guests: number;
  openedAt?: string;
  total: number;
}

export interface WaiterTableAccountSnapshot {
  summary: {
    consumedCents: number;
    netPaidCents: number;
    processingCents: number;
    remainingCents: number;
  };
  paymentIntents: Array<{
    publicId: string;
    method: 'PIX' | 'CARD' | 'CASH' | 'CARD_MACHINE';
    status: 'RESERVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELED' | 'REFUNDED';
    totalCents: number;
    createdAt: string;
    manualConfirmedAt: string | null;
    manualConfirmedByName: string | null;
  }>;
}
export interface WaiterManualPayment {
  publicId: string;
  method: 'CASH' | 'CARD_MACHINE';
  status: 'RESERVED' | 'PROCESSING';
  totalCents: number;
  createdAt: string;
}
export interface WaiterAccountSession {
  tableSessionId: string;
  sessionPublicId: string;
  tableId: string;
  tableNumber: number;
  openedAt: string;
  status: TableSessionStatus;
  openedByName: string;
  summary: {
    consumedCents: number;
    netPaidCents: number;
    reservedCents: number;
    processingCents: number;
    remainingCents: number;
    participantsCount: number;
  };
  itemsCount: number;
  paymentCounts: {
    reserved: number;
    processing: number;
    online: number;
    inPerson: number;
  };
  pendingManualPayments: WaiterManualPayment[];
}
export interface ServiceCall {
  id: string;
  tableNumber: number;
  type: CallType;
  status: CallStatus;
  elapsed: string;
  employeeName?: string;
  createdAt?: string;
  resolvedAt?: string;
}
export interface WaiterWorkspaceState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
}
export interface OpenTableResult {
  sessionId: string;
}
export interface EmployeeWorkspaceData {
  orders: Order[];
  tables: RestaurantTable[];
  calls: ServiceCall[];
  accounts: WaiterAccountSession[];
}
export interface EmployeeWorkspaceProps {
  role: EmployeeRole;
  employee: Employee;
  restaurant: RestaurantBrand;
  data?: EmployeeWorkspaceData;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void | Promise<void>;
  onOpenTable?: (tableId: string) => OpenTableResult | Promise<OpenTableResult>;
  onCloseTable?: (sessionId: string) => void | Promise<void>;
  onUpdateCall?: (callId: string, status: CallStatus) => void | Promise<void>;
  onDeleteCall?: (callId: string) => void | Promise<void>;
  workspaceState?: WaiterWorkspaceState;
  tableAccountRefreshKey?: number;
  onRefresh?: () => void | Promise<void>;
  onLogout?: () => void;
}
