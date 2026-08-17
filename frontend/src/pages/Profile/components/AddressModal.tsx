import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { lookupCep } from '../../../Services/cepService';
import type { CustomerAddressInput } from '../../../Services/customerAddressService';
import { formatCep, validateDeliveryAddress } from '../../home/domain/deliveryAddress';
import * as S from '../Profile.styles';

type Props = { onClose: () => void; onSave: (address: CustomerAddressInput) => Promise<void> };
const empty: CustomerAddressInput = {
  label: 'Casa',
  address: '',
  number: '',
  district: '',
  city: '',
  state: '',
  zipCode: '',
  complement: '',
  isDefault: false,
};

export function AddressModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key: keyof CustomerAddressInput, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  const cep = async (value: string) => {
    const formatted = formatCep(value);
    setForm((current) => ({
      ...current,
      zipCode: formatted,
      number: formatted === current.zipCode ? current.number : '',
      state: formatted === current.zipCode ? current.state : '',
      complement: formatted === current.zipCode ? current.complement : '',
    }));
    if (formatted.replace(/\D/g, '').length !== 8) return;
    setMessage('Buscando endereço...');
    try {
      const found = await lookupCep(formatted);
      setForm((current) => ({
        ...current,
        zipCode: found.cep,
        address: found.address || current.address,
        district: found.district || current.district,
        city: found.city || current.city,
      }));
      setMessage('Endereço localizado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'CEP inválido.');
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.label.trim().length < 1 || form.label.trim().length > 40) {
      setMessage('Informe uma identificação válida com até 40 caracteres.');
      return;
    }
    const firstError = Object.values(
      validateDeliveryAddress({ ...form, complement: form.complement || '' }),
    )[0];
    if (firstError) {
      setMessage(firstError);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <S.ModalOverlay onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <S.AddressModalCard onSubmit={(event) => void submit(event)}>
        <header>
          <div>
            <h2>Novo endereço</h2>
            <p>Este endereço ficará disponível na Home e no carrinho.</p>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </header>
        <S.AddressFormGrid>
          <label>
            Identificação
            <input
              required
              maxLength={40}
              value={form.label}
              placeholder="Casa, Trabalho..."
              onChange={(e) => update('label', e.target.value)}
            />
          </label>
          <label>
            CEP
            <input
              required
              inputMode="numeric"
              maxLength={9}
              value={form.zipCode}
              onChange={(e) => void cep(e.target.value)}
            />
          </label>
          <label className="street">
            Rua ou avenida
            <input
              required
              minLength={3}
              maxLength={160}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </label>
          <label>
            Número
            <input
              required
              value={form.number}
              onChange={(e) => update('number', e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
            />
          </label>
          <label>
            Bairro
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.district}
              onChange={(e) => update('district', e.target.value)}
            />
          </label>
          <label>
            Cidade
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
            />
          </label>
          <label>
            UF
            <input
              required
              maxLength={2}
              value={form.state}
              onChange={(e) =>
                update('state', e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase())
              }
            />
          </label>
          <label className="full">
            Complemento
            <input
              maxLength={160}
              value={form.complement || ''}
              onChange={(e) => update('complement', e.target.value)}
            />
          </label>
        </S.AddressFormGrid>
        <label className="default">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => update('isDefault', e.target.checked)}
          />
          Usar como endereço principal
        </label>
        {message && <S.AddressMessage>{message}</S.AddressMessage>}
        <footer>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Salvando...' : 'Salvar endereço'}
          </button>
        </footer>
      </S.AddressModalCard>
    </S.ModalOverlay>
  );
}
