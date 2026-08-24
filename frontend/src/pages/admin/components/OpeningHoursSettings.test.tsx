import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminMockSettings, defaultBusinessHours } from '../data';
import { OpeningHoursSettings } from './OpeningHoursSettings';

function renderHours(overrides: Partial<typeof adminMockSettings> = {}) {
  return renderToStaticMarkup(
    <OpeningHoursSettings
      settings={{ ...adminMockSettings, ...overrides }}
      update={() => undefined}
    />,
  );
}

describe('OpeningHoursSettings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T15:00:00.000Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('explica o status efetivo e apresenta a agenda semanal completa', () => {
    const markup = renderHours({ businessHoursConfigured: true });

    expect(markup).toContain('ABERTO AGORA');
    expect(markup).toContain('Fecha às 23:00');
    expect(markup).toContain('Agenda semanal');
    expect(markup).toContain('Segunda nos dias úteis');
    expect(markup).toContain('Segunda em todos');
    expect(markup.match(/role="switch"/g)).toHaveLength(7);
    expect(markup).toContain('Fechado o dia todo');
  });

  it('deixa claro quando a pausa manual prevalece sobre a agenda', () => {
    const markup = renderHours({ businessHoursConfigured: true, isOpenForOrders: false });

    expect(markup).toContain('FECHADO TEMPORARIAMENTE');
    expect(markup).toContain('Pedidos pausados manualmente');
    expect(markup).toContain('Reative a agenda quando estiver pronto para receber pedidos');
  });

  it('mostra a validação junto ao dia que precisa de correção', () => {
    const hours = defaultBusinessHours.map((day) =>
      day.id === 'monday' ? { ...day, openingTime: '11:00', closingTime: '11:00' } : day,
    );
    const markup = renderHours({ businessHours: hours, businessHoursConfigured: true });

    expect(markup).toContain('A abertura e o fechamento não podem ter o mesmo horário.');
    expect(markup).toContain('data-error="true"');
  });

  it('mantém a agenda padrão apenas como rascunho até o administrador alterá-la', () => {
    const markup = renderHours({ businessHoursConfigured: false });

    expect(markup).toContain('ABERTO PARA PEDIDOS');
    expect(markup).toContain('A agenda semanal ainda não foi ativada');
    expect(markup).toContain('Os horários abaixo são apenas um rascunho');
  });
});
