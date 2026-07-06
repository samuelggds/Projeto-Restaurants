-- Use este script para descobrir o restaurantId do admin que voce quer testar.
-- Troque o email abaixo antes de executar.

SELECT
  u.id AS user_id,
  u.email,
  u.role,
  u."restaurantId",
  r.name AS restaurant_name,
  r.active AS restaurant_active,
  s.id AS subscription_id,
  s.status AS subscription_status
FROM "User" u
LEFT JOIN "Restaurant" r ON r.id = u."restaurantId"
LEFT JOIN "Subscription" s ON s."restaurantId" = u."restaurantId"
WHERE u.email = 'admin@hotmail.com';
