import type { DemoHomeData } from './useDemoHomeData';
import {
  getDemoCartTotal,
  type DemoState,
  type DemoOrderChannel,
  type DemoPaymentMethod,
} from './demoDomain';

export function demoCheckoutError(
  state: DemoState,
  data: DemoHomeData,
  channel: DemoOrderChannel,
  payment: DemoPaymentMethod,
) {
  if (data.isOpenForOrders === false)
    return 'O restaurante está fechado para pedidos. Abra novamente nas configurações da demonstração.';
  if (
    (channel === 'DELIVERY' && !data.acceptsDelivery) ||
    (channel === 'PICKUP' && !data.acceptsPickup) ||
    (channel === 'TABLE' && data.tableOrderingEnabled === false)
  )
    return 'Esse tipo de pedido está desativado. Escolha outra opção.';
  if ((payment === 'PIX' && !data.acceptsPix) || (payment === 'CARD' && !data.acceptsCard))
    return 'Esse pagamento está desativado. Escolha outra opção.';
  for (const line of state.cart) {
    const product = data.products.find((item) => item.id === line.productId);
    if (
      !product ||
      product.available === false ||
      (product.stock != null && product.stock < line.quantity)
    )
      return `${line.name} está indisponível nessa quantidade. Ajuste sua sacola.`;
    if (Math.round(product.price * 100) !== Math.round(line.unitPrice * 100))
      return `O preço de ${line.name} mudou. Remova e adicione o produto novamente.`;
  }
  if (channel !== 'TABLE' && getDemoCartTotal(state) < data.minimumOrder)
    return `O pedido mínimo é ${data.minimumOrder.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Adicione mais itens.`;
  return '';
}
