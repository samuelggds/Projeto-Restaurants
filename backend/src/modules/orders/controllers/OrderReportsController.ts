import { Request, Response } from 'express';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { getRestaurantPeriodBoundaries } from '../../courierCompensation/domain/restaurantTimePeriods.js';
import { operationalPaymentWhere, parseOrderListQuery } from '../domain/orderListQuery.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';
import { readCustomerPage } from '../repositories/OrderCustomerRepository.js';

class OrderReportsController {
  async overview(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const overview = await withTenantDbContext(restaurantId, async (db) => {
        const settings = await db.restaurantSettings.findUnique({ where: { restaurantId }, select: { timezone: true } });
        const periods = getRestaurantPeriodBoundaries(new Date(), settings?.timezone || 'America/Sao_Paulo');
        const base = { restaurantId, AND: [operationalPaymentWhere] };
        const today = await db.order.aggregate({ where: { ...base,
          status: { not: 'CANCELADO' }, createdAt: periods.today }, _count: true, _sum: { total: true } });
        const preparingOrders = await db.order.count({ where: { ...base, status: 'PREPARANDO' } });
        const customers = await readCustomerPage(db, restaurantId, { limit: 0 });
        const sales = Number(today._sum.total || 0);
        return { todayOrders: today._count, sales, averageTicket: today._count ? sales / today._count : 0,
          preparingOrders, customers: customers.summary.customers, timezone: periods.timeZone };
      });
      return res.json(overview);
    } catch {
      return res.status(500).json({ error: 'Não foi possível carregar os indicadores.' });
    }
  }

  async customers(req: Request, res: Response) {
    try {
      const { limit, search } = parseOrderListQuery({ ...req.query, limit: req.query.limit ?? '12' });
      const offsetValue = req.query.offset;
      if (offsetValue !== undefined && (typeof offsetValue !== 'string' || !/^(0|[1-9]\d*)$/u.test(offsetValue) || Number(offsetValue) > 1_000_000)) {
        throw new OrderRequestError('Página de clientes inválida.');
      }
      const sort = req.query.sort || 'VALUE';
      if (typeof sort !== 'string' || !['VALUE', 'ORDERS', 'NAME'].includes(sort)) throw new OrderRequestError('Ordenação inválida.');
      return res.json(await withTenantDbContext(req.user.restaurantId, (db) => readCustomerPage(db, req.user.restaurantId,
        { limit, search, offset: Number(offsetValue || 0), sort })));
    } catch (error) {
      return res.status(error instanceof OrderRequestError ? error.statusCode : 500).json({
        error: error instanceof OrderRequestError ? error.message : 'Não foi possível carregar os clientes.',
      });
    }
  }
}

export default new OrderReportsController();
