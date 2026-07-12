import prisma from "../../../config/prisma.js";
class UserRepository {
    async findByEmail(email, db = prisma) {
        const normalizedEmail = String(email || "")
            .trim()
            .toLowerCase();
        if (!normalizedEmail) {
            return null;
        }
        return db.user.findFirst({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: "insensitive",
                },
            },
        });
    }
    async findByPhone(phone, db = prisma) {
        const normalizedPhone = String(phone || "").replace(/\D/g, "");
        if (!normalizedPhone) {
            return null;
        }
        const users = await db.$queryRaw `
      SELECT *
      FROM "User"
      WHERE regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g') = ${normalizedPhone}
      LIMIT 1
    `;
        return users[0] || null;
    }
    async create(data, db = prisma) {
        return db.user.create({
            data,
        });
    }
    async findById(id, db = prisma) {
        return db.user.findUnique({
            where: {
                id: Number(id),
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                mustChangePassword: true,
                phone: true,
                cpf: true,
                address: true,
                number: true,
                district: true,
                city: true,
                state: true,
                zipCode: true,
                complement: true,
                restaurantId: true,
            },
        });
    }
    async updateProfile(id, data, db = prisma) {
        return db.user.update({
            where: {
                id: Number(id),
            },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                mustChangePassword: true,
                phone: true,
                cpf: true,
                address: true,
                number: true,
                district: true,
                city: true,
                state: true,
                zipCode: true,
                complement: true,
                restaurantId: true,
            },
        });
    }
    async updatePassword(id, password, db = prisma) {
        return db.user.update({
            where: {
                id: Number(id),
            },
            data: {
                password,
                mustChangePassword: false,
            },
        });
    }
    async savePasswordResetCode(id, codeHash, expiresAt, db = prisma) {
        return db.user.update({
            where: {
                id: Number(id),
            },
            data: {
                resetPasswordCodeHash: codeHash,
                resetPasswordCodeExpiresAt: expiresAt,
            },
        });
    }
    async clearPasswordResetCode(id, db = prisma) {
        return db.user.update({
            where: {
                id: Number(id),
            },
            data: {
                resetPasswordCodeHash: null,
                resetPasswordCodeExpiresAt: null,
            },
        });
    }
    async updatePasswordAndClearResetCode(id, password, db = prisma) {
        return db.user.update({
            where: {
                id: Number(id),
            },
            data: {
                password,
                resetPasswordCodeHash: null,
                resetPasswordCodeExpiresAt: null,
            },
        });
    }
    async findByIdWithPassword(id, db = prisma) {
        return db.user.findUnique({
            where: {
                id: Number(id),
            },
        });
    }
    async deactivate(id, db = prisma) {
        return db.user.update({
            where: {
                id: Number(id),
            },
            data: {
                active: false,
            },
        });
    }
    async reactivate(id, db = prisma) {
        return db.user.update({
            where: {
                id: Number(id),
            },
            data: {
                active: true,
            },
        });
    }
}
export default new UserRepository();
