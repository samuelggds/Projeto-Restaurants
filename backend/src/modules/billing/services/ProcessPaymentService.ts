import billingRepository from "../repositories/BillingRepository.js";
import prisma from "../../../config/prisma.js";
import { hasBlockingInvoices } from "../utils/billingRules.js";
import { info } from "../utils/billingLogger.js";

type ProcessPaymentPayload = {
  invoiceId: number | string;
};

class ProcessPaymentService {
  async execute({ invoiceId }: ProcessPaymentPayload) {
    const invoice = await billingRepository.updateInvoice(invoiceId, {
      status: "PAGO",
      paidAt: new Date(),
    });

    const subscription = await billingRepository.findSubscriptionByRestaurantId(
      invoice.restaurantId,
    );

    const openInvoices = await prisma.invoice.findMany({
      where: {
        restaurantId: invoice.restaurantId,
        status: {
          in: ["PENDENTE", "ATRASADO"],
        },
      },
    });

    const hasBlockingInvoice = hasBlockingInvoices(openInvoices, new Date());

    if (!hasBlockingInvoice) {
      if (subscription) {
        await billingRepository.updateSubscription(subscription.id, {
          status: "ATIVA",
        });
      }

      await billingRepository.activateRestaurant(invoice.restaurantId);
      info("payment processed and restaurant activated", {
        invoiceId,
        restaurantId: invoice.restaurantId,
      });
    } else {
      if (subscription) {
        await billingRepository.updateSubscription(subscription.id, {
          status: "EXPIRADA",
        });
      }

      await billingRepository.deactivateRestaurant(invoice.restaurantId);
      info("payment processed but restaurant remains blocked", {
        invoiceId,
        restaurantId: invoice.restaurantId,
      });
    }

    return invoice;
  }
}

export default new ProcessPaymentService();
