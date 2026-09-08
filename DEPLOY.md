# Deploy de producao

O caminho recomendado e `docker-compose.production.yml`: banco, API e roteamento ficam em redes privadas; o Caddy publica somente HTTP/HTTPS.

> Mudanca de configuracao: infraestrutura/migracao e API/worker agora usam arquivos separados. Nao implante esta versao usando apenas o antigo `.env.production`. Migrations passam a ser uma etapa explicita; nao sao executadas no startup da API.

## 1. Pre-requisitos

- VPS Linux com Docker Engine e Docker Compose atualizados.
- DNS de `APP_DOMAIN` e `API_DOMAIN` apontando para o IP publico.
- Firewall liberando somente `22` (restrito), `80` e `443`; nao publique `3000`, `5000`, `5432` ou `8080`.
- Backups externos e monitoramento configurados.
- Uma role de banco para migrations e outra restrita para runtime, conforme [fundacao RLS](./docs/security/postgresql-rls-foundation.md).

## 2. Configuracao e separacao de segredos

```bash
cp .env.production.example .env.production
cp .env.production.runtime.example .env.production.runtime
chmod 600 .env.production .env.production.runtime
```

Use `.env.production` apenas para interpolacao da infraestrutura/build: dominios, `POSTGRES_*`, `DIRECT_URL`, roteamento e valores publicos `VITE_*`. Esse arquivo **nao e injetado integralmente em nenhum processo da aplicacao**.

Use `.env.production.runtime` para a API e o worker: `DATABASE_URL` da role restrita, JWT, criptografia, SMTP, gateways e outras opcoes da aplicacao. Nunca coloque `DIRECT_URL`, `POSTGRES_PASSWORD` ou `POSTGRES_PASSWORD_FILE` nele. A inicializacao em producao rejeita essas variaveis sem imprimir seus valores.

A role runtime deve ser `NOSUPERUSER`, `NOBYPASSRLS` e nao possuir as tabelas. O controle de role existente continua obrigatorio; separar arquivos nao substitui privilegios corretos no PostgreSQL.

Para migrar uma instalacao existente, mova os valores reais das variaveis da aplicacao para o arquivo de runtime, mantendo as mesmas chaves JWT/criptografia e credenciais de gateway. Nao regenere segredos indiscriminadamente: isso pode invalidar sessoes ou tornar credenciais criptografadas ilegiveis. Mantenha as variaveis de infraestrutura somente no arquivo de infraestrutura.

`PRODUCTION_RUNTIME_ENV_FILE` permite selecionar outro arquivo de runtime. O antigo `PRODUCTION_ENV_FILE` deixou de ser utilizado neste Compose. Nao aponte o novo caminho para o arquivo de infraestrutura.

Escolha uma opcao de roteamento em `.env.production`:

- `ROUTING_PROVIDER=osrm` (padrao): prepare os dados conforme [ROUTING_PRODUCTION.md](./ROUTING_PRODUCTION.md) e habilite `--profile selfhost-routing` ao subir os servicos.
- `ROUTING_PROVIDER=geoapify`: preencha `GEOAPIFY_API_KEY` em `.env.production.runtime`. Nao e necessario habilitar o perfil de roteamento proprio.

Substitua todos os placeholders. Configure apenas os provedores utilizados. Para a criacao inicial do SUPER_ADMIN, preencha uma fonte de senha temporaria no runtime; remova-a depois da criacao confirmada. O worker recebe os campos de bootstrap vazios. `SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE` exige montar explicitamente o secret apenas na API; definir um caminho nao monta o arquivo automaticamente.

Valide sem imprimir as credenciais resolvidas no terminal ou em logs:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

## 3. Banco, migrations e primeira publicacao

Antes de executar, confirme que `DIRECT_URL` (infraestrutura) e `DATABASE_URL` (runtime) apontam para **o mesmo banco**, mas usam roles diferentes. A API nao recebe a conexao de owner.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d db
docker compose --env-file .env.production -f docker-compose.production.yml \
  --profile maintenance run --rm --build migrate
```

O servico `migrate` mapeia `DIRECT_URL` para `DATABASE_URL`, que e a variavel efetivamente usada pelo schema Prisma. Ele recebe apenas essa conexao e `NODE_ENV`; nao recebe JWT, SMTP ou credenciais de gateways. O perfil `maintenance` nao deve ser incluido no comando normal de subida da aplicacao.

**Pare se a migration falhar.** Antes de iniciar API/worker, provisione a role runtime e os grants de tabelas/sequences; configure tambem os default privileges da role que cria tabelas. Consulte o documento RLS. Novas tabelas sem grants podem impedir consultas mesmo quando as migrations passam.

Com OSRM/Nominatim preparados:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  --profile selfhost-routing up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Com Geoapify configurado:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

O Compose de producao sobrescreve o CMD legado da imagem: o backend apenas executa o bootstrap protegido do SUPER_ADMIN e inicia a API. Nenhum seed e executado. Nao execute `db:seed` em producao.

## 4. HTTPS, Socket.IO e GPS

O Caddy usa [deploy/Caddyfile](./deploy/Caddyfile), obtem certificados para os dois dominios e encaminha WebSocket/long polling. O rastreamento exige HTTPS em aparelhos reais.

Se optar por Nginx em vez de Caddy, preserve uma rota dedicada para Socket.IO:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl http2;
    server_name api.seudominio.com;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 75s;
        proxy_send_timeout 75s;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 75s;
        proxy_send_timeout 75s;
    }
}
```

Os valores `VITE_*` sao incorporados ao build; reconstrua o frontend ao altera-los. Eles sao publicos e nunca devem conter segredos de backend.

## 5. Escala

Use uma replica do backend enquanto o Socket.IO utilizar o adapter em memoria. Duas ou mais instancias exigem adaptador compartilhado e revisao do balanceamento das conexoes; o mesmo cuidado vale para eventos de jobs.

## 6. Atualizacao segura

1. Faca backup verificado e guarde a imagem e a configuracao anteriormente implantadas.
2. Execute lint, typecheck, testes e build; valide o novo gate `Production deploy isolation`.
3. Valide `docker compose config --quiet` com os dois arquivos reais protegidos.
4. Construa a nova imagem e execute o servico `migrate` com `run --rm --build`; confirme o sucesso e os grants antes de prosseguir.
5. Suba a aplicacao e valide `/health`, `/ready`, login/MFA, pedido e Socket.IO. Mudancas de rastreamento exigem smoke test em celular real.
6. Se falhar, pare o rollout e restaure imagem/configuracao anteriores. Nao remova volumes. Migrations destrutivas exigem um plano proprio de rollback de dados.

```bash
SMOKE_BASE_URL=https://seu-dominio.example npm run smoke
```

O comando possui timeout e exige JSON com HTTP 2xx nas sondas. Consulte [TESTING.md](./TESTING.md) para as jornadas criticas.

## 7. Observabilidade e backups

Configure Sentry, alertas e retencao; monitore `/ready`, 5xx, 429, latencia, conexoes e roteamento. Automatize backups externos e teste a restauracao. Proteja **ambos** os arquivos de ambiente e nao registre a saida completa de `docker compose config`, pois ela contem segredos. Rotacione segredos expostos e revise `DELIVERY_LOCATION_RETENTION_DAYS`.

## 8. Pagamentos e OAuth

Use credenciais de producao e webhooks HTTPS. Mantenha `ALLOW_INSECURE_STRIPE_WEBHOOK=false`, `ALLOW_GLOBAL_PAYMENT_FALLBACK=false` e `ENABLE_TEST_PAYMENT_WEBHOOK=false`. Autorize o dominio do frontend no Google OAuth. Faca um pagamento controlado de cada provedor e confirme a idempotencia antes de abrir ao publico.

## 9. Render ou outro PaaS

Separe a etapa de release/migracao do processo web:

- build backend: `npm ci && npm run build && npx prisma generate`;
- job de migracao isolado: `npm run db:migrate:deploy`, com a conexao de owner fornecida como `DATABASE_URL` **somente nesse job**;
- runtime: variaveis de `.env.production.runtime.example`, bootstrap inicial controlado e `npm run start`; sem `DIRECT_URL` nem senhas de owner;
- frontend: `npm ci && npm run build`, publicacao de `dist`;
- healthcheck `/ready`, HTTPS, proxy WebSocket e uma unica replica de API nesta fase.

No PaaS, configure explicitamente os dominios e variaveis de roteamento, pois nao existe a interpolacao do Compose. Nao use servidores publicos de demonstracao OSRM/Nominatim em producao. Caso a plataforma compartilhe obrigatoriamente os segredos de migracao com o runtime, use um job externo com permissao minima em vez de enfraquecer a verificacao.

## 10. Checklist de abertura

- [ ] Dois arquivos de ambiente separados, protegidos e fora do Git.
- [ ] Migrations aprovadas e runtime sem credenciais administrativas.
- [ ] Role runtime/grants/RLS verificados.
- [ ] DNS, certificados e somente 80/443 publicos para a aplicacao.
- [ ] Sondas, backups e restauracao verificados.
- [ ] Provedor de roteamento escolhido, saudavel e com cobertura; tiles apropriados.
- [ ] CORS, login/MFA e permissoes entre restaurantes validados.
- [ ] Mesa/QR, cozinha, garcom, promocao, pagamento e rastreamento real validados.
- [ ] Alertas funcionando e uma replica de API confirmada.
