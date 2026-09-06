import { FuncionarioSubRole, OrderStatus, UserRole } from '@prisma/client';

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

function canUserChangeStatus(
  role: UserRole,
  status: OrderStatus,
  subRole?: FuncionarioSubRole | string | null,
) {
  if (role === UserRole.FUNCIONARIO) {
    const normalizedSubRole = String(subRole || '').toUpperCase();

    if (normalizedSubRole === FuncionarioSubRole.GARCOM) {
      return status === OrderStatus.ENTREGUE;
    }

    if (normalizedSubRole === FuncionarioSubRole.ATENDENTE) {
      return status === OrderStatus.ENTREGUE;
    }

    if (normalizedSubRole !== FuncionarioSubRole.COZINHA) return false;

    const kitchenStatuses: OrderStatus[] = [OrderStatus.PREPARANDO, OrderStatus.PRONTO];
    return kitchenStatuses.includes(status);
  }
  const allowed = permissions[role] || [];
  return allowed.includes(status);
}

export const OrderPermissions = {
  permissions,
  canUserChangeStatus,
};
