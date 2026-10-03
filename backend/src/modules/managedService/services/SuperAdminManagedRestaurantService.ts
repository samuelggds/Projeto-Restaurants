import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import createProductService from '../../products/services/CreateProductService.js';
import updateProductService from '../../products/services/UpdateProductService.js';
import listProductService from '../../products/services/ListProductService.js';
import createCategoryService from '../../categories/services/CreateCategoryService.js';
import updateCategoryService from '../../categories/services/UpdateCategoryService.js';
import listCategoryService from '../../categories/services/ListCategoryService.js';
import productComboService from '../../productCombos/services/ProductComboService.js';
import createBannerService from '../../banner/services/CreateBannerService.js';
import updateBannerService from '../../banner/services/UpdateBannerService.js';
import listBannerService from '../../banner/services/ListBannerService.js';
import updateRestaurantSettingsService from '../../restaurantSettings/services/UpdateRestaurantSettingsService.js';
import { createProductSchema, updateProductSchema } from '../../../validators/ProductValidator.js';
import { createCategorySchema } from '../../../validators/CategoryValidator.js';
import { comboInputSchema } from '../../productCombos/services/ProductComboService.js';
import { hasContinuousManagementAccess, hasImplementationAccess } from '../domain/managedServicePolicy.js';

type Actor = {
  userId: number;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
};

const safeSettingsSchema = z
  .object({
    restaurantName: z.string().trim().min(2).max(120).optional(),
    restaurantLogo: z.string().trim().max(700_000).nullable().optional(),
    restaurantCoverImage: z.string().trim().max(700_000).nullable().optional(),
    restaurantDescription: z.string().trim().max(500).nullable().optional(),
    restaurantAddress: z.string().trim().max(160).nullable().optional(),
    restaurantAddressNumber: z.string().trim().max(30).nullable().optional(),
    restaurantAddressComplement: z.string().trim().max(80).nullable().optional(),
    restaurantAddressDistrict: z.string().trim().max(100).nullable().optional(),
    restaurantCity: z.string().trim().max(100).nullable().optional(),
    restaurantState: z.string().trim().max(2).nullable().optional(),
    restaurantZipCode: z.string().trim().max(12).nullable().optional(),
    businessHours: z.unknown().optional(),
    isOpenForOrders: z.boolean().optional(),
    deliveryTimeMin: z.number().int().min(1).max(240).nullable().optional(),
    deliveryTimeMax: z.number().int().min(1).max(240).nullable().optional(),
    autoAcceptOrders: z.boolean().optional(),
    maxConcurrentOrders: z.number().int().min(1).max(500).optional(),
    deliveryFee: z.number().min(0).max(100000).optional(),
    minimumOrder: z.number().min(0).max(1000000).optional(),
    freeShippingMinimum: z.number().min(0).max(1000000).nullable().optional(),
    acceptsDelivery: z.boolean().optional(),
    acceptsPickup: z.boolean().optional(),
    whatsapp: z.string().trim().max(30).nullable().optional(),
    instagram: z.string().trim().max(255).nullable().optional(),
    facebook: z.string().trim().max(255).nullable().optional(),
    tiktok: z.string().trim().max(255).nullable().optional(),
    youtube: z.string().trim().max(255).nullable().optional(),
    primaryColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
    fontFamily: z.string().trim().max(100).nullable().optional(),
    seoTitle: z.string().trim().max(120).nullable().optional(),
    seoDescription: z.string().trim().max(300).nullable().optional(),
  })
  .strict();

function positiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} inválido.`);
  return id;
}

async function assertSuperAdmin(actor: Actor) {
  const userId = positiveId(actor.userId, 'SUPER_ADMIN');
  const user = await prisma.user.findFirst({
    where: { id: userId, role: 'SUPER_ADMIN', active: true },
    select: { id: true, name: true, role: true },
  });
  if (!user) throw new Error('SUPER_ADMIN não autorizado.');
  return user;
}

async function assertManagedAccess(restaurantId: number) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      slug: true,
      subscription: { select: { plan: true, status: true } },
      implementation: { select: { status: true } },
    },
  });
  if (!restaurant) throw new Error('Restaurante não encontrado.');

  const subscription = restaurant.subscription;
  if (!hasImplementationAccess(subscription?.plan, subscription?.status)) {
    throw new Error('Este restaurante não possui serviço assistido ativo.');
  }

  if (
    !hasContinuousManagementAccess(subscription?.plan, subscription?.status) &&
    ['CONCLUIDA', 'CANCELADA'].includes(String(restaurant.implementation?.status || ''))
  ) {
    throw new Error(
      'A implantação Premium já foi encerrada. Alterações contínuas exigem o plano Gestão Total.',
    );
  }

  return restaurant;
}

async function audit(
  restaurantId: number,
  restaurantName: string,
  actor: Actor,
  action: string,
  resource: string,
  metadata: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      restaurantId,
      restaurantName,
      userId: actor.userId,
      userName: actor.userName ?? 'SUPER_ADMIN',
      userRole: actor.userRole ?? 'SUPER_ADMIN',
      action,
      resource,
      ipAddress: actor.ipAddress ?? null,
      requestId: actor.requestId ?? null,
      userAgent: actor.userAgent ?? null,
      metadata,
    },
  });
}

const safeSettingsSelect = {
  restaurantName: true,
  restaurantLogo: true,
  restaurantCoverImage: true,
  restaurantDescription: true,
  restaurantAddress: true,
  restaurantAddressNumber: true,
  restaurantAddressComplement: true,
  restaurantAddressDistrict: true,
  restaurantCity: true,
  restaurantState: true,
  restaurantZipCode: true,
  businessHours: true,
  isOpenForOrders: true,
  deliveryTimeMin: true,
  deliveryTimeMax: true,
  averageDeliveryTime: true,
  autoAcceptOrders: true,
  maxConcurrentOrders: true,
  deliveryFee: true,
  minimumOrder: true,
  freeShippingMinimum: true,
  acceptsDelivery: true,
  acceptsPickup: true,
  whatsapp: true,
  instagram: true,
  facebook: true,
  tiktok: true,
  youtube: true,
  primaryColor: true,
  fontFamily: true,
  seoTitle: true,
  seoDescription: true,
} as const;

class SuperAdminManagedRestaurantService {
  async getWorkspace(restaurantIdInput: unknown, actor: Actor) {
    await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const restaurant = await assertManagedAccess(restaurantId);

    const [products, categories, combos, banners, settings] = await Promise.all([
      listProductService.execute({ restaurantId }),
      listCategoryService.execute(restaurantId),
      productComboService.list(restaurantId),
      listBannerService.execute({ restaurantId }),
      withTenantDbContext(restaurantId, (db) =>
        db.restaurantSettings.findUnique({
          where: { restaurantId },
          select: safeSettingsSelect,
        }),
      ),
    ]);

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        plan: restaurant.subscription?.plan ?? null,
        subscriptionStatus: restaurant.subscription?.status ?? null,
        implementationStatus: restaurant.implementation?.status ?? null,
      },
      products: products.products,
      categories: categories.categories,
      combos,
      banners,
      settings,
    };
  }

  async createProduct(restaurantIdInput: unknown, input: unknown, actor: Actor) {
    const superAdmin = await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const restaurant = await assertManagedAccess(restaurantId);
    const parsed = createProductSchema.parse(input);
    return createProductService.execute(parsed, restaurantId, {
      userId: superAdmin.id,
      userName: superAdmin.name,
      userRole: superAdmin.role,
    });
  }

  async updateProduct(
    restaurantIdInput: unknown,
    productIdInput: unknown,
    input: unknown,
    actor: Actor,
  ) {
    const superAdmin = await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    await assertManagedAccess(restaurantId);
    const productId = positiveId(productIdInput, 'Produto');
    const parsed = updateProductSchema.parse(input);
    return updateProductService.execute(productId, parsed, restaurantId, {
      userId: superAdmin.id,
      userName: superAdmin.name,
      userRole: superAdmin.role,
    });
  }

  async createCategory(restaurantIdInput: unknown, input: unknown, actor: Actor) {
    await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const restaurant = await assertManagedAccess(restaurantId);
    const parsed = createCategorySchema.parse(input);
    const result = await createCategoryService.execute(parsed, restaurantId);
    await audit(restaurantId, restaurant.name, actor, 'MANAGED_CATEGORY_CREATED', 'Category', {
      categoryId: result.category.id,
      name: result.category.name,
    });
    return result;
  }

  async updateCategory(
    restaurantIdInput: unknown,
    categoryIdInput: unknown,
    input: unknown,
    actor: Actor,
  ) {
    await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const restaurant = await assertManagedAccess(restaurantId);
    const categoryId = positiveId(categoryIdInput, 'Categoria');
    const parsed = createCategorySchema.partial().parse(input);
    const result = await updateCategoryService.execute(categoryId, parsed, restaurantId);
    await audit(restaurantId, restaurant.name, actor, 'MANAGED_CATEGORY_UPDATED', `Category:${categoryId}`, {
      fields: Object.keys(parsed),
    });
    return result;
  }

  async saveCombo(
    restaurantIdInput: unknown,
    comboIdInput: unknown | null,
    input: unknown,
    actor: Actor,
  ) {
    await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const restaurant = await assertManagedAccess(restaurantId);
    const comboId = comboIdInput == null ? null : positiveId(comboIdInput, 'Combo');
    const parsed = comboInputSchema.parse(input);
    const result = await productComboService.save(comboId, restaurantId, parsed);
    await audit(
      restaurantId,
      restaurant.name,
      actor,
      comboId ? 'MANAGED_COMBO_UPDATED' : 'MANAGED_COMBO_CREATED',
      comboId ? `Product:${comboId}` : 'ProductCombo',
      { comboId: result.id, name: result.name },
    );
    return result;
  }

  async createBanner(restaurantIdInput: unknown, input: any, actor: Actor) {
    await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const restaurant = await assertManagedAccess(restaurantId);
    const result = await createBannerService.execute({ ...input, restaurantId });
    await audit(restaurantId, restaurant.name, actor, 'MANAGED_BANNER_CREATED', 'Banner', {
      bannerId: result.id,
      title: result.title,
    });
    return result;
  }

  async updateBanner(
    restaurantIdInput: unknown,
    bannerIdInput: unknown,
    input: any,
    actor: Actor,
  ) {
    await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const restaurant = await assertManagedAccess(restaurantId);
    const bannerId = positiveId(bannerIdInput, 'Banner');
    const result = await updateBannerService.execute({ ...input, id: bannerId, restaurantId });
    await audit(restaurantId, restaurant.name, actor, 'MANAGED_BANNER_UPDATED', `Banner:${bannerId}`, {
      fields: Object.keys(input || {}),
    });
    return result;
  }

  async updateSafeSettings(restaurantIdInput: unknown, input: unknown, actor: Actor) {
    await assertSuperAdmin(actor);
    const restaurantId = positiveId(restaurantIdInput, 'Restaurante');
    const restaurant = await assertManagedAccess(restaurantId);
    const parsed = safeSettingsSchema.parse(input);
    const result = await updateRestaurantSettingsService.execute({ restaurantId, ...parsed });
    await audit(
      restaurantId,
      restaurant.name,
      actor,
      'MANAGED_SAFE_SETTINGS_UPDATED',
      `RestaurantSettings:${restaurantId}`,
      { fields: Object.keys(parsed) },
    );
    return result;
  }
}

export default new SuperAdminManagedRestaurantService();
