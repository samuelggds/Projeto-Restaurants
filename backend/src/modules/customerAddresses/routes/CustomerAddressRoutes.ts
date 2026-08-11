import { Router, type Request, type Response } from "express";
import { z } from "zod";
import prisma from "../../../config/prisma.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";

const router = Router();
router.use(authMiddleware);

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  address: z.string().trim().min(3).max(160),
  number: z.string().trim().regex(/^\d+[A-Za-z]?$/).max(10),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  zipCode: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 8),
  complement: z.string().trim().max(160).optional().default(""),
  isDefault: z.boolean().optional().default(false),
});

function customerId(req: Request, res: Response) {
  if (req.user.role !== "CLIENTE" || !req.user.id) {
    res.status(403).json({ error: "Endereços são exclusivos para clientes." });
    return null;
  }
  return Number(req.user.id);
}

router.get("/", async (req, res): Promise<void> => {
  const userId = customerId(req, res);
  if (!userId) return;
  const addresses = await prisma.userAddress.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  res.json({ addresses });
});

router.post("/", async (req, res): Promise<void> => {
  const userId = customerId(req, res);
  if (!userId) return;
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Preencha todos os dados do endereço corretamente." }); return; }
  const count = await prisma.userAddress.count({ where: { userId } });
  const makeDefault = parsed.data.isDefault || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.userAddress.create({ data: {
      userId,
      label: parsed.data.label,
      address: parsed.data.address,
      number: parsed.data.number,
      district: parsed.data.district,
      city: parsed.data.city,
      state: parsed.data.state,
      zipCode: parsed.data.zipCode,
      complement: parsed.data.complement || null,
      isDefault: makeDefault,
    } });
  });
  res.status(201).json({ address });
});

router.put("/:id/default", async (req, res): Promise<void> => {
  const userId = customerId(req, res);
  if (!userId) return;
  const id = Number(req.params.id);
  const exists = await prisma.userAddress.findFirst({ where: { id, userId } });
  if (!exists) { res.status(404).json({ error: "Endereço não encontrado." }); return; }
  const address = await prisma.$transaction(async (tx) => {
    await tx.userAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.userAddress.update({ where: { id }, data: { isDefault: true } });
  });
  res.json({ address });
});

export default router;
