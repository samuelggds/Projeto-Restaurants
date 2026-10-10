import type { Request, Response } from 'express';
import quoteService, { LalamoveQuoteError } from '../services/LalamoveQuotationService.js';

function actor(req: Request) {
  return {
    restaurantId: Number(req.user?.restaurantId),
    actorId: Number(req.user?.id),
    orderId: Number(req.params.orderId),
  };
}
function safeFailure(res: Response, error: unknown) {
  const status = error instanceof LalamoveQuoteError ? error.statusCode : 503;
  const message = error instanceof LalamoveQuoteError
    ? error.message : 'Não foi possível processar a cotação Lalamove.';
  return res.status(status).json({ error: message });
}
class LalamoveQuotationController {
  async current(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    try { return res.json({ quote: await quoteService.current(actor(req)) }); }
    catch (error) { return safeFailure(res, error); }
  }
  async request(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    try { return res.status(200).json({ quote: await quoteService.request(actor(req), req.body) }); }
    catch (error) { return safeFailure(res, error); }
  }
  async approve(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    try { return res.json({ quote: await quoteService.approve(actor(req), req.body) }); }
    catch (error) { return safeFailure(res, error); }
  }
}
export default new LalamoveQuotationController();
