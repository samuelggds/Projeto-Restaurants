import { Router } from "express";
import AiSupportChatController from "../controllers/AiSupportChatController.js";

const router = Router();

router.post("/chat", (req, res) => {
  AiSupportChatController.handle(req, res);
});

export default router;
