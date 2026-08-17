import { useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import restaurantsService, {
  type CreateRestaurantPayload,
} from '../../../Services/restaurantsService';
import * as S from '../SuperAdmin.styles';

type Props = {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
};

const initialForm: CreateRestaurantPayload = {
  plan: 'BASICO',
  restaurant: { name: '', slug: '', email: '', phone: '' },
  admin: { name: '', email: '', password: '' },
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function CreateRestaurantDialog({ onClose, onCreated }: Props) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const planDescription = useMemo(
    () =>
      form.plan === 'PREMIUM'
        ? 'Premium — R$ 249,90/mês: delivery, cardápio digital com QR Code de mesa e suporte prioritário.'
        : 'Básico — R$ 149,90/mês: sistema de delivery e suporte padrão.',
    [form.plan],
  );

  const setRestaurant = (field: keyof CreateRestaurantPayload['restaurant'], value: string) => {
    setForm((current) => ({
      ...current,
      restaurant: {
        ...current.restaurant,
        [field]: value,
        ...(field === 'name' && !current.restaurant.slug ? { slug: slugify(value) } : {}),
      },
    }));
  };

  const setAdmin = (field: keyof CreateRestaurantPayload['admin'], value: string) => {
    setForm((current) => ({
      ...current,
      admin: { ...current.admin, [field]: value },
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await restaurantsService.createRestaurant(form);
      await onCreated();
      onClose();
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response
        ?.data?.message;
      setError(message || 'Não foi possível criar o restaurante.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <S.CreateBackdrop role="presentation" onMouseDown={onClose}>
      <S.CreateDialog
        aria-label="Criar restaurante"
        onSubmit={(event) => void submit(event)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>Novo restaurante</h2>
            <p>Cadastre o restaurante, o administrador e o plano escolhido.</p>
          </div>
          <button className="close" type="button" aria-label="Fechar" onClick={onClose}>
            <X size={19} />
          </button>
        </header>

        <div className="fields">
          <label>
            Nome do restaurante
            <input
              required
              minLength={2}
              value={form.restaurant.name}
              onChange={(event) => setRestaurant('name', event.target.value)}
            />
          </label>
          <label>
            Endereço da loja (slug)
            <input
              required
              minLength={3}
              value={form.restaurant.slug}
              onChange={(event) => setRestaurant('slug', slugify(event.target.value))}
            />
          </label>
          <label>
            E-mail do restaurante
            <input
              required
              type="email"
              value={form.restaurant.email}
              onChange={(event) => setRestaurant('email', event.target.value)}
            />
          </label>
          <label>
            Telefone
            <input
              inputMode="numeric"
              value={form.restaurant.phone}
              onChange={(event) => setRestaurant('phone', event.target.value)}
            />
          </label>
          <label>
            Nome do administrador
            <input
              required
              minLength={2}
              value={form.admin.name}
              onChange={(event) => setAdmin('name', event.target.value)}
            />
          </label>
          <label>
            E-mail do administrador
            <input
              required
              type="email"
              value={form.admin.email}
              onChange={(event) => setAdmin('email', event.target.value)}
            />
          </label>
          <label>
            Senha inicial
            <input
              required
              type="password"
              minLength={6}
              value={form.admin.password}
              onChange={(event) => setAdmin('password', event.target.value)}
            />
          </label>
          <label>
            Plano escolhido pelo cliente
            <select
              value={form.plan}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  plan: event.target.value as CreateRestaurantPayload['plan'],
                }))
              }
            >
              <option value="BASICO">Plano Básico — R$ 149,90</option>
              <option value="PREMIUM">Plano Premium — R$ 249,90</option>
            </select>
          </label>
          <div className="plan-help">{planDescription}</div>
          {error ? <div className="form-error">{error}</div> : null}
        </div>

        <footer>
          <button className="cancel" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="submit" type="submit" disabled={saving}>
            {saving ? 'Criando...' : 'Criar restaurante'}
          </button>
        </footer>
      </S.CreateDialog>
    </S.CreateBackdrop>
  );
}
