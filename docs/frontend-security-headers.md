# Cabeçalhos da prévia de ajuda

O Caddy mantém `frame-ancestors 'none'` nas páginas normais da aplicação. Somente o caminho exato `/help-preview.html` permite incorporação pela própria origem (`frame-ancestors 'self'`) para os manuais visuais internos.

O documento isolado recebe `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'` e `frame-src 'none'`. Ele não pode acessar APIs, enviar formulários ou carregar subframes.

O matcher usa caminho exato, sem curingas. Parâmetros de consulta, como `?area=settings-brand`, mantêm a exceção no mesmo documento. Prefixos e sufixos diferentes recebem a política normal da aplicação.

O `frontend/nginx.conf` continua responsável pelos arquivos estáticos atrás do Caddy. No deploy de produção, os cabeçalhos de entrada são responsabilidade do Caddy.

## Validação

Execute na raiz:

```sh
CADDY_BIN=/caminho/para/caddy node scripts/verifyFrontendHeaders.mjs
```

A validação usa Caddy isolado em `127.0.0.1`, não lê credenciais de produção e não depende de banco de dados.
