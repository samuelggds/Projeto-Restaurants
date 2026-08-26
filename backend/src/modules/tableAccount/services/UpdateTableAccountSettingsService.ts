import {
  tableAccountSettingsPatchSchema,
  tableAccountSettingsSchema,
} from '../domain/tableAccountSchemas.js';
import tableAccountSettingsRepository from '../repositories/TableAccountSettingsRepository.js';
import type { TableAccountSettingsDto } from '../domain/tableAccountContracts.js';

export class UpdateTableAccountSettingsService {
  async execute(restaurantId: number, rawInput: unknown) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para alterar as configurações da conta da mesa.');
    }

    const patch = tableAccountSettingsPatchSchema.parse(rawInput);
    const current = await tableAccountSettingsRepository.findByRestaurantId(
      normalizedRestaurantId,
    );
    const merged = tableAccountSettingsSchema.parse({
      ...current,
      ...patch,
    }) as TableAccountSettingsDto;
    return tableAccountSettingsRepository.upsert(normalizedRestaurantId, merged);
  }
}

export default new UpdateTableAccountSettingsService();
