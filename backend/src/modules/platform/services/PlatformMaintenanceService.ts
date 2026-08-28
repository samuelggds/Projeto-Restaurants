import prisma from '../../../config/prisma.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';

export const PLATFORM_MAINTENANCE_CODE = 'PLATFORM_MAINTENANCE';
export const DEFAULT_MAINTENANCE_MESSAGE = 'Plataforma temporariamente em manutenção.';

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

export class PlatformMaintenanceError extends Error {
  readonly code = PLATFORM_MAINTENANCE_CODE;
  readonly statusCode = 503;

  constructor(message = DEFAULT_MAINTENANCE_MESSAGE) {
    super(message);
    this.name = 'PlatformMaintenanceError';
  }
}

export function isPlatformMaintenanceError(error: unknown): error is PlatformMaintenanceError {
  return (
    error instanceof PlatformMaintenanceError ||
    (error instanceof Error &&
      'code' in error &&
      (error as Error & { code?: unknown }).code === PLATFORM_MAINTENANCE_CODE)
  );
}

export function platformMaintenanceResponse(
  message = DEFAULT_MAINTENANCE_MESSAGE,
  requestId?: string,
) {
  return {
    error: message,
    code: PLATFORM_MAINTENANCE_CODE,
    ...(requestId ? { requestId } : {}),
  };
}

export class PlatformMaintenanceAccessService {
  constructor(
    private readonly stateService: Pick<PlatformMaintenanceStateService, 'getState'>,
  ) {}

  async assertRoleAllowed(role: string | null | undefined) {
    const state = await this.stateService.getState();
    if (
      state.maintenanceMode &&
      String(role || '')
        .trim()
        .toUpperCase() !== 'SUPER_ADMIN'
    ) {
      throw new PlatformMaintenanceError(state.maintenanceMessage);
    }

    return state;
  }
}

export const platformMaintenanceStateService = new PlatformMaintenanceStateService();
export const platformMaintenanceAccessService = new PlatformMaintenanceAccessService(
  platformMaintenanceStateService,
);
