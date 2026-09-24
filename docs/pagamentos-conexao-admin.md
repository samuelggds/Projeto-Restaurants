# Conexões de pagamento do restaurante

O painel **Configurações > Pagamentos** separa os meios de pagamento disponíveis hoje das integrações preparadas para o futuro.

## Estado atual

| Integração | Estado | Uso |
| --- | --- | --- |
| Mercado Pago | Ativa | Pix QR Code e cartão online |
| Open Finance Mercado Pago | Em preparação | Segunda opção de pagamento via Mercado Pago, separada do Pix QR Code |
| Pagar.me | Temporariamente indisponível | Estrutura preservada para ativação futura após cadastro empresarial/CNPJ |
| Asaas | Temporariamente indisponível | Estrutura preservada para ativação futura após cadastro empresarial/CNPJ |

O administrador não pode selecionar Asaas ou Pagar.me como provedor ativo enquanto
`ENABLE_FUTURE_PAYMENT_PROVIDERS` permanecer diferente de `true`. A API aplica a
mesma regra; portanto, esconder ou alterar a interface não contorna o bloqueio.

## Mercado Pago

O restaurante conecta a própria conta por OAuth. Tokens e refresh tokens ficam
criptografados no backend. O checkout usa a chave pública da conta do restaurante
para operações que precisam acontecer no navegador.

Configuração principal da plataforma:

- `MP_OAUTH_CLIENT_ID`
- `MP_OAUTH_CLIENT_SECRET`
- `MP_WEBHOOK_SECRET` ou `MP_WEBHOOK_SECRETS`
- `MP_OAUTH_REDIRECT_URI`
- `MP_ORDER_NOTIFICATION_URL`

A conexão só é marcada como pronta quando o grant é renovável, a chave pública está
disponível e a configuração de webhook/URLs da plataforma passa pelas validações de
segurança.

## Pix via Open Finance

Open Finance é uma integração separada do Pix QR Code. Quando habilitado, o
restaurante informa a chave Pix beneficiária e o cliente paga autorizando a operação
no aplicativo da instituição bancária.

Configuração da plataforma:

- ``
- ``
- ``
- `` em produção

A disponibilidade exibida no painel depende dessas credenciais. O redirecionamento
para o banco deve acontecer fora de iframe/WebView e a confirmação financeira deve
ser baseada no estado remoto/webhook do provedor, nunca apenas no retorno do navegador.

## Asaas e Pagar.me

Os modelos, providers e campos necessários permanecem no projeto para reduzir o
trabalho quando a integração futura for liberada. Até lá:

- não aparecem como opções selecionáveis para Pix ou cartão;
- não podem ser conectados pelo painel;
- o backend rejeita a ativação desses gateways;
- o backend rejeita novas credenciais desses provedores com a flag futura desligada;
- `ENABLE_FUTURE_PAYMENT_PROVIDERS=false` é o padrão de produção.

Quando houver CNPJ e a homologação necessária, a liberação deve ser feita em uma
alteração própria, com testes reais de criação, confirmação, webhook, idempotência,
cancelamento e estorno antes de definir a flag como `true`.

## Segurança multi-tenant

Toda operação financeira deve usar o `restaurantId` resolvido pelo contexto
autenticado/pedido e nunca aceitar troca de tenant apenas por dados enviados pelo
cliente. Credenciais globais de fallback permanecem desabilitadas em produção.

Pagamentos só devem ser marcados como pagos após evidência do provedor com vínculo
ao pedido, restaurante, valor e moeda esperados.
