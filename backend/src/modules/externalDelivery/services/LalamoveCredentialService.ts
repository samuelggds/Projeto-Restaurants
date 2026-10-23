import { createHmac } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  credentialEncryptionContext,
  encryptCredential,
  decryptCredential,
  parseCredentialEncryptionKey,
} from '../../restaurantSettings/security/credentialEncryption.js';
import { createLalamoveApiClient } from '../providers/LalamoveApiClient.js';
import { LalamoveReviewError } from './LalamoveReviewService.js';

const PROVIDER = 'LALAMOVE' as const;
const environmentSchema = z.enum(['sandbox', 'production']);
const credentialsSchema = z.object({
  environment: environmentSchema,
  apiKey: z.string().trim().min(10).max(200),
  apiSecret: z.string().trim().min(10).max(300),
  expectedVersion: z.number().int().min(0).max(2147483647),
}).strict();
const versionSchema = z.object({ expectedVersion: z.number().int().positive() }).strict();
type Environment = z.infer<typeof environmentSchema>;
type CredentialRow = {
  environment: string; status: string; version: number;
  verifiedAt: Date | null; revokedAt: Date | null; updatedAt: Date;
};
type Dependencies = {
  database: typeof prisma;
  tenant: typeof withTenantDbContext;
  verify: (creds: { apiKey: string; apiSecret: string; environment: 'sandbox' }) => Promise<void>;
};

function positiveId(input: unknown) {
  if ((typeof input !== 'string' || !/^[1-9]\d*$/u.test(input)) &&
      (typeof input !== 'number' || !Number.isInteger(input))) {
    throw new LalamoveReviewError('Restaurante inválido.', 400);
  }
  const id = Number(input);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    throw new LalamoveReviewError('Restaurante inválido.', 400);
  }
  return id;
}
function response(row: CredentialRow | null, environment: Environment) {
  return {
    provider: PROVIDER, environment,
    configured: Boolean(row && row.status !== 'REVOKED'),
    status: row?.status ?? 'NOT_CONFIGURED',
    version: row?.version ?? 0,
    verifiedAt: row?.verifiedAt?.toISOString() ?? null,
    connected: false,
    canDispatch: false,
  };
}
function requireSecrets() {
  const encryptionKey = parseCredentialEncryptionKey();
  const identityKey = parseCredentialEncryptionKey(process.env.LALAMOVE_ACCOUNT_IDENTITY_HMAC_KEY);
  if (!encryptionKey || !identityKey) {
    throw new LalamoveReviewError('Chaves seguras de credenciais não configuradas no servidor.', 503);
  }
  if (identityKey.equals(encryptionKey)) {
    throw new LalamoveReviewError('A chave de identidade Lalamove deve ser distinta da chave de criptografia.', 503);
  }
  // Independent, persistent HMAC key: encryption key rotation cannot change account uniqueness.
  return identityKey;
}
function context(restaurantId: number, environment: Environment, field: string) {
  return credentialEncryptionContext(restaurantId, 'LALAMOVE:' + environment + ':' + field);
}
function validateKeyPair(input: z.infer<typeof credentialsSchema>) {
  const prefix = input.environment === 'sandbox' ? 'test' : 'prod';
  if (!/^pk_(test|prod)_[A-Za-z0-9_-]{6,}$/u.test(input.apiKey) ||
      !/^sk_(test|prod)_[A-Za-z0-9_-]{6,}$/u.test(input.apiSecret) ||
      !input.apiKey.startsWith('pk_' + prefix + '_') ||
      !input.apiSecret.startsWith('sk_' + prefix + '_')) {
    throw new LalamoveReviewError('Credenciais incompatíveis com o ambiente selecionado.', 400);
  }
}
async function defaultVerify(creds: { apiKey: string; apiSecret: string; environment: 'sandbox' }) {
  const client = createLalamoveApiClient(creds);
  await client.getCities(); // Read-only authenticated call. Never quote or book.
}

const select = {
  environment: true, status: true, version: true, verifiedAt: true, revokedAt: true, updatedAt: true,
} as const satisfies Prisma.RestaurantExternalDeliveryCredentialSelect;

export class LalamoveCredentialService {
  constructor(private readonly deps: Dependencies = {
    database: prisma, tenant: withTenantDbContext, verify: defaultVerify,
  }) {}

  private async authorize(actorInput: unknown) {
    const id = positiveId(actorInput);
    const actor = await this.deps.database.user.findFirst({
      where: { id, role: 'SUPER_ADMIN', active: true, restaurantId: null },
      select: { id: true, name: true, role: true },
    });
    if (!actor) throw new LalamoveReviewError('Acesso exclusivo do SUPER_ADMIN.', 403);
    return actor;
  }

  async status(actorInput: unknown, restaurantInput: unknown) {
    await this.authorize(actorInput);
    const restaurantId = positiveId(restaurantInput);
    return this.deps.tenant(restaurantId, async db => {
      const rows = await db.restaurantExternalDeliveryCredential.findMany({
        where: { restaurantId, provider: PROVIDER }, select,
      });
      return {
        sandbox: response(rows.find(row => row.environment === 'sandbox') ?? null, 'sandbox'),
        production: response(rows.find(row => row.environment === 'production') ?? null, 'production'),
      };
    });
  }

  async configure(actorInput: unknown, restaurantInput: unknown, payload: unknown) {
    const actor = await this.authorize(actorInput);
    const restaurantId = positiveId(restaurantInput);
    const parsed = credentialsSchema.safeParse(payload);
    if (!parsed.success) throw new LalamoveReviewError('Dados de credenciais inválidos.', 400);
    const input = parsed.data;
    validateKeyPair(input);
    const identityKey = requireSecrets();
    const apiKeyEncrypted = encryptCredential(input.apiKey, context(restaurantId, input.environment, 'apiKey'));
    const apiSecretEncrypted = encryptCredential(input.apiSecret, context(restaurantId, input.environment, 'apiSecret'));
    const apiKeyDigest = createHmac('sha256', identityKey).update('LALAMOVE-ACCOUNT-KEY-v1:').update(input.apiKey).digest('hex');
    if (!apiKeyEncrypted?.startsWith('enc:v1:') || !apiSecretEncrypted?.startsWith('enc:v1:')) {
      throw new LalamoveReviewError('Criptografia de credenciais indisponível.', 503);
    }
    return this.deps.tenant(restaurantId, async db => {
      const request = await db.restaurantExternalDeliveryOnboarding.findUnique({
        where: { restaurantId_provider: { restaurantId, provider: PROVIDER } },
        select: { id: true, status: true },
      });
      if (!request || request.status !== 'IN_REVIEW') {
        throw new LalamoveReviewError('A solicitação deve estar em análise antes de configurar credenciais.', 409);
      }
      const where = { restaurantId_provider_environment: { restaurantId, provider: PROVIDER, environment: input.environment } };
      const previous = await db.restaurantExternalDeliveryCredential.findUnique({ where, select });
      if ((previous?.version ?? 0) !== input.expectedVersion) {
        throw new LalamoveReviewError('Configuração alterada por outro administrador. Atualize a página.', 409);
      }
      if (!previous) {
        const inserted = await db.restaurantExternalDeliveryCredential.createMany({
          data: [{
            restaurantId, provider: PROVIDER, environment: input.environment,
            apiKeyEncrypted, apiSecretEncrypted, apiKeyDigest, status: 'STORED',
            updatedByUserId: actor.id,
          }], skipDuplicates: true,
        });
        if (inserted.count !== 1) {
          throw new LalamoveReviewError('Conta já vinculada ou configuração concorrente.', 409);
        }
      } else {
        const updated = await db.restaurantExternalDeliveryCredential.updateMany({
          where: { restaurantId, provider: PROVIDER, environment: input.environment, version: input.expectedVersion },
          data: {
            apiKeyEncrypted, apiSecretEncrypted, apiKeyDigest, status: 'STORED',
            verifiedAt: null, revokedAt: null, updatedByUserId: actor.id,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new LalamoveReviewError('Configuração concorrente.', 409);
      }
      const stored = await db.restaurantExternalDeliveryCredential.findUniqueOrThrow({ where, select });
      await db.auditLog.create({ data: {
        userId: actor.id, userName: actor.name, userRole: actor.role, restaurantId,
        action: 'LALAMOVE_CREDENTIAL_CONFIGURED',
        resource: 'LALAMOVE:' + input.environment + ':' + restaurantId,
        metadata: { provider: PROVIDER, environment: input.environment, version: stored.version },
      } });
      return response(stored, input.environment);
    }).catch(error => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new LalamoveReviewError('Conta Lalamove já vinculada ou atualização concorrente.', 409);
      }
      throw error;
    });
  }

  async verifySandbox(actorInput: unknown, restaurantInput: unknown, payload: unknown) {
    const actor = await this.authorize(actorInput);
    const restaurantId = positiveId(restaurantInput);
    const parsed = versionSchema.safeParse(payload);
    if (!parsed.success) throw new LalamoveReviewError('Versão inválida.', 400);
    requireSecrets();
    const where = { restaurantId_provider_environment: { restaurantId, provider: PROVIDER, environment: 'sandbox' } };
    const snapshot = await this.deps.tenant(restaurantId, db =>
      db.restaurantExternalDeliveryCredential.findUnique({ where, select: {
        ...select, apiKeyEncrypted: true, apiSecretEncrypted: true,
      } }));
    if (!snapshot || snapshot.status === 'REVOKED' ||
        snapshot.version !== parsed.data.expectedVersion ||
        !snapshot.apiKeyEncrypted || !snapshot.apiSecretEncrypted) {
      throw new LalamoveReviewError('Credenciais não encontradas ou desatualizadas.', 409);
    }
    const apiKey = decryptCredential(snapshot.apiKeyEncrypted, context(restaurantId, 'sandbox', 'apiKey'));
    const apiSecret = decryptCredential(snapshot.apiSecretEncrypted, context(restaurantId, 'sandbox', 'apiSecret'));
    if (!apiKey || !apiSecret) throw new LalamoveReviewError('Credenciais indisponíveis.', 503);
    try {
      await this.deps.verify({ apiKey, apiSecret, environment: 'sandbox' });
    } catch {
      // No provider response or secrets in error, logs, or audit.
      throw new LalamoveReviewError('Não foi possível validar as credenciais no sandbox Lalamove.', 422);
    }
    return this.deps.tenant(restaurantId, async db => {
      const changed = await db.restaurantExternalDeliveryCredential.updateMany({
        where: {
          restaurantId, provider: PROVIDER, environment: 'sandbox',
          version: snapshot.version, status: { in: ['STORED', 'VERIFIED_SANDBOX'] },
          apiKeyEncrypted: snapshot.apiKeyEncrypted,
          apiSecretEncrypted: snapshot.apiSecretEncrypted,
        },
        data: {
          status: 'VERIFIED_SANDBOX', verifiedAt: new Date(),
          version: { increment: 1 }, updatedByUserId: actor.id,
        },
      });
      if (changed.count !== 1) throw new LalamoveReviewError('Credenciais modificadas durante a validação.', 409);
      const stored = await db.restaurantExternalDeliveryCredential.findUniqueOrThrow({ where, select });
      await db.auditLog.create({ data: {
        userId: actor.id, userName: actor.name, userRole: actor.role, restaurantId,
        action: 'LALAMOVE_CREDENTIAL_SANDBOX_VERIFIED',
        resource: 'LALAMOVE:sandbox:' + restaurantId,
        metadata: { provider: PROVIDER, environment: 'sandbox', version: stored.version },
      } });
      return response(stored, 'sandbox');
    });
  }

  async revoke(actorInput: unknown, restaurantInput: unknown, environmentInput: unknown, payload: unknown) {
    const actor = await this.authorize(actorInput);
    const restaurantId = positiveId(restaurantInput);
    const environment = environmentSchema.safeParse(environmentInput);
    const parsed = versionSchema.safeParse(payload);
    if (!environment.success || !parsed.success) throw new LalamoveReviewError('Dados de revogação inválidos.', 400);
    return this.deps.tenant(restaurantId, async db => {
      const changed = await db.restaurantExternalDeliveryCredential.updateMany({
        where: {
          restaurantId, provider: PROVIDER, environment: environment.data,
          version: parsed.data.expectedVersion, status: { not: 'REVOKED' },
        },
        data: {
          status: 'REVOKED', apiKeyEncrypted: null, apiSecretEncrypted: null, apiKeyDigest: null,
          verifiedAt: null, revokedAt: new Date(),
          version: { increment: 1 }, updatedByUserId: actor.id,
        },
      });
      if (changed.count !== 1) throw new LalamoveReviewError('Conta não encontrada ou já alterada.', 409);
      const stored = await db.restaurantExternalDeliveryCredential.findUniqueOrThrow({
        where: { restaurantId_provider_environment: { restaurantId, provider: PROVIDER, environment: environment.data } },
        select,
      });
      await db.auditLog.create({ data: {
        userId: actor.id, userName: actor.name, userRole: actor.role, restaurantId,
        action: 'LALAMOVE_CREDENTIAL_REVOKED',
        resource: 'LALAMOVE:' + environment.data + ':' + restaurantId,
        metadata: { provider: PROVIDER, environment: environment.data, version: stored.version },
      } });
      return response(stored, environment.data);
    });
  }
}
export default new LalamoveCredentialService();
