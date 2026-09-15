# WhatsApp automático — Gupshup em produção

Este runbook descreve a ativação do WhatsApp transacional do GastroNexa para restaurantes clientes.

## Escopo atual

O backend já possui outbox durável, retry/backoff e worker de entrega. O fluxo automático para o cliente cobre:

1. pagamento confirmado;
2. pedido em preparo;
3. pedido pronto;
4. pedido saiu para entrega;
5. pedido entregue **ou** cancelado.

`PENDENTE` é deliberadamente suprimido para evitar excesso de mensagens.

O envio só é elegível quando **todas** estas condições são verdadeiras:

- o restaurante ativou o WhatsApp no ADMIN;
- o restaurante ativou notificações de status;
- o cliente marcou o opt-in transacional no checkout para aquele restaurante;
- existe telefone de destino válido;
- o número comercial do restaurante é uma origem válida no provedor;
- o provedor e os templates necessários estão configurados.

Ausência de consentimento, configuração ou template em modo `required` falha fechado: o pedido continua funcionando e nenhuma mensagem automática é enviada.

## Modelo recomendado para o SaaS

O GastroNexa envia em nome de vários restaurantes. Para produção multi-tenant, use a modalidade da Gupshup destinada a ISV/Tech Provider/Partner, mantendo cada WABA/número do cliente corretamente vinculado ao SaaS.

Um restaurante piloto pode ser homologado primeiro, mas não reutilize silenciosamente o mesmo número/origem para tenants diferentes.

## Segredos

Nunca salve `GUPSHUP_API_KEY` no GitHub, banco do restaurante, frontend ou painel ADMIN.

Configure a chave somente no ambiente de deploy do backend/worker.

## Variáveis de produção

```env
CUSTOMER_NOTIFICATION_PROVIDER=gupshup

GUPSHUP_API_KEY=<SEGREDO_CONFIGURADO_DIRETAMENTE_NO_SERVIDOR>
GUPSHUP_API_URL=https://api.gupshup.io/wa/api/v1/msg
GUPSHUP_TEMPLATE_API_URL=https://api.gupshup.io/wa/api/v1/template/msg
GUPSHUP_PROFILE_API_BASE_URL=https://api.gupshup.io

# Piloto com um único app/número:
GUPSHUP_APP_NAME=<APP_NAME>
GUPSHUP_APP_ID=<APP_ID>

# Produção multi-restaurante: mapear o número de origem ao app correto.
# Exemplo ilustrativo — use números reais em E.164/dígitos conforme a configuração do provider.
GUPSHUP_APP_BY_SOURCE_JSON={"5585999999999":"app-restaurante-a","5511999999999":"app-restaurante-b"}
GUPSHUP_APP_ID_BY_SOURCE_JSON={"5585999999999":"APP_ID_A","5511999999999":"APP_ID_B"}

# Em produção, após aprovação dos templates, falhar fechado.
GUPSHUP_AUTOMATIC_TEMPLATE_MODE=required

GUPSHUP_TEMPLATE_PAYMENT_CONFIRMED_ID=<TEMPLATE_ID>
GUPSHUP_TEMPLATE_ORDER_PREPARING_ID=<TEMPLATE_ID>
GUPSHUP_TEMPLATE_ORDER_READY_ID=<TEMPLATE_ID>
GUPSHUP_TEMPLATE_ORDER_OUT_FOR_DELIVERY_ID=<TEMPLATE_ID>
GUPSHUP_TEMPLATE_ORDER_DELIVERED_ID=<TEMPLATE_ID>
GUPSHUP_TEMPLATE_ORDER_CANCELLED_ID=<TEMPLATE_ID>

# PENDENTE é suprimido pelo produto hoje; pode permanecer vazio.
GUPSHUP_TEMPLATE_ORDER_PENDING_ID=

# Se cada origem/WABA usar IDs diferentes, sobrescreva por source.
GUPSHUP_TEMPLATE_BY_SOURCE_JSON={}
```

O `docker-compose.production.yml` já encaminha essas variáveis tanto ao backend quanto ao worker.

## Templates sugeridos

Cadastre como mensagens transacionais/utility e preserve exatamente a ordem dos parâmetros usada pelo backend.

### 1. `gastronexa_payment_confirmed`

Parâmetros: nome, método, número do pedido, restaurante, total.

```text
Olá, {{1}}. Seu pagamento via {{2}} do pedido #{{3}} em {{4}} foi confirmado. Total: {{5}}. Agora é só aguardar o preparo.
```

### 2. `gastronexa_order_preparing`

Parâmetros: nome, número do pedido, restaurante, link.

```text
Olá, {{1}}. Seu pedido #{{2}} em {{3}} está em preparo. Acompanhe o pedido: {{4}}
```

### 3. `gastronexa_order_ready`

Parâmetros: nome, número do pedido, restaurante, link.

```text
Olá, {{1}}. Seu pedido #{{2}} em {{3}} está pronto. Acompanhe o pedido: {{4}}
```

### 4. `gastronexa_order_out_for_delivery`

Parâmetros: nome, número do pedido, restaurante, link.

```text
Olá, {{1}}. Seu pedido #{{2}} em {{3}} saiu para entrega. Acompanhe: {{4}}
```

### 5. `gastronexa_order_delivered`

Parâmetros: nome, número do pedido, restaurante, link.

```text
Olá, {{1}}. Seu pedido #{{2}} em {{3}} foi marcado como entregue. Consulte ou confirme os detalhes: {{4}}
```

### 6. `gastronexa_order_cancelled`

Parâmetros: nome, número do pedido, restaurante, link.

```text
Olá, {{1}}. Seu pedido #{{2}} em {{3}} foi cancelado. Consulte os detalhes: {{4}}
```

Não adicione parâmetros extras sem atualizar os testes e o `customerNotifier`/outbox no mesmo PR.

## Configuração no painel ADMIN

Em **Configurações → WhatsApp**, para cada restaurante:

1. ativar WhatsApp;
2. informar o número comercial conectado à WABA/Gupshup;
3. informar nome de exibição;
4. configurar mensagem padrão do botão público;
5. ativar notificações automáticas de status.

O cliente ainda precisa optar pelas atualizações transacionais no checkout. O checkbox começa desmarcado e a escolha é isolada por restaurante.

## Consentimento

Quando o cliente aceita as atualizações, o pedido leva `whatsappOptIn=true` ao endpoint de criação. Após o pedido existir, o backend registra a evidência:

- ação: `WHATSAPP_ORDER_NOTIFICATIONS_OPT_IN`;
- recurso: `Order:<id>`;
- tenant: `restaurantId` do pedido;
- escopo: `ORDER_TRANSACTIONAL_UPDATES`;
- origem: `CHECKOUT`;
- timestamp do consentimento.

Telefone, API key, token e segredo não são gravados no metadata de consentimento.

Antes de confirmar pagamento ou enviar mudança de status, o notifier exige essa evidência. Sem ela, retorna `customer_whatsapp_opt_in_missing` e não cria mensagem no outbox.

## Homologação do primeiro restaurante

1. Criar/conectar o app e o número na Gupshup.
2. Aguardar o número/WABA ficar operacional.
3. Criar os seis templates acima.
4. Aguardar todos os templates necessários ficarem aprovados.
5. Configurar `GUPSHUP_API_KEY`, app name/id, número e template IDs no servidor.
6. Usar `GUPSHUP_AUTOMATIC_TEMPLATE_MODE=required`.
7. Reiniciar/recriar backend e worker com o novo ambiente.
8. No ADMIN do restaurante, ativar WhatsApp e notificações de status.
9. Fazer um pedido de teste com um número controlado e marcar o opt-in.
10. Confirmar pagamento e avançar o pedido por PREPARANDO → PRONTO → SAIU_PARA_ENTREGA → ENTREGUE.
11. Verificar no provedor e no outbox que cada evento foi entregue uma única vez.
12. Fazer outro pedido sem marcar opt-in e comprovar que nenhuma mensagem foi enfileirada.

## Critérios para liberar mais restaurantes

- templates aprovados e estáveis;
- worker saudável;
- nenhuma credencial no repositório/logs/frontend;
- source/app corretos por restaurante;
- teste positivo com opt-in;
- teste negativo sem opt-in;
- retry/idempotência comprovados;
- política de opt-in exibida no checkout;
- acompanhamento de rejeições/erros do provider.

## Observação sobre “Receber pedidos pelo WhatsApp”

Existe uma preferência `receiveOrdersOnWhatsapp` no painel/configurações, porém o fluxo atual de backend não a usa para encaminhar novos pedidos ao número do restaurante. Não trate esse toggle como uma automação funcional até existir um fluxo explícito, tenant-aware e testado para esse evento.

Esta ativação cobre primeiro o fluxo já implementado e auditável: **notificações transacionais automáticas do pedido para o cliente**.
