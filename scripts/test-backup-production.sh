#!/usr/bin/env bash
set -Eeuo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -f -- "$work/bin/docker" "$work/bin/aws" "$work/bin/age" "$work/object.age" "$work/state/last-success.json" "$work/state/last-success.json.tmp"; rmdir "$work/bin" "$work/state" "$work"' EXIT
mkdir "$work/bin" "$work/state"
export BACKUP_TEST_WORK="$work"
cat > "$work/bin/docker" <<'SH'
#!/usr/bin/env bash
printf 'synthetic-database-dump'
[[ "${BACKUP_TEST_DUMP_FAIL:-false}" != true ]]
SH
cat > "$work/bin/age" <<'SH'
#!/usr/bin/env bash
cat > "$4"
SH
cat > "$work/bin/aws" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
case "$2" in
  get-public-access-block) printf 'True\tTrue\tTrue\t%s\n' "${BACKUP_TEST_BLOCK:-True}" ;;
  get-bucket-versioning) echo Enabled ;;
  put-object)
    while (( $# )); do if [[ "$1" == --body ]]; then cp "$2" "$BACKUP_TEST_WORK/object.age"; break; fi; shift; done ;;
  head-object)
    if [[ "${BACKUP_TEST_BAD_HASH:-false}" == true ]]; then echo wrong; else openssl dgst -sha256 -binary "$BACKUP_TEST_WORK/object.age" | openssl base64 -A; fi ;;
  *) exit 99 ;;
esac
SH
chmod +x "$work/bin/"*
export PATH="$work/bin:$PATH" APP_DIR="$root" BACKUP_LOCAL_DIR="$work/state"
export BACKUP_BUCKET=gastronexa-test BACKUP_BUCKET_OWNER=123456789012
export BACKUP_KMS_KEY_ARN=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789abc
export BACKUP_AGE_RECIPIENT=age1synthetictestrecipient
bash "$root/scripts/backup-production.sh"
[[ -f "$work/state/last-success.json" && -f "$work/object.age" ]]
rm -- "$work/state/last-success.json" "$work/object.age"
if BACKUP_TEST_DUMP_FAIL=true bash "$root/scripts/backup-production.sh"; then echo 'Partial dump accepted'; exit 1; fi
[[ ! -e "$work/object.age" && ! -e "$work/state/last-success.json" ]]
if BACKUP_TEST_BLOCK=False bash "$root/scripts/backup-production.sh"; then echo 'Public destination accepted'; exit 1; fi
[[ ! -e "$work/object.age" ]]
if BACKUP_TEST_BAD_HASH=true bash "$root/scripts/backup-production.sh"; then echo 'Invalid checksum accepted'; exit 1; fi
[[ ! -e "$work/state/last-success.json" ]]
echo 'Backup control tests passed (synthetic commands; not a real recovery drill).'
