import authTokenService from "./AuthTokenService.js";
class LogoutService {
    async execute(refreshToken) {
        const token = String(refreshToken || "").trim();
        if (!token) {
            throw new Error("Refresh token nao informado");
        }
        await authTokenService.revokeRefreshToken(token);
        return { ok: true };
    }
}
export default new LogoutService();
