-- Fail closed for new cash entries in the NFC ledger while preserving historical rows.
-- QR table, delivery and other payment ledgers are unaffected.
CREATE OR REPLACE FUNCTION "nfc_reject_new_cash_payment"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."method" = 'DINHEIRO'
    AND (TG_OP = 'INSERT' OR OLD."method" IS DISTINCT FROM NEW."method") THEN
    RAISE EXCEPTION 'NFC cashless payments accept Pix or Point only'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "NfcComandaPayment_reject_new_cash"
BEFORE INSERT OR UPDATE OF "method" ON "NfcComandaPayment"
FOR EACH ROW EXECUTE FUNCTION "nfc_reject_new_cash_payment"();

ALTER TABLE "NfcCashlessPayment"
 ADD CONSTRAINT "NfcCashlessPayment_only_pix_or_point"
 CHECK ("method" IN ('PIX', 'CARTAO'));
