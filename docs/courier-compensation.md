# Remuneração e acertos de motoqueiros

Este módulo separa três valores que não devem ser confundidos:

- **taxa de entrega do cliente**: calculada pelo fluxo comercial do pedido;
- **ganho do motoqueiro**: calculado pelo backend ao aceitar a entrega;
- **acerto financeiro**: conferência entre ganhos do motoqueiro e dinheiro recebido dos clientes.

O navegador nunca informa o ganho final, o dinheiro recebido ou o tenant da operação. Esses dados são derivados de registros persistidos e de `req.user.restaurantId`.

## Modelos de remuneração

Cada restaurante tem uma regra padrão e pode cadastrar uma exceção por motoqueiro ativo do próprio tenant.

### Valor fixo por entrega

`FIXED_PER_DELIVERY` aplica `fixedAmount` em toda retirada. A migração cria essa regra usando o antigo `RestaurantSettings.courierFeePerDelivery`, preservando o comportamento existente.

### Faixas de distância

`DISTANCE_RANGES` escolhe a primeira faixa em que:

```text
deliveryDistanceMeters <= maxDistanceMeters
```

As faixas são ordenadas pelo limite, não podem repetir limites e precisam cobrir a distância. Uma rota fora da última faixa falha fechada e não pode ser retirada até a configuração ser corrigida.

### Base mais distância

`BASE_PLUS_DISTANCE` usa:

```text
ganho = baseAmount + max(0, distância - distância incluída) × adicional por km
```

O cálculo é feito em centavos inteiros. A parcela por metro usa arredondamento `half-up`, evitando diferenças de ponto flutuante.

## Distância confiável e snapshot

Quando qualquer regra do restaurante depende de distância, a criação de um pedido `DELIVERY` solicita a rota pelo serviço de roteamento do backend e salva `Order.deliveryDistanceMeters`. Coordenadas, quilômetros e ganhos enviados pelo frontend não são usados.

Antes da retirada, a lista do motoqueiro recebe `courierEarningPreview`, calculado no backend. Na retirada, dentro da mesma transação que atribui o pedido, o servidor:

1. valida motoqueiro ativo, pedido `DELIVERY`, tenant, status e disponibilidade;
2. resolve a exceção do motoqueiro ou a regra padrão;
3. calcula novamente o ganho com a distância persistida;
4. grava `courierEarning`, `courierCompensationModel` e `courierEarningCalculatedAt`;
5. altera o status para `SAIU_PARA_ENTREGA`.

Esse snapshot é imutável em relação a alterações futuras da configuração. Mudar a regra afeta apenas novas retiradas.

## Períodos financeiros

Os cartões **Hoje**, **Semana**, **Mês** e **A receber** contam somente pedidos `ENTREGUE` atribuídos ao motoqueiro autenticado.

- O fuso vem de `RestaurantSettings.timezone`.
- O padrão é `America/Sao_Paulo`.
- A semana começa na segunda-feira.
- Os intervalos usam `gte` no início e `lt` no próximo limite, evitando contagem duplicada.
- **A receber** inclui toda entrega sem `courierPaidAt`, inclusive quando existe acerto em conferência ou divergência.

## Acertos bilaterais

O administrador seleciona entregas concluídas e ainda não quitadas de um único motoqueiro.

```text
ganhos brutos = soma de Order.courierEarning
dinheiro recebido = soma de Order.total para pagamento na entrega em DINHEIRO já recebido
saldo = ganhos brutos - dinheiro recebido
```

- Saldo positivo: o restaurante paga o motoqueiro.
- Saldo negativo: o motoqueiro devolve o dinheiro excedente ao restaurante.
- Saldo zero: valores compensados.

Ao declarar, o acerto fica em `AWAITING_COURIER_CONFIRMATION`. Isso **não** preenche `courierPaidAt`.

O motoqueiro pode:

- **confirmar**: muda o acerto para `CONFIRMED` e preenche `courierPaidAt` somente nas entregas do tenant, do motoqueiro e do acerto;
- **informar divergência**: muda para `DISPUTED`, preserva o saldo pendente e registra o motivo;
- confirmar novamente um acerto já confirmado: resposta idempotente, sem nova escrita financeira.

O administrador pode cancelar um acerto aguardando confirmação ou em divergência. Os itens são liberados para um novo acerto; acertos confirmados não são reabertos nem apagados.

## Concorrência e integridade

`CourierSettlementItem_active_order_key` é um índice único parcial no PostgreSQL:

```sql
UNIQUE ("orderId") WHERE "active" = true
```

Mesmo que dois administradores enviem o mesmo pedido simultaneamente, somente uma transação pode criar um item ativo. O serviço converte a violação em conflito seguro e orienta atualizar a lista.

Outras garantias de banco validam valores não negativos, distância, versão e a igualdade `netAmount = grossCourierEarnings - cashCollectedAmount`.

## Isolamento multi-tenant

As tabelas privadas abaixo possuem `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, `USING` e `WITH CHECK`:

- `CourierCompensationPolicy`;
- `CourierCompensationRange`;
- `CourierSettlement`;
- `CourierSettlementItem`.

Todas falham fechadas quando `app.restaurant_id` não existe. O processo de runtime também precisa usar uma role PostgreSQL `NOSUPERUSER`, `NOBYPASSRLS` e que não seja proprietária dessas tabelas.

RLS é defesa adicional. As leituras e escritas da aplicação continuam usando `restaurantId` na própria query, inclusive `updateMany` e `findFirstOrThrow`. IDs reais de outro restaurante retornam vazio/negação.

## Rotas

Rotas de administrador exigem autenticação e `adminMiddleware`:

- `GET /courier-compensation/admin/configuration`
- `PUT /courier-compensation/admin/configuration`
- `PUT /courier-compensation/admin/couriers/:courierId/rule`
- `DELETE /courier-compensation/admin/couriers/:courierId/rule`
- `GET /courier-compensation/admin/pending-orders`
- `GET /courier-compensation/admin/settlements`
- `POST /courier-compensation/admin/settlements`
- `PATCH /courier-compensation/admin/settlements/:publicId/cancel`

Rotas do motoqueiro validam uma conta `MOTOQUEIRO` ativa do tenant autenticado:

- `GET /courier-compensation/courier/settlements`
- `POST /courier-compensation/courier/settlements/:publicId/confirm`
- `POST /courier-compensation/courier/settlements/:publicId/dispute`
- `GET /orders/courier/finance`

Campos `restaurantId` em body, query ou header não escolhem o tenant.

## Auditoria

Eventos relevantes são persistidos em `AuditLog` na mesma transação da mudança:

- atualização da regra padrão;
- criação, atualização e remoção de exceção;
- criação de acerto;
- confirmação;
- divergência;
- cancelamento.

O log registra IDs técnicos e contagens necessárias à rastreabilidade, sem credenciais ou dados de pagamento do cliente.

## Interface

No painel administrativo, abra **Configurações → Pagamento dos motoqueiros**:

1. escolha o modelo e salve a regra padrão;
2. configure exceções somente quando um motoqueiro precisar de outra regra;
3. na aba **Acertos**, selecione o motoqueiro e as entregas;
4. confira ganhos, dinheiro recebido e saldo antes de declarar;
5. acompanhe confirmação ou divergência no histórico.

Na área do motoqueiro, o valor previsto aparece antes da retirada. A visão geral mostra resumo financeiro, extrato por entrega e acertos aguardando ação.

## Validação e implantação

Antes do deploy:

```bash
npm --prefix backend run db:validate
npm run test:e2e:rls
npm run test:e2e:tenant
npm run ci
```

O deploy aplica `20260901090000_add_courier_compensation_settlements`. A migração faz backfill da regra fixa e não recalcula pedidos já retirados. Depois do deploy, confirme que o startup validou a role PostgreSQL segura antes de liberar tráfego.

## Rollback seguro

A migração é deliberadamente **forward-only**: remover as tabelas de acertos ou as colunas de snapshot descartaria histórico financeiro. Se a aplicação precisar voltar para uma versão anterior:

1. interrompa a criação de novos acertos;
2. preserve um backup das tabelas e exporte os acertos pendentes;
3. faça rollback apenas da aplicação, mantendo o schema novo;
4. continue usando `RestaurantSettings.courierFeePerDelivery`, que permanece compatível com a regra fixa;
5. corrija o problema e faça um novo deploy forward.

Nunca apague acertos confirmados ou limpe `courierPaidAt` como mecanismo de rollback. Uma correção financeira deve manter o registro original e ser rastreável.

## Limitações e próximas etapas

- O modelo e a API aceitam uma referência `evidenceUrl`, mas o upload privado e autenticado de comprovantes ainda depende da infraestrutura de arquivos do ambiente. Não há upload público pelo navegador nesta etapa.
- Acertos confirmados são imutáveis. Um livro-razão específico para ajustes posteriores, com lançamentos de débito e crédito vinculados ao acerto original, é uma evolução recomendada antes de permitir correções automáticas.
- Divergências podem ser canceladas pelo administrador e recriadas após a conferência; não existe arbitragem automática nem integração bancária/PIX.
- Uma tentativa negada entre tenants não consulta o tenant alvo para descobrir se o ID existe. Por isso, ela não é classificada no `AuditLog` financeiro como “recurso de outro restaurante”; deve ser observada pela telemetria de autorização sem transformar a resposta em um oráculo de existência.
