import userRepository from '../repositories/UserRepository.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';

type SuccessfulLoginRepository = Pick<typeof userRepository, 'recordSuccessfulLogin'>;
type LoginTelemetryLogger = (event: string, context: Record<string, unknown>) => void;

export class SuccessfulLoginRecorderService {
  constructor(
    private readonly repository: SuccessfulLoginRepository = userRepository,
    private readonly logger: LoginTelemetryLogger = (event, context) =>
      console.warn(event, context),
  ) {}

  async execute(userId: number | string) {
    try {
      await this.repository.recordSuccessfulLogin(userId);
      return true;
    } catch (error) {
      // O refresh token já foi persistido quando este método é chamado. Esta
      // telemetria não pode transformar uma autenticação concluída em erro.
      this.logger('[LAST_LOGIN_UPDATE_FAILED]', {
        userId: Number(userId),
        errorType: safeErrorName(error),
      });
      return false;
    }
  }
}

export default new SuccessfulLoginRecorderService();
