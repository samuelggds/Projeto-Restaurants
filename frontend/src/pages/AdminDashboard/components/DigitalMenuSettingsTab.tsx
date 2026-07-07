import * as S from "../styles";

type SettingsForm = {
  restaurantName: string;
  restaurantLogo: string;
  restaurantCoverImage: string;
};

type BrandingUploadState = {
  restaurantLogo: boolean;
  restaurantCoverImage: boolean;
};

type DigitalMenuSettingsTabProps = {
  settingsForm: SettingsForm;
  brandingUploadState: BrandingUploadState;
  isSavingSettings: boolean;
  isBrandingUploadInProgress: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFieldChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onBrandingFileChange: (
    field: "restaurantLogo" | "restaurantCoverImage",
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
};

export default function DigitalMenuSettingsTab({
  settingsForm,
  brandingUploadState,
  isSavingSettings,
  isBrandingUploadInProgress,
  onSubmit,
  onFieldChange,
  onBrandingFileChange,
}: DigitalMenuSettingsTabProps) {
  return (
    <S.FormCard>
      <S.PageHeader>
        <h2>Editar Cardapio Digital</h2>
        <p>
          Personalize a identidade visual que aparece no cardapio do cliente:
          nome, logo e banner.
        </p>
      </S.PageHeader>

      <form onSubmit={onSubmit}>
        <S.FormGroup>
          <label>Nome do Restaurante</label>
          <input
            type="text"
            name="restaurantName"
            placeholder="Ex: Pizzaria Mesa"
            value={settingsForm.restaurantName}
            onChange={onFieldChange}
          />
        </S.FormGroup>

        <S.FormRow style={{ marginTop: "1rem" }}>
          <S.FormGroup>
            <label>URL da Logo</label>
            <input
              type="url"
              name="restaurantLogo"
              placeholder="https://..."
              value={settingsForm.restaurantLogo}
              onChange={onFieldChange}
            />
            <div
              style={{
                marginTop: "0.55rem",
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  onBrandingFileChange("restaurantLogo", event)
                }
              />
              {brandingUploadState.restaurantLogo ? (
                <small style={{ opacity: 0.85 }}>Processando imagem...</small>
              ) : null}
            </div>
            {settingsForm.restaurantLogo ? (
              <div
                style={{
                  marginTop: "0.6rem",
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: `url(${settingsForm.restaurantLogo}) center / cover`,
                }}
              />
            ) : null}
          </S.FormGroup>

          <S.FormGroup>
            <label>URL do Banner</label>
            <input
              type="url"
              name="restaurantCoverImage"
              placeholder="https://..."
              value={settingsForm.restaurantCoverImage}
              onChange={onFieldChange}
            />
            <div
              style={{
                marginTop: "0.55rem",
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  onBrandingFileChange("restaurantCoverImage", event)
                }
              />
              {brandingUploadState.restaurantCoverImage ? (
                <small style={{ opacity: 0.85 }}>Processando imagem...</small>
              ) : null}
            </div>
            {settingsForm.restaurantCoverImage ? (
              <div
                style={{
                  marginTop: "0.6rem",
                  width: "100%",
                  maxWidth: 260,
                  height: 84,
                  borderRadius: 12,
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: `url(${settingsForm.restaurantCoverImage}) center / cover`,
                }}
              />
            ) : null}
          </S.FormGroup>
        </S.FormRow>

        <S.SubmitBtn
          type="submit"
          style={{ marginTop: "1.25rem" }}
          disabled={isSavingSettings || isBrandingUploadInProgress}
        >
          {isSavingSettings ? "Salvando..." : "Salvar Cardapio Digital"}
        </S.SubmitBtn>
      </form>
    </S.FormCard>
  );
}
