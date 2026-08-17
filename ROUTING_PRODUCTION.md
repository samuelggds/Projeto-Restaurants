# Roteamento próprio em produção

Este projeto pode calcular o tempo de entrega sem custo por consulta usando
OSRM para rotas e Nominatim para geocodificação. Os dois serviços ficam na
rede Docker interna: não publique as portas `5000` e `8080` na internet.

## Requisitos

- Docker e Docker Compose no VPS Linux.
- Recomendado: pelo menos 16 GB de RAM e 100 GB livres em disco. A importação
  de mapas pode consumir bastante memória e demora na primeira execução.
- Um arquivo PBF que cubra a área atendida. Para o Nordeste, use o arquivo da
  Geofabrik: `https://download.geofabrik.de/south-america/brazil/nordeste-latest.osm.pbf`.

## 1. Configure o ambiente

Copie `.env.docker.example` para `.env.docker` e preencha os valores normais
da aplicação. Adicione:

```env
OSRM_BASE_URL=http://osrm:5000
GEOCODER_BASE_URL=http://nominatim:8080
ROUTING_USER_AGENT=PizzaIADelivery/1.0 (suporte@seudominio.com)
ROUTING_PBF_URL=https://download.geofabrik.de/south-america/brazil/nordeste-latest.osm.pbf
```

## 2. Prepare os dados do OSRM (uma vez e quando atualizar o mapa)

No PowerShell, na raiz do projeto:

```powershell
New-Item -ItemType Directory -Force routing-data/osrm
Invoke-WebRequest https://download.geofabrik.de/south-america/brazil/nordeste-latest.osm.pbf -OutFile routing-data/osrm/nordeste-latest.osm.pbf
docker run --rm -t -v "${PWD}/routing-data/osrm:/data" ghcr.io/project-osrm/osrm-backend:latest osrm-extract -p /opt/car.lua /data/nordeste-latest.osm.pbf
docker run --rm -t -v "${PWD}/routing-data/osrm:/data" ghcr.io/project-osrm/osrm-backend:latest osrm-partition /data/nordeste-latest.osrm
docker run --rm -t -v "${PWD}/routing-data/osrm:/data" ghcr.io/project-osrm/osrm-backend:latest osrm-customize /data/nordeste-latest.osrm
```

O perfil `car` é a melhor aproximação gratuita disponível pelo OSRM. Ele não
inclui trânsito em tempo real nem um perfil exclusivo de motocicleta.

## 3. Suba a aplicação e os serviços de rota

```powershell
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.routing.yml up -d --build
```

Confira o estado dos serviços:

```powershell
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.routing.yml ps
docker compose --env-file .env.docker -f docker-compose.yml -f docker-compose.routing.yml logs -f osrm nominatim
```

O Nominatim faz a importação do PBF na primeira inicialização; aguarde a
conclusão antes de testar o rastreamento. O backend passa a consultar os
hosts internos `osrm` e `nominatim` automaticamente.

## Desenvolvimento local

Os endpoints públicos usados durante o desenvolvimento não devem ser usados
em produção. No ambiente local, mantenha as URLs de teste somente enquanto
valida a funcionalidade.
