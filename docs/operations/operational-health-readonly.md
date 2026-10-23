# Diagnóstico operacional agregado — somente leitura

O GastroNexa já possui Sentry, logs de requisições lentas, agendador persistente e probes `/health` e `/ready`. O utilitário `backend/scripts/operationalHealthSnapshot.mjs` adiciona apenas uma leitura pontual e opt-in, sem criar jobs, tarefas agendadas, rotas HTTP ou alertas automáticos.

O comando exige `--environment`, `NODE_ENV`, `OPS_DATABASE_ENV` e as proteções já existentes em `guardSensitiveRead.mjs`. Em produção exige adicionalmente `--allow-production`, `OPS_ALLOW_PRODUCTION` e `OPS_DATABASE_FINGERPRINT_PRODUCTION`. Consulte `backend/scripts/README.md`. Execute somente em sessão operacional autorizada, preferencialmente com credencial de leitura.

```bash
cd backend
node scripts/operationalHealthSnapshot.mjs --environment staging
```

Os sinais são indicadores de triagem, **não alarmes ligados nem garantia de indisponibilidade**: outbox com pendência acima de cinco minutos (warning), quinze minutos ou falha terminal (critical), pedidos PIX ativos com mais de cinco minutos (warning) e jobs com falhas consecutivas (warning/critical). Não há consulta externa ao gateway, mudança de estados financeiros, dados de clientes ou conteúdo de mensagens.

As saídas incluem apenas contagens, idades e chaves de jobs cadastrados. Uma falha de leitura encerra com código de erro, sem imprimir valores privados. Nenhum limiar altera filas, entrega, pagamento ou cron. Para alertas reais e medição de p95/p99, configurar observabilidade externa com procedimento de autorização separado. Referência: issue #331.
