# Auditoria de segurança multi-tenant

Data da revisão: 31 de agosto de 2026  
Escopo: API Express, Prisma/PostgreSQL, autenticação e autorização, serviços, repositórios, pagamentos, webhooks, Socket.IO, sessões de mesa e jobs.

## Objetivo e modelo de ameaça

O objetivo desta revisão é impedir que uma identidade vinculada ao Restaurante A leia, altere, exclua ou receba em tempo real qualquer dado privado do Restaurante B, mesmo que conheça um ID válido desse outro restaurante.

Foram considerados os seguintes atores:

- administrador, funcionário, garçom e motoqueiro autenticados;
- cliente, que é uma identidade global e pode comprar legitimamente em restaurantes diferentes;
- convidado de uma sessão de mesa, limitado ao token, participante, mesa e restaurante da sessão;
- `SUPER_ADMIN`, identidade de plataforma explicitamente separada dos papéis de restaurante;
- provedores externos autenticados por assinatura/segredo e referências de pagamento;
- atacante que adultera IDs em path, query, body, token, cookie ou evento Socket.IO.

## Invariantes obrigatórias

1. O tenant de uma rota privada vem da conta atual carregada do banco, nunca de `body`, `query` ou `params`.
2. Papéis privados de restaurante precisam possuir um `restaurantId` inteiro e positivo.
3. Toda operação sobre um recurso privado inclui `restaurantId` na própria consulta ao banco.
4. Escritas não dependem apenas de uma leitura/autorização anterior; o filtro do tenant é repetido atomicamente no `UPDATE`, `DELETE` ou `UPSERT`.
5. Salas realtime são específicas por restaurante, usuário, mesa ou sessão. Não existe sala administrativa global compartilhada entre restaurantes.
6. Identificadores públicos ou de provedor não substituem a validação de tenant, valor, método, estado e referência.
7. Respostas para IDs de outro tenant não revelam se o recurso existe.

## Superfícies revisadas

- middlewares de access token, administrador, staff, garçom, participante e sessão de mesa;
- rotas e controllers de pedidos, produtos, categorias, banners, cupons, funcionários, mesas, configurações, assinaturas e cobrança;
- conta e pagamentos de mesa, alocações e projeção do ledger;
- chats de problema do pedido e suporte interno;
- webhooks Mercado Pago, PagBank, Stripe, Asaas e saque Asaas;
- autenticação, ingresso em rooms, revalidação e publicação Socket.IO;
- consultas Prisma, SQL parametrizado, jobs de cobrança e retenção;
- caminhos públicos intencionais de cardápio, mídia, disponibilidade e configuração pública.

## Correções aplicadas

| Área | Risco encontrado | Correção |
| --- | --- | --- |
| Middleware privado | `ADMIN`/staff podiam avançar sem uma associação positiva de tenant se um contexto inválido chegasse ao middleware | Falha fechada com `401/403` e exigência de `restaurantId > 0` |
| Mesas e funcionários | A posse era verificada antes, mas a escrita final usava apenas o ID global | `restaurantId` e, para funcionários, papel permitido agora participam do `where` da escrita |
| Sessões de mesa | Algumas leituras e fechamentos aceitavam somente `tableId` ou `sessionId` | Todas as operações internas por ID agora exigem o restaurante na assinatura e na consulta |
| Produtos e descontos | Update/upsert final podia depender apenas da validação anterior | Escrita final também contém `restaurantId` |
| Faturas | Regeneração do Pix fazia leitura tenant-scoped, mas update/SQL de reset usavam somente o ID | Update e SQL usam simultaneamente `invoiceId` e `restaurantId` |
| Conta da mesa | Projeções do ledger atualizavam item/pedido apenas por ID após uma leitura filtrada | Escritas incluem restaurante e sessão de mesa |
| Chat de problemas | Acesso ao thread era autorizado pelo pedido, mas o store consultava `orderId` globalmente | Leitura, upsert, mensagem e resolução também exigem o tenant |
| Webhooks e saque | Algumas escritas finais usavam apenas IDs já validados | Filtros de tenant foram repetidos na escrita atômica |
| GPS do entregador | Pedido era carregado por ID e depois comparado com o tenant | A consulta inicial já exige o tenant do socket |
| Socket.IO | Administradores também ingressavam numa room genérica `admin` | A room global foi removida; ficam apenas rooms específicas do tenant e `super_admin` |

## Testes adversariais

A suíte automática cobre, entre outros, estes cenários:

- conta administrativa ou operacional sem tenant é rejeitada;
- Restaurante A tenta atualizar mesa, funcionário, produto, desconto ou fatura usando ID do Restaurante B;
- leitura e fechamento de sessão usam simultaneamente sessão/mesa e tenant;
- cliente de mesa não troca mesa, sessão, participante ou restaurante pelo payload;
- admin não consulta pedido, chat, cupom, banner, chamado ou conta de outro tenant;
- garçom, cozinha e motoqueiro não entram em rooms de outro restaurante;
- GPS só é persistido para pedido do tenant e entregador autenticados;
- webhooks rejeitam referências, tenants, valores, métodos ou estados divergentes;
- sockets são desconectados quando conta, papel, tenant ou `authVersion` deixam de corresponder ao banco.

O teste de regressão específico está em `backend/src/security/multiTenantIsolation.test.ts` e é descoberto automaticamente pelo `npm test`/`npm run ci`.

## Exposições públicas intencionais

Cardápio, imagens públicas, avaliação de produto, disponibilidade do restaurante e configuração pública possuem `restaurantId` informado pelo cliente porque são superfícies de descoberta. Elas retornam somente a projeção pública definida pelo backend. Dados de gateway, tokens, documentos e demais configurações privadas permanecem fora dessas respostas.

Clientes também são identidades globais: um mesmo cliente pode possuir pedidos e favoritos legítimos em mais de um restaurante. Nessas rotas, a autorização é feita pelo `userId` do cliente e, quando aplicável, pelo tenant do recurso.

## Riscos residuais e manutenção

- O PostgreSQL ainda não usa Row-Level Security (RLS). A separação atual é aplicada pela autenticação, autorização e filtros obrigatórios por `restaurantId` na aplicação, cobertos por testes. Como defesa adicional futura, a adoção de RLS pode fazer o próprio banco rejeitar uma consulta que omita o tenant; isso exige um desenho específico para pool de conexões, superadministradores, workers e webhooks.

- `SUPER_ADMIN` tem acesso transversal por definição e deve manter MFA, auditoria e bootstrap de conta única.
- Tokens de sessão de mesa e referências públicas precisam continuar criptograficamente imprevisíveis e com expiração.
- Toda nova tabela privada deve possuir `restaurantId`, índice apropriado e relações compostas quando houver relação tenant-scoped.
- Toda nova rota deve receber um teste A/B: autenticar no Restaurante A, usar um ID real do Restaurante B e esperar negação sem diferença observável entre “inexistente” e “de outro tenant”.
- Qualquer nova emissão realtime deve usar uma room derivada do tenant validado no servidor; rooms genéricas para papéis de restaurante são proibidas.
- Jobs globais e webhooks são exceções controladas: precisam identificar o tenant a partir de registros/referências verificadas antes de qualquer mutação.

## Referências de controle

- OWASP API Security Top 10 — API1: Broken Object Level Authorization
- OWASP API Security Top 10 — API5: Broken Function Level Authorization
- OWASP Authorization Cheat Sheet — deny by default, validação em toda requisição e testes automatizados de autorização
