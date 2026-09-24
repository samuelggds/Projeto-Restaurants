# Open Finance / Belvo em produção

Este documento descreve o fluxo de produção do GastroNexa para Pix via Open Finance usando a Belvo.

## Arquitetura

- O cliente escolhe **Pix pelo app do banco** no checkout.
- O frontend consulta os bancos disponíveis em `GET /orders/open-finance/institutions`.
- O backend cria uma Payment Intent da Belvo usando a chave Pix beneficiária cadastrada pelo restaurante.
- O cliente é redirecionado para o banco por uma URL HTTPS retornada pela Belvo.
- O retorno do navegador não confirma pagamento por si só.
- O pagamento é considerado concluído somente quando a API da Belvo confirma `SUCCEEDED`.
- O webhook de pagamentos também dispara reconciliação canônica no backend.
- O pedido só muda para pago depois da validação de tenant, Payment Intent, `external_id`, valor e moeda.

## Produção

No ambiente de produção do backend configure:

```env
BELVO_PAYMENTS_ENABLED=true
BELVO_ENV=production
BELVO_SECRET_ID=<secret id de Payments da Belvo>
BELVO_SECRET_PASSWORD=<secret password de Payments da Belvo>
BELVO_WEBHOOK_TOKEN=<token aleatório com pelo menos 32 caracteres>
```

Não envie essas credenciais pelo chat, não coloque em arquivos versionados e não exponha no frontend.

O token do webhook pode ser gerado, por exemplo, com um gerador criptograficamente seguro do gerenciador de segredos usado no deploy.

## Webhook da Belvo

No dashboard de **Payments** da Belvo, registre:

- URL: `https://api.gastronexa.com.br/orders/webhook/belvo`
- Authorization: `Bearer <mesmo valor de BELVO_WEBHOOK_TOKEN>`

O endpoint aceita apenas eventos V1 de `PAYMENT_INTENTS` com `STATUS_UPDATE` para reconciliação financeira.

A Belvo recomenda permitir os IPs de saída publicados por ela no firewall/reverse proxy, além do token Bearer.

## Conta beneficiária e chave Pix

A solução atual usa o fluxo de Payment Intent com **chave Pix**.

Cada restaurante que ativar Open Finance deve informar na tela **Configurações > Pagamentos** uma chave Pix que pertença à conta que receberá o pagamento. A chave é usada somente no fluxo Open Finance; o Pix normal do Mercado Pago continua sendo gerado pela conta Mercado Pago conectada.

A ativação pública do Open Finance exige simultaneamente:

- credenciais Belvo de produção configuradas;
- `BELVO_PAYMENTS_ENABLED=true`;
- `BELVO_ENV=production`;
- restaurante com `acceptsPix=true`;
- `openFinancePixEnabled=true`;
- chave Pix beneficiária preenchida.

## Callback

O callback é gerado pelo backend a partir de `FRONTEND_URL` e retorna para:

```text
https://gastronexa.com.br/<slug>/pedido/<publicId>/pagamento?openFinanceReturn=1
```

O callback apenas devolve o cliente à aplicação. O status financeiro é consultado na Belvo antes de confirmar o pedido.

## Idempotência

A criação e a confirmação da Payment Intent usam chaves de idempotência derivadas do restaurante e do pedido. O `external_id` também é determinístico por pedido. Assim, reenvios não podem criar uma cobrança para outro pedido.

## Webhook e reconciliação

Webhooks são autenticados por token Bearer. Para eventos `SUCCEEDED`, o backend consulta novamente a Payment Intent na Belvo e só confirma o pedido quando:

- o ID da Payment Intent corresponde ao ID persistido;
- o `external_id` corresponde ao pedido;
- o valor corresponde exatamente ao total;
- a moeda é BRL;
- o tenant/restaurante corresponde ao pedido.

Eventos repetidos são idempotentes.

## Cancelamento e estorno

### Antes da liquidação

Uma Payment Intent que ainda não foi liquidada não deve ser tratada como pagamento estornado. O pedido pode ser cancelado somente depois que o fluxo financeiro estiver em estado seguro e conciliado.

### Depois da liquidação

O endpoint público documentado pela Belvo para Payment Intents não oferece uma operação de devolução automática de um Pix imediato já liquidado. Por esse motivo, o GastroNexa **não envia pagamentos Belvo para o Mercado Pago, Asaas ou Stripe para tentar estornar**.

Quando um Pix Open Finance já pago precisar ser devolvido:

1. faça a devolução pela conta bancária beneficiária usando o mecanismo Pix da instituição recebedora;
2. preserve o comprovante/EndToEndId da devolução;
3. faça a conciliação administrativa antes de concluir o cancelamento no sistema.

Até existir uma API oficial de devolução aplicável ao produto contratado, o sistema falha fechado e não marca o pedido como estornado automaticamente.

## Homologação antes de liberar clientes

Antes de ativar `BELVO_PAYMENTS_ENABLED=true` no tráfego real:

1. confirmar que a conta Belvo possui Payments/OFPI habilitado em produção;
2. usar as chaves de **Payments** de produção, não as chaves de agregação;
3. registrar o webhook de produção com Bearer token;
4. validar pelo menos um pagamento real de baixo valor previamente combinado;
5. conferir redirecionamento para o banco e retorno ao GastroNexa;
6. conferir webhook `PAYMENT_INTENTS / STATUS_UPDATE`;
7. conferir que o pedido só muda para pago após `SUCCEEDED`;
8. testar repetição de webhook e de callback;
9. testar falha/cancelamento no banco;
10. validar procedimento de devolução e conciliação.

Não faça cobranças reais sem valor e pagador previamente combinados.
