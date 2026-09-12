# GastroNexa no AWS Lightsail com deploy automatico

Este runbook descreve o primeiro ambiente de producao de baixo custo do GastroNexa. O objetivo e comecar com uma unica instancia Lightsail, mantendo PostgreSQL, API, worker, frontend e gateway no Docker Compose existente. Quando a receita crescer, banco, imagens e API podem ser separados sem mudar o dominio publico.

## Fluxo de entrega

A producao nao acompanha a branch `main` por polling. O GitHub Actions publica somente um commit da `main` que acabou de concluir o workflow `CI` com sucesso:

```text
PR -> CI verde -> merge na main -> CI da main verde -> Deploy Production -> Lightsail
```

O workflow `.github/workflows/deploy-production.yml` envia o SHA exato aprovado para `scripts/deploy-production.sh`. O script valida o SHA contra `origin/main`, aplica migrations, atualiza os containers e exige healthchecks saudaveis.

A automacao fica inativa ate `PRODUCTION_DEPLOY_ENABLED=true` ser configurado nas variables do repositorio.

## 1. Lightsail

Crie uma instancia Linux/Ubuntu LTS na regiao desejada, inicialmente com 2 GB de RAM. Associe um IP estatico. No firewall publico mantenha somente:

- TCP 22 restrito ao acesso administrativo;
- TCP 80;
- TCP 443;
- UDP 443 somente se quiser HTTP/3 pelo Caddy.

Nao publique 3000, 5432, 5000 ou 8080.

## 2. Pacotes do servidor

No servidor:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Saia da sessao SSH e entre novamente para a permissao do grupo Docker ser aplicada. Confirme:

```bash
docker version
docker compose version
```

## 3. Diretorio da aplicacao

```bash
sudo mkdir -p /opt/gastronexa
sudo chown "$USER":"$USER" /opt/gastronexa
git clone https://github.com/samuelggds/Projeto-Restaurants.git /opt/gastronexa
cd /opt/gastronexa
git checkout main
```

O repositorio e publico, portanto o servidor precisa apenas de acesso de leitura ao GitHub. O acesso de escrita continua exclusivamente no GitHub Actions/conta do desenvolvedor.

## 4. Ambiente de producao

```bash
cd /opt/gastronexa
cp .env.production.example .env.production
chmod 600 .env.production
```

Preencha os valores reais. Para o primeiro servidor pequeno use:

```env
DISTRIBUTED_STATE=postgres
API_REPLICA_COUNT=1
DATABASE_CONNECTION_LIMIT=10
```

Nao habilite o profile `selfhost-routing`; use Geoapify para evitar OSRM/Nominatim consumindo a RAM da instancia.

Os segredos reais permanecem somente em `/opt/gastronexa/.env.production` e nunca devem ser enviados ao Git.

## 5. DNS

Crie registros A para o IP estatico do Lightsail, por exemplo:

```text
app.seudominio.com -> IP_ESTATICO
api.seudominio.com -> IP_ESTATICO
```

Configure os mesmos hosts em `APP_DOMAIN` e `API_DOMAIN`. O Caddy obtem e renova TLS automaticamente depois que DNS, portas 80/443 e `ACME_EMAIL` estiverem corretos.

## 6. Primeira subida manual

Antes de habilitar o deploy automatico:

```bash
cd /opt/gastronexa
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Valide:

```bash
curl -fsS https://api.seudominio.com/health
curl -fsS https://api.seudominio.com/ready
curl -fsS https://app.seudominio.com/healthz
```

Depois da criacao inicial do SUPER_ADMIN, remova a senha temporaria de bootstrap do `.env.production` conforme o runbook principal de deploy.

## 7. Chave SSH exclusiva do deploy

Crie uma chave exclusiva para GitHub Actions. Nao reutilize a chave pessoal do Lightsail:

```bash
ssh-keygen -t ed25519 -C gastronexa-github-deploy -f ./gastronexa-github-deploy
```

Adicione **somente a chave publica** ao `~/.ssh/authorized_keys` do usuario de deploy no Lightsail. Guarde a chave privada como secret do GitHub e apague a copia local quando a configuracao estiver validada.

Capture a chave de host do servidor por um canal confiavel e compare o fingerprint com o servidor antes de cadastrar `LIGHTSAIL_KNOWN_HOSTS`. Nao use `StrictHostKeyChecking=no`.

## 8. GitHub Environment e secrets

Crie o environment `production` e configure os repository/environment secrets:

```text
LIGHTSAIL_HOST=<IP estatico ou host>
LIGHTSAIL_USER=<usuario Linux de deploy>
LIGHTSAIL_SSH_KEY=<chave privada ed25519>
LIGHTSAIL_KNOWN_HOSTS=<linha(s) known_hosts verificadas>
```

Configure repository variables:

```text
PRODUCTION_APP_URL=https://app.seudominio.com
PRODUCTION_API_URL=https://api.seudominio.com
PRODUCTION_DEPLOY_ENABLED=false
```

Somente depois da primeira subida manual, DNS/TLS e healthchecks estarem funcionando, altere:

```text
PRODUCTION_DEPLOY_ENABLED=true
```

A partir desse momento, todo merge na `main` que passar pelo CI da propria `main` sera publicado automaticamente.

## 9. O que o deploy automatico faz

`scripts/deploy-production.sh`:

1. valida `DEPLOY_SHA` e a arvore Git local;
2. atualiza `origin/main` e confirma que o SHA aprovado pertence a ela;
3. posiciona o checkout exatamente naquele commit;
4. valida o Compose;
5. cria um `pg_dump` local pre-deploy quando o banco ja esta rodando;
6. constroi as imagens com baixo paralelismo para reduzir pico de RAM;
7. executa `migrate` antes de atualizar a aplicacao;
8. atualiza backend, worker, frontend e gateway;
9. valida `/ready`, health do frontend e processo do worker;
10. o workflow faz uma segunda verificacao pelos dominios publicos.

O backup pre-deploy local e apenas uma protecao adicional. Antes de clientes reais, configure tambem backup externo fora da instancia e teste a restauracao.

## 10. Atualizacoes normais

Depois de configurado:

```text
feature branch
   -> pull request
   -> CI
   -> merge
   -> CI da main
   -> deploy automatico
   -> site atualizado
```

Nao edite arquivos versionados diretamente em `/opt/gastronexa`; o deploy recusa uma arvore Git com mudancas locais. Configuracoes e segredos devem ficar no `.env.production`, que esta ignorado pelo Git.

## 11. Crescimento

A primeira instancia e propositalmente simples. Os marcos naturais de evolucao sao:

- subir de 2 GB para 4 GB se memoria/CPU justificarem;
- mover PostgreSQL para servico gerenciado quando houver receita e dados criticos suficientes;
- mover imagens para S3/CDN;
- separar worker;
- adicionar mais replicas de API/load balancer ou ECS quando a carga justificar.

Tome decisoes por CPU, memoria, latencia, conexoes do PostgreSQL, erros 5xx, conexoes Socket.IO e atraso dos jobs, nao apenas pelo numero nominal de restaurantes.
