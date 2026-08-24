# Deploy de produção

O caminho recomendado é `docker-compose.production.yml`: PostgreSQL, backend, frontend, OSRM e Nominatim ficam em redes privadas, e o Caddy publica somente HTTP/HTTPS com certificado automático.

## 1. Pré-requisitos

- VPS Linux com Docker Engine e Docker Compose atualizados.
- DNS de `APP_DOMAIN` e `API_DOMAIN` apontando para o IP público.
- Firewall liberando somente `22` (restrito), `80` e `443`; não publique `3000`, `5000`, `5432` ou `8080`.
- Backups externos e monitoramento configurados.
- Dados de rota preparados conforme [ROUTING_PRODUCTION.md](./ROUTING_PRODUCTION.md).

## 2. Configuração

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Substitua todos os placeholders, habilite somente os provedores de pagamento utilizados e configure URLs públicas HTTPS. A inicialização é bloqueada quando faltam banco, origens, serviços privados de rota ou segredos seguros.

Valide o arquivo final:

```bash
PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production -f docker-compose.production.yml config
```

## 3. Banco e primeira publicação

Antes da primeira publicação, confirme que `DATABASE_URL` e `DIRECT_URL` apontam para o banco correto. O container do backend executa `prisma migrate deploy` antes de iniciar; ele nunca executa seed automaticamente.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Não execute `db:seed` em produção. A rotina também exige `ALLOW_PROD_SEED=true` para reduzir acidentes.

## 4. HTTPS, Socket.IO e GPS

O Caddy usa [deploy/Caddyfile](./deploy/Caddyfile), obtém certificados para os dois domínios e encaminha WebSocket/long polling para o backend. O rastreamento do motoqueiro exige HTTPS em aparelhos reais.

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
    }
}
```

`VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_SOCKET_PATH`, `VITE_QR_BASE_URL` e o provedor de tiles são incorporados ao build. Reconstrua o frontend ao alterar qualquer variável `VITE_*`.

## 5. Escala

Use uma réplica do backend enquanto o Socket.IO utilizar o adapter em memória. Escalar para duas ou mais instâncias sem Redis/sticky sessions pode separar motoqueiro e cliente em processos diferentes. O mesmo cuidado vale para os jobs agendados. A limitação está registrada no runbook de rotas.

## 6. Atualização segura

1. Faça backup verificado do PostgreSQL e guarde a imagem atualmente implantada.
2. Execute lint, typecheck, testes proporcionais ao risco e build.
3. Valide `docker compose config` e construa as novas imagens.
4. Execute `prisma migrate deploy` pelo container novo.
5. Suba a aplicação e valide `/health`, `/ready`, login, pedido e Socket.IO.
6. Em mudança de rastreamento, faça o smoke test com um celular real.
7. Se falhar, restaure a imagem anterior; migrations destrutivas exigem plano próprio de rollback de dados.

Use a política de baixo custo de manutenção descrita em [TESTING.md](./TESTING.md). O E2E obrigatório fica restrito às jornadas críticas.

## 7. Observabilidade e backups

- Configure `SENTRY_DSN`, alertas e retenção de logs.
- Monitore `/ready`, 5xx, 429, latência, conexões Socket.IO e serviços de rota.
- Automatize backup do PostgreSQL fora do servidor e teste a restauração.
- Proteja `.env.production` e nunca o envie ao Git.
- Rotacione imediatamente qualquer segredo exposto.
- Revise a retenção de GPS em `DELIVERY_LOCATION_RETENTION_DAYS`.

## 8. Pagamentos e OAuth

- Use credenciais de produção e URLs de webhook em `https://API_DOMAIN/...`.
- Mantenha `ALLOW_INSECURE_STRIPE_WEBHOOK=false`, `ALLOW_GLOBAL_PAYMENT_FALLBACK=false` e `ENABLE_TEST_PAYMENT_WEBHOOK=false`.
- Autorize `https://APP_DOMAIN` no Google OAuth.
- Faça um pagamento controlado de cada provedor habilitado e confirme idempotência do webhook antes de abrir ao público.

## 9. Render ou outro PaaS

Frontend e backend podem ser publicados separadamente, mas o rastreamento continua exigindo OSRM e Nominatim privados alcançáveis pelo backend. Configure:

- backend: `npm ci && npm run build && npx prisma generate`; início `npx prisma migrate deploy && npm run start`;
- frontend: `npm ci && npm run build`; publicação de `dist`;
- todas as variáveis obrigatórias de `.env.production.example`;
- healthcheck do backend em `/ready`;
- uma única instância do backend até existir adapter Redis;
- proxy com suporte a WebSocket e HTTPS.

Não use os servidores públicos de demonstração do OSRM/Nominatim como dependência de produção.

## 10. Checklist de abertura

- [ ] DNS e certificados válidos.
- [ ] Somente 80/443 públicos.
- [ ] `/health` e `/ready` respondendo 200.
- [ ] Backups e restauração testados.
- [ ] OSRM e Nominatim saudáveis para toda a área dos tenants.
- [ ] Tiles com capacidade/SLA e atribuição correta.
- [ ] CORS restrito ao domínio do frontend.
- [ ] Login, MFA administrativo e permissões por restaurante validados.
- [ ] Mesa/QR, produto montável, cozinha, garçom, promoção e pagamento validados.
- [ ] Rastreamento real validado do aparelho do motoqueiro até o cliente.
- [ ] Alertas, logs e Sentry recebendo eventos.
- [ ] Uma réplica do backend confirmada.
