import { randomUUID } from 'node:crypto';
import {
  KitchenPrintJobSource,
  KitchenPrintJobType,
  PaymentMethod,
  PrinterAutoPrintTrigger,
  Prisma,
} from '@prisma/client';

import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  buildKitchenOrderPayload,
  buildKitchenTestPayload,
} from '../domain/kitchenPrintPayload.js';
import { logKitchenPrintingEvent } from './kitchenPrintingLog.js';

type Db = Prisma.TransactionClient;
type AutomaticEvent = 'OPERATIONAL_NEW_ORDER' | 'PAYMENT_CONFIRMED';

const printableOrderInclude = {
  restaurant: { select: { name: true } },
  table: { select: { number: true } },
  user: { select: { name: true } },
  participant: { select: { displayName: true } },
  items: {
    orderBy: { id: 'asc' as const },
    select: {
      quantity: true,
      observation: true,
      ingredients: true,
      customizations: true,
      configurationSnapshot: true,
      product: { select: { name: true } },
    },
  },
} satisfies Prisma.OrderInclude;

type PrintJobResult = Awaited<ReturnType<Db['kitchenPrintJob']['create']>>;

function isDeferredDigitalOrder(order: {
  payOnDelivery: boolean;
  paymentMethod: PaymentMethod | null;
}) {
  return (
    !order.payOnDelivery &&
    (order.paymentMethod === PaymentMethod.PIX || order.paymentMethod === PaymentMethod.CARTAO)
  );
}

function asJson(value: object) {
  return value as unknown as Prisma.InputJsonValue;
}

class KitchenPrintingService {
  private async getEnabledSettings(restaurantId: number, db: Db) {
    return db.restaurantPrinterSettings.findFirst({
      where: {
        restaurantId,
        enabled: true,
      },
    });
  }

  private async createAutomaticJob(input: {
    restaurantId: number;
    orderId: number;
    trigger: PrinterAutoPrintTrigger;
    db: Db;
  }): Promise<PrintJobResult | null> {
    const { db, restaurantId, orderId, trigger } = input;
    const settings = await this.getEnabledSettings(restaurantId, db);
    if (!settings?.autoPrintEnabled || settings.autoPrintTrigger !== trigger) {
      return null;
    }

    const order = await db.order.findFirst({
      where: { id: orderId, restaurantId },
      include: printableOrderInclude,
    });
    if (!order) {
      throw new Error('Pedido não encontrado para criar a comanda da cozinha.');
    }
    if (trigger === PrinterAutoPrintTrigger.PAYMENT_CONFIRMED && order.paid !== true) {
      return null;
    }

    const deduplicationKey = `AUTO:KITCHEN:ORDER:${order.id}`;
    const created = await db.kitchenPrintJob.createMany({
      data: [
        {
          restaurantId,
          orderId: order.id,
          type: KitchenPrintJobType.ORDER,
          source: KitchenPrintJobSource.AUTOMATIC,
          trigger,
          payloadVersion: 1,
          payload: asJson(buildKitchenOrderPayload(order)),
          paperWidth: settings.paperWidth,
          copies: settings.copies,
          deduplicationKey,
        },
      ],
      skipDuplicates: true,
    });
    const job = await db.kitchenPrintJob.findFirst({
      where: { restaurantId, deduplicationKey },
    });
    if (!job) throw new Error('Não foi possível localizar a comanda automática persistida.');
    if (created.count === 1) {
      logKitchenPrintingEvent('PRINT_JOB_CREATED', {
        restaurantId,
        orderId: order.id,
        jobPublicId: job.publicId,
        source: KitchenPrintJobSource.AUTOMATIC,
      });
    }
    return job;
  }

  async enqueueAutomatic(input: {
    restaurantId: number;
    orderId: number;
    event: AutomaticEvent;
    db: Db;
  }) {
    const restaurantId = await setTenantDbContext(input.db, input.restaurantId);

    if (input.event === 'OPERATIONAL_NEW_ORDER') {
      return this.createAutomaticJob({
        ...input,
        restaurantId,
        trigger: PrinterAutoPrintTrigger.NEW_ORDER,
      });
    }

    const settings = await this.getEnabledSettings(restaurantId, input.db);
    if (!settings?.autoPrintEnabled) return null;

    if (settings.autoPrintTrigger === PrinterAutoPrintTrigger.PAYMENT_CONFIRMED) {
      return this.createAutomaticJob({
        ...input,
        restaurantId,
        trigger: PrinterAutoPrintTrigger.PAYMENT_CONFIRMED,
      });
    }

    // Pedidos digitais retidos entram no fluxo operacional exatamente neste
    // pagamento. Pedidos já liberados (mesa/entrega) foram tratados na criação.
    const order = await input.db.order.findFirst({
      where: { id: input.orderId, restaurantId, paid: true },
      select: { payOnDelivery: true, paymentMethod: true },
    });
    if (!order || !isDeferredDigitalOrder(order)) return null;

    return this.createAutomaticJob({
      ...input,
      restaurantId,
      trigger: PrinterAutoPrintTrigger.NEW_ORDER,
    });
  }

  async enqueueManualReprint(input: {
    restaurantId: number;
    orderId: number;
    requestedByUserId: number;
    db: Db;
  }) {
    const restaurantId = await setTenantDbContext(input.db, input.restaurantId);
    const settings = await this.getEnabledSettings(restaurantId, input.db);
    if (!settings) {
      throw new Error('Ative a impressão da cozinha antes de solicitar uma reimpressão.');
    }

    const requester = await input.db.user.findFirst({
      where: {
        id: input.requestedByUserId,
        restaurantId,
        active: true,
      },
      select: { id: true },
    });
    if (!requester) throw new Error('Usuário não autorizado para este restaurante.');

    const order = await input.db.order.findFirst({
      where: { id: input.orderId, restaurantId },
      include: printableOrderInclude,
    });
    if (!order) throw new Error('Pedido não encontrado.');

    const requestId = randomUUID();
    const job = await input.db.kitchenPrintJob.create({
      data: {
        restaurantId,
        orderId: order.id,
        type: KitchenPrintJobType.ORDER,
        source: KitchenPrintJobSource.MANUAL,
        payloadVersion: 1,
        payload: asJson(buildKitchenOrderPayload(order)),
        paperWidth: settings.paperWidth,
        copies: settings.copies,
        deduplicationKey: `MANUAL:KITCHEN:ORDER:${order.id}:${requestId}`,
        requestedByUserId: requester.id,
      },
    });
    logKitchenPrintingEvent('PRINT_JOB_CREATED', {
      restaurantId,
      orderId: order.id,
      jobPublicId: job.publicId,
      source: KitchenPrintJobSource.MANUAL,
    });
    return job;
  }

  async enqueueTestPrint(input: { restaurantId: number; requestedByUserId: number; db: Db }) {
    const restaurantId = await setTenantDbContext(input.db, input.restaurantId);
    const settings = await this.getEnabledSettings(restaurantId, input.db);
    if (!settings) throw new Error('Ative a impressão da cozinha antes de imprimir um teste.');

    const [restaurant, requester] = await Promise.all([
      input.db.restaurant.findFirst({
        where: { id: restaurantId },
        select: { name: true },
      }),
      input.db.user.findFirst({
        where: { id: input.requestedByUserId, restaurantId, active: true },
        select: { id: true },
      }),
    ]);
    if (!restaurant || !requester) throw new Error('Restaurante ou usuário não autorizado.');

    const requestId = randomUUID();
    const job = await input.db.kitchenPrintJob.create({
      data: {
        restaurantId,
        type: KitchenPrintJobType.TEST,
        source: KitchenPrintJobSource.TEST,
        payloadVersion: 1,
        payload: asJson(buildKitchenTestPayload(restaurant.name)),
        paperWidth: settings.paperWidth,
        copies: settings.copies,
        deduplicationKey: `TEST:KITCHEN:${requestId}`,
        requestedByUserId: requester.id,
      },
    });
    logKitchenPrintingEvent('PRINT_JOB_CREATED', {
      restaurantId,
      jobPublicId: job.publicId,
      source: KitchenPrintJobSource.TEST,
    });
    return job;
  }
}

export default new KitchenPrintingService();
