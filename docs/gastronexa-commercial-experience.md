# GastroNexa: apresentação e contatos comerciais

## Experiência visual

A landing usa verde escuro, tons claros e tipografia Manrope com títulos em DM Serif Display. A fotografia ilustrativa aproxima a apresentação da rotina de um restaurante. A prévia interativa permite conhecer gestão, cozinha, salão e delivery antes de entrar na demonstração.

A entrada `/demonstracao` acompanha essa identidade e mantém os acessos de cliente (home e QR Code da mesa), funcionários e administrador. O aviso de dados fictícios fica no conteúdo, sem cobrir os botões. As jornadas internas continuam usando os componentes do produto e os dados locais da demonstração.

Botões comerciais levam ao formulário `/#contato`. A escolha de plano preenche o interesse sem apagar os demais campos. Os preços e períodos exibidos foram preservados; exemplos de pedidos não representam clientes ou resultados reais.

## Formulário e painel

Campos obrigatórios: responsável, restaurante, e-mail, telefone com DDD, cidade, UF, tipo de negócio, formas de atendimento e autorização para contato. Plano de interesse tem a opção de orientação; mensagem é opcional. Nenhuma senha, dado de cartão ou documento é solicitado.

- `POST /sales-leads`: público; exige `Idempotency-Key` UUID, valida o corpo, limita a cinco tentativas por hora/IP e possui honeypot. Repetir uma solicitação confirmada devolve o mesmo contato; mudar o corpo com a mesma chave retorna 409.
- `/super_admin/sales-leads`: caixa comercial exclusiva do SUPER_ADMIN. Busca, paginação, filtros, detalhes e estados Novo, Contatado e Arquivado. Alterações de estado são auditadas.
- `GET /super-admin/sales-leads` e `PATCH /super-admin/sales-leads/:id/status`: exigem autenticação e permissão de plataforma. Administradores de restaurantes, clientes e funcionários não acessam esses dados.
- O contato e a entrada de e-mail são gravados na mesma operação. A tela só confirma recebimento após resposta positiva da API; falhas preservam os campos para repetir o envio.

## Entrega do aviso por e-mail

API e worker precisam compartilhar:

```dotenv
SALES_CONTACT_NOTIFICATION_EMAIL=comercial@seudominio.com
SALES_CONTACT_EMAIL_FROM=GastroNexa <mailer@seudominio.com>
```

O destinatário escolhido pelo proprietário está nos arquivos locais de ambiente, não no código nem nos exemplos públicos. O remetente deve ser autorizado pelo provedor SMTP. Sem `SALES_CONTACT_EMAIL_FROM`, usa-se `ALERT_EMAIL_FROM` ou `SMTP_USER`.

O envio reutiliza as configurações SMTP existentes: host, porta, usuário, senha ou OAuth2. TLS permanece obrigatório. A API salva o contato mesmo quando SMTP está indisponível; o painel informa essa condição.

O job `sales-leads.email-delivery` roda no worker a cada 30 segundos. Reivindica até dez avisos com bloqueio PostgreSQL, processa três por vez e protege a conclusão com token de posse. Falhas usam espera progressiva de um minuto a uma hora; após oito tentativas, o aviso fica marcado como falho no painel e exige intervenção operacional antes de ser colocado novamente na fila. O contato permanece salvo.

O assunto, remetente e destinatário são controlados pela plataforma. Dados do visitante aparecem no corpo textual e no `reply-to`, após validação. SMTP usa entrega pelo menos uma vez: uma interrupção após aceitação pode ocasionar repetição, com o mesmo `Message-ID`. O estado Enviado registra aceitação pelo SMTP, não comprova chegada à caixa principal.

Para executar localmente, API e worker são processos separados:

```sh
npm --prefix backend run dev
npm --prefix backend run dev:worker
```

Em produção, aplique as migrações no processo normal de publicação e reinicie API e worker. As configurações foram incluídas nos arquivos Compose. Os testes não enviam mensagens ao destinatário real.

## Marca e dados existentes

Nome, logo, favicon, carregamento e recuperação de falhas usam GastroNexa. A identidade personalizada de cada restaurante permanece própria.

Uma migração de storage transfere preferências para o novo namespace sem substituir valores já existentes. A migração SQL muda somente aliases internos de convidados, preservando IDs, pedidos e relações. Colisões de e-mail abortam a migração em vez de combinar contas.

As únicas referências textuais ao nome anterior ficam nas conversões e nos testes de compatibilidade. Elas são necessárias para reconhecer dados de instalações anteriores; não são apresentadas ao usuário.

## Validação em 10/09/2026

- PostgreSQL descartável, migrações reais e role de execução sem privilégios administrativos: sete verificações aprovadas. Cobrem HTTP, acesso de diferentes restaurantes, paginação, idempotência concorrente, recuperação da fila com dois workers, fusos São Paulo/Tóquio e preservação dos convidados na mudança de marca.
- Suíte completa do backend: 1.018 testes aprovados.
- Suíte completa do frontend: 966 testes aprovados, cobertura de 66,9% das linhas, acima dos limites existentes.
- Agente de impressão: 15 testes aprovados.
- 31 jornadas de navegador aprovadas: landing, contatos, administração e demonstração, incluindo pedidos de mesa, retirada e delivery. A revisão final do aviso da demonstração possui execução adicional em `artifacts/marketing-browser-final.log`.
- A execução adicional aprovou 13 testes. A suíte crítica inclui agora a landing e o formulário comercial, incluindo a troca repetida de plano sem apagar os dados já preenchidos.
- Typecheck e lint de backend/frontend, builds, validação Prisma, arquitetura e orçamento dos bundles aprovados.
- Banco local `localhost:5432/pizza_ai` atualizado após backup custom do PostgreSQL, com leitura do catálogo do backup validada. A migração adicional `20260910140000_sales_lead_timestamp_timezone` preserva os instantes UTC e alinha as sete colunas de data dos contatos/fila ao `TIMESTAMPTZ(3)` do schema. Não foi executada restauração do backup local; os testes de migração usaram outro banco descartável.

Evidências: `artifacts/marketing-postgres-e2e.log`, `marketing-backend-tests.log`, `marketing-frontend-tests.log`, `marketing-browser.log` e capturas em `artifacts/marketing-screenshots/`. A entrega externa de e-mail não foi testada com a caixa real. Na verificação final, não havia API atendendo em `localhost:3000`; API e worker devem ser iniciados para usar o formulário e sua fila. Publicação em produção não faz parte desta alteração.

## Fotografia ilustrativa

Asset: `frontend/public/marketing/restaurant-owner.png`. Criado com a ferramenta integrada `imagegen`; pessoa e estabelecimento fictícios. A logo GX permanece o arquivo fornecido pelo proprietário (`frontend/public/gastronexa-logo.png`).

Prompt utilizado:

> Use case: photorealistic-natural. Asset type: editorial photography for a modern Brazilian restaurant management software landing page, GastroNexa. Create one premium warm natural restaurant photograph, portrait composition 4:5, high resolution, no writing or logos. A friendly Brazilian woman restaurant owner around 35, curly dark hair tied loosely back, olive green linen apron over a cream tee, looking down at a slim tablet on a natural oak counter with a quiet genuine smile. Candid relaxed moment during restaurant service, realistic hands, uncluttered modern neighborhood restaurant with warm oak, muted sage green tile, a small ceramic vase and soft green plants. Warm window daylight, tasteful cozy interior, authentic editorial photography, rich natural textures, subtle film grain, physically realistic tones. Subject upper half center-right; foreground wood counter lower third has some empty space for a UI overlay which will be added in code. A softly blurred colleague in background if composition needs depth. Medium camera framing, slight off-center, not a headshot. No fake text, no watermarks, no interface, no charts, no graphic overlays, no borders, no split panels. The image is a fictional illustrative scene, not a real customer testimonial.
