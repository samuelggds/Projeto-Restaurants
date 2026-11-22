import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  QrCode,
  ReceiptText,
  ShoppingBag,
  TicketPercent,
  Trash2,
} from 'lucide-react';
import './DemoCheckout.css';
import { formatPrice as money } from './demoSession';

export type DemoAddress = { street: string; number: string; district: string; city: string };
export type DemoBagLine = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};
export type DemoPayment = 'Pix' | 'Cartão na entrega';
type CheckoutView = 'bag' | 'address' | 'payment';
type CheckoutTotals = { subtotal: number; discount: number; delivery: number; total: number };

type Props = {
  screen: CheckoutView;
  lines: DemoBagLine[];
  address: DemoAddress | null;
  addressOrigin: 'menu' | 'bag' | 'payment';
  coupon: boolean;
  onQuantity: (id: string, quantity: number) => void;
  onAddress: (address: DemoAddress) => void;
  onNavigate: (screen: 'menu' | CheckoutView | 'coupons') => void;
  onPay: (method: DemoPayment) => void;
  totals: CheckoutTotals;
};

const exampleAddress: DemoAddress = {
  street: 'Rua das Pitangueiras',
  number: '120',
  district: 'Jardim do Sol',
  city: 'Vila das Flores',
};
const headings: Record<CheckoutView, string> = {
  bag: 'Minha sacola',
  address: 'Endereço de entrega',
  payment: 'Pagamento',
};

function Recap({ totals }: { totals: CheckoutTotals }) {
  return (
    <section className="gx-checkout__recap" aria-label="Resumo do pedido">
      <h4>
        <ReceiptText size={18} aria-hidden="true" />
        Resumo do pedido
      </h4>
      <dl>
        <div>
          <dt>Subtotal dos produtos</dt>
          <dd>{money(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="gx-checkout__discount">
            <dt>Desconto do cupom</dt>
            <dd>− {money(totals.discount)}</dd>
          </div>
        )}
        <div>
          <dt>Taxa de entrega</dt>
          <dd>{totals.delivery ? money(totals.delivery) : 'Grátis'}</dd>
        </div>
        <div className="gx-checkout__total">
          <dt>Total</dt>
          <dd>{money(totals.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

function AddressForm({ address, onAddress }: Pick<Props, 'address' | 'onAddress'>) {
  const initial = address ?? exampleAddress;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (field: keyof DemoAddress) => String(data.get(field) ?? '').trim();
    onAddress({
      street: value('street'),
      number: value('number'),
      district: value('district'),
      city: value('city'),
    });
  }

  return (
    <form className="gx-checkout__address-form" onSubmit={save} autoComplete="off">
      <p className="gx-checkout__intro">
        Use o endereço fictício abaixo ou edite os campos para experimentar.
      </p>
      <label>
        Rua ou avenida
        <input
          name="street"
          defaultValue={initial.street}
          required
          pattern=".*\S.*"
          maxLength={100}
        />
      </label>
      <div className="gx-checkout__fields">
        <label>
          Número
          <input
            name="number"
            defaultValue={initial.number}
            required
            pattern=".*\S.*"
            maxLength={12}
          />
        </label>
        <label>
          Bairro
          <input
            name="district"
            defaultValue={initial.district}
            required
            pattern=".*\S.*"
            maxLength={80}
          />
        </label>
      </div>
      <label>
        Cidade
        <input name="city" defaultValue={initial.city} required pattern=".*\S.*" maxLength={80} />
      </label>
      <button className="gx-checkout__primary" type="submit">
        Salvar endereço
      </button>
    </form>
  );
}

function Payment({
  address,
  totals,
  onNavigate,
  onPay,
}: Pick<Props, 'address' | 'totals' | 'onNavigate' | 'onPay'>) {
  const [method, setMethod] = useState<DemoPayment>('Pix');
  const choices = [
    { name: 'Pix', icon: QrCode, detail: 'Experimente a confirmação instantânea do pagamento.' },
    {
      name: 'Cartão na entrega',
      icon: CreditCard,
      detail: 'O cliente escolhe pagar ao receber o pedido.',
    },
  ] as const;
  return (
    <>
      <button type="button" className="gx-checkout__row" onClick={() => onNavigate('address')}>
        <MapPin size={20} aria-hidden="true" />
        <span>
          <strong>{address ? `${address.street}, ${address.number}` : 'Escolher endereço'}</strong>
          {address && (
            <small>
              {address.district} · {address.city}
            </small>
          )}
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
      <fieldset className="gx-checkout__methods">
        <legend>Como deseja pagar?</legend>
        {choices.map(({ name, icon: Icon, detail }) => (
          <label key={name}>
            <Icon size={22} aria-hidden="true" />
            <span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </span>
            <input
              type="radio"
              name="demo-payment"
              value={name}
              checked={method === name}
              onChange={() => setMethod(name)}
            />
          </label>
        ))}
      </fieldset>
      <Recap totals={totals} />
      <p className="gx-checkout__note">Pedido de demonstração, sem cobrança.</p>
      <button
        type="button"
        className="gx-checkout__primary"
        onClick={() => (address ? onPay(method) : onNavigate('address'))}
      >
        {address
          ? method === 'Pix'
            ? 'Simular pagamento Pix'
            : 'Confirmar pedido de exemplo'
          : 'Escolher endereço'}
      </button>
    </>
  );
}

export function DemoCheckout({
  screen,
  lines,
  address,
  addressOrigin,
  coupon,
  totals,
  onNavigate,
  onQuantity,
  onAddress,
  onPay,
}: Props) {
  const back = screen === 'address' ? addressOrigin : screen === 'bag' ? 'menu' : 'bag';
  const backLabels = {
    menu: 'Voltar ao cardápio',
    bag: 'Voltar à sacola',
    payment: 'Voltar ao pagamento',
  };
  return (
    <section className="gx-checkout" aria-label={headings[screen]}>
      <header className="gx-checkout__head">
        <button type="button" aria-label={backLabels[back]} onClick={() => onNavigate(back)}>
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <h3>{headings[screen]}</h3>
      </header>
      {screen === 'address' ? (
        <AddressForm address={address} onAddress={onAddress} />
      ) : lines.length === 0 ? (
        <div className="gx-checkout__empty">
          <ShoppingBag size={35} aria-hidden="true" />
          <h4>Sua sacola está vazia</h4>
          <p>Escolha um produto do cardápio para começar o pedido.</p>
          <button type="button" className="gx-checkout__primary" onClick={() => onNavigate('menu')}>
            Ver cardápio
          </button>
        </div>
      ) : screen === 'payment' ? (
        <Payment address={address} totals={totals} onNavigate={onNavigate} onPay={onPay} />
      ) : (
        <>
          <ul className="gx-checkout__lines">
            {lines.map((line) => (
              <li key={line.id}>
                <img src={line.image} width={64} height={64} alt="" />
                <div>
                  <strong>{line.name}</strong>
                  <small>{money(line.price)} cada</small>
                </div>
                <div className="gx-checkout__line-end">
                  <b>{money(line.price * line.quantity)}</b>
                  <div
                    className="gx-checkout__stepper"
                    role="group"
                    aria-label={`Quantidade de ${line.name}`}
                  >
                    <button
                      type="button"
                      aria-label={`${line.quantity === 1 ? 'Remover' : 'Diminuir'} ${line.name}`}
                      onClick={() => onQuantity(line.id, line.quantity - 1)}
                    >
                      {line.quantity === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                    </button>
                    <span aria-live="polite">{line.quantity}</span>
                    <button
                      type="button"
                      disabled={line.quantity >= 99}
                      aria-label={`Aumentar ${line.name}`}
                      onClick={() => onQuantity(line.id, line.quantity + 1)}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="gx-checkout__text-button"
            onClick={() => onNavigate('menu')}
          >
            Adicionar mais produtos
          </button>
          <button type="button" className="gx-checkout__row" onClick={() => onNavigate('coupons')}>
            <TicketPercent size={20} aria-hidden="true" />
            <span>{coupon ? 'Cupom aplicado' : 'Escolher cupom'}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <Recap totals={totals} />
          <button
            type="button"
            className="gx-checkout__primary"
            onClick={() => onNavigate(address ? 'payment' : 'address')}
          >
            {address ? 'Ir para pagamento' : 'Escolher endereço'}
          </button>
        </>
      )}
    </section>
  );
}
