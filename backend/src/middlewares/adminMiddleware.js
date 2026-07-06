import { UserRole } from "@prisma/client";

export function adminMiddleware(req, res, next) {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Acesso negado!" });
  }
  return next();
}
