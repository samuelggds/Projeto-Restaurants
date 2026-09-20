import { AiCreditsExhaustedError } from './AiCreditService.js';

export function publicAiFailure(error: unknown) {
  if (error instanceof AiCreditsExhaustedError) return error.message;
  // Provider exceptions may include API credentials, request data or generated
  // content. This text is persisted in jobs and returned to restaurant admins.
  return 'Não foi possível concluir a solicitação de IA. Consulte o saldo e, se houver uma solicitação pendente, aguarde a confirmação ou contate o suporte.';
}
