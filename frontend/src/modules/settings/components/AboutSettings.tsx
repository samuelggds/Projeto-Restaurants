import type { RestaurantSettings } from "../types/settings.types";
import * as S from "../styles/settings.styles";

type Props = {
  settings: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
};

export function AboutSettings({ settings, onChange }: Props) {
  const LIMIT = 500;

  return (
    <S.Panel>
      <header>
        <span>História e propósito</span>
        <h2>Descrição "Sobre nós"</h2>
        <p>Este texto será exibido na seção institucional da Home.</p>
      </header>
      <S.Card>
        <S.FieldLabel>
          <span>Descrição do restaurante</span>
          <S.Textarea
            value={settings.description}
            maxLength={LIMIT}
            onChange={(e) => onChange({ description: e.target.value })}
          />
          <S.CharCount>
            {settings.description.length}/{LIMIT} caracteres
          </S.CharCount>
        </S.FieldLabel>
        <S.AboutPreview>
          <span>Prévia</span>
          <strong>Sabores que aproximam pessoas.</strong>
          <p>
            {settings.description ||
              "A descrição do seu restaurante aparecerá aqui."}
          </p>
        </S.AboutPreview>
      </S.Card>
    </S.Panel>
  );
}
