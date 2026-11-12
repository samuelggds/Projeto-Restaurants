import type { Request, Response } from 'express';
import { z } from 'zod';
import { customerAddressSchema } from '../domain/CustomerAddress.js';
import customerAddressService, { type CustomerAddressService } from '../services/CustomerAddressService.js';

const addressIdSchema = z.coerce.number().int().positive();

export class CustomerAddressController {
  constructor(private readonly service: CustomerAddressService = customerAddressService) {}

  private userId(req: Request, res: Response) {
    if (req.user?.role !== 'CLIENTE' || !req.user.id) {
      res.status(403).json({ error: 'Endereços são exclusivos para clientes.' });
      return null;
    }
    return Number(req.user.id);
  }

  async list(req: Request, res: Response) {
    const userId = this.userId(req, res);
    if (!userId) return undefined;
    const addresses = await this.service.list(userId);
    return res.json({ addresses });
  }

  async create(req: Request, res: Response) {
    const userId = this.userId(req, res);
    if (!userId) return undefined;
    const parsed = customerAddressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Preencha todos os dados do endereço corretamente.' });
    }
    const address = await this.service.create(userId, parsed.data);
    return res.status(201).json({ address });
  }

  async setDefault(req: Request, res: Response) {
    const userId = this.userId(req, res);
    if (!userId) return undefined;
    const parsedId = addressIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(404).json({ error: 'Endereço não encontrado.' });
    }
    const address = await this.service.setDefault(userId, parsedId.data);
    if (!address) return res.status(404).json({ error: 'Endereço não encontrado.' });
    return res.json({ address });
  }
}

export default new CustomerAddressController();
