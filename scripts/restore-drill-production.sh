#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${BACKUP_BUCKET:?Configure the private S3 bucket}"
: "${BACKUP_BUCKET_OWNER:?Configure the AWS account ID}"
: "${BACKUP_KEY:?Configure the encrypted S3 backup object key}"
: "${BACKUP_AGE_IDENTITY_FILE:?Configure the offline age identity file path}"

[[ "$BACKUP_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] || exit 2
[[ "$BACKUP_BUCKET_OWNER" =~ ^[0-9]{12}$ ]] || exit 2
[[ "$BACKUP_KEY" =~ ^[a-zA-Z0-9/_.-]+\.dump\.age$ && "$BACKUP_KEY" != /* ]] || exit 2
[[ -f "$BACKUP_AGE_IDENTITY_FILE" ]] || {
  echo 'age identity file not found.' >&2
  exit 2
}

for tool in aws age docker openssl mktemp; do
  command -v "$tool" >/dev/null
done

export AWS_PAGER=''
workdir=$(mktemp -d)
encrypted="$workdir/backup.dump.age"
container="gastronexa-restore-drill-$(openssl rand -hex 6)"
password="$(openssl rand -base64 36 | tr -d '\n')"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf -- "$workdir"
}
trap cleanup EXIT INT TERM

echo "Downloading encrypted backup: s3://$BACKUP_BUCKET/$BACKUP_KEY"
metadata=$(aws s3api get-object \
  --bucket "$BACKUP_BUCKET" \
  --expected-bucket-owner "$BACKUP_BUCKET_OWNER" \
  --key "$BACKUP_KEY" \
  --checksum-mode ENABLED \
  "$encrypted")

[[ -s "$encrypted" ]] || {
  echo 'Downloaded backup is empty.' >&2
  exit 1
}

remote_checksum=$(printf '%s' "$metadata" | awk -F'"' '/ChecksumSHA256/ {print $4; exit}')
[[ -n "$remote_checksum" ]] || {
  echo 'S3 object does not expose a SHA256 checksum.' >&2
  exit 1
}
local_checksum=$(openssl dgst -sha256 -binary "$encrypted" | openssl base64 -A)
[[ "$local_checksum" == "$remote_checksum" ]] || {
  echo 'Downloaded checksum does not match S3 metadata.' >&2
  exit 1
}

echo 'Starting isolated PostgreSQL restore target...'
docker run -d --rm \
  --name "$container" \
  --network none \
  --tmpfs /var/lib/postgresql/data:rw,nosuid,nodev,noexec,size=2g \
  -e POSTGRES_PASSWORD="$password" \
  -e POSTGRES_DB=restorecheck \
  postgres:16-alpine >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$container" pg_isready -U postgres -d restorecheck >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$container" pg_isready -U postgres -d restorecheck >/dev/null 2>&1 || {
  echo 'Temporary PostgreSQL did not become ready.' >&2
  exit 1
}

echo 'Decrypting and restoring backup in streaming mode...'
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$encrypted" \
  | docker exec -i "$container" pg_restore \
      --username=postgres \
      --dbname=restorecheck \
      --no-owner \
      --no-acl \
      --exit-on-error

echo 'Validating restored database...'
migration_count=$(docker exec "$container" psql -U postgres -d restorecheck -Atc \
  'SELECT COUNT(*) FROM "_prisma_migrations";')
table_count=$(docker exec "$container" psql -U postgres -d restorecheck -Atc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

[[ "$migration_count" =~ ^[1-9][0-9]*$ ]] || {
  echo 'Restore completed without migration history.' >&2
  exit 1
}
[[ "$table_count" =~ ^[1-9][0-9]*$ ]] || {
  echo 'Restore completed without public tables.' >&2
  exit 1
}

printf '{"verified":true,"backupKey":"%s","migrations":%s,"publicTables":%s,"verifiedAt":"%s"}\n' \
  "$BACKUP_KEY" "$migration_count" "$table_count" "$(date -u +%FT%TZ)"

echo 'Restore drill completed successfully. Production database was not touched.'
