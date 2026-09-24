type Payload = { restaurantId: number | string; userId: number | string };

class StartPagBankOAuthService {
  async execute({ restaurantId, userId }: Payload) {
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedUserId = Number(userId);

    if (!normalizedRestaurantId || !normalizedUserId) {
      throw new Error('Restaurante ou administrador inválido.');
    }

    throw new Error(
      'PagBank foi descontinuado no GastroNexa e não aceita novas conexões.',
    );
  }
}

export default new StartPagBankOAuthService();
