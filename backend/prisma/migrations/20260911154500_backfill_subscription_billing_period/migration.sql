-- Legacy active subscriptions could retain the old trial end in currentPeriodEnd
-- while the existing monthly invoice had a later due date. Aligning the cycle
-- with that already-issued invoice preserves the customer's real billing date
-- and lets ProcessPaymentService advance the period idempotently after payment.
WITH latest_invoice AS (
  SELECT DISTINCT ON ("restaurantId")
    "restaurantId",
    "dueDate"
  FROM "Invoice"
  WHERE "status" IN ('PENDENTE', 'ATRASADO', 'PAGO')
  ORDER BY "restaurantId", "dueDate" DESC, "id" DESC
)
UPDATE "Subscription" AS subscription
SET
  "currentPeriodStart" = COALESCE(subscription."currentPeriodStart", subscription."currentPeriodEnd"),
  "currentPeriodEnd" = latest_invoice."dueDate",
  "updatedAt" = CURRENT_TIMESTAMP
FROM latest_invoice
WHERE subscription."restaurantId" = latest_invoice."restaurantId"
  AND subscription."status" = 'ATIVA'
  AND (
    subscription."currentPeriodEnd" IS NULL
    OR subscription."currentPeriodEnd" < latest_invoice."dueDate"
  );
