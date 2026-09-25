import { Prisma, OrderStatus, OrderRefundStatus, EmployeeSettlementStatus, CourierSettlementStatus } from '@prisma/client';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { getRestaurantPeriodBoundaries } from '../../courierCompensation/domain/restaurantTimePeriods.js';
import { sanitizeAdminAiContext } from '../domain/adminAiSecurityPolicy.js';

type AssistantActor = {
  userId: number;
  restaurantId: number;
  userName?: string | null;
  userRole?: string | null;
};

type AssistantSettings = {
  autonomyMode: 'SUGGEST_ONLY' | 'APPROVAL_REQUIRED' | 'BOUNDED_AUTOMATION';
  automationsEnabled: boolean;
  pendingOrderMinutes: number;
  preparingOrderMinutes: number;
  readyOrderMinutes: number;
  deliveryOrderMinutes: number;
  stockAlertThreshold: number;
  minimumForecastOrders: number;
  maxAiRequestsPerHour: number;
  maxConcurrentAiJobs: number;
  version: number;
};

type SalesAggregate = { count: number; total: number };
type PeriodRange = { gte: Date; lt: Date };

type SourceVersionRow = { updatedAt: Date | null };
type SnapshotRow = {
  payload: unknown;
  sourceVersion: string;
  generatedAt: Date;
  expiresAt: Date;
};
type TopProductRow = {
  productId: number;
  name: string;
  quantity: bigint | number;
  grossSales: Prisma.Decimal | number | string;
};
type CustomerFrequencyRow = {
  userId: number;
  name: string | null;
  previousOrders: bigint | number;
  currentOrders: bigint | number;
  lastOrderAt: Date | null;
};
type ProductPairRow = {
  firstProductId: number;
  firstName: string;
  secondProductId: number;
  secondName: string;
  ordersTogether: bigint | number;
};
type ProductTrendRow = {
  productId: number;
  name: string;
  previousQuantity: bigint | number;
  currentQuantity: bigint | number;
};
type DailyOrdersRow = { localDay: Date | string; orders: bigint | number };

type PaymentConfigurationRow = {
  pixProvider: string | null;
  cardGateway: string | null;
  hasMercadoPagoCredential: boolean;
  hasAsaasCredential: boolean;
};

const DEFAULT_SETTINGS: AssistantSettings = {
  autonomyMode: 'SUGGEST_ONLY',
  automationsEnabled: false,
  pendingOrderMinutes: 15,
  preparingOrderMinutes: 30,
  readyOrderMinutes: 15,
  deliveryOrderMinutes: 45,
  stockAlertThreshold: 3,
  minimumForecastOrders: 30,
  maxAiRequestsPerHour: 20,
  maxConcurrentAiJobs: 2,
  version: 1,
};

const CACHE_KEY = 'restaurant-management-v1';
const CACHE_TTL_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function assertActor(actor: AssistantActor) {
  if (
    String(actor.userRole || '').toUpperCase() !== 'ADMIN' ||
    !Number.isSafeInteger(Number(actor.userId)) ||
    Number(actor.userId) <= 0 ||
    !Number.isSafeInteger(Number(actor.restaurantId)) ||
    Number(actor.restaurantId) <= 0
  ) {
    throw new Error('Conta ADMIN inválida para consultar o assistente do restaurante.');
  }
}

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function count(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function previousEquivalentRange(range: PeriodRange, now: Date, timeZone: string) {
  const previousFull = getRestaurantPeriodBoundaries(new Date(range.gte.getTime() - 1), timeZone).week;
  const elapsed = Math.max(0, Math.min(now.getTime(), range.lt.getTime()) - range.gte.getTime());
  return {
    gte: previousFull.gte,
    lt: new Date(Math.min(previousFull.lt.getTime(), previousFull.gte.getTime() + elapsed)),
  };
}

function periodPayload(current: PeriodRange, previous: PeriodRange, timeZone: string, now: Date) {
  return {
    label: 'Semana atual',
    timeZone,
    start: current.gte.toISOString(),
    end: new Date(Math.min(current.lt.getTime(), now.getTime())).toISOString(),
    previousStart: previous.gte.toISOString(),
    previousEnd: previous.lt.toISOString(),
  };
}

async function loadAssistantSettings(db: Prisma.TransactionClient, restaurantId: number) {
  const rows = await db.$queryRaw<AssistantSettings[]>(Prisma.sql`
    SELECT
      "autonomyMode",
      "automationsEnabled",
      "pendingOrderMinutes",
      "preparingOrderMinutes",
      "readyOrderMinutes",
      "deliveryOrderMinutes",
      "stockAlertThreshold",
      "minimumForecastOrders",
      "maxAiRequestsPerHour",
      "maxConcurrentAiJobs",
      "version"
    FROM "RestaurantAiAssistantSettings"
    WHERE "restaurantId" = ${restaurantId}
    LIMIT 1
  `);
  return rows[0] ?? DEFAULT_SETTINGS;
}

async function loadSourceVersion(db: Prisma.TransactionClient, restaurantId: number) {
  const rows = await db.$queryRaw<SourceVersionRow[]>(Prisma.sql`
    SELECT GREATEST(
      COALESCE((SELECT MAX("updatedAt") FROM "Order" WHERE "restaurantId" = ${restaurantId}), TIMESTAMP '1970-01-01'),
      COALESCE((SELECT MAX("updatedAt") FROM "Product" WHERE "restaurantId" = ${restaurantId}), TIMESTAMP '1970-01-01'),
      COALESCE((SELECT MAX("updatedAt") FROM "RestaurantSettings" WHERE "restaurantId" = ${restaurantId}), TIMESTAMP '1970-01-01')
    ) AS "updatedAt"
  `);
  return (rows[0]?.updatedAt || new Date(0)).toISOString();
}

async function readSnapshot(
  db: Prisma.TransactionClient,
  restaurantId: number,
  sourceVersion: string,
  now: Date,
) {
  const rows = await db.$queryRaw<SnapshotRow[]>(Prisma.sql`
    SELECT "payload", "sourceVersion", "generatedAt", "expiresAt"
    FROM "RestaurantAiSnapshot"
    WHERE "restaurantId" = ${restaurantId}
      AND "cacheKey" = ${CACHE_KEY}
      AND "sourceVersion" = ${sourceVersion}
      AND "expiresAt" > ${now}
    LIMIT 1
  `);
  return rows[0]?.payload ?? null;
}

async function writeSnapshot(
  db: Prisma.TransactionClient,
  restaurantId: number,
  sourceVersion: string,
  payload: unknown,
  now: Date,
) {
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);
  const json = JSON.stringify(payload ?? {});
  await db.$executeRaw(Prisma.sql`
    INSERT INTO "RestaurantAiSnapshot" (
      "restaurantId", "cacheKey", "sourceVersion", "payload", "generatedAt", "expiresAt"
    ) VALUES (
      ${restaurantId}, ${CACHE_KEY}, ${sourceVersion}, ${json}::jsonb, ${now}, ${expiresAt}
    )
    ON CONFLICT ("restaurantId", "cacheKey") DO UPDATE SET
      "sourceVersion" = EXCLUDED."sourceVersion",
      "payload" = EXCLUDED."payload",
      "generatedAt" = EXCLUDED."generatedAt",
      "expiresAt" = EXCLUDED."expiresAt"
  `);
}

async function aggregateRegisteredSales(
  db: Prisma.TransactionClient,
  restaurantId: number,
  range: PeriodRange,
): Promise<SalesAggregate> {
  const result = await db.order.aggregate({
    where: {
      restaurantId,
      createdAt: range,
      status: { not: OrderStatus.CANCELADO },
    },
    _count: true,
    _sum: { total: true },
  });
  return { count: result._count, total: money(result._sum.total) };
}

async function aggregateConfirmedPayments(
  db: Prisma.TransactionClient,
  restaurantId: number,
  range: PeriodRange,
): Promise<SalesAggregate> {
  const result = await db.order.aggregate({
    where: {
      restaurantId,
      paid: true,
      paidAt: range,
      status: { not: OrderStatus.CANCELADO },
    },
    _count: true,
    _sum: { total: true },
  });
  return { count: result._count, total: money(result._sum.total) };
}

async function aggregateCancellations(
  db: Prisma.TransactionClient,
  restaurantId: number,
  range: PeriodRange,
): Promise<SalesAggregate> {
  const result = await db.order.aggregate({
    where: { restaurantId, createdAt: range, status: OrderStatus.CANCELADO },
    _count: true,
    _sum: { total: true },
  });
  return { count: result._count, total: money(result._sum.total) };
}

async function aggregateRefunds(
  db: Prisma.TransactionClient,
  restaurantId: number,
  range: PeriodRange,
): Promise<SalesAggregate> {
  const result = await db.order.aggregate({
    where: {
      restaurantId,
      refundStatus: OrderRefundStatus.SUCCEEDED,
      refundedAt: range,
    },
    _count: true,
    _sum: { total: true },
  });
  return { count: result._count, total: money(result._sum.total) };
}

async function loadTopProducts(
  db: Prisma.TransactionClient,
  restaurantId: number,
  range: PeriodRange,
) {
  const rows = await db.$queryRaw<TopProductRow[]>(Prisma.sql`
    SELECT
      product."id" AS "productId",
      product."name" AS "name",
      SUM(item."quantity")::bigint AS "quantity",
      SUM(item."price" * item."quantity") AS "grossSales"
    FROM "OrderItem" item
    JOIN "Order" order_row ON order_row."id" = item."orderId"
    JOIN "Product" product ON product."id" = item."productId"
    WHERE order_row."restaurantId" = ${restaurantId}
      AND product."restaurantId" = ${restaurantId}
      AND order_row."createdAt" >= ${range.gte}
      AND order_row."createdAt" < ${range.lt}
      AND order_row."status" <> 'CANCELADO'
    GROUP BY product."id", product."name"
    ORDER BY SUM(item."quantity") DESC, SUM(item."price" * item."quantity") DESC
    LIMIT 8
  `);
  return rows.map((row) => ({
    productId: Number(row.productId),
    name: row.name,
    quantity: count(row.quantity),
    grossSales: money(row.grossSales),
    target: 'catalog' as const,
  }));
}

function thresholdForStatus(status: string, settings: AssistantSettings) {
  switch (status) {
    case OrderStatus.PENDENTE:
      return settings.pendingOrderMinutes;
    case OrderStatus.PREPARANDO:
      return settings.preparingOrderMinutes;
    case OrderStatus.PRONTO:
      return settings.readyOrderMinutes;
    case OrderStatus.SAIU_PARA_ENTREGA:
      return settings.deliveryOrderMinutes;
    default:
      return null;
  }
}

async function loadAttentionOrders(
  db: Prisma.TransactionClient,
  restaurantId: number,
  settings: AssistantSettings,
  now: Date,
) {
  const orders = await db.order.findMany({
    where: {
      restaurantId,
      status: {
        in: [
          OrderStatus.PENDENTE,
          OrderStatus.PREPARANDO,
          OrderStatus.PRONTO,
          OrderStatus.SAIU_PARA_ENTREGA,
        ],
      },
    },
    select: {
      id: true,
      publicId: true,
      status: true,
      createdAt: true,
      preparationStartedAt: true,
      readyAt: true,
      deliveryStartedAt: true,
      total: true,
      paid: true,
      user: { select: { id: true, name: true } },
      participant: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return orders
    .map((order) => {
      const threshold = thresholdForStatus(order.status, settings);
      if (!threshold) return null;
      const stateSince =
        order.status === OrderStatus.PREPARANDO
          ? order.preparationStartedAt || order.createdAt
          : order.status === OrderStatus.PRONTO
            ? order.readyAt || order.createdAt
            : order.status === OrderStatus.SAIU_PARA_ENTREGA
              ? order.deliveryStartedAt || order.createdAt
              : order.createdAt;
      const minutesInState = Math.max(0, Math.floor((now.getTime() - stateSince.getTime()) / 60_000));
      if (minutesInState < threshold) return null;
      return {
        orderId: order.id,
        publicId: order.publicId,
        status: order.status,
        customerName: order.user?.name || order.participant?.displayName || 'Cliente',
        total: money(order.total),
        paid: order.paid,
        minutesInState,
        thresholdMinutes: threshold,
        evidence: `${minutesInState} min no estado ${order.status}`,
        target: 'orders' as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((first, second) => second.minutesInState - first.minutesInState)
    .slice(0, 20);
}

async function loadCatalogHealth(
  db: Prisma.TransactionClient,
  restaurantId: number,
  settings: AssistantSettings,
) {
  const products = await db.product.findMany({
    where: { restaurantId },
    select: {
      id: true,
      name: true,
      description: true,
      image: true,
      stock: true,
      active: true,
    },
    orderBy: { name: 'asc' },
    take: 1000,
  });

  const missingDescription = products
    .filter((product) => !String(product.description || '').trim())
    .map((product) => ({ productId: product.id, name: product.name, target: 'catalog' as const }));
  const missingImage = products
    .filter((product) => !String(product.image || '').trim())
    .map((product) => ({ productId: product.id, name: product.name, target: 'catalog' as const }));
  const lowStock = products
    .filter(
      (product) =>
        product.active !== false &&
        product.stock !== null &&
        product.stock !== undefined &&
        Number(product.stock) <= settings.stockAlertThreshold,
    )
    .map((product) => ({
      productId: product.id,
      name: product.name,
      stock: Number(product.stock),
      threshold: settings.stockAlertThreshold,
      target: 'catalog' as const,
    }));

  return {
    totalProducts: products.length,
    activeProducts: products.filter((product) => product.active !== false).length,
    missingDescription,
    missingImage,
    lowStock,
    note:
      'Estoque de produto final não é estoque de ingredientes. O assistente não converte este número em compra de insumos.',
  };
}

async function loadSettlements(db: Prisma.TransactionClient, restaurantId: number) {
  const [employeesPending, couriersPending] = await Promise.all([
    db.employeeSettlement.count({
      where: {
        restaurantId,
        status: {
          notIn: [EmployeeSettlementStatus.PAID, EmployeeSettlementStatus.CANCELED],
        },
      },
    }),
    db.courierSettlement.count({
      where: {
        restaurantId,
        status: {
          in: [
            CourierSettlementStatus.AWAITING_COURIER_CONFIRMATION,
            CourierSettlementStatus.DISPUTED,
          ],
        },
      },
    }),
  ]);
  return {
    employeesPending,
    couriersPending,
    target: 'settings:employee-payments',
    note: 'O assistente apenas explica lançamentos existentes. Pagamentos continuam nos serviços de negócio.',
  };
}

async function loadDecliningCustomers(
  db: Prisma.TransactionClient,
  restaurantId: number,
  currentStart: Date,
) {
  const currentEnd = new Date();
  const previousStart = new Date(currentStart.getTime() - 28 * DAY_MS);
  const rows = await db.$queryRaw<CustomerFrequencyRow[]>(Prisma.sql`
    SELECT
      user_row."id" AS "userId",
      user_row."name" AS "name",
      COUNT(*) FILTER (
        WHERE order_row."createdAt" >= ${previousStart}
          AND order_row."createdAt" < ${currentStart}
      )::bigint AS "previousOrders",
      COUNT(*) FILTER (
        WHERE order_row."createdAt" >= ${currentStart}
          AND order_row."createdAt" < ${currentEnd}
      )::bigint AS "currentOrders",
      MAX(order_row."createdAt") AS "lastOrderAt"
    FROM "Order" order_row
    JOIN "User" user_row ON user_row."id" = order_row."userId"
    WHERE order_row."restaurantId" = ${restaurantId}
      AND user_row."restaurantId" = ${restaurantId}
      AND order_row."userId" IS NOT NULL
      AND order_row."status" <> 'CANCELADO'
      AND order_row."createdAt" >= ${previousStart}
      AND order_row."createdAt" < ${currentEnd}
    GROUP BY user_row."id", user_row."name"
    HAVING COUNT(*) FILTER (
      WHERE order_row."createdAt" >= ${previousStart}
        AND order_row."createdAt" < ${currentStart}
    ) >= 2
    ORDER BY (
      COUNT(*) FILTER (WHERE order_row."createdAt" >= ${previousStart} AND order_row."createdAt" < ${currentStart}) -
      COUNT(*) FILTER (WHERE order_row."createdAt" >= ${currentStart} AND order_row."createdAt" < ${currentEnd})
    ) DESC
    LIMIT 20
  `);

  return rows
    .map((row) => ({
      userId: Number(row.userId),
      name: row.name || 'Cliente identificado',
      previousOrders: count(row.previousOrders),
      currentOrders: count(row.currentOrders),
      lastOrderAt: row.lastOrderAt?.toISOString() ?? null,
      target: 'customers' as const,
    }))
    .filter((row) => row.currentOrders < row.previousOrders);
}

async function loadProductPairs(db: Prisma.TransactionClient, restaurantId: number, since: Date) {
  const rows = await db.$queryRaw<ProductPairRow[]>(Prisma.sql`
    SELECT
      first_item."productId" AS "firstProductId",
      first_product."name" AS "firstName",
      second_item."productId" AS "secondProductId",
      second_product."name" AS "secondName",
      COUNT(DISTINCT first_item."orderId")::bigint AS "ordersTogether"
    FROM "OrderItem" first_item
    JOIN "OrderItem" second_item
      ON second_item."orderId" = first_item."orderId"
      AND second_item."productId" > first_item."productId"
    JOIN "Order" order_row ON order_row."id" = first_item."orderId"
    JOIN "Product" first_product ON first_product."id" = first_item."productId"
    JOIN "Product" second_product ON second_product."id" = second_item."productId"
    WHERE order_row."restaurantId" = ${restaurantId}
      AND first_product."restaurantId" = ${restaurantId}
      AND second_product."restaurantId" = ${restaurantId}
      AND order_row."status" <> 'CANCELADO'
      AND order_row."createdAt" >= ${since}
    GROUP BY first_item."productId", first_product."name", second_item."productId", second_product."name"
    HAVING COUNT(DISTINCT first_item."orderId") >= 2
    ORDER BY COUNT(DISTINCT first_item."orderId") DESC
    LIMIT 8
  `);
  return rows.map((row) => ({
    firstProductId: Number(row.firstProductId),
    firstName: row.firstName,
    secondProductId: Number(row.secondProductId),
    secondName: row.secondName,
    ordersTogether: count(row.ordersTogether),
  }));
}

async function loadDecliningProducts(
  db: Prisma.TransactionClient,
  restaurantId: number,
  current: PeriodRange,
  previous: PeriodRange,
) {
  const rows = await db.$queryRaw<ProductTrendRow[]>(Prisma.sql`
    SELECT
      product."id" AS "productId",
      product."name" AS "name",
      COALESCE(SUM(item."quantity") FILTER (
        WHERE order_row."createdAt" >= ${previous.gte} AND order_row."createdAt" < ${previous.lt}
      ), 0)::bigint AS "previousQuantity",
      COALESCE(SUM(item."quantity") FILTER (
        WHERE order_row."createdAt" >= ${current.gte} AND order_row."createdAt" < ${current.lt}
      ), 0)::bigint AS "currentQuantity"
    FROM "Product" product
    LEFT JOIN "OrderItem" item ON item."productId" = product."id"
    LEFT JOIN "Order" order_row
      ON order_row."id" = item."orderId"
      AND order_row."restaurantId" = ${restaurantId}
      AND order_row."status" <> 'CANCELADO'
    WHERE product."restaurantId" = ${restaurantId}
    GROUP BY product."id", product."name"
    HAVING COALESCE(SUM(item."quantity") FILTER (
      WHERE order_row."createdAt" >= ${previous.gte} AND order_row."createdAt" < ${previous.lt}
    ), 0) > COALESCE(SUM(item."quantity") FILTER (
      WHERE order_row."createdAt" >= ${current.gte} AND order_row."createdAt" < ${current.lt}
    ), 0)
    ORDER BY (
      COALESCE(SUM(item."quantity") FILTER (
        WHERE order_row."createdAt" >= ${previous.gte} AND order_row."createdAt" < ${previous.lt}
      ), 0) -
      COALESCE(SUM(item."quantity") FILTER (
        WHERE order_row."createdAt" >= ${current.gte} AND order_row."createdAt" < ${current.lt}
      ), 0)
    ) DESC
    LIMIT 8
  `);
  return rows.map((row) => ({
    productId: Number(row.productId),
    name: row.name,
    previousQuantity: count(row.previousQuantity),
    currentQuantity: count(row.currentQuantity),
    target: 'catalog' as const,
  }));
}

function buildCampaignDrafts(input: {
  decliningCustomers: Awaited<ReturnType<typeof loadDecliningCustomers>>;
  productPairs: Awaited<ReturnType<typeof loadProductPairs>>;
  decliningProducts: Awaited<ReturnType<typeof loadDecliningProducts>>;
}) {
  const drafts: Array<Record<string, unknown>> = [];
  if (input.decliningCustomers.length) {
    drafts.push({
      type: 'CUSTOMER_REENGAGEMENT',
      title: 'Reengajamento de clientes identificados',
      audience: `${input.decliningCustomers.length} cliente(s) identificado(s) com redução de frequência`,
      message: 'Rascunho: sentimos sua falta. Confira o cardápio e as ofertas disponíveis.',
      discount: null,
      validity: 'Definir antes de publicar',
      limits: 'Somente contatos com preferência de comunicação válida; nenhum envio automático.',
      status: 'DRAFT',
    });
  }
  const pair = input.productPairs[0];
  if (pair) {
    drafts.push({
      type: 'PRODUCT_COMBO',
      title: `Combo ${pair.firstName} + ${pair.secondName}`,
      audience: 'Clientes do restaurante; segmentação deve ser aprovada antes da publicação',
      message: `Rascunho: combine ${pair.firstName} com ${pair.secondName}.`,
      discount: null,
      validity: 'Definir antes de publicar',
      limits: `Evidência: comprados juntos em ${pair.ordersTogether} pedido(s) recentes.`,
      status: 'DRAFT',
    });
  }
  const declining = input.decliningProducts[0];
  if (declining) {
    drafts.push({
      type: 'PRODUCT_RECOVERY',
      title: `Revisar queda de ${declining.name}`,
      audience: 'A definir pelo ADMIN',
      message: `Rascunho de campanha para ${declining.name}; revisar preço, disponibilidade e apresentação antes de oferecer desconto.`,
      discount: null,
      validity: 'Definir antes de publicar',
      limits: `Vendas em unidades no período equivalente: ${declining.previousQuantity} → ${declining.currentQuantity}.`,
      status: 'DRAFT',
    });
  }
  return drafts.slice(0, 3);
}

async function loadForecast(
  db: Prisma.TransactionClient,
  restaurantId: number,
  timeZone: string,
  settings: AssistantSettings,
  now: Date,
) {
  const since = new Date(now.getTime() - 28 * DAY_MS);
  const rows = await db.$queryRaw<DailyOrdersRow[]>(Prisma.sql`
    SELECT
      DATE(order_row."createdAt" AT TIME ZONE ${timeZone}) AS "localDay",
      COUNT(*)::bigint AS "orders"
    FROM "Order" order_row
    WHERE order_row."restaurantId" = ${restaurantId}
      AND order_row."status" <> 'CANCELADO'
      AND order_row."createdAt" >= ${since}
      AND order_row."createdAt" < ${now}
    GROUP BY DATE(order_row."createdAt" AT TIME ZONE ${timeZone})
    ORDER BY DATE(order_row."createdAt" AT TIME ZONE ${timeZone}) ASC
  `);
  const observed = rows.map((row) => count(row.orders));
  const totalOrders = observed.reduce((sum, value) => sum + value, 0);
  if (totalOrders < settings.minimumForecastOrders || observed.length < 14) {
    return {
      eligible: false as const,
      reason: `Histórico insuficiente: ${totalOrders} pedidos em ${observed.length} dia(s) com movimento; são necessários pelo menos ${settings.minimumForecastOrders} pedidos e 14 dias observados.`,
      reference: 'Média simples dos 7 dias anteriores',
    };
  }

  const recent = observed.slice(-7);
  const previous = observed.slice(-14, -7);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const prediction = mean(recent);
  const reference = mean(previous);
  const sample = observed.slice(-14);
  const sampleMean = mean(sample);
  const variance = mean(sample.map((value) => (value - sampleMean) ** 2));
  const deviation = Math.sqrt(variance);
  const lower = Math.max(0, prediction - 1.28 * deviation);
  const upper = prediction + 1.28 * deviation;

  return {
    eligible: true as const,
    horizon: 'próximo dia operacional',
    predictedOrders: Number(prediction.toFixed(1)),
    simpleReferenceOrders: Number(reference.toFixed(1)),
    uncertainty: {
      level: 'aproximadamente 80%',
      lowerOrders: Number(lower.toFixed(1)),
      upperOrders: Number(upper.toFixed(1)),
    },
    sample: { totalOrders, observedDays: observed.length },
    warning:
      'Estimativa de demanda, não quantidade de compra. Sem ficha técnica, custos e estoque de ingredientes o sistema não calcula kg/litros nem lucro.',
  };
}

async function loadPaymentConfiguration(db: Prisma.TransactionClient, restaurantId: number) {
  const rows = await db.$queryRaw<PaymentConfigurationRow[]>(Prisma.sql`
    SELECT
      "pixProvider",
      "cardGateway",
      (NULLIF(TRIM(COALESCE("mercadoPagoAccessToken", '')), '') IS NOT NULL) AS "hasMercadoPagoCredential",
      (NULLIF(TRIM(COALESCE("asaasAccessToken", '')), '') IS NOT NULL) AS "hasAsaasCredential"

    FROM "RestaurantSettings"
    WHERE "restaurantId" = ${restaurantId}
    LIMIT 1
  `);
  const row = rows[0];
  return row
    ? {
        pixProvider: row.pixProvider,
        cardGateway: row.cardGateway,
        providerConfigured: {
          MERCADO_PAGO: row.hasMercadoPagoCredential,
          ASAAS: row.hasAsaasCredential,
        },
        note: 'Somente presença/estado operacional é exposto. Credenciais nunca entram no contexto da IA.',
      }
    : {
        pixProvider: null,
        cardGateway: null,
        providerConfigured: {},
        note: 'Configuração de pagamento indisponível.',
      };
}

function buildPriorities(input: {
  attentionOrders: Awaited<ReturnType<typeof loadAttentionOrders>>;
  catalog: Awaited<ReturnType<typeof loadCatalogHealth>>;
  settlements: Awaited<ReturnType<typeof loadSettlements>>;
  registeredCurrent: SalesAggregate;
  registeredPrevious: SalesAggregate;
  period: ReturnType<typeof periodPayload>;
}) {
  const priorities: Array<Record<string, unknown>> = [];
  if (input.attentionOrders.length) {
    const first = input.attentionOrders[0];
    priorities.push({
      key: 'delayed-orders',
      situation: `${input.attentionOrders.length} pedido(s) ultrapassaram o limite operacional configurado`,
      evidence: `Maior atraso: pedido #${first.orderId}, ${first.minutesInState} min em ${first.status}.`,
      period: input.period,
      reason: 'Pedidos além do limite configurado podem indicar gargalo ou necessidade de contato com o cliente.',
      target: 'orders',
      label: 'Abrir pedidos',
    });
  }
  const catalogProblems = input.catalog.missingDescription.length + input.catalog.missingImage.length;
  if (catalogProblems || input.catalog.lowStock.length) {
    priorities.push({
      key: 'catalog-health',
      situation: `${catalogProblems} pendência(s) de conteúdo e ${input.catalog.lowStock.length} alerta(s) de estoque de produto`,
      evidence: `${input.catalog.missingDescription.length} sem descrição; ${input.catalog.missingImage.length} sem imagem; ${input.catalog.lowStock.length} com estoque controlado no limite.`,
      period: { generatedAt: new Date().toISOString() },
      reason: 'Cadastro incompleto e indisponibilidade do produto podem prejudicar a operação e a decisão do cliente.',
      target: 'catalog',
      label: 'Revisar cardápio',
    });
  }
  const settlements = input.settlements.employeesPending + input.settlements.couriersPending;
  if (settlements) {
    priorities.push({
      key: 'settlements',
      situation: `${settlements} acerto(s) registrado(s) ainda exigem acompanhamento`,
      evidence: `${input.settlements.employeesPending} de funcionários e ${input.settlements.couriersPending} de entregadores.`,
      period: { generatedAt: new Date().toISOString() },
      reason: 'Pendências financeiras registradas precisam ser conferidas nos fluxos próprios; a IA não confirma pagamentos.',
      target: 'settings:employee-payments',
      label: 'Conferir acertos',
    });
  }
  const change = percentChange(input.registeredCurrent.total, input.registeredPrevious.total);
  if (priorities.length < 3 && change !== null && change <= -15) {
    priorities.push({
      key: 'sales-drop',
      situation: `Vendas registradas caíram ${Math.abs(change)}% no período equivalente`,
      evidence: `R$ ${input.registeredPrevious.total.toFixed(2)} → R$ ${input.registeredCurrent.total.toFixed(2)}.`,
      period: input.period,
      reason: 'A queda merece revisão de pedidos, disponibilidade e catálogo; ela não prova uma causa específica.',
      target: 'overview',
      label: 'Ver indicadores',
    });
  }
  return priorities.slice(0, 3);
}

export class AdminRestaurantContextService {
  async getManagementSnapshot(actor: AssistantActor, options: { force?: boolean } = {}) {
    assertActor(actor);
    const restaurantId = Number(actor.restaurantId);
    const now = new Date();

    return withTenantDbContext(restaurantId, async (db) => {
      const [restaurantSettings, assistantSettings, sourceVersion] = await Promise.all([
        db.restaurantSettings.findUnique({
          where: { restaurantId },
          select: { timezone: true },
        }),
        loadAssistantSettings(db, restaurantId),
        loadSourceVersion(db, restaurantId),
      ]);
      const timeZone = restaurantSettings?.timezone || 'America/Sao_Paulo';

      if (!options.force) {
        const cached = await readSnapshot(db, restaurantId, sourceVersion, now);
        if (cached) return sanitizeAdminAiContext(cached);
      }

      const periods = getRestaurantPeriodBoundaries(now, timeZone);
      const currentRange = { gte: periods.week.gte, lt: new Date(Math.min(periods.week.lt.getTime(), now.getTime())) };
      const previousRange = previousEquivalentRange(periods.week, now, timeZone);
      const period = periodPayload(periods.week, previousRange, timeZone, now);
      const customerWindowStart = new Date(periods.today.gte.getTime() - 27 * DAY_MS);
      const ninetyDaysAgo = new Date(periods.today.gte.getTime() - 89 * DAY_MS);

      const [
        registeredCurrent,
        registeredPrevious,
        paidCurrent,
        paidPrevious,
        cancellationsCurrent,
        refundsCurrent,
        topProducts,
        attentionOrders,
        catalog,
        settlements,
        decliningCustomers,
        productPairs,
        decliningProducts,
        forecast,
        paymentConfiguration,
      ] = await Promise.all([
        aggregateRegisteredSales(db, restaurantId, currentRange),
        aggregateRegisteredSales(db, restaurantId, previousRange),
        aggregateConfirmedPayments(db, restaurantId, currentRange),
        aggregateConfirmedPayments(db, restaurantId, previousRange),
        aggregateCancellations(db, restaurantId, currentRange),
        aggregateRefunds(db, restaurantId, currentRange),
        loadTopProducts(db, restaurantId, currentRange),
        loadAttentionOrders(db, restaurantId, assistantSettings, now),
        loadCatalogHealth(db, restaurantId, assistantSettings),
        loadSettlements(db, restaurantId),
        loadDecliningCustomers(db, restaurantId, customerWindowStart),
        loadProductPairs(db, restaurantId, ninetyDaysAgo),
        loadDecliningProducts(db, restaurantId, currentRange, previousRange),
        loadForecast(db, restaurantId, timeZone, assistantSettings, now),
        loadPaymentConfiguration(db, restaurantId),
      ]);

      const priorities = buildPriorities({
        attentionOrders,
        catalog,
        settlements,
        registeredCurrent,
        registeredPrevious,
        period,
      });
      const commercial = {
        decliningCustomers,
        frequentlyBoughtTogether: productPairs,
        decliningProducts,
        campaignDrafts: buildCampaignDrafts({ decliningCustomers, productPairs, decliningProducts }),
        rules: [
          'Clientes anônimos não são agrupados como uma mesma pessoa.',
          'Campanhas permanecem como rascunho até aprovação explícita.',
          'Nenhuma campanha é enviada durante testes ou apenas por decisão da IA.',
          'O sistema não atribui causalidade de vendas a uma campanha sem método de avaliação.',
        ],
      };

      const payload = {
        generatedAt: now.toISOString(),
        dataUpdatedAt: sourceVersion,
        timeZone,
        period,
        assistantSettings,
        sales: {
          registered: registeredCurrent,
          confirmedPayments: paidCurrent,
          cancellations: cancellationsCurrent,
          refunds: refundsCurrent,
          comparison: {
            registeredSalesPercent: percentChange(registeredCurrent.total, registeredPrevious.total),
            confirmedPaymentsPercent: percentChange(paidCurrent.total, paidPrevious.total),
            previousRegistered: registeredPrevious,
            previousConfirmedPayments: paidPrevious,
          },
          definitions: {
            registered: 'Pedidos não cancelados criados no período, independentemente da confirmação do pagamento.',
            confirmedPayments: 'Pedidos com pagamento confirmado no período.',
            cancellations: 'Pedidos criados no período cujo estado atual é CANCELADO.',
            refunds: 'Pedidos com estorno concluído no período.',
            warning: 'Vendas/faturamento operacional não são lucro.',
          },
        },
        topProducts,
        attentionOrders,
        catalog,
        settlements,
        priorities,
        commercial,
        forecast,
        paymentConfiguration,
        limitations: [
          'O sistema possui estoque de produto final, mas isso não equivale a estoque de ingredientes.',
          'Preço adicional de ingrediente não representa custo de compra.',
          'Sem ficha técnica quantitativa, custos de aquisição, movimentações de ingredientes, desperdício e despesas, o assistente não calcula lucro real, margem por prato ou quantidade de compra em kg/litros.',
          'Para essa evolução futura são necessários: unidade e custo de compra do ingrediente, saldo e movimentações, quantidade por ficha técnica, perdas/desperdício e despesas operacionais.',
        ],
      };

      const safePayload = sanitizeAdminAiContext(payload);
      await writeSnapshot(db, restaurantId, sourceVersion, safePayload, now);
      return safePayload;
    });
  }
}

export default new AdminRestaurantContextService();
