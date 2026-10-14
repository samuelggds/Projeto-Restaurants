-- PostgreSQL requires the new enum labels to be committed before they are used.
ALTER TYPE "CouponAudience" ADD VALUE IF NOT EXISTS 'AUTHENTICATED';
ALTER TYPE "CouponAudience" ADD VALUE IF NOT EXISTS 'INACTIVE_CUSTOMERS';
ALTER TYPE "CouponAudience" ADD VALUE IF NOT EXISTS 'SPECIFIC_CUSTOMERS';
