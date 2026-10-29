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
