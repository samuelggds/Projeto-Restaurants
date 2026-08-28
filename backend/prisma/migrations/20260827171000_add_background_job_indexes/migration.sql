CREATE INDEX "TablePaymentIntent_status_expiresAt_restaurantId_tableSessionId_idx"
ON "TablePaymentIntent"("status", "expiresAt", "restaurantId", "tableSessionId");

CREATE INDEX "DeliveryLocation_recordedAt_idx"
ON "DeliveryLocation"("recordedAt");

CREATE INDEX "CouponRedemption_status_expiresAt_idx"
ON "CouponRedemption"("status", "expiresAt");

CREATE INDEX "Subscription_status_trialEndsAt_idx"
ON "Subscription"("status", "trialEndsAt");

CREATE INDEX "Invoice_status_dueDate_idx"
ON "Invoice"("status", "dueDate");

CREATE INDEX "Invoice_status_createdAt_idx"
ON "Invoice"("status", "createdAt");
