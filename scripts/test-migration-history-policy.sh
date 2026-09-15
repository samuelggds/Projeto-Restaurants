#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECK="$ROOT/scripts/checkMigrationCompatibility.mjs"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

setup_repo() {
  rm -rf "$tmp/repo"
  mkdir -p "$tmp/repo/backend/prisma/migrations/20260101000000_initial"
  git -C "$tmp/repo" init -q
  git -C "$tmp/repo" config user.name 'Migration Policy Test'
  git -C "$tmp/repo" config user.email 'migration-policy@example.test'
  printf 'CREATE TABLE "Example" ("id" INTEGER PRIMARY KEY);\n' > "$tmp/repo/backend/prisma/migrations/20260101000000_initial/migration.sql"
  git -C "$tmp/repo" add .
  git -C "$tmp/repo" commit -qm base
  BASE="$(git -C "$tmp/repo" rev-parse HEAD)"
}

expect_rejected() {
  local label="$1"
  git -C "$tmp/repo" add -A
  git -C "$tmp/repo" commit -qm "$label"
  local head
  head="$(git -C "$tmp/repo" rev-parse HEAD)"
  if (cd "$tmp/repo" && node "$CHECK" "$BASE" "$head" >/dev/null 2>&1); then
    echo "Expected migration policy rejection: $label" >&2
    exit 1
  fi
}

setup_repo
printf '\nALTER TABLE "Example" ADD COLUMN "name" TEXT;\n' >> "$tmp/repo/backend/prisma/migrations/20260101000000_initial/migration.sql"
expect_rejected modification

setup_repo
rm "$tmp/repo/backend/prisma/migrations/20260101000000_initial/migration.sql"
expect_rejected deletion

setup_repo
mv "$tmp/repo/backend/prisma/migrations/20260101000000_initial" "$tmp/repo/backend/prisma/migrations/20260101000000_renamed"
expect_rejected rename

setup_repo
mkdir -p "$tmp/repo/backend/prisma/migrations/20260102000000_add_name"
printf 'ALTER TABLE "Example" ADD COLUMN "name" TEXT;\n' > "$tmp/repo/backend/prisma/migrations/20260102000000_add_name/migration.sql"
git -C "$tmp/repo" add .
git -C "$tmp/repo" commit -qm valid-addition
HEAD_SHA="$(git -C "$tmp/repo" rev-parse HEAD)"
(cd "$tmp/repo" && node "$CHECK" "$BASE" "$HEAD_SHA")

setup_repo
mkdir -p "$tmp/repo/backend/prisma/migrations/20260102000000_drop_example"
printf 'DROP TABLE "Example";\n' > "$tmp/repo/backend/prisma/migrations/20260102000000_drop_example/migration.sql"
expect_rejected destructive-addition

echo 'Migration history policy drills passed.'
