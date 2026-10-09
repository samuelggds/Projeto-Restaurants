# GastroNexa: entregadores próprios e parceiros externos

## Produto

Cada restaurante poderá usar **motoboys próprios**, **parceiros externos** ou **ambos**,
com escolha por pedido. A opção por terceirizar não altera o controle dos motoqueiros
cadastrados pelo restaurante nem o cálculo de remuneração dos entregadores próprios.

**Primeiro fornecedor: Lalamove.** API oficial: https://developers.lalamove.com/

## Implementado nesta primeira etapa

- Cliente de backend Lalamove v3 (cotação, contratação explícita, consulta de pedido,
  cancelamento e consulta de cidades) com assinatura HMAC-SHA256, mercado BR e
  endereços fixos de sandbox/produção.
- Bloqueio de produção por padrão; não há chamadas automáticas, rotas públicas
  ou credenciais no repositório.
- Política para exigir tenant correto, conta conectada ao restaurante, pagamento
  confirmado, pedido pronto, ausência de motoboy próprio, ausência de contratação
  ativa/incerta e cotação válida aprovada pelo administrador.
- Testes com HTTP simulado que não cobram frete nem chamam um motorista real.

**Esta etapa NÃO habilita contratação no painel:** ainda faltam persistência,
endpoints autenticados, conexão das contas, webhooks e homologação com a Lalamove.

## Próximas etapas obrigatórias

1. Confirmar com a Lalamove o contrato SaaS multi-tenant: cada restaurante
   usa credenciais e conta de cobrança próprias, sem misturar saldo ou frete.
2. Guardar credenciais criptografadas por restaurante e separar sandbox/produção.
   Não expor chaves em frontend, respostas da API, logs ou repositório.
3. Persistir despachos externos por pedido com chaves estrangeiras compostas
   (orderId, restaurantId), proteção RLS fail-closed, transações e índices
   contra dupla contratação.
4. Introduzir endpoints de cotação e aprovação pelo ADMIN, sem contratar
   automaticamente; revalidar status, tenant e pagamento na mesma transação.
5. Tratar timeout de contratação como estado UNCERTAIN; reconciliar antes
   de tentar novamente para evitar contratar dois motoboys.
6. Processar webhooks autenticados e idempotentes, sincronizar rastreamento
   sem usar o modelo de usuário MOTOQUEIRO dos entregadores próprios.
7. Modelar custos, cancelamentos e estornos dos fretes de parceiros separadamente
   do financeiro de pedidos e da compensação dos motoboys próprios.
8. Acrescentar as opções OWN_ONLY, PARTNER_ONLY, BOTH ao painel do restaurante,
   habilitando o parceiro apenas com credenciais e cobertura verificadas.
9. Passar por lint, typecheck, testes unitários, integração, E2E e isolamento
   antes da liberação de entregas reais.

## Regras de custo e segurança

A cotação do frete da Lalamove NÃO altera automaticamente a taxa já paga pelo
cliente no checkout. Qualquer diferença e quem arcará com ela precisam de
regra comercial explícita, aprovada pelo restaurante. Nesta primeira etapa,
despacho externo exige pedido previamente pago: coleta de dinheiro/cartão
pela transportadora não foi autorizada.

Produção exige credenciais com prefixos pk_prod / sk_prod, saldo na carteira
do fornecedor e aceitação expressa do contrato aplicável.

## Conexão assistida pelo painel (pré-homologação)

O botão **Solicitar conexão assistida** fica em Admin > Configurações > Entregas.
GET \`/settings/delivery-partners/lalamove\` consulta o status; POST
\`/settings/delivery-partners/lalamove/request\` registra a solicitação
**sem campos de credenciais**. Ambas as rotas exigem autenticação e perfil ADMIN.

Cada solicitação é persistida em \`RestaurantExternalDeliveryOnboarding\`
com o \`restaurantId\` da sessão e quem fez o pedido. Há unicidade
\`(restaurantId, provider)\`, vínculo composto com \`User\`, RLS
\`ENABLE/FORCE\` fail-closed e requisições duplicadas não criam novas linhas.

O retorno **sempre** inclui \`connected: false\` e \`canDispatch: false\`.
Registrar a solicitação **não** cria carteira nem conta Lalamove, não faz
OAuth, não capta chaves e não autoriza entregas reais.

A documentação oficial atualmente prevê obter API Key e API Secret no
Partner Portal e autenticação HMAC. **Não anunciar conexão por um clique**
sem confirmação de acordo de parceria e autorização apropriada.
A fila operacional, onboarding seguro da conta e aprovação do fornecedor
são próximas etapas separadas.
