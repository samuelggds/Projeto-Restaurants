-- Forca o estado de bloqueio por inadimplencia para um restaurante.
-- 1) Troque restaurant_id
-- 2) Se payment_link ficar NULL, o frontend mostrara "Link indisponivel" ate gerar link real

WITH params AS (
  SELECT
    15::int AS restaurant_id,
    7::int AS month_ref,
    2026::int AS year_ref,
    100.00::double precision AS monthly_fee,
    40.00::double precision AS system_fees,
    NULL::text AS payment_link
),
upsert_invoice AS (
  INSERT INTO "Invoice" (
    "restaurantId", month, year, "monthlyFee", "systemFees", total,
    "paymentLink", status, "dueDate", "createdAt"
  )
  SELECT
    p.restaurant_id,
    p.month_ref,
    p.year_ref,
    p.monthly_fee,
    p.system_fees,
    (p.monthly_fee + p.system_fees),
    p.payment_link,
    'ATRASADO'::"InvoiceStatus",
    NOW() - INTERVAL '40 day',
    NOW()
  FROM params p
  ON CONFLICT ("restaurantId", month, year)
  DO UPDATE SET
    status = 'ATRASADO'::"InvoiceStatus",
    "dueDate" = NOW() - INTERVAL '40 day',
    "paymentLink" = EXCLUDED."paymentLink",
    total = EXCLUDED.total,
    "monthlyFee" = EXCLUDED."monthlyFee",
    "systemFees" = EXCLUDED."systemFees",
    "paidAt" = NULL
  RETURNING id, "restaurantId"
),
update_subscription AS (
  UPDATE "Subscription" s
  SET status = 'EXPIRADA'::"SubscriptionStatus"
  FROM params p
  WHERE s."restaurantId" = p.restaurant_id
  RETURNING s.id, s."restaurantId", s.status
),
update_restaurant AS (
  UPDATE "Restaurant" r
  SET active = false
  FROM params p
  WHERE r.id = p.restaurant_id
  RETURNING r.id, r.active
)
SELECT
  i.id AS invoice_id,
  i."restaurantId",
  i.status AS invoice_status,
  i."dueDate",
  i."paymentLink"
FROM "Invoice" i
JOIN params p ON p.restaurant_id = i."restaurantId"
WHERE i.month = p.month_ref AND i.year = p.year_ref;
