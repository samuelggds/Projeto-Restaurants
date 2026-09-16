-- Permite que a conexão de WhatsApp por restaurante use a Evolution API.
-- Esta migration é separada da criação original da tabela para ser segura em
-- ambientes onde a migration anterior já foi aplicada.
ALTER TABLE "RestaurantWhatsappConnection"
  DROP CONSTRAINT IF EXISTS "RestaurantWhatsappConnection_provider_check";

ALTER TABLE "RestaurantWhatsappConnection"
  ADD CONSTRAINT "RestaurantWhatsappConnection_provider_check"
  CHECK ("provider" IN ('ZAPI', 'GUPSHUP', 'META', 'EVOLUTION'));
