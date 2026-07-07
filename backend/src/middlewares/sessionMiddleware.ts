import tableSessionRepository from "../modules/tableSession/repositories/TableSessionRepository.js";
import { TableSessionStatus } from "@prisma/client";

export async function sessionMiddleware(req, res, next) {
  try {
    const sessionToken =
      req.headers["x-session-token"] ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!sessionToken) {
      return res.status(401).json({
        error: "SessionToken não informado",
      });
    }

    const session =
      await tableSessionRepository.findBySessionToken(sessionToken);

    if (!session) {
      return res.status(404).json({
        error: "Sessão não encontrada",
      });
    }

    if (session.status !== TableSessionStatus.OPEN) {
      return res.status(403).json({
        error: "Sessão encerrada",
      });
    }

    req.tableSession = {
      id: session.id,
      tableId: session.tableId,
      restaurantId: session.table.restaurantId,
    };

    return next();
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
