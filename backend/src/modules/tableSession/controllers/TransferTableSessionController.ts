import type {Request,Response} from 'express';
import service,{TableTransferError} from '../services/TransferTableSessionService.js';
class TransferTableSessionController {
  async handle(req:Request,res:Response) {
    try {
      return res.status(200).json(await service.execute({sessionId:req.params.id,destinationTableId:req.body?.destinationTableId,
        restaurantId:req.user.restaurantId,actorId:req.user.id}));
    } catch(error:unknown) {
      return res.status(error instanceof TableTransferError?error.statusCode:500).json({
        error:error instanceof TableTransferError?error.message:'Não foi possível transferir a mesa.'});
    }
  }
}
export default new TransferTableSessionController();
