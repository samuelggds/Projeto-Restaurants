import { describe, expect, it } from 'vitest';
import { isLocalPaymentVisualLabRuntime } from './paymentVisualLabAccess';

describe('isLocalPaymentVisualLabRuntime', () => {
  it.each(['localhost', '127.0.0.1', '::1', '[::1]'])(
    'permite o laboratório apenas no host local %s',
    (hostname) => {
      expect(isLocalPaymentVisualLabRuntime({ hostname } as Location)).toBe(true);
    },
  );

  it.each(['gastronexa.com.br', 'app.gastronexa.com.br', 'north-pizza.example.com'])(
    'mantém o laboratório desabilitado fora do ambiente local: %s',
    (hostname) => {
      expect(isLocalPaymentVisualLabRuntime({ hostname } as Location)).toBe(false);
    },
  );
});
