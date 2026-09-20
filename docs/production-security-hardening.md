# Segurança operacional — GastroNexa

Revisão e implementação: 20/09/2026. Este documento distingue controles implementados no repositório de configurações que precisam ser ativadas e comprovadas na infraestrutura. CI verde não certifica ausência de vulnerabilidades nem substitui monitoramento, backups restauráveis e revisão periódica de acessos.

## Correções desta entrega

- Recuperação de senha não reativa administradores ou funcionários suspensos. A conclusão valida novamente versão, papel e estado da conta; desativação invalida também o código de recuperação. A regra existente de reativação do próprio cliente é preservada.
- Erros HTTP entregues ao frontend não carregam configuração Axios, headers, cookies, corpo original ou token da requisição. A integração Sentry descarta dados da requisição e identidade, sanitiza contexto e não envia variáveis locais dos frames do navegador. Logs das operações administrativas registram o tipo de erro, não o objeto original.
- Sanitização limita o tamanho antes de executar expressões regulares e oculta campos de pagamento. E-mail comercial tem validação com limites explícitos. IDs de requisição externos somente são aceitos no formato UUID.
- API com CSP restritiva; links de checkout e destinos de alertas usam protocolo/host exatos. Normalização de origem não usa expressão regular vulnerável a entradas enormes.
- Reserva atômica de créditos antes de cada chamada paga de IA, com isolamento por restaurante, bloqueio concorrente por administrador, débito idempotente e limite de saída. Uso pago é contabilizado antes de validar o conteúdo retornado. Não há retry automático do SDK nas chamadas pagas.
- Reservas ambíguas não expiram nem são estornadas automaticamente. Existe uma ferramenta operacional protegida para conciliar com evidência do provedor, sem saldo negativo ou débito duplicado.
- Transações tenant fixam o fuso UTC, evitando que o fuso do servidor altere leases de impressão ou prazos de retry. A configuração é local à transação e não fica na conexão do pool.
- O gate CodeQL passa a resolver regras das extensões do SARIF, além do driver. Relatório ausente/inválido ou regra não resolvida falha; resultados HIGH/CRITICAL continuam bloqueantes. Não foram adicionadas supressões de achados.
- Contextos Docker ignoram variantes de `.env`, chaves, arquivos compactados, dumps e logs. Modelos `.example` continuam disponíveis. Isso impede inclusão acidental na imagem; não apaga arquivos locais nem revoga uma credencial já divulgada.
- Nome público e documentação atualizados para GastroNexa. Identificadores de compatibilidade são preservados: banco já existente, lock de refresh entre abas antigas, comando legado do print-agent e leitura do pareamento em `PizzaIADelivery`. Novas gravações do agente usam `GastroNexa`.

No GitHub, foram ativados secret scanning, push protection, alertas de dependências e atualizações de segurança do Dependabot. O ruleset existente de revisão/checks da main foi preservado. A automação semanal adicionada ao repositório complementa esses controles.

## Implantação e validação

Validação local desta entrega: 1.293 testes de backend, 1.166 de frontend, 21 do agente de impressão, 23 jornadas de navegador e 22 testes de RLS aprovados. A suíte multi-tenant completa passou com 87 testes aprovados e um cenário de escala opcional ignorado pelo comando padrão. Migrações foram aplicadas em PostgreSQL descartável; lint, TypeScript, build, orçamento de bundle, arquitetura e catálogo operacional passaram. Auditoria npm retornou zero vulnerabilidades conhecidas nas três árvores de dependências. O gate SARIF foi testado e identifica nove bloqueios no relatório antigo que a política anterior deixou passar. A análise CodeQL da implementação final, scans de imagens e validação integrada do commit serão executados pelo CI no PR.

1. Revisar o PR e concluir os workflows CI e Security Hardening no commit final. Falha ou execução ignorada de um requisito não significa aprovação.
2. Implantar a migração aditiva `20260920140000_reserve_ai_credit_before_provider` antes de iniciar backend/worker novos. Ela cria `AiCreditReservation` com RLS obrigatório; não altera preços, faturas ou credenciais existentes. Reexecutar o provisionamento normal da role de runtime para conceder acesso à nova tabela, sem OWNER/SUPERUSER/BYPASSRLS.
3. Após deploy, verificar readiness, autenticação, suspensão, pagamento em sandbox e comunicação em tempo real. Usar credenciais de teste dos provedores; nunca considerar HTTP 200 ou geração de QR como confirmação de pagamento.
4. Em rollback de aplicação, manter a tabela aditiva e conciliar reservas pendentes. Não apagar reservas/ledger nem retornar a uma versão que efetue chamadas de IA sem reserva enquanto houver operação em andamento.
5. Confirmar ausência de arquivos `.env`, dumps, chaves e sourcemaps publicados na imagem/site. O scan do repositório não inspeciona automaticamente diretórios fora dele, todas as contas de nuvem ou logs históricos de serviços externos.

## Backup externo criptografado

Arquivos: `scripts/backup-production.sh`, `scripts/restore-backup-drill.sh` e unidades em `deploy/systemd/`. Não foram ativados no servidor nesta entrega. Os testes locais de controle usam comandos sintéticos: comprovam rejeição de dump parcial, destino público e checksum incorreto; não comprovam recuperação de dados reais.

### Preparar armazenamento e chaves

- Criar bucket S3 privado com os quatro controles de Block Public Access ativos, versionamento e chave KMS. Usar política que exija TLS, SSE-KMS com a chave esperada e o principal autorizado. Definir retenção/lifecycle conforme a necessidade do negócio; considerar Object Lock e conta de backup separada para reduzir risco de exclusão pelo invasor.
- O operador deve confirmar o ID da conta proprietária, região, bucket e ARN da chave. O script verifica proprietário, bloqueio público, versionamento e checksum de upload.
- Criar par `age` em máquina de recuperação confiável. Guardar a chave privada fora do servidor de produção, com cópia segura e processo de recuperação testado. Só a chave pública `age1...` vai para produção. Perder a identidade privada torna o backup irrecuperável.
- Instalar Docker/Compose, AWS CLI v2 atualizado, age, OpenSSL e coreutils no host Linux. O script usa `put-object --if-none-match`, checksum SHA-256 e consulta do checksum remoto.
- Credencial de backup: restringir ao bucket/prefixo e à chave KMS escolhidos. Precisa de `s3:GetBucketPublicAccessBlock`, `s3:GetBucketVersioning`, `s3:PutObject`, `s3:GetObject` (HEAD/checksum), `kms:GenerateDataKey` e `kms:Decrypt` para a verificação SSE-KMS, conforme a política da chave. Não conceder exclusão de objetos, alteração de política, desativação de versionamento ou administração KMS. A identidade de restauração separada precisa de leitura do objeto e `kms:Decrypt`.
- Preferir credenciais temporárias/identidade de máquina quando suportadas. Se um arquivo de credenciais for necessário, guardá-lo fora do repositório com permissões 600 e rotação. O serviço tem `ProtectHome=true`: um perfil AWS em `/root/.aws` não estará acessível; usar configuração explicitamente legível em `/etc/gastronexa` ou o provedor de credenciais apropriado.

### Configurar o host

Criar `/etc/gastronexa/backup.env`, proprietário root e modo 600, preenchendo os valores reais fora do Git:

```ini
APP_DIR=/opt/gastronexa
BACKUP_BUCKET=SEU_BUCKET_PRIVADO
BACKUP_BUCKET_OWNER=SEU_ID_DE_CONTA_COM_12_DIGITOS
BACKUP_KMS_KEY_ARN=ARN_DA_CHAVE_KMS
BACKUP_AGE_RECIPIENT=CHAVE_PUBLICA_AGE
BACKUP_PREFIX=gastronexa/database
AWS_DEFAULT_REGION=REGIAO_DO_BUCKET
```

Depois de revisar o arquivo e o destino:

```bash
sudo install -m 644 deploy/systemd/gastronexa-backup.service /etc/systemd/system/
sudo install -m 644 deploy/systemd/gastronexa-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start gastronexa-backup.service
sudo systemctl status gastronexa-backup.service
sudo cat /var/lib/gastronexa-backups/last-success.json
# Ativar a agenda somente após confirmar o primeiro upload e a recuperação.
sudo systemctl enable --now gastronexa-backup.timer
sudo systemctl list-timers gastronexa-backup.timer
```

O dump é transmitido diretamente para criptografia; nenhum dump aberto é gravado no disco. O arquivo temporário criptografado é apagado ao terminar. `last-success.json` só é atualizado depois de checksum remoto confirmado. A agenda é horária com até cinco minutos de variação. O serviço termina após 30 minutos se travar; o monitor externo deve alertar sobre falha/ausência.

### Comprovar restauração

Em **outro host de recuperação**, com identidade age privada e acesso somente de leitura ao backup:

```bash
export BACKUP_BUCKET='BUCKET_PRIVADO'
export BACKUP_BUCKET_OWNER='ID_DA_CONTA'
export BACKUP_OBJECT_KEY='CHAVE_EXATA_DO_OBJETO.dump.age'
export BACKUP_AGE_IDENTITY_FILE='/CAMINHO_PROTEGIDO/identidade-age.txt'
bash scripts/restore-backup-drill.sh
```

Esse script não aceita URL de banco de destino. Ele verifica checksum, decripta para um PostgreSQL 16 descartável sem rede/portas publicadas, restaura com parada em erro e verifica tabelas, constraints e RLS. A role usada para o probe não é superuser e não ignora RLS. O container e o arquivo temporário são removidos ao final. O limite atual é 2 GiB de memória/4 GiB de tmpfs; para bases maiores, dimensionar um host isolado e revisar os limites antes do exercício.

Registrar data/hora do backup, do início/fim do restore, tamanho e resultado, sem exportar dados pessoais. Comprovar RPO e RTO medidos. A frequência de uma hora é uma meta de RPO, não uma garantia se o serviço falhar. Configurar monitoramento independente para atraso superior ao limite escolhido (por exemplo duas horas), falha do serviço, indisponibilidade S3/KMS e custo/armazenamento. Realizar restore periódico e após mudanças significativas de schema. Incluir no plano também uploads fora do banco, configuração de infraestrutura e recuperação segura das chaves usadas para decriptar credenciais armazenadas no banco; o dump sozinho não restaura esses itens.

## Conciliação de créditos de IA

`HELD` representa uma chamada em curso; `UNCERTAIN` representa resposta/cobrança ainda não comprovada. Uma chamada incerta mantém sua reserva e bloqueia outra chamada da mesma carteira, protegendo contra gasto repetido. Outras carteiras continuam independentes. Consultar pelo tenant/administrador e usar `providerRequestId`, horário e modelo para obter a evidência no provedor. Nunca registrar prompt, tokens secretos ou conteúdo privado no ticket.

O script `backend/scripts/reconcileAiCreditReservation.ts` usa os mesmos controles dos scripts operacionais existentes: ambiente declarado, fingerprint do banco, liberação explícita de produção, modo padrão dry-run, motivo, operador, evidência e confirmação exata. Não há endpoint público ou botão do cliente que libere reservas incertas.

Exemplo de **simulação**, dentro de `backend`, após preparar o ambiente protegido conforme `backend/scripts/README.md`:

```bash
node scripts/runTsxWithOsUserInfoFallback.cjs scripts/reconcileAiCreditReservation.ts \
  --environment production --allow-production --dry-run \
  --restaurant-id ID --admin-id ID --reservation-id UUID \
  --cost-usd CUSTO_COMPROVADO --actor OPERADOR \
  --reason 'Conclusao comprovada pelo provedor no ticket' --evidence TICKET_OU_REQUEST_ID
```

`NODE_ENV`, `OPS_DATABASE_ENV`, `OPS_DATABASE_FINGERPRINT_PRODUCTION` e a liberação `OPS_ALLOW_PRODUCTION` devem corresponder ao destino real. Não colocar URL/senha do banco na linha de comando ou no Git. O dry-run informa a confirmação exata: somente depois de revisar a evidência, repetir com `--apply` e `--confirm` no lugar de `--dry-run`.

- Custo zero exige confirmação de ausência de cobrança; timeout ou tempo decorrido não bastam.
- `HELD` com menos de 30 minutos é recusado para evitar conciliar uma execução ativa. Mesmo depois desse prazo, a evidência é obrigatória.
- Custo comprovado acima da reserva exige conciliação manual explícita, com indicação no dry-run. Nunca gera saldo negativo; saldo insuficiente mantém a reserva até a regularização.
- O débito e a baixa da reserva são atômicos e registrados em `AuditLog` e ledger. Repetir a mesma conclusão não debita novamente; uma reserva encerrada não pode ser sobrescrita com outro valor.
- Não apagar registros nem executar UPDATE direto para “destravar” a carteira. Corrigir a causa de timeout/modelo/custo antes de liberar novas chamadas.

## DNS e pendências reais de produção

Na verificação de 20/09/2026, `www.gastronexa.com.br` respondeu com `54.20.145.129`, mas o domínio raiz `gastronexa.com.br` não retornou registro A. Isso não é corrigido por PR. Confirmar primeiro o IP estático atualmente vinculado à instância Lightsail e configurar o registro A do domínio raiz no provedor DNS; conferir também AAAA/CNAME conflitantes, resolução e certificado HTTPS. Não copiar um IP antigo sem conferir a instância atual.

Antes de declarar a operação pronta para vendas, ainda é necessário comprovar no ambiente real: DNS/HTTPS, backup externo ativo e restauração, alertas atendidos, credenciais de produção e permissões mínimas dos gateways, conciliação de pagamentos e procedimento de recuperação. As alterações desta branch não executam cobrança real nem modificam o servidor de produção.
