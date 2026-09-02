import { useState } from 'react';
import {
  Bike,
  Clock3,
  Copy,
  MapPin,
  QrCode,
  ReceiptText,
  Ruler,
  ShoppingBag,
  UserRound,
} from 'lucide-react';

import type { KitchenPrinterSettings } from '../../../Services/kitchenPrintingService';
import * as S from './KitchenPrintPreview.styles';

type PreviewMode = 'delivery' | 'table' | 'pickup';

const previews = {
  delivery: {
    label: 'Delivery',
    icon: Bike,
    service: 'DELIVERY',
    reference: 'Pedido #1842',
    customer: 'Marina Costa',
    context: 'Rua das Flores, 120 • Centro',
    secondary: 'PIX • Pago',
    note: 'Tocar o interfone. Casa dos fundos.',
    items: [
      { quantity: 1, name: 'Pizza grande', details: ['½ Calabresa', '½ Portuguesa', '+ Catupiry'] },
      { quantity: 1, name: 'Coca-Cola 2 L', details: ['Bem gelada'] },
    ],
  },
  table: {
    label: 'Mesa',
    icon: QrCode,
    service: 'MESA 12',
    reference: 'Comanda #73',
    customer: 'Atendimento no salão',
    context: 'Mesa 12 • 4 pessoas',
    secondary: 'Garçom Rafael',
    note: 'Enviar a entrada antes da pizza.',
    items: [
      { quantity: 1, name: 'Porção de fritas', details: ['Molho da casa separado'] },
      { quantity: 1, name: 'Pizza família', details: ['½ Frango', '½ Marguerita'] },
    ],
  },
  pickup: {
    label: 'Retirada',
    icon: ShoppingBag,
    service: 'RETIRADA',
    reference: 'Pedido #1843',
    customer: 'Carlos Lima',
    context: 'Retirada no balcão',
    secondary: 'Pagamento na retirada',
    note: 'Cliente chega às 20:15.',
    items: [
      { quantity: 2, name: 'Pizza broto', details: ['Calabresa • sem cebola'] },
      { quantity: 1, name: 'Suco de laranja', details: ['Sem gelo'] },
    ],
  },
} satisfies Record<
  PreviewMode,
  {
    label: string;
    icon: typeof Bike;
    service: string;
    reference: string;
    customer: string;
    context: string;
    secondary: string;
    note: string;
    items: Array<{ quantity: number; name: string; details: string[] }>;
  }
>;

export function KitchenPrintPreview({ settings }: { settings: KitchenPrinterSettings }) {
  const [mode, setMode] = useState<PreviewMode>('delivery');
  const preview = previews[mode];
  const trigger = !settings.autoPrintEnabled
    ? 'Impressão manual'
    : settings.autoPrintTrigger === 'NEW_ORDER'
      ? 'Ao entrar na cozinha'
      : 'Após confirmar pagamento';

  return (
    <S.Root className="command-preview-panel" aria-labelledby="command-preview-title">
      <div className="preview-controls">
        <header className="preview-heading">
          <span className="preview-heading-icon" aria-hidden="true">
            <ReceiptText />
          </span>
          <div>
            <span className="eyebrow">Prévia da cozinha</span>
            <h3 id="command-preview-title">Veja as 3 comandas antes de imprimir</h3>
            <p>Alterne o tipo de pedido para conferir as informações recebidas pela equipe.</p>
          </div>
        </header>

        <div className="preview-tabs" role="tablist" aria-label="Tipo de comanda de exemplo">
          {(Object.entries(previews) as Array<[PreviewMode, (typeof previews)[PreviewMode]]>).map(
            ([value, option]) => {
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
                  <ModeIcon aria-hidden="true" />
                  {option.label}
                </button>
              );
            },
          )}
        </div>

        <div className="preview-settings" aria-label="Configuração aplicada à prévia">
          <span>
            <Ruler aria-hidden="true" /> {settings.paperWidth === 'MM58' ? '58 mm' : '80 mm'}
          </span>
          <span>
            <Copy aria-hidden="true" /> {settings.copies} {settings.copies === 1 ? 'via' : 'vias'}
          </span>
          <span>
            <Clock3 aria-hidden="true" /> {trigger}
          </span>
        </div>
      </div>

      <div className="receipt-stage">
        <article
          aria-labelledby={`command-preview-${mode}-tab`}
          className={`receipt-paper ${settings.paperWidth === 'MM58' ? 'paper-58' : 'paper-80'}`}
          id={`command-preview-${mode}`}
          role="tabpanel"
        >
          <span className="receipt-sample">EXEMPLO</span>
          <header className="receipt-brand">
            <strong>SEU RESTAURANTE</strong>
            <span>COMANDA DA COZINHA</span>
          </header>

          <div className="receipt-order">
            <span className={`receipt-service ${mode}`}>{preview.service}</span>
            <strong>{preview.reference}</strong>
            <small>02/09/2026 • 19:42</small>
          </div>

          <div className="receipt-customer">
            <p>
              <UserRound aria-hidden="true" /> <b>{preview.customer}</b>
            </p>
            <p>
              <MapPin aria-hidden="true" /> {preview.context}
            </p>
            <p>
              <ReceiptText aria-hidden="true" /> {preview.secondary}
            </p>
          </div>

          <div className="receipt-items">
            {preview.items.map((item) => (
              <div className="receipt-item" key={`${mode}-${item.name}`}>
                <b>{item.quantity}x</b>
                <span>
                  <strong>{item.name}</strong>
                  {item.details.map((detail) => (
                    <small key={detail}>{detail}</small>
                  ))}
                </span>
              </div>
            ))}
          </div>

          <div className="receipt-note">
            <b>OBSERVAÇÃO</b>
            <span>{preview.note}</span>
          </div>

          <footer className="receipt-footer">
            <span>{trigger}</span>
            <b>
              Via 1 de {settings.copies} • {settings.paperWidth === 'MM58' ? '58 mm' : '80 mm'}
            </b>
          </footer>
        </article>
      </div>
    </S.Root>
  );
}
