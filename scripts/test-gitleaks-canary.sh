#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GITLEAKS_BIN="${GITLEAKS_BIN:-}"
if [[ -z "$GITLEAKS_BIN" ]]; then
  GITLEAKS_BIN="$(find /tmp -maxdepth 3 -type f -name gitleaks -perm -u+x 2>/dev/null | head -n 1 || true)"
fi
if [[ -z "$GITLEAKS_BIN" || ! -x "$GITLEAKS_BIN" ]]; then
  echo 'Gitleaks binary not found after scanner action setup.' >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git -C "$tmp" init -q
git -C "$tmp" config user.name 'GastroNexa CI Canary'
git -C "$tmp" config user.email 'ci-canary@example.test'
# Assemble at runtime so the GastroNexa repository never contains the canary token.
canary="ghp_$(printf 'A%.0s' {1..36})"
printf 'SYNTHETIC_GITHUB_TOKEN=%s\n' "$canary" > "$tmp/canary.env"
git -C "$tmp" add canary.env
git -C "$tmp" commit -q -m 'synthetic secret canary'

set +e
"$GITLEAKS_BIN" detect --source "$tmp" --config "$ROOT/.gitleaks.toml" --redact --exit-code 23 --no-banner >/dev/null 2>&1
status=$?
set -e
if [[ "$status" -ne 23 ]]; then
  echo "Secret scanner canary failed: expected detection exit 23, got $status." >&2
  exit 1
fi

echo 'Gitleaks canary detected the isolated synthetic secret as expected.'
