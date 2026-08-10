import * as S from "../Admin.styles";

const DAYS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
] as const;

export function OpeningHoursSettings() {
  return (
    <S.Card>
      <h2>Horários de funcionamento</h2>
      <p>Defina o período disponível para receber pedidos.</p>
      {DAYS.map((day, index) => (
        <S.DayRow key={day}>
          <b>{day}</b>
          <input type="time" defaultValue="11:00" disabled={index === 6} />
          <span className="separator">até</span>
          <input type="time" defaultValue="23:00" disabled={index === 6} />
        </S.DayRow>
      ))}
    </S.Card>
  );
}
