# Scripts operacionais

Todo executável desta pasta é classificado em `operational-scripts.json`. O CI recusa scripts novos ou reclassificados sem revisão.

## Classes

- `runtime`: infraestrutura usada por npm/testes; não é operação de negócio.
- `readOnly`: utilitário sem escrita e sem leitura de dados de negócio.
- `guardedRead`: diagnóstico de dados sensíveis; exige ambiente e identidade do banco antes de consultar.
- `guardedWrite`: escrita suportada, com dry-run padrão, ambiente e banco identificados, motivo e confirmação exata.
- `disabledLegacy`: código histórico em quarentena. A importação de `_shared/disabledLegacyScript.mjs` encerra a execução antes da lógica antiga.

## Executar escrita suportada

Defina `NODE_ENV`, `OPS_DATABASE_ENV` e `DATABASE_URL` para o mesmo ambiente. Para load test, defina também `OPS_API_ENV`. Primeiro execute sem `--apply`/`--execute`, revise o plano e copie literalmente a confirmação exibida.

Em produção, vincule a execução à identidade completa do banco (incluindo usuário/project ref e schema) sem expor credenciais:

```powershell
npm run db:fingerprint -- production
$env:OPS_DATABASE_FINGERPRINT_PRODUCTION = '<hash exibido>'
```

Leituras classificadas como `guardedRead` também exigem `--environment`. Em produção, elas exigem ainda `--allow-production`, `OPS_ALLOW_PRODUCTION` e o fingerprint acima.

Exemplo de promoção (dry-run):

```powershell
$env:NODE_ENV = 'development'
$env:OPS_DATABASE_ENV = 'development'
npm run create:superadmin -- --email admin@example.test --environment development
```

Para criar um usuário ausente ou redefinir sua senha, informe também `--name`, quando houver
criação, e `--password-env NOME_DA_VARIAVEL`. O dry-run nunca lê o valor da senha, mas a opção
precisa estar presente para que a confirmação fique vinculada ao plano completo. Exemplo:

```powershell
$env:NEW_SUPER_ADMIN_PASSWORD = 'use-um-segredo-forte-aqui'
npm run create:superadmin -- --email admin@example.test --environment development --create-if-missing --name 'Administrador' --password-env NEW_SUPER_ADMIN_PASSWORD
```

Uma escrita também exige `--reason`, `--apply` e `--confirm`. Repita as opções de alvo e efeito do
dry-run e copie a confirmação produzida: ela é vinculada ao banco, usuário, versão, estados
anterior/posterior e flags que mudam dados. Promoções sempre habilitam MFA; redefinições de senha
exigem troca no próximo login. A alteração de papel não pode demover o último `SUPER_ADMIN` ativo.
Produção acrescenta `--allow-production` e
`OPS_ALLOW_PRODUCTION=ALLOW_PRODUCTION_OPERATIONS`.

## Reativar um legado

Não remova apenas a importação de quarentena. Extraia a regra para um service testado, adicione dry-run e idempotência, elimine IDs/credenciais padrão, redija erros e mova o arquivo para `guardedWrite` no catálogo. Fluxos financeiros devem reutilizar os services/webhooks oficiais; scripts não podem marcar pagamentos como confirmados sem prova do provedor.
