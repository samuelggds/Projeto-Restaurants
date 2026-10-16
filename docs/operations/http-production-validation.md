# Validacao HTTP, seguranca de transporte e ambiente de producao

Este roteiro e somente de leitura. Ele nao executa migrations, nao gera cobrancas e nao altera DNS, certificados, containers ou banco. Execute com acesso ao ambiente correto e guarde evidencias **sem** tokens, chaves, cookies ou dados pessoais.

## 1. DNS e HTTPS

Defina os dominios publicos antes de executar (sem incluir protocolo):

```bash
export APP_DOMAIN='app.seudominio.com'
export API_DOMAIN='api.seudominio.com'
dig +short A "$APP_DOMAIN"
dig +short A "$API_DOMAIN"
dig +short AAAA "$APP_DOMAIN"
dig +short AAAA "$API_DOMAIN"
curl -sS -o /dev/null -D - "https://$APP_DOMAIN/"
curl -sS -o /dev/null -D - "https://$API_DOMAIN/health"
openssl s_client -connect "$API_DOMAIN:443" -servername "$API_DOMAIN" -verify_return_error </dev/null 2>&1 | tail -n 15
```

Verifique se os enderecos apontam para a infraestrutura esperada, se o certificado corresponde ao hostname e se a verificacao TLS e bem-sucedida. Um registro AAAA vazio nao indica necessariamente falha. Repita o teste nos dominios personalizados ativos; a autorizacao de dominio e o certificado sao controles distintos. Nao presuma que o Compose prova o estado real do DNS ou do certificado.

## 2. API, cache e disponibilidade

```bash
curl -sS -o /dev/null -D - "https://$API_DOMAIN/health"
curl -sS -o /dev/null -D - "https://$API_DOMAIN/ready"
curl -sS -o /dev/null -D - "https://$API_DOMAIN/orders"
curl -sS -o /dev/null -D - "https://$API_DOMAIN/products"
```

- `/health` confirma que o processo HTTP responde; nao garante que todas as dependencias estejam prontas.
- `/ready` consulta a prontidao do banco e do transporte realtime. Resultado 503 exige investigacao e nao deve ser mascarado.
- `/orders`, mesmo sem autenticacao e com resposta 401/403, deve enviar `Cache-Control: private, no-store`; o mesmo vale para respostas autenticadas e financeiras.
- `/products` sem credenciais e uma superficie publica; o middleware de privacidade nao deve impor `no-store` indiscriminadamente. Isso nao significa que o cache do catalogo esta habilitado.
- Respostas HTTP 200 de provedores de pagamento nao comprovam cobranca aprovada. Nunca crie um Pix ou estorno real como parte do smoke de leitura.

## 3. Estado distribuido no servidor

No host que realmente executa a GastroNexa:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml ps backend worker db gateway
docker compose --env-file .env.production -f docker-compose.production.yml exec -T backend node -e "console.log({distributedState:process.env.DISTRIBUTED_STATE,replicas:process.env.API_REPLICA_COUNT})"
docker compose --env-file .env.production -f docker-compose.production.yml logs --since 10m --tail 100 backend worker gateway
```

O Compose **define** `DISTRIBUTED_STATE=postgres` e `API_REPLICA_COUNT=2` por padrao, mas `ps` e os logs sao necessarios para conferir o que esta efetivamente em execucao. No modo distribuido, o Socket.IO usa somente WebSocket e o relay `PostgresRealtimeTransport` compartilha eventos entre replicas. Verifique o fluxo em tempo real e a reconsulta apos reconexao usando contas isoladas de teste; o relay nao garante entrega exatamente uma vez. Rate limits e leases de jobs tambem precisam continuar consistentes entre processos.

## 4. Medicao de desempenho e erros

O backend registra `[API_REQUEST_TIMING]` para requisicoes com erro 5xx e para requisicoes acima de `SLOW_REQUEST_THRESHOLD_MS` (padrao: 2000 ms). O registro contem somente `requestId`, metodo, rota sanitizada, status e duracao; nao deve conter parametros de consulta, payload, credenciais ou dados pessoais.

Use esses registros para identificar a rota lenta. Para separar tempo de PostgreSQL, gateway de pagamento ou servico externo, use tracing e metricas apropriados, sem habilitar logs de payloads sensiveis. O monitoramento HTTP sozinho **nao** atribui o tempo a cada dependencia. Confira se o Sentry e os alertas realmente recebem eventos, respeitando a politica de privacidade e retencao.

## 5. Validacoes que exigem ambiente controlado

Antes de liberar um deploy de seguranca:

1. Confira `npm run ci` (ou os checks equivalentes da raiz), lint, typecheck, testes multi-tenant e RLS, smoke do stack e migration compatibility.
2. Em PostgreSQL **descartavel**, teste tentativas concorrentes, reenvio da mesma `Idempotency-Key`, conflito de conteudo, filtragem por restaurante e ausencia de campos internos na resposta HTTP.
3. Em sandbox, simule timeout apos aceite do provedor e webhook duplicado ou atrasado. Confirme reconciliacao, sem repetir cobranca nem apagar pedido pago.
4. Confirme backups externos e execute o restore drill em infraestrutura isolada.
5. Verifique a configuracao real do Lightsail (firewall, recursos, volumes, DNS, Caddy e replicas) usando acesso administrativo apropriado. Nao invente valores para preencher essa etapa.

## Limites desta validacao

Arquivos no GitHub e checks de CI nao comprovam que um commit esteja implantado no Lightsail. Sem acesso autenticado ao host/AWS e as configuracoes reais, DNS, certificados, disponibilidade, quantidade de replicas e integracoes de producao permanecem **nao verificados**. O merge e o deploy devem ocorrer separadamente, apos revisao.
