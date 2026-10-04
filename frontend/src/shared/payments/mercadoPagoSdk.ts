export type MercadoPagoCardToken = {
  id?: string;
  last_four_digits?: string;
  payment_method_id?: string;
  expiration_month?: number;
  expiration_year?: number;
};

export type MercadoPagoFieldEvent = {
  bin?: string | null;
  field?: string;
  errorMessages?: Array<{ message?: string; cause?: string }>;
};

export type MercadoPagoField = {
  mount(containerId: string): void;
  unmount?(): void;
  on?(
    event: 'binChange' | 'validityChange',
    callback: (event: MercadoPagoFieldEvent) => void,
  ): MercadoPagoField;
};

export type MercadoPagoInstance = {
  fields: {
    create(
      name: 'cardNumber' | 'expirationDate' | 'securityCode',
      options: { placeholder: string },
    ): MercadoPagoField;
    createCardToken(input: Record<string, string>): Promise<MercadoPagoCardToken>;
  };
  getPaymentMethods(input: { bin: string }): Promise<{
    results?: Array<{
      id?: string;
      name?: string;
      payment_type_id?: string;
    }>;
  }>;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string) => MercadoPagoInstance;
    MP_DEVICE_SESSION_ID?: string;
  }
}
