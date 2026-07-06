import { OrderStatus, UserRole } from "@prisma/client";

const permissions = {
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

function canUserChangeStatus(role, status) {
  const allowed = permissions[role] || [];
  return allowed.includes(status);
}

export const OrderPermissions = {
  permissions,
  canUserChangeStatus,
};
