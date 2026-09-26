-- Novo padrão do produto: recursos da conta da mesa começam ativos.
-- O admin pode desativar individualmente depois pelo painel.

ALTER TABLE "TableAccountSettings"
ALTER COLUMN "enabled" SET DEFAULT true,
ALTER COLUMN "allowCash" SET DEFAULT true,
ALTER COLUMN "allowCardMachine" SET DEFAULT true;

UPDATE "TableAccountSettings"
SET
  "enabled" = true,
  "allowCash" = true,
  "allowCardMachine" = true
WHERE
  "enabled" = false
  OR "allowCash" = false
  OR "allowCardMachine" = false;