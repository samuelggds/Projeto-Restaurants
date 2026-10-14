import { Router, type NextFunction, type Request, type Response } from 'express';

import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { promotionalCampaignAvailability, isPromotionalAudienceEligible } from '../domain/promotionalCampaignEligibility.js';
import { loyaltyRestaurantQuerySchema } from '../../../validators/CouponValidator.js';
import couponRepository from '../repositories/CouponRepository.js';
import { presentCoupon } from '../utils/couponPresenter.js';
import { couponControllerError } from '../controllers/CouponControllerHelpers.js';

import CreateCouponController from '../controllers/CreateCouponController.js';
import ListCouponController from '../controllers/ListCouponController.js';
import UpdateCouponController from '../controllers/UpdateCouponController.js';
import DeleteCouponController from '../controllers/DeleteCouponController.js';
import ListLoyaltyCouponsController from '../controllers/ListLoyaltyCouponsController.js';
import RedeemLoyaltyCouponController from '../controllers/RedeemLoyaltyCouponController.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';

const router = Router();

function clientMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'CLIENTE' || !req.user.id) {
    return res.status(403).json({ error: 'O programa de fidelidade é exclusivo para clientes.' });
  }
  return next();
}

// Public listing is strictly scoped and intentionally excludes loyalty rewards.
router.get('/public', async (req, res) => {
  try {
    const { restaurantId } = loyaltyRestaurantQuerySchema.parse(req.query);
    const coupons = await couponRepository.findActivePromotionalByRestaurant(restaurantId);
    return res.status(200).json(coupons
      .filter((coupon) => coupon.audience === 'ALL')
      .filter((coupon) => coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit)
      .map(presentCoupon));
  } catch (error: unknown) {
    return couponControllerError(res, error, 'Não foi possível consultar as campanhas.');
  }
});


/**
 * Carteira personalizada: nunca confia em userId vindo do navegador.
 * Apenas o cliente do tenant solicitado consulta cupons exclusivos e inativos.
 * Outros segmentos jamais são expostos pelo endpoint público.
 */
router.get('/mine', authMiddleware, clientMiddleware, async (req, res) => {
  try {
    const { restaurantId } = loyaltyRestaurantQuerySchema.parse(req.query);
    const userId = Number(req.user?.id || 0);
    if (!Number.isSafeInteger(userId) || userId <= 0)
      return res.status(403).json({ error: 'Conta de cliente inválida.' });
    // Customer accounts are global: registration does not assign restaurantId.
    // The requested restaurant only scopes coupons/orders; user identity comes
    // exclusively from the authenticated token, not from request parameters.

    const now = new Date();
    const coupons = await withTenantDbContext(restaurantId, async (db) => {
      const customer = await db.user.findFirst({
        where: { id: userId, role: 'CLIENTE', active: true,
          NOT: { email: { endsWith: '@gastronexa.local' } } },
        select: { id: true },
      });
      if (!customer) return null;

      const [campaigns, paidPurchases, lastPaidOrder] = await Promise.all([
        db.coupon.findMany({
          where: { restaurantId, kind: 'PROMOTIONAL' },
          orderBy: { id: 'desc' },
        }),
        db.order.count({
          where: { restaurantId, userId, paid: true, refundedAt: null, status: { not: 'CANCELADO' } },
        }),
        db.order.findFirst({ where: { restaurantId, userId, paid: true, refundedAt: null, status: { not: 'CANCELADO' } }, orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }], select: { paidAt: true, createdAt: true } }),
      ]);
      if (!campaigns.length) return [];
      const usageRows = await db.order.groupBy({
        by: ['couponId'],
        where: {
          restaurantId, userId, status: { not: 'CANCELADO' },
          couponId: { in: campaigns.map((campaign) => campaign.id) },
        },
        _count: { _all: true },
      });
      const usesByCouponId = new Map(usageRows.map((usage) => [usage.couponId, usage._count._all]));
      const targeted = await db.couponRecipient.findMany({ where: { restaurantId, userId, couponId: { in: campaigns.map((c) => c.id) } }, select: { couponId: true } });
      const recipientIds = new Set(targeted.map((item) => item.couponId));
      const lastPaidAt = lastPaidOrder?.paidAt || lastPaidOrder?.createdAt || null;
      return campaigns.flatMap((campaign) => {
        const userUses = usesByCouponId.get(campaign.id) || 0;
        // Mostrar benefícios para o segmento atual e campanhas já utilizadas
        // pelo próprio cliente, mesmo quando sua elegibilidade mudou.
        if (!isPromotionalAudienceEligible(campaign.audience, paidPurchases, { lastPaidAt, inactivityMonths: campaign.inactivityMonths, now, recipient: recipientIds.has(campaign.id) }) && userUses === 0)
          return [];
        const availability = promotionalCampaignAvailability(
          campaign, paidPurchases, userUses, now, { lastPaidAt, recipient: recipientIds.has(campaign.id) },
        );
        return [{ ...presentCoupon(campaign), ...availability }];
      });
    });
    if (!coupons) return res.status(403).json({ error: 'Cliente não autorizado.' });
    return res.status(200).json(coupons);
  } catch (error: unknown) {
    return couponControllerError(res, error, 'Não foi possível consultar seus cupons.');
  }
});

// Contas reais do tenant, nunca contatos agregados do histórico de pedidos.
router.get('/eligible-customers', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const restaurantId = Number(req.user?.restaurantId || 0);
    if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) return res.status(403).json({ error: 'Restaurante não identificado.' });
    const search = String(req.query.search || '').trim().slice(0, 90);
    const users = await withTenantDbContext(restaurantId, (db) => db.user.findMany({
      where: {
        restaurantId, role: 'CLIENTE', active: true,
        NOT: { email: { endsWith: '@gastronexa.local' } },
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 40,
    }));
    return res.status(200).json(users);
  } catch (error: unknown) {
    return couponControllerError(res, error, 'Não foi possível buscar os clientes cadastrados.');
  }
});

router.get('/loyalty', authMiddleware, clientMiddleware, (req, res) =>
  ListLoyaltyCouponsController.handle(req, res),
);

router.post('/:id/redeem', authMiddleware, clientMiddleware, (req, res) =>
  RedeemLoyaltyCouponController.handle(req, res),
);

router.post('/', authMiddleware, adminMiddleware, billingMiddleware, (req, res) =>
  CreateCouponController.handle(req, res),
);

router.get('/', authMiddleware, adminMiddleware, (req, res) =>
  ListCouponController.handle(req, res),
);

router.put('/:id', authMiddleware, adminMiddleware, (req, res) =>
  UpdateCouponController.handle(req, res),
);

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) =>
  DeleteCouponController.handle(req, res),
);

export default router;
