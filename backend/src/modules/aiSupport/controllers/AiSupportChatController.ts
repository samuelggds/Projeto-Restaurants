import { Request, Response } from "express";
import aiSupportService from "../services/AiSupportService.js";

class AiSupportChatController {
  async handle(req: Request, res: Response) {
    try {
      const question = String(req.body?.question || "").trim();

      if (!question) {
        return res.status(400).json({
          error: "Pergunta obrigatoria.",
        });
      }

      if (question.length > 2000) {
        return res.status(400).json({
          error: "Pergunta muito longa. Use ate 2000 caracteres.",
        });
      }

      const result = await aiSupportService.execute({
        question,
        role: req.body?.role,
        pathname: req.body?.pathname,
        history: req.body?.history,
        conversationId: req.body?.conversationId,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar suporte de IA.",
      });
    }
  }
}

export default new AiSupportChatController();
