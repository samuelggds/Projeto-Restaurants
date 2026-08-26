import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import {
  tableAccountSettingsSchema,
} from '../domain/tableAccountSchemas.js';
import type { TableAccountSettingsDto } from '../domain/tableAccountContracts.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const tableAccountSettingsSelect = {
  enabled: true,
  requirePrepaymentAboveCents: true,
  prepaymentWindows: true,
  allowCash: true,
  allowCardMachine: true,
  allowOnlinePayment: true,
  allowSplit: true,
  serviceFeeMode: true,
  serviceFeeBasisPoints: true,
  preventCloseWithOutstandingBalance: true,
  requireEmployeeApprovalForPreparedItemCancellation: true,
  blockNewOrdersOnClosingRequest: true,
  reservationTimeoutMinutes: true,
  timeZone: true,
} satisfies Prisma.TableAccountSettingsSelect;

type TableAccountSettingsRecord = Prisma.TableAccountSettingsGetPayload<{
  select: typeof tableAccountSettingsSelect;
}>;

function toSafeCents(value: bigint | null) {
  if (value === null) return null;
  const cents = Number(value);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError('A configuração monetária da conta da mesa ultrapassa o limite seguro.');
  }
  return cents;
}

export function serializeTableAccountSettings(
  record: TableAccountSettingsRecord | null,
): TableAccountSettingsDto {
  if (!record) return tableAccountSettingsSchema.parse({}) as TableAccountSettingsDto;

  return tableAccountSettingsSchema.parse({
    ...record,
    requirePrepaymentAboveCents: toSafeCents(record.requirePrepaymentAboveCents),
    prepaymentWindows: record.prepaymentWindows,
  }) as TableAccountSettingsDto;
}

function toPersistenceData(settings: TableAccountSettingsDto) {
  return {
    enabled: settings.enabled,
    requirePrepaymentAboveCents:
      settings.requirePrepaymentAboveCents === null
        ? null
        : BigInt(settings.requirePrepaymentAboveCents),
    prepaymentWindows: settings.prepaymentWindows as unknown as Prisma.InputJsonValue,
    allowCash: settings.allowCash,
    allowCardMachine: settings.allowCardMachine,
    allowOnlinePayment: settings.allowOnlinePayment,
    allowSplit: settings.allowSplit,
    serviceFeeMode: settings.serviceFeeMode,
    serviceFeeBasisPoints: settings.serviceFeeBasisPoints,
    preventCloseWithOutstandingBalance: settings.preventCloseWithOutstandingBalance,
    requireEmployeeApprovalForPreparedItemCancellation:
      settings.requireEmployeeApprovalForPreparedItemCancellation,
    blockNewOrdersOnClosingRequest: settings.blockNewOrdersOnClosingRequest,
    reservationTimeoutMinutes: settings.reservationTimeoutMinutes,
    timeZone: settings.timeZone,
  };
}

export class TableAccountSettingsRepository {
  async findByRestaurantId(restaurantId: number, db: PrismaClientLike = prisma) {
    const record = await db.tableAccountSettings.findUnique({
      where: { restaurantId },
      select: tableAccountSettingsSelect,
    });
    return serializeTableAccountSettings(record);
  }

  async upsert(
    restaurantId: number,
    settings: TableAccountSettingsDto,
    db: PrismaClientLike = prisma,
  ) {
    const data = toPersistenceData(settings);
    const record = await db.tableAccountSettings.upsert({
      where: { restaurantId },
      create: { restaurantId, ...data },
      update: data,
      select: tableAccountSettingsSelect,
    });
    return serializeTableAccountSettings(record);
  }
}

export default new TableAccountSettingsRepository();
