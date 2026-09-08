# Auditoria do projeto Restaurantes — 08/09/2026

Referência analisada: commit `7e27903` — `Improve admin payment and operational messaging`.

**Parecer: o projeto tem uma boa base técnica e funcional. Vale continuar sua evolução. As prioridades atuais são concluir a integração da paginação e corrigir estados de pagamentos antes de ampliar a operação. Uma reescrita não se justifica pelos problemas encontrados.**

Esta varredura não alterou o código de produção. Foram produzidos relatórios, capturas e probes isolados. A ausência de chaves de WhatsApp, e-mail e gateways não foi classificada como defeito. As lacunas funcionais dessas integrações foram avaliadas separadamente.

## Alcance e limites

Inventário dos três projetos: **1.460 arquivos de código, estilos e testes; 243.219 linhas; 395 arquivos de testes** nas raízes de código. Banco: **61 models Prisma e 103 diretórios de migrations**. Frontend: 26 arquivos Playwright, com 108 casos descobertos.

A revisão combinou inventário, buscas transversais, leitura dos fluxos críticos e configurações, suítes automatizadas, PostgreSQL descartável e inspeção visual do cardápio local em desktop e celular. Isso não significa leitura manual de todas as linhas nem comprovação de todas as combinações de telas, permissões e provedores.

Não foram executadas cobranças reais, restauração de backup, impressão física, carga representativa de produção ou validação de uma instalação completa atrás do Caddy em HTTPS. A ativação remota da proteção da branch `main` não foi comprovada.

Evidências: [inventário](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-inventario.json>) e [análise detalhada de confiabilidade](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-confiabilidade.md>). Este relatório consolida também testes mais recentes que o relatório auxiliar.

## O que já está muito bom

| Área | Evidência e avaliação |
| --- | --- |
| Isolamento entre restaurantes | Autorização e filtros por restaurante, salas Socket.IO e contexto RLS local à transação. Os testes reais verificaram leitura, escrita, HTTP, sockets e concorrência de contextos no pool. É uma proteção em camadas; RLS ainda cobre um conjunto deliberadamente parcial de tabelas. |
| Criação de pedidos | Preços e regras calculados no servidor, baixa condicional de estoque, reserva de cupom, transação serializável, chave persistente de idempotência por restaurante/ator e retry limitado de conflitos. Eventos de criação são publicados após o commit. |
| Banco e models | FKs compostas em sessão/participante/conta da mesa, unicidade de sessão ativa e de referências de pagamento, checks monetários e alocações em centavos. A estrutura já expressa regras importantes no banco. |
| Credenciais e execução | Separação entre migração e runtime, provisionamento de role sem superuser/BYPASSRLS/ownership, allowlist de variáveis dos processos e criptografia AES-256-GCM de credenciais de restaurantes, com contexto por campo/restaurante e suporte a chave anterior. |
| Webhooks e autenticação | Há validação de assinatura do Mercado Pago, proteção quando falta segredo e testes de entradas inválidas. Refresh token em cookie HttpOnly/Secure em produção, rotação e invalidação por versão de autenticação. Recuperação usa código aleatório com hash, expiração, cooldown e resposta genérica para não revelar cadastro. |
| Produto e interface | Identidade visual consistente, cardápio rico, personalização de produtos, checkout como visitante e interfaces específicas para administração, cozinha, atendimento, garçom e entregador. Os estados de carregamento, erro e vazio da cozinha passaram nos cenários executados. |
| Componentes e frontend | Rotas divididas em chunks, orçamento de bundle, opções de pagamento com estado de disponibilidade e `aria-pressed`; diálogos centrais com tratamento de foco, Escape e retorno ao elemento anterior. |
| Impressão e jobs | Fila persistente de impressão e testes de falha/reconhecimento. Jobs com lease PostgreSQL, relógio do banco, fencing token e desligamento controlado. A documentação reconhece que efeitos ainda precisam ser idempotentes. |
| Engenharia | Testes numerosos e rápidos de domínio, harness de banco descartável, lint/typecheck/build, verificação de arquitetura e catálogo de scripts que distingue operações guardadas de ferramentas legadas. |

## Prioridades confirmadas

P1 significa corrigir antes de depender do fluxo em operação. P2 significa melhoria relevante de robustez, clareza ou manutenção. A evidência é indicada para separar defeitos reproduzidos de riscos encontrados por leitura.

### 1. P1 — a paginação está pronta no backend, mas vários consumidores ainda tratam uma página como o conjunto completo

A API limita a resposta a 50 pedidos por padrão, com máximo de 100. A central nova de pedidos tem paginação própria, mas a carga geral do admin, indicadores/clientes, cozinha, garçom, entregador, atendimento e histórico do cliente ainda têm caminhos que consomem apenas uma página. O helper antigo descarta os metadados.

**Reprodução com API e PostgreSQL reais:** foram cadastrados 61 pedidos no tenant de teste. A página retornou 50. O cálculo usado pelo frontend indicou **R$ 500**, enquanto a agregação completa indicou **R$ 625**. A primeira página indicou **zero pedidos em preparo**, embora existisse **um na página seguinte**. Cursor sem repetição e rejeição de limite 101 também foram verificados.

Consequência: indicadores incompletos, histórico truncado e risco de pedidos ativos ficarem fora da fila. Os endpoints de relatórios já existem, mas não foram encontrados consumidores frontend deles.

Correção: conectar indicadores/clientes aos agregados; filtrar filas ativas no servidor; implementar navegação do histórico em cada consumidor. Aumentar o limite não resolve o contrato.

Referências: [limites da consulta](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/domain/orderListQuery.ts:28>), [helper que perde os metadados](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/Services/ordersService.ts:198>), [carga do admin](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/admin/Admin.tsx:574>), [indicadores](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/admin/components/AdminOverview.tsx:85>) e [prova executada](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-pagination-repro.log>).

### 2. P1 — um erro ambíguo ao iniciar o pagamento pode excluir um pedido já confirmado

O controller PIX limpa o pedido após uma exceção de criação no gateway. A limpeza restitui estoque e exclui o registro sem exigir que continue pendente e não pago. O cartão tem caminho equivalente.

Se o provedor aceitou a cobrança e a resposta falhou, um webhook pode ter confirmado o pagamento antes da limpeza. **A chamada do serviço real, com repositório e Prisma simulados, comprovou que um pedido `paid: true`, `PREPARANDO` ainda é excluído.** Não foi feita corrida contra gateway real.

Correção: preservar pedido e intenção em respostas ambíguas, usar chave estável no provedor, conciliar e realizar transições condicionais. Uma checagem fora da transação não elimina a corrida.

Referências: [tratamento da falha PIX](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/controllers/CreateOrderPixPaymentController.ts:87>), [limpeza](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/OrderPixPaymentService.ts:1049>), [cartão](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/CreateOrderCardCheckoutService.ts:85>) e reprodução no relatório de confiabilidade.

### 3. P1 — cancelamento e estorno da conta da mesa ainda têm caminhos incompletos para gateways reais

O cancelamento usa provider fake por padrão, cancela localmente e somente tenta cancelar remotamente se o código do provider coincidir. Para uma intenção real, pode responder sem pendência de cancelamento enquanto a cobrança continua disponível no gateway. O estorno também usa o fake por padrão; o adapter configurado ainda lança erro para cancelar/estornar.

Isso afeta também a recuperação de pagamentos que chegam após cancelamento. **É uma lacuna no código, independente das chaves.** Não confundir com o estorno de pedidos individuais, que tem implementação própria.

Correção: resolver o provider da intenção, implementar cancelamento/estorno e conciliação idempotentes, ou registrar e mostrar corretamente a necessidade de ação manual enquanto o provedor não suporta a operação.

Referências: [cancelamento](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/tableAccount/services/CancelTablePaymentIntentService.ts:111>), [estorno](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/tableAccount/services/RefundTablePaymentService.ts:23>) e [operações ainda indisponíveis](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/tableAccount/providers/ConfiguredTablePaymentProvider.ts:511>).

### 4. P1 — o pagamento na retirada aceita estados inválidos e pode ficar sem retomada

Foram reproduzidos, com o serviço real e dependências simuladas, dois problemas:

- Confirmar dinheiro em um pedido `CANCELADO` mantém esse status e grava `paid: true`.
- Um timeout na criação do PIX deixa o registro local sem cobrança/código PIX. Uma nova tentativa retorna esse mesmo registro e não retoma a criação: o provider foi chamado uma única vez em duas tentativas.

A confirmação também atualiza pelo ID, sem condicioná-la ao estado não pago; isso merece teste de concorrência com confirmações online/manuais.

Correção: definir transições permitidas, impedir confirmação de cancelados, usar atualização condicional e tornar a tentativa externa recuperável. Alterar a forma de pagamento deve tratar a cobrança anterior ainda pendente.

Referências: [PickupPaymentService](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/pickupPayments/services/PickupPaymentService.ts:42>), [confirmação](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/pickupPayments/services/PickupPaymentService.ts:166>) e [duas reproduções](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-pickup-repro.log>).

### 5. P2 — recuperar pelo telefone atualmente significa identificar pelo telefone e enviar por e-mail

O serviço procura o usuário pelo telefone, mas envia o código para `user.email` usando SMTP. Não foi encontrado envio de recuperação por SMS ou WhatsApp nesse fluxo. A interface oferece e-mail/telefone sem explicar essa diferença.

Se o objetivo é receber no celular, falta implementação do canal, além das credenciais. Se o telefone deve ser apenas um identificador, basta tornar a comunicação explícita, preservando a resposta genérica contra enumeração de contas.

Referências: [busca por telefone](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/auth/services/RequestPasswordResetService.ts:89>), [destino do código](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/auth/services/RequestPasswordResetService.ts:147>) e [texto da interface](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/RecoverPassword/RecoverPassword.tsx:206>).

### 6. P2 — notificações WhatsApp existem, mas a entrega ainda precisa de mais confiabilidade

As notificações de pagamento/status consultam `whatsappEnabled` e `receiveStatusNotifications`. **Essas opções estão ligadas ao comportamento do backend.** Há webhook de saída com token; não é apenas uma tela de configurações.

O envio usa `fetch` sem timeout explícito nesse trecho, e falhas retornam `send_failed` após log, sem fila/retry durável nessa camada. Confirmações concorrentes podem também repetir mensagens: a proteção da escrita não informa aos serviços qual chamada realizou a mudança.

Correção: separar a confirmação do pedido da entrega da mensagem, persistir evento deduplicado, aplicar timeout/retry e registrar resultado. Especificar se notificações administrativas de PIN/problema seguem a chave geral do WhatsApp; atualmente essas duas funções não consultam as preferências do cliente. A opção legada `receiveOrdersOnWhatsapp` aparece em configurações, mas não foi identificada como gatilho de envio automático de novos pedidos ao restaurante; confirmar o significado desejado antes de prometer essa função.

Referências: [preferências](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/services/customerNotifier.ts:72>), [envio](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/services/customerNotifier.ts:190>) e [efeitos depois de confirmar pagamento](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/FinalizeOrderPixPaymentService.ts:145>).

### 7. P2 — elementos flutuantes competem com a navegação no celular

Na captura atual de 390 × 844, aviso de login, ajuda, fidelidade e botão WhatsApp ocupam a mesma região inferior e cobrem partes do conteúdo/controles. Não houve overflow horizontal nessa viewport, mas isso não elimina a sobreposição.

Correção: coordenar essas ações em uma entrada recolhível, reservar espaço para ações fixas e mostrar convites no momento adequado. Testar também teclado virtual, zoom e sacola aberta.

A marca, hierarquia e apresentação dos produtos estão boas. O ajuste é principalmente de ocupação de espaço e foco da jornada.

Evidências: [cardápio desktop](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-home-desktop.png>) e [cardápio mobile atual](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-home-mobile.png>).

### 8. P2 — E2Es precisam acompanhar os contratos e as rotas atuais

A execução isolada selecionou 20 casos: **4 passaram, 5 falharam e 11 não chegaram a executar**, com interrupção no limite de falhas. Depois de registrar os resultados, o runner permaneceu no encerramento e foi interrompido.

As quatro jornadas da cozinha passaram. Nos testes de admin, o mock retorna somente `orders`, mas o cliente atual exige também `summary`; há ainda expectativa de título antigo. Nos testes de login, a rota sem restaurante leva ao estado “Restaurante não informado”. Esses erros não demonstram, por si só, falha do layout atual.

Correção: atualizar mocks/rotas para o contrato real, usar servidor isolado e manter ao menos uma jornada completa com frontend, API e banco reais. Testes de componente aprovados não detectaram a integração incompleta da paginação.

Referências: [fixture do admin](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/e2e/admin-orders-refund.spec.ts:94>), [rota do teste de login](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/e2e/login-mobile-responsive.spec.ts:78>) e [execução isolada](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-browser-isolado.log>).

## Outros ajustes relevantes

| Prioridade/área | Problema ou limite | Ação recomendada |
| --- | --- | --- |
| P2 — estoque | Restituir estoque grava `active: true`, podendo recolocar à venda um produto desativado manualmente. | Separar disponibilidade manual de falta de estoque; testar cancelamento depois de bloqueio pelo admin. [Código](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/restoreOrderItemsStock.ts:35>). |
| P2 — respostas e eventos | Listagem/criação já filtram metadados, mas detalhes e alguns eventos ainda devolvem escalares internos, incluindo campos de idempotência e PIN armazenado. O PIN atual é HMAC; não foi demonstrado acesso ao código original. | DTOs explícitos por público em todas as fronteiras HTTP/Socket. [Detalhes](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/controllers/GetOrderByIdController.ts:19>). |
| P2 — login Google no deploy | A CSP do Caddy permite apenas scripts locais, mas a tela carrega Google Identity Services. Chaves válidas não resolvem esse bloqueio. | Permitir as origens necessárias de script/frame/connect/style e testar através do proxy. [CSP](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/deploy/Caddyfile:10>) e [script](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/Login/Login.tsx:152>). A documentação oficial especifica essas diretivas: [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). |
| P2 — indicadores | Algumas consultas somam pedidos sem separar recebimento, cancelamento e estorno. | Definir semanticamente pedidos, vendas concluídas, recebimentos e reembolsos; alinhar filtros, datas e rótulos. [Clientes](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/repositories/OrderCustomerRepository.ts:21>). |
| P2 — concorrência | O retry de conflito serializável foi encontrado na criação de pedidos, mas não em todos os fluxos de conta da mesa. | Reaproveitar política limitada apenas quando a operação inteira puder ser repetida com segurança. Não repetir chamadas externas indiscriminadamente. |
| P2 — RLS/cliente global | O caminho de pedidos do cliente sem restaurante usa transação sem contexto tenant e inclui relação sujeita a RLS. Pode omitir thread/filtro de problemas legítimos. | Criar regressão específica. Este ponto é hipótese de consistência ainda não reproduzida, não evidência de acesso cruzado. [Consulta](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/modules/orders/services/PaginatedOrdersService.ts:69>). |
| P2 — acessibilidade | Cards com `role=button` contêm botões de favorito/adicionar. Na tela observada foram encontradas 44 ocorrências dessa estrutura. | Separar semanticamente a ação principal das secundárias e validar teclado/leitor de tela. [Card](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/Home/components/HomeProductCard.tsx:28>). |
| P2 — persistência local | Há gravações diretas em localStorage fora de proteção no carrinho. | Tratar armazenamento bloqueado/cheio, mantendo carrinho em memória e comunicação adequada. É risco identificado por leitura, sem reprodução nesta auditoria. [Carrinho](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/frontend/src/pages/Home/hooks/useCart.ts:95>). |
| P2 — TypeScript | `strict: false` no frontend e backend limita o que o typecheck garante. | Ativar verificações gradualmente por módulo, começando por DTOs, estados de pagamento e contratos de API. |
| P2 — estrutura | Existem arquivos acima de mil linhas e componentes com muita orquestração. O guard de tamanho não comprova separação de responsabilidades. | Extrair por regra/domínio e intenção de interface, preservando transações e contratos; não fragmentar apenas para cumprir contagem. |
| P2 — múltiplas instâncias | O transporte realtime é uma variável local do processo; o próprio README dos jobs reconhece a limitação. | Compartilhar eventos entre réplicas e prever afinidade de sessão se houver long-polling. [Transporte](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/backend/src/realtime/realtimePublisher.ts:10>). Requisitos oficiais: [Socket.IO com múltiplos nós](https://socket.io/docs/v4/using-multiple-nodes/). |
| P3 — manutenção | Nomes/pastas variam entre `Services`, `Home`, `Profile`, `admin`, `kitchen`; há versões antigas de componentes/fluxos. | Padronizar progressivamente; provar ausência de consumidores antes de remover legado. |
| P3 — documentação e artefatos | Há logs e evidências históricas junto do projeto; a descrição do número de E2Es críticos diverge dos scripts atuais. | Manter relatório e comandos reproduzíveis; separar traces/logs gerados, revisar dados antes de versionar e atualizar a documentação. |

## Revisão da estrutura e do banco

A divisão backend por módulos, com controllers, serviços, repositórios, regras de domínio e providers, permite evolução incremental. O frontend combina páginas antigas com módulos mais recentes; padronizar as fronteiras vale mais que mover todas as pastas de uma vez.

Alvos de refatoração incluem `OrderPixPaymentService`, `Home`, `CourierWorkspace`, configurações extensas e os painéis administrativos. Priorizar a separação de estado de pagamento, integração externa, persistência e apresentação. Evitar extrair operações de uma transação para funções que passem a usar Prisma global sem perceber.

Os 61 models refletem um domínio amplo — pedidos, catálogo, mesas, pagamentos, impressão, funcionários, fidelidade, suporte e plataforma. O número de models/migrations não é um defeito por si só. As 103 migrations foram aplicadas no banco descartável usado nos testes. Não há motivo identificado para apagar histórico ou substituir o schema.

O próximo trabalho no banco deve ser orientado por consultas reais: índices compatíveis com tenant/status/cursor, planos de execução e volume representativo; política de retenção para eventos, GPS e mensagens; e definição consistente de valores monetários nos novos fluxos. Nenhuma restauração completa ou análise de desempenho em escala de produção foi comprovada nesta auditoria.

Catálogo, personalização, promoções, suporte, fidelidade, remuneração e administração da plataforma entraram no inventário e na execução das suítes. Não foram exercitadas manualmente todas as suas jornadas. Não atribuir o mesmo grau de evidência de uma reprodução em PostgreSQL a um módulo apenas coberto por testes de unidade.

## Validação executada

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Backend | 963 testes aprovados | [Log](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-backend-tests.log>) |
| Frontend | 834 testes aprovados em 169 arquivos | [Log](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-frontend-tests.log>) |
| Print agent | 15 testes aprovados; sem impressora física | [Log](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-print-tests.log>) |
| HTTP/Socket multi-tenant | 54 testes aprovados com PostgreSQL descartável | [Log](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-tenant-e2e.log>) |
| RLS | 21 testes aprovados com PostgreSQL e role de runtime | [Log](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-rls-e2e.log>) |
| Probe de paginação | 1 teste aprovado que demonstra a divergência entre primeira página e total | [Log](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-pagination-repro.log>) |
| Probe de retirada | 2 cenários problemáticos reproduzidos com dependências simuladas | [Log](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-pickup-repro.log>) |
| Typecheck, lint e build | Aprovados nos três projetos | [Typecheck](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-typecheck.log>), [lint](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-lint.log>) e [build](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-build.log>) |
| Arquitetura e catálogo de scripts | Aprovados | Scripts de verificação do repositório executados |
| Docker Compose de produção | Verificação aprovada com valores fictícios: opções runtime preservadas, segredos administrativos isolados e perfis de roteamento coerentes | [Log](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-compose.log>). Verifica a configuração resolvida; não inicia o stack. |
| Bundle | Orçamento por chunk aprovado; frontend completo soma 752,1 kB gzip entre 77 arquivos | O total de todos os arquivos não equivale ao download inicial. LCP/INP/CLS não foram medidos em produção. |
| Dependências backend/frontend | npm audit: zero vulnerabilidades reportadas nesta consulta | [Backend](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-audit-backend.json>) e [frontend](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-audit-frontend.json>) |
| Dependências print agent | Auditoria online pendente | A comparação offline encontrou 75 versões compartilhadas com os projetos auditados, mas não substitui uma consulta própria. [Comparação](<C:/Users/Samuel/Documents/Codex/RESTAURANT-DELIVERY-MESA/pizza-ia-delivery/artifacts/auditoria-completa-print-offline.json>) |
| Navegador isolado | 4 aprovações, 5 falhas, 11 não executados | Cozinha passou; fixtures/rotas de admin e login precisam atualização. O conjunto de 108 casos não foi aprovado integralmente. |
| Inspeção visual real | Cardápio desktop e mobile | Sem overflow horizontal em 390 px; sobreposição de ações flutuantes confirmada. |

A primeira tentativa de E2E reutilizou um servidor existente e não oferece isolamento confiável. A avaliação acima usa a tentativa posterior em porta própria. Os E2Es de navegador usam mocks de API; os testes PostgreSQL comprovam API/banco/sockets, mas não substituem uma jornada única com as três camadas reais.

A auditoria online do print agent foi recusada pela revisão automática de permissões porque `npm audit` envia metadados da árvore de dependências ao registro npm externo. A revisão do projeto continuou com as demais verificações, sem contornar esse bloqueio.

## Situação das cinco etapas propostas

| Etapa | Já existe/comprovado | Falta para concluir |
| --- | --- | --- |
| 1. Segurança e deploy | Separação de credenciais, runtime restrito, ajustes de ambiente/roteamento, webhook assinado e arquivo de ruleset da main. | Comprovar regra ativa no GitHub; ajustar CSP Google; validar inicialização do stack completo em homologação. |
| 2. Confiabilidade dos pedidos | Idempotência persistente, retry da criação, erros tipados e testes reais de isolamento. | Corrigir exclusão após falha ambígua, estados de retirada, cancelamento/estorno da mesa e efeitos duplicados. |
| 3. Desempenho | Backend paginado, central de pedidos adaptada, limites de resposta, configuração de rate limit corrigida e budget de bundle. | Adaptar todos os consumidores, integrar relatórios e testar filtros/cursor/contagens de ponta a ponta. |
| 4. Organização | Módulos de domínio, providers, transporte realtime desacoplado, jobs e componentes extraídos. | Reduzir responsabilidades dos arquivos grandes, reforçar tipos e remover duplicações comprovadas. É trabalho incremental. |
| 5. Operação e expansão | Harness real de API/banco, filas, leases, saúde/readiness e documentação operacional. | Jornadas completas reais, carga concorrente representativa, restauração de backup, impressão física e realtime entre réplicas. |

## Ordem recomendada e critérios de aceite

1. **Corrigir os pagamentos e a paginação.** Os cenários reproduzidos passam a ser regressões: timeout após aceitação do gateway preserva pedido; cancelado não recebe confirmação; tentativa incompleta retoma/concilia; cancelamento/estorno de mesa refletem o estado remoto; filas e totais funcionam com mais de 100 pedidos.
2. **Atualizar E2Es e contratos.** Cobrir checkout, cozinha, retirada, entrega, conta da mesa e estorno; executar pelo menos uma jornada completa em homologação com frontend, API e PostgreSQL reais.
3. **Concluir integrações e ajustar UX.** Definir o canal real de recuperação por telefone; tornar entrega de WhatsApp observável e recuperável; testar Google através do proxy; eliminar sobreposição das ações móveis e validar teclado/foco.
4. **Refatorar os módulos mais alterados.** Manter regras, transações e DTOs sob testes de comportamento. Adotar tipagem mais rigorosa progressivamente.
5. **Comprovar operação antes de escalar.** Medir concorrência, latência e erros por restaurante; restaurar backup e comparar dados; imprimir em hardware; simular reinício durante trabalho; validar eventos entre duas instâncias.

O objetivo dessa ordem é aproveitar a base que já funciona e remover primeiro os problemas que podem esconder pedidos, perder rastreabilidade de pagamento ou produzir uma informação operacional incorreta.
