import prisma from "../../../config/prisma.js";
import { TableSessionStatus } from "@prisma/client";

class TableSessionRepository {
  async create(data, db = prisma) {
    return db.tableSession.create({
      data,
      include: {
        table: true,
        openedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOpenedByTable(tableId, db = prisma) {
    return db.tableSession.findFirst({
      where: {
        tableId: Number(tableId),
        status: TableSessionStatus.OPEN,
      },
      include: {
        table: true,
      },
    });
  }

  async findById(id, db = prisma) {
    return db.tableSession.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        table: true,
      },
    });
  }

  async findBySessionToken(sessionToken, db = prisma) {
    return db.tableSession.findUnique({
      where: {
        sessionToken,
      },
      include: {
        table: true,
      },
    });
  }
  async close(id, closedById, db = prisma) {
    return db.tableSession.update({
      where: {
        id: Number(id),
      },
      data: {
        status: TableSessionStatus.CLOSED,
        closedById,
        closedAt: new Date(),
      },
    });
  }
  async listOpenByRestaurant(restaurantId, db = prisma) {
    return db.tableSession.findMany({
      where: {
        status: TableSessionStatus.OPEN,
        table: {
          restaurantId,
        },
      },
      include: {
        table: true,
        openedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        openedAt: "desc",
      },
    });
  }
}

export default new TableSessionRepository();
