# Conexão de pagamentos dos restaurantes

O administrador escolhe quem recebe Pix e cartão em **Configurações > Pagamentos**. O botão salva as escolhas e abre a autorização da própria conta no Mercado Pago ou PagBank. Ao retornar, o restaurante usa suas credenciais, guardadas de forma criptografada no backend. A conta que recebe as mensalidades da plataforma continua separada.

No Asaas, o fluxo cria uma subconta vinculada ao restaurante. Usa CPF/CNPJ, renda estimada, contato e endereço cadastrados; pessoas físicas precisam informar nascimento. A criação e a configuração das notificações são automáticas, mas documentos, aprovação e habilitação comercial dependem do Asaas. O painel diferencia conta criada de conta pronta e oferece o link de conclusão quando disponibilizado pela API. Isso não conecta uma conta Asaas independente já existente por OAuth.

## Preparação da plataforma

1. Aplicar `backend/prisma/migrations/20260912180000_payment_connection_lifecycle` pelo procedimento normal de deploy (`prisma migrate deploy`) e gerar o client. A alteração apenas acrescenta campos opcionais; não muda faturas, preços ou pedidos existentes.
2. Configurar `CREDENTIAL_ENCRYPTION_KEY` com 32 bytes aleatórios em base64 ou hexadecimal. Guardar a chave com segurança; trocar sem migração impede abrir as credenciais já salvas.
3. Configurar `BACKEND_URL` e `FRONTEND_URL` públicos em HTTPS, com o domínio real de cada serviço. Registrar os callbacks abaixo nas aplicações dos provedores. Se houver prefixo de API, conservar o mesmo prefixo nas URLs públicas.
4. Manter `ALLOW_GLOBAL_PAYMENT_FALLBACK=false`. Tokens da plataforma não devem substituir contas de restaurantes desconectados.

| Provedor | Configuração do servidor | Callback / notificações |
| --- | --- | --- |
| Mercado Pago | `MP_OAUTH_CLIENT_ID`, `MP_OAUTH_CLIENT_SECRET`, `MP_WEBHOOK_SECRET` | Callback: `BACKEND_URL/settings/mercado-pago/oauth/callback`. Pedidos: `BACKEND_URL/orders/webhook/mercadopago`. |
| PagBank | `PAGBANK_CONNECT_CLIENT_ID`, `PAGBANK_CONNECT_CLIENT_SECRET`, `PAGBANK_CONNECT_PLATFORM_TOKEN` | Callback: `BACKEND_URL/settings/pagbank/oauth/callback`. Pedidos: `BACKEND_URL/orders/webhook/pagbank`. |
| Asaas | `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` com 32 a 255 caracteres | Notificações: `BACKEND_URL/api/webhooks/asaas`; substituir com `ASAAS_WEBHOOK_URL` se necessário. O sistema provisiona nas subcontas. |

Mercado Pago permite `MP_OAUTH_REDIRECT_URI` e `MP_ORDER_NOTIFICATION_URL` explícitas. PagBank permite `PAGBANK_CONNECT_REDIRECT_URI` e `PAGBANK_NOTIFICATION_URL`. Os callbacks precisam corresponder ao cadastro da aplicação e usar a origem do backend. O segredo de assinatura Mercado Pago vem da configuração de notificações da aplicação; não é o access token da conta.

No PagBank, `PAGBANK_CONNECT_API_URL` define a base oficial usada na autorização, Pix, checkout, consulta e estorno. O alias antigo `PAGBANK_API_BASE_URL` é aceito apenas se não divergir dessa configuração. Em produção, use `https://api.pagseguro.com`; o sandbox oficial é permitido no ambiente de desenvolvimento. A aplicação precisa estar habilitada/homologada pelo PagBank para os produtos utilizados.

Sem os pré-requisitos, o painel informa que a conexão está sendo preparada e não inicia uma autorização incompleta. Não colocar nenhuma dessas chaves em variáveis `VITE_*`, no frontend ou em commits. O arquivo `backend/.env.example` contém os nomes necessários, sem credenciais reais.

No deploy com `docker-compose.production.yml`, configure os valores no arquivo `.env.production` usado pelo Compose, seguindo `.env.production.example`. O backend e o worker recebem a mesma lista explícita de opções de pagamento, incluindo `ASAAS_WEBHOOK_URL`; o arquivo `backend/.env` não é carregado por esses serviços. A verificação `node scripts/verifyProductionCompose.mjs` usa somente o exemplo e confere o repasse das opções sem iniciar containers ou exibir credenciais.

## Comportamento implementado

- A autorização exige administrador autenticado e vincula estado de uso único ao restaurante, usuário, versão de autenticação e prazo. Repetição, conta incorreta ou estado vencido não salvam credenciais.
- Pix e cartão mantêm os provedores escolhidos pelo admin. Um restaurante pode usar Mercado Pago para Pix e Asaas para cartão, por exemplo.
- Access tokens e refresh tokens são criptografados com contexto do restaurante. Respostas das configurações não devolvem esses segredos.
- Mercado Pago e PagBank renovam o acesso quando necessário. A renovação usa lock no PostgreSQL entre processos, relê o token e preserva uma conexão alterada enquanto a operação estava em andamento.
- **Produção exige grant renovável**: uma conexão Mercado Pago/PagBank sem `refresh_token` aparece como `Reconexão necessária` e não é marcada como pronta para Pix/cartão. Contas antigas precisam reconectar uma vez antes de receber pagamentos em produção.
- O QR Code Pix é emitido pela API da conta conectada. Digitar chave Pix local não é necessário e não registra chave no banco. A conta do provedor precisa estar habilitada para esse recebimento.
- PagBank Connect usa checkout moderno com Bearer. Pagamentos anteriores continuam com suas referências e tratamento de compatibilidade. O checkout pode oferecer carteira PagBank; uma cobrança capturada e vinculada ao checkout também é reconhecida.
- O Asaas recebe webhook durante o cadastro e permite reparar a configuração sem criar outra conta. Uma criação com resposta incerta é preservada para conferência, impedindo contas duplicadas. Após trocar `ASAAS_WEBHOOK_TOKEN`, reconectar atualiza o webhook da conta existente; o painel detecta a configuração antiga.
- Webhooks são avisos: o servidor consulta o pagamento com a credencial do restaurante e confere identificador, referência e valor antes da baixa. O retorno do navegador, sozinho, não confirma pagamento.
- No checkout hospedado PagBank, a notificação de pagamento permite consultar o pedido remoto e vincular a cobrança verificada. Depois disso, consultas e estornos usam o ID dessa cobrança. O webhook público é necessário também para confirmar pagamentos de mesa; o ID da cobrança é único e permanece associado ao intento de pagamento correto.
- `GET /settings/payment-connections` é exclusivo do admin e informa configuração, vínculo e necessidade de reconexão. Asaas também consulta aprovação e webhook. Para Mercado Pago/PagBank, o vínculo e a validade do grant não equivalem a uma transação financeira homologada ou garantia de que o banco nunca revogará a conta.

## Conferência após inserir as chaves

Fazer a homologação com contas de teste dos provedores antes de ativar clientes: autorizar duas contas de restaurantes diferentes; emitir Pix e checkout de cartão; confirmar pagamento; repetir webhook; cancelar/estornar; expirar/renovar token; revogar autorização e reconectar. Conferir que cada valor chega à conta correspondente e que o outro restaurante não consegue consultar ou confirmar o pedido.

Para Asaas, conferir também cadastro pendente, documentos, criação com resposta incerta e rotação do token de webhook. Para PagBank, conferir o retorno do checkout, a opção de carteira e os pagamentos de mesa. Testes locais usam respostas simuladas; chaves reais e homologação não foram executadas nesta alteração.

Documentação oficial: [OAuth Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation), [renovação Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/renewal), [PagBank Connect](https://developer.pagbank.com.br/docs/connect-authorization), [Checkout PagBank](https://developer.pagbank.com.br/docs/checkout), [subcontas Asaas](https://docs.asaas.com/docs/criacao-de-subcontas), [webhooks Asaas](https://docs.asaas.com/docs/criar-novo-webhook-pela-api).
