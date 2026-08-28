DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "User" WHERE "role" = 'SUPER_ADMIN') > 1 THEN
    RAISE EXCEPTION
      'Não é possível aplicar a restrição: existem múltiplos usuários com o papel SUPER_ADMIN.';
  END IF;
END
$$;

CREATE UNIQUE INDEX "User_single_super_admin_idx"
ON "User" ("role")
WHERE "role" = 'SUPER_ADMIN';
