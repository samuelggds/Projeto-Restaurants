import { PlanType, type Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { PLAN_CONFIG } from '../config/planConfig.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export type PlatformPlanCatalogItem = {
  plan: PlanType;
  name: string;
  description: string;
  monthlyFee: number;
  trialDays: number;
  features: string[];
  featured: boolean;
  active: boolean;
};

type CatalogQueryOptions = {
  activeOnly?: boolean;
  db?: PrismaClientLike;
};

class CatalogStorageUnavailableError extends Error {
  constructor() {
    super('O catálogo de planos ainda não está disponível no banco de dados.');
    this.name = 'CatalogStorageUnavailableError';
  }
}

const FALLBACK_DESCRIPTIONS: Record<PlanType, string> = {
  [PlanType.BASICO]: 'Operação de delivery para restaurantes que estão iniciando na plataforma.',
  [PlanType.PREMIUM]: 'Experiência completa com delivery e atendimento por QR Code nas mesas.',
};

const FALLBACK_FEATURED_PLAN = PlanType.PREMIUM;

function normalizeFeatures(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    throw new Error('As funcionalidades do plano estão em um formato inválido.');
  }

  const features = value.map((item) => (typeof item === 'string' ? item.trim() : ''));
  if (features.some((feature) => !feature)) {
    throw new Error('As funcionalidades do plano estão em um formato inválido.');
  }

  return features;
}

function mapPlan(record: {
  code: PlanType;
  name: string;
  description: string;
  monthlyFee: Prisma.Decimal | number | string;
  trialDays: number;
  features: Prisma.JsonValue;
  featured: boolean;
  active: boolean;
}): PlatformPlanCatalogItem {
  const monthlyFee = Number(record.monthlyFee);
  if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
    throw new Error(`O valor mensal do plano ${record.code} é inválido.`);
  }
  if (!Number.isInteger(record.trialDays) || record.trialDays < 0 || record.trialDays > 90) {
    throw new Error(`O período de teste do plano ${record.code} é inválido.`);
  }

  return {
    plan: record.code,
    name: record.name,
    description: record.description,
    monthlyFee,
    trialDays: record.trialDays,
    features: normalizeFeatures(record.features),
    featured: record.featured,
    active: record.active,
  };
}

function legacyPlans(): PlatformPlanCatalogItem[] {
  return (Object.entries(PLAN_CONFIG) as Array<[PlanType, (typeof PLAN_CONFIG)[PlanType]]>).map(
    ([plan, config]) => ({
      plan,
      name: config.name,
      description: FALLBACK_DESCRIPTIONS[plan],
      monthlyFee: config.monthlyFee,
      trialDays: config.trialDays,
      features: [...config.features],
      featured: plan === FALLBACK_FEATURED_PLAN,
      active: config.availableForSale,
    }),
  );
}

function isCatalogStorageUnavailable(error: unknown) {
  if (error instanceof CatalogStorageUnavailableError) return true;

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  // P2021/P2022 representam, respectivamente, tabela ou coluna ainda ausente
  // durante uma implantação que está aplicando a migração do catálogo.
  return code === 'P2021' || code === 'P2022';
}

function legacyFallbackAllowed() {
  const environment = String(process.env.NODE_ENV || '')
    .trim()
    .toLowerCase();
  const fallbackMode = String(process.env.PLATFORM_PLAN_CATALOG_FALLBACK_MODE || '')
    .trim()
    .toLowerCase();

  return environment === 'test' || fallbackMode === 'migration';
}

function getDelegate(db: PrismaClientLike) {
  const delegate = (db as PrismaClientLike & { platformPlan?: typeof prisma.platformPlan })
    .platformPlan;
  if (!delegate) throw new CatalogStorageUnavailableError();
  return delegate;
}

export class PlatformPlanCatalogService {
  async list(options: CatalogQueryOptions = {}): Promise<PlatformPlanCatalogItem[]> {
    const activeOnly = options.activeOnly ?? true;
    const db = options.db ?? prisma;

    try {
      const records = await getDelegate(db).findMany({
        where: activeOnly ? { active: true } : undefined,
        orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      });

      return records.map(mapPlan);
    } catch (error) {
      if (!legacyFallbackAllowed() || !isCatalogStorageUnavailable(error)) throw error;

      const plans = legacyPlans();
      return activeOnly ? plans.filter((plan) => plan.active) : plans;
    }
  }

  async getByCode(
    plan: PlanType,
    options: CatalogQueryOptions = {},
  ): Promise<PlatformPlanCatalogItem> {
    const activeOnly = options.activeOnly ?? true;
    const db = options.db ?? prisma;

    try {
      const record = await getDelegate(db).findUnique({
        where: { code: plan },
      });

      if (!record || (activeOnly && !record.active)) {
        throw new Error('Plano inválido ou indisponível para novas assinaturas.');
      }

      return mapPlan(record);
    } catch (error) {
      if (!legacyFallbackAllowed() || !isCatalogStorageUnavailable(error)) throw error;

      const fallback = legacyPlans().find(
        (candidate) => candidate.plan === plan && (!activeOnly || candidate.active),
      );
      if (!fallback) {
        throw new Error('Plano inválido ou indisponível para novas assinaturas.');
      }

      return fallback;
    }
  }
}

export default new PlatformPlanCatalogService();
