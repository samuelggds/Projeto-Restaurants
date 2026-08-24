class ValidatePinService {
  async execute(_legacyPayload?: unknown) {
    throw new Error(
      'A validação por PIN foi desativada. Acesse a mesa pelo QR Code oficial depois que o garçom abrir o atendimento.',
    );
  }
}

export default new ValidatePinService();
