# Open Finance Mercado Pago em produção

O GastroNexa oferece três jornadas online separadas ao cliente:

1. **Pix QR Code / copia e cola**: continua usando o Pix direto já integrado ao Mercado Pago.
2. **Cartão**: continua usando o fluxo de cartão já integrado.
3. **Open Finance**: cria uma Order de Checkout Pro com a conta Mercado Pago conectada ao restaurante e redireciona o comprador para o ambiente seguro do Mercado Pago.

## O que o botão Open Finance faz

O GastroNexa não recebe senha bancária e não lista instituições financeiras por conta própria. Ao escolher **Open Finance**, o backend cria uma Order pela API de Orders do Mercado Pago e recebe um `checkout_url` HTTPS.

O comprador é redirecionado ao Checkout Pro. O Mercado Pago é responsável por exibir os meios elegíveis naquele checkout, incluindo Open Finance quando disponível para a conta/comprador.

Não existe no código um identificador inventado para forçar Open Finance. Caso o Mercado Pago altere disponibilidade, elegibilidade ou catálogo, a integração permanece compatível com o Checkout Pro oficial.

## Credenciais

Não existem credenciais adicionais de Open Finance no GastroNexa.

Cada restaurante usa a mesma conexão OAuth Mercado Pago já existente:

- access token por restaurante;
- refresh token por restaurante;
- renovação automática;
- credenciais criptografadas no banco;
- sem fallback global em produção multi-tenant.

Para o Open Finance ser publicado no cardápio, o restaurante precisa:

- ter `openFinancePixEnabled=true`;
- ter a conta Mercado Pago conectada com access token e refresh token;
- manter a configuração OAuth da plataforma e webhook do Mercado Pago válidos.

## Criação da Order

Endpoint local:

```text
POST /orders/open-finance/payment
```

O backend:

- cria o pedido local como pagamento online pendente;
- usa `external_reference=orderopenfinance_<restaurantId>_<orderId>`;
- cria uma Order Checkout Pro via `POST /v1/orders`;
- usa chave de idempotência determinística do pedido;
- salva `pixPaymentId=mp_open_finance_order:<orderIdMercadoPago>`;
- retorna apenas um `checkout_url` HTTPS.

## Retorno seguro

As URLs de retorno não são aceitas do navegador. O backend monta todas a partir de `FRONTEND_URL` e do `slug/publicId` persistidos.

Formato:

```text
https://gastronexa.com.br/<slug>/pedido/<publicId>/pagamento?openFinanceReturn=<status>
```

O retorno do navegador nunca confirma pagamento sozinho.

## Webhook e reconciliação

O mesmo webhook oficial do Mercado Pago é usado:

```text
POST https://api.gastronexa.com.br/orders/webhook/mercadopago
```

Para uma Order Open Finance, o backend:

- localiza o pedido por `mp_open_finance_order:<orderId>`;
- consulta novamente `GET /v1/orders/{id}` usando a credencial do restaurante;
- valida `external_reference`, restaurante, pedido, valor e moeda;
- exige status `processed`;
- somente então marca o pedido como pago;
- trata notificações repetidas de forma idempotente.

Notificações da API de Payments com a referência Open Finance são reconhecidas, mas a Order é a fonte canônica desse fluxo.

## Status consultado pelo cliente

A página de acompanhamento recupera o pedido pelo `publicId`, consulta a Order no backend e exibe estado pendente/confirmado sem mostrar QR Code.

## Estorno

Pedidos Open Finance usam:

```text
POST /v1/orders/{orderIdMercadoPago}/refund
```

O backend usa a credencial OAuth do restaurante e uma chave de idempotência do estorno. O pedido só é cancelado depois que o provedor confirma o fluxo esperado pelo serviço de estorno.

## Requisitos de produção

Antes de habilitar para clientes reais:

- aplicação Mercado Pago com credenciais de produção ativas;
- OAuth de produção funcionando para cada restaurante;
- HTTPS em frontend e backend;
- segredo de webhook Mercado Pago configurado;
- URL pública de webhook disponível;
- `ALLOW_GLOBAL_PAYMENT_FALLBACK=false`;
- teste real controlado de baixo valor;
- teste de retorno aprovado, pendente e cancelado;
- teste de webhook repetido;
- teste de estorno da Order.

## Limitação intencional

O Checkout Pro pode apresentar mais de um meio de pagamento. O Mercado Pago divulga Open Finance como disponível no Checkout Pro, mas o GastroNexa não depende de um ID interno não documentado para restringir o checkout exclusivamente a Open Finance.

Na interface do GastroNexa, a opção é apresentada como **Open Finance via Mercado Pago**, e o texto informa que a disponibilidade final é definida pelo Mercado Pago no checkout.
