import { Router } from "express";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import ListSupportChatMessagesController from "../controllers/ListSupportChatMessagesController.js";

const router = Router();

router.get("/messages", authMiddleware, (req, res) => {
  ListSupportChatMessagesController.handle(req, res);
});

export default router;
