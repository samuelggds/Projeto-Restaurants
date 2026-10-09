# Gestão da integração Lalamove (SUPER_ADMIN)

## Implementado nesta branch; não publicado por este PR
- Fila paginada de solicitações por restaurante; cada linha é buscada por
  `withTenantDbContext(restaurantId)`, respeitando RLS ENABLE/FORCE.
- Revisão autenticada exclusiva do SUPER_ADMIN e usuário ativo, com controle de
  concorrência em `updateMany` usando status e updatedAt.
- Auditoria com ator, restaurante, contexto da requisição, status e código do motivo.
  Não inclui credenciais ou conteúdo livre informado na revisão.
- Motivos são códigos, não texto livre que poderia armazenar chaves ou dados privados.
- O administrador do restaurante visualiza seu status atualizado.
- Contratação de Lalamove, carteiras, credenciais e despachos reais permanecem
  **bloqueados**. Não há aprovação automática, OAuth, chaves de API ou webhook.

## Correções e cobertura de regressão
- Carregamento inicial definido no estado React, sem `setState` síncrono no efeito.
- Consultas canceladas ao desmontar; respostas antigas e conclusões de revisões
  após sair da página não atualizam a interface. Nenhuma mutação é repetida automaticamente.
- Bloqueio imediato por referência evita cliques duplicados antes da renderização.
- Erros exibidos na interface são mensagens locais, não diagnósticos arbitrários da API.
- Erros de domínio usam `statusCode`, compatível com o middleware HTTP existente:
  entrada inválida 400, permissão 403, inexistência 404 e concorrência 409.
- Identificadores e cursores rejeitam arrays, objetos, booleanos e números ambíguos.
- Testes da tela cobrem StrictMode, paginação, cancelamento, falhas, conflitos,
  motivo obrigatório, seleção do restaurante e ausência de opções de ativação.
- Testes do serviço cobrem RBAC, contexto do tenant, paginação limitada, atualização
  atômica, auditoria, DTO e rejeição de credenciais/ativação/transições inválidas.
- O teste com transação simulada verifica propagação de falha de auditoria; não
  substitui as suítes de PostgreSQL/RLS e a homologação ponta a ponta.
- A existência destes testes não implica aprovação: conferir o CI do SHA atual.

## Próximos marcos antes de contratar motoboys
1. Confirmar com a Lalamove o onboarding assistido autorizado e a titularidade da
   conta/carteira de cada restaurante. Não presumir OAuth ou compartilhamento de carteira.
2. Credenciais por tenant, criptografadas, somente backend, com rotação/revogação e
   validação sandbox. O ADMIN não deve inserir chaves técnicas.
3. Modelo de reservas/cotações por tenant com RLS, aprovação explícita do valor,
   expiração, idempotência e bolsa térmica obrigatória, sem fallback silencioso.
4. Contratação, rastreamento e cancelamento com webhook autenticado conforme o
   contrato do provedor; deduplicação, eventos fora de ordem e reconciliação financeira.
5. Testes unitários, integração e E2E dos fluxos completos, mantendo os motoboys
   próprios e Mercado Pago intactos. Homologação e autorização explícita antes do uso real.

Sem merge/deploy antes do CI completo, revisão de segurança e autorização do responsável.
