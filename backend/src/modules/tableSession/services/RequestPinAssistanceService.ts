class RequestPinAssistanceService {
  async execute(_legacyPayload?: unknown) {
    throw new Error(
      'Solicitações de PIN foram desativadas. O garçom deve abrir a mesa e o cliente acessar pelo QR Code oficial.',
    );
  }
}

export default new RequestPinAssistanceService();
