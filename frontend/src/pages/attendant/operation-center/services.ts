import { createContext, useContext } from 'react';
import attendantApi from '../attendantApi';
import ordersService from '../../../Services/ordersService';
import productsService from '../../../Services/productsService';
import type { useOrderHistory } from '../../../hooks/useOrderHistory';
import type { Raw } from './types';

export type OperationSupportHistory = ReturnType<typeof useOrderHistory>;
export interface OperationServices {
  getOrder: (id: number) => Promise<Raw>;
  completePickup: (id: number) => Promise<unknown>;
  createOrder: (payload: Raw) => Promise<unknown>;
  listProducts: (restaurantId: number) => Promise<unknown[]>;
  updateCallStatus: (id: string, status: 'IN_PROGRESS' | 'RESOLVED') => Promise<unknown>;
  listOpenOrderIssues: () => Promise<unknown[]>;
  getIssueThread: (id: number) => Promise<Raw>;
  replyIssue: (id: number, message: string) => Promise<Raw>;
  resolveIssue: (id: number) => Promise<unknown>;
  supportHistory?: OperationSupportHistory;
}

export const productionOperationServices: OperationServices = {
  getOrder: (id) => attendantApi.getOrder(id),
  completePickup: (id) => attendantApi.completePickup(id),
  createOrder: (payload) => attendantApi.createOrder(payload),
  listProducts: (restaurantId) => productsService.listProducts(restaurantId),
  updateCallStatus: (id, status) => attendantApi.updateCallStatus(id, status),
  listOpenOrderIssues: () => ordersService.listOpenOrderIssues(),
  getIssueThread: (id) => ordersService.getIssueThread(id),
  replyIssue: (id, message) => ordersService.replyIssue(id, message),
  resolveIssue: (id) => ordersService.resolveIssue(id),
};

export const OperationServicesContext = createContext(productionOperationServices);
export function useOperationServices() {
  return useContext(OperationServicesContext);
}
