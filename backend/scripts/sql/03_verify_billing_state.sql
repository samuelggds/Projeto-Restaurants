-- Verificacao rapida do estado de bloqueio/liberacao.
-- Troque restaurant_id antes de executar.

WITH params AS (
  SELECT 15::int AS restaurant_id
)
SELECT
  r.id AS restaurant_id,
  r.name,
  r.active AS restaurant_active,
  s.status AS subscription_status,
  i.id AS invoice_id,
  i.month,
  i.year,
  i.status AS invoice_status,
  i."dueDate",
  i."paidAt",
  i."paymentLink"
FROM params p
JOIN "Restaurant" r ON r.id = p.restaurant_id
LEFT JOIN "Subscription" s ON s."restaurantId" = p.restaurant_id
LEFT JOIN "Invoice" i ON i."restaurantId" = p.restaurant_id
ORDER BY i.year DESC, i.month DESC, i.id DESC;
