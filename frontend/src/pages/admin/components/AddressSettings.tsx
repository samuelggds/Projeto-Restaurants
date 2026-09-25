import { useRef, useState } from 'react';
import { MapPinned, Navigation, Store } from 'lucide-react';
import { lookupCep } from '../../../Services/cepService';
import * as S from '../Admin.styles';
import {
  formatEstablishmentCep,
  validateEstablishmentAddress,
} from '../domain/establishmentAddress';
import type { AdminSettings } from '../types';

type Props = {
  settings: AdminSettings;
  update: <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => void;
};
export function AddressSettings({ settings, update }: Props) {
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [cepMessage, setCepMessage] = useState('');
  const cepRequestRef = useRef(0);
  const errors = validateEstablishmentAddress(settings);
  const hasLocation = Boolean(
    settings.businessAddress.trim() && settings.businessCity.trim() && settings.businessState.trim(),
  );

  async function handleCepChange(value: string) {
    const formatted = formatEstablishmentCep(value);
    const digits = formatted.replace(/\D/g, '');
    update('businessZipCode', formatted);

    const requestId = ++cepRequestRef.current;
    if (digits.length !== 8) {
      setCepStatus('idle');
      setCepMessage('');
      return;
    }

    setCepStatus('loading');
    setCepMessage('Buscando endereço pelo CEP...');

    try {
      const found = await lookupCep(digits);
      if (requestId !== cepRequestRef.current) return;

      update('businessZipCode', formatEstablishmentCep(found.cep));
      update('businessAddress', found.address);
      update('businessAddressDistrict', found.district);
      update('businessCity', found.city);
      update('businessState', found.state);

      const complete = Boolean(found.address && found.district && found.city && found.state);
      setCepStatus('success');
      setCepMessage(
        complete
          ? 'Endereço preenchido automaticamente.'
          : 'CEP localizado. Complete os campos que não foram retornados.',
      );
    } catch (error) {
      if (requestId !== cepRequestRef.current) return;
      setCepStatus('error');
      setCepMessage(error instanceof Error ? error.message : 'Não foi possível consultar o CEP.');
    }
  }
  const textField = <K extends keyof AdminSettings>(key: K, label: string, optional = false) => (
    <S.Field>
      {label}
      {optional && ' (opcional)'}
      <input
        aria-label={label}
        autoComplete="street-address"
        value={String(settings[key])}
        maxLength={
          key === 'businessState'
            ? 2
            : key === 'businessAddressNumber'
              ? 20
              : key === 'businessAddressComplement'
                ? 160
                : 120
        }
        onChange={(event) =>
          update(
            key,
            (key === 'businessState'
              ? event.target.value.toUpperCase()
              : event.target.value) as AdminSettings[K],
          )
        }
        aria-invalid={Boolean(errors[key as keyof typeof errors])}
      />
      {errors[key as keyof typeof errors] && <small>{errors[key as keyof typeof errors]}</small>}
    </S.Field>
  );
  return (
    <S.SettingSection>
      <S.SettingsHero>
        <div className="settings-hero-copy">
          <span className="settings-hero-icon" aria-hidden="true">
            <MapPinned />
          </span>
          <div>
            <span className="settings-eyebrow">LOCALIZAÇÃO DA OPERAÇÃO</span>
            <h2>Um endereço único para retirada e entregas</h2>
            <p>
              Mantenha a origem das entregas e o ponto de retirada corretos para reduzir erros na
              operação e orientar o cliente.
            </p>
          </div>
        </div>
        <span className="settings-hero-badge">
          <Navigation /> {hasLocation ? 'Localização principal definida' : 'Localização pendente'}
        </span>
      </S.SettingsHero>

      <S.Card>
        <S.SettingsCardHeading>
          <div className="settings-card-copy">
            <h2>Endereço do estabelecimento</h2>
            <p>Esses dados também aparecem no rodapé da sua loja.</p>
          </div>
          <span className="settings-card-icon" aria-hidden="true">
            <Store />
          </span>
        </S.SettingsCardHeading>

        <S.FormGrid>
          <S.Field>
            CEP
            <input
              aria-label="CEP"
              autoComplete="postal-code"
              inputMode="numeric"
              value={formatEstablishmentCep(settings.businessZipCode)}
              maxLength={9}
              onChange={(event) => void handleCepChange(event.target.value)}
              aria-invalid={Boolean(errors.businessZipCode)}
              aria-describedby="admin-address-cep-status"
            />
            {cepMessage ? (
              <small
                id="admin-address-cep-status"
                role="status"
                aria-live="polite"
                data-status={cepStatus}
              >
                {cepMessage}
              </small>
            ) : errors.businessZipCode ? (
              <small id="admin-address-cep-status">{errors.businessZipCode}</small>
            ) : null}
          </S.Field>
          {textField('businessAddress', 'Rua ou avenida')}
          {textField('businessAddressNumber', 'Número')}
          {textField('businessAddressComplement', 'Complemento', true)}
          {textField('businessAddressDistrict', 'Bairro')}
          {textField('businessCity', 'Cidade')}
          {textField('businessState', 'UF')}
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
