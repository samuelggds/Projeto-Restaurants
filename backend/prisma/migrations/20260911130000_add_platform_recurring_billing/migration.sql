CREATE TABLE "PlatformBillingProfile" (
  "restaurantId" INTEGER NOT NULL,
  "billingMethod" TEXT NOT NULL DEFAULT 'PIX',
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "provider" TEXT,
  "providerSubscriptionId" TEXT,
  "providerCustomerId" TEXT,
  "cardBrand" TEXT,
  "cardLast4" VARCHAR(4),
  "cardExpMonth" INTEGER,
  "cardExpYear" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'INACTIVE',
  "nextBillingAt" TIMESTAMP(3),
  "lastChargeAt" TIMESTAMP(3),
  "lastPaymentId" TEXT,
  "lastFailureAt" TIMESTAMP(3),
  "lastFailureReason" VARCHAR(240),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformBillingProfile_pkey" PRIMARY KEY ("restaurantId"),
  CONSTRAINT "PlatformBillingProfile_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlatformBillingProfile_method_check"
    CHECK ("billingMethod" IN ('PIX', 'CARD')),
  CONSTRAINT "PlatformBillingProfile_provider_check"
    CHECK ("provider" IS NULL OR "provider" = 'MERCADO_PAGO'),
  CONSTRAINT "PlatformBillingProfile_status_check"
    CHECK ("status" IN ('INACTIVE', 'AUTHORIZED', 'PAUSED', 'CANCELED', 'ERROR')),
  CONSTRAINT "PlatformBillingProfile_card_last4_check"
    CHECK ("cardLast4" IS NULL OR "cardLast4" ~ '^[0-9]{4}$'),
  CONSTRAINT "PlatformBillingProfile_card_month_check"
    CHECK ("cardExpMonth" IS NULL OR "cardExpMonth" BETWEEN 1 AND 12),
  CONSTRAINT "PlatformBillingProfile_card_year_check"
    CHECK ("cardExpYear" IS NULL OR "cardExpYear" BETWEEN 2020 AND 2100),
  CONSTRAINT "PlatformBillingProfile_card_mode_check"
    CHECK (
      ("billingMethod" = 'PIX' AND "autoRenew" = false)
      OR
      ("billingMethod" = 'CARD' AND "provider" = 'MERCADO_PAGO' AND "providerSubscriptionId" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "PlatformBillingProfile_providerSubscriptionId_key"
  ON "PlatformBillingProfile"("providerSubscriptionId")
  WHERE "providerSubscriptionId" IS NOT NULL;

CREATE INDEX "PlatformBillingProfile_method_status_nextBillingAt_idx"
  ON "PlatformBillingProfile"("billingMethod", "status", "nextBillingAt");
