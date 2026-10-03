import { describe, expect, it } from 'vitest';
import { formatDeliveryTime } from './deliveryTime';

describe('formatDeliveryTime', () => {
  it('adiciona minutos a intervalo numérico sem unidade', () => {
    expect(formatDeliveryTime('35-45')).toBe('35-45 min');
    expect(formatDeliveryTime('35 – 45')).toBe('35-45 min');
    expect(formatDeliveryTime('35 a 45')).toBe('35-45 min');
  });

  it('adiciona minutos a um tempo numérico simples', () => {
    expect(formatDeliveryTime('35')).toBe('35 min');
  });

  it('não duplica unidade quando ela já existe', () => {
    expect(formatDeliveryTime('35-45 min')).toBe('35-45 min');
    expect(formatDeliveryTime('1 hora')).toBe('1 hora');
  });

  it('remove o prefixo legado "entrega em" antes de formatar', () => {
    expect(formatDeliveryTime('Entrega em 35-45')).toBe('35-45 min');
  });

  it('preserva textos não numéricos e trata vazio', () => {
    expect(formatDeliveryTime('A confirmar')).toBe('A confirmar');
    expect(formatDeliveryTime('')).toBe('');
    expect(formatDeliveryTime(null)).toBe('');
  });
});
