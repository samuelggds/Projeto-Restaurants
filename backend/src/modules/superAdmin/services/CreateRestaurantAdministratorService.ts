import bcrypt from 'bcrypt';
import { buildAuditMetadata } from '../domain/auditMetadata.js';
import { conflict, notFound, SuperAdminError } from '../domain/superAdminErrors.js';
import {
  createRestaurantAdministratorSchema,
  type CreateRestaurantAdministratorInput,
} from '../domain/superAdminSchemas.js';
import superAdminRepository, {
  type AuditContext,
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import { presentAdministrator } from './superAdminPresenters.js';
import { parseSuperAdminPayload, requireSuperAdminActor } from './superAdminServiceSupport.js';

function parseRestaurantId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
  }
  return id;
}

export class CreateRestaurantAdministratorService {
  constructor(
    private readonly repository: SuperAdminRepository = superAdminRepository,
    private readonly hashPassword: (password: string) => Promise<string> = (password) =>
      bcrypt.hash(password, 12),
  ) {}

  async execute(restaurantIdValue: unknown, payload: unknown, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const parsed = parseSuperAdminPayload<CreateRestaurantAdministratorInput>(
      createRestaurantAdministratorSchema,
      payload,
    );
    const passwordHash = await this.hashPassword(parsed.password);

    try {
      return await this.repository.transaction(async (transaction) => {
        const actor = await requireSuperAdminActor(this.repository, context, transaction);
        const restaurant = await this.repository.findRestaurantForMutation(
          restaurantId,
          transaction,
        );
        if (!restaurant) throw notFound('Restaurante não encontrado.');

        const duplicate = await this.repository.findUserByEmail(parsed.email, transaction);
        if (duplicate) throw conflict('Já existe uma conta com este e-mail.');

        const administrator = await this.repository.createAdministrator(
          {
            restaurantId,
            name: parsed.name,
            email: parsed.email,
            password: passwordHash,
          },
          transaction,
        );

        await this.repository.createAuditLog(
          {
            ...context,
            actorName: actor.name,
            actorRole: actor.role,
            restaurantId,
            restaurantName: restaurant.name,
            action: 'CREATE_RESTAURANT_ADMINISTRATOR',
            resource: `User:${administrator.id}`,
            metadata: buildAuditMetadata({
              before: null,
              after: {
                id: administrator.id,
                name: administrator.name,
                email: administrator.email,
                role: 'ADMIN',
                active: administrator.active,
                restaurantId,
              },
            }),
          },
          transaction,
        );

        return presentAdministrator(administrator, restaurant.name);
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw conflict('Já existe uma conta com este e-mail.');
      }
      throw error;
    }
  }
}

export default new CreateRestaurantAdministratorService();

