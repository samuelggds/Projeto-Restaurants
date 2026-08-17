import type { BusinessHours, RestaurantSettings } from '../types/settings.types';
import * as S from '../styles/settings.styles';

type Props = {
  settings: RestaurantSettings;
  onChange: (p: Partial<RestaurantSettings>) => void;
};

export function HoursSettings({ settings, onChange }: Props) {
  function updateDay(id: string, patch: Partial<BusinessHours>) {
    onChange({
      businessHours: settings.businessHours.map((day) =>
        day.id === id ? { ...day, ...patch } : day,
      ),
    });
  }

  return (
    <S.Panel>
      <header>
        <span>Funcionamento</span>
        <h2>Horários de atendimento</h2>
        <p>Defina quando o restaurante estará disponível para pedidos.</p>
      </header>
      <S.Card>
        <S.HoursList>
          {settings.businessHours.map((day) => (
            <S.HoursRow key={day.id}>
              <S.DaySwitch>
                <S.DayToggle
                  $checked={day.enabled}
                  onClick={() => updateDay(day.id, { enabled: !day.enabled })}
                />
                <strong>{day.label}</strong>
              </S.DaySwitch>
              {day.enabled ? (
                <S.TimeRange>
                  <input
                    type="time"
                    value={day.openingTime}
                    onChange={(e) => updateDay(day.id, { openingTime: e.target.value })}
                  />
                  <span>até</span>
                  <input
                    type="time"
                    value={day.closingTime}
                    onChange={(e) => updateDay(day.id, { closingTime: e.target.value })}
                  />
                </S.TimeRange>
              ) : (
                <S.ClosedLabel>Fechado</S.ClosedLabel>
              )}
            </S.HoursRow>
          ))}
        </S.HoursList>
      </S.Card>
    </S.Panel>
  );
}
