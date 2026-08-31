# E2E de segurança multi-tenant

Esta suíte valida o isolamento entre restaurantes usando o servidor Express, os middlewares de autenticação e autorização, o Prisma Client, o Socket.IO e um PostgreSQL reais. Ela não substitui `req.user`, não simula consultas Prisma e não depende de Row-Level Security (RLS).

## Ambiente isolado

Ao executar `npm run test:e2e:tenant` na raiz:

1. o runner cria um container `postgres:16-alpine` descartável em uma porta loopback aleatória;
2. valida que a URL aponta para `localhost` e que o nome do banco contém `e2e`, `test` ou `ci`;
3. aplica todas as migrations com `prisma migrate deploy`;
4. executa os arquivos `backend/src/e2e/multiTenant/*.e2e.ts` sequencialmente;
5. limpa os fixtures e remove o container, inclusive quando um teste falha.

O runner recusa bancos remotos e bancos locais sem um marcador inequívoco de teste. A própria suíte repete essa validação antes de qualquer `TRUNCATE`.

No GitHub Actions, o job `Multi-tenant security E2E` fornece um PostgreSQL exclusivo e injeta `TENANT_E2E_DATABASE_URL`. O job não usa `DATABASE_URL` de staging ou produção.

## Modelo dos cenários

Cada execução cria dois restaurantes reais, A e B, com administradores, cliente, funcionário, entregadores, produtos, pedidos, conversas, mesas, sessão, pagamento, cupons, configurações, faturas e mensagens de suporte.

O padrão adversarial é:

```text
credencial válida do Restaurante A + ID persistido do Restaurante B = acesso negado
```

Depois de cada tentativa crítica, a suíte consulta o PostgreSQL diretamente e confirma que os registros de B não mudaram. Para evitar falso positivo por ID inexistente, o mesmo recurso é acessado com a credencial de B e deve funcionar.

## Cobertura

- leitura, listagem, status, cancelamento e estorno de pedidos;
- conversa privada sobre problema do pedido;
- CRUD de produtos e descontos promocionais;
- criação e manutenção de funcionários;
- mesas, sessões e conta/pagamento de mesa;
- cupons e configurações privadas;
- suporte interno e faturas;
- tentativas de sobrescrever tenant por body, query, params, headers e handshake Socket.IO;
- webhooks Asaas, Stripe, PagBank e Mercado Pago;
- rooms e eventos realtime por restaurante;
- atualização de GPS pelo entregador atribuído.

## Execução com PostgreSQL já descartável

Em CI ou em um ambiente local controlado, é possível fornecer a URL explicitamente:

```powershell
$env:TENANT_E2E_DATABASE_URL = "postgresql://tenant:senha@127.0.0.1:5432/tenant_e2e?schema=public"
npm run test:e2e:tenant
```

Use somente um banco criado exclusivamente para esses testes. A suíte apaga todos os dados do schema público, preservando apenas o histórico de migrations.
