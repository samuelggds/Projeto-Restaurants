import type { CardPaymentPreparer, PreparedCardPayment } from '../components/OnlineCardPaymentForm';

let activePreparer: CardPaymentPreparer | null = null;

export function setCardPaymentPreparer(preparer: CardPaymentPreparer | null) {
  activePreparer = preparer;
}

export async function prepareCardPayment(): Promise<PreparedCardPayment> {
  if (!activePreparer) {
    throw new Error(
      'Prepare o cartão antes de continuar. Se sua conta não possui cartão salvo, cadastre um no perfil.',
    );
  }
  return activePreparer();
}
