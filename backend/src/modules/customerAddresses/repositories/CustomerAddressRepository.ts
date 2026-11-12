import prisma from '../../../config/prisma.js';
import type {
  CreateCustomerAddressRecord,
  CustomerAddressRecord,
} from '../domain/CustomerAddress.js';

// The application service only knows this port, not Prisma or SQL.
export interface CustomerAddressUnitOfWork {
  countByUser(userId: number): Promise<number>;
  clearDefaults(userId: number): Promise<void>;
  create(userId: number, data: CreateCustomerAddressRecord): Promise<CustomerAddressRecord>;
  findOwned(userId: number, id: number): Promise<boolean>;
  setDefault(userId: number, id: number): Promise<CustomerAddressRecord | null>;
}

export interface CustomerAddressRepositoryPort {
  listByUser(userId: number): Promise<CustomerAddressRecord[]>;
  transaction<T>(execute: (unit: CustomerAddressUnitOfWork) => Promise<T>): Promise<T>;
}

export class PrismaCustomerAddressRepository implements CustomerAddressRepositoryPort {
  listByUser(userId: number) {
    return prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' as const }, { createdAt: 'desc' as const }],
    });
  }

  transaction<T>(execute: (unit: CustomerAddressUnitOfWork) => Promise<T>): Promise<T> {
    return prisma.$transaction((tx) =>
      execute({
        countByUser: (userId) => tx.userAddress.count({ where: { userId } }),
        clearDefaults: async (userId) => {
          await tx.userAddress.updateMany({
            where: { userId },
            data: { isDefault: false },
          });
        },
        create: (userId, data) => tx.userAddress.create({ data: { userId, ...data } }),
        findOwned: async (userId, id) => {
          const row = await tx.userAddress.findFirst({
            where: { id, userId },
            select: { id: true },
          });
          return Boolean(row);
        },
        setDefault: async (userId, id) => {
          const updated = await tx.userAddress.updateMany({
            where: { id, userId },
            data: { isDefault: true },
          });
          return updated.count === 1
            ? tx.userAddress.findFirst({ where: { id, userId } })
            : null;
        },
      }),
    );
  }
}

export default new PrismaCustomerAddressRepository();
