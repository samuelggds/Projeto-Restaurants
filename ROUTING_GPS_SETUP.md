# GPS e rota em tempo real

O celular do motoqueiro envia a posicao pelo navegador ao backend. O cliente
recebe essas posicoes por Socket.IO e o backend combina Nominatim (endereco para
coordenadas) com OSRM (trajeto pelas ruas) para desenhar a rota ate o endereco do
pedido.

## O que exige chave

- O GPS do navegador nao exige API key, mas em producao exige HTTPS.
- OSRM e Nominatim hospedados pelo proprio projeto nao exigem API key.
- O provedor de mapa visual pode exigir chave conforme o servico escolhido. A
  configuracao atual aceita `VITE_MAP_TILE_URL` e `VITE_MAP_TILE_ATTRIBUTION`.
- JWT, banco, pagamentos e alertas continuam exigindo seus proprios segredos.

## Ambiente local regional

O exemplo local usa o recorte Nordeste da Geofabrik. Ele atende AL, BA, CE, MA,
PB, PE, PI, RN e SE. Nao use esse recorte para entregas fora desses estados.

Requisitos recomendados para a primeira importacao:

- Docker Desktop ativo;
- pelo menos 16 GB de RAM disponiveis para o Docker;
- pelo menos 60 GB livres no disco do Docker.

Crie a configuracao local:

```powershell
Copy-Item .env.routing.local.example .env.routing.local
```

Baixe o recorte oficial e prepare o OSRM (a etapa `extract` e a mais pesada):

```powershell
New-Item -ItemType Directory -Force routing-data/osrm
Invoke-WebRequest 'https://download.geofabrik.de/south-america/brazil/nordeste-latest.osm.pbf' -OutFile 'routing-data/osrm/region.osm.pbf'
Invoke-WebRequest 'https://download.geofabrik.de/south-america/brazil/nordeste-latest.osm.pbf.md5' -OutFile 'routing-data/osrm/nordeste-latest.osm.pbf.md5'
$expectedMd5 = ((Get-Content 'routing-data/osrm/nordeste-latest.osm.pbf.md5') -split '\s+')[0].ToUpperInvariant()
$actualMd5 = (Get-FileHash 'routing-data/osrm/region.osm.pbf' -Algorithm MD5).Hash
if ($actualMd5 -ne $expectedMd5) { throw 'Checksum invalido para o mapa Nordeste.' }
$routeDir = (Resolve-Path 'routing-data/osrm').Path
docker run --rm -t -v "${routeDir}:/data" ghcr.io/project-osrm/osrm-backend:26.8.0-debian osrm-extract -p /opt/car.lua /data/region.osm.pbf
docker run --rm -t -v "${routeDir}:/data" ghcr.io/project-osrm/osrm-backend:26.8.0-debian osrm-partition /data/region.osrm
docker run --rm -t -v "${routeDir}:/data" ghcr.io/project-osrm/osrm-backend:26.8.0-debian osrm-customize /data/region.osrm
```

Inicie os servicos:

```powershell
docker compose --env-file .env.docker --env-file .env.routing.local -f docker-compose.yml -f docker-compose.routing.yml -f docker-compose.routing.local.yml up -d osrm nominatim
```

A primeira importacao do Nominatim pode demorar varios minutos. Acompanhe sem
interromper o container:

```powershell
docker compose --env-file .env.docker --env-file .env.routing.local -f docker-compose.yml -f docker-compose.routing.yml -f docker-compose.routing.local.yml logs -f nominatim
```

Valide os dois servicos:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/status?format=json'
Invoke-RestMethod 'http://127.0.0.1:5000/route/v1/driving/-38.5267,-3.7319;-38.5191,-3.7285?overview=false'
```

No desenvolvimento nativo, mantenha somente OSRM e Nominatim em containers.
Configure o backend em `backend/.env` para usar as portas locais:

```dotenv
ROUTING_REQUIRED=true
OSRM_BASE_URL=http://127.0.0.1:5000
GEOCODER_BASE_URL=http://127.0.0.1:8080
```

Depois reinicie `npm --prefix backend run dev`. Não inicie outro backend pelo
Compose enquanto o backend nativo estiver usando a porta `3000`.

Se optar deliberadamente por executar toda a aplicação em containers, pare os
processos nativos antes e use `.env.docker`; esse arquivo aponta o backend
Docker para o mesmo `pizza_ai` por `host.docker.internal`.

## Producao

Em producao, frontend e API precisam de URLs HTTPS estaveis. Sem dominio proprio,
use inicialmente os subdominios HTTPS permanentes fornecidos pela hospedagem. Um
Quick Tunnel do Cloudflare e apenas para teste e sua URL muda ao reiniciar.

Antes do deploy:

1. Defina `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGINS` e
   `SOCKET_CORS_ORIGINS` com as URLs HTTPS reais.
2. Defina `ROUTING_USER_AGENT` com um contato real.
3. Mantenha OSRM e Nominatim acessiveis apenas na rede privada dos containers.
4. Use volume persistente para o banco do Nominatim.
5. Em producao regional, use `NOMINATIM_UPDATE_MODE=continuous` com a URL de
   replicacao da mesma regiao.
6. Atualize e reprocesse periodicamente o arquivo do OSRM; ele nao se atualiza
   sozinho.
7. Faca backup dos bancos e limite o backend a uma replica enquanto o Socket.IO
   nao estiver usando um adapter distribuido.

O perfil `car` do OSRM representa a malha viaria e serve como aproximacao para
moto. Ele nao fornece transito ao vivo.
