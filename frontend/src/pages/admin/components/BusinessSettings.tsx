import * as S from '../Admin.styles';
import {
  formatBusinessPhone,
  formatCpf,
  formatCnpj,
  validateBusinessSettings,
} from '../domain/businessSettingsValidation';
import type { AdminSettings } from '../types';

type Props = {
  settings: AdminSettings;
  update: <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => void;
};

export function BusinessSettings({ settings, update }: Props) {
  const errors = validateBusinessSettings(settings);
  return (
    <S.SettingSection>
      <S.Card>
        <h2>Informações comerciais</h2>
        <p>Dados legais e de contato do estabelecimento.</p>
        <S.FormGrid>
          <S.Field>
            Razão social
            <input
              value={settings.companyLegalName}
              maxLength={150}
              onChange={(event) => update('companyLegalName', event.target.value)}
              aria-invalid={Boolean(errors.companyLegalName)}
            />
            {errors.companyLegalName && <small>{errors.companyLegalName}</small>}
          </S.Field>
          <S.Field>
            Tipo de documento
            <select
              value={settings.legalDocumentType}
              onChange={(event) => {
                update('legalDocumentType', event.target.value as 'CPF' | 'CNPJ');
                update('companyDocument', '');
              }}
            >
              <option value="CNPJ">CNPJ</option>
              <option value="CPF">CPF</option>
            </select>
          </S.Field>
          <S.Field>
            {settings.legalDocumentType}
            <input
              inputMode="numeric"
              value={
                settings.legalDocumentType === 'CPF'
                  ? formatCpf(settings.companyDocument)
                  : formatCnpj(settings.companyDocument)
              }
              onChange={(event) =>
                update(
                  'companyDocument',
                  settings.legalDocumentType === 'CPF'
                    ? formatCpf(event.target.value)
                    : formatCnpj(event.target.value),
                )
              }
              aria-invalid={Boolean(errors.companyDocument)}
            />
            {errors.companyDocument && <small>{errors.companyDocument}</small>}
          </S.Field>
          <S.Field>
            Telefone
            <input
              inputMode="tel"
              value={formatBusinessPhone(settings.businessPhone)}
              onChange={(event) => update('businessPhone', formatBusinessPhone(event.target.value))}
              aria-invalid={Boolean(errors.businessPhone)}
            />
            {errors.businessPhone && <small>{errors.businessPhone}</small>}
          </S.Field>
          <S.Field>
            E-mail comercial
            <input
              type="email"
              value={settings.businessEmail}
              maxLength={160}
              onChange={(event) => update('businessEmail', event.target.value)}
              aria-invalid={Boolean(errors.businessEmail)}
            />
            {errors.businessEmail && <small>{errors.businessEmail}</small>}
          </S.Field>
        </S.FormGrid>
      </S.Card>
    </S.SettingSection>
  );
}
