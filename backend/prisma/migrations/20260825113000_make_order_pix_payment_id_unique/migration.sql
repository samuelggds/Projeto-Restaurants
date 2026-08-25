DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Order"
    WHERE "pixPaymentId" IS NOT NULL
    GROUP BY "pixPaymentId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Nao foi possivel criar unicidade de pixPaymentId: existem pagamentos PIX vinculados a mais de um pedido';
  END IF;
END $$;

CREATE UNIQUE INDEX "Order_pixPaymentId_key" ON "Order"("pixPaymentId");
