import jwt from "jsonwebtoken";
import tableSessionRepository from "../modules/tableSession/repositories/TableSessionRepository.js";
import { TableSessionStatus } from "@prisma/client";
export async function socketAuth(socket, next) {
    try {
        const token = socket.handshake.auth?.token;
        const sessionToken = socket.handshake.auth?.sessionToken;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            socket.authType = "user";
            return next();
        }
        if (sessionToken) {
            const session = await tableSessionRepository.findBySessionToken(sessionToken);
            if (!session || session.status !== TableSessionStatus.OPEN) {
                return next(new Error("Sessão da mesa inválida"));
            }
            socket.authType = "table-session";
            socket.tableSession = {
                id: session.id,
                tableId: session.tableId,
                tableNumber: session?.table?.number ?? null,
                restaurantId: session?.table?.restaurantId ?? null,
            };
            return next();
        }
        return next(new Error("Token não enviado"));
    }
    catch (_error) {
        return next(new Error("Token inválido"));
    }
}
