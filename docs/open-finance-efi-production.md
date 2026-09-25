# Open Finance real via Efí

O GastroNexa usa Mercado Pago para Pix QR Code/copia e cola e cartão. A jornada **Open Finance** é separada e usa a API Open Finance da Efí: o comprador escolhe a instituição, é redirecionado ao ambiente do banco, autoriza o Pix e retorna ao GastroNexa.

## Fluxo

1. A Home consulta `GET /orders/open-finance/institutions`.
2. O comprador escolhe o banco e informa/possui CPF válido.
3. O backend cria o pedido local e chama `POST /v1/pagamentos/pix` da Efí com `x-idempotency-key`.
4. O beneficiário é a chave Pix configurada pelo próprio restaurante.
5. A Efí devolve `identificadorPagamento` e `redirectURI`.
6. O comprador é enviado ao banco para autorizar.
7. A Efí retorna para `/orders/open-finance/efi/return` e também notifica `/orders/webhook/efi-open-finance?hmac=...`.
8. O GastroNexa nunca confia somente no webhook: consulta a Efí, valida `idProprio`, valor e status e só então marca o pedido como pago.

## Variáveis

- `EFI_OPEN_FINANCE_ENABLED=true`
- `EFI_OPEN_FINANCE_ENV=homologation|production`
- `EFI_OPEN_FINANCE_CLIENT_ID`
- `EFI_OPEN_FINANCE_CLIENT_SECRET`
- `EFI_OPEN_FINANCE_P12_BASE64` e, se necessário, `EFI_OPEN_FINANCE_P12_PASSPHRASE`
- alternativa PEM: `EFI_OPEN_FINANCE_CERT_BASE64` + `EFI_OPEN_FINANCE_KEY_BASE64`
- `EFI_OPEN_FINANCE_WEBHOOK_HMAC` com valor aleatório forte
- `EFI_OPEN_FINANCE_BASE_URL` normalmente deve ficar vazio para usar o host oficial do ambiente

Nunca commitar credenciais ou certificados.

## Configurar redirect e webhook na Efí

Depois de carregar as variáveis no backend, execute dentro do backend:

`npm run efi:open-finance:configure`

O script registra na Efí:
- redirect: `https://<API_DOMAIN>/orders/open-finance/efi/return`
- webhook: `https://<API_DOMAIN>/orders/webhook/efi-open-finance`
- proteção HMAC
- processamento assíncrono

## Restaurante

Para publicar Open Finance no cardápio, o restaurante precisa:
- ativar `openFinancePixEnabled`;
- informar a **chave Pix que receberá o valor**;
- a plataforma precisa estar com a integração Efí configurada.

A chave Pix do Open Finance é independente do Pix QR Code do Mercado Pago.

## Homologação

Antes de produção:
- listar participantes;
- criar pagamento de baixo valor;
- confirmar que `redirectURI` leva ao ambiente da instituição escolhida;
- completar autorização;
- validar retorno, webhook, polling e confirmação local;
- validar rejeição/expiração;
- validar devolução pelo endpoint de refund da Efí;
- confirmar que pedido cancelado e pagamento tardio seguem a reconciliação segura.

## Segurança

- mTLS é obrigatório para chamadas da API Open Finance;
- certificado fica somente no ambiente do backend;
- HMAC do webhook não é exposto ao frontend;
- CPF e dados do pedido são enviados apenas pelo backend;
- o GastroNexa não recebe senha ou credencial bancária do comprador;
- cada pagamento é vinculado ao restaurante, pedido, valor e referência antes da confirmação.
