import crypto from 'crypto';
import tableRepository from '../repositories/TableRepository.js';
import { parseTableSeatCapacity } from '../domain/tableSeatCapacity.js';
import { resolveRestaurantMenuBaseUrl } from '../../customDomains/services/PublicCustomDomainService.js';

type CreateTablePayload = {
  number: number | string;
  seatCapacity?: number | string;
  restaurantId: number;
};

class CreateTableService {
  async execute({ number, seatCapacity, restaurantId }: CreateTablePayload) {
    const normalizedNumber = Number(number);
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para cadastrar mesa.');
    }
    if (!Number.isInteger(normalizedNumber) || normalizedNumber <= 0 || normalizedNumber > 9999) {
      throw new Error('Informe um número de mesa inteiro entre 1 e 9999.');
    }

    const tableExists = await tableRepository.findByNumber(
      normalizedNumber,
      normalizedRestaurantId,
    );

    if (tableExists) {
      throw new Error('Já existe uma mesa com esse número!');
    }

    const normalizedSeats = parseTableSeatCapacity(seatCapacity);
    const token = crypto.randomBytes(16).toString('hex');

    const created = await tableRepository.create({
      number: normalizedNumber,
      seatCapacity: normalizedSeats,
      restaurantId: normalizedRestaurantId,
      token,
    });
    const { restaurant, ...table } = created;
    const menuBaseUrl = await resolveRestaurantMenuBaseUrl(normalizedRestaurantId);

    return {
      ...table,
      restaurantSlug: restaurant.slug,
      menuBaseUrl,
    };
  }
}

export default new CreateTableService();
