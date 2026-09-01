#!/usr/bin/env node
import { PrintAgentApi } from './api/PrintAgentApi.js';
import { LocalConfigStore } from './config/LocalConfigStore.js';
import { consoleLogger } from './logger.js';
import { renderKitchenCommand } from './rendering/renderKitchenCommand.js';
import { PrintAgentRunner } from './runner/PrintAgentRunner.js';
import { MockPrinterTransport } from './transports/MockPrinterTransport.js';
import type { PrinterTransport } from './transports/PrinterTransport.js';
import { WindowsSpoolerPrinterTransport } from './transports/WindowsSpoolerPrinterTransport.js';
import type { LocalAgentConfig } from './types.js';

function flag(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function transportFor(config: LocalAgentConfig): PrinterTransport {
  return config.transport === 'mock'
    ? new MockPrinterTransport()
    : new WindowsSpoolerPrinterTransport();
}

function help() {
  console.log(`
Pizza IA Delivery - Print Agent

Comandos:
  pair --url <https://saas> [--token <credencial>] [--mock]
  printers
  select --printer <nome exato>
  status
  test
  run
  config

Para evitar histórico do shell, prefira definir PRINT_AGENT_CREDENTIAL antes de "pair".
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const store = new LocalConfigStore();

  if (!command || command === 'help' || command === '--help') {
    help();
    return;
  }

  if (command === 'pair') {
    const apiBaseUrl = flag(args, '--url');
    const credential = flag(args, '--token') || process.env.PRINT_AGENT_CREDENTIAL;
    if (!apiBaseUrl || !credential) {
      throw new Error('Informe --url e a credencial por PRINT_AGENT_CREDENTIAL ou --token.');
    }
    const config = await store.save({
      apiBaseUrl,
      credential,
      printerName: null,
      transport: args.includes('--mock') ? 'mock' : 'windows',
      pollIntervalMs: Number(flag(args, '--poll-ms') || 2_000),
    });
    console.log('Pareamento salvo com segurança:', store.safeSummary(config));
    return;
  }

  const config = await store.load();
  const transport = transportFor(config);

  if (command === 'printers') {
    const printers = await transport.listPrinters();
    if (!printers.length) {
      console.log('Nenhuma impressora instalada foi encontrada.');
      return;
    }
    for (const printer of printers) {
      console.log(`${printer.name}${printer.offline ? ' [OFFLINE]' : ''} - ${printer.status}`);
    }
    return;
  }

  if (command === 'select') {
    const printerName = flag(args, '--printer');
    if (!printerName) throw new Error('Informe --printer com o nome exato da impressora.');
    const printer = await transport.getStatus(printerName);
    if (!printer) throw new Error('Impressora não encontrada entre as instaladas.');
    const updated = await store.update({ printerName: printer.name });
    console.log('Impressora selecionada:', updated.printerName);
    return;
  }

  if (command === 'config') {
    console.log(store.safeSummary(config));
    return;
  }

  const api = new PrintAgentApi(config.apiBaseUrl, config.credential);
  const runner = new PrintAgentRunner(config, api, transport, consoleLogger);

  if (command === 'status') {
    const status = await runner.heartbeat();
    console.log({ connected: status.ok, serverTime: status.serverTime, printer: status.printer });
    return;
  }

  if (command === 'test') {
    if (!config.printerName) throw new Error('Selecione uma impressora antes do teste.');
    const content = renderKitchenCommand(
      {
        version: 1,
        kind: 'TEST',
        restaurantName: 'Pizza IA Delivery',
        requestedAt: new Date().toISOString(),
        message: 'Teste local do Print Agent concluído.',
      },
      'MM80',
    );
    await transport.print({ printerName: config.printerName, content });
    console.log('Teste local enviado ao spooler.');
    return;
  }

  if (command === 'run') {
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    await runner.run(controller.signal);
    return;
  }

  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Falha inesperada do Print Agent.');
  process.exitCode = 1;
});
