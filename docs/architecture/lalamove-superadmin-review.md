# Gestão da integração Lalamove (SUPER_ADMIN)

## Liberado nesta branch
- Fila paginada de solicitações por restaurante; cada linha é buscada por
  `withTenantDbContext(restaurantId)`, respeitando RLS ENABLE/FORCE.
- Revisão autenticada exclusiva do SUPER_ADMIN e usuário ativo, com controle de
  concorrência em `updateMany` usando status e updatedAt.
- Auditoria contendo somente identificadores, status e código predefinido do motivo.
- Motivos são códigos, não texto livre que poderia armazenar chaves ou dados privados.
- O administrador do restaurante visualiza seu status atualizado.
- Contratação de Lalamove, carteiras, credenciais e despachos reais permanecem
  **bloqueados**. Não há aprovação automática, OAuth, chaves de API ou webhook.
- Testes negativos para status CONNECTED/ACTIVE, envio de credenciais e mudanças
  de estado ilegais.

## Próximo ciclo técnico antes de contratar motoboys
- Acordo com Lalamove para onboarding assistido e conta de cada restaurante.
- Verificação de credenciais criptografadas e autorização de serviços food (bolsa térmica).
- Modelo de reservas externo com RLS, cotação aprovada, idempotência e reconciliação.
- Sem merge/deploy antes do CI completo e revisão de segurança.
