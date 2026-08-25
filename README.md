# Projeto-Restaurants

## Stack atual

- Backend: Node.js + Express + Prisma
- Frontend: React + Vite
- Banco: PostgreSQL
- Containerizacao: Docker + Docker Compose
- TypeScript: backend e frontend em TypeScript

## TypeScript

O projeto esta com codigo de backend e frontend em TypeScript, com validacao via `tsc --noEmit`.

Comandos:

```bash
cd frontend
npm run typecheck

cd ../backend
npm run typecheck
```

## Docker

Antes de subir os containers, crie um arquivo `.env.docker` na raiz com base em `.env.docker.example`.

Subir tudo com Docker Compose:

```bash
docker compose up --build
```

Servicos:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Healthcheck backend: http://localhost:3000/health
- PostgreSQL: localhost:5432

Para habilitar rota rodoviaria e geocodificacao proprias para o rastreamento do
motoqueiro, siga [`ROUTING_GPS_SETUP.md`](./ROUTING_GPS_SETUP.md).

## Supabase

O Supabase pode ser usado como PostgreSQL gerenciado sem substituir a API
Express, o Prisma, a autenticacao atual ou o Socket.IO. O projeto usa duas URLs:

- `DATABASE_URL`: conexao da aplicacao, normalmente pelo pooler.
- `DIRECT_URL`: conexao usada pelo Prisma CLI para migrations.

Consulte [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) para configurar o projeto,
aplicar migrations, validar a conexao e migrar dados com seguranca.

Parar:

```bash
docker compose down
```

Parar e remover volume do banco:

```bash
docker compose down -v
```

## Docker (desenvolvimento com hot reload)

Subir backend + frontend em modo desenvolvimento:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Nesse modo:

- Backend usa `npm run dev` com `nodemon`.
- Frontend usa Vite dev server com HMR na porta `5174`.

Parar o ambiente de desenvolvimento:

```bash
docker compose -f docker-compose.dev.yml down
```
