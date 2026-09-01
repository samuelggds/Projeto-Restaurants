import prisma from '../../../config/prisma.js';
import {
  parsePrinterAgentCredential,
  verifyPrinterAgentCredential,
} from '../security/printerAgentToken.js';
import { logKitchenPrintingEvent } from './kitchenPrintingLog.js';

export type AuthenticatedPrinterAgent = {
  id: number;
  publicId: string;
  restaurantId: number;
  name: string;
};

class PrinterAgentAuthService {
  async authenticate(rawToken: string): Promise<AuthenticatedPrinterAgent | null> {
    const parsed = parsePrinterAgentCredential(rawToken);
    if (!parsed) {
      logKitchenPrintingEvent('PRINT_AGENT_AUTH_FAILED', { reason: 'invalid_format' });
      return null;
    }

    // Exceção RLS deliberada e mínima: somente os campos necessários para
    // autenticar o bootstrap e derivar o tenant persistido são lidos aqui.
    const device = await prisma.printerAgentDevice.findUnique({
      where: { publicId: parsed.publicId },
      select: {
        id: true,
        publicId: true,
        restaurantId: true,
        name: true,
        active: true,
        tokenHash: true,
      },
    });

    if (!device?.active || !verifyPrinterAgentCredential(parsed.token, device.tokenHash)) {
      logKitchenPrintingEvent('PRINT_AGENT_AUTH_FAILED', {
        devicePublicId: parsed.publicId,
        reason: 'invalid_or_revoked',
      });
      return null;
    }

    return {
      id: device.id,
      publicId: device.publicId,
      restaurantId: device.restaurantId,
      name: device.name,
    };
  }
}

export default new PrinterAgentAuthService();
