import { Request, Response } from "express";
import importIfoodMenuScraperService from "../services/ImportIfoodMenuScraperService.js";

class ImportIfoodMenuController {
  async handle(req: Request, res: Response) {
    try {
      const { url, restaurantId: bodyRestaurantId } = req.body;
      const resolvedRestaurantId = Number(
        req.user?.restaurantId || bodyRestaurantId || 0,
      );

      const summary = await importIfoodMenuScraperService.execute({
        url,
        restaurantId: resolvedRestaurantId,
      });

      return res.status(201).json(summary);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao importar cardapio do iFood",
      });
    }
  }
}

export default new ImportIfoodMenuController();
