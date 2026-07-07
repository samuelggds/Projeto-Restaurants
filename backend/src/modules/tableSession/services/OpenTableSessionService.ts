import tableSessionRepository from "../repositories/TableSessionRepository.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

class OpenTableSessionService {
  async execute({ tableId, restaurantId, openedById }) {
    const sessionOpened =
      await tableSessionRepository.findOpenedByTable(tableId);

    if (sessionOpened) {
      throw new Error("Essa mesa já está aberta!");
    }

    const pin = crypto.randomInt(1000, 10000).toString();

    const pinHash = await bcrypt.hash(pin, 10);

    const sessionToken = await crypto.randomBytes(32).toString("hex");

    const session = await tableSessionRepository.create({
      tableId,
      pinHash,
      sessionToken,
      openedById,
    });

    return {
      session,
      pin,
    };
  }
}

export default new OpenTableSessionService();
