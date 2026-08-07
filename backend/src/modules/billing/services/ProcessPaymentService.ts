import billingRepository from "../repositories/BillingRepository.js";
import prisma from "../../../config/prisma.js";
import { hasBlockingInvoices } from "../utils/billingRules.js";
import { info } from "../utils/billingLogger.js";

type ProcessPaymentPayload = {
  invoiceId: number | string;
};

class ProcessPaymentService {
  async execute({ invoiceId }: ProcessPaymentPayload) {
    const normalizedInvoiceId = Number(invoiceId);

    if (!Number.isInteger(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
      throw new Error("Fatura inválida.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingInvoice = await billingRepository.findInvoiceById(
        normalizedInvoiceId,
        tx,
      );

      if (!existingInvoice) {
        throw new Error("Fatura não encontrada.");
      }

      const invoice =
        existingInvoice.status === "PAGO"
          ? existingInvoice
          : await billingRepository.updateInvoice(
              normalizedInvoiceId,
              {
                status: "PAGO",
                paidAt: new Date(),
              },
              tx,
            );

      const subscription =
        await billingRepository.findSubscriptionByRestaurantId(
          invoice.restaurantId,
          tx,
        );

      const openInvoices = await tx.invoice.findMany({
        where: {
          restaurantId: invoice.restaurantId,
          status: {
            in: ["PENDENTE", "ATRASADO"],
          },
        },
      });
      const remainsBlocked = hasBlockingInvoices(openInvoices, new Date());

      if (subscription) {
        await billingRepository.updateSubscription(
          subscription.id,
          { status: remainsBlocked ? "EXPIRADA" : "ATIVA" },
          tx,
        );
      }

      if (remainsBlocked) {
        await billingRepository.deactivateRestaurant(invoice.restaurantId, tx);
      } else {
        await billingRepository.activateRestaurant(invoice.restaurantId, tx);
      }

      return { invoice, remainsBlocked };
    });

    info(
      result.remainsBlocked
        ? "payment processed but restaurant remains blocked"
        : "payment processed and restaurant activated",
      {
        invoiceId: normalizedInvoiceId,
        restaurantId: result.invoice.restaurantId,
      },
    );

    return result.invoice;
  }
}

export default new ProcessPaymentService();
