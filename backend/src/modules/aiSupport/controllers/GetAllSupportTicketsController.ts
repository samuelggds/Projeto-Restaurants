import { Request, Response } from 'express';
import listAllSupportConversationsService from '../services/ListAllSupportConversationsService.js';

class GetAllSupportTicketsController {
  async handle(_req: Request, res: Response) {
    try {
      return res.status(200).json(await listAllSupportConversationsService.execute());
    } catch (error: unknown) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : 'Erro ao listar tickets',
      });
    }
  }
}

export default new GetAllSupportTicketsController();
