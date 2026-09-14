#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_SHA='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
NEW_BACKEND="ghcr.io/example/gastronexa-backend@sha256:$(printf '1%.0s' {1..64})"
NEW_FRONTEND="ghcr.io/example/gastronexa-frontend@sha256:$(printf '2%.0s' {1..64})"
OLD_BACKEND="ghcr.io/example/gastronexa-backend@sha256:$(printf '3%.0s' {1..64})"
OLD_FRONTEND="ghcr.io/example/gastronexa-frontend@sha256:$(printf '4%.0s' {1..64})"
RECOVERABLE_MIGRATION='20260914130000_add_ai_credit_wallet_and_plan_policy'

make_fixture() {
  local dir="$1"
  mkdir -p "$dir/bin" "$dir/scripts"
  cp "$ROOT/scripts/deploy-production.sh" "$dir/scripts/deploy-production.sh"
  : > "$dir/.env.production"
  : > "$dir/docker-compose.production.yml"
  : > "$dir/docker-compose.release.yml"
  cat > "$dir/.gastronexa-release.env" <<EOF
GASTRONEXA_RELEASE_SHA=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
GASTRONEXA_BACKEND_IMAGE=$OLD_BACKEND
GASTRONEXA_FRONTEND_IMAGE=$OLD_FRONTEND
EOF
  cat > "$dir/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s | backend=%s | frontend=%s\n' "$*" "${BACKEND_IMAGE:-}" "${FRONTEND_IMAGE:-}" >> "$FAKE_DOCKER_LOG"

if [[ "$*" == *'compose'*'run --rm --no-deps migrate sh -c'*'prisma migrate resolve --rolled-back'* ]]; then
  : > "$FAKE_MIGRATION_RECOVERED_FILE"
  exit 0
fi

if [[ "$*" == *'compose'*'run --rm --no-deps migrate'* ]]; then
  if [[ "${FAKE_RECOVERABLE_MIGRATION_FAIL:-false}" == 'true' && ! -f "$FAKE_MIGRATION_RECOVERED_FILE" ]]; then
    printf 'Error: P3009\nThe migration `20260914130000_add_ai_credit_wallet_and_plan_policy` started and failed.\n'
    exit 1
  fi
  if [[ "${FAKE_MIGRATION_FAIL:-false}" == 'true' ]]; then
    printf 'Error: P3018\nMigration failed for an unrelated reason.\n'
    exit 17
  fi
fi

if [[ "$*" == *'compose'*'exec -T backend'* ]] && [[ "${FAKE_READINESS_FAIL:-false}" == 'true' ]]; then
  exit 18
fi
if [[ "$*" == *'compose'*'exec -T frontend'* ]] && [[ "${FAKE_READINESS_FAIL:-false}" == 'true' ]]; then
  exit 19
fi
if [[ "$*" == *'compose'*'ps --status running --services'* ]]; then
  printf 'worker\n'
fi
exit 0
EOF
  chmod +x "$dir/bin/docker"
}

run_case() {
  local mode="$1"
  local dir
  dir="$(mktemp -d)"
  trap 'rm -rf "$dir"' RETURN
  make_fixture "$dir"
  export FAKE_DOCKER_LOG="$dir/docker.log"
  export FAKE_MIGRATION_RECOVERED_FILE="$dir/migration-recovered"
  export PATH="$dir/bin:$PATH"
  export APP_DIR="$dir"
  export DEPLOY_SHA="$TARGET_SHA"
  export BACKEND_IMAGE="$NEW_BACKEND"
  export FRONTEND_IMAGE="$NEW_FRONTEND"
  export READINESS_ATTEMPTS=1
  export READINESS_SLEEP_SECONDS=0
  export FAKE_MIGRATION_FAIL=false
  export FAKE_RECOVERABLE_MIGRATION_FAIL=false
  export FAKE_READINESS_FAIL=false

  case "$mode" in
    migration)
      export FAKE_MIGRATION_FAIL=true
      if bash "$dir/scripts/deploy-production.sh" >"$dir/output.log" 2>&1; then
        echo 'Expected migration failure, but deploy succeeded.' >&2
        exit 1
      fi
      grep -q 'run --rm --no-deps migrate' "$dir/docker.log"
      if grep -q 'prisma migrate resolve --rolled-back' "$dir/docker.log"; then
        echo 'Unrelated migration failure must not be auto-resolved.' >&2
        exit 1
      fi
      if grep -q 'up -d --no-build --no-deps backend' "$dir/docker.log"; then
        echo 'Application was modified after migration failure.' >&2
        exit 1
      fi
      ;;
    recoverable-migration)
      export FAKE_RECOVERABLE_MIGRATION_FAIL=true
      bash "$dir/scripts/deploy-production.sh" >"$dir/output.log" 2>&1
      grep -q "prisma migrate resolve --rolled-back '$RECOVERABLE_MIGRATION'" "$dir/docker.log"
      test -f "$FAKE_MIGRATION_RECOVERED_FILE"
      grep -q 'Deploy concluido com sucesso' "$dir/output.log"
      ;;
    readiness)
      export FAKE_READINESS_FAIL=true
      if bash "$dir/scripts/deploy-production.sh" >"$dir/output.log" 2>&1; then
        echo 'Expected readiness failure, but deploy succeeded.' >&2
        exit 1
      fi
      grep -q "backend=$OLD_BACKEND" "$dir/docker.log"
      grep -q "frontend=$OLD_FRONTEND" "$dir/docker.log"
      grep -q 'Restaurando somente a versao anterior da aplicacao' "$dir/output.log"
      if grep -qi 'restore.*postgres\|pg_restore' "$dir/docker.log"; then
        echo 'Database rollback must never be automatic.' >&2
        exit 1
      fi
      ;;
    *)
      echo "Unknown case: $mode" >&2
      exit 1
      ;;
  esac
}

run_case migration
run_case recoverable-migration
run_case readiness
printf 'Deploy controller failure drills passed.\n'
