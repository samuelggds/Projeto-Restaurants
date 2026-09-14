import { PlanType, Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { PLAN_CONFIG } from '../config/planConfig.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export type PlatformPlanCatalogItem = {
  plan: PlanType;
  name: string;
  description: string;
  monthlyFee: number;
  trialDays: number;
  configuredTrialDays: number;
  usesDefaultTrialDays: boolean;
  features: string[];
  featured: boolean;
  active: boolean;
};

type CatalogQueryOptions = {
  activeOnly?: boolean;
  db?: PrismaClientLike;
};

type TrialPolicyRow = {
  code: PlanType;
  useDefaultTrialDays: boolean;
  defaultTrialDays: number;
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

function mapPlan(
  record: {
    code: PlanType;
    name: string;
    description: string;
    monthlyFee: Prisma.Decimal | number | string;
    trialDays: number;
    features: Prisma.JsonValue;
    featured: boolean;
    active: boolean;
  },
  policy?: TrialPolicyRow,
): PlatformPlanCatalogItem {
  const monthlyFee = Number(record.monthlyFee);
  if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
    throw new Error(`O valor mensal do plano ${record.code} é inválido.`);
  }
  if (!Number.isInteger(record.trialDays) || record.trialDays < 0 || record.trialDays > 90) {
    throw new Error(`O período de teste do plano ${record.code} é inválido.`);
  }
  const defaultTrialDays = Number(policy?.defaultTrialDays ?? record.trialDays);
  if (!Number.isInteger(defaultTrialDays) || defaultTrialDays < 0 || defaultTrialDays > 90) {
    throw new Error('O período de teste padrão da plataforma é inválido.');
  }
  const usesDefaultTrialDays = Boolean(policy?.useDefaultTrialDays);

  return {
    plan: record.code,
    name: record.name,
    description: record.description,
    monthlyFee,
    trialDays: usesDefaultTrialDays ? defaultTrialDays : record.trialDays,
    configuredTrialDays: record.trialDays,
    usesDefaultTrialDays,
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
      configuredTrialDays: config.trialDays,
      usesDefaultTrialDays: false,
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

  return code === 'P2021' || code === 'P2022';
}

function legacyFallbackAllowed() {
  const environment = String(process.env.NODE_ENV || '').trim().toLowerCase();
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

async function loadTrialPolicies(db: PrismaClientLike): Promise<Map<PlanType, TrialPolicyRow>> {
  const queryRaw = (db as PrismaClientLike & {
    $queryRaw?: typeof prisma.$queryRaw;
  }).$queryRaw;
  if (typeof queryRaw !== 'function') return new Map();

  try {
    const rows = await db.$queryRaw<TrialPolicyRow[]>(Prisma.sql`
      SELECT
        p."code",
        COALESCE(policy."useDefaultTrialDays", false) AS "useDefaultTrialDays",
        settings."defaultTrialDays" AS "defaultTrialDays"
      FROM "PlatformPlan" p
      CROSS JOIN "PlatformSettings" settings
      LEFT JOIN "PlatformPlanPolicy" policy ON policy."code" = p."code"
      WHERE settings."id" = 1
    `);
    return new Map(rows.map((row) => [row.code, row]));
  } catch (error) {
    if (isCatalogStorageUnavailable(error) && legacyFallbackAllowed()) return new Map();
    throw error;
  }
}

export class PlatformPlanCatalogService {
  async list(options: CatalogQueryOptions = {}): Promise<PlatformPlanCatalogItem[]> {
    const activeOnly = options.activeOnly ?? true;
    const db = options.db ?? prisma;

    try {
      const [records, policies] = await Promise.all([
        getDelegate(db).findMany({
          where: activeOnly ? { active: true } : undefined,
          orderBy: [{ featured: 'desc' }, { name: 'asc' }],
        }),
        loadTrialPolicies(db),
      ]);

      return records.map((record) => mapPlan(record, policies.get(record.code)));
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
      const [record, policies] = await Promise.all([
        getDelegate(db).findUnique({ where: { code: plan } }),
        loadTrialPolicies(db),
      ]);

      if (!record || (activeOnly && !record.active)) {
        throw new Error('Plano inválido ou indisponível para novas assinaturas.');
      }

      return mapPlan(record, policies.get(record.code));
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
