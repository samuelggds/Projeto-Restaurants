export type CardPaymentFailureDetails = {
  publicId?: string | null;
  failureCode?: string | null;
  providerStatusDetail?: string | null;
};

const genericMessage =
  'Não foi possível aprovar este pagamento. O provedor não informou um motivo específico. Use outra forma de pagamento ou fale com o banco.';

const messages: Record<string, string> = {
  saved_card_refresh_failed:
    'Não foi possível consultar ou atualizar o cadastro do cartão salvo. Nenhuma cobrança foi enviada nesta tentativa. Aguarde alguns minutos antes de tentar novamente.',
  saved_card_reference_invalid:
    'Não foi possível validar o vínculo deste cartão salvo. Nenhuma cobrança foi enviada nesta tentativa. Cadastre o cartão novamente ou informe outro cartão.',
  invalid_card_token:
    'A validação segura do cartão não foi aceita. Informe os dados do cartão novamente antes de tentar pagar.',
  processing_error:
    'O provedor informou uma falha técnica no processamento. Use a referência abaixo para solicitar ajuda.',
  high_risk:
    'O Mercado Pago recusou esta tentativa na análise de segurança. O motivo específico não foi informado. Evite repetir a tentativa imediatamente e use outra forma de pagamento.',
  bad_filled_security_code:
    'O código de segurança do cartão não foi aceito. Confira o CVV informado antes de tentar novamente.',
  bad_filled_card_data:
    'Os dados do cartão não foram aceitos. Confira os dados informados antes de tentar novamente.',
  insufficient_amount:
    'O banco informou saldo ou limite insuficiente para este pagamento. Consulte o banco ou use outra forma de pagamento.',
  rejected_by_issuer:
    'O banco emissor não autorizou este pagamento. Consulte o banco ou use outra forma de pagamento.',
  card_disabled:
    'O cartão está desabilitado para este pagamento. Consulte o banco ou use outra forma de pagamento.',
  max_attempts_exceeded:
    'O limite de tentativas de pagamento foi atingido. Evite tentar novamente agora e use outra forma de pagamento.',
};

const aliases: Record<string, string> = {
  saved_card_refresh_unavailable: 'saved_card_refresh_failed',
  saved_card_refresh_invalid_response: 'saved_card_refresh_failed',
  saved_card_reference_mismatch: 'saved_card_reference_invalid',
  required_call_for_authorize: 'rejected_by_issuer',
  card_insufficient_amount: 'insufficient_amount',
  amount_limit_exceeded: 'insufficient_amount',
  cc_rejected_high_risk: 'high_risk',
  cc_rejected_bad_filled_security_code: 'bad_filled_security_code',
  cc_rejected_bad_filled_card_number: 'bad_filled_card_data',
  cc_rejected_bad_filled_date: 'bad_filled_card_data',
  cc_rejected_bad_filled_other: 'bad_filled_card_data',
  cc_rejected_insufficient_amount: 'insufficient_amount',
  cc_rejected_call_for_authorize: 'rejected_by_issuer',
  cc_rejected_other_reason: 'rejected_by_issuer',
  cc_rejected_card_disabled: 'card_disabled',
  cc_rejected_max_attempts: 'max_attempts_exceeded',
};

export function cardPaymentFailurePresentation(details?: CardPaymentFailureDetails | null) {
  let message = genericMessage;
  let isTechnicalFailure = false;
  for (const value of [details?.providerStatusDetail, details?.failureCode]) {
    const code = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const key = Object.hasOwn(aliases, code) ? aliases[code] : code;
    if (Object.hasOwn(messages, key)) {
      message = messages[key];
      isTechnicalFailure = key.startsWith('saved_card_') || ['invalid_card_token', 'processing_error'].includes(key);
      break;
    }
  }

  const publicId = typeof details?.publicId === 'string' ? details.publicId.trim() : '';
  const supportReference = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu.test(publicId)
    ? publicId
    : null;
  return { message, supportReference, isTechnicalFailure };
}
