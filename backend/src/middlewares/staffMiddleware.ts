import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";

export function staffMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({
      error: "Não autenticado",
    });
  }
  const allowedRoles = [
    UserRole.ADMIN,
    UserRole.FUNCIONARIO,
    UserRole.MOTOQUEIRO,
  ];

  if (
    !allowedRoles.includes(
      String(req.user.role) as (typeof allowedRoles)[number],
    )
  ) {
    return res.status(403).json({
      error: "Acesso negado",
    });
  }
  return next();
}
