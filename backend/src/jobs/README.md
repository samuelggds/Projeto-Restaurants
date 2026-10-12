# Jobs

Os jobs de negócio são registrados em `registry.ts`, executados por `WorkerScheduler` e protegidos entre processos pelo lease PostgreSQL de `lease/`.

## Processos

- `src/worker.ts`: executa billing, reconciliação, fidelidade e limpeza de localização.
- `src/server.ts`: executa a expiração de pagamentos de mesa e de reservas não atendidas para manter os eventos Socket.IO no runtime da API. O lease distribuído impede execução concorrente da mesma janela.

Não mova um job para o worker apenas alterando `runtime`: jobs que notificam sockets precisam primeiro de um broker compartilhado (por exemplo, Redis adapter) ou de outbox/relay que alcance todas as réplicas.

## Garantias

- `claim` e renovação usam o relógio do PostgreSQL.
- `ownerId + leaseVersion` formam o fencing token.
- `nextRunAt` cria cooldown durável e impede execução sequencial duplicada.
- O job nunca mantém uma transação aberta durante chamadas externas.
- O shutdown para novos gatilhos e aguarda execuções locais em andamento.

O lease fornece execução _at least once_, não exatamente uma vez. Cada efeito de domínio ainda deve ser idempotente ou usar CAS/chave única.
