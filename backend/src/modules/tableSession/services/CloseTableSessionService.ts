import tableSessionRepository from "../repositories/TableSessionRepository.js";
import { TableSessionStatus } from "@prisma/client";
import { io } from "../../../server.js";

class CloseTableSessionService {
  async execute({ sessionId, closedById }) {
    const session = await tableSessionRepository.findById(sessionId);

    if (!session) {
      throw new Error("Sessão não encontrada!");
    }

    if (session.status === TableSessionStatus.CLOSED) {
      throw new Error("Essa mesa já está fechada!");
    }

    const closedSession = await tableSessionRepository.close(
      sessionId,
      closedById,
    );

    io.to(`table-session:${session.id}`).emit("table:session-closed", {
      sessionId: session.id,
      tableId: session.tableId,
      tableNumber: session?.table?.number ?? null,
      restaurantId: session?.table?.restaurantId ?? null,
      reason: "closed-by-staff",
    });

    return closedSession;
  }
}

export default new CloseTableSessionService();
