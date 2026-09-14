#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
RELEASE_OVERLAY="${RELEASE_OVERLAY:-docker-compose.release.yml}"
DEPLOY_SHA="${DEPLOY_SHA:-}"
BACKEND_IMAGE="${BACKEND_IMAGE:-}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-}"
RELEASE_STATE="${RELEASE_STATE:-.gastronexa-release.env}"
COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"
export COMPOSE_PARALLEL_LIMIT BACKEND_IMAGE FRONTEND_IMAGE

cd "$APP_DIR"

require_sha() {
  local value="$1"
  local label="$2"
  if [[ ! "$value" =~ ^[0-9a-f]{40}$ ]]; then
    echo "$label invalido: esperado SHA Git completo de 40 caracteres." >&2
    exit 1
  fi
}

require_digest_image() {
  local value="$1"
  local label="$2"
  if [[ ! "$value" =~ ^ghcr\.io/.+@sha256:[0-9a-f]{64}$ ]]; then
    echo "$label deve apontar para um digest GHCR imutavel (@sha256:...)." >&2
    exit 1
  fi
}

require_sha "$DEPLOY_SHA" DEPLOY_SHA
require_digest_image "$BACKEND_IMAGE" BACKEND_IMAGE
require_digest_image "$FRONTEND_IMAGE" FRONTEND_IMAGE

for required_file in "$ENV_FILE" "$COMPOSE_FILE" "$RELEASE_OVERLAY"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Arquivo obrigatorio ausente: $APP_DIR/$required_file" >&2
    exit 1
  fi
done

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -f "$RELEASE_OVERLAY")
phase='preflight'
previous_sha=''
previous_backend=''
previous_frontend=''

if [[ -f "$RELEASE_STATE" ]]; then
  # shellcheck disable=SC1090
  source "$RELEASE_STATE"
  previous_sha="${GASTRONEXA_RELEASE_SHA:-}"
  previous_backend="${GASTRONEXA_BACKEND_IMAGE:-}"
  previous_frontend="${GASTRONEXA_FRONTEND_IMAGE:-}"
fi

rollback_application() {
  if [[ -z "$previous_backend" || -z "$previous_frontend" ]]; then
    echo 'Rollback automatico da aplicacao indisponivel: nao existe release anterior registrada.' >&2
    return 1
  fi
  if [[ ! "$previous_backend" =~ @sha256:[0-9a-f]{64}$ || ! "$previous_frontend" =~ @sha256:[0-9a-f]{64}$ ]]; then
    echo 'Rollback automatico recusado: release anterior nao usa digests imutaveis.' >&2
    return 1
  fi

  echo "Restaurando somente a versao anterior da aplicacao (${previous_sha:-desconhecida}); o banco NAO sera restaurado." >&2
  BACKEND_IMAGE="$previous_backend"
  FRONTEND_IMAGE="$previous_frontend"
  export BACKEND_IMAGE FRONTEND_IMAGE
  "${compose[@]}" pull backend worker frontend
  "${compose[@]}" up -d --no-build --no-deps backend
  "${compose[@]}" up -d --no-build --no-deps worker
  "${compose[@]}" up -d --no-build --no-deps frontend
  "${compose[@]}" up -d --no-build --no-deps --force-recreate gateway
}

print_diagnostics() {
  local exit_code=$?
  trap - ERR
  echo "Deploy falhou na fase '$phase' (exit=$exit_code)." >&2
  "${compose[@]}" ps >&2 || true
  "${compose[@]}" logs --tail=120 backend worker frontend gateway >&2 || true

  if [[ "$phase" == 'application-update' || "$phase" == 'readiness' ]]; then
    rollback_application || true
  else
    echo 'Aplicacao anterior foi preservada; nenhum rollback de banco sera executado automaticamente.' >&2
  fi
  exit "$exit_code"
}
trap print_diagnostics ERR

echo '[1/7] Validando modelo de deploy por digest...'
"${compose[@]}" config --quiet

phase='backup'
echo '[2/7] Criando backup pre-deploy quando o PostgreSQL ja estiver em execucao...'
mkdir -p backups/predeploy
if "${compose[@]}" ps --status running --services | grep -qx 'db'; then
  backup_file="backups/predeploy/postgres-$(date -u +%Y%m%dT%H%M%SZ)-${DEPLOY_SHA:0:12}.sql.gz"
  "${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "$backup_file"
  find backups/predeploy -type f -name 'postgres-*.sql.gz' -mtime +7 -delete
  echo "Backup criado para recuperacao manual: $backup_file"
else
  echo 'Banco ainda nao esta em execucao; backup pre-deploy nao se aplica.'
fi

phase='image-pull'
echo '[3/7] Baixando exatamente os digests aprovados; compilacao no servidor esta proibida...'
"${compose[@]}" pull migrate backend worker frontend

phase='migration'
echo '[4/7] Aplicando migrations antes de alterar processos da aplicacao...'
"${compose[@]}" run --rm --no-deps migrate

phase='application-update'
echo '[5/7] Atualizando aplicacao sem build local...'
"${compose[@]}" up -d --no-build --no-deps backend
"${compose[@]}" up -d --no-build --no-deps worker
"${compose[@]}" up -d --no-build --no-deps frontend
"${compose[@]}" up -d --no-build --no-deps --force-recreate gateway

phase='readiness'
echo '[6/7] Aguardando readiness da nova versao...'
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

test "$backend_ready" = true
test "$frontend_ready" = true
"${compose[@]}" ps --status running --services | grep -qx 'worker'

phase='commit-release'
echo '[7/7] Registrando release imutavel implantada...'
cat > "$RELEASE_STATE.tmp" <<EOF
GASTRONEXA_RELEASE_SHA=$DEPLOY_SHA
GASTRONEXA_BACKEND_IMAGE=$BACKEND_IMAGE
GASTRONEXA_FRONTEND_IMAGE=$FRONTEND_IMAGE
EOF
chmod 600 "$RELEASE_STATE.tmp"
mv "$RELEASE_STATE.tmp" "$RELEASE_STATE"
"${compose[@]}" ps
docker image prune -f >/dev/null 2>&1 || true
trap - ERR

echo "Deploy concluido com sucesso: $DEPLOY_SHA"
