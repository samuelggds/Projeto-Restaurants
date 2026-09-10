import { CheckCircle2, CircleHelp, ImageOff, Store, Truck } from 'lucide-react';
import { type FormEvent, useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useOperationServices } from './services';
import { type Raw, type Product } from './types';
import { asRecord, money, errorMessage } from './format';
import { Guide } from './shared.styles';
import {
  CreateForm,
  Step,
  ChoiceRow,
  FieldGrid,
  PaymentRow,
  CategoryList,
  Category,
  CategoryHeader,
  ProductGrid,
  ProductCard,
  ProductImage,
  Quantity,
  Review,
} from './CreateOrder.styles';

export function CreateOrder({
  restaurantId,
  onCreated,
}: {
  restaurantId: number;
  onCreated: () => void;
}) {
  const services = useOperationServices();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [type, setType] = useState<'RETIRADA' | 'DELIVERY'>('RETIRADA');
  const [customerName, setCustomerName] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payment, setPayment] = useState<'CARTAO' | 'PIX'>('CARTAO');
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState({
    address: '',
    number: '',
    district: '',
    city: '',
    state: '',
    zipCode: '',
    complement: '',
  });

  useEffect(() => {
    let active = true;
    services
      .listProducts(restaurantId)
      .then((values) => {
        if (!active) return;
        const normalized = (Array.isArray(values) ? values : []).flatMap((value: unknown) => {
          const item = asRecord(value);
          const category = asRecord(item.category);
          const id = Number(item.id);
          const name = String(item.name || '').trim();
          if (!Number.isSafeInteger(id) || id <= 0 || !name) return [];
          const price = Number(item.price);
          const image = String(item.image || item.imageUrl || '').trim();
          return [
            {
              id,
              name,
              price: Number.isFinite(price) ? price : 0,
              stock: item.stock == null ? null : Number(item.stock),
              category: String(category.name || item.categoryName || 'Outros').trim() || 'Outros',
              image: image || null,
            },
          ];
        });
        setProducts(normalized);
      })
      .catch(() => toast.error('Não foi possível carregar o cardápio.'));
    return () => {
      active = false;
    };
  }, [restaurantId, services]);

  const selected = products.filter((product) => (cart[product.id] || 0) > 0);
  const total = selected.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0);
  const grouped = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      groups.set(product.category, [...(groups.get(product.category) || []), product]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [products]);

  function changeQuantity(id: number, delta: number) {
    setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (customerName.trim().length < 2) return void toast.warning('Informe o nome do cliente.');
    if (customerCpf.replace(/\D/g, '').length !== 11)
      return void toast.warning('Informe o CPF do cliente com 11 dígitos.');
    if (customerPhone.replace(/\D/g, '').length < 10)
      return void toast.warning('Informe um telefone com DDD.');
    if (!selected.length) return void toast.warning('Adicione pelo menos um item ao pedido.');
    if (
      type === 'DELIVERY' &&
      (!address.address.trim() ||
        !address.number.trim() ||
        !address.district.trim() ||
        !address.city.trim() ||
        address.state.trim().length !== 2 ||
        address.zipCode.replace(/\D/g, '').length !== 8)
    )
      return void toast.warning('Preencha o endereço completo do delivery.');

    setSubmitting(true);
    try {
      const payload: Raw = {
        restaurantId,
        type,
        customerName: customerName.trim(),
        customerCpf: customerCpf.replace(/\D/g, ''),
        customerPhone: customerPhone.trim(),
        items: selected.map((product) => ({ productId: product.id, quantity: cart[product.id] })),
        payOnDelivery: type === 'DELIVERY',
      };
      if (type === 'DELIVERY') {
        Object.assign(payload, address, { paymentMethod: payment, payOnDeliveryMethod: payment });
      }
      await services.createOrder(payload);
      toast.success('Pedido registrado. Ele já entrou na operação.');
      onCreated();
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível registrar o pedido.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CreateForm onSubmit={submit}>
      <Guide>
        <CircleHelp />
        <div>
          <strong>Quando usar?</strong>
          <p>Pedidos por telefone, WhatsApp ou balcão. Pedido de mesa continua pela sessão/QR.</p>
        </div>
      </Guide>
      <Step>
        <span>1</span>
        <div>
          <h3>Como o cliente vai receber?</h3>
          <p>Escolha retirada ou delivery.</p>
          <ChoiceRow>
            <button
              type="button"
              className={type === 'RETIRADA' ? 'active' : ''}
              onClick={() => setType('RETIRADA')}
            >
              <Store /> Retirada no balcão
            </button>
            <button
              type="button"
              className={type === 'DELIVERY' ? 'active' : ''}
              onClick={() => setType('DELIVERY')}
            >
              <Truck /> Delivery
            </button>
          </ChoiceRow>
        </div>
      </Step>
      <Step>
        <span>2</span>
        <div>
          <h3>Quem é o cliente?</h3>
          <p>Esses dados identificam corretamente o pedido.</p>
          <FieldGrid>
            <label>
              Nome
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Ex.: Samuel Gomes"
              />
            </label>
            <label>
              Telefone
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="(85) 99999-9999"
              />
            </label>
            <label>
              CPF
              <input
                value={customerCpf}
                onChange={(event) => setCustomerCpf(event.target.value)}
                placeholder="000.000.000-00"
              />
            </label>
          </FieldGrid>
        </div>
      </Step>
      {type === 'DELIVERY' && (
        <Step>
          <span>3</span>
          <div>
            <h3>Para onde vai o pedido?</h3>
            <p>Revise o endereço antes de confirmar.</p>
            <FieldGrid>
              <label>
                Rua
                <input
                  value={address.address}
                  onChange={(event) => setAddress({ ...address, address: event.target.value })}
                />
              </label>
              <label>
                Número
                <input
                  value={address.number}
                  onChange={(event) => setAddress({ ...address, number: event.target.value })}
                />
              </label>
              <label>
                Bairro
                <input
                  value={address.district}
                  onChange={(event) => setAddress({ ...address, district: event.target.value })}
                />
              </label>
              <label>
                Cidade
                <input
                  value={address.city}
                  onChange={(event) => setAddress({ ...address, city: event.target.value })}
                />
              </label>
              <label>
                UF
                <input
                  maxLength={2}
                  value={address.state}
                  onChange={(event) =>
                    setAddress({ ...address, state: event.target.value.toUpperCase() })
                  }
                />
              </label>
              <label>
                CEP
                <input
                  value={address.zipCode}
                  onChange={(event) => setAddress({ ...address, zipCode: event.target.value })}
                />
              </label>
              <label className="wide">
                Complemento
                <input
                  value={address.complement}
                  onChange={(event) => setAddress({ ...address, complement: event.target.value })}
                />
              </label>
            </FieldGrid>
            <PaymentRow>
              <button
                type="button"
                className={payment === 'CARTAO' ? 'active' : ''}
                onClick={() => setPayment('CARTAO')}
              >
                Cartão na entrega
              </button>
              <button
                type="button"
                className={payment === 'PIX' ? 'active' : ''}
                onClick={() => setPayment('PIX')}
              >
                Pix na entrega
              </button>
            </PaymentRow>
          </div>
        </Step>
      )}
      <Step>
        <span>{type === 'DELIVERY' ? '4' : '3'}</span>
        <div>
          <h3>Monte o pedido</h3>
          <p>Produtos organizados por categoria para encontrar mais rápido.</p>
          <CategoryList>
            {grouped.map(([category, categoryProducts]) => (
              <Category key={category}>
                <CategoryHeader>
                  <strong>{category}</strong>
                  <small>{categoryProducts.length} produto(s)</small>
                </CategoryHeader>
                <ProductGrid>
                  {categoryProducts.map((product) => {
                    const quantity = cart[product.id] || 0;
                    const unavailable = product.stock === 0;
                    return (
                      <ProductCard key={product.id} $disabled={unavailable}>
                        <ProductImage>
                          {product.image ? (
                            <img src={product.image} alt={product.name} loading="lazy" />
                          ) : (
                            <ImageOff />
                          )}
                        </ProductImage>
                        <div className="copy">
                          <b>{product.name}</b>
                          <small>
                            {money(product.price)}
                            {unavailable ? ' · Indisponível' : ''}
                          </small>
                          {product.stock != null && !unavailable ? (
                            <em>{product.stock} em estoque</em>
                          ) : null}
                        </div>
                        <Quantity>
                          <button
                            type="button"
                            aria-label={`Remover ${product.name}`}
                            disabled={!quantity}
                            onClick={() => changeQuantity(product.id, -1)}
                          >
                            −
                          </button>
                          <strong>{quantity}</strong>
                          <button
                            type="button"
                            aria-label={`Adicionar ${product.name}`}
                            disabled={unavailable}
                            onClick={() => changeQuantity(product.id, 1)}
                          >
                            +
                          </button>
                        </Quantity>
                      </ProductCard>
                    );
                  })}
                </ProductGrid>
              </Category>
            ))}
          </CategoryList>
        </div>
      </Step>
      <Review>
        <span>
          <small>Total estimado</small>
          <strong>{money(total)}</strong>
          <p>
            {selected.reduce((sum, product) => sum + (cart[product.id] || 0), 0)} item(ns) no pedido
          </p>
        </span>
        <button type="submit" disabled={submitting || !selected.length}>
          <CheckCircle2 /> {submitting ? 'Registrando...' : 'Confirmar pedido'}
        </button>
      </Review>
    </CreateForm>
  );
}
