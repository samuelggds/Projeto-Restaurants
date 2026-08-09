import { Router, type Request, type Response } from "express";
import prisma from "../../../config/prisma.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const router = Router();

function clientContext(req: Request, res: Response) {
  if (req.user.role !== "CLIENTE" || !req.user.id || !req.user.restaurantId) {
    res.status(403).json({ error: "Favoritos são exclusivos para clientes." });
    return null;
  }
  return { userId: Number(req.user.id), restaurantId: Number(req.user.restaurantId) };
}

router.get("/", authMiddleware, async (req, res): Promise<void> => {
  const context = clientContext(req, res);
  if (!context) return;
  const favorites = await prisma.productFavorite.findMany({
    where: context,
    include: { product: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ favorites: favorites.map((item) => item.product) });
});

router.post("/:productId", authMiddleware, async (req, res): Promise<void> => {
  const context = clientContext(req, res);
  if (!context) return;
  const productId = Number(req.params.productId);
  const product = await prisma.product.findFirst({ where: { id: productId, restaurantId: context.restaurantId, active: true } });
  if (!product) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }
  await prisma.productFavorite.upsert({
    where: { userId_productId: { userId: context.userId, productId } },
    update: { restaurantId: context.restaurantId },
    create: { ...context, productId },
  });
  res.status(201).json({ favorite: true, product });
});

router.delete("/:productId", authMiddleware, async (req, res): Promise<void> => {
  const context = clientContext(req, res);
  if (!context) return;
  await prisma.productFavorite.deleteMany({ where: { userId: context.userId, productId: Number(req.params.productId), restaurantId: context.restaurantId } });
  res.json({ favorite: false });
});

export default router;
