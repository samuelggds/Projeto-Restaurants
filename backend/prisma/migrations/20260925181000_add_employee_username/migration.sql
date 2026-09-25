-- Funcionários passam a entrar por usuário de conta dentro do próprio restaurante.
-- O e-mail permanece apenas como identificador interno legado/compatível e não é
-- utilizado como credencial de acesso da equipe.
ALTER TABLE "User"
ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = 'usuario' || "id"::text
WHERE "role" IN ('FUNCIONARIO', 'MOTOQUEIRO')
  AND "username" IS NULL;

CREATE UNIQUE INDEX "User_restaurantId_username_key"
ON "User"("restaurantId", "username");
