export type EmployeeRole='WAITER'|'KITCHEN'
export type OrderChannel='TABLE'|'PICKUP'|'DELIVERY'
export type OrderStatus='PENDENTE'|'PREPARANDO'|'PRONTO'|'SAIU_PARA_ENTREGA'|'ENTREGUE'|'CANCELADO'
export type TableStatus='FREE'|'OCCUPIED'|'AWAITING_CODE'
export type CallType='WAITER'|'BILL'|'ACCESS_CODE'
export type CallStatus='WAITING'|'IN_PROGRESS'|'RESOLVED'

export interface RestaurantBrand{restaurantName:string;monogram:string;primaryColor:string}
export interface Employee{id:string;name:string;email:string;role:EmployeeRole;shift:string}
export interface Order{id:string;channel:OrderChannel;reference:string;customer?:string;items:string[];createdAt:string;createdAtIso?:string;preparationStartedAt?:string;readyAt?:string;elapsed:string;status:OrderStatus;total:number;observation?:string;completedAt?:string}
export interface RestaurantTable{id:string;number:number;status:TableStatus;accessCode?:string;guests:number;openedAt?:string;total:number}
export interface ServiceCall{id:string;tableNumber:number;type:CallType;status:CallStatus;elapsed:string;employeeName?:string}
export interface EmployeeWorkspaceData{orders:Order[];tables:RestaurantTable[];calls:ServiceCall[]}
export interface EmployeeWorkspaceProps{role:EmployeeRole;employee:Employee;restaurant:RestaurantBrand;data?:EmployeeWorkspaceData;onUpdateOrderStatus?:(orderId:string,status:OrderStatus)=>void|Promise<void>;onGenerateAccessCode?:(tableId:string)=>string|Promise<string>;onUpdateCall?:(callId:string,status:CallStatus)=>void|Promise<void>;onLogout?:()=>void}
