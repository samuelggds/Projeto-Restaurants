# Auditoria de confiabilidade — backend e banco

Referência: HEAD `7e27903`, inspecionado em 08/09/2026. Esta etapa foi somente leitura do código de produção. A reprodução abaixo usa o serviço real com Prisma e repositório simulados dentro de um processo isolado; não abre banco, não chama gateway e não exclui dados reais.

## Resultado

O núcleo já tem transações, isolamento por restaurante, validação de itens, unicidade no banco e proteção contra repetição. Não é necessário reconstruí-lo. Os pontos de maior prioridade estão nas falhas ambíguas de gateway e no cancelamento/estorno de pagamentos da conta da mesa. Os testes atuais aprovados não cobrem integralmente esses cenários.

### 1. P1 — falha ao iniciar pagamento pode apagar pedido que já foi pago

**Confirmado no serviço com reprodução simulada.** `CreateOrderPixPaymentController.ts:87` executa a limpeza após qualquer exceção de `createPixPayment`. `OrderPixPaymentService.ts:1049` lê o pedido, devolve estoque e o exclui sem exigir `paid: false` ou estado pendente. O caminho de cartão repete essa lógica em `CreateOrderCardCheckoutService.ts:85`. `OrderRepository.ts:530` exclui filtrando apenas ID e restaurante.

Cenário: o gateway aceita a criação, mas a resposta sofre timeout/erro; um webhook já confirmou o pagamento quando a limpeza consulta o pedido. O código ainda devolve estoque e remove o pedido. Mesmo sem webhook já confirmado, excluir o registro depois de uma resposta ambígua remove a referência necessária à conciliação posterior. A proteção existente no bloco de falha ao **vincular** o checkout não cobre a falha ao **criar** o checkout.

Arquivos:

- `backend/src/modules/orders/controllers/CreateOrderPixPaymentController.ts:87`
- `backend/src/modules/orders/services/OrderPixPaymentService.ts:1049`
- `backend/src/modules/orders/services/CreateOrderCardCheckoutService.ts:85`
- `backend/src/modules/orders/repositories/OrderRepository.ts:530`

**Reprodução executada:** no diretório `backend`, usando `node scripts/runTsxWithOsUserInfoFallback.cjs -e` com este corpo:

```ts
import prisma from './src/config/prisma.ts';
import repository from './src/modules/orders/repositories/OrderRepository.ts';
import pix from './src/modules/orders/services/OrderPixPaymentService.ts';

async function main() {
  const writes = [];
  const tx = {
    order: { findFirst: async () => null },
    product: {
      updateMany: async (args) => {
        writes.push(args);
        return { count: 1 };
      },
    },
  };
  prisma.$transaction = async (callback) => callback(tx);
  repository.findById = async () => ({
    id: 91,
    restaurantId: 7,
    paid: true,
    status: 'PREPARANDO',
    items: [{ productId: 5, quantity: 2 }],
  });
  repository.deleteById = async (id, restaurantId) => {
    writes.push({ deleteOrder: id, restaurantId });
  };
  await pix.removePendingOrderAfterPaymentFailure({ orderId: 91, restaurantId: 7 });
  console.log(JSON.stringify({ scenario: 'cleanup-after-concurrent-confirmation', writes }));
}
main();
```

Saída observada (exit code 0):

```json
{"scenario":"cleanup-after-concurrent-confirmation","writes":[{"where":{"id":5,"restaurantId":7,"stock":{"gte":0}},"data":{"stock":{"increment":2},"active":true}},{"deleteOrder":91,"restaurantId":7}]}
```

Não foi reproduzida uma corrida contra um gateway real. A reprodução comprova a decisão insegura do serviço quando recebe o estado que essa corrida produziria. A correção deve preservar o registro em falhas ambíguas e conciliar o provedor; não basta repetir a cobrança ou apenas acrescentar uma checagem anterior à exclusão.

### 2. P1 — cancelamento online da conta da mesa não cancela o gateway e pode declarar que não há pendência

**Confirmado por rastreamento dos controllers e serviços.** O singleton usado por `CancelTablePaymentIntentController` instancia `CancelTablePaymentIntentService` com `fakePaymentProvider` (`:18`). O serviço marca o pagamento local como cancelado; depois, só chama cancelamento remoto quando `intent.provider === this.provider.code` (`:115`). Para um pagamento real, essa condição é falsa e `providerCancellationPending` permanece `false` (`:111`, `:145`). A cobrança remota pode continuar disponível ao cliente.

O estorno online também não está implementado neste fluxo: `RefundTablePaymentService.ts:23` usa o provider fake por padrão e `:68` recusa um provider real. Mesmo usando o adapter configurado, `ConfiguredTablePaymentProvider.ts:511` e `:515` apenas lançam erros para cancelamento e estorno. `ProcessTablePaymentWebhookService.ts:157` depende justamente de `refundPayment` para pagamento tardio, portanto essa recuperação não está pronta para os providers configurados.

Isso é uma lacuna funcional no código, independentemente de existir credencial válida. O estorno de pedidos individuais tem implementação própria mais avançada; não deve ser confundido com o estorno da conta agregada da mesa.

### 3. P2 — cancelamento reativa produto desativado manualmente

`backend/src/modules/orders/services/restoreOrderItemsStock.ts:35` incrementa estoque e sempre grava `active: true` (`:42`). O mesmo comportamento aparece na saída da reprodução acima. Se o administrador desativar o produto depois de receber o pedido, cancelar esse pedido pode colocá-lo novamente à venda. `UpdateProductService.ts:39` permite alteração explícita de disponibilidade sem alterar estoque; o restauro não distingue esse bloqueio manual da desativação automática por estoque zerado.

### 4. P2 — proteção do DTO ainda não cobre detalhes e todos os eventos de pedidos

`OrderListRepository.ts:23` omite os campos privados na listagem nova; a criação também remove `creation*`. Entretanto, `GetOrderByIdController.ts:19` devolve diretamente o objeto de `GetOrderByIdService`, que usa consultas com `include` e todos os campos escalares de `Order` (`OrderRepository.ts:568`). Isso devolve, por exemplo, `creationActor`, `creationRequestKey`, `creationFingerprint`, `refundIdempotencyKey` e o campo armazenado de PIN quando preenchidos. Serviços de mudança de estado/pagamento também publicam esse objeto completo em eventos.

Os PINs novos são HMAC, não texto puro (`utils/paymentConfirmationPin.ts:20`); a inspeção **não** demonstrou obtenção do PIN nem bypass de confirmação. O problema confirmado é a exposição desnecessária e inconsistente de metadados internos. A solução deve usar DTOs nas fronteiras públicas preservando os campos necessários às regras internas.

### 5. P2 — confirmações concorrentes podem repetir notificações de pagamento

`OrderRepository.confirmPayment` protege a escrita e a impressão com atualização condicional: o segundo confirmador retorna o pedido já pago (`OrderRepository.ts:431`). Porém `FinalizeOrderCardPaymentService.ts:58` só verifica `paid` antes da transação e depois emite `new-order`/notificação sem saber se venceu a alteração (`:104`, `:113`). O PIX tem a mesma estrutura (`FinalizeOrderPixPaymentService.ts:98`, `:145`, `:154`).

Duas chamadas que inicialmente leram `paid: false` podem ambas chegar aos efeitos posteriores, mesmo quando só uma alterou o banco. Isso não significa duplicação de cobrança ou de estoque; significa possível duplicação de eventos e mensagens ao cliente. O cenário foi rastreado no código; não foi executado contra serviço de mensagens.

### 6. P2 — relatório de clientes contabiliza pedidos cancelados e valores que não foram recebidos

`OrderCustomerRepository.ts:21` usa `COUNT(*)`/`SUM(o.total)` e o filtro `:23`–`:25` não exclui `CANCELADO` nem exige pagamento. Assim, um cancelamento pode aumentar frequência, quantidade de pedidos e valor movimentado daquele cliente. `OrderReportsController.ts:17` exclui cancelados no indicador diário, mas usa data de criação e não exige pagamento; o campo `sales` representa total de pedidos operacionais, não necessariamente recebimentos do dia.

O efeito das consultas está confirmado; a classificação do indicador diário depende da definição de negócio. Convém definir separadamente pedidos, vendas concluídas, recebimentos e estornos antes de usar os números como relatório financeiro.

## Modelos e proteções que já estão bons

- `CreateOrderService.ts:572` envolve a criação inteira em transação `Serializable`, com retry limitado e contexto RLS antes das consultas (`:574`). A baixa de estoque é condicional e considera quantidade agregada por produto (`:886`). Impressão participa da transação; eventos só são publicados depois do commit.
- O índice `Order_restaurantId_creationActor_creationRequestKey_key` protege a tentativa por restaurante/ator/chave, e a migration `20260908110000_order_creation_idempotency` exige os três campos de criação preenchidos em conjunto. Reenvio compatível retorna o pedido sem reemitir os eventos da criação.
- `Order.pixPaymentId` é único (`schema.prisma:741`); `claimPixPaymentId` verifica proprietário e trata colisão de índice. Confirmação paga/cancelamento usam atualização condicional. O fluxo de estorno individual usa chave estável e registra sucesso financeiro antes de concluir a parte operacional (`CancelOrderWorkflowService.ts:331`).
- A migration `20260825190000_add_table_participants:57` mantém índice parcial de uma sessão ativa por mesa; `20260825190500_enforce_table_session_tenant:9` vincula sessão e mesa pelo restaurante. As migrations de participantes/conta usam FKs compostas para impedir associações cruzadas entre restaurante, sessão, participante, pedido e item.
- `20260826100000_add_table_payment_intents:69` define checks monetários, validade de expiração e referências do provider. Há unicidade de chave de idempotência, referência externa e deduplicação de eventos; alocações usam centavos e vínculos compostos.
- O contexto RLS usa `set_config(..., true)` local à transação (`database/tenantDbContext.ts:21`). A validação de runtime rejeita superuser, BYPASSRLS e owner das tabelas protegidas (`:59`). As proteções RLS são deliberadamente parciais, complementando filtros/autorização da aplicação; não cobrem todos os modelos.
- A listagem nova limita a página a 100 registros, usa cursor por ID, restringe o escopo pela função e consulta em contexto tenant (`PaginatedOrdersService.ts:34`; `OrderListRepository.ts:34`; `orderListQuery.ts:28`). Consultas do relatório usam parâmetros SQL em vez de interpolar valores livres em texto SQL.

## RLS e cobertura: o que está comprovado e o que falta

- Não confirmei o suposto bug de contexto em `OrderRepository.findById`: o `include` atual contém usuário/restaurante/mesa/participante/itens/produto, sem as relações privadas sujeitas às policies analisadas. A listagem antiga `findAll` inclui `issueThread` sem contexto, mas o controller atual usa o serviço paginado com contexto; não apresentar o método antigo como falha da rota atual.
- Há um ponto específico para futura regressão: `PaginatedOrdersService.mine:69` usa transação sem tenant para cliente global (`restaurantId` nulo). `readOrderPage` inclui `issueThread`, que exige contexto RLS. O próprio pedido continua filtrado por usuário, mas o thread pode aparecer vazio e o filtro `issuesOnly` pode omitir resultados legítimos. Não foi reproduzido nesta auditoria; não é evidência de vazamento entre tenants.
- A busca atual encontrou `retryOrderTransaction` somente na criação de pedidos. Fluxos serializáveis de criar/fechar/pagar conta da mesa e processar seus eventos ainda não têm o mesmo retry de P2034. O banco continua protegendo a consistência; a lacuna é disponibilidade/retomada sob conflito.
- `artifacts/auditoria-completa-backend-tests.log`: **963 testes aprovados**, zero falhas. `artifacts/auditoria-completa-tenant-e2e.log`: **54 cenários aprovados em PostgreSQL descartável**, incluindo duas criações concorrentes com a mesma chave, isolamento HTTP e Socket.IO. Esses logs foram lidos nesta auditoria, não produzidos pelo probe.
- `artifacts/implementation-rls-e2e.log` registra **21 testes RLS aprovados** em execução anterior. Inclui leitura sem contexto, escrita adulterada e contextos A/B concorrentes no pool. Não é uma nova execução RLS desta etapa.
- Antes da varredura somente leitura, foram executados e aprovados 13 testes direcionados de criação/controller/replay e 4 do helper frontend; typecheck de backend/frontend também passou. As correções desses arquivos já estavam incorporadas ao HEAD analisado.
- Não encontrei testes dedicados para `readOrderPage`, `readCustomerPage`, parser de paginação e paginação completa de múltiplas páginas. O E2E atual confirma a estrutura `orders` e isolamento, mas não esgota limites/cursor/filtros/contagem do novo contrato. O agente principal está cuidando dessa validação.

Não executei novas migrations, não alterei schema, não acessei banco externo e não fiz chamadas a gateways. Nenhuma correção de produção foi feita durante esta varredura.
