import { useMemo, useState } from 'react';
import { Bike, Clock3, Copy, QrCode, ReceiptText, Ruler, ShoppingBag } from 'lucide-react';

import type { KitchenPrinterSettings } from '../../../Services/kitchenPrintingService';
import * as S from './KitchenPrintPreview.styles';

type PreviewMode = 'delivery' | 'table' | 'pickup';
type PaperWidth = 'MM58' | 'MM80';

type PreviewOrder = {
  label: string;
  icon: typeof Bike;
  restaurantName: string;
  displayNumber: string;
  createdAt: string;
  type: 'DELIVERY' | 'MESA' | 'RETIRADA';
  tableNumber?: number;
  customerName?: string;
  paid: boolean;
  paymentMethod: 'PIX' | 'CARTAO' | 'DINHEIRO';
  deliveryAddress?: {
    address: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: Array<{
    quantity: number;
    name: string;
    portions?: Array<{ fraction: string; optionName: string; observation?: string }>;
    customizations?: Array<{ groupName: string; options: string[] }>;
    removedItems?: string[];
    observation?: string;
  }>;
  observation?: string;
  total: number;
};

const previews: Record<PreviewMode, PreviewOrder> = {
  delivery: {
    label: 'Entrega',
    icon: Bike,
    restaurantName: 'North Pizza',
    displayNumber: '1842',
    createdAt: '2026-09-15T19:42:00-03:00',
    type: 'DELIVERY',
    customerName: 'Marina Costa',
    paid: true,
    paymentMethod: 'PIX',
    deliveryAddress: {
      address: 'Rua das Flores',
      number: '120',
      complement: 'Casa dos fundos',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60000-000',
    },
    items: [
      {
        quantity: 1,
        name: 'Pizza grande',
        portions: [
          { fraction: '1/2', optionName: 'Calabresa' },
          { fraction: '1/2', optionName: 'Portuguesa', observation: 'Sem ervilha' },
        ],
        customizations: [{ groupName: 'Adicionais', options: ['Catupiry'] }],
        removedItems: ['Cebola'],
      },
      { quantity: 1, name: 'Coca-Cola 2 L', customizations: [], observation: 'Bem gelada' },
    ],
    observation: 'Tocar o interfone.',
    total: 89.9,
  },
  table: {
    label: 'Mesa',
    icon: QrCode,
    restaurantName: 'North Pizza',
    displayNumber: '1843',
    createdAt: '2026-09-15T20:03:00-03:00',
    type: 'MESA',
    tableNumber: 12,
    customerName: 'Lucas',
    paid: false,
    paymentMethod: 'CARTAO',
    items: [
      {
        quantity: 1,
        name: 'Porção de fritas',
        customizations: [{ groupName: 'Molho', options: ['Molho da casa'] }],
        observation: 'Molho separado',
      },
      {
        quantity: 1,
        name: 'Pizza família',
        portions: [
          { fraction: '1/2', optionName: 'Frango' },
          { fraction: '1/2', optionName: 'Marguerita' },
        ],
      },
    ],
    observation: 'Enviar a entrada antes da pizza.',
    total: 112.5,
  },
  pickup: {
    label: 'Retirada',
    icon: ShoppingBag,
    restaurantName: 'North Pizza',
    displayNumber: '1844',
    createdAt: '2026-09-15T20:15:00-03:00',
    type: 'RETIRADA',
    customerName: 'Carlos Lima',
    paid: false,
    paymentMethod: 'DINHEIRO',
    items: [
      {
        quantity: 2,
        name: 'Pizza broto',
        customizations: [{ groupName: 'Sabor', options: ['Calabresa'] }],
        removedItems: ['Cebola'],
      },
      { quantity: 1, name: 'Suco de laranja', observation: 'Sem gelo' },
    ],
    observation: 'Cliente informou retirada às 20:30.',
    total: 64,
  },
};

const widthByPaper: Record<PaperWidth, number> = { MM58: 32, MM80: 48 };
const typeLabel = { DELIVERY: 'ENTREGA', MESA: 'MESA', RETIRADA: 'RETIRADA' } as const;
const paymentLabel = { PIX: 'PIX', CARTAO: 'CARTÃO', DINHEIRO: 'DINHEIRO' } as const;

function clean(value: unknown) {
  return String(value ?? '').replace(/[\r\n\t]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function wrap(value: string, width: number, prefix = '') {
  const available = Math.max(8, width - prefix.length);
  const words = clean(value).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const chunks = word.match(new RegExp(`.{1,${available}}`, 'gu')) || [word];
    for (const chunk of chunks) {
      const candidate = current ? `${current} ${chunk}` : chunk;
      if (candidate.length <= available) current = candidate;
      else {
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

function renderPreviewCommand(order: PreviewOrder, paperWidth: PaperWidth) {
  const width = widthByPaper[paperWidth];
  const line = '='.repeat(width);
  const divider = '-'.repeat(width);
  const lines = [
    line,
    center(order.restaurantName.toUpperCase(), width),
    line,
    center(`PEDIDO #${order.displayNumber}`, width),
  ];

  if (order.type === 'MESA' && order.tableNumber !== undefined) {
    lines.push(center(`MESA ${String(order.tableNumber).padStart(2, '0')} • ${order.customerName || ''}`, width));
  }

  lines.push(
    center(
      new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      width,
    ),
    '',
    ...wrap(`TIPO: ${typeLabel[order.type]}`, width),
    ...wrap(`PAGAMENTO: ${paymentLabel[order.paymentMethod]} - ${order.paid ? 'PAGO' : 'PENDENTE'}`, width),
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
        if (portion.observation) lines.push(...wrap(`OBS: ${portion.observation}`, width, '    '));
      }
    }
    for (const group of item.customizations || []) {
      lines.push(...wrap(group.groupName, width, '> '));
      for (const option of group.options) lines.push(...wrap(option, width, '  * '));
    }
    if (item.removedItems?.length) {
      lines.push(...wrap('RETIRAR', width, '> '));
      for (const removed of item.removedItems) lines.push(...wrap(removed, width, '  - '));
    }
    if (item.observation) lines.push(...wrap(`OBS: ${item.observation}`, width, '  '));
    lines.push('');
  }

  if (order.observation) lines.push(divider, 'OBSERVAÇÃO:', ...wrap(order.observation, width));

  if (order.type === 'DELIVERY' && order.deliveryAddress) {
    const address = order.deliveryAddress;
    lines.push(
      divider,
      'ENTREGA:',
      ...wrap(`${address.address}, ${address.number}`, width),
      ...(address.complement ? wrap(address.complement, width) : []),
      ...wrap(`Bairro ${address.district}`, width),
      ...wrap(`${address.city} - ${address.state}`, width),
      ...wrap(`CEP: ${address.zipCode}`, width),
    );
  }

  lines.push(divider, ...wrap(`TOTAL: ${money(order.total)}`, width, '# '), line);
  return lines.join('\n');
}

export function KitchenPrintPreview({ settings }: { settings: KitchenPrinterSettings }) {
  const [mode, setMode] = useState<PreviewMode>('delivery');
  const preview = previews[mode];
  const paperWidth: PaperWidth = settings.paperWidth === 'MM58' ? 'MM58' : 'MM80';
  const receipt = useMemo(() => renderPreviewCommand(preview, paperWidth), [preview, paperWidth]);
  const trigger = !settings.autoPrintEnabled
    ? 'Impressão manual'
    : settings.autoPrintTrigger === 'NEW_ORDER'
      ? 'Ao entrar na cozinha'
      : 'Após confirmar pagamento';

  return (
    <S.Root className="command-preview-panel" aria-labelledby="command-preview-title">
      <div className="preview-controls">
        <header className="preview-heading">
          <span className="preview-heading-icon" aria-hidden="true"><ReceiptText /></span>
          <div>
            <span className="eyebrow">Prévia da cozinha</span>
            <h3 id="command-preview-title">Veja como as 3 comandas realmente serão impressas</h3>
            <p>Os dados são fictícios, mas a estrutura abaixo segue o mesmo formato usado pelo Print Agent em produção.</p>
          </div>
        </header>

        <div className="preview-tabs" role="tablist" aria-label="Tipo de comanda de exemplo">
          {(Object.entries(previews) as Array<[PreviewMode, PreviewOrder]>).map(([value, option]) => {
            const ModeIcon = option.icon;
            return (
              <button
                aria-controls={`command-preview-${value}`}
                aria-selected={mode === value}
                className={mode === value ? 'active' : ''}
                id={`command-preview-${value}-tab`}
                key={value}
                onClick={() => setMode(value)}
                role="tab"
                type="button"
              >
                <ModeIcon aria-hidden="true" /> {option.label}
              </button>
            );
          })}
        </div>

        <div className="preview-settings" aria-label="Configuração aplicada à prévia">
          <span><Ruler aria-hidden="true" /> {paperWidth === 'MM58' ? '58 mm' : '80 mm'}</span>
          <span><Copy aria-hidden="true" /> {settings.copies} {settings.copies === 1 ? 'via' : 'vias'}</span>
          <span><Clock3 aria-hidden="true" /> {trigger}</span>
        </div>
      </div>

      <div className="receipt-stage">
        <article
          aria-labelledby={`command-preview-${mode}-tab`}
          className={`receipt-paper ${paperWidth === 'MM58' ? 'paper-58' : 'paper-80'}`}
          id={`command-preview-${mode}`}
          role="tabpanel"
          style={{ padding: '32px 18px 24px' }}
        >
          <span className="receipt-sample">EXEMPLO</span>
          <pre
            aria-label={`Exemplo real de impressão para ${preview.label}`}
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: paperWidth === 'MM58' ? 10 : 11,
              lineHeight: 1.45,
            }}
          >
            {receipt}
          </pre>
        </article>
      </div>
    </S.Root>
  );
}
