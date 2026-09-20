#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Run on the database host. Only the public age recipient is present here.
: "${BACKUP_BUCKET:?Configure the private S3 bucket}"
: "${BACKUP_BUCKET_OWNER:?Configure the AWS account ID}"
: "${BACKUP_KMS_KEY_ARN:?Configure the S3 KMS key ARN}"
: "${BACKUP_AGE_RECIPIENT:?Configure the offline recovery public key}"
[[ "$BACKUP_BUCKET" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ && "$BACKUP_BUCKET_OWNER" =~ ^[0-9]{12}$ ]] || exit 2
[[ "$BACKUP_KMS_KEY_ARN" =~ ^arn:aws:kms:[a-z0-9-]+:[0-9]{12}:key/[a-f0-9-]+$ ]] || exit 2
[[ "$BACKUP_AGE_RECIPIENT" =~ ^age1[a-z0-9]+$ ]] || exit 2
prefix="${BACKUP_PREFIX:-gastronexa/database}"
[[ "$prefix" =~ ^[a-zA-Z0-9/_-]+$ && "$prefix" != /* ]] || exit 2
for tool in docker aws age openssl stat mktemp; do command -v "$tool" >/dev/null; done
export AWS_PAGER=''
cd "${APP_DIR:-/opt/gastronexa}"
compose=(docker compose --env-file "${ENV_FILE:-.env.production}" -f "${COMPOSE_FILE:-docker-compose.production.yml}")
local_dir="${BACKUP_LOCAL_DIR:-/var/lib/gastronexa-backups}"
mkdir -p "$local_dir"
chmod 700 "$local_dir"
encrypted=$(mktemp "$local_dir/backup.XXXXXXXX.age")
cleanup() { rm -f -- "$encrypted"; }
trap cleanup EXIT

# A misconfigured destination must stop the backup, never make it public.
block=$(aws s3api get-public-access-block --bucket "$BACKUP_BUCKET" --expected-bucket-owner "$BACKUP_BUCKET_OWNER" \
  --query 'PublicAccessBlockConfiguration.[BlockPublicAcls,IgnorePublicAcls,BlockPublicPolicy,RestrictPublicBuckets]' --output text)
[[ "${block//[[:space:]]/}" == 'TrueTrueTrueTrue' ]] || { echo 'S3 public access must be fully blocked.' >&2; exit 1; }
[[ $(aws s3api get-bucket-versioning --bucket "$BACKUP_BUCKET" --expected-bucket-owner "$BACKUP_BUCKET_OWNER" --query Status --output text) == Enabled ]] || { echo 'S3 versioning is required.' >&2; exit 1; }

# Pipefail prevents uploading a partial dump. No plaintext dump is written to disk.
"${compose[@]}" exec -T db sh -c 'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$encrypted"
[[ -s "$encrypted" ]] || exit 1
key="$prefix/$(date -u +%Y/%m/%d)/$(date -u +%Y%m%dT%H%M%SZ)-$(openssl rand -hex 8).dump.age"
checksum=$(openssl dgst -sha256 -binary "$encrypted" | openssl base64 -A)
size=$(stat -c %s "$encrypted")
aws s3api put-object --bucket "$BACKUP_BUCKET" --expected-bucket-owner "$BACKUP_BUCKET_OWNER" \
  --key "$key" --body "$encrypted" --server-side-encryption aws:kms --ssekms-key-id "$BACKUP_KMS_KEY_ARN" \
  --checksum-algorithm SHA256 --checksum-sha256 "$checksum" --if-none-match '*' --output json >/dev/null
remote_checksum=$(aws s3api head-object --bucket "$BACKUP_BUCKET" --expected-bucket-owner "$BACKUP_BUCKET_OWNER" \
  --key "$key" --checksum-mode ENABLED --query ChecksumSHA256 --output text)
[[ "$checksum" == "$remote_checksum" ]] || { echo 'Uploaded checksum does not match.' >&2; exit 1; }
printf '{"completedAt":"%s","key":"%s","encryptedBytes":%s,"verifiedUpload":true}\n' \
  "$(date -u +%FT%TZ)" "$key" "$size" > "$local_dir/last-success.json.tmp"
mv -- "$local_dir/last-success.json.tmp" "$local_dir/last-success.json"
echo 'Encrypted offsite backup uploaded and checksum verified.'
