import { OrderStatus, UserRole } from "@prisma/client";

const permissions: Partial<Record<UserRole, OrderStatus[]>> = {
  [UserRole.ADMIN]: [
    OrderStatus.PENDENTE,
    OrderStatus.PREPARANDO,
    OrderStatus.PRONTO,
    OrderStatus.SAIU_PARA_ENTREGA,
    OrderStatus.ENTREGUE,
    OrderStatus.CANCELADO,
  ],

  [UserRole.FUNCIONARIO]: [
    OrderStatus.PREPARANDO,
    OrderStatus.PRONTO,
    OrderStatus.SAIU_PARA_ENTREGA,
    OrderStatus.ENTREGUE,
  ],

  [UserRole.MOTOQUEIRO]: [OrderStatus.ENTREGUE],

  [UserRole.CLIENTE]: [OrderStatus.CANCELADO],
};

function canUserChangeStatus(role: UserRole, status: OrderStatus) {
  const allowed = permissions[role] || [];
  return allowed.includes(status);
}

export const OrderPermissions = {
  permissions,
  canUserChangeStatus,
};
