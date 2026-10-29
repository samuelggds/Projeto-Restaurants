# Atendimento presencial: QR Code, NFC e comandas individuais

## Registro de decisões — 29/10/2026

Estado: **etapa 1 incorporada ao main**; etapa 2 de cadastro NFC em PR rascunho.
A opção de pedidos NFC continua desabilitada até homologação completa.
Este documento é o registro contínuo das regras acordadas. Alterações posteriores
devem acrescentar decisões e testes em PRs pequenos, sem alterar as regras existentes
sem uma decisão explícita.

### Regras de produto

1. O administrador de cada restaurante poderá escolher `QR_ONLY`, `NFC_ONLY` ou
   `BOTH`. O padrão de compatibilidade de restaurantes atuais é `QR_ONLY`.
2. QR de mesa e NFC de cliente são experiências diferentes. O QR aponta para a
   **mesa**; o NFC identifica um **cartão individual** associado a um cliente.
3. A ativação do cartão será executada por atendente, garçom ou admin autorizado,
   com identificação de cliente única por restaurante, nome, CPF e telefone.
   O número de mesa é **opcional e pertence à visita**, não ao cliente definitivo.
4. O cartão poderá ser revogado e substituído sem apagar o cliente ou histórico.
   Nenhum dado pessoal (nome, CPF ou telefone) ficará gravado no chip NFC.
5. Cada visita abre uma nova **comanda individual** e mantém seu próprio histórico.
   Os pedidos subsequentes usam a mesma comanda até seu encerramento.
6. O administrador poderá definir cobrança de entrada/couvert, pacotes e crédito
   de consumação. Taxa e crédito são itens contábeis distintos. Uma cobrança
   aplicada à mesma visita não pode ser duplicada por reler o cartão.
7. Em `BOTH`, a integração entre pedidos QR e NFC deve impedir dupla cobrança
   e assegurar associação explícita entre participantes, mesas e comandas.
8. Mudanças de modalidade não cancelam sessões, pagamentos nem pedidos em aberto.
   O encerramento segue as regras atuais de liquidação e auditoria.
9. Toda leitura NFC e mutação exige funcionário autenticado, `restaurantId`
   resolvido a partir da sessão, autorização por operação e contexto tenant.
   O identificador do cartão não funciona como credencial de autorização.
10. Preços e saldo calculados no backend, com idempotência, transações,
    proteção contra concorrência, auditoria, controle de estoque e notificações
    da cozinha somente após confirmação da gravação.
11. CPF, telefone e demais dados pessoais serão tratados segundo finalidade,
    minimização, retenção, acesso por perfil e LGPD. O cadastro deve evitar
    duplicidades e impedir consulta cruzada entre restaurantes.

### Etapas e limites de ativação

**Etapa 1 — este PR:** migração aditiva da preferência de atendimento, ciclo de
leitura e salvamento no Admin, três opções visíveis e testes. A API rejeita
`NFC_ONLY` e `BOTH` deliberadamente enquanto o módulo não está operacional,
e a UI exibe essas opções como indisponíveis. O QR permanece ativo e todos os
demais toggles preexistentes continuam funcionando.

**Etapa 2:** cadastro de cliente e cartão NFC tenant-scoped; UID/chave aleatória,
revogação, reemissão, controles de CPF e PII, trilha de auditoria.

**Etapa 3:** sessão de consumo individual com `tableId` anulável e
identidade separada de `TableSession`; saldo, abertura/fechamento, leituras,
pedidos da equipe, impressão e tempo real, preservando serviços canônicos.

**Etapa 4:** configuração e lançamento idempotente de couvert e crédito
pré-pago, conciliação de Pix/cartão/dinheiro, bloqueio de fechamento com
pendências e relatórios.

**Etapa 5:** permitir `NFC_ONLY` e `BOTH` depois de testes reais de
Android NFC, fallback QR para iPhone, controle de concorrência,
multi-tenancy, E2E e homologação financeira. A partir daqui o backend
passa a verificar a preferência nas operações de **nova abertura**, mas
mantém o direito de concluir atendimentos anteriores.

### Evidências exigidas antes da liberação NFC

- Casos de CPF repetido dentro do mesmo restaurante e CPF igual entre tenants.
- Cartão inválido, extraviado, revogado, já em uso e tentativa de outro tenant.
- Duas leituras simultâneas, duas aberturas e repetição do mesmo pedido.
- Múltiplos funcionários adicionando itens na mesma comanda.
- Couvert único por comanda, valores configurados e mudança posterior de tarifa.
- Mesa `null`, associação e transferência de mesa.
- Troca de modalidade com atendimentos e pagamentos pendentes.
- Fluxos QR existentes, WebKit/Chromium, backend E2E e CI sem redução de rigor.


### Etapa 2 — cadastro seguro de clientes e cartões (PR incremental)

- Um cadastro NFC pertence ao `restaurantId` autenticado e tem UUID público próprio,
  separado de `User` (cliente delivery) e de qualquer comanda.
- CPF é validado e único por restaurante; cliente não precisa fornecer e-mail/senha.
- Nome, CPF e telefone são dados pessoais criptografados no banco; deduplicação
  do CPF usa HMAC com segredo do servidor e escopo tenant, nunca CPF em claro.
- Cartões são emitidos como `PENDING_WRITE`, recebem token aleatório de alta
  entropia, guardado no banco **somente como hash**. O token de programação é
  devolvido uma única vez após emissão.
- A equipe autorizada grava no cartão um URL NDEF com esse token, confirma a
  programação e o cartão passa a `ACTIVE`. Uma falha de gravação não ativa o
  cartão. Tags clonadas continuam sem privilégio de funcionário.
- Um cliente pode ter apenas um cartão pendente/ativo por vez; revogação e
  reemissão não apagam cliente e histórico. Eventos auditáveis por funcionário.
- Somente ADMIN, GARCOM e ATENDENTE autenticados têm acesso às operações NFC.
  COZINHA, MOTOQUEIRO, CLIENTE e SUPER_ADMIN não entram por essas rotas.
- Mesa opcional será registrada na **sessão da visita** (etapa 3), não no cadastro
  permanente, para evitar relacionamentos incorretos.
- Nenhuma alteração de `inPersonServiceMode` ou abertura de comanda é liberada
  por este PR. Permanecem bloqueadas NFC_ONLY e BOTH até a homologação.

### Implementação incremental na branch do PR #396 (ainda não homologada)

- Modelos `NfcCustomer`, `NfcCard` e `NfcRegistrationAudit` criados com
  vínculos compostos de tenant, CPF derivado por HMAC e campos pessoais AES-GCM.
- Rotas `/nfc-registration/customers` (GET/POST), `/customers/lookup` (POST),
  `/customers/:id/cards` (POST) e `/cards/:id/revoke` (POST).
- A API nunca recebe `restaurantId` de formulário: deriva da sessão autenticada.
- Painéis de Admin, Garçom e Atendente exibem cadastro e gestão de cartões.
- O primeiro cartão fica `PENDING_WRITE`. Emitir não confirma a gravação.
  A URL de gravação não é ainda uma página funcional e não autentica funcionário.
- A numeração da mesa não integra o perfil do cliente: entrará com as sessões.
- Ainda pendente: testes de banco multi-tenant reais, geração de Prisma Client,
  revisão de segurança/arquitetura, programação e ativação NDEF, E2E e CI.


### Regra de liquidação, bloqueio por inadimplência e reuso físico de cartões — 29/10/2026

**Decisão funcional aprovada:** dívida é do **cliente NFC dentro de um restaurante**,
e não do cartão nem da mesa. Nenhuma dívida será transferida ao próximo
portador de um cartão físico.

1. `OPEN`: a comanda atual pode receber pedidos enquanto a sessão estiver
   autorizada. O saldo em aberto da **mesma visita** não gera bloqueio imediato.
2. `UNPAID`: se o cliente deixa de pagar, o encerramento registra o saldo
   pendente e bloqueia **novas sessões e novos pedidos** desse cliente naquele
   restaurante. Bloqueio consultado no backend, independentemente do cartão.
3. `PAYMENT_PENDING`: pagamento iniciado, mas ainda não confirmado pelo
   gateway, **não desbloqueia** o cliente. Somente evidência de liquidação
   confirmada pelo provedor ou por operador autorizado para dinheiro libera.
4. `PAID`: quando o saldo devido chega a zero por pagamentos definitivamente
   confirmados, o registro histórico é marcado como pago e a verificação de
   bloqueio é refeita. Se ainda existir **qualquer outra comanda inadimplente**
   desse cliente no mesmo restaurante, o bloqueio continua.
5. Pagamento parcial reduz a dívida na contabilidade, sem alterar para
   `PAID` ou liberar novas compras. Estorno ou contestação pode reabrir
   pendência e reativar o bloqueio conforme o saldo efetivamente devido.
6. A liberação automática **não é uma alteração de flag por pedido HTTP**:
   deve ser resultado de conciliação atômica do ledger de pagamentos. Registrar
   chave de idempotência única por restaurante, sessão e evento externo;
   duplicatas de webhook, duplo clique e confirmações simultâneas não podem
   contabilizar pagamento duas vezes.
7. Ao devolver o cartão físico, a associação e o token NFC da visita anterior
   devem ser **revogados** antes de reprogramar/reemitir outro identificador
   aleatório e vincular a outro cliente. Uma comanda em aberto, dispositivo
   extraviado ou gravação não confirmada impede reuso automático. O débito
   não é apagado e nunca é associado ao próximo usuário do plástico.
8. A tentativa de **abrir nova comanda** deve verificar o bloqueio **na
   mesma transação**, com trava ou operação atômica sobre o cliente e as
   comandas pendentes, impedindo duas aberturas concorrentes. O mesmo vale
   para o fechamento, reatribuição do cartão e liquidação.
9. A regra é sempre escopada a `restaurantId` derivado do usuário autenticado:
   não existe blacklist global. Dados de outro restaurante não podem vazar nem
   influenciar o bloqueio. No modo `BOTH`, só é possível aplicar essa regra a
   QR Code e demais canais quando houver identificação confiável do **mesmo
   cliente**; acesso anônimo não pode ser bloqueado por mera posse de cartão.
10. Proibir exclusão de dívida como forma de liberar; ajustes legítimos,
    estornos, renegociações e cancelamentos exigem autorização, justificativa
    e trilha imutável. Não depender de texto exibido no frontend para autorizar.
11. O bloqueio persiste até a dívida ser regularizada, sem um prazo arbitrário,
    mas deve mostrar ao funcionário o valor pendente e um caminho para quitação.
    Nenhum NFC ou cartão físico constitui autorização para cobrar ou alterar
    valores sem validação do backend.

**Critérios de teste da etapa de comandas:** cliente A inadimplente não pode
abrir comanda no mesmo restaurante, mas pode em restaurante B; novo portador do
cartão de A não herda a dívida; pagar parcial mantém bloqueio; pagar integral
libera somente se todas as dívidas foram quitadas; pagamentos simultâneos e
webhooks duplicados não geram crédito duplicado; devolução/estorno restabelece
pendência; troca ou perda de cartão não muda o débito; duas aberturas concorrentes
não podem contornar o bloqueio.

**Estado atual:** essa regra foi registrada para a etapa 3/4. O PR #396 ainda
não implementa sessões financeiras NFC, pagamentos, liberação automática ou
movimentação de estoque NFC. Essas operações permanecerão desabilitadas até
o fluxo contábil completo, a reconciliação e os E2E de segurança.

### Prazo automático de quitação — 29/10/2026

- A primeira versão usa **24 horas corridas a partir da abertura da comanda**.
  `dueAt` fica persistido no banco como timestamp UTC, não depende da hora do
  celular ou da aba aberta. Uma futura configuração por restaurante precisará
  ter migração e critérios de congelamento do prazo por visita.
- Até `dueAt`, a comanda `OPEN` com saldo em aberto **não bloqueia novos itens
  na mesma visita**. O módulo de pedidos NFC, quando habilitado, deverá verificar
  a comanda ativa, mesmo após reload, sem criar outra.
- Assim que `dueAt <= NOW()` e houver saldo pendente, a elegibilidade passa
  a **bloqueada** para novos atendimentos/pedidos NFC do mesmo cliente e tenant,
  mesmo que nenhum operador tenha encerrado a comanda. A verificação é derivada
  da dívida no backend, sem depender de cron, cache ou flag persistida.
- Comanda encerrada antes do prazo sem quitação pode permanecer `UNPAID` e
  continua registrada como devida, mas deve respeitar o prazo original para
  bloquear o cliente. O prazo não é reiniciado por fechamento ou troca de cartão.
- Pagamento parcial não reinicia a contagem e a liberação depende de quitação
  integral confirmada. Nunca considerar pagamento em `PENDING` como liquidado.
- Reutilização do cartão exige revogação do vínculo anterior, sempre mantendo
  dívida e histórico no cliente anterior.
- Critérios: 23h59m com débito ainda liberado; 24h exatas com débito bloqueado;
  quitado antes do vencimento não bloqueia; mesmo CPF em outro restaurante não
  é afetado; tentativas simultâneas não contornam a verificação transacional.

**Atenção:** a abertura de uma **nova** comanda continua proibida quando já
existe outra `OPEN`, mesmo antes do vencimento. O cliente deve **continuar na
mesma comanda** para consumir. Lançamento de produtos e integração de pagamento
digital NFC ainda não foram habilitados neste PR.


### Opção por fechamento do estabelecimento — PR #396

- O ADMIN escolhe em Configurações > Cardápio de mesa:
  `TWENTY_FOUR_HOURS` (padrão legado) ou `BUSINESS_CLOSING`.
- `BUSINESS_CLOSING` usa a agenda semanal já cadastrada em
  `RestaurantSettings.businessHours` e o fuso `RestaurantSettings.timezone`.
  Ex.: quinta-feira, 18h–02h => abertura quinta às 22h vence sexta às 02h.
- `dueAt` é calculado no backend quando a comanda abre e gravado como data UTC.
  Trocar a agenda depois **não altera contas abertas** nem renova o prazo.
- Exige agenda semanal configurada e pelo menos um dia habilitado;
  se uma visita tentar iniciar fora de um turno válido, a abertura falha
  sem gravar novos dados ou inventar o fechamento. A opção de 24h segue
  como alternativa compatível com restaurantes sem agenda configurada.
- O bloqueio de novos atendimentos por saldo pendente é derivado de
  `status IN (OPEN,UNPAID)`, `dueAt <= agora` e saldo positivo,
  sempre dentro do `restaurantId` autenticado. Dívida de outro tenant
  não influencia a elegibilidade.
- O prazo é de **fechamento do turno em que a visita começou**, não do
  próximo dia aberto, não do fechamento manual/pausa de pedidos.
- Pedidos NFC e pagamentos online continuam fechados até homologação
  e integração dos testes E2E; esta regra não altera as mesas QR existentes.

Testes adicionais: turno com fechamento no mesmo dia; turno atravessando
meia-noite; horário fora de expediente; agenda não configurada; 24h como
padrão; isolamento por tenant e concorrência na abertura de comandas.


### Fluxo de entrada do cliente e vínculo por NFC

1. O garçom, atendente ou ADMIN autenticado recebe o cliente e lhe entrega um
   cartão NTAG213/216 gravável. Se o cliente ainda não existir neste restaurante,
   registra nome, CPF válido e telefone; caso exista, localiza pelo CPF.
2. O colaborador emite um identificador aleatório em estado `PENDING_WRITE`.
   Nome, CPF e telefone ficam criptografados no banco, nunca no chip.
3. Em um Android compatível, Chrome e HTTPS, o colaborador grava no NFC um
   identificador URL NDEF. Uma **nova leitura** do mesmo cartão deve retornar
   exatamente o token recém-emitido para autorizar a ativação no backend.
4. A API `POST /nfc-registration/cards/:id/activate` compara o hash do token,
   exige o mesmo `restaurantId`, estado `PENDING_WRITE`, efetua a transição
   atômica para `ACTIVE` e grava auditoria do operador. Tentativas duplicadas
   não criam novo cartão.
5. A leitura `POST /nfc-registration/cards/resolve` permite identificar apenas
   cartões `ACTIVE` do próprio restaurante. Uma URL NDEF não autoriza nenhuma
   mutação sem autenticação/RBAC.
6. Cartões revogados são rejeitados; uma reutilização exige um novo token,
   outra programação e nova confirmação física, sem transferir débito/histórico.
7. Navegadores que não ofereçam Web NFC exibem uma mensagem de
   incompatibilidade, nunca ativam um cartão automaticamente.
8. Ativação física não implica abertura de comanda, pedido, baixa de estoque
   ou pagamento. Esses processos exigem fluxo próprio e homologação.

**Validação pendente:** testes E2E com aparelhos Android físicos e cartões
regraváveis, verificação de NFC clonado e rate limit contra enumeração.

### Correção do fluxo de recepção — leitura antes do cadastro

- O colaborador autenticado (ADMIN, GARCOM ou ATENDENTE) **primeiro aproxima
  um cartão preparado** do aparelho, e o sistema abre a tela de recepção.
- O formulário deve mostrar **nome, CPF, telefone, mesa opcional**, e verificar
  CPF já existente dentro do mesmo `restaurantId` antes de criar duplicata.
- O vínculo do cartão físico com o cliente deve acontecer como parte da
  conclusão da recepção. A mesa pertence à visita/`NfcComanda`, **não** ao
  cadastro permanente de `NfcCustomer`.
- Cartão **virgem** (NTAG213/216 sem NDEF) não abre página ao ser aproximado:
  exige etapa anterior de **provisionamento do cartão do restaurante**, que
  grava um token/URL aleatório sem dados pessoais, e mantém o cartão em estoque
  não associado até a recepção. Nenhuma leitura de UID sozinha é autenticação.
- **Android**: o navegador compatível com Web NFC, numa tela já aberta em
  HTTPS, pode ler o token; a leitura só deve continuar com funcionário
  autenticado. **iPhone/iOS**: tags NFC com URL NDEF podem abrir uma página
  via leitura do sistema, mas Safari não oferece Web NFC; o app web não pode
  exigir leitura/gravação programática no iOS. Para identificação e vínculo
  seguros, usar URL assinada com atendimento autenticado, QR impresso ou
  leitor/app nativo, conforme homologação.
- Cliente já cadastrado: localizar, verificar débitos e reutilizar o cadastro
  histórico; não recriar a identidade nem transferir dívida.
- Cliente novo: cadastrar e vincular cartão ao tenant numa transação única,
  auditada, verificando token pré-provisionado e estado livre. Duas leituras ou
  duas tentativas simultâneas não podem associar o mesmo cartão a duas pessoas.
- Um cartão deve voltar ao estoque **somente depois de desassociado com
  autorização**; vínculos e tokens antigos são revogados e históricos
  financeiros permanecem no cliente anterior.
- O fluxo atual do PR #396 ainda é `cadastro -> emissão -> gravação`, **não
  representa a recepção final desejada**. Precisamos implementar os cartões
  pré-provisionados, a UI de recepção e o vínculo atômico antes de afirmar que
  a aproximação inicial funciona nos dois sistemas.
