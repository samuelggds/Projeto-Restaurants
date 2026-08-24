import { describe, expect, it } from 'vitest';
import { defaultBusinessHours } from './data';
import { resolveEditableBusinessHours, serializeBusinessHours } from './domain/businessHours';

describe('mapeamento dos horários no admin', () => {
  it('não persiste a agenda padrão ao salvar outra configuração de restaurante antigo', () => {
    const mapped = resolveEditableBusinessHours(null, defaultBusinessHours);

    expect(mapped.businessHours).toEqual(defaultBusinessHours);
    expect(mapped.businessHoursConfigured).toBe(false);
    expect(
      serializeBusinessHours(mapped.businessHours, mapped.businessHoursConfigured),
    ).not.toHaveProperty('businessHours');
  });

  it('envia a semana completa depois que o administrador configura a agenda', () => {
    const businessHours = defaultBusinessHours.map((day) => ({ ...day }));

    expect(serializeBusinessHours(businessHours, true)).toMatchObject({
      businessHours,
    });
  });
});
