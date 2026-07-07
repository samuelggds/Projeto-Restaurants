import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";

export function superAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ message: "Acesso negado!" });
  }
  next();
}
