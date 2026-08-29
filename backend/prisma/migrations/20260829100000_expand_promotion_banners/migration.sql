-- Expand home banners with promotional copy, explicit ordering and audit timestamps.
ALTER TABLE "Banner"
ADD COLUMN "highlight" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "buttonLabel" TEXT DEFAULT 'Ver cardápio',
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Banner"
ADD CONSTRAINT "Banner_title_length_check"
CHECK (char_length(btrim("title")) BETWEEN 1 AND 80),
ADD CONSTRAINT "Banner_highlight_length_check"
CHECK ("highlight" IS NULL OR char_length(btrim("highlight")) BETWEEN 1 AND 50),
ADD CONSTRAINT "Banner_description_length_check"
CHECK ("description" IS NULL OR char_length(btrim("description")) BETWEEN 1 AND 180),
ADD CONSTRAINT "Banner_buttonLabel_length_check"
CHECK ("buttonLabel" IS NULL OR char_length(btrim("buttonLabel")) BETWEEN 1 AND 30),
ADD CONSTRAINT "Banner_position_nonnegative_check"
CHECK ("position" >= 0);

CREATE INDEX "Banner_restaurantId_active_position_id_idx"
ON "Banner"("restaurantId", "active", "position", "id");
