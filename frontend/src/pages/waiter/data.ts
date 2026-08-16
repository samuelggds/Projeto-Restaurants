import type { Employee, EmployeeWorkspaceData, RestaurantBrand } from './types';

export const restaurantMock: RestaurantBrand = {
  restaurantName: '',
  monogram: 'R',
  primaryColor: '#d64d08',
};
export const waiterMock: Employee = { id: '', name: '', email: '', role: 'WAITER', shift: '' };
export const kitchenMock: Employee = { id: '', name: '', email: '', role: 'KITCHEN', shift: '' };

export const workspaceMock: EmployeeWorkspaceData = { orders: [], tables: [], calls: [] };
