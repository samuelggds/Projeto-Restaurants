-- The tenant-prefixed B-tree index supports stable keyset pagination by
-- (createdAt DESC, id DESC) without scanning orders from other restaurants.
-- PostgreSQL can scan this ascending index backward for the requested order.
CREATE INDEX "Order_restaurantId_createdAt_id_idx"
ON "Order"("restaurantId", "createdAt", "id");
