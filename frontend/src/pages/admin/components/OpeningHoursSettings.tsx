import { CalendarDays, CheckCircle2, Clock3, Copy, PauseCircle } from 'lucide-react';
import styled from 'styled-components';
import * as S from '../Admin.styles';
import {
  getRestaurantAvailability,
  getRestaurantBusinessDayId,
  validateBusinessHours,
} from '../domain/businessHours';
import type { AdminSettings, BusinessHour } from '../types';

type Props = {
  settings: AdminSettings;
  update: <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => void;
};

const DAY_ABBREVIATIONS: Record<string, string> = {
  monday: 'SEG',
  tuesday: 'TER',
  wednesday: 'QUA',
  thursday: 'QUI',
  friday: 'SEX',
  saturday: 'SÁB',
  sunday: 'DOM',
};

const WEEKDAY_IDS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

const StatusOverview = styled.section<{ $open: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 286px), 1fr));
  align-items: center;
  gap: 22px;
  margin: 24px 0;
  padding: 20px;
  border: 1px solid ${({ $open }) => ($open ? '#b9dfc2' : '#ecd5c8')};
  border-radius: 18px;
  background: ${({ $open }) =>
    $open
      ? 'linear-gradient(135deg, #f1fbf3 0%, #ffffff 74%)'
      : 'linear-gradient(135deg, #fff7f1 0%, #ffffff 74%)'};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    padding: 17px;
  }
`;

const StatusCopy = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-width: 0;

  .status-icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border: 1px solid #eadfd7;
    border-radius: 15px;
    background: #fff;
    color: var(--a);
    box-shadow: 0 8px 20px rgba(58, 40, 28, 0.06);
  }

  .status-text {
    min-width: 0;
  }

  strong {
    display: block;
    margin: 5px 0 3px;
    color: #201d1a;
    font-size: 18px;
  }

  p {
    margin: 0;
    font-size: 13px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;

    .status-icon {
      width: 42px;
      height: 42px;
    }
  }
`;

const StatusBadge = styled.span<{ $open: boolean }>`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid ${({ $open }) => ($open ? '#a8dcb3' : '#efc6b0')};
  border-radius: 999px;
  padding: 5px 9px;
  color: ${({ $open }) => ($open ? '#18713a' : '#a34c2b')};
  background: ${({ $open }) => ($open ? '#e8f8ec' : '#fff0e8')};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
`;

const PauseControl = styled.div`
  min-width: 0;
  display: grid;
  gap: 8px;

  small {
    color: #746c67;
    font-size: 11px;
    line-height: 1.4;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    padding: 4px;
    border: 1px solid #e5dcd4;
    border-radius: 13px;
    background: #f8f5f2;
  }

  button {
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 8px 11px;
    background: transparent;
    color: #706660;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  button[data-active='true'][data-action='schedule'] {
    border-color: #abd8b4;
    background: #fff;
    color: #18713a;
    box-shadow: 0 4px 12px rgba(24, 113, 58, 0.11);
  }

  button[data-active='true'][data-action='pause'] {
    border-color: #efb6a9;
    background: #fff;
    color: #b33d31;
    box-shadow: 0 4px 12px rgba(179, 61, 49, 0.1);
  }

  @media (max-width: 720px) {
    width: 100%;
    min-width: 0;
  }

  @media (max-width: 400px) {
    .actions {
      grid-template-columns: 1fr;
    }
  }
`;

const ScheduleHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-top: 4px;

  h3 {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 5px;
    font-size: 16px;
  }

  p {
    margin: 0;
    font-size: 12px;
  }

  .quick-actions {
    display: flex;
    justify-content: flex-end;
    gap: 7px;
    flex-wrap: wrap;
  }

  button {
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #ded5cd;
    border-radius: 10px;
    padding: 7px 10px;
    background: #fff;
    color: #5e554f;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
  }

  button:hover {
    border-color: color-mix(in srgb, var(--a) 35%, #ded5cd);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 4%, white);
  }

  @media (max-width: 760px) {
    align-items: stretch;
    flex-direction: column;

    .quick-actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 430px) {
    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
`;

const ScheduleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
  margin-top: 17px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const DayCard = styled.article<{ $enabled: boolean; $today: boolean }>`
  min-width: 0;
  padding: 15px;
  border: 1px solid
    ${({ $today, $enabled }) =>
      $today ? 'color-mix(in srgb, var(--a) 45%, #ddd4cc)' : $enabled ? '#e4dcd4' : '#ede8e3'};
  border-radius: 15px;
  background: ${({ $enabled }) => ($enabled ? '#fff' : '#faf8f6')};
  box-shadow: ${({ $today }) =>
    $today ? '0 7px 20px color-mix(in srgb, var(--a) 8%, transparent)' : 'none'};

  &[data-error='true'] {
    border-color: #e88f83;
    box-shadow: 0 0 0 3px rgba(202, 68, 53, 0.08);
  }
`;

const DayHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  .day-name {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .day-name > span {
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: color-mix(in srgb, var(--a) 9%, white);
    color: var(--a);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  .day-name strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .day-name small {
    color: #928982;
    font-size: 10px;
  }
`;

const DayToggle = styled.label<{ $enabled: boolean }>`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${({ $enabled }) => ($enabled ? '#1b743c' : '#8a817b')};
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  input {
    appearance: none;
    width: 38px;
    height: 22px;
    position: relative;
    border: 0;
    border-radius: 999px;
    background: ${({ $enabled }) => ($enabled ? '#2f9a52' : '#c9c3be')};
    cursor: pointer;
    transition: background 180ms ease;
  }

  input::after {
    content: '';
    width: 16px;
    height: 16px;
    position: absolute;
    top: 3px;
    left: 3px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 5px rgba(42, 32, 25, 0.24);
    transform: translateX(${({ $enabled }) => ($enabled ? '16px' : '0')});
    transition: transform 180ms ease;
  }

  input:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 24%, transparent);
    outline-offset: 2px;
  }
`;

const TimeRange = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: 9px;
  margin-top: 14px;

  label {
    min-width: 0;
    display: grid;
    gap: 6px;
    color: #756c66;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  input {
    width: 100%;
    min-width: 0;
    height: 43px;
    border: 1px solid #ddd5cd;
    border-radius: 10px;
    padding: 0 10px;
    outline: none;
    background: #fcfbf9;
    color: #292421;
    font-weight: 700;
  }

  input:focus {
    border-color: var(--a);
    background: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 9%, transparent);
  }

  > span {
    padding-bottom: 13px;
    color: #9a918a;
    font-size: 11px;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr 1fr;

    > span {
      display: none;
    }
  }
`;

const ClosedDay = styled.div`
  min-height: 55px;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px dashed #ddd5ce;
  border-radius: 11px;
  color: #887f79;
  background: #f5f2ef;
  font-size: 11px;

  strong {
    color: #655d58;
  }
`;

const DayError = styled.small`
  display: block;
  margin-top: 8px;
  color: #b4382e;
  font-size: 11px;
  font-weight: 700;
`;

const ScheduleNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f7f3ef;
  color: #706660;
  font-size: 11px;
  line-height: 1.5;

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
    color: var(--a);
  }
`;

export function OpeningHoursSettings({ settings, update }: Props) {
  const errors = validateBusinessHours(settings.businessHours);
  const todayId = getRestaurantBusinessDayId();
  const availability = getRestaurantAvailability(
    settings.businessHoursConfigured ? settings.businessHours : undefined,
    settings.isOpenForOrders,
  );
  const isOpenNow = availability.isOpen;
  const statusTitle = isOpenNow
    ? availability.reason === 'SCHEDULE_NOT_CONFIGURED'
      ? 'A agenda semanal ainda não foi ativada'
      : 'O restaurante está recebendo pedidos'
    : availability.reason === 'MANUALLY_CLOSED'
      ? 'Pedidos pausados manualmente'
      : 'O restaurante está fora do horário';
  const statusDetail =
    availability.reason === 'MANUALLY_CLOSED'
      ? `${availability.detail}. Reative a agenda quando estiver pronto para receber pedidos.`
      : availability.reason === 'SCHEDULE_NOT_CONFIGURED'
        ? 'Os horários abaixo são apenas um rascunho. Altere um dia e salve para ativar a abertura automática.'
        : `${availability.detail}. A agenda semanal controla essa mudança automaticamente.`;

  const updateDay = (id: string, patch: Partial<BusinessHour>) => {
    update('businessHoursConfigured', true);
    update(
      'businessHours',
      settings.businessHours.map((day) => (day.id === id ? { ...day, ...patch } : day)),
    );
  };

  const copyMondaySchedule = (target: 'weekdays' | 'all') => {
    const monday = settings.businessHours.find((day) => day.id === 'monday');
    if (!monday) return;
    update('businessHoursConfigured', true);
    update(
      'businessHours',
      settings.businessHours.map((day) =>
        target === 'all' || WEEKDAY_IDS.has(day.id)
          ? {
              ...day,
              enabled: monday.enabled,
              openingTime: monday.openingTime,
              closingTime: monday.closingTime,
            }
          : day,
      ),
    );
  };

  return (
    <S.Card>
      <h2>Horários e recebimento de pedidos</h2>
      <p>
        Organize a semana do restaurante. A loja abre e fecha automaticamente pelos dias e horários
        abaixo.
      </p>

      <StatusOverview $open={isOpenNow} aria-live="polite">
        <StatusCopy>
          <div className="status-icon">
            {isOpenNow ? <CheckCircle2 size={24} /> : <Clock3 size={24} />}
          </div>
          <div className="status-text">
            <StatusBadge $open={isOpenNow}>
              ● {availability.label.toLocaleUpperCase('pt-BR')}
            </StatusBadge>
            <strong>{statusTitle}</strong>
            <p>{statusDetail}</p>
          </div>
        </StatusCopy>

        <PauseControl>
          <small>
            Use a pausa somente em imprevistos. Ao reativar, a agenda semanal volta a controlar a
            abertura.
          </small>
          <div className="actions">
            <button
              type="button"
              data-action="schedule"
              data-active={settings.isOpenForOrders}
              aria-pressed={settings.isOpenForOrders}
              onClick={() => update('isOpenForOrders', true)}
            >
              <CalendarDays size={15} /> Seguir agenda
            </button>
            <button
              type="button"
              data-action="pause"
              data-active={!settings.isOpenForOrders}
              aria-pressed={!settings.isOpenForOrders}
              onClick={() => update('isOpenForOrders', false)}
            >
              <PauseCircle size={15} /> Pausar pedidos
            </button>
          </div>
        </PauseControl>
      </StatusOverview>

      <ScheduleHeader>
        <div>
          <h3>
            <CalendarDays size={18} /> Agenda semanal
          </h3>
          <p>Marque os dias abertos e informe a hora de abertura e de fechamento.</p>
        </div>
        <div className="quick-actions" aria-label="Atalhos da agenda">
          <button type="button" onClick={() => copyMondaySchedule('weekdays')}>
            <Copy size={14} /> Segunda nos dias úteis
          </button>
          <button type="button" onClick={() => copyMondaySchedule('all')}>
            <Copy size={14} /> Segunda em todos
          </button>
        </div>
      </ScheduleHeader>

      <ScheduleGrid>
        {settings.businessHours.map((day) => (
          <DayCard
            key={day.id}
            $enabled={day.enabled}
            $today={day.id === todayId}
            data-error={Boolean(errors[day.id])}
          >
            <DayHeader>
              <div className="day-name">
                <span>{DAY_ABBREVIATIONS[day.id] || day.label.slice(0, 3).toUpperCase()}</span>
                <div>
                  <strong>{day.label}</strong>
                  {day.id === todayId && <small>Hoje</small>}
                </div>
              </div>
              <DayToggle $enabled={day.enabled}>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`${day.label}: ${day.enabled ? 'aberto' : 'fechado'}`}
                  checked={day.enabled}
                  onChange={(event) => updateDay(day.id, { enabled: event.target.checked })}
                />
                <span>{day.enabled ? 'Aberto' : 'Fechado'}</span>
              </DayToggle>
            </DayHeader>

            {day.enabled ? (
              <TimeRange>
                <label>
                  Abre às
                  <input
                    type="time"
                    aria-label={`${day.label}: horário de abertura`}
                    value={day.openingTime}
                    onChange={(event) => updateDay(day.id, { openingTime: event.target.value })}
                  />
                </label>
                <span>até</span>
                <label>
                  Fecha às
                  <input
                    type="time"
                    aria-label={`${day.label}: horário de fechamento`}
                    value={day.closingTime}
                    onChange={(event) => updateDay(day.id, { closingTime: event.target.value })}
                  />
                </label>
              </TimeRange>
            ) : (
              <ClosedDay>
                <PauseCircle size={16} />
                <span>
                  <strong>Fechado o dia todo.</strong> Ative o dia para informar os horários.
                </span>
              </ClosedDay>
            )}
            {errors[day.id] && <DayError>{errors[day.id]}</DayError>}
          </DayCard>
        ))}
      </ScheduleGrid>

      <ScheduleNote>
        <Clock3 size={16} />
        <span>
          Depois de conferir os dias e horários, clique em <strong>Salvar alterações</strong>. Dias
          desligados aparecem como fechados para o cliente e não recebem novos pedidos.
        </span>
      </ScheduleNote>
    </S.Card>
  );
}
