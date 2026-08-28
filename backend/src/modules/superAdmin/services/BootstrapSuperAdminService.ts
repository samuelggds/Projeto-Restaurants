import { readFile, stat } from 'node:fs/promises';
import bcrypt from 'bcrypt';
import { UserRole, type Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import {
  type BootstrapEnvironment,
  resolveSuperAdminBootstrapConfig,
  validateInitialSuperAdminPassword,
} from '../security/superAdminBootstrapConfig.js';

const ADMIN_CHANGE_ADVISORY_LOCK = 742839105;
const MAX_SECRET_FILE_BYTES = 4096;

type DatabaseClient = Pick<typeof prisma, '$transaction'>;
type ServiceDependencies = {
  hashPassword: (password: string) => Promise<string>;
  readSecretFile: (file: string) => Promise<string>;
};

async function readSecretFile(file: string) {
  const metadata = await stat(file);
  if (!metadata.isFile() || metadata.size < 1 || metadata.size > MAX_SECRET_FILE_BYTES) {
    throw new Error('O arquivo da senha inicial do SUPER_ADMIN possui tamanho inválido.');
  }

  const contents = await readFile(file, 'utf8');
  return contents.replace(/\r?\n$/u, '');
}

const defaultDependencies: ServiceDependencies = {
  hashPassword: async (password) => bcrypt.hash(password, 12),
  readSecretFile,
};

export type SuperAdminBootstrapResult =
  | { status: 'disabled' }
  | { status: 'ready' | 'created'; userId: number };

export class BootstrapSuperAdminService {
  constructor(
    private readonly database: DatabaseClient = prisma,
    private readonly dependencies: ServiceDependencies = defaultDependencies,
  ) {}

  async execute(env: BootstrapEnvironment = process.env): Promise<SuperAdminBootstrapResult> {
    const config = resolveSuperAdminBootstrapConfig(env);
    if (!config.enabled) return { status: 'disabled' };

    return this.database.$transaction(
      async (transaction: Prisma.TransactionClient): Promise<SuperAdminBootstrapResult> => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(${ADMIN_CHANGE_ADVISORY_LOCK})`;

      const superAdmins = await transaction.user.findMany({
        where: { role: UserRole.SUPER_ADMIN },
        orderBy: { id: 'asc' },
        take: 2,
        select: {
          id: true,
          email: true,
          active: true,
          restaurantId: true,
          subRole: true,
          mfaEnabled: true,
        },
      });

      if (superAdmins.length > 1) {
        throw new Error(
          'Mais de um SUPER_ADMIN foi encontrado. Corrija as contas duplicadas antes de iniciar a plataforma.',
        );
      }

      const existingSuperAdmin = superAdmins[0];
      if (existingSuperAdmin) {
        const matchesExpectedIdentity =
          existingSuperAdmin.email.trim().toLowerCase() === config.email;
        const hasSafePlatformScope =
          existingSuperAdmin.active &&
          existingSuperAdmin.restaurantId === null &&
          existingSuperAdmin.subRole === null &&
          existingSuperAdmin.mfaEnabled;

        if (!matchesExpectedIdentity || !hasSafePlatformScope) {
          throw new Error(
            'O SUPER_ADMIN existente não corresponde à identidade ou à política de segurança configurada.',
          );
        }

        return { status: 'ready', userId: existingSuperAdmin.id };
      }

      const accountWithBootstrapEmail = await transaction.user.findFirst({
        where: { email: { equals: config.email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (accountWithBootstrapEmail) {
        throw new Error(
          'O email de bootstrap já pertence a outra conta. Use o script operacional de promoção após revisar o usuário.',
        );
      }

      const initialPassword =
        config.password ||
        (config.passwordFile
          ? await this.dependencies.readSecretFile(config.passwordFile)
          : '');
      const passwordErrors = validateInitialSuperAdminPassword(initialPassword);
      if (!initialPassword || passwordErrors.length) {
        throw new Error(
          `Não foi possível criar o SUPER_ADMIN: ${passwordErrors.join('; ') || 'senha inicial ausente'}.`,
        );
      }

      const passwordHash = await this.dependencies.hashPassword(initialPassword);
      const created = await transaction.user.create({
        data: {
          name: config.name,
          email: config.email,
          password: passwordHash,
          role: UserRole.SUPER_ADMIN,
          active: true,
          restaurantId: null,
          subRole: null,
          mfaEnabled: true,
          mustChangePassword: true,
        },
        select: { id: true, name: true },
      });

      await transaction.auditLog.create({
        data: {
          userId: created.id,
          userName: created.name,
          userRole: UserRole.SUPER_ADMIN,
          action: 'BOOTSTRAP_SUPER_ADMIN',
          resource: `User:${created.id}`,
          result: 'SUCCESS',
        },
      });

      return { status: 'created', userId: created.id };
      },
    );
  }
}

export default new BootstrapSuperAdminService();
