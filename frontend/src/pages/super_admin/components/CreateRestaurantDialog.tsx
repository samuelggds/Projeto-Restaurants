import { useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  evaluatePassword,
  PasswordRequirements,
  PRIVILEGED_PASSWORD_POLICY,
} from '../../../features/password-policy';
import superAdminService, { type CreateRestaurantInput } from '../../../Services/superAdminService';
import {
  RESTAURANT_CATEGORY_OPTIONS,
  type RestaurantCategory,
} from '../../../config/restaurantCategory';
import {
  formatCurrency,
  normalizeEmail,
  requestErrorMessage,
  slugify,
} from '../domain/superAdminDomain';
import type { PlatformPlan } from '../types';
import * as S from '../SuperAdmin.styles';
import { useDialogFocusManagement } from '../hooks/useDialogFocusManagement';

type Props = { plans: PlatformPlan[]; onClose: () => void; onCreated: () => void | Promise<void> };
type Form = CreateRestaurantInput & { passwordConfirmation: string };

export function CreateRestaurantDialog({ plans, onClose, onCreated }: Props) {
  const dialogRef = useDialogFocusManagement<HTMLFormElement>(onClose);
  const firstPlan = plans.find((plan) => plan.active)?.code || plans[0]?.code || '';
  const [form, setForm] = useState<Form>({
    plan: firstPlan,
    restaurant: {
      name: '',
      slug: '',
      email: '',
      phone: '',
      category: 'RESTAURANTE',
    },
    admin: { name: '', email: '', password: '' },
    passwordConfirmation: '',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedPlan = plans.find((plan) => plan.code === form.plan);
  const passwordEvaluation = useMemo(
    () =>
      evaluatePassword(form.admin.password, form.passwordConfirmation, PRIVILEGED_PASSWORD_POLICY),
    [form.admin.password, form.passwordConfirmation],
  );

  const setRestaurant = <K extends keyof Form['restaurant']>(
    field: K,
    value: Form['restaurant'][K],
  ) => {
    setForm((current) => ({
      ...current,
      restaurant: {
        ...current.restaurant,
        [field]: value,
        ...(field === 'name' && !slugEdited ? { slug: slugify(String(value)) } : {}),
      },
    }));
  };
  const setAdmin = (field: keyof Form['admin'], value: string) =>
    setForm((current) => ({ ...current, admin: { ...current.admin, [field]: value } }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.plan) {
      setError('Selecione um plano ativo.');
      return;
    }
    if (!passwordEvaluation.isValid) {
      setError(passwordEvaluation.errors.join(' '));
      return;
    }
    setSaving(true);
    try {
      await superAdminService.createRestaurant({
        plan: form.plan,
        restaurant: {
          ...form.restaurant,
          name: form.restaurant.name.trim(),
          slug: slugify(form.restaurant.slug),
          email: normalizeEmail(form.restaurant.email),
          phone: form.restaurant.phone?.replace(/\D/g, ''),
        },
        admin: {
          ...form.admin,
          name: form.admin.name.trim(),
          email: normalizeEmail(form.admin.email),
        },
      });
      await onCreated();
      onClose();
    } catch (requestError) {
      setError(requestErrorMessage(requestError, 'Não foi possível criar o restaurante.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <S.CreateBackdrop onMouseDown={onClose}>
      <S.CreateDialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Criar restaurante"
        onSubmit={(event) => void submit(event)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>Novo restaurante</h2>
            <p>Crie o tenant, defina o tipo de estabelecimento e configure o acesso inicial.</p>
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
              maxLength={120}
              value={form.restaurant.name}
              onChange={(e) => setRestaurant('name', e.target.value)}
            />
          </label>
          <label>
            Categoria do estabelecimento
            <select
              required
              value={form.restaurant.category}
              onChange={(e) =>
                setRestaurant('category', e.target.value as RestaurantCategory)
              }
            >
              {RESTAURANT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Endereço público (slug)
            <input
              required
              minLength={3}
              maxLength={60}
              pattern="[a-z0-9-]+"
              value={form.restaurant.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setRestaurant('slug', slugify(e.target.value));
              }}
            />
          </label>
          <label>
            E-mail do restaurante
            <input
              required
              type="email"
              value={form.restaurant.email}
              onChange={(e) => setRestaurant('email', e.target.value)}
            />
          </label>
          <label>
            Telefone
            <input
              inputMode="numeric"
              placeholder="DDD + número"
              value={form.restaurant.phone}
              onChange={(e) => setRestaurant('phone', e.target.value)}
            />
          </label>
          <label>
            Nome do administrador
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.admin.name}
              onChange={(e) => setAdmin('name', e.target.value)}
            />
          </label>
          <label>
            E-mail do administrador
            <input
              required
              type="email"
              autoComplete="off"
              value={form.admin.email}
              onChange={(e) => setAdmin('email', e.target.value)}
            />
          </label>
          <label>
            Senha temporária
            <input
              required
              type="password"
              minLength={PRIVILEGED_PASSWORD_POLICY.minLength}
              maxLength={PRIVILEGED_PASSWORD_POLICY.maxLength}
              autoComplete="new-password"
              aria-describedby="restaurant-admin-password-requirements"
              value={form.admin.password}
              onChange={(e) => setAdmin('password', e.target.value)}
            />
          </label>
          <label>
            Confirmar senha
            <input
              required
              type="password"
              minLength={PRIVILEGED_PASSWORD_POLICY.minLength}
              maxLength={PRIVILEGED_PASSWORD_POLICY.maxLength}
              autoComplete="new-password"
              aria-describedby="restaurant-admin-password-requirements"
              value={form.passwordConfirmation}
              onChange={(e) =>
                setForm((current) => ({ ...current, passwordConfirmation: e.target.value }))
              }
            />
          </label>
          <div className="wide">
            <PasswordRequirements
              id="restaurant-admin-password-requirements"
              password={form.admin.password}
              confirmation={form.passwordConfirmation}
              policy={PRIVILEGED_PASSWORD_POLICY}
              title="A senha temporária precisa ter:"
            />
          </div>
          <label className="wide">
            Plano
            <select
              required
              value={form.plan}
              onChange={(e) => setForm((current) => ({ ...current, plan: e.target.value }))}
            >
              {plans
                .filter((plan) => plan.active)
                .map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name} — {formatCurrency(plan.monthlyFee)}
                  </option>
                ))}
            </select>
          </label>
          {selectedPlan ? (
            <div className="plan-help">
              <b>{selectedPlan.name}</b> — {selectedPlan.description} Trial padrão deste plano:{' '}
              {selectedPlan.trialDays} dias.
            </div>
          ) : null}
          <div className="plan-help">
            A categoria será usada para personalizar automaticamente ícone e textos das telas de
            acesso. A imagem, o nome e a cor continuam sendo definidos pela identidade do tenant.
          </div>
          <div className="plan-help">
            O administrador deverá trocar a senha temporária no primeiro login. Envie a credencial
            por um canal seguro.
          </div>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}
        </div>
        <footer>
          <button className="cancel" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="submit"
            type="submit"
            disabled={saving || !passwordEvaluation.isValid}
            aria-busy={saving}
          >
            {saving ? 'Criando…' : 'Criar restaurante'}
          </button>
        </footer>
      </S.CreateDialog>
    </S.CreateBackdrop>
  );
}
