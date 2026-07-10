import { Request, Response } from "express";
import billingRepository from "../repositories/BillingRepository.js";

class GetInvoicesController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      if (!restaurantId) {
        return res.status(400).json({
          error: "Restaurant ID not found in user context",
        });
      }

      // Get all invoices for the restaurant
      const invoices =
        await billingRepository.findInvoicesByRestaurantId(restaurantId);

      const subscription =
        await billingRepository.findSubscriptionByRestaurantId(
          Number(restaurantId),
        );
      const subscriptionStatus = String(
        subscription?.status || "",
      ).toUpperCase();
      const isPlanActive =
        subscriptionStatus === "ATIVA" || subscriptionStatus === "TESTE";

      const billing = {
        plan: String(subscription?.plan || "BASICO").toUpperCase(),
        subscriptionStatus,
        isPlanActive,
      };

      return res.status(200).json({
        invoices,
        billing,
      });
    } catch (error: unknown) {
      console.error("Error fetching invoices:", error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to fetch invoices",
      });
    }
  }
}

export default new GetInvoicesController();
