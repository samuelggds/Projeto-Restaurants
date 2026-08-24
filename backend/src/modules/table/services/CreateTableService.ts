import crypto from 'crypto';
import tableRepository from '../repositories/TableRepository.js';

type CreateTablePayload = {
  number: number | string;
  restaurantId: number;
};

class CreateTableService {
  async execute({ number, restaurantId }: CreateTablePayload) {
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

    const token = crypto.randomBytes(16).toString('hex');

    return tableRepository.create({
      number: normalizedNumber,
      restaurantId: normalizedRestaurantId,
      token,
    });
  }
}

export default new CreateTableService();
