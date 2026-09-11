import { demoConfiguredLine, demoConfigurationIsCurrent } from './demoProductConfiguration';
import type { DemoHomeData } from './useDemoHomeData';
import type { TableOrderSettlementMode } from '../../Home/domain/checkout';
import { demoTableAccount } from './demoTableAccount';
import {
  getDemoCartTotal,
  type DemoState,
  type DemoOrderChannel,
  type DemoPaymentMethod,
} from './demoDomain';

function tableSettlementError(
  state: DemoState,
  data: DemoHomeData,
  settlementMode: TableOrderSettlementMode,
  now: Date,
) {
  const settings = data.tableAccount;
  if (!settings) return '';
  if (!settings.enabled)
    return 'A conta por mesa está desativada. Peça ao administrador para revisar as configurações.';
  if (settlementMode === 'PAY_NOW')
    return settings.allowOnlinePayment
      ? ''
      : 'O pagamento online de pedidos da mesa está desativado neste restaurante.';

  if (settings.prepaymentWindows.length) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: settings.timeZone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(now)
        .map((part) => [part.type, part.value]),
    );
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const minute = Number(parts.hour) * 60 + Number(parts.minute);
    const scheduleRequiresPayment = settings.prepaymentWindows.some((window) => {
      if (window.startsAtMinute < window.endsAtMinute)
        return (
          window.weekdays.includes(weekday) &&
          minute >= window.startsAtMinute &&
          minute < window.endsAtMinute
        );
      return (
        (window.weekdays.includes(weekday) && minute >= window.startsAtMinute) ||
        (window.weekdays.includes((weekday + 6) % 7) && minute < window.endsAtMinute)
      );
    });
    if (scheduleRequiresPayment)
      return 'Neste horário, o pedido da mesa precisa ser pago antes de ser enviado. Escolha pagar agora.';
  }

  const threshold = settings.requirePrepaymentAboveCents;
  if (threshold !== null) {
    const outstandingCents = demoTableAccount(state, 8, settings).summary.remainingCents;
    const incomingOrderCents = Math.round(getDemoCartTotal(state) * 100);
    if (outstandingCents + incomingOrderCents > threshold)
      return 'O saldo em aberto somado a este pedido ultrapassa o limite da mesa. Escolha pagar este pedido agora.';
  }
  return '';
}

export function demoCheckoutError(
  state: DemoState,
  data: DemoHomeData,
  channel: DemoOrderChannel,
  payment: DemoPaymentMethod,
  options: { settlementMode?: TableOrderSettlementMode; now?: Date } = {},
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
  if (channel === 'TABLE') {
    const table = state.tables.find((item) => item.number === 8);
    if (!table?.occupied) return 'Aguarde o garçom abrir a mesa antes de fazer o pedido.';
    if (table.closingRequested && data.tableAccount?.blockNewOrdersOnClosingRequest !== false)
      return 'Conta solicitada: aguarde o garçom concluir o atendimento.';
  }
  for (const line of state.cart) {
    const product = data.products.find((item) => item.id === line.productId);
    if (
      !product ||
      product.available === false ||
      (product.stock != null &&
        product.stock <
          state.cart
            .filter((item) => item.productId === line.productId)
            .reduce((sum, item) => sum + item.quantity, 0))
    )
      return `${line.name} está indisponível nessa quantidade. Ajuste sua sacola.`;
    if (!demoConfigurationIsCurrent(product, line.configuration))
      return `As opções de ${line.name} mudaram. Remova e personalize novamente.`;
    if (
      Math.round(demoConfiguredLine(product, line.configuration).unitPrice * 100) !==
      Math.round(line.unitPrice * 100)
    )
      return `O preço de ${line.name} mudou. Remova e adicione o produto novamente.`;
  }
  if (channel !== 'TABLE' && getDemoCartTotal(state) < data.minimumOrder)
    return `O pedido mínimo é ${data.minimumOrder.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Adicione mais itens.`;
  if (channel === 'TABLE' && options.settlementMode)
    return tableSettlementError(state, data, options.settlementMode, options.now ?? new Date());
  return '';
}
