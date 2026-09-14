import type { DemoState } from './demoDomain';
export function demoCourierOrders(state: DemoState) {
  return state.orders
    .filter((order) => order.channel === 'DELIVERY')
    .map((order) => ({
      ...order,
      type: 'DELIVERY',
      paymentMethod:
        order.paymentMethod === 'CASH'
          ? 'DINHEIRO'
          : order.paymentMethod === 'CARD'
            ? 'CARTAO'
            : 'PIX',
      payOnDelivery: order.paymentMethod === 'CASH',
      payOnDeliveryMethod: order.paymentMethod === 'CASH' ? 'DINHEIRO' : undefined,
      user: { name: order.customerName },
      address: 'Rua Exemplo',
      number: '100',
      district: 'Centro',
      city: 'Cidade Demo',
      items: order.items.map((item) => ({
        quantity: item.quantity,
        price: item.unitPrice,
        product: { name: item.name },
      })),
      courierEarningPreview: { available: true, amount: 5 },
    }));
}
