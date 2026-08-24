# Rotas e rastreamento em produção

O rastreamento usa GPS do celular do motoqueiro, Socket.IO para atualização em tempo real, polling como contingência, OSRM para calcular a rota e Nominatim para localizar o endereço salvo no pedido. OSRM e Nominatim são privados e não publicam portas no host.

## Requisitos

- VPS Linux com Docker Engine e Docker Compose.
- DNS de `APP_DOMAIN` e `API_DOMAIN` apontando para o servidor.
- Portas públicas somente `80/tcp`, `443/tcp` e `443/udp`; banco, backend, OSRM e Nominatim permanecem internos.
- HTTPS válido. Navegadores móveis só liberam geolocalização em contexto seguro.
- Memória e disco dimensionados para a área escolhida. Uma importação nacional exige muito mais recursos que uma cidade ou estado.
- Provedor de tiles com SLA ou tiles próprios. O serviço público do OpenStreetMap não deve sustentar tráfego comercial sem avaliação da política de uso.

Referências oficiais: [OSRM](https://project-osrm.org/docs/v26.6.1/http), [imagem oficial do OSRM](https://github.com/project-osrm/osrm-backend/pkgs/container/osrm-backend), [Nominatim Docker](https://github.com/mediagis/nominatim-docker/blob/master/howto.md) e [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API).

## 1. Ambiente

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Edite `.env.production`:

- troque todos os valores `SUBSTITUA_*`;
- gere quatro segredos independentes, por exemplo com `openssl rand -hex 48`;
- configure os dois domínios e um e-mail válido para o certificado;
- informe URLs HTTPS reais no frontend;
- escolha `ROUTING_PBF_URL` e `ROUTING_REPLICATION_URL` da mesma região;
- informe um `ROUTING_USER_AGENT` com contato operacional;
- configure um provedor de tiles em `VITE_MAP_TILE_URL`.

As variáveis `VITE_*` são incorporadas à imagem durante o build. Qualquer alteração exige reconstruir o frontend.

## 2. Cobertura multi-tenant

O arquivo PBF precisa cobrir todos os restaurantes cadastrados nessa instalação. Não use um mapa de um estado se outro tenant operar fora dele. Para operação nacional, o exemplo usa `brazil-latest.osm.pbf`; para uma implantação regional, prefira o menor extrato que cubra toda a operação e ajuste as duas URLs de atualização.

Salve sempre o arquivo ativo como `routing-data/osrm/region.osm.pbf`. O nome lógico `region` evita acoplar o deploy a uma região específica.

## 3. Preparação do OSRM

Use exatamente a mesma imagem pinada em `.env.production` no pré-processamento e no runtime:

```bash
set -a
. ./.env.production
set +a

mkdir -p routing-data/osrm
curl -fL "$ROUTING_PBF_URL" -o routing-data/osrm/region.osm.pbf

docker run --rm -t \
  -v "$PWD/routing-data/osrm:/data" \
  "$OSRM_IMAGE" osrm-extract -p /opt/car.lua /data/region.osm.pbf

docker run --rm -t \
  -v "$PWD/routing-data/osrm:/data" \
  "$OSRM_IMAGE" osrm-partition /data/region.osrm

docker run --rm -t \
  -v "$PWD/routing-data/osrm:/data" \
  "$OSRM_IMAGE" osrm-customize /data/region.osrm
```

O perfil `car` é uma aproximação para motocicleta; ele não inclui trânsito ao vivo. Verifique espaço livre antes do processamento e mantenha uma cópia da versão anterior até o smoke test terminar.

## 4. Validação e inicialização

Valide a interpolação sem iniciar containers:

```bash
PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production -f docker-compose.production.yml config
```

Suba a pilha:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Na primeira inicialização, o Nominatim importa o PBF e pode levar horas. Acompanhe sem expor a porta:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f nominatim osrm backend gateway
```

## 5. Smoke tests

```bash
curl -fsS "https://$API_DOMAIN/health"
curl -fsS "https://$API_DOMAIN/ready"

docker compose --env-file .env.production -f docker-compose.production.yml exec backend \
  node -e "Promise.all([fetch('http://osrm:5000/route/v1/driving/-38.5267,-3.7319;-38.5191,-3.7285?overview=false'),fetch('http://nominatim:8080/status?format=json')]).then(async rs=>{for(const r of rs){if(!r.ok)throw Error(String(r.status));console.log(await r.text())}}).catch(e=>{console.error(e);process.exit(1)})"
```

Depois, faça uma entrega controlada em um celular real:

1. acesse a conta do motoqueiro por HTTPS e permita localização precisa;
2. retire um pedido de delivery;
3. confirme que o ponto inicial aparece imediatamente para o cliente correto;
4. caminhe ou percorra uma pequena rota e confirme atualizações em tempo real;
5. desligue a rede por alguns segundos e valide a recuperação;
6. conclua a entrega e confirme que novas posições deixam de ser aceitas;
7. valide que cliente, motoqueiro e admin de outro restaurante não veem o pedido.

## 6. Escala e disponibilidade

Mantenha **exatamente uma réplica do backend** nesta versão. Rooms e throttling do Socket.IO usam memória do processo. Antes de escalar horizontalmente, implemente adapter Redis, coordenação distribuída e afinidade para o transporte de polling, com teste de rolling deploy.

Monitore pelo menos:

- `/ready`, reinícios e uso de CPU/memória/disco;
- falhas e latência de OSRM/Nominatim;
- conexões Socket.IO, posições aceitas/rejeitadas e atraso do GPS;
- taxa de respostas 429/5xx;
- espaço dos volumes PostgreSQL, Nominatim e Caddy.

Logs têm rotação no Compose. Configure Sentry e alertas externos antes da abertura pública.

## 7. Atualização e rollback dos mapas

- Nominatim usa replicação quando `NOMINATIM_UPDATE_MODE=continuous` e a URL corresponde ao PBF importado.
- OSRM não é atualizado automaticamente. Baixe e processe o novo PBF em um diretório de staging usando a mesma versão da imagem.
- Valide uma rota conhecida no staging, pare somente o serviço OSRM, preserve o conjunto anterior, troque o diretório de dados de forma atômica e reinicie o serviço.
- Se o healthcheck ou smoke test falhar, restaure imediatamente o conjunto anterior.
- Faça backup testado do banco principal e dos arquivos `.env.production`; o PBF e os artefatos OSRM podem ser reconstruídos, mas manter a versão anterior acelera o rollback.

## 8. Retenção e privacidade

`DELIVERY_LOCATION_RETENTION_DAYS` controla a limpeza automática das posições antigas. Defina o menor prazo compatível com suporte e obrigações legais. O endpoint e o socket preservam isolamento por pedido, conta e `restaurantId`; não exponha OSRM, Nominatim nem PostgreSQL na internet.
