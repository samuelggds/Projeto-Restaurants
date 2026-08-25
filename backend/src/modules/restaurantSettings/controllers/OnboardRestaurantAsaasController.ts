import { Request, Response } from 'express';
import onboardRestaurantAsaasService from '../services/OnboardRestaurantAsaasService.js';

class OnboardRestaurantAsaasController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user?.restaurantId;
      const {
        cnpj,
        cpf,
        restaurantName,
        pixKey,
        email,
        mobilePhone,
        incomeValue,
        address,
        addressNumber,
        province,
        postalCode,
      } = req.body;

      const result = await onboardRestaurantAsaasService.execute({
        restaurantId,
        cnpj,
        cpf,
        restaurantName,
        pixKey,
        email,
        mobilePhone,
        incomeValue,
        address,
        addressNumber,
        province,
        postalCode,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Erro ao criar subconta Asaas do restaurante.',
      });
    }
  }
}

export default new OnboardRestaurantAsaasController();
