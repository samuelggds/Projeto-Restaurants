# Atendimento presencial: QR Code, NFC e comandas individuais

## Registro de decisões — 29/10/2026

Estado: **etapa 1 em implementação**, com liberação operacional somente do QR Code.
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
