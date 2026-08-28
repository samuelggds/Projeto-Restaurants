import type { NextFunction, Request, RequestHandler, Response } from 'express';
import prisma from '../config/prisma.js';
import { safeErrorName } from '../services/telemetrySanitizer.js';

const DEFAULT_MAINTENANCE_MESSAGE = 'Plataforma temporariamente em manutenção.';
const DEFAULT_CACHE_TTL_MS = 5_000;
const MIN_CACHE_TTL_MS = 1_000;
const MAX_CACHE_TTL_MS = 30_000;

export type PlatformMaintenanceState = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

type PlatformSettingsLoader = () => Promise<{
  maintenanceMode: boolean;
  maintenanceMessage: string;
} | null>;

type CachedState = {
  value: PlatformMaintenanceState;
  expiresAt: number;
};

export function resolvePlatformSettingsCacheTtlMs(
  rawValue: string | number | undefined = process.env.PLATFORM_SETTINGS_CACHE_TTL_MS,
) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return DEFAULT_CACHE_TTL_MS;
  return Math.min(MAX_CACHE_TTL_MS, Math.max(MIN_CACHE_TTL_MS, Math.trunc(parsed)));
}

async function loadPlatformMaintenanceSettings() {
  return prisma.platformSettings.findUnique({
    where: { id: 1 },
    select: {
      maintenanceMode: true,
      maintenanceMessage: true,
    },
  });
}

export class PlatformMaintenanceStateService {
  private cachedState: CachedState | null = null;
  private pendingLoad: Promise<PlatformMaintenanceState> | null = null;
  private cacheRevision = 0;
  private readonly cacheTtlMs: number;

  constructor(
    private readonly loader: PlatformSettingsLoader = loadPlatformMaintenanceSettings,
    cacheTtlMs = resolvePlatformSettingsCacheTtlMs(),
    private readonly now: () => number = Date.now,
    private readonly onLoadError: (error: unknown) => void = (error) => {
      console.warn('[PLATFORM_MAINTENANCE_CHECK_FAILED]', {
        errorType: safeErrorName(error),
      });
    },
  ) {
    this.cacheTtlMs = resolvePlatformSettingsCacheTtlMs(cacheTtlMs);
  }

  invalidate() {
    this.cacheRevision += 1;
    this.cachedState = null;
    // Uma leitura iniciada antes da alteração não deve bloquear uma nova
    // consulta nem repopular o cache com o estado anterior.
    this.pendingLoad = null;
  }

  async getState(): Promise<PlatformMaintenanceState> {
    const now = this.now();
    if (this.cachedState && this.cachedState.expiresAt > now) {
      return this.cachedState.value;
    }
    if (this.pendingLoad) return this.pendingLoad;

    const revision = this.cacheRevision;
    const pendingLoad = this.loadAndCache(revision);
    this.pendingLoad = pendingLoad;

    try {
      return await pendingLoad;
    } finally {
      if (this.pendingLoad === pendingLoad) this.pendingLoad = null;
    }
  }

  private async loadAndCache(revision: number): Promise<PlatformMaintenanceState> {
    let value: PlatformMaintenanceState;

    try {
      const settings = await this.loader();
      const configuredMessage = String(settings?.maintenanceMessage || '').trim();
      value = {
        maintenanceMode: Boolean(settings?.maintenanceMode),
        maintenanceMessage: configuredMessage || DEFAULT_MAINTENANCE_MESSAGE,
      };
    } catch (error) {
      this.onLoadError(error);
      // Falhar aberto evita transformar uma indisponibilidade momentânea do
      // banco (ou uma migração em andamento) em queda total da API.
      value = {
        maintenanceMode: false,
        maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
      };
    }

    if (revision === this.cacheRevision) {
      this.cachedState = {
        value,
        expiresAt: this.now() + this.cacheTtlMs,
      };
    }
    return value;
  }
}

function matchesPathPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isMaintenanceBypassRequest(req: Pick<Request, 'method' | 'path'>) {
  if (String(req.method || '').toUpperCase() === 'OPTIONS') return true;

  const path = String(req.path || '')
    .replace(/\/+$/, '')
    .toLowerCase();

  if (path === '/health' || path === '/ready') return true;
  if (matchesPathPrefix(path, '/auth')) return true;
  if (matchesPathPrefix(path, '/super-admin')) return true;

  return ['/api/webhooks', '/billing/webhook', '/orders/webhook', '/table-accounts/webhooks'].some(
    (prefix) => matchesPathPrefix(path, prefix),
  );
}

export function createPlatformMaintenanceMiddleware(
  stateService: Pick<PlatformMaintenanceStateService, 'getState'>,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (isMaintenanceBypassRequest(req)) return next();

    const state = await stateService.getState();
    if (!state.maintenanceMode) return next();

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '60');
    return res.status(503).json({
      error: state.maintenanceMessage,
      code: 'PLATFORM_MAINTENANCE',
      requestId: req.requestId,
    });
  };
}

export const platformMaintenanceStateService = new PlatformMaintenanceStateService();
export const platformMaintenanceMiddleware = createPlatformMaintenanceMiddleware(
  platformMaintenanceStateService,
);
