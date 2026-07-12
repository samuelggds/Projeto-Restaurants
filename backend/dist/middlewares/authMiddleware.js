import jwt from "jsonwebtoken";
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Token não informado!" });
    }
    const [, token] = authHeader.split(" ");
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (typeof decoded === "string") {
            return res.status(401).json({ error: "Token inválido!" });
        }
        req.user = {
            id: Number(decoded.id || 0),
            role: String(decoded.role || ""),
            restaurantId: decoded.restaurantId === null || decoded.restaurantId === undefined
                ? null
                : Number(decoded.restaurantId),
            email: decoded.email === null || decoded.email === undefined
                ? null
                : String(decoded.email),
        };
        return next();
    }
    catch (_error) {
        return res.status(401).json({ error: "Token inválido!" });
    }
}
