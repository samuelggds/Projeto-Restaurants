import * as S from "../styles";

type SettingsForm = {
  deliveryFee: string;
  minimumOrder: string;
};

type DeliveryAndMinimumOrderTabProps = {
  settingsForm: SettingsForm;
  isSavingSettings: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFieldChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
};

export default function DeliveryAndMinimumOrderTab({
  settingsForm,
  isSavingSettings,
  onSubmit,
  onFieldChange,
}: DeliveryAndMinimumOrderTabProps) {
  return (
    <S.FormCard>
      <S.PageHeader>
        <h2>Taxa de Entrega e Pedido Minimo</h2>
        <p>Ajuste os valores operacionais do delivery para o restaurante.</p>
      </S.PageHeader>

      <form onSubmit={onSubmit}>
        <S.FormRow>
          <S.FormGroup>
            <label>Taxa de Entrega (R$)</label>
            <input
              type="number"
              name="deliveryFee"
              step="0.01"
              min="0"
              placeholder="Ex: 8.50"
              value={settingsForm.deliveryFee}
              onChange={onFieldChange}
            />
          </S.FormGroup>

          <S.FormGroup>
            <label>Pedido Minimo (R$)</label>
            <input
              type="number"
              name="minimumOrder"
              step="0.01"
              min="0"
              placeholder="Ex: 20.00"
              value={settingsForm.minimumOrder}
              onChange={onFieldChange}
            />
          </S.FormGroup>
        </S.FormRow>

        <S.SubmitBtn
          type="submit"
          style={{ marginTop: "1.25rem" }}
          disabled={isSavingSettings}
        >
          {isSavingSettings ? "Salvando..." : "Salvar valores"}
        </S.SubmitBtn>
      </form>
    </S.FormCard>
  );
}
