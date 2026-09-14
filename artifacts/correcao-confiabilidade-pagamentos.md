# Correção de confiabilidade dos pagamentos — 08/09/2026

## Resultado implementado

- Exceções na criação externa de PIX/cartão preservam o pedido, a reserva de estoque e o cupom. Removido o caminho que apagava inclusive um pedido confirmado por webhook durante um timeout. O HTTP responde `502 / PAYMENT_CREATION_UNCERTAIN`, `reconciliationRequired`, identificadores do pedido e, para convidados, os tokens de acesso correspondentes. A resposta não contém a mensagem interna do gateway.
- Retirada cancelada não inicia nem confirma pagamentos. Reserva da tentativa, confirmação em dinheiro e cancelamento disputam o mesmo bloqueio PostgreSQL da linha `Order`; a transação termina antes da chamada externa.
- A tentativa fica em `DeliveryPayment`, com identidade persistente e método/provedor/valor/terminal preservados. Uma cobrança pendente impede dinheiro, troca de método/terminal e cancelamento local falso.
- Retomada de Mercado Pago PIX, Point e PagBank usa a mesma chave por tentativa. A retomada automática de POST fica limitada a uma hora e a tentativas novas com chave conhecida. Tentativas antigas desconhecidas exigem conciliação.
- Retomada Asaas consulta a cobrança por `externalReference`, valida quantidade de resultados, referência e valor, e recupera o QR existente. Busca vazia/divergente nunca autoriza outro POST. A API documenta `externalReference` como filtro, sem garantia de unicidade: https://docs.asaas.com/reference/listar-cobrancas.
- Confirmação da retirada usa CAS com tenant, tipo, estado não cancelado, `paid=false` e método ainda não definido. Pagamento, tentativa e consumo do cupom são confirmados na mesma transação. Repetições mantêm a primeira data e não repetem os eventos.
- Webhook PIX utiliza essa confirmação da retirada depois da validação canônica de referência/valor/moeda; não deixa `paid=true` com método nulo. Os finalizadores comuns PIX/cartão também limitam eventos e notificações ao commit que efetivamente confirmou o pagamento.
- Webhook Point autenticado encaminha retiradas para o mesmo reconciliador usado pela consulta no balcão; pagamentos de entrega conservam o fluxo anterior. A retirada valida referência, tipo Point e valores. Falhas de conciliação continuam retornando 500 para permitir nova entrega do webhook, com logs sanitizados.

## Arquivos principais

- `backend/src/modules/orders/services/PaymentCreationUncertainError.ts`
- `backend/src/modules/orders/controllers/CreateOrderPixPaymentController.ts`
- `backend/src/modules/orders/controllers/CreateOrderCardCheckoutController.ts`
- `backend/src/modules/orders/services/CreateOrderCardCheckoutService.ts`
- `backend/src/modules/orders/services/OrderPixPaymentService.ts`
- `backend/src/modules/orders/services/FinalizeOrderPixPaymentService.ts`
- `backend/src/modules/orders/services/FinalizeOrderCardPaymentService.ts`
- `backend/src/modules/orders/services/CancelOrderWorkflowService.ts`
- `backend/src/modules/pickupPayments/services/PickupPaymentService.ts`
- `backend/src/modules/pickupPayments/services/pickupPaymentPersistence.ts`
- `backend/src/modules/paymentTerminals/controllers/MercadoPagoPointWebhookController.ts`

Nenhuma alteração de schema/migration, frontend ou repositório compartilhado foi necessária nesta etapa.

## Validação executada pelo agente

`npm run typecheck`: aprovado.

ESLint nos 14 arquivos alterados/adicionados desta etapa com `--max-warnings 0`: aprovado.

```powershell
node scripts/runTsxWithOsUserInfoFallback.cjs --test src/modules/orders/controllers/CreateOrderPixPaymentController.test.ts src/modules/orders/services/CreateOrderCardCheckoutService.test.ts src/modules/orders/services/OrderPixPaymentRetry.test.ts src/modules/orders/services/CancelOrderWorkflowService.test.ts src/modules/orders/services/OrderPixPaymentSecurity.test.ts src/modules/orders/services/OrderPixPaymentCustomizations.test.ts src/modules/orders/controllers/PaymentWebhookHardening.test.ts src/modules/orders/services/PendingPaymentLifecycle.test.ts
```

Resultado: **53 testes aprovados, zero falhas**. São testes locais com mocks; não acessam bancos ou gateways externos.

Teste adicional `node scripts/runTsxWithOsUserInfoFallback.cjs --test src/modules/paymentTerminals/controllers/MercadoPagoPointWebhookController.test.ts`: **4 aprovados**, cobrindo encaminhamento retirada/entrega, assinatura inválida e erro sem vazamento. Typecheck e lint foram novamente aprovados após essa ponte. Total direcionado: **57 aprovados**.

Novo `backend/src/e2e/multiTenant/pickupPayments.e2e.ts` cobre oito cenários com HTTP e PostgreSQL reais e somente a borda do gateway simulada: bloqueio por cancelamento/tenant; confirmações concorrentes em dinheiro; corrida cobrança/dinheiro/troca/cancelamento; retomada PIX após timeout; webhook PIX que vence a resposta; cancelamento antes da reserva; retomada Point com dois webhooks assinados concorrendo com a consulta; efeitos únicos dos finalizadores PIX/cartão. **A execução desse E2E foi delegada ao root, junto da suíte tenant descartável.** O arquivo não representa evidência de aprovação até o runner registrar o resultado.

## Limites conhecidos

- PIX/cartão do checkout inicial agora preservam o pedido e retornam a informação necessária à conciliação; este escopo não adicionou idempotência de criação a esses endpoints externos. O frontend deve tratar `PAYMENT_CREATION_UNCERTAIN` como recuperação do pedido existente, evitando criar outro checkout.
- Asaas com resultado ambíguo sem cobrança localizável permanece em conciliação. Não há recriação automática baseada apenas em busca vazia ou timeout.
- Uma confirmação financeira tardia ou uma tentativa antiga sem identidade segura não é motivo para liberar estoque, apagar pedido ou cobrar novamente.
- Não foram feitas cobranças reais nem usadas credenciais de produção.
