import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../../contexts/authContext';
import productsService from '../../../Services/productsService';
import settingsService from '../../../Services/restaurantSettingsService';
import TrialPhotoImport from './TrialPhotoImport';
import { trialRequestError, type TrialAccess, type TrialDetails } from './trialApi';
import './TrialMenuSetup.css';

type Product = {
  id: number;
  name: string;
  price: number | string;
  active: boolean;
  image?: string;
  description?: string;
  configurationVersion: number;
};

export default function TrialMenuSetup({
  access,
  details,
}: {
  access: TrialAccess;
  details: TrialDetails;
}) {
  const { user } = useAuth();
  const tenantId =
    user?.role === 'ADMIN' && user.email.toLowerCase() === details.email.toLowerCase()
      ? Number(user.restaurantId)
      : 0;
  const [products, setProducts] = useState<Product[]>([]);
  const [settingsId, setSettingsId] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const loadProducts = useCallback(async () => {
    if (!tenantId) return;
    setProducts((await productsService.listProducts(tenantId)) as Product[]);
  }, [tenantId]);

  useEffect(() => {
    let current = true;
    if (!tenantId) return;
    setSettingsId(0);
    setError('');
    Promise.all([productsService.listProducts(tenantId), settingsService.getMySettings()])
      .then(([items, settings]) => {
        if (!current) return;
        if (settings.restaurantId !== tenantId) throw new Error('Restaurante indisponível.');
        setProducts(items as Product[]);
        setSettingsId(settings.id);
        setOpen(settings.isOpenForOrders === true);
      })
      .catch(() => {
        if (current) setError('Não conseguimos carregar o cardápio da sua loja.');
      });
    return () => {
      current = false;
    };
  }, [tenantId, attempt]);

  async function saveProduct(event: FormEvent<HTMLFormElement>, item: Product) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await productsService.updateProduct(item.id, {
        name: String(values.get('name')).trim(),
        description: String(values.get('description') ?? '').trim(),
        price: Number(values.get('price')),
        active: values.has('active'),
        expectedConfigurationVersion: item.configurationVersion,
      });
      setEditing(null);
      await loadProducts();
      setNotice('Produto atualizado.');
    } catch (cause) {
      setError(trialRequestError(cause, 'Não foi possível salvar o produto.'));
    } finally {
      setBusy(false);
    }
  }

  async function openStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || review || editing || !settingsId || !products.some((p) => p.active)) return;
    const fields = new FormData(event.currentTarget);
    const text = (name: string) => String(fields.get(name) || '').trim();
    setError('');
    setBusy(true);
    setNotice('');
    try {
      await settingsService.updateSettings(settingsId, {
        restaurantAddress: text('street'),
        restaurantAddressNumber: text('number'),
        restaurantCity: text('city'),
        restaurantAddressDistrict: text('district'),
        restaurantState: text('state').toUpperCase(),
        restaurantZipCode: text('zip'),
        acceptsPickup: true,
        acceptsDelivery: fields.has('delivery'),
        deliveryFee: Number(fields.get('fee') || 0),
        isOpenForOrders: true,
      });
      setOpen(true);
      setNotice('Sua loja está aberta para pedidos.');
    } catch (cause) {
      setError(trialRequestError(cause, 'Confira o endereço e tente abrir a loja novamente.'));
    } finally {
      setBusy(false);
    }
  }

  if (!tenantId) return null;
  if (!settingsId)
    return (
      <div role="status">
        {error || 'Carregando seu cardápio…'}{' '}
        {error && <button onClick={() => setAttempt(attempt + 1)}>Tentar novamente</button>}
      </div>
    );
  return (
    <div className="gx-setup">
      <h2>Prepare sua loja para vender</h2>
      <p>
        Estes são os produtos iniciais de {details.restaurantName}. Confira as fotos, descrições e
        preços. Você pode ocultar os itens que não vende.
      </p>
      <div className="gx-setup__catalog">
        {products.map((item) => (
          <article key={item.id}>
            {editing === item.id ? (
              <form
                onSubmit={(event) => void saveProduct(event, item)}
                className="gx-trial__fields"
              >
                <label>
                  Nome
                  <input required name="name" maxLength={160} defaultValue={item.name} />
                </label>
                <label>
                  Descrição
                  <textarea name="description" defaultValue={item.description} />
                </label>
                <label>
                  Preço em reais
                  <input
                    type="number"
                    name="price"
                    required
                    step="0.01"
                    min="0.01"
                    defaultValue={Number(item.price)}
                  />
                </label>
                <label>
                  <input type="checkbox" name="active" defaultChecked={item.active} /> Oferecer este
                  produto
                </label>
                <button disabled={busy}>Salvar produto</button>
                <button type="button" disabled={busy} onClick={() => setEditing(null)}>
                  Voltar
                </button>
              </form>
            ) : (
              <>
                {item.image && <img src={item.image} alt="" loading="lazy" />}
                <strong>{item.name}</strong>
                <span>
                  {Number(item.price).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                  {!item.active && ' · Oculto'}
                </span>
                <button
                  type="button"
                  disabled={editing !== null || busy}
                  onClick={() => setEditing(item.id)}
                >
                  Editar {item.name}
                </button>
              </>
            )}
          </article>
        ))}
      </div>
      <TrialPhotoImport onPublished={loadProducts} onReviewChange={setReview} />
      {open ? (
        <a className="gx-trial__primary" href={access.menuPath}>
          Ver meu cardápio público
        </a>
      ) : (
        <form className="gx-trial__fields gx-setup__open" onSubmit={openStore}>
          <h3>Onde os clientes retiram os pedidos?</h3>
          <div className="gx-trial__pair">
            <label>
              Rua
              <input name="street" required minLength={3} autoComplete="address-line1" />
            </label>
            <label>
              Número
              <input name="number" required />
            </label>
          </div>
          <div className="gx-trial__pair">
            <label>
              Bairro
              <input name="district" required minLength={2} />
            </label>
            <label>
              CEP
              <input
                name="zip"
                required
                pattern="[0-9]{5}-?[0-9]{3}"
                inputMode="numeric"
                autoComplete="postal-code"
              />
            </label>
          </div>
          <div className="gx-trial__pair">
            <label>
              Cidade
              <input name="city" required minLength={2} autoComplete="address-level2" />
            </label>
            <label>
              UF
              <input
                name="state"
                required
                pattern="[A-Za-z]{2}"
                maxLength={2}
                autoComplete="address-level1"
              />
            </label>
          </div>
          <label>
            <input name="delivery" type="checkbox" /> Também aceitar entrega
          </label>
          <label>
            Taxa de entrega em reais
            <input type="number" name="fee" min="0" step="0.01" defaultValue="0" />
          </label>
          <label>
            <input type="checkbox" required /> Conferi os produtos, preços e endereço para começar a
            receber pedidos.
          </label>
          <button
            type="submit"
            className="gx-trial__primary"
            disabled={busy || review || editing !== null || !products.some((p) => p.active)}
          >
            Abrir minha loja para pedidos
          </button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="gx-trial__error">
          {error}
        </p>
      )}
    </div>
  );
}
