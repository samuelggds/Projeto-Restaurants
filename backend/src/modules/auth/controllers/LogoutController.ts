import { Request, Response } from "express";
import logoutService from "../services/LogoutService.js";

class LogoutController {
  async handle(req: Request, res: Response) {
    try {
      const refreshToken = String(req.body?.refreshToken || "");
      await logoutService.execute(refreshToken);
      return res.status(200).json({ ok: true });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Falha ao fazer logout",
      });
    }
  }
}

export default new LogoutController();
