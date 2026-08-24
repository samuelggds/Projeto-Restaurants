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
  const errors = validateEstablishmentAddress(settings);
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
      <S.Card>
        <h2>Endereço do estabelecimento</h2>
        <p>Origem das entregas e local de retirada. Esses dados aparecem no rodapé da sua loja.</p>
        <S.FormGrid>
          <S.Field>
            CEP
            <input
              aria-label="CEP"
              autoComplete="postal-code"
              inputMode="numeric"
              value={formatEstablishmentCep(settings.businessZipCode)}
              maxLength={9}
              onChange={(event) =>
                update('businessZipCode', formatEstablishmentCep(event.target.value))
              }
              aria-invalid={Boolean(errors.businessZipCode)}
            />
            {errors.businessZipCode && <small>{errors.businessZipCode}</small>}
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
