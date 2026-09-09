-- Supports the normalized recovery lookup without scanning every restaurant's users.
-- Phone is an identifier; ambiguous matches require the unique account email.
CREATE INDEX "User_normalized_phone_lookup_idx" ON "User"
  ((regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g')));
