import { UserRole } from "@prisma/client";
export function staffMiddleware(req, res, next) {
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
    if (!allowedRoles.includes(String(req.user.role))) {
        return res.status(403).json({
            error: "Acesso negado",
        });
    }
    return next();
}
