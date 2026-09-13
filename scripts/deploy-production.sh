#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
DEPLOY_SHA="${DEPLOY_SHA:-}"
COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"
export COMPOSE_PARALLEL_LIMIT

cd "$APP_DIR"

if [[ -z "$DEPLOY_SHA" ]]; then
  echo "DEPLOY_SHA e obrigatorio." >&2
  exit 1
fi

if [[ ! "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "DEPLOY_SHA invalido: esperado SHA Git completo de 40 caracteres." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo de ambiente ausente: $APP_DIR/$ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose de producao ausente: $APP_DIR/$COMPOSE_FILE" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Deploy recusado: existem alteracoes versionadas locais no servidor." >&2
  git status --short >&2
  exit 1
fi

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

print_diagnostics() {
  local exit_code=$?
  echo "Deploy falhou (exit=$exit_code). Estado dos servicos:" >&2
  "${compose[@]}" ps >&2 || true
  echo "Ultimos logs de backend/worker/frontend/gateway:" >&2
  "${compose[@]}" logs --tail=120 backend worker frontend gateway >&2 || true
  exit "$exit_code"
}
trap print_diagnostics ERR

echo "[1/8] Atualizando referencias Git..."
git fetch origin main --prune

git cat-file -e "${DEPLOY_SHA}^{commit}"
if ! git merge-base --is-ancestor "$DEPLOY_SHA" origin/main; then
  echo "Deploy recusado: o SHA aprovado nao pertence ao historico atual da main." >&2
  exit 1
fi

echo "[2/8] Posicionando checkout no SHA aprovado: $DEPLOY_SHA"
git checkout main
git reset --hard "$DEPLOY_SHA"

echo "[3/8] Validando configuracao Docker Compose..."
"${compose[@]}" config --quiet

echo "[4/8] Criando backup local pre-deploy do PostgreSQL quando disponivel..."
mkdir -p backups/predeploy
if "${compose[@]}" ps --status running --services | grep -qx 'db'; then
  backup_file="backups/predeploy/postgres-$(date -u +%Y%m%dT%H%M%SZ)-${DEPLOY_SHA:0:12}.sql.gz"
  "${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$backup_file"
  find backups/predeploy -type f -name 'postgres-*.sql.gz' -mtime +7 -delete
  echo "Backup criado: $backup_file"
else
  echo "Banco ainda nao esta em execucao; backup pre-deploy ignorado."
fi

echo "[5/8] Construindo imagens de producao com paralelismo limitado..."
"${compose[@]}" build --pull migrate bootstrap backend worker frontend

echo "[6/8] Aplicando migrations e provisionamento da role runtime..."
"${compose[@]}" run --rm migrate

echo "[7/8] Atualizando aplicacao..."
"${compose[@]}" up -d --no-deps backend
"${compose[@]}" up -d --no-deps worker
"${compose[@]}" up -d --no-deps frontend
"${compose[@]}" up -d --no-deps --force-recreate gateway

echo "[8/8] Aguardando healthchecks..."
backend_ready=false
frontend_ready=false
for _ in $(seq 1 40); do
  if "${compose[@]}" exec -T backend node -e "fetch('http://127.0.0.1:3000/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    backend_ready=true
  else
    backend_ready=false
  fi

  if "${compose[@]}" exec -T frontend sh -c 'wget -qO- http://127.0.0.1/healthz >/dev/null' >/dev/null 2>&1; then
    frontend_ready=true
  else
    frontend_ready=false
  fi

  if [[ "$backend_ready" == true && "$frontend_ready" == true ]]; then
    break
  fi
  sleep 3
done

if [[ "$backend_ready" != true || "$frontend_ready" != true ]]; then
  echo "Healthcheck pos-deploy falhou." >&2
  exit 1
fi

if ! "${compose[@]}" ps --status running --services | grep -qx 'worker'; then
  echo "Worker nao esta em execucao apos o deploy." >&2
  exit 1
fi

"${compose[@]}" ps
docker image prune -f >/dev/null 2>&1 || true

echo "Deploy concluido com sucesso: $DEPLOY_SHA"
