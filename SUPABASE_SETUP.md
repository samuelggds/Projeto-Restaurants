# Supabase com Express e Prisma

Este projeto usa o Supabase como PostgreSQL gerenciado. Express continua sendo
a API, Prisma continua sendo o ORM e a autenticacao e o Socket.IO atuais nao
sao substituidos nesta etapa.

## 1. Criar um projeto separado por ambiente

Use projetos Supabase diferentes para homologacao e producao. Nunca teste
migrations ou importacoes diretamente no banco de producao.

## 2. Obter as URLs de conexao

No painel do Supabase, abra as configuracoes de conexao do banco e copie:

- a URL do pooler para `DATABASE_URL`;
- a URL direta para `DIRECT_URL`.

Se o ambiente que executa migrations nao possuir IPv6, use o session pooler
na porta 5432 como `DIRECT_URL`. Para runtimes serverless, prefira o transaction
pooler na porta 6543 em `DATABASE_URL` e mantenha `pgbouncer=true`.

Exemplo de formato (nao copie literalmente):

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true&connection_limit=10"
DIRECT_URL="postgresql://postgres:PASSWORD@DIRECT_HOST:5432/postgres?sslmode=require"
```

Se a senha contiver caracteres reservados (`@`, `:`, `/`, `#`, `%`), aplique
URL encoding antes de coloca-la na URL. Nunca envie `.env` ao GitHub.

## 3. Preparar o schema em homologacao

Dentro de `backend`, configure `.env` e execute:

```bash
npm run db:generate
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:check
```

`migrate deploy` aplica somente as migrations versionadas. Nao use
`prisma db push` em producao.

## 4. Migrar dados existentes

Para um banco local com dados reais:

1. interrompa gravacoes durante a migracao final;
2. gere um backup com `pg_dump` compativel com o PostgreSQL de destino;
3. restaure primeiro em homologacao;
4. execute `npm run db:migrate:status` e `npm run db:check`;
5. valide usuarios, restaurantes, pedidos, faturas e relacionamentos;
6. repita o processo em producao numa janela de manutencao;
7. mantenha o backup original ate concluir a validacao.

Para banco vazio, escolha uma unica abordagem: aplicar migrations e importar
apenas dados, ou restaurar schema e dados. Nao misture as duas sem planejar a
tabela de migrations do Prisma.

## 5. Configurar o backend hospedado

Cadastre `DATABASE_URL` e `DIRECT_URL` como secrets na plataforma de hospedagem.
No comando de release/deploy, execute:

```bash
npm --prefix backend run db:migrate:deploy
```

Depois inicie normalmente o backend. O endpoint `/health` confirma o processo;
`npm run db:check` confirma especificamente o acesso ao banco.

## 6. Checklist antes da troca

- [ ] Homologacao usa um projeto Supabase separado.
- [ ] Todas as migrations aparecem como aplicadas.
- [ ] A conexao exige SSL fora do ambiente local.
- [ ] O backend inicia e `/health` responde.
- [ ] Login, refresh token e MFA foram testados.
- [ ] Um restaurante nao consegue acessar dados de outro.
- [ ] Criacao e atualizacao de pedidos funcionam em tempo real.
- [ ] Webhooks de pagamento foram testados no novo ambiente.
- [ ] Faturas, reembolsos e bloqueio por inadimplencia foram validados.
- [ ] Backup e procedimento de rollback foram testados.
- [ ] Credenciais nao aparecem no Git, logs ou frontend.

## 7. Recursos Supabase para uma fase posterior

Supabase Auth, Storage, Realtime e Row Level Security nao sao ativados
automaticamente por esta migracao. Adota-los exige um projeto separado, pois a
API Express atual ja implementa autenticacao, autorizacao e eventos em tempo
real. O banco deve permanecer inacessivel diretamente pelo frontend enquanto
essas politicas nao forem desenhadas e testadas.
