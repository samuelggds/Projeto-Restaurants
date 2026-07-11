import * as S from "../styles";

type SettingsForm = {
  companyDocument: string;
  restaurantSlug: string;
  pixKey: string;
};

type AsaasOnboardingTabProps = {
  settingsForm: SettingsForm;
  isSavingSettings: boolean;
  isOnboardingAsaas: boolean;
  onSubmitAsaasOnboarding: () => void;
  onFieldChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
};

export default function AsaasOnboardingTab({
  settingsForm,
  isSavingSettings,
  isOnboardingAsaas,
  onSubmitAsaasOnboarding,
  onFieldChange,
}: AsaasOnboardingTabProps) {
  return (
    <S.FormCard>
      <h2>PIX - Formulario do dono do restaurante</h2>
      <p>
        Esta aba e exclusiva de PIX com formulario. Preencha CNPJ e Chave PIX. O
        slug do restaurante e usado automaticamente para criar e vincular a
        subconta no Asaas.
      </p>

      <div
        style={{
          marginTop: "1rem",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          background: "rgba(59, 130, 246, 0.07)",
          borderRadius: 12,
          padding: "0.9rem",
        }}
      >
        <S.FormRow>
          <S.FormGroup>
            <label>CNPJ</label>
            <input
              type="text"
              name="companyDocument"
              inputMode="numeric"
              maxLength={18}
              placeholder="Ex: 12.345.678/0001-90"
              value={settingsForm.companyDocument}
              onChange={onFieldChange}
            />
          </S.FormGroup>
        </S.FormRow>

        <S.FormGroup style={{ marginTop: "0.65rem" }}>
          <label>Slug do Restaurante (automatico)</label>
          <input
            type="text"
            value={settingsForm.restaurantSlug}
            readOnly
            disabled
          />
        </S.FormGroup>

        <S.FormGroup style={{ marginTop: "0.85rem" }}>
          <label>Chave PIX do Dono</label>
          <input
            type="text"
            name="pixKey"
            placeholder="Ex: email@dominio.com, CPF ou celular"
            value={settingsForm.pixKey}
            onChange={onFieldChange}
          />
        </S.FormGroup>

        <button
          type="button"
          style={{
            marginTop: "0.8rem",
            width: "100%",
            minHeight: 42,
            borderRadius: 10,
            border: "1px solid rgba(2, 132, 199, 0.45)",
            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
            color: "#ffffff",
            fontWeight: 800,
            cursor:
              isOnboardingAsaas || isSavingSettings ? "not-allowed" : "pointer",
            opacity: isOnboardingAsaas || isSavingSettings ? 0.72 : 1,
          }}
          disabled={isOnboardingAsaas || isSavingSettings}
          onClick={onSubmitAsaasOnboarding}
        >
          {isOnboardingAsaas
            ? "Criando subconta Asaas..."
            : "Criar conta Asaas automaticamente"}
        </button>
      </div>
    </S.FormCard>
  );
}
