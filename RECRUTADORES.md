# GastroNexa — visão técnica para recrutadores

**Projeto independente de desenvolvimento Full Stack**  
**Produto:** https://www.gastronexa.com.br/  
**Código:** https://github.com/samuelggds/Projeto-Restaurants

## O problema

Restaurantes precisam centralizar cardápio, pedidos, mesas, cozinha, delivery, pagamentos e diferentes perfis operacionais. O desafio de uma plataforma compartilhada é permitir que vários restaurantes utilizem a mesma aplicação sem misturar dados ou permissões.

## Minha atuação

Conduzo as decisões de produto e implementação da GastroNexa, trabalhando em interfaces React, APIs Node.js, persistência PostgreSQL/Prisma, autenticação, integrações de pagamento e infraestrutura. É um **projeto independente**, não um emprego formal anterior nem prova de operação comercial em determinada escala.

## Stack

- **Frontend:** React, TypeScript, Vite, Styled Components e Socket.IO client.
- **Backend:** Node.js, TypeScript, Express, APIs REST e Socket.IO.
- **Dados:** PostgreSQL e Prisma ORM.
- **Infraestrutura e entrega:** Docker, GitHub Actions e serviços AWS.
- **Qualidade:** testes unitários, integração e E2E, Playwright, lint, typecheck e verificação de migrations.

## Três decisões técnicas importantes

### 1. Isolamento multi-tenant e autorização

Cada restaurante utiliza um identificador próprio. A política deve ser validada no backend a partir da identidade autenticada, sem depender apenas de valores enviados pelo navegador. Consultas e operações sensíveis devem considerar o restaurante e o papel do usuário.

**Evidência no repositório:** [Arquitetura](ARCHITECTURE.md) · [Pipeline E2E de segurança multi-tenant](.github/workflows/ci.yml)

### 2. Pagamentos e consistência dos pedidos

Integrações com Mercado Pago e notificações de pagamento exigem tratamento de estados, duplicidade e concorrência. Os testes do repositório abordam idempotência de confirmação, sincronização financeira de pedidos da mesa e bloqueio de confirmação tardia de pedidos cancelados.

**Evidência:** [Testes de concorrência e confirmação financeira](backend/src/modules/orders/repositories/OrderRepositoryPaymentCas.test.ts)

### 3. Testar na camada adequada ao risco

Regras puras têm testes unitários; autorização, banco e pagamentos demandam integração; jornadas entre perfis e telas são verificadas por E2E quando necessário. O pipeline inclui lint, TypeScript, verificações de banco e diferentes suítes de testes.

**Evidência:** [Estratégia de testes](TESTING.md) · [Pipeline de CI](.github/workflows/ci.yml)

## O que examinar em cinco minutos

1. [Arquitetura e estrutura dos módulos](ARCHITECTURE.md).
2. [Riscos e estratégia de testes](TESTING.md).
3. [Teste de concorrência/idempotência](backend/src/modules/orders/repositories/OrderRepositoryPaymentCas.test.ts).
4. [Testes de autenticação e bloqueio de acesso](backend/src/middlewares/authMiddleware.integration.test.ts).
5. [CI/CD](.github/workflows/ci.yml).

Para visualizar telas e a jornada do produto, consulte o [README visual](README.md). As imagens exportadas do Figma são referências de design, não necessariamente capturas do ambiente de produção.

---

**Contato profissional:** [GitHub](https://github.com/samuelggds) · [LinkedIn](https://www.linkedin.com/in/samuel-gomes08/)

> Este documento descreve escopo e evidências disponíveis para revisão. A existência dos testes e das configurações no repositório não substitui executar a suíte e auditar a implantação.
