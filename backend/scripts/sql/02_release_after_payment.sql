-- Simula pagamento e liberacao do sistema para o restaurante.
-- Troque restaurant_id antes de executar.

WITH params AS (
  SELECT 15::int AS restaurant_id
),
mark_paid AS (
  UPDATE "Invoice" i
  SET
    status = 'PAGO'::"InvoiceStatus",
    "paidAt" = NOW()
  FROM params p
  WHERE i."restaurantId" = p.restaurant_id
    AND i.status IN ('PENDENTE'::"InvoiceStatus", 'ATRASADO'::"InvoiceStatus")
  RETURNING i.id, i.status, i."paidAt"
),
activate_subscription AS (
  UPDATE "Subscription" s
  SET status = 'ATIVA'::"SubscriptionStatus"
  FROM params p
  WHERE s."restaurantId" = p.restaurant_id
  RETURNING s.id, s.status
),
activate_restaurant AS (
  UPDATE "Restaurant" r
  SET active = true
  FROM params p
  WHERE r.id = p.restaurant_id
  RETURNING r.id, r.active
)
SELECT
  r.id AS restaurant_id,
  r.active AS restaurant_active,
  s.status AS subscription_status,
  COUNT(m.id) AS invoices_marked_paid
FROM params p
JOIN "Restaurant" r ON r.id = p.restaurant_id
LEFT JOIN "Subscription" s ON s."restaurantId" = p.restaurant_id
LEFT JOIN mark_paid m ON true
GROUP BY r.id, r.active, s.status;
