import tableSessionRepository from "../repositories/TableSessionRepository.js";
class ListOpenSessionService {
    async execute({ restaurantId }) {
        const sessions = await tableSessionRepository.listOpenByRestaurant(restaurantId);
        return sessions;
    }
}
export default new ListOpenSessionService();
