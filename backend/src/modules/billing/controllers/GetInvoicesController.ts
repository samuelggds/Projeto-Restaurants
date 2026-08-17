import { Request, Response } from 'express';
import billingRepository from '../repositories/BillingRepository.js';
import { getGraceLimitDate } from '../utils/billingRules.js';
import { getBillingStartDate, getCompletedSubscriptionMonths } from '../utils/billingTimeline.js';
import { getPixAvailableAt, isInvoicePixAvailable } from '../utils/billingPaymentWindow.js';

class GetInvoicesController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      if (!restaurantId) {
        return res.status(400).json({
          error: 'Restaurant ID not found in user context',
        });
      }

      // Get all invoices for the restaurant
      const invoices = await billingRepository.findInvoicesByRestaurantId(restaurantId);

      const subscription = await billingRepository.findSubscriptionByRestaurantId(
        Number(restaurantId),
      );
      const subscriptionStatus = String(subscription?.status || '').toUpperCase();
      const isPlanActive = subscriptionStatus === 'ATIVA' || subscriptionStatus === 'TESTE';
      const admin = subscription?.restaurant.users[0] || null;
      const restaurantCreatedAt = subscription?.restaurant.createdAt || null;
      const billingStartedAt = restaurantCreatedAt
        ? getBillingStartDate(restaurantCreatedAt, admin?.createdAt)
        : subscription?.createdAt || null;
      const payableInvoice = invoices.find((invoice) =>
        ['PENDENTE', 'ATRASADO'].includes(invoice.status),
      );

      const billing = {
        plan: String(subscription?.plan || 'BASICO').toUpperCase(),
        subscriptionStatus,
        isPlanActive,
        restaurantCreatedAt,
        adminCreatedAt: admin?.createdAt || null,
        adminName: admin?.name || null,
        billingStartedAt,
        completedMonths: billingStartedAt ? getCompletedSubscriptionMonths(billingStartedAt) : 0,
        currentCycle: billingStartedAt ? getCompletedSubscriptionMonths(billingStartedAt) + 1 : 1,
        currentInvoiceId: payableInvoice?.id || null,
        dueDate: payableInvoice?.dueDate || null,
        graceLimitDate: payableInvoice?.dueDate ? getGraceLimitDate(payableInvoice.dueDate) : null,
        pixAvailableAt: payableInvoice?.dueDate ? getPixAvailableAt(payableInvoice.dueDate) : null,
        pixAvailable: payableInvoice ? isInvoicePixAvailable(payableInvoice) : false,
      };

      return res.status(200).json({
        invoices,
        billing,
      });
    } catch (error: unknown) {
      console.error('Error fetching invoices:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch invoices',
      });
    }
  }
}

export default new GetInvoicesController();
