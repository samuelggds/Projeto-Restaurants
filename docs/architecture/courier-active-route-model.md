# Modelo de rota ativa do motoqueiro

## Regras de negócio

- Um restaurante pode ter vários motoqueiros ativos ao mesmo tempo.
- Um motoqueiro pode ter vários pedidos `DELIVERY` atribuídos ao mesmo tempo.
- Um motoqueiro pode ter no máximo uma rota ativa por vez.
- Retirar um pedido somente define `assignedCourierId`; o pedido permanece `PRONTO`.
- Iniciar rota exige que o pedido esteja `PRONTO`, atribuído ao motoqueiro autenticado e sem outra rota ativa para ele.
- Iniciar rota altera o pedido para `SAIU_PARA_ENTREGA` e grava `deliveryStartedAt`.
- Somente pedidos em `SAIU_PARA_ENTREGA`, atribuídos à conta autenticada, podem receber GPS.
- Concluir a entrega continua exigindo pagamento confirmado e código de confirmação do cliente.
- Finalizar a entrega muda o pedido para `ENTREGUE`, liberando o motoqueiro para iniciar outra rota.
- Toda consulta e mutação continua isolada por `restaurantId`.
- A compensação do motoqueiro continua sendo calculada e congelada na retirada do pedido.
- Pagamento online pendente continua impedindo a retirada/início da entrega conforme as regras existentes.

## Concorrência

O início da rota bloqueia a linha da conta do motoqueiro (`FOR UPDATE`) dentro da transação. Assim, dois pedidos podem ser iniciados simultaneamente por motoqueiros diferentes, mas duas tentativas concorrentes do mesmo motoqueiro são serializadas e apenas uma rota pode avançar.

## Navegação externa

Waze/Google Maps serão integrados posteriormente sobre esta regra. O provedor de navegação não será responsável por decidir atribuição, status ou autorização da entrega; essas decisões permanecem no GastroNexa.
