import bcrypt from "bcrypt";
import tableSessionRepository from "../repositories/TableSessionRepository.js";
class ValidatePinService {
    async execute({ tableId, pin }) {
        const session = await tableSessionRepository.findOpenedByTable(tableId);
        if (!session) {
            throw new Error("Essa mesa não está aberta!");
        }
        const pinMatch = await bcrypt.compare(pin, session.pinHash);
        if (!pinMatch) {
            throw new Error("PIN inválido!");
        }
        return {
            sessionToken: session.sessionToken,
            sessionId: session.id,
            tableId: session.tableId,
            tableNumber: session.table?.number ?? null,
            restaurantId: session.table?.restaurantId ?? null,
        };
    }
}
export default new ValidatePinService();
