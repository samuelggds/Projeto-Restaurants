import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';
import { operationalPaymentWhere, type OrderListQuery } from '../domain/orderListQuery.js';
import { readOrderPage } from '../repositories/OrderListRepository.js';
import courierAccessService from './CourierAccessService.js';
import { calculateCourierCompensation } from '../../courierCompensation/domain/courierCompensation.js';
import { findEffectiveCompensationPolicy } from '../../courierCompensation/repositories/CourierCompensationRepository.js';

type Viewer = { restaurantId: number; id: number; role: string; subRole?: string | null };

export function staffOrderScope(viewer: Viewer): Prisma.OrderWhereInput {
  const { restaurantId, role, subRole, id } = viewer;
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) throw new OrderRequestError('Restaurante inválido.');
  const base: Prisma.OrderWhereInput = { restaurantId, AND: [operationalPaymentWhere] };
  if (role === 'MOTOQUEIRO') return { ...base, type: 'DELIVERY',
    status: { in: ['PRONTO', 'SAIU_PARA_ENTREGA', 'ENTREGUE'] },
    OR: [{ status: 'PRONTO', assignedCourierId: null }, { assignedCourierId: id }],
  };
  if (role === 'FUNCIONARIO') {
    if (subRole === 'GARCOM') return { ...base, type: 'MESA', status: 'PRONTO',
      tableSession: { is: { restaurantId, status: { in: ['OPEN', 'CLOSING_REQUESTED'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      } },
    };
    if (!['COZINHA', 'ATENDENTE'].includes(subRole || '')) throw new OrderRequestError('Funcionário sem perfil operacional válido.', 403);
  } else if (role !== 'ADMIN') throw new OrderRequestError('Acesso negado.', 403);
  return base;
}

class PaginatedOrdersService {
  async staff(viewer: Viewer, query: OrderListQuery) {
    const base = staffOrderScope(viewer);
    if (viewer.role === 'MOTOQUEIRO') {
      await courierAccessService.assertActiveCourier(viewer.id, viewer.restaurantId);
    }
    return withTenantDbContext(viewer.restaurantId, async (db) => {
      const page = await readOrderPage(db, base, query, {
        ascending: viewer.role === 'MOTOQUEIRO' || viewer.subRole === 'GARCOM',
        waiter: viewer.role === 'FUNCIONARIO' && viewer.subRole === 'GARCOM',
        includeSummary: viewer.role === 'ADMIN',
      });
      if (viewer.role !== 'MOTOQUEIRO') return page;
      const policy = await findEffectiveCompensationPolicy(db, viewer.restaurantId, viewer.id);
      return { ...page, orders: page.orders.map((order) => {
        try {
          return { ...order, courierEarningPreview: { available: true,
            amount: Number(calculateCourierCompensation(policy, order.deliveryDistanceMeters)),
            model: policy.model, source: policy.source } };
        } catch (error) {
          return { ...order, courierEarningPreview: { available: false, amount: null,
            model: policy.model, source: policy.source,
            reason: error instanceof Error ? error.message : 'Valor indisponível.' } };
        }
      }) };
    });
  }

  async mine(viewer: Viewer, query: OrderListQuery) {
    const base: Prisma.OrderWhereInput = { userId: viewer.id,
      ...(viewer.restaurantId > 0 ? { restaurantId: viewer.restaurantId } : {}),
      NOT: [
        { paymentMethod: 'PIX', paid: false, pixPaymentId: { not: null } },
        { paymentMethod: 'CARTAO', paid: false, cardCheckoutSessionId: { not: null } },
      ],
    };
    const read = (db: Prisma.TransactionClient) => readOrderPage(db, base, query);
    return viewer.restaurantId > 0 ? withTenantDbContext(viewer.restaurantId, read) : prisma.$transaction(read);
  }
}

export default new PaginatedOrdersService();
