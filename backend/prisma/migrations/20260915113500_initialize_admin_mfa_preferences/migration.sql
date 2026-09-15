-- Preserve the security level administrative accounts already had through the old role-based policy.
-- From this migration forward MFA is an explicit per-account preference that ADMIN/SUPER_ADMIN can disable.
UPDATE "User"
SET "mfaEnabled" = true
WHERE "role" IN ('ADMIN', 'SUPER_ADMIN')
  AND "mfaEnabled" = false;
