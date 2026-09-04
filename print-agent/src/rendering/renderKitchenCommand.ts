import type { KitchenOrderPrintPayloadV1, KitchenPrintPayloadV1, PaperWidth } from '../types.js';

const CHARACTER_WIDTH: Record<PaperWidth, number> = { MM58: 32, MM80: 48 };

function clean(value: unknown) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function wrap(value: string, width: number, prefix = '') {
  const available = Math.max(8, width - prefix.length);
  const words = clean(value).split(' ').filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const chunks = word.match(new RegExp(`.{1,${available}}`, 'gu')) || [word];
    for (const chunk of chunks) {
      const candidate = current ? `${current} ${chunk}` : chunk;
      if (candidate.length <= available) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = chunk;
      }
    }
  }
  if (current) lines.push(current);
  return lines.map((line, index) => `${index === 0 ? prefix : ' '.repeat(prefix.length)}${line}`);
}

function center(value: string, width: number) {
  const normalized = clean(value).slice(0, width);
  return `${' '.repeat(Math.max(0, Math.floor((width - normalized.length) / 2)))}${normalized}`;
}

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(value)
    .replace(/\u00a0/gu, ' ');
}

const TYPE_LABEL: Record<KitchenOrderPrintPayloadV1['order']['type'], string> = {
  DELIVERY: 'ENTREGA',
  MESA: 'MESA',
  RETIRADA: 'RETIRADA',
};

const PAYMENT_LABEL = {
  PIX: 'PIX',
  CARTAO: 'CARTÃO',
  DINHEIRO: 'DINHEIRO',
} as const;

function renderDeliveryAddress(order: KitchenOrderPrintPayloadV1['order'], width: number) {
  if (order.type !== 'DELIVERY' || !order.deliveryAddress) return [];

  const value = order.deliveryAddress;
  const street = [clean(value.address), clean(value.number)].filter(Boolean).join(', ');
  const cityState = [clean(value.city), clean(value.state)].filter(Boolean).join(' - ');
  const addressLines = [
    street,
    clean(value.complement),
    clean(value.district) ? `Bairro ${clean(value.district)}` : '',
    cityState,
    clean(value.zipCode) ? `CEP: ${clean(value.zipCode)}` : '',
  ].filter(Boolean);

  return addressLines.length
    ? ['ENTREGA:', ...addressLines.flatMap((line) => wrap(line, width))]
    : [];
}

function renderTableIdentity(order: KitchenOrderPrintPayloadV1['order'], width: number) {
  if (order.type !== 'MESA' || order.tableNumber === undefined) return [];
  const tableNumber = String(order.tableNumber).padStart(2, '0');
  const customerName = clean(order.customerName);
  const identity = customerName ? `MESA ${tableNumber} • ${customerName}` : `MESA ${tableNumber}`;
  return wrap(identity, width).map((line) => center(line, width));
}

function renderOrder(payload: KitchenOrderPrintPayloadV1, width: number) {
  const line = '='.repeat(width);
  const divider = '-'.repeat(width);
  const order = payload.order;
  const lines: string[] = [
    line,
    center(payload.restaurantName.toUpperCase(), width),
    line,
    center(`PEDIDO #${clean(order.displayNumber)}`, width),
    ...renderTableIdentity(order, width),
  ];

  lines.push(
    center(
      new Date(order.createdAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      width,
    ),
    '',
    ...wrap(`TIPO: ${TYPE_LABEL[order.type]}`, width),
    ...wrap(
      `PAGAMENTO: ${order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : 'NÃO INFORMADO'} - ${
        order.paid ? 'PAGO' : 'PENDENTE'
      }`,
      width,
    ),
  );
  if (order.customerName && order.type !== 'MESA') {
    lines.push(...wrap(`CLIENTE: ${order.customerName}`, width));
  }
  if (order.type === 'RETIRADA') lines.push(...wrap('RETIRADA NO LOCAL', width));
  lines.push(divider);

  for (const item of order.items) {
    lines.push(...wrap(`${item.quantity}x ${item.name.toUpperCase()}`, width));
    if (item.portions?.length) {
      lines.push(...wrap('PORÇÕES', width, '> '));
      for (const portion of item.portions) {
        lines.push(...wrap(`${portion.fraction} ${portion.optionName}`, width, '  * '));
        if (portion.observation) {
          lines.push(...wrap(`OBS: ${portion.observation}`, width, '    '));
        }
      }
    }
    for (const group of item.customizations) {
      lines.push(...wrap(group.groupName, width, '> '));
      for (const option of group.options) lines.push(...wrap(option, width, '  * '));
    }
    if (item.removedItems?.length) {
      lines.push(...wrap('RETIRAR', width, '> '));
      for (const removedItem of item.removedItems) {
        lines.push(...wrap(removedItem, width, '  - '));
      }
    }
    if (item.observation) lines.push(...wrap(`OBS: ${item.observation}`, width, '  '));
    lines.push('');
  }

  if (order.observation) {
    lines.push(divider, 'OBSERVAÇÃO:', ...wrap(order.observation, width));
  }
  const deliveryAddress = renderDeliveryAddress(order, width);
  if (deliveryAddress.length) lines.push(divider, ...deliveryAddress);
  lines.push(divider, ...wrap(`TOTAL: ${money(order.total)}`, width, '# '), line, '', '', '');
  return lines;
}

function renderTest(payload: Extract<KitchenPrintPayloadV1, { kind: 'TEST' }>, width: number) {
  const line = '='.repeat(width);
  return [
    line,
    center('TESTE DE IMPRESSÃO', width),
    line,
    '',
    ...wrap(`Restaurante: ${payload.restaurantName}`, width),
    ...wrap(payload.message, width),
    '',
    center(new Date(payload.requestedAt).toLocaleString('pt-BR'), width),
    line,
    '',
    '',
    '',
  ];
}

export function renderKitchenCommand(payload: KitchenPrintPayloadV1, paperWidth: PaperWidth) {
  if (payload.version !== 1) throw new Error('Versão de payload de impressão não suportada.');
  const width = CHARACTER_WIDTH[paperWidth];
  const lines = payload.kind === 'ORDER' ? renderOrder(payload, width) : renderTest(payload, width);
  return lines.map((line) => line.slice(0, width)).join('\n');
}

export { CHARACTER_WIDTH };
