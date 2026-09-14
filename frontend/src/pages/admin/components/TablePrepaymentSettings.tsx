import { useState } from 'react';
import { Clock3, Plus, WalletCards } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  isValidPrepaymentWindow,
  validateTableAccountSettings,
} from '../domain/tableAccountSettingsValidation';
import type { TableAccountAdminSettings, TablePrepaymentWindow } from '../types';
import * as S from './TableAccountSettings.styles';
import { PrepaymentLayout } from './TablePrepaymentSettings.styles';

type Props = {
  account: TableAccountAdminSettings;
  onChange: <K extends keyof TableAccountAdminSettings>(
    key: K,
    value: TableAccountAdminSettings[K],
  ) => void;
};

const days = [
  ['Dom', 'Domingo'],
  ['Seg', 'Segunda-feira'],
  ['Ter', 'Terça-feira'],
  ['Qua', 'Quarta-feira'],
  ['Qui', 'Quinta-feira'],
  ['Sex', 'Sexta-feira'],
  ['Sáb', 'Sábado'],
];
const timeZones: Record<string, string> = {
  'America/Sao_Paulo': 'Brasília',
  'America/Manaus': 'Manaus',
  'America/Cuiaba': 'Cuiabá',
  'America/Rio_Branco': 'Rio Branco',
  'America/Noronha': 'Fernando de Noronha',
};
const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const limitText = (cents: number | null) =>
  cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',');
const minuteToTime = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

function timeToMinute(value: string, fallback: number) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function TablePrepaymentSettings({ account, onChange }: Props) {
  const limit = account.requirePrepaymentAboveCents;
  const [editingLimit, setEditingLimit] = useState({ value: limit, text: limitText(limit) });
  // Keep typing untouched; synchronize only when a saved/external value changes.
  if (editingLimit.value !== limit) setEditingLimit({ value: limit, text: limitText(limit) });
  const errors = validateTableAccountSettings(account);
  const hasRules = limit !== null || account.prepaymentWindows.length > 0;
  const exampleBalance = Math.floor((limit ?? 0) * 0.8);
  const exampleOrder = (limit ?? 0) - exampleBalance + 1_000;

  function changeLimit(text: string) {
    if (!/^(?:\d+(?:[.,]\d{0,2})?)?$/.test(text)) return;
    const cents = text === '' ? null : Math.round(Number(text.replace(',', '.')) * 100);
    if (cents !== null && !Number.isSafeInteger(cents)) return;
    setEditingLimit({ value: cents, text });
    onChange('requirePrepaymentAboveCents', cents);
  }

  function changeWindow(index: number, next: TablePrepaymentWindow) {
    onChange(
      'prepaymentWindows',
      account.prepaymentWindows.map((window, current) => (current === index ? next : window)),
    );
  }

  return (
    <S.Card aria-labelledby="table-prepayment-title">
      <header>
        <div>
          <h3 id="table-prepayment-title">Quando o cliente precisa pagar na hora</h3>
          <p>
            Somente para pedidos de mesa. Defina quando o novo pedido deve ser pago agora, em vez de
            ficar na conta para o fechamento.
          </p>
        </div>
      </header>
      <PrepaymentLayout>
        <div className="rule-summary">
          <WalletCards size={22} aria-hidden="true" />
          <div>
            <b>
              {hasRules
                ? 'Basta uma das condições acontecer'
                : 'Sem exigência de pagamento antecipado'}
            </b>
            <p>
              {hasRules
                ? 'O limite de valor e os horários funcionam de forma independente. Só o novo pedido precisa ser pago; o restante da conta continua em aberto.'
                : 'Sem limite e sem horários, o cliente pode adicionar novos pedidos à conta e pagar depois, conforme as demais regras da mesa.'}
            </p>
          </div>
        </div>
        {!account.enabled && (
          <p className="configuration-note">
            A conta por mesa está desativada. Estas regras passam a valer quando você ativar o
            recurso.
          </p>
        )}
        {account.enabled && hasRules && !account.allowOnlinePayment && (
          <div className="configuration-note warning" role="status">
            <b>O pagamento online está desativado</b>
            <p>
              Quando uma destas condições ocorrer, o cliente não conseguirá concluir o novo pedido
              pelo celular. Ative o pagamento online e confira os meios disponíveis, ou remova o
              limite e os horários.
            </p>
            <S.Button type="button" onClick={() => onChange('allowOnlinePayment', true)}>
              Ativar pagamento online
            </S.Button>
          </div>
        )}
        <div className="rule-columns">
          <section className="rule-panel" aria-labelledby="table-limit-title">
            <div className="rule-heading">
              <span className="rule-icon">
                <WalletCards size={19} aria-hidden="true" />
              </span>
              <div>
                <h4 id="table-limit-title">Por valor da conta</h4>
                <p>Saldo em aberto + novo pedido</p>
              </div>
            </div>
            <S.Fields className="limit-field">
              <label>
                Limite de saldo em aberto (R$)
                <input
                  aria-label="Limite para pagamento antecipado"
                  aria-describedby="table-limit-hint"
                  aria-invalid={Boolean(errors.requirePrepaymentAboveCents)}
                  type="text"
                  inputMode="decimal"
                  placeholder="Sem limite de valor"
                  value={editingLimit.text}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => changeLimit(event.target.value)}
                  onBlur={() => setEditingLimit({ value: limit, text: limitText(limit) })}
                />
                <small id="table-limit-hint">
                  Deixe vazio para não usar um limite. Digite o valor em reais, por exemplo: 100,00.
                </small>
                {errors.requirePrepaymentAboveCents && (
                  <small className="field-error">{errors.requirePrepaymentAboveCents}</small>
                )}
              </label>
            </S.Fields>
            {limit !== null && (
              <S.Button type="button" onClick={() => changeLimit('')}>
                Remover limite de valor
              </S.Button>
            )}
            {limit === 0 ? (
              <div className="example">
                <b>Com limite de R$ 0,00</b>
                <p>
                  Todo novo pedido com valor positivo precisa ser pago agora. Para permitir pagar
                  depois sem limite de valor, deixe o campo vazio.
                </p>
              </div>
            ) : limit !== null && !errors.requirePrepaymentAboveCents ? (
              <div className="example">
                <b>Exemplo com seu limite de {money(limit)}</b>
                <dl>
                  <div>
                    <dt>Saldo em aberto</dt>
                    <dd>{money(exampleBalance)}</dd>
                  </div>
                  <div>
                    <dt>Novo pedido</dt>
                    <dd>+ {money(exampleOrder)}</dd>
                  </div>
                  <div className="example-total">
                    <dt>Total se entrar na conta</dt>
                    <dd>{money(exampleBalance + exampleOrder)}</dd>
                  </div>
                </dl>
                <p>
                  Passa do limite: o cliente paga os <strong>{money(exampleOrder)}</strong> do novo
                  pedido agora.
                </p>
                <small>
                  Se a soma for exatamente {money(limit)}, o pedido pode entrar na conta, desde que
                  não esteja em um período de pagamento antecipado.
                </small>
              </div>
            ) : (
              <p className="rule-note">
                Sem limite de valor. Apenas os horários ao lado podem exigir pagamento antecipado.
              </p>
            )}
          </section>
          <section className="rule-panel" aria-labelledby="table-periods-title">
            <div className="rule-heading">
              <span className="rule-icon">
                <Clock3 size={19} aria-hidden="true" />
              </span>
              <div>
                <h4 id="table-periods-title">Por dia e horário</h4>
                <p>Vale independentemente do saldo</p>
              </div>
            </div>
            <p className="rule-note">
              Durante os períodos abaixo, qualquer novo pedido deve ser pago na hora. Fora deles, só
              o limite de valor é considerado.
            </p>
            <p className="timezone-note">
              Horário de {timeZones[account.timeZone] ?? account.timeZone}, conforme o fuso da
              conta.
            </p>
            <S.Windows>
              {account.prepaymentWindows.map((window, index) => (
                <div
                  className={`window${isValidPrepaymentWindow(window) ? '' : ' invalid'}`}
                  key={index}
                >
                  <div className="window-head">
                    <span>Período {index + 1}</span>
                    <S.Button
                      $danger
                      type="button"
                      aria-label={`Remover período ${index + 1}`}
                      onClick={() =>
                        onChange(
                          'prepaymentWindows',
                          account.prepaymentWindows.filter((_, current) => current !== index),
                        )
                      }
                    >
                      Remover
                    </S.Button>
                  </div>
                  <div className="days" role="group" aria-label={`Dias do período ${index + 1}`}>
                    {days.map(([label, full], day) => (
                      <button
                        type="button"
                        key={day}
                        aria-label={full}
                        aria-pressed={window.weekdays.includes(day)}
                        className={window.weekdays.includes(day) ? 'active' : ''}
                        onClick={() => {
                          const selected = window.weekdays.includes(day);
                          if (selected && window.weekdays.length === 1) {
                            toast.info('Mantenha ao menos um dia neste período.');
                            return;
                          }
                          changeWindow(index, {
                            ...window,
                            weekdays: selected
                              ? window.weekdays.filter((current) => current !== day)
                              : [...window.weekdays, day].sort(),
                          });
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="times">
                    <label>
                      Começa às
                      <input
                        aria-label={`Início do período ${index + 1}`}
                        type="time"
                        value={minuteToTime(window.startsAtMinute)}
                        onChange={(event) =>
                          changeWindow(index, {
                            ...window,
                            startsAtMinute: timeToMinute(event.target.value, window.startsAtMinute),
                          })
                        }
                      />
                    </label>
                    <label>
                      Termina às
                      <input
                        aria-label={`Fim do período ${index + 1}`}
                        type="time"
                        value={minuteToTime(window.endsAtMinute)}
                        onChange={(event) =>
                          changeWindow(index, {
                            ...window,
                            endsAtMinute: timeToMinute(event.target.value, window.endsAtMinute),
                          })
                        }
                      />
                    </label>
                  </div>
                  {window.endsAtMinute < window.startsAtMinute && (
                    <p className="overnight-note">
                      Termina no dia seguinte. Os dias selecionados indicam quando o período começa.
                    </p>
                  )}
                  {!isValidPrepaymentWindow(window) && (
                    <small className="window-error">
                      Escolha ao menos um dia e use horários de início e fim diferentes.
                    </small>
                  )}
                </div>
              ))}
              {!account.prepaymentWindows.length && (
                <div className="empty-periods">
                  <Clock3 size={23} aria-hidden="true" />
                  <b>Nenhum período configurado</b>
                  <span>Adicione, por exemplo, sexta-feira das 22h às 02h do sábado.</span>
                </div>
              )}
            </S.Windows>
            <S.Button
              className="add-period"
              type="button"
              disabled={account.prepaymentWindows.length >= 50}
              onClick={() =>
                onChange('prepaymentWindows', [
                  ...account.prepaymentWindows,
                  { weekdays: [1, 2, 3, 4, 5], startsAtMinute: 1080, endsAtMinute: 1380 },
                ])
              }
            >
              <Plus size={16} aria-hidden="true" />
              Adicionar horário
            </S.Button>
            <small className="rule-note">
              Os períodos começam no horário inicial e deixam de valer no horário final.
            </small>
          </section>
        </div>
      </PrepaymentLayout>
    </S.Card>
  );
}
