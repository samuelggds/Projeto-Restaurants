# Lalamove: cotação persistida e aprovação no sandbox

Esta etapa cria cotação somente no **sandbox Lalamove** e aprovação de preço pelo ADMIN do próprio restaurante. Não realiza reserva, contratação, cancelamento de entrega, pagamento ou alteração automática do valor cobrado ao consumidor. `canDispatch` é sempre `false`.

## Fluxo

1. No painel Pedidos, pedido DELIVERY já pago, não vinculado a motoboy próprio e ainda não entregue tem o botão **Cotação Lalamove (sandbox)**.
2. O backend valida a identidade ADMIN ativa e usa **apenas** `req.user.restaurantId`, nunca um tenant fornecido pelo browser. O pedido deve pertencer a esse restaurante.
3. Somente credenciais do restaurante com status `VERIFIED_SANDBOX` podem cotar. O backend descriptografa as chaves com AAD vinculada ao restaurante; nunca as retorna ao navegador.
4. Endereços de origem e destino são extraídos do próprio banco de dados. A geocodificação deve ser precisa (Google ROOFTOP ou RANGE_INTERPOLATED), sem aceitar coordenadas arbitrárias do frontend. Sem geocoder ou endereços completos, a cotação é negada.
5. O cliente Lalamove busca os serviços da cidade e exige moto LALAGO/LALAPRO com opção ativa `THERMAL_BAG_1` na cidade e na resposta da cotação. Caso não exista, não substitui por moto sem bolsa térmica.
6. A cotação é persistida em `RestaurantExternalDeliveryQuote` ligada por FKs compostas ao pedido, restaurante e credencial. Unicidade por pedido, chave de solicitação UUID, versionamento otimista e validade impedem duplicações simultâneas.
7. O ADMIN pode confirmar explicitamente o custo BRL exato ainda válido. A aprovação revalida o pedido, credencial, endereço e versão antes de gravar, produz auditoria sem dados sensíveis.
8. Nenhuma rota para agendamento de motoboy foi introduzida. O preço da Lalamove é custo separado do valor cobrado ao cliente.

## API (autenticada ADMIN)

- `GET /settings/delivery-partners/lalamove/quotes/:orderId`: somente estado do próprio pedido.
- `POST /settings/delivery-partners/lalamove/quotes/:orderId`: `{ "requestKey": "<UUID aleatório>" }`.
- `POST /settings/delivery-partners/lalamove/quotes/:orderId/approve`: `{ "expectedVersion": 2, "expectedTotal": "12.80" }`.

Os DTOs omitem credenciais, coordenadas dos clientes, `quotationId` e IDs de paradas. Nunca armazenar respostas brutas do parceiro em logs.

## Regras de segurança

- `RestaurantExternalDeliveryQuote`: `ENABLE/FORCE ROW LEVEL SECURITY`, políticas tenant, chaves estrangeiras compostas e constraints de estado/custo.
- Operações longas de rede ocorrem **fora** de transações. Uma cotação é marcada REQUESTING antes da chamada ao parceiro e apenas gravada após nova validação transacional.
- Uma cotação REQUESTING tem lease de 30s. Solicitações concorrentes retornam o estado existente e não consultam o parceiro duas vezes. Cotações vencidas requerem nova consulta antes de aprovação.
- Testes E2E executados em PostgreSQL descartável com role runtime sem BYPASSRLS, incluindo dois restaurantes, aprovação com valor divergente e ausência de motoboy contratado.
- O retorno e o painel sempre deixam claro: **sandbox não representa preço de produção**.
- Antes de qualquer cobrança ou reserva real, homologar a disponibilidade `THERMAL_BAG_1` na região com a Lalamove, completar despacho idempotente/locks, timeout incerto, rastreamento, webhooks, cancelamento, reembolso e conciliação.
