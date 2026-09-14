# Auditoria dos pagamentos do administrador

Verificação em 12/09/2026. Commit observado: `5157936`, branch `fix/frontend-docker-npmrc`.

**Resultado: a configuração ainda não está completa para o restaurante conectar uma conta e receber automaticamente por todos os meios oferecidos.** Existem fluxos implementados, mas também bloqueios de configuração e incompatibilidades no código.

Escopo: recebimentos dos pedidos dos restaurantes, na área Configurações → Pagamentos. Não é o Pix de mensalidade cobrado pelo dono da plataforma. Auditoria de código, documentação oficial, presença de variáveis e testes com respostas simuladas. Não houve alteração de código, conexão a contas de vendedores, criação de subconta ou pagamento real.

## O que cada botão faz atualmente

| Provedor | Automação existente | O que impede considerar pronto |
| --- | --- | --- |
| Mercado Pago | Redireciona para autorização e salva o token do restaurante no retorno. Define Pix e cartão Mercado Pago. | Não renova o token; notificações e cadastro de cartões dependem de configuração da aplicação que o botão não verifica. |
| PagBank | Redireciona ao Connect e salva token, refresh token e validade. Define Pix e cartão PagBank. | Cartão exige e-mail não salvo pelo Connect; checkout ainda usa API legada; não existe renovação dos tokens. |
| Asaas | Cria uma subconta com os dados cadastrais e salva identificação/credencial retornadas. | Não provisiona notificações; receptor diverge do contrato dos eventos; vínculo não comprova aprovação cadastral nem credencial utilizável. |

Mercado Pago e PagBank exigem autorização do titular no provedor. O cadastro Asaas depende dos dados e da habilitação da conta. Essas etapas externas não podem ser tratadas como aprovação silenciosa feita pelo sistema.

## 1. Configuração de produção local incompleta

Foi resolvido, sem iniciar serviços, o comando `docker compose --env-file .env.production -f docker-compose.production.yml config --format json`. Apenas presença/ausência foi registrada; valores de credenciais não foram exibidos.

No ambiente resolvido do serviço `backend`:

| Grupo | Resultado |
| --- | --- |
| Mercado Pago OAuth | `MP_OAUTH_CLIENT_ID` e `MP_OAUTH_CLIENT_SECRET` vazios. Aliases também ausentes do arquivo local. |
| Mercado Pago, cadastro de cartões | `MP_PUBLIC_KEY` e `MERCADO_PAGO_PUBLIC_KEY` vazios. |
| Mercado Pago, notificações | `MP_WEBHOOK_SECRET` e `MP_WEBHOOK_SECRETS` vazios. |
| PagBank Connect | `PAGBANK_CONNECT_CLIENT_ID`, `PAGBANK_CONNECT_CLIENT_SECRET` e `PAGBANK_CONNECT_PLATFORM_TOKEN` vazios. |
| Asaas | `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `ASAAS_WITHDRAW_WEBHOOK_TOKEN` vazios. |
| Criptografia das credenciais | `CREDENTIAL_ENCRYPTION_KEY` preenchida; a validade da chave não foi examinada nesta auditoria. |

O `backend/.env` local tem algumas credenciais de Mercado Pago e Asaas preenchidas, mas isso não as disponibiliza automaticamente no Compose de produção. A configuração efetivamente implantada em servidor externo não foi consultada e pode receber variáveis por outro mecanismo.

## 2. Mercado Pago: conexão inicial sem renovação

O callback usa somente `access_token`; não persiste refresh token e expiração nem implementa renovação. O cliente de pagamentos continua usando a credencial armazenada, e o painel considera sua presença suficiente para indicar conexão.

Evidências: [callback OAuth](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/restaurantSettings/services/CompleteMercadoPagoOAuthService.ts:120), [cliente de pagamentos](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/payments/providers/mercadoPagoClient.ts:12).

Consequência: após expirar, a conexão pode continuar visualmente ativa enquanto pagamentos e consultas falham. A documentação prevê renovação do access token e armazenamento do novo refresh token. [Renovação oficial Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/renewal).

O receptor de notificações retorna 503 quando não há segredo configurado. O cadastro de cartões também exige uma Public Key configurada fora desse botão. Essa exigência do cadastro não deve ser confundida com o Checkout Pro hospedado. Usar a Public Key do integrador não é, por si, erro em uma integração de marketplace.

Evidências: [assinatura do webhook](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/payments/providers/mercadoPagoWebhookSignature.ts:55), [cadastro de cartões](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/customerPaymentMethods/routes/CustomerPaymentMethodRoutes.ts:122). [Credenciais oficiais](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials).

## 3. PagBank: conexão e checkout usam requisitos diferentes

O callback grava os tokens, mas não `pagbankEmail`. O checkout exige e-mail e token antes de escolher entre cartão salvo e checkout hospedado. Um restaurante que apenas autorizou o Connect pode, portanto, falhar na primeira cobrança por cartão.

Evidências: [callback PagBank](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/restaurantSettings/services/CompletePagBankOAuthService.ts:78), [validação do checkout](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/cardCheckoutProviders.ts:146).

Mesmo preenchendo o e-mail, o checkout sem cartão salvo envia o token obtido pelo Connect como `email/token` à API legada `/v2/checkout`. O contrato moderno usa `/checkouts` e autorização Bearer. Esse caminho precisa ser compatibilizado, não apenas ganhar outro campo na tela.

Evidência: [checkout legado utilizado](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/cardCheckoutProviders.ts:575). [Checkout atual](https://developer.pagbank.com.br/reference/criar-checkout), [credenciais do modelo legado](https://developer.pagbank.com.br/v1/reference/aplicacoes-utilizando-as-apis).

O refresh token e a expiração são gravados, mas não há rotina que os utilize para renovar a conexão. [Contrato de renovação PagBank](https://developer.pagbank.com.br/reference/renovar-access-token).

Há ainda uma incompatibilidade a homologar na autorização: o state enviado é um JWT de aproximadamente 315 caracteres no exemplo local, enquanto a documentação descreve um valor alfanumérico de até 128 caracteres. Não foi testada rejeição real pelo provedor. [Contrato Connect Authorization](https://developer.pagbank.com.br/docs/connect-authorization).

## 4. Asaas: cadastro da conta não conclui a confirmação automática

O POST de criação da subconta não inclui configuração de webhook, e não foi localizado provisionamento posterior de `/v3/webhooks`. Ter um endpoint receptor no GastroNexa e uma variável de token não cadastra a URL na subconta.

Evidência: [criação da subconta](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/restaurantSettings/services/OnboardRestaurantAsaasService.ts:199). [Criação de subcontas](https://docs.asaas.com/docs/criacao-de-subcontas), [configuração de webhook pela API](https://docs.asaas.com/docs/criar-novo-webhook-pela-api).

O receptor exige `payment.walletId`, mas o evento documentado identifica a conta em `account.id`; `walletId` aparece em dados de split. Um evento legítimo sem esse campo é ignorado. Além disso, `PAYMENT_CONFIRMED` é ignorado: esse evento representa pagamento efetuado, enquanto `PAYMENT_RECEIVED` representa disponibilização financeira. O checkout hospedado pode permanecer pendente mesmo depois da aprovação do cartão. A consulta de status desse fluxo apenas lê o estado local.

Evidências: [tratamento dos eventos](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/controllers/AsaasOrderWebhookController.ts:43), [exigência de walletId](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/controllers/AsaasOrderWebhookController.ts:53), [consulta de cartão](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/GetOrderCardPaymentStatusService.ts:25). [Contrato oficial dos eventos Asaas](https://docs.asaas.com/docs/webhook-para-cobrancas).

Criar subconta também não equivale a confirmar sua aprovação cadastral. O código não consulta status de aprovação; a interface marca a conta como vinculada após uma resposta bem-sucedida, inclusive quando o serviço retorna ausência de credencial. [Estado visual da conta](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/admin/components/PaymentSettings.tsx:198), [retorno do onboarding](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/restaurantSettings/services/OnboardRestaurantAsaasService.ts:266).

Outro caso: informar CPF pode conflitar com o CNPJ já salvo, pois o serviço reaproveita o CNPJ antes de respeitar a escolha explícita de CPF. A chave Pix digitada é salva localmente; não foi encontrada chamada para registrar essa chave no Asaas.

## 5. Estado da tela não representa prontidão para receber

“Configuração completa” verifica seleção, chave Pix preenchida e existência de token. Não verifica expiração, webhooks, aprovação de conta ou compatibilidade do checkout. Isso explica por que uma conexão pode aparecer pronta e ainda falhar no pagamento.

Evidência: [cálculo de prontidão](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/admin/components/PaymentSettings.tsx:125).

Os callbacks Mercado Pago e PagBank também substituem os dois provedores, Pix e cartão, mesmo se o administrador pretendia conectar apenas um meio. Alterações ainda não salvas ficam somente no estado da tela; os handlers redirecionam para OAuth sem salvá-las. O Asaas altera Pix e credenciais, mas não configura cartão automaticamente. É necessário preservar as escolhas e consolidar um fluxo claro de salvar/conectar/validar.

Evidências: [alterações em memória](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/admin/AdminPage.tsx:307), [redirecionamento OAuth](/C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/admin/Admin.tsx:932).

## Validação realizada

54 testes existentes passaram com mocks:

- 34: state OAuth, endpoints, assinatura e notificações Mercado Pago, proteção dos webhooks.
- 11: webhook PagBank e checkout de cartão.
- 6: criação de subconta Asaas e isolamento do webhook por restaurante.
- 3: formulário de pagamentos no admin.

Esses testes não comprovam integração ponta a ponta com os provedores. Os testes PagBank fornecem e-mail/token diretamente; o teste positivo Asaas fornece `payment.walletId`, que não representa o evento documentado. Não cobrem toda a sequência conectar → primeiro pagamento → confirmação → renovação.

## Correções prioritárias

1. Configurar as aplicações, callbacks, chaves e segredos no ambiente efetivamente usado pelo backend.
2. Implementar armazenamento e renovação seguros dos tokens Mercado Pago e PagBank.
3. Compatibilizar o checkout e as consultas PagBank com o Connect atual.
4. Provisionar webhooks Asaas por subconta e corrigir os eventos e a identificação da conta, preservando isolamento e verificação financeira.
5. Fazer a tela distinguir conta conectada, cadastro em análise, credencial vencida e meios prontos; preservar as escolhas no retorno OAuth.
6. Validar em homologação o fluxo completo de cada provedor antes de apresentar a configuração como pronta.
