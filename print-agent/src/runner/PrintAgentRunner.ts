import type { PrintAgentApi } from '../api/PrintAgentApi.js';
import type { AgentLogger } from '../logger.js';
import { renderKitchenCommand } from '../rendering/renderKitchenCommand.js';
import type { PrinterTransport } from '../transports/PrinterTransport.js';
import type { LocalAgentConfig } from '../types.js';

type Api = Pick<PrintAgentApi, 'heartbeat' | 'claim' | 'markPrinted' | 'markFailed'>;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Falha desconhecida de impressão.';
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export class PrintAgentRunner {
  private pendingPrintedAck: { publicId: string; copies: number; attempts: number } | null = null;

  constructor(
    private readonly config: LocalAgentConfig,
    private readonly api: Api,
    private readonly transport: PrinterTransport,
    private readonly logger: AgentLogger,
  ) {}

  async heartbeat() {
    const printer = this.config.printerName
      ? await this.transport.getStatus(this.config.printerName).catch(() => null)
      : null;
    const result = await this.api.heartbeat({
      printerName: printer?.name || this.config.printerName,
      appVersion: '1.0.0',
    });
    return { ...result, printer };
  }

  async processOnce(): Promise<'idle' | 'printed' | 'failed'> {
    if (!this.config.printerName) throw new Error('Selecione uma impressora antes de iniciar.');
    if (this.pendingPrintedAck) {
      const pending = this.pendingPrintedAck;
      try {
        await this.api.markPrinted(pending.publicId);
        this.pendingPrintedAck = null;
        this.logger.info('PRINT_COMPLETED', {
          jobPublicId: pending.publicId,
          copies: pending.copies,
          attempts: pending.attempts,
          ackRetried: true,
        });
        return 'printed';
      } catch (error: unknown) {
        this.logger.error('PRINT_ACK_PENDING', {
          jobPublicId: pending.publicId,
          reason: errorMessage(error),
        });
        throw error;
      }
    }
    const job = await this.api.claim();
    if (!job) return 'idle';

    try {
      const printer = await this.transport.getStatus(this.config.printerName);
      if (!printer) throw new Error('Impressora selecionada não encontrada.');
      if (printer.offline) throw new Error('Impressora selecionada está offline.');
      const content = renderKitchenCommand(job.payload, job.paperWidth);
      for (let copy = 0; copy < job.copies; copy += 1) {
        await this.transport.print({ printerName: this.config.printerName, content });
      }
    } catch (error: unknown) {
      const message = errorMessage(error);
      try {
        await this.api.markFailed(job.publicId, message);
      } catch (reportError: unknown) {
        this.logger.error('PRINT_FAILURE_ACK_ERROR', {
          jobPublicId: job.publicId,
          reason: errorMessage(reportError),
        });
      }
      this.logger.error('PRINT_FAILED', {
        jobPublicId: job.publicId,
        reason: message,
        attempts: job.attempts,
      });
      return 'failed';
    }

    // Once the spooler accepted every copy, never downgrade the job to FAILED
    // merely because the network ACK failed. That would make it immediately
    // eligible for another physical print. The server lease remains active and
    // its idempotent ACK can be retried after connectivity returns.
    try {
      await this.api.markPrinted(job.publicId);
      this.logger.info('PRINT_COMPLETED', {
        jobPublicId: job.publicId,
        copies: job.copies,
        attempts: job.attempts,
      });
      return 'printed';
    } catch (error: unknown) {
      this.pendingPrintedAck = {
        publicId: job.publicId,
        copies: job.copies,
        attempts: job.attempts,
      };
      this.logger.error('PRINT_ACK_PENDING', {
        jobPublicId: job.publicId,
        reason: errorMessage(error),
      });
      throw error;
    }
  }

  async run(signal?: AbortSignal) {
    let connectionBackoffMs = this.config.pollIntervalMs;
    this.logger.info('AGENT_STARTED', {
      transport: this.transport.kind,
      printerName: this.config.printerName || 'not-selected',
    });

    while (!signal?.aborted) {
      try {
        await this.heartbeat();
        const result = await this.processOnce();
        connectionBackoffMs = this.config.pollIntervalMs;
        await wait(result === 'idle' ? this.config.pollIntervalMs : 150, signal);
      } catch (error: unknown) {
        this.logger.error('AGENT_CONNECTION_ERROR', { reason: errorMessage(error) });
        await wait(connectionBackoffMs, signal);
        connectionBackoffMs = Math.min(30_000, connectionBackoffMs * 2);
      }
    }
    this.logger.info('AGENT_STOPPED');
  }
}
