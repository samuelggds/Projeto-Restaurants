# GastroNexa — migração incremental para Clean Architecture e SOLID

## Objetivo

Deixar cada caso de uso localizável e testável, preservar isolamento multi-tenant, integridade de pagamentos, rotas públicas e contratos de API. **Não confundir arquivos curtos com arquitetura boa:** a regra é minimizar acoplamento e deixar as dependências seguirem fronteiras explícitas.

## Diagnóstico (main de 12/11/2026)

Foram inspecionadas as 46 rotas TypeScript sob `backend/src/modules/*/routes/`, sem contar arquivos de testes. As maiores concentrações de regras de negócio e acesso direto ao banco estão em:

| Prioridade | Arquivo | Linhas efetivas aproximadas | Risco/observação |
| --- | --- | ---: | --- |
| P0 | `nfcRegistration/routes/NfcRegistrationRoutes.ts` | 1178 | Múltiplas operações de cadastro, cartão e comanda, transações e criptografia em handlers. Fluxo crítico: migrar por endpoint, acompanhado por testes com PostgreSQL real. |
| P0 | `nfcRegistration/routes/NfcComandaRoutes.ts` | 214 | Regras de comanda e pagamentos; preservar idempotência e validações de saldo/CPF. |
| P0 | `nfcRegistration/routes/NfcOrderConfirmationRoutes.ts` | 211 | Confirmação de pedidos e controle transacional; prioridade pela exposição a concorrência. |
| P1 | `nfcRegistration/routes/NfcCustomerViewRoutes.ts` | 205 | Consulta/transformação de dados de clientes: não ampliar exposição de dados pessoais. |
| P1 | `nfcRegistration/routes/NfcCashlessAccessRoutes.ts` | 178 | Controle de acesso e estados; separar protocolo HTTP de regras de domínio. |
| P1 | `nfcRegistration/routes/NfcInventoryRoutes.ts` | 168 | Estoque/cartões; isolar operações de persistência. |
| P1 | `coupon/routes/CouponRoutes.ts` | 138 | Consultas SQL/Prisma e cálculo de elegibilidade dentro de handlers. |
| P1 | `waiterCalls/routes/TableServiceCallRoutes.ts` | 77 | Mutação e concorrência de chamados NFC dentro da rota. |
| P2 | `customerAddresses/routes/CustomerAddressRoutes.ts` | 90 | Regras de endereço padrão e transações na rota; primeira migração demonstrativa. |

`orders/routes/orderRoutes.ts` tem cerca de 285 linhas efetivas, mas já atua majoritariamente como composição de controllers. Sua evolução é **dividir o roteamento por intenção funcional** sem deslocar lógica de negócio de volta para a rota.

A regra `scripts/checkArchitecture.mjs` já existia, mas não limitava rotas novas à separação entre protocolo e persistência.

## Estrutura de referência por funcionalidade

```text
backend/src/modules/customerAddresses/
  routes/
    CustomerAddressRoutes.ts       # HTTP e middlewares, sem Prisma
  controllers/
    CustomerAddressController.ts   # ator autenticado, validação e códigos HTTP
  services/
    CustomerAddressService.ts      # casos de uso e regras, sem Express/Prisma
    CustomerAddressService.test.ts
  repositories/
    CustomerAddressRepository.ts   # contrato de persistência + adaptador Prisma
  domain/
    CustomerAddress.ts             # tipos e validações sem efeitos externos
```

Fluxo de dependências: `Route -> Controller -> Application Service -> Repository Port <- Prisma Adapter`. O domínio não conhece Express, Socket.IO, Prisma, OpenAI, gateways ou ambiente. **Transações e tenant context permanecem no adaptador de persistência** ou em uma Unit of Work explícita. Operações públicas não podem receber `restaurantId` do payload como autoridade.

## Regras obrigatórias para mudanças seguintes

1. **S — responsabilidade única:** rota define endpoints e política de autenticação; controller converte entrada/saída HTTP; caso de uso decide comportamento; repositório acessa DB.
2. **O — aberto/fechado:** adicionar comportamento por extensões/composição, não condicionais gigantes em uma rota.
3. **L — substituição:** adaptadores implementam os contratos sem alterar semântica, tratamento de erros ou tenant scope.
4. **I — segregação:** interfaces pequenas por caso de uso; não criar um `IGenericRepository` gigante.
5. **D — inversão:** aplicação depende de interfaces/contratos, infraestrutura implementa a persistência.
6. Testes verificam a regra em unidade e a SQL/Prisma em integração com PostgreSQL isolado. Não substituir validação real por mocks.
7. Nunca mudar contratos JSON, HTTP, autenticação, billing, status, chaves de idempotência ou fluxos financeiros apenas por estética. Preservar Zod e erros apropriados.
8. Logs, métricas, trace/requestId, timeout, concorrência e custo de queries devem ser verificados em homologação antes de ampliar réplicas.

## Proteção contra regressão

`scripts/checkArchitecture.mjs` passa a impedir importação direta de `config/prisma`, `database/tenantDbContext`, `repositories/*` e `@prisma/client` em **novas rotas**. Rotas antigas com essa dívida técnica ficam em lista explícita e devem sair conforme migram.

Novas rotas têm orçamento de 150 linhas efetivas; exceções existentes têm limites iguais ao tamanho auditado. Crescimento nesses arquivos passa a falhar CI, incentivando extrações pequenas.

Esse limite é um *sinal de revisão*, não prova de boa arquitetura: código pode ser mal estruturado mesmo com 40 linhas.

## Primeira migração — endereços do cliente

- API HTTP existente mantida em `GET /`, `POST /`, `PUT /:id/default`.
- Validações do endereço preservadas; primeiro endereço vira padrão, escolher novo padrão desmarca o antigo no mesmo transaction scope.
- A implementação Prisma fica isolada no repository adapter; o serviço recebe um contrato por injeção.
- Toda operação continua filtrada pelo `userId` da autenticação; confirmação de propriedade ocorre antes da mutação e novamente no `updateMany`.
- Testes de regras e isolamento por usuário adicionados; CI e testes de integração reais **precisam rodar antes do merge**.

## Sequência recomendada

1. **PR inicial:** endereços e bloqueio de imports do DB em rotas novas.
2. **Cupons:** extrair elegibilidade para caso de uso, consultas para repository, preservar tenant tests.
3. **Chamados NFC:** extrair status e locking por transação com E2E.
4. **NFC cadastro/cartões:** extrair endpoints gradualmente, começar leitura/consulta e avançar para emissão/reset apenas após suite de regressão.
5. **NFC comandas/pagamentos:** refatorar por caso de uso, sem mudar idempotência, locks, RLS, autorização e CPF.
6. **Divisão de roteadores extensos:** organizar somente após cobertura para preservar registro e ordem das rotas.
7. **Crescimento real:** métricas de queries, pool e filas; adicionar cache, réplicas ou orquestrador só mediante carga medida.

**Critério de pronto de cada PR:** lint sem warnings, typecheck, testes unitários, integração PostgreSQL real, E2E crítico, multi-tenant/RLS e contrato HTTP; nenhuma regra de CI deve ser enfraquecida.
