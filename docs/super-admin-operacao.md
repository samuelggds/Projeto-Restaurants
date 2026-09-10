# Operação do SUPER_ADMIN

A visão geral reúne pendências de suporte, cobranças, períodos de teste e acessos. Os filtros mostram cinco casos por página e cada botão **Revisar** abre o diálogo já usado na área correspondente.

## O que aparece na fila

- Suporte: conversas com status `OPEN`, aguardando a equipe da plataforma.
- Cobranças: faturas com status `OVERDUE` informado pela API. A data de vencimento, sozinha, não altera o status nem as regras de tolerância.
- Períodos de teste: restaurantes ativos com assinatura `TESTE` cuja data de término já passou ou ocorrerá nos próximos sete dias. A fila orienta a revisão do ciclo; não expira nem renova assinaturas automaticamente.
- Acessos: administradores ativos com troca de senha pendente ou sem MFA efetivo. O MFA imposto pela política do backend conta como proteção, mesmo sem ativação individual.

A ordenação é por tipo e, dentro de cada tipo, pelas datas mais antigas. Resolver uma conversa não fecha o diálogo: ele é identificado pelo restaurante, independentemente da última mensagem.

## Busca rápida

**Buscar no painel**, ou **Ctrl+K / ⌘K**, encontra restaurantes, administradores, faturas e suporte por nomes, e-mails, referências e IDs. Aceita termos combinados e ignora diferenças de acentuação. Exibe até 12 resultados e informa o total encontrado para orientar o refinamento. O atalho não abre outra janela enquanto um diálogo já estiver aberto.

## Alcance e atualização

Busca e fila usam o snapshot carregado do dashboard. A API atual retorna todos os restaurantes e administradores, até 200 faturas e até 100 conversas recentes. Portanto, o estado vazio não comprova ausência de pendências em todo o histórico. Contatos comerciais continuam com a busca e paginação próprias da sua área.

Os indicadores financeiros mantêm os agregados globais da API. **Atualizar pendências** busca um novo snapshot; o horário mostrado muda somente após uma resposta válida. Em uma falha, a tela conserva os dados anteriores e apresenta o aviso de desatualização.

As ações de bloqueio, assinatura, cobrança e suporte continuam nos diálogos existentes, com suas confirmações, justificativas, validações e permissões. A busca não persiste consultas nem faz requisições adicionais.

## Verificação

Os testes de domínio cobrem status financeiros, política de MFA, limites de data, agrupamento, ordenação, busca e limites de resultados. As jornadas Playwright em `frontend/e2e/super-admin-platform.spec.ts` verificam filtros, paginação, os quatro destinos, teclado, retorno de foco, atualização com falha e telas de 320, 900 e 1440 pixels.
