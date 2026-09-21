#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Run only on an isolated recovery host, never connected to production networks.
: "${BACKUP_BUCKET:?Configure the private S3 bucket}"
: "${BACKUP_BUCKET_OWNER:?Configure the AWS account ID}"
: "${BACKUP_OBJECT_KEY:?Select an encrypted backup object}"
: "${BACKUP_AGE_IDENTITY_FILE:?Configure the offline recovery private key file}"
[[ "$BACKUP_BUCKET_OWNER" =~ ^[0-9]{12}$ ]] || exit 2
[[ "$BACKUP_OBJECT_KEY" =~ ^[a-zA-Z0-9/_.-]+\.dump\.age$ ]] || exit 2
[[ -f "$BACKUP_AGE_IDENTITY_FILE" ]] || exit 2
for tool in docker aws age openssl mktemp; do command -v "$tool" >/dev/null; done
export AWS_PAGER=''
directory=$(mktemp -d)
container=''
cleanup() {
  if [[ "$container" =~ ^[a-f0-9]{64}$ ]]; then docker rm -f "$container" >/dev/null; fi
  rm -f -- "$directory/backup.age"
  rmdir -- "$directory"
}
trap cleanup EXIT
aws s3api get-object --bucket "$BACKUP_BUCKET" --expected-bucket-owner "$BACKUP_BUCKET_OWNER" \
  --key "$BACKUP_OBJECT_KEY" --checksum-mode ENABLED "$directory/backup.age" >/dev/null
remote_checksum=$(aws s3api head-object --bucket "$BACKUP_BUCKET" --expected-bucket-owner "$BACKUP_BUCKET_OWNER" \
  --key "$BACKUP_OBJECT_KEY" --checksum-mode ENABLED --query ChecksumSHA256 --output text)
checksum=$(openssl dgst -sha256 -binary "$directory/backup.age" | openssl base64 -A)
[[ "$checksum" == "$remote_checksum" ]] || { echo 'Backup checksum mismatch.' >&2; exit 1; }

# No published ports or network; this script accepts no target database URL.
container=$(docker run -d --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --pids-limit 128 --memory 2g --user postgres \
  --tmpfs /tmp:rw,nosuid,nodev,size=4g,mode=1777 --tmpfs /var/run/postgresql:rw,nosuid,nodev,mode=1777 \
  -e PGDATA=/tmp/data -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=gastronexa_restore_test postgres:16-alpine)
[[ "$container" =~ ^[a-f0-9]{64}$ ]] || exit 1
ready=false
for ((attempt=0; attempt<90; attempt++)); do
  if docker logs "$container" 2>&1 | grep -Fq "PostgreSQL init process complete; ready for start up."; then
    if docker exec "$container" pg_isready -U postgres -d gastronexa_restore_test >/dev/null 2>&1; then
      sleep 2
      if docker exec "$container" pg_isready -U postgres -d gastronexa_restore_test >/dev/null 2>&1; then
        ready=true
        break
      fi
    fi
  fi
  sleep 1
done
[[ "$ready" == true ]] || { echo 'Recovery database did not start.' >&2; exit 1; }
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$directory/backup.age" \
  | docker exec -i "$container" pg_restore --exit-on-error --no-owner --no-acl -U postgres -d gastronexa_restore_test
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d gastronexa_restore_test <<'SQL'
DO $$
BEGIN
  IF to_regclass('public."Restaurant"') IS NULL OR to_regclass('public."Order"') IS NULL OR to_regclass('public."User"') IS NULL THEN
    RAISE EXCEPTION 'Required application tables missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND NOT convalidated) THEN
    RAISE EXCEPTION 'Unvalidated foreign keys';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('AiCreditWallet','AiCreditLedgerEntry','AiCreditReservation','OrderIssueThread')
    AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)) THEN
    RAISE EXCEPTION 'Required row level security not preserved';
  END IF;
END $$;
CREATE ROLE recovery_probe NOSUPERUSER NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO recovery_probe;
GRANT SELECT ON "AiCreditWallet", "AiCreditLedgerEntry", "AiCreditReservation", "OrderIssueThread" TO recovery_probe;
SET ROLE recovery_probe;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "AiCreditWallet") OR EXISTS (SELECT 1 FROM "AiCreditLedgerEntry") OR EXISTS (SELECT 1 FROM "AiCreditReservation") OR EXISTS (SELECT 1 FROM "OrderIssueThread") THEN
    RAISE EXCEPTION 'Restored RLS exposed data without tenant context';
  END IF;
END $$;
SQL
echo 'Restore drill passed: archive restored, constraints and tenant isolation verified.'
