import crypto from 'node:crypto';
import { OrderStatus, Prisma } from '@prisma/client';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import createProductService from '../../products/services/CreateProductService.js';
import updateProductService from '../../products/services/UpdateProductService.js';
import createCategoryService from '../../categories/services/CreateCategoryService.js';
import updateRestaurantSettingsService from '../../restaurantSettings/services/UpdateRestaurantSettingsService.js';
import updateOrderStatusService from '../../orders/services/UpdateOrderStatusService.js';
import updateEmployeeService from '../../employee/services/UpdateEmployeeService.js';
import deactivateEmployeeService from '../../employee/services/DeactivateEmployeeService.js';
import reactivateEmployeeService from '../../employee/services/ReactivateEmployeeService.js';
import upsertProductDiscountService from '../../products/services/UpsertProductDiscountService.js';
import deleteProductService from '../../products/services/DeleteProductService.js';
import refundOrderByAdminService from '../../orders/services/RefundOrderByAdminService.js';
import createCouponService from '../../coupon/services/CreateCouponService.js';
import updateCouponService from '../../coupon/services/UpdateCouponService.js';
import deleteCouponService from '../../coupon/services/DeleteCouponService.js';
import requestPlanChangeService from '../../subscription/services/RequestPlanChangeService.js';
import { sanitizeAdminAiContext } from '../domain/adminAiSecurityPolicy.js';
import {
  adminAiActionProposalSchema,
  type AdminAiActionProposal,
} from '../domain/adminAiActionProposal.js';

type Actor = {
  userId: number;
  restaurantId: number;
  userName?: string | null;
  userRole?: string | null;
};

type ActionRow = {
  publicId: string;
  actionType: string;
  status: string;
  proposal: unknown;
  approvalSnapshot: unknown;
  result: unknown;
  error: string | null;
  createdAt: Date;
  approvedAt: Date | null;
  executedAt: Date | null;
  canceledAt: Date | null;
};

function assertActor(actor: Actor) {
  if (
    String(actor.userRole || '').toUpperCase() !== 'ADMIN' ||
    !Number.isSafeInteger(Number(actor.userId)) ||
    Number(actor.userId) <= 0 ||
    !Number.isSafeInteger(Number(actor.restaurantId)) ||
    Number(actor.restaurantId) <= 0
  ) {
    throw new Error('Conta ADMIN inválida para propor ações.');
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
}

function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(sanitizeAdminAiContext(value)));
}

function stableKey(actor: Actor, proposal: AdminAiActionProposal) {
  const serialized = canonicalJson(proposal);
  return `admin-ai:${actor.userId}:${crypto.createHash('sha256').update(serialized).digest('hex')}`;
}

function serialize(row: ActionRow) {
  return {
    publicId: row.publicId,
    actionType: row.actionType,
    status: row.status,
    proposal: sanitizeAdminAiContext(row.proposal),
    approvalSnapshot: sanitizeAdminAiContext(row.approvalSnapshot),
    result: sanitizeAdminAiContext(row.result),
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    executedAt: row.executedAt?.toISOString() ?? null,
    canceledAt: row.canceledAt?.toISOString() ?? null,
  };
}

async function readAction(db: Prisma.TransactionClient, restaurantId: number, publicId: string) {
  const rows = await db.$queryRaw<ActionRow[]>(Prisma.sql`
    SELECT
      "publicId", "actionType", "status", "proposal", "approvalSnapshot", "result", "error",
      "createdAt", "approvedAt", "executedAt", "canceledAt"
    FROM "RestaurantAiAction"
    WHERE "restaurantId" = ${restaurantId} AND "publicId" = ${publicId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function resolveCategory(
  db: Prisma.TransactionClient,
  restaurantId: number,
  proposal: { categoryId?: number; categoryName?: string },
) {
  const category = proposal.categoryId
    ? await db.category.findFirst({
        where: { id: proposal.categoryId, restaurantId },
        select: { id: true, name: true },
      })
    : proposal.categoryName
      ? await db.category.findFirst({
          where: {
            restaurantId,
            name: { equals: proposal.categoryName, mode: 'insensitive' },
          },
          select: { id: true, name: true },
        })
      : null;
  if (!category) throw new Error('Selecione uma categoria existente antes de aprovar esta ação.');
  return category;
}

function monetary(value: unknown) {
  if (value === null || value === undefined) return value;
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

async function selectProducts(
  db: Prisma.TransactionClient,
  restaurantId: number,
  proposal: {
    productIds?: number[];
    categoryId?: number;
    categoryName?: string;
    nameContains?: string;
  },
) {
  const category =
    proposal.categoryId || proposal.categoryName
      ? await resolveCategory(db, restaurantId, proposal)
      : null;
  const products = await db.product.findMany({
    where: {
      restaurantId,
      ...(proposal.productIds?.length ? { id: { in: proposal.productIds } } : {}),
      ...(category ? { categoryId: category.id } : {}),
      ...(proposal.nameContains
        ? { name: { contains: proposal.nameContains, mode: 'insensitive' } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      price: true,
      active: true,
      categoryId: true,
      configurationVersion: true,
    },
    orderBy: { name: 'asc' },
    take: 100,
  });
  if (!products.length) throw new Error('Nenhum produto corresponde ao filtro informado.');
  return { category, products };
}

async function loadSafeSettings(db: Prisma.TransactionClient, restaurantId: number) {
  const settings = await db.restaurantSettings.findUnique({
    where: { restaurantId },
    select: {
      companyLegalName: true,
      companyTradeName: true,
      businessHours: true,
      isOpenForOrders: true,
      autoAcceptOrders: true,
      soundNotifications: true,
      maxConcurrentOrders: true,
      deliveryFee: true,
      minimumOrder: true,
      freeShippingMinimum: true,
      acceptsDelivery: true,
      acceptsPickup: true,
      averageDeliveryTime: true,
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
      acceptsPix: true,
      acceptsCard: true,
      trackingRequiresLogin: true,
      whatsappEnabled: true,
      whatsappDisplayName: true,
      whatsappDefaultMessage: true,
      receiveOrdersOnWhatsapp: true,
      receiveStatusNotifications: true,
      instagram: true,
      facebook: true,
      tiktok: true,
      youtube: true,
      primaryColor: true,
      fontFamily: true,
      seoTitle: true,
      seoDescription: true,
      restaurant: {
        select: {
          name: true,
          description: true,
          whatsapp: true,
          address: true,
          addressNumber: true,
          addressComplement: true,
          addressDistrict: true,
          city: true,
          state: true,
          zipCode: true,
        },
      },
    },
  });
  if (!settings) throw new Error('Configurações do restaurante não encontradas.');
  return settings;
}

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(after).map(([key, value]) => [key, { before: before[key] ?? null, after: value }]),
  );
}

async function buildSettingsPreview(
  db: Prisma.TransactionClient,
  restaurantId: number,
  proposal: AdminAiActionProposal,
) {
  const settings = await loadSafeSettings(db, restaurantId);
  const restaurant = settings.restaurant;

  if (proposal.actionType === 'UPDATE_BUSINESS_SETTINGS') {
    const before = {
      restaurantName: restaurant.name,
      restaurantDescription: restaurant.description,
      companyLegalName: settings.companyLegalName,
      companyTradeName: settings.companyTradeName,
      whatsapp: restaurant.whatsapp,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  if (proposal.actionType === 'UPDATE_ADDRESS') {
    const before = {
      restaurantAddress: restaurant.address,
      restaurantAddressNumber: restaurant.addressNumber,
      restaurantAddressComplement: restaurant.addressComplement,
      restaurantAddressDistrict: restaurant.addressDistrict,
      restaurantCity: restaurant.city,
      restaurantState: restaurant.state,
      restaurantZipCode: restaurant.zipCode,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  if (proposal.actionType === 'UPDATE_BUSINESS_HOURS') {
    return {
      actionType: proposal.actionType,
      affectedRecords: 1,
      changes: {
        businessHours: {
          before: sanitizeAdminAiContext(settings.businessHours),
          after: proposal.businessHours,
        },
      },
    };
  }

  if (proposal.actionType === 'UPDATE_ORDER_SETTINGS') {
    const before = {
      isOpenForOrders: settings.isOpenForOrders,
      autoAcceptOrders: settings.autoAcceptOrders,
      soundNotifications: settings.soundNotifications,
      maxConcurrentOrders: settings.maxConcurrentOrders,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  if (proposal.actionType === 'UPDATE_DELIVERY_SETTINGS') {
    const before = {
      deliveryFee: monetary(settings.deliveryFee),
      minimumOrder: monetary(settings.minimumOrder),
      freeShippingMinimum: monetary(settings.freeShippingMinimum),
      acceptsDelivery: settings.acceptsDelivery,
      acceptsPickup: settings.acceptsPickup,
      averageDeliveryTime: settings.averageDeliveryTime,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  if (proposal.actionType === 'UPDATE_TABLE_SETTINGS') {
    const before = {
      tableOrderingEnabled: settings.tableOrderingEnabled,
      waiterCallEnabled: settings.waiterCallEnabled,
      billRequestEnabled: settings.billRequestEnabled,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  if (proposal.actionType === 'UPDATE_TABLE_ACCOUNT_SETTINGS') {
    const before = {
      acceptsPix: settings.acceptsPix,
      acceptsCard: settings.acceptsCard,
      trackingRequiresLogin: settings.trackingRequiresLogin,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  if (proposal.actionType === 'UPDATE_WHATSAPP_SETTINGS') {
    const before = {
      whatsapp: restaurant.whatsapp,
      whatsappEnabled: settings.whatsappEnabled,
      whatsappDisplayName: settings.whatsappDisplayName,
      whatsappDefaultMessage: settings.whatsappDefaultMessage,
      receiveOrdersOnWhatsapp: settings.receiveOrdersOnWhatsapp,
      receiveStatusNotifications: settings.receiveStatusNotifications,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  if (proposal.actionType === 'UPDATE_SOCIAL_SETTINGS') {
    const before = {
      instagram: settings.instagram,
      facebook: settings.facebook,
      tiktok: settings.tiktok,
      youtube: settings.youtube,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  if (proposal.actionType === 'UPDATE_APPEARANCE_SETTINGS') {
    const before = {
      primaryColor: settings.primaryColor,
      fontFamily: settings.fontFamily,
      seoTitle: settings.seoTitle,
      seoDescription: settings.seoDescription,
    };
    const { actionType: _actionType, ...after } = proposal;
    return { actionType: proposal.actionType, affectedRecords: 1, changes: changedFields(before, after) };
  }

  return null;
}

async function buildPreview(
  db: Prisma.TransactionClient,
  restaurantId: number,
  proposal: AdminAiActionProposal,
) {
  if (proposal.actionType === 'CREATE_PRODUCT') {
    let category: { id: number | null; name: string; create: boolean };
    if (proposal.categoryId) {
      const existingCategory = await resolveCategory(db, restaurantId, proposal);
      category = { id: existingCategory.id, name: existingCategory.name, create: false };
    } else if (proposal.categoryName) {
      const existingCategory = await db.category.findFirst({
        where: {
          restaurantId,
          name: { equals: proposal.categoryName, mode: 'insensitive' },
        },
        select: { id: true, name: true },
      });
      category = existingCategory
        ? { id: existingCategory.id, name: existingCategory.name, create: false }
        : { id: null, name: proposal.categoryName, create: true };
    } else {
      const categories = await db.category.findMany({
        where: { restaurantId, active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 2,
      });
      if (categories.length !== 1) {
        throw new Error('Há mais de uma categoria possível. Informe apenas o nome da categoria desejada.');
      }
      category = { id: categories[0].id, name: categories[0].name, create: false };
    }

    const existing = await db.product.findFirst({
      where: { restaurantId, name: { equals: proposal.name, mode: 'insensitive' } },
      select: { id: true, name: true, price: true },
    });
    if (existing) {
      throw new Error(`Já existe um produto chamado “${existing.name}”. Revise antes de criar outro.`);
    }
    return {
      actionType: proposal.actionType,
      exactAction: {
        name: proposal.name,
        description: proposal.description ?? null,
        price: Number(proposal.price.toFixed(2)),
        categoryId: category.id,
        categoryName: category.name,
        createCategory: category.create,
        active: proposal.active,
      },
      affectedRecords: category.create ? 2 : 1,
    };
  }

  if (proposal.actionType === 'UPDATE_PRODUCT') {
    const product = await db.product.findFirst({
      where: { id: proposal.productId, restaurantId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        active: true,
        categoryId: true,
        configurationVersion: true,
        category: { select: { name: true } },
      },
    });
    if (!product) throw new Error('Produto não encontrado neste restaurante.');
    const category =
      proposal.categoryId || proposal.categoryName
        ? await resolveCategory(db, restaurantId, proposal)
        : { id: product.categoryId, name: product.category.name };
    if (proposal.name && proposal.name.toLowerCase() !== product.name.toLowerCase()) {
      const duplicate = await db.product.findFirst({
        where: {
          restaurantId,
          id: { not: product.id },
          name: { equals: proposal.name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (duplicate) throw new Error('Já existe outro produto com o nome informado.');
    }
    const before = {
      name: product.name,
      description: product.description,
      price: Number(product.price),
      categoryId: product.categoryId,
      categoryName: product.category.name,
      active: product.active,
    };
    const after = {
      name: proposal.name ?? product.name,
      description: proposal.description !== undefined ? proposal.description : product.description,
      price: proposal.price ?? Number(product.price),
      categoryId: category.id,
      categoryName: category.name,
      active: proposal.active ?? product.active,
    };
    return {
      actionType: proposal.actionType,
      productId: product.id,
      configurationVersion: product.configurationVersion,
      affectedRecords: 1,
      changes: changedFields(before, after),
      exactAction: after,
    };
  }

  if (proposal.actionType === 'ADJUST_PRODUCT_PRICES') {
    const { category, products } = await selectProducts(db, restaurantId, proposal);
    const changes = products.map((product) => {
      const before = Number(product.price);
      const next =
        proposal.deltaAmount !== undefined
          ? before + proposal.deltaAmount
          : before * (1 + Number(proposal.percent || 0) / 100);
      if (!Number.isFinite(next) || next <= 0 || next > 100000) {
        throw new Error(`O reajuste deixaria “${product.name}” com preço inválido.`);
      }
      return {
        productId: product.id,
        name: product.name,
        categoryId: product.categoryId,
        configurationVersion: product.configurationVersion,
        before: Number(before.toFixed(2)),
        after: Number(next.toFixed(2)),
      };
    });
    return {
      actionType: proposal.actionType,
      filter: {
        productIds: proposal.productIds ?? null,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        nameContains: proposal.nameContains ?? null,
        deltaAmount: proposal.deltaAmount ?? null,
        percent: proposal.percent ?? null,
      },
      affectedRecords: changes.length,
      changes,
    };
  }

  if (proposal.actionType === 'TOGGLE_PRODUCT_AVAILABILITY') {
    const { category, products } = await selectProducts(db, restaurantId, proposal);
    return {
      actionType: proposal.actionType,
      filter: {
        productIds: proposal.productIds ?? null,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        nameContains: proposal.nameContains ?? null,
      },
      affectedRecords: products.length,
      changes: products.map((product) => ({
        productId: product.id,
        name: product.name,
        configurationVersion: product.configurationVersion,
        before: product.active,
        after: proposal.active,
      })),
    };
  }

  if (proposal.actionType === 'CREATE_CATEGORY') {
    const duplicate = await db.category.findFirst({
      where: { restaurantId, name: { equals: proposal.name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) throw new Error('Já existe uma categoria com esse nome.');
    return {
      actionType: proposal.actionType,
      affectedRecords: 1,
      exactAction: {
        name: proposal.name,
        description: proposal.description ?? null,
        active: proposal.active,
      },
    };
  }

  if (proposal.actionType === 'UPSERT_PRODUCT_DISCOUNT') {
    const product = await db.product.findFirst({
      where: { id: proposal.productId, restaurantId },
      select: { id: true, name: true, price: true },
    });
    if (!product) throw new Error('Produto não encontrado neste restaurante.');
    const current = await db.productDiscount.findFirst({
      where: { productId: proposal.productId, restaurantId },
      select: { kind: true, value: true, label: true, active: true, startsAt: true, endsAt: true },
    });
    return {
      actionType: proposal.actionType,
      affectedRecords: 1,
      productId: product.id,
      productName: product.name,
      productPrice: Number(product.price),
      before: current
        ? {
            kind: current.kind,
            value: Number(current.value),
            label: current.label,
            active: current.active,
            startsAt: current.startsAt?.toISOString() ?? null,
            endsAt: current.endsAt?.toISOString() ?? null,
          }
        : null,
      after: {
        kind: proposal.kind,
        value: proposal.value,
        label: proposal.label ?? null,
        active: proposal.active,
        startsAt: proposal.startsAt ?? null,
        endsAt: proposal.endsAt ?? null,
      },
    };
  }

  if (proposal.actionType === 'UPDATE_EMPLOYEE' || proposal.actionType === 'SET_EMPLOYEE_ACTIVE') {
    const employee = await db.user.findFirst({
      where: {
        id: proposal.employeeId,
        restaurantId,
        role: { in: ['FUNCIONARIO', 'MOTOQUEIRO'] },
      },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        role: true,
        subRole: true,
        active: true,
      },
    });
    if (!employee) throw new Error('Funcionário não encontrado neste restaurante.');
    if (proposal.actionType === 'SET_EMPLOYEE_ACTIVE') {
      return {
        actionType: proposal.actionType,
        affectedRecords: 1,
        employeeId: employee.id,
        employeeName: employee.name,
        before: employee.active,
        after: proposal.active,
      };
    }
    const after = {
      name: proposal.name ?? employee.name,
      username: proposal.username ?? employee.username,
      phone: proposal.phone !== undefined ? proposal.phone : employee.phone,
      role: proposal.role ?? employee.role,
      subRole: proposal.subRole !== undefined ? proposal.subRole : employee.subRole,
    };
    return {
      actionType: proposal.actionType,
      affectedRecords: 1,
      employeeId: employee.id,
      employeeName: employee.name,
      changes: changedFields(
        {
          name: employee.name,
          username: employee.username,
          phone: employee.phone,
          role: employee.role,
          subRole: employee.subRole,
        },
        after,
      ),
      exactAction: after,
    };
  }

  if (proposal.actionType === 'UPDATE_ORDER_STATUS') {
    const order = await db.order.findFirst({
      where: { id: proposal.orderId, restaurantId },
      select: { id: true, publicId: true, status: true, type: true, paid: true, total: true },
    });
    if (!order) throw new Error('Pedido não encontrado neste restaurante.');
    return {
      actionType: proposal.actionType,
      affectedRecords: 1,
      orderId: order.id,
      publicId: order.publicId,
      orderType: order.type,
      paid: order.paid,
      total: Number(order.total),
      before: order.status,
      after: proposal.status,
    };
  }

  const settingsPreview = await buildSettingsPreview(db, restaurantId, proposal);
  if (settingsPreview) return settingsPreview;
  throw new Error('Ação ADMIN não implementada.');
}

async function executeSettingsProposal(proposal: AdminAiActionProposal, restaurantId: number) {
  if (proposal.actionType === 'UPDATE_BUSINESS_SETTINGS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  if (proposal.actionType === 'UPDATE_ADDRESS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  if (proposal.actionType === 'UPDATE_BUSINESS_HOURS') {
    return updateRestaurantSettingsService.execute({
      restaurantId,
      businessHours: proposal.businessHours,
    });
  }
  if (proposal.actionType === 'UPDATE_ORDER_SETTINGS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  if (proposal.actionType === 'UPDATE_DELIVERY_SETTINGS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  if (proposal.actionType === 'UPDATE_TABLE_SETTINGS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  if (proposal.actionType === 'UPDATE_TABLE_ACCOUNT_SETTINGS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  if (proposal.actionType === 'UPDATE_WHATSAPP_SETTINGS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  if (proposal.actionType === 'UPDATE_SOCIAL_SETTINGS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  if (proposal.actionType === 'UPDATE_APPEARANCE_SETTINGS') {
    const { actionType: _actionType, ...changes } = proposal;
    return updateRestaurantSettingsService.execute({ restaurantId, ...changes });
  }
  return null;
}

export class AdminAiActionService {
  async propose(input: unknown, actor: Actor) {
    assertActor(actor);
    const proposal = adminAiActionProposalSchema.parse(input);
    const restaurantId = Number(actor.restaurantId);
    const idempotencyKey = stableKey(actor, proposal);

    return withTenantDbContext(restaurantId, async (db) => {
      const preview = await buildPreview(db, restaurantId, proposal);
      const proposalJson = canonicalJson(proposal);
      const previewJson = canonicalJson(preview);
      const rows = await db.$queryRaw<ActionRow[]>(Prisma.sql`
        INSERT INTO "RestaurantAiAction" (
          "restaurantId", "actorUserId", "actionType", "status", "proposal", "approvalSnapshot", "idempotencyKey"
        ) VALUES (
          ${restaurantId}, ${Number(actor.userId)}, ${proposal.actionType}, 'PROPOSED',
          ${proposalJson}::jsonb, ${previewJson}::jsonb, ${idempotencyKey}
        )
        ON CONFLICT ("restaurantId", "idempotencyKey") DO UPDATE SET
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING
          "publicId", "actionType", "status", "proposal", "approvalSnapshot", "result", "error",
          "createdAt", "approvedAt", "executedAt", "canceledAt"
      `);
      return serialize(rows[0]);
    });
  }

  async list(actor: Actor) {
    assertActor(actor);
    const restaurantId = Number(actor.restaurantId);
    return withTenantDbContext(restaurantId, async (db) => {
      const rows = await db.$queryRaw<ActionRow[]>(Prisma.sql`
        SELECT
          "publicId", "actionType", "status", "proposal", "approvalSnapshot", "result", "error",
          "createdAt", "approvedAt", "executedAt", "canceledAt"
        FROM "RestaurantAiAction"
        WHERE "restaurantId" = ${restaurantId}
        ORDER BY "createdAt" DESC
        LIMIT 100
      `);
      return rows.map(serialize);
    });
  }

  async cancel(publicIdInput: unknown, actor: Actor) {
    assertActor(actor);
    const publicId = String(publicIdInput || '').trim();
    if (!publicId) throw new Error('Ação inválida.');
    const restaurantId = Number(actor.restaurantId);
    return withTenantDbContext(restaurantId, async (db) => {
      await db.$executeRaw(Prisma.sql`
        UPDATE "RestaurantAiAction"
        SET "status" = 'CANCELED', "canceledAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId}
          AND "publicId" = ${publicId}
          AND "status" IN ('PROPOSED', 'APPROVED')
      `);
      const action = await readAction(db, restaurantId, publicId);
      if (!action) throw new Error('Ação não encontrada.');
      return serialize(action);
    });
  }

  async approveAndExecute(publicIdInput: unknown, actor: Actor) {
    assertActor(actor);
    const publicId = String(publicIdInput || '').trim();
    if (!publicId) throw new Error('Ação inválida.');
    const restaurantId = Number(actor.restaurantId);

    const action = await withTenantDbContext(restaurantId, async (db) => {
      const current = await readAction(db, restaurantId, publicId);
      if (!current) throw new Error('Ação não encontrada.');
      if (current.status === 'EXECUTED') return current;
      if (current.status !== 'PROPOSED') {
        throw new Error('Esta ação não está disponível para aprovação.');
      }
      const proposal = adminAiActionProposalSchema.parse(current.proposal);
      const freshPreview = await buildPreview(db, restaurantId, proposal);
      if (canonicalJson(current.approvalSnapshot) !== canonicalJson(freshPreview)) {
        throw new Error('Os dados mudaram desde a prévia. Gere uma nova proposta antes de aprovar.');
      }
      const changed = await db.$executeRaw(Prisma.sql`
        UPDATE "RestaurantAiAction"
        SET
          "status" = 'APPROVED',
          "approvedByUserId" = ${Number(actor.userId)},
          "approvedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "restaurantId" = ${restaurantId}
          AND "publicId" = ${publicId}
          AND "status" = 'PROPOSED'
      `);
      if (changed !== 1) throw new Error('A ação foi atualizada por outra sessão.');
      return { ...current, status: 'APPROVED', proposal, approvalSnapshot: freshPreview };
    });

    if (action.status === 'EXECUTED') return serialize(action);
    const proposal = adminAiActionProposalSchema.parse(action.proposal);
    try {
      let result: unknown;

      if (proposal.actionType === 'CREATE_PRODUCT') {
        const preview = action.approvalSnapshot as {
          exactAction?: {
            categoryId?: number | null;
            categoryName?: string;
            createCategory?: boolean;
          };
        };
        let categoryId = Number(preview?.exactAction?.categoryId || 0);
        if (!categoryId && preview?.exactAction?.createCategory && preview.exactAction.categoryName) {
          const createdCategory = await createCategoryService.execute(
            {
              name: preview.exactAction.categoryName,
              active: true,
            },
            restaurantId,
          );
          categoryId = Number(createdCategory.category.id);
        }
        if (!categoryId) throw new Error('Categoria da ação não está mais disponível.');
        result = await createProductService.execute(
          {
            name: proposal.name,
            description: proposal.description ?? undefined,
            price: proposal.price,
            categoryId,
            active: proposal.active,
            featured: false,
            saleMode: 'COMPLETE',
          },
          restaurantId,
          {
            userId: Number(actor.userId),
            userName: actor.userName || undefined,
            userRole: actor.userRole || undefined,
          },
        );
      } else if (proposal.actionType === 'UPDATE_PRODUCT') {
        const preview = action.approvalSnapshot as {
          configurationVersion?: number;
          exactAction?: {
            name?: string;
            description?: string | null;
            price?: number;
            categoryId?: number;
            active?: boolean;
          };
        };
        const exact = preview.exactAction;
        if (!exact) throw new Error('Prévia do produto indisponível.');
        result = await updateProductService.execute(
          proposal.productId,
          {
            name: exact.name,
            description: exact.description ?? undefined,
            price: exact.price,
            categoryId: exact.categoryId,
            active: exact.active,
            expectedConfigurationVersion: preview.configurationVersion,
          },
          restaurantId,
          {
            userId: Number(actor.userId),
            userName: actor.userName || undefined,
            userRole: actor.userRole || undefined,
          },
        );
      } else if (proposal.actionType === 'ADJUST_PRODUCT_PRICES') {
        const preview = action.approvalSnapshot as {
          changes?: Array<{ productId: number; after: number; configurationVersion: number }>;
        };
        const changes = Array.isArray(preview?.changes) ? preview.changes : [];
        const updated: unknown[] = [];
        for (const change of changes) {
          updated.push(
            await updateProductService.execute(
              change.productId,
              { price: change.after, expectedConfigurationVersion: change.configurationVersion },
              restaurantId,
              {
                userId: Number(actor.userId),
                userName: actor.userName || undefined,
                userRole: actor.userRole || undefined,
              },
            ),
          );
        }
        result = { updatedProducts: updated.length };
      } else if (proposal.actionType === 'TOGGLE_PRODUCT_AVAILABILITY') {
        const preview = action.approvalSnapshot as {
          changes?: Array<{ productId: number; after: boolean; configurationVersion: number }>;
        };
        const changes = Array.isArray(preview?.changes) ? preview.changes : [];
        for (const change of changes) {
          await updateProductService.execute(
            change.productId,
            { active: change.after, expectedConfigurationVersion: change.configurationVersion },
            restaurantId,
            {
              userId: Number(actor.userId),
              userName: actor.userName || undefined,
              userRole: actor.userRole || undefined,
            },
          );
        }
        result = { updatedProducts: changes.length, active: proposal.active };
      } else if (proposal.actionType === 'CREATE_CATEGORY') {
        result = await createCategoryService.execute(
          {
            name: proposal.name,
            description: proposal.description ?? undefined,
            active: proposal.active,
          },
          restaurantId,
        );
      } else if (proposal.actionType === 'UPSERT_PRODUCT_DISCOUNT') {
        result = await upsertProductDiscountService.execute({
          productId: proposal.productId,
          restaurantId,
          input: {
            kind: proposal.kind,
            value: proposal.value,
            label: proposal.label,
            active: proposal.active,
            startsAt: proposal.startsAt,
            endsAt: proposal.endsAt,
          },
        });
      } else if (proposal.actionType === 'UPDATE_EMPLOYEE') {
        const preview = action.approvalSnapshot as {
          exactAction?: {
            name?: string;
            username?: string;
            phone?: string | null;
            role?: 'FUNCIONARIO' | 'MOTOQUEIRO';
            subRole?: 'COZINHA' | 'GARCOM' | 'ATENDENTE' | null;
          };
        };
        const exact = preview.exactAction;
        if (!exact) throw new Error('Prévia do funcionário indisponível.');
        result = await updateEmployeeService.execute({
          id: proposal.employeeId,
          restaurantId,
          ...exact,
          actor: {
            userId: Number(actor.userId),
            userName: actor.userName || undefined,
            userRole: actor.userRole || undefined,
          },
        });
      } else if (proposal.actionType === 'SET_EMPLOYEE_ACTIVE') {
        result = proposal.active
          ? await reactivateEmployeeService.execute(proposal.employeeId, restaurantId)
          : await deactivateEmployeeService.execute(proposal.employeeId, restaurantId, {
              userId: Number(actor.userId),
              userName: actor.userName || undefined,
              userRole: actor.userRole || undefined,
            });
      } else if (proposal.actionType === 'UPDATE_ORDER_STATUS') {
        result = await updateOrderStatusService.execute(
          proposal.orderId,
          restaurantId,
          proposal.status as OrderStatus,
          'ADMIN',
          undefined,
          Number(actor.userId),
          null,
        );
      } else {
        result = await executeSettingsProposal(proposal, restaurantId);
        if (result === null) throw new Error('Ação ADMIN não implementada.');
      }

      return withTenantDbContext(restaurantId, async (db) => {
        const resultJson = canonicalJson(result);
        await db.$executeRaw(Prisma.sql`
          UPDATE "RestaurantAiAction"
          SET
            "status" = 'EXECUTED',
            "result" = ${resultJson}::jsonb,
            "executedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "restaurantId" = ${restaurantId}
            AND "publicId" = ${publicId}
            AND "status" = 'APPROVED'
        `);
        const executed = await readAction(db, restaurantId, publicId);
        if (!executed) throw new Error('Não foi possível carregar a ação executada.');
        return serialize(executed);
      });
    } catch (error) {
      await withTenantDbContext(restaurantId, async (db) => {
        const message =
          error instanceof Error ? error.message.slice(0, 1000) : 'Falha ao executar ação.';
        await db.$executeRaw(Prisma.sql`
          UPDATE "RestaurantAiAction"
          SET "status" = 'FAILED', "error" = ${message}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "restaurantId" = ${restaurantId}
            AND "publicId" = ${publicId}
            AND "status" = 'APPROVED'
        `);
      });
      throw error;
    }
  }
}

export default new AdminAiActionService();
