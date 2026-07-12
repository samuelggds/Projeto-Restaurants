import { PlanType } from "@prisma/client";
import requestPlanChangeService from "../services/RequestPlanChangeService.js";
class RequestPlanChangeController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { plan } = req.body;
            if (!restaurantId) {
                return res.status(400).json({
                    error: "Restaurant ID not found in user context",
                });
            }
            if (!plan || !Object.values(PlanType).includes(plan)) {
                return res.status(400).json({
                    error: "Plano invalido.",
                });
            }
            const subscription = await requestPlanChangeService.execute({
                restaurantId,
                plan,
            });
            return res.status(200).json(subscription);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao solicitar troca de plano",
            });
        }
    }
}
export default new RequestPlanChangeController();
