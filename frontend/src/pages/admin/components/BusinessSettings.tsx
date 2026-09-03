import { BadgeCheck, Building2, FileText } from 'lucide-react';
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
  const completedFields = [
    settings.companyLegalName,
    settings.companyDocument,
    settings.businessPhone,
    settings.businessEmail,
  ].filter((value) => value.trim()).length;

  return (
    <S.SettingSection>
      <S.SettingsHero>
        <div className="settings-hero-copy">
          <span className="settings-hero-icon" aria-hidden="true">
            <Building2 />
          </span>
          <div>
            <span className="settings-eyebrow">CADASTRO DO ESTABELECIMENTO</span>
            <h2>Dados comerciais claros e organizados</h2>
            <p>
              Centralize as informações legais e os canais de contato usados na operação do
              restaurante.
            </p>
          </div>
        </div>
        <span className="settings-hero-badge">
          <BadgeCheck /> {completedFields}/4 dados principais preenchidos
        </span>
      </S.SettingsHero>

      <S.Card>
        <S.SettingsCardHeading>
          <div className="settings-card-copy">
            <h2>Informações comerciais</h2>
            <p>Dados legais e de contato do estabelecimento.</p>
          </div>
          <span className="settings-card-icon" aria-hidden="true">
            <FileText />
          </span>
        </S.SettingsCardHeading>

        <S.FormGrid>
          <S.Field>
            Razão social
            <input
              aria-label="Razão social"
              autoComplete="organization"
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
              aria-label="Tipo de documento"
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
              aria-label={settings.legalDocumentType}
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
              aria-label="Telefone comercial"
              autoComplete="tel"
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
              aria-label="E-mail comercial"
              autoComplete="email"
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
