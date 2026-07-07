import tableRepository from "../../table/repositories/TableRepository.js";
import { io } from "../../../server.js";

class RequestPinAssistanceService {
  async execute({ tableId }) {
    const parsedTableId = Number(tableId);

    if (!Number.isInteger(parsedTableId) || parsedTableId <= 0) {
      throw new Error("Mesa inválida para solicitar o PIN.");
    }

    const table = await tableRepository.findById(parsedTableId);

    if (!table || !table.active) {
      throw new Error("Mesa não encontrada.");
    }

    const payload = {
      tableId: table.id,
      tableNumber: table.number,
      restaurantId: table.restaurantId,
      requestedAt: new Date().toISOString(),
      message: `Cliente na mesa ${table.number} solicitou o PIN.`,
    };

    io.to(`restaurant:${table.restaurantId}`).emit(
      "table:pin-requested",
      payload,
    );

    return {
      ok: true,
      ...payload,
    };
  }
}

export default new RequestPinAssistanceService();
