const DEFAULT_JWT_EXPIRES_IN = "12h";
const DEFAULT_JWT_REFRESH_EXPIRES_IN = "14d";
const DEFAULT_JWT_MFA_EXPIRES_IN = "10m";
export function getJwtSecret() {
    return String(process.env.JWT_SECRET || "").trim();
}
export function getJwtExpiresIn() {
    const value = String(process.env.JWT_EXPIRES_IN || "").trim();
    return (value || DEFAULT_JWT_EXPIRES_IN);
}
export function getJwtRefreshSecret() {
    return String(process.env.JWT_REFRESH_SECRET || "").trim();
}
export function getJwtRefreshExpiresIn() {
    const value = String(process.env.JWT_REFRESH_EXPIRES_IN || "").trim();
    return (value || DEFAULT_JWT_REFRESH_EXPIRES_IN);
}
export function getJwtMfaSecret() {
    return String(process.env.JWT_MFA_SECRET || "").trim();
}
export function getJwtMfaExpiresIn() {
    const value = String(process.env.JWT_MFA_EXPIRES_IN || "").trim();
    return (value || DEFAULT_JWT_MFA_EXPIRES_IN);
}
