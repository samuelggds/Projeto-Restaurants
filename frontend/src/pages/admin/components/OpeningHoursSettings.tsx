import styled from "styled-components";
import * as S from "../Admin.styles";
import { validateBusinessHours } from "../domain/businessHours";
import type { AdminSettings, BusinessHour } from "../types";

type Props = { settings: AdminSettings; update: <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => void };

const StatusControl = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin: 18px 0 22px; padding: 16px 18px; border: 1px solid #eadfd7; border-radius: 14px; background: #fffaf7;
  strong { display: block; color: #24201d; margin-bottom: 3px; }
  small { color: #746c67; }
  div:last-child { display: flex; gap: 8px; flex-wrap: wrap; }
  button { border: 1px solid #ded4ce; border-radius: 999px; padding: 9px 14px; background: #fff; color: #6c625d; font-weight: 700; cursor: pointer; transition: .2s ease; }
  button[data-active="true"] { background: #eaf7ec; border-color: #9bce9f; color: #187137; box-shadow: 0 4px 12px rgba(24,113,55,.12); }
  button[data-closed="true"][data-active="true"] { background: #fff0ee; border-color: #efaaa3; color: #bd3c31; box-shadow: 0 4px 12px rgba(189,60,49,.1); }
  @media (max-width: 640px) { align-items: flex-start; flex-direction: column; }
`;

export function OpeningHoursSettings({ settings, update }: Props) {
  const errors = validateBusinessHours(settings.businessHours);
  const updateDay = (id: string, patch: Partial<BusinessHour>) => update("businessHours", settings.businessHours.map((day) => day.id === id ? { ...day, ...patch } : day));
  return <S.Card><h2>Horários de funcionamento</h2><p>Defina os horários regulares e controle na hora se o restaurante está recebendo pedidos.</p>
    <StatusControl>
      <div><strong>Status para novos pedidos</strong><small>Altere quando precisar abrir ou fechar o restaurante imediatamente.</small></div>
      <div>
        <button type="button" data-active={settings.isOpenForOrders} onClick={() => update("isOpenForOrders", true)}>● Aberto</button>
        <button type="button" data-closed="true" data-active={!settings.isOpenForOrders} onClick={() => update("isOpenForOrders", false)}>● Fechado</button>
      </div>
    </StatusControl>
    {settings.businessHours.map((day) => <S.DayRow key={day.id}>
      <b><input type="checkbox" checked={day.enabled} onChange={(event) => updateDay(day.id, { enabled: event.target.checked })} /> {day.label}</b>
      <input type="time" value={day.openingTime} disabled={!day.enabled} onChange={(event) => updateDay(day.id, { openingTime: event.target.value })} />
      <span className="separator">até</span>
      <input type="time" value={day.closingTime} disabled={!day.enabled} onChange={(event) => updateDay(day.id, { closingTime: event.target.value })} />
      {errors[day.id] && <small>{errors[day.id]}</small>}
    </S.DayRow>)}
  </S.Card>;
}
