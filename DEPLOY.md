# Deploy de produção

O caminho recomendado é `docker-compose.production.yml`: PostgreSQL, API e frontend em redes privadas; o Caddy publica HTTP/HTTPS. O roteamento padrão usa Geoapify. OSRM/Nominatim próprios são uma alternativa explícita.

## 1. Pré-requisitos

- VPS Linux com Docker Engine e Docker Compose atualizados.
- DNS de `APP_DOMAIN` e `API_DOMAIN` apontando para o IP público.
- Firewall liberando somente `22` (restrito), `80` e `443`; não publique `3000`, `5000`, `5432` ou `8080`.
- Backups externos e monitoramento configurados.
- Geoapify configurado ou dados próprios preparados conforme [ROUTING_PRODUCTION.md](./ROUTING_PRODUCTION.md).

## 2. Configuração

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Substitua todos os placeholders, habilite somente os provedores de pagamento utilizados e configure URLs públicas HTTPS. A inicialização é bloqueada quando faltam banco, origens, serviços privados de rota ou segredos seguros.

Para Geoapify, mantenha `ROUTING_PROVIDER=geoapify` e preencha `GEOAPIFY_API_KEY`.
Para infraestrutura própria, configure `ROUTING_PROVIDER=osrm` e `COMPOSE_PROFILES=selfhost-routing` no arquivo de ambiente e prepare os dados antes da subida. O profile ativa OSRM/Nominatim; definir somente as URLs não inicia esses serviços.

O Compose injeta uma lista explícita de variáveis em cada processo. `DIRECT_URL` e a senha owner chegam apenas a `migrate`/PostgreSQL; API e worker recebem `DATABASE_URL` restrita. Adicione novas opções à lista do Compose ao introduzi-las na aplicação.

Valide o arquivo final:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

## 3. Banco e primeira publicação

Antes da primeira publicação, confirme que `DATABASE_URL` e `DIRECT_URL` apontam para o mesmo servidor/banco direto, com usuários distintos e senhas de pelo menos 20 caracteres. O job `migrate` aplica migrations com owner e provisiona a role runtime sem privilégios administrativos; depois `bootstrap` cria/confere o administrador inicial usando runtime. API e worker iniciam somente após sucesso. Não há seed automático.

Roles runtime já existentes com ownership, superuser, BYPASSRLS ou membership são recusadas: revise-as explicitamente antes do deploy. Em banco gerenciado/pooler, faça o provisionamento na camada de infraestrutura usando a conexão direta; não use este provisionador para URLs que apontem para hosts distintos.

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

O seed de demonstração recusa produção e staging, sem variável de liberação.
Em development/test, exige `OPS_DATABASE_ENV` coerente e confirmação
`SEED_CONFIRM_DATABASE=RESET_DEMO_<identityHash>` vinculada ao banco descartável.
Consulte o procedimento em [README.md](./README.md). O deploy nunca executa seed.

Depois do bootstrap confirmado, remova a senha inicial do ambiente e os containers encerrados (`docker compose ... rm -f migrate bootstrap`); não remova volumes. Se usar `SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE`, monte o secret somente no serviço `bootstrap` por um override de implantação.

## 4. HTTPS, Socket.IO e GPS

O Caddy usa [deploy/Caddyfile](./deploy/Caddyfile), obtém certificados para os dois domínios e encaminha WebSocket para o backend. No modo distribuído (`DISTRIBUTED_STATE=postgres`), o Socket.IO aceita somente WebSocket; long polling continua disponível apenas no modo de uma instância em memória. O rastreamento do motoqueiro exige HTTPS em aparelhos reais.

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

O Compose de produção usa por padrão `DISTRIBUTED_STATE=postgres` e `API_REPLICA_COUNT=2`. Nesse modo, o `PostgresRealtimeTransport` distribui eventos entre réplicas usando PostgreSQL; o Socket.IO aceita somente WebSocket, evitando depender de sticky sessions para long polling. O Caddy descobre e distribui o tráfego entre as réplicas da API. Os rate limits distribuídos e leases de jobs também utilizam PostgreSQL. Não confunda o Redis da Evolution API com um adapter Redis do Socket.IO da GastroNexa.

O modo `DISTRIBUTED_STATE=memory` só é válido com `API_REPLICA_COUNT=1`, pois as salas e eventos ficam na memória do processo. A inicialização rejeita uma configuração com múltiplas réplicas e estado em memória. Ao mudar a quantidade de réplicas, verifique consumo do PostgreSQL, publicação/recepção de eventos entre instâncias, reconexão WebSocket, `/ready`, rate limits, jobs e restauração após reinício. Eventos realtime não equivalem a entrega exatamente uma vez: os clientes devem reconsultar o estado persistido quando necessário.

As configurações reais do Lightsail precisam ser verificadas no servidor antes de afirmar quantas réplicas estão executando. Consulte o [roteiro de validação HTTP e infraestrutura](./docs/operations/http-production-validation.md).

## 6. Atualização segura

1. Faça backup verificado do PostgreSQL e guarde a imagem atualmente implantada.
2. Execute lint, typecheck, testes proporcionais ao risco e build.
3. Valide `docker compose config` e construa as novas imagens.
4. Execute `docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate` com a imagem nova e aguarde sucesso.
5. Suba a aplicação e valide `/health`, `/ready`, login, pedido e Socket.IO.
6. Em mudança de rastreamento, faça o smoke test com um celular real.

Para validar automaticamente a aplicação após o deploy:

```bash
SMOKE_BASE_URL=https://seu-dominio.example npm run smoke
```

O comando possui timeout e falha se `/health` ou `/ready` não responderem com JSON e HTTP 2xx.
7. Se falhar, restaure a imagem anterior; migrations destrutivas exigem plano próprio de rollback de dados.

Use a política de baixo custo de manutenção descrita em [TESTING.md](./TESTING.md). O E2E obrigatório fica restrito às jornadas críticas.

## 7. Observabilidade e backups

- Configure `SENTRY_DSN`, alertas e retenção de logs.
- Monitore `/ready`, 5xx, 429, latência, conexões Socket.IO e serviços de rota. Requisições HTTP lentas ou com erro 5xx geram `[API_REQUEST_TIMING]` com ID, rota, método, status e duração, sem registrar query strings, payloads nem credenciais. Configure `SLOW_REQUEST_THRESHOLD_MS` (padrão: 2000). O log HTTP não substitui métricas individuais do PostgreSQL e dos gateways.
- Automatize backup do PostgreSQL fora do servidor e teste a restauração.
- Proteja `.env.production` e nunca o envie ao Git.
- Rotacione imediatamente qualquer segredo exposto.
- Revise a retenção de GPS em `DELIVERY_LOCATION_RETENTION_DAYS`.

### Backup externo e restore drill

O backup de produção deve ficar fora do servidor, criptografado antes do upload e com versionamento/bloqueio público no bucket. O script `scripts/backup-production.sh` faz dump em streaming, cifra com `age`, envia para S3 com SSE-KMS e confere o checksum remoto antes de registrar sucesso.

Execute o teste de restauração sem tocar no banco de produção:

```bash
export BACKUP_BUCKET='seu-bucket-privado'
export BACKUP_BUCKET_OWNER='123456789012'
export BACKUP_KEY='gastronexa/database/AAAA/MM/DD/arquivo.dump.age'
export BACKUP_AGE_IDENTITY_FILE='/caminho/privado/para/identity.agekey'
bash scripts/restore-drill-production.sh
```

A chave privada `age` deve permanecer fora do repositório e fora do servidor de aplicação quando não estiver sendo usada para recuperação. O restore drill cria um PostgreSQL temporário isolado, valida checksum, restaura o dump, confirma histórico de migrations, tabelas públicas, foreign keys, políticas RLS e negação de leitura sem contexto tenant, e remove o ambiente temporário ao finalizar. Faça o drill periodicamente e depois de mudanças relevantes no processo de backup. O tempo do drill não equivale a RTO de um incidente; RPO e RTO continuam explicitamente não verificados. O CI utiliza somente comandos sintéticos e não acessa backups reais do S3. A chave privada age permanece fora do CI e do repositório.

## 8. Pagamentos e OAuth

- Use credenciais de produção e URLs de webhook em `https://API_DOMAIN/...`.
- Configure `MP_WEBHOOK_SECRET` com a chave de Webhooks da aplicação Mercado Pago, não com o access token. Para aplicações distintas ou rotação, use `MP_WEBHOOK_SECRETS` como lista JSON de segredos ativos. Pedidos, billing e Point autenticam `x-signature` + `x-request-id` + `data.id` da URL antes do processamento; segredo ausente retorna 503 e assinatura inválida retorna 401. Migre notificações IPN antigas para Webhooks assinados antes de publicar esta versão.
- Mantenha `ALLOW_GLOBAL_PAYMENT_FALLBACK=false` e `ENABLE_TEST_PAYMENT_WEBHOOK=false`.
- Autorize `https://APP_DOMAIN` no Google OAuth.
- Faça um pagamento controlado de cada provedor habilitado e confirme idempotência do webhook antes de abrir ao público.

## 9. Render ou outro PaaS

Frontend e backend podem ser publicados separadamente. Configure Geoapify ou OSRM/Nominatim privados alcançáveis pelo backend:

- backend: `npm ci && npm run build && npx prisma generate`; início `npm run start` apenas com segredos runtime;
- job de pré-deploy separado com credenciais owner: `prisma migrate deploy`; provisionamento da role na infraestrutura e bootstrap separado antes do primeiro início;
- frontend: `npm ci && npm run build`; publicação de `dist`;
- todas as variáveis obrigatórias de `.env.production.example`;
- healthcheck do backend em `/ready`;
- uma instância com `DISTRIBUTED_STATE=memory` ou múltiplas com `DISTRIBUTED_STATE=postgres`, PostgreSQL compartilhado e Socket.IO somente WebSocket;
- proxy com suporte a WebSocket e HTTPS.

Não use os servidores públicos de demonstração do OSRM/Nominatim como dependência de produção.

## 10. Checklist de abertura

- [ ] DNS e certificados válidos.
- [ ] Somente 80/443 públicos.
- [ ] `/health` e `/ready` respondendo 200.
- [ ] Backups e restauração testados.
- [ ] Geoapify configurado ou OSRM/Nominatim saudáveis para toda a área dos tenants.
- [ ] Tiles com capacidade/SLA e atribuição correta.
- [ ] CORS restrito ao domínio do frontend.
- [ ] Login, MFA administrativo e permissões por restaurante validados.
- [ ] Mesa/QR, produto montável, cozinha, garçom, promoção e pagamento validados.
- [ ] Rastreamento real validado do aparelho do motoqueiro até o cliente.
- [ ] Alertas, logs e Sentry recebendo eventos.
- [ ] `API_REPLICA_COUNT` e `DISTRIBUTED_STATE` correspondem às réplicas realmente executadas; realtime, jobs e rate limits verificados entre instâncias.
- [ ] Respostas privadas, inclusive erros de autenticação e pedidos, retornam `Cache-Control: private, no-store`.
- [ ] O roteiro de DNS, TLS e infraestrutura foi executado no ambiente real, sem publicar credenciais.
