# Jobs

Os jobs de negócio são registrados em `registry.ts`, executados por `WorkerScheduler` e protegidos entre processos pelo lease PostgreSQL de `lease/`.

## Processos

- `src/worker.ts`: executa billing, reconciliação, fidelidade e limpeza de localização.
- `src/server.ts`: executa a expiração de pagamentos de mesa e de reservas não atendidas para manter os eventos Socket.IO no runtime da API. O lease distribuído impede execução concorrente da mesma janela.

No modo `DISTRIBUTED_STATE=postgres`, a aplicação já dispõe de `PostgresRealtimeTransport`, que encaminha eventos às réplicas. No modo `memory`, notificações Socket.IO são locais a uma única API. Não mova um job entre API e worker apenas alterando `runtime`: revise se o publicador foi inicializado, se a emissão ocorre depois do commit, se a reconciliação é idempotente e se há reconsulta para eventos perdidos durante reinícios. A existência do relay não transforma o agendamento em execução exatamente uma vez.

## Garantias

- `claim` e renovação usam o relógio do PostgreSQL.
- `ownerId + leaseVersion` formam o fencing token.
- `nextRunAt` cria cooldown durável e impede execução sequencial duplicada.
- O job nunca mantém uma transação aberta durante chamadas externas.
- O shutdown para novos gatilhos e aguarda execuções locais em andamento.

O lease fornece execução _at least once_, não exatamente uma vez. Cada efeito de domínio ainda deve ser idempotente ou usar CAS/chave única.
