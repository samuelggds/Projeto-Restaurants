import type { PlatformPlan, PlatformSettings, Subscription } from '@prisma/client';
import { isMfaRequiredForRole } from '../../auth/security/mfaPolicy.js';
import {
  decimalToNumber,
  mapInvoiceStatus,
  planFeatures,
  toIso,
} from '../domain/superAdminMappings.js';

export function presentPlatformSettings(settings: PlatformSettings) {
  return {
    platformName: settings.platformName,
    platformDomain: settings.platformDomain,
    supportEmail: settings.supportEmail,
    primaryColor: settings.primaryColor,
    locale: settings.locale,
    currency: settings.currency,
    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
    allowRestaurantSignup: settings.allowRestaurantSignup,
    requireManualApproval: settings.requireManualApproval,
    defaultTrialDays: settings.defaultTrialDays,
    auditRetentionDays: settings.auditRetentionDays,
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    version: settings.version,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export function presentPlatformPlan(plan: PlatformPlan, restaurantsCount: number) {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    monthlyFee: decimalToNumber(plan.monthlyFee),
    trialDays: plan.trialDays,
    features: planFeatures(plan.features),
    featured: plan.featured,
    active: plan.active,
    restaurantsCount,
    version: plan.version,
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export function presentSubscription(subscription: Partial<Subscription> | null | undefined) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    planCode: subscription.plan,
    status: subscription.status,
    trialEndsAt: toIso(subscription.trialEndsAt),
    currentPeriodStart: toIso(subscription.currentPeriodStart),
    currentPeriodEnd: toIso(subscription.currentPeriodEnd),
    balanceDebt: decimalToNumber(subscription.balanceDebt),
    scheduledPlan: subscription.scheduledPlan ?? null,
    scheduledPlanEffectiveMonth: subscription.scheduledPlanEffectiveMonth ?? null,
    scheduledPlanEffectiveYear: subscription.scheduledPlanEffectiveYear ?? null,
    createdAt: toIso(subscription.createdAt),
    updatedAt: toIso(subscription.updatedAt),
  };
}

export function presentAdministrator(
  administrator: Record<string, any>,
  restaurantName?: string | null,
) {
  const mfaRequired = isMfaRequiredForRole('ADMIN');
  return {
    id: administrator.id,
    name: administrator.name,
    email: administrator.email,
    restaurantId: administrator.restaurantId,
    restaurant: restaurantName ?? administrator.restaurant?.name ?? null,
    status: administrator.active ? ('ACTIVE' as const) : ('BLOCKED' as const),
    lastAccessAt: toIso(administrator.lastLoginAt),
    mfaEnabled: Boolean(administrator.mfaEnabled),
    mfaRequired,
    effectiveMfa: Boolean(administrator.mfaEnabled) || mfaRequired,
    mustChangePassword: Boolean(administrator.mustChangePassword),
    createdAt: toIso(administrator.createdAt),
  };
}

export function presentInvoice(invoice: Record<string, any>, restaurantName?: string | null) {
  return {
    id: invoice.id,
    code: `FAT-${String(invoice.id).padStart(6, '0')}`,
    restaurantId: invoice.restaurantId,
    restaurant: restaurantName ?? invoice.restaurant?.name ?? null,
    referenceMonth: invoice.month,
    referenceYear: invoice.year,
    dueDate: toIso(invoice.dueDate),
    paidAt: toIso(invoice.paidAt),
    value: decimalToNumber(invoice.total),
    monthlyFee: decimalToNumber(invoice.monthlyFee),
    systemFees: decimalToNumber(invoice.systemFees),
    status: mapInvoiceStatus(invoice.status),
    paymentLink: invoice.paymentLink ?? null,
  };
}
