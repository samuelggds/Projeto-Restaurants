-- Existing tables remain unconfigured until their restaurant admin sets capacity.
-- Never fabricate seat counts for existing tenant records.
ALTER TABLE "Table" ADD COLUMN "seatCapacity" INTEGER;
ALTER TABLE "Table" ADD CONSTRAINT "Table_seatCapacity_range_check"
  CHECK ("seatCapacity" BETWEEN 1 AND 50);
