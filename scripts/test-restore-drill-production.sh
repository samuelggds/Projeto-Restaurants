#!/usr/bin/env bash
set -Eeuo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/bin"
export RESTORE_TEST_DIR="$work" RESTORE_TEST_LOG="$work/docker.log"
printf 'synthetic-ciphertext' > "$work/archive.age"
printf 'synthetic-key' > "$work/identity.agekey"
cat > "$work/bin/aws" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$1" == s3api && "$2" == get-object ]] || exit 40
dest="${!#}"
if [[ "${FAULT_EMPTY:-false}" == true ]]; then : > "$dest"; else cp "$RESTORE_TEST_DIR/archive.age" "$dest"; fi
if [[ "${FAULT_CHECKSUM:-false}" == true ]]; then echo '{"ChecksumSHA256":"invalid"}'; else
  checksum=$(openssl dgst -sha256 -binary "$dest" | openssl base64 -A)
  printf '{"ChecksumSHA256":"%s"}\n' "$checksum"
fi
SH
cat > "$work/bin/age" <<'SH'
#!/usr/bin/env bash
[[ "${FAULT_DECRYPT:-false}" != true ]] || exit 41
printf 'synthetic-pg-dump'
SH
cat > "$work/bin/docker" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' "$*" >> "$RESTORE_TEST_LOG"
case "$1" in
  run) [[ "$*" == *'--network none'* ]] || exit 43; printf 'synthetic-container' ;;
  exec) case "$*" in
    *pg_isready*) exit 0 ;;
    *pg_restore*) cat > "$RESTORE_TEST_DIR/dump"; [[ "${FAULT_RESTORE:-false}" != true ]] || exit 44 ;;
    *psql*'-Atc'*) case "$*" in *'_prisma_migrations'*) echo 40 ;; *'information_schema.tables'*) echo 80 ;; *) exit 45 ;; esac ;;
    *psql*'-X '*) cat > "$RESTORE_TEST_DIR/sql"; [[ "${FAULT_SQL:-false}" != true ]] || exit 46 ;;
    *) exit 47 ;;
  esac ;;
  rm) exit 0 ;;
  *) exit 48 ;;
esac
SH
chmod +x "$work/bin/"*
export PATH="$work/bin:$PATH"
export BACKUP_BUCKET=gastronexa-test BACKUP_BUCKET_OWNER=123456789012 BACKUP_KEY=test/2026/synthetic.dump.age BACKUP_AGE_IDENTITY_FILE="$work/identity.agekey"
bash "$root/scripts/restore-drill-production.sh" > "$work/result"
grep -Fq '"verified":true' "$work/result"
grep -Fq '"rpoVerified":false' "$work/result"
grep -Fq '"rtoVerified":false' "$work/result"
grep -Fq 'pg_policies' "$work/sql"
grep -Fq 'SET ROLE restore_drill_probe' "$work/sql"
grep -Fq 'NOBYPASSRLS' "$work/sql"
grep -Fq 'rm -f gastronexa-restore-drill-' "$RESTORE_TEST_LOG"
for mode in FAULT_CHECKSUM FAULT_EMPTY FAULT_DECRYPT FAULT_RESTORE FAULT_SQL; do
  : > "$RESTORE_TEST_LOG"
  if env "$mode=true" bash "$root/scripts/restore-drill-production.sh" > "$work/failure" 2>&1; then
    echo "Unsafe restore accepted: $mode" >&2; exit 1
  fi
  if grep -Fq '"verified":true' "$work/failure"; then echo 'False success report'; exit 1; fi
done
echo 'Restore drill guard checks passed with synthetic commands only.'
