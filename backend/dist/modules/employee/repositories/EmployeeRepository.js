import prisma from "../../../config/prisma.js";
import { UserRole } from "@prisma/client";
class EmployeeRepository {
    async findByEmail(email, db = prisma) {
        return db.user.findFirst({
            where: { email },
        });
    }
    async create(data, db = prisma) {
        return db.user.create({
            data,
        });
    }
    async findAllByRestaurant(restaurantId, db = prisma) {
        return db.user.findMany({
            where: {
                restaurantId,
                role: {
                    in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
                },
            },
        });
    }
    async findById(id, restaurantId, db = prisma) {
        return db.user.findFirst({
            where: {
                id: Number(id),
                restaurantId,
                role: {
                    in: [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO],
                },
            },
        });
    }
    async update(id, data, restaurantId, db = prisma) {
        const employee = await this.findById(id, restaurantId, db);
        if (!employee) {
            throw new Error("Funcionário não encontrado!");
        }
        return db.user.update({
            where: {
                id: Number(id),
            },
            data,
        });
    }
    async deactivate(id, restaurantId, db = prisma) {
        const employee = await this.findById(id, restaurantId, db);
        if (!employee) {
            throw new Error("Funcionário não encontrado!");
        }
        return db.user.update({
            where: {
                id: Number(id),
            },
            data: {
                active: false,
            },
        });
    }
}
export default new EmployeeRepository();
