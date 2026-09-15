-- Conexão de WhatsApp por restaurante. A tabela fica fora do RLS de propósito:
-- callbacks externos precisam descobrir o tenant pelo instanceId antes de abrir o
-- contexto tenant. O token da instância nunca é salvo em claro e todas as rotas
-- administrativas continuam filtrando explicitamente por restaurantId.
CREATE TABLE "RestaurantWhatsappConnection" (
  "id" BIGSERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "provider" VARCHAR(32) NOT NULL DEFAULT 'ZAPI',
  "externalInstanceId" VARCHAR(191) NOT NULL,
  "instanceTokenCiphertext" TEXT NOT NULL,
  "webhookSecretHash" VARCHAR(64) NOT NULL,
  "phone" VARCHAR(15),
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "trialExpiresAt" TIMESTAMP(3),
  "connectedAt" TIMESTAMP(3),
  "disconnectedAt" TIMESTAMP(3),
  "lastWebhookAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantWhatsappConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantWhatsappConnection_restaurant_key" UNIQUE ("restaurantId"),
  CONSTRAINT "RestaurantWhatsappConnection_instance_key" UNIQUE ("externalInstanceId"),
  CONSTRAINT "RestaurantWhatsappConnection_restaurant_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestaurantWhatsappConnection_provider_check"
    CHECK ("provider" IN ('ZAPI', 'GUPSHUP', 'META')),
  CONSTRAINT "RestaurantWhatsappConnection_status_check"
    CHECK ("status" IN ('PENDING', 'CONNECTED', 'DISCONNECTED', 'ERROR'))
);

CREATE INDEX "RestaurantWhatsappConnection_provider_status_idx"
  ON "RestaurantWhatsappConnection"("provider", "status");
CREATE INDEX "RestaurantWhatsappConnection_phone_idx"
  ON "RestaurantWhatsappConnection"("phone");
