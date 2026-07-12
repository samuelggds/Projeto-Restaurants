import listSupportChatMessagesService from "../services/ListSupportChatMessagesService.js";
class ListSupportChatMessagesController {
    async handle(req, res) {
        try {
            const { role, restaurantId } = req.user;
            const rawRestaurantId = Array.isArray(req.query.restaurantId) &&
                req.query.restaurantId.length > 0
                ? req.query.restaurantId[0]
                : req.query.restaurantId || null;
            const queryRestaurantId = typeof rawRestaurantId === "string" ||
                typeof rawRestaurantId === "number"
                ? rawRestaurantId
                : null;
            const rawBeforeId = Array.isArray(req.query.beforeId) && req.query.beforeId.length > 0
                ? req.query.beforeId[0]
                : req.query.beforeId || null;
            const queryBeforeId = typeof rawBeforeId === "string" || typeof rawBeforeId === "number"
                ? rawBeforeId
                : null;
            const rawLimit = Array.isArray(req.query.limit) && req.query.limit.length > 0
                ? req.query.limit[0]
                : req.query.limit || null;
            const queryLimit = typeof rawLimit === "string" || typeof rawLimit === "number"
                ? rawLimit
                : null;
            const result = await listSupportChatMessagesService.execute({
                requesterRole: role,
                requesterRestaurantId: restaurantId,
                queryRestaurantId,
                queryBeforeId,
                queryLimit,
            });
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao carregar histórico do chat de suporte.",
            });
        }
    }
}
export default new ListSupportChatMessagesController();
