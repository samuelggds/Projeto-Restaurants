# Scripts operacionais

Todo executável desta pasta é classificado em `operational-scripts.json`. O CI recusa scripts novos ou reclassificados sem revisão.

## Classes

- `runtime`: infraestrutura usada por npm/testes; não é operação de negócio.
- `readOnly`: utilitário sem escrita e sem leitura de dados de negócio.
- `guardedRead`: diagnóstico de dados sensíveis; exige ambiente e identidade do banco antes de consultar.
- `guardedWrite`: escrita suportada, com dry-run padrão, ambiente e banco identificados, motivo e confirmação exata.
- `disabledLegacy`: código histórico em quarentena. A importação de `_shared/disabledLegacyScript.mjs` encerra a execução antes da lógica antiga.

## Bootstrap automático do único SUPER_ADMIN

Na imagem de produção, a inicialização executa as migrations, confirma ou cria o
`SUPER_ADMIN` e somente então inicia o servidor. O bootstrap é idempotente: se a
conta esperada já existe, nenhum hash de senha é calculado e nenhum dado de
autenticação é redefinido.

Mantenha estas variáveis de identidade configuradas em produção:

```dotenv
SUPER_ADMIN_BOOTSTRAP_ENABLED=true
SUPER_ADMIN_BOOTSTRAP_NAME=Desenvolvedor da Plataforma
SUPER_ADMIN_BOOTSTRAP_EMAIL=desenvolvedor@seudominio.com
```

Somente na primeira subida, forneça uma senha forte por **uma** destas fontes:

A senha deve ter no mínimo 8 caracteres, com letra minúscula, maiúscula, número e símbolo,
e não pode ser um valor previsível ou placeholder.

```dotenv
# Segredo injetado temporariamente pelo gerenciador do deploy
SUPER_ADMIN_BOOTSTRAP_PASSWORD=

# Ou, preferencialmente, caminho absoluto de um secret montado no runtime
SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE=/run/secrets/super_admin_password
```

Não defina as duas fontes ao mesmo tempo, não versione a senha e não a escreva
na imagem. Depois que o log confirmar a criação, remova a variável ou o secret
do ambiente e faça novo deploy. Reinicializações futuras continuam validando a
conta, mas não precisam da senha inicial e nunca a restauram.

A primeira criação gera uma conta ativa, sem restaurante e sem subpapel, com
MFA habilitado e troca de senha obrigatória. O processo falha de forma segura se
encontrar mais de um `SUPER_ADMIN`, se o e-mail esperado pertencer a outra conta
ou se a conta existente não estiver no escopo global esperado. Ele não promove
automaticamente um usuário comum.

Enquanto `mustChangePassword` estiver ativo, apenas a consulta da sessão e a
troca de senha ficam disponíveis; as demais APIs e o Socket.IO respondem de
forma fechada. A senha definitiva do `SUPER_ADMIN` mantém a política forte e
bcrypt com custo 12. Como o MFA é obrigatório, a validação de produção também
exige um SMTP funcional antes do bootstrap.

A conta única não pode ser desativada, desligar o MFA ou alterar o e-mail pelo
perfil genérico. Uma futura troca do desenvolvedor deve ser uma operação
coordenada e auditada com a atualização de `SUPER_ADMIN_BOOTSTRAP_EMAIL`; não
edite diretamente o banco ou apenas a variável durante um deploy.

O comando manual `create:superadmin` abaixo fica reservado para recuperação
operacional auditada. Ele não deve fazer parte do startup nem ser usado para
criar um segundo administrador da plataforma.

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
$env:NEW_SUPER_ADMIN_PASSWORD = 'Use-Um-Segredo-Forte-2026!'
npm run create:superadmin -- --email admin@example.test --environment development --create-if-missing --name 'Administrador' --password-env NEW_SUPER_ADMIN_PASSWORD
```

Uma escrita também exige `--reason`, `--apply` e `--confirm`. Repita as opções de alvo e efeito do
dry-run e copie a confirmação produzida: ela é vinculada ao banco, usuário, versão, estados
anterior/posterior e flags que mudam dados. Promoções sempre habilitam MFA; redefinições de senha
exigem troca no próximo login. A alteração de papel não pode demover o último `SUPER_ADMIN` ativo.
Produção acrescenta `--allow-production` e
`OPS_ALLOW_PRODUCTION=ALLOW_PRODUCTION_OPERATIONS`.

## Rotacionar a chave das credenciais de gateways

1. Gere uma nova chave de 32 bytes. Publique a chave nova em
   `CREDENTIAL_ENCRYPTION_KEY` e mantenha temporariamente a chave atual em
   `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS`.
2. Faça o deploy. A aplicação passa a escrever com a chave nova e ainda lê os
   registros antigos pela chave anterior.
3. Revise o dry-run com `npm run credentials:rotate -- --environment production
--allow-production`.
4. Execute novamente com `--apply`, `--actor`, `--reason` e a confirmação
   exibida. Todas as credenciais e o audit log são gravados na mesma transação.
5. Repita o dry-run; quando ele indicar zero credenciais pendentes, remova
   `CREDENTIAL_ENCRYPTION_KEY_PREVIOUS` e faça outro deploy.

Nunca remova a chave anterior antes de o dry-run chegar a zero. O comando não
imprime valores descriptografados nem credenciais do banco.

## Reativar um legado

Não remova apenas a importação de quarentena. Extraia a regra para um service testado, adicione dry-run e idempotência, elimine IDs/credenciais padrão, redija erros e mova o arquivo para `guardedWrite` no catálogo. Fluxos financeiros devem reutilizar os services/webhooks oficiais; scripts não podem marcar pagamentos como confirmados sem prova do provedor.
