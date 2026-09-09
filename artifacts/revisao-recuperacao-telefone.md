# Recuperação de senha por telefone — comportamento verificado

Revisão de 08/09/2026. Nenhuma funcionalidade de recuperação foi alterada nesta tarefa.

**Atualização de 09/09/2026:** a descrição abaixo preserva o achado original. Após esta revisão, a interface foi corrigida para explicar que o código chega ao e-mail cadastrado, a busca normaliza telefone brasileiro e recusa números associados a mais de uma conta. O canal continua sendo e-mail; SMS não foi implementado. Consulte [acompanhamento das correções](../docs/security-and-scale-implementation.md).

## Resultado

O telefone identifica a conta; **o código é enviado ao e-mail cadastrado**. Não foi encontrado envio por SMS ou WhatsApp neste fluxo. A interface começa com “Telefone” selecionado, oferece “Escolha e-mail ou telefone e receba um código” e depois mostra “Código solicitado para {identifier}”. Isso sugere recebimento no telefone informado, embora o backend use esse telefone apenas para localizar o cadastro.

- UI e método inicial: `frontend/src/pages/RecoverPassword/RecoverPassword.tsx:45`.
- Payload alterna `{phone}`/`{email}`: `frontend/src/pages/RecoverPassword/RecoverPassword.tsx:86`.
- Texto de escolha do contato e confirmação: `frontend/src/pages/RecoverPassword/RecoverPassword.tsx:204` e `:257`.
- Backend escolhe busca por e-mail ou telefone: `backend/src/modules/auth/services/RequestPasswordResetService.ts:92`.
- Entrega é sempre `transporter.sendMail({to: user.email})`: `backend/src/modules/auth/services/RequestPasswordResetService.ts:147`.

## Reprodução local

O probe executa o serviço real com repositórios e transporte de e-mail simulados. Não consulta banco, envia mensagens externas ou imprime o código gerado.

```powershell
# Executar em backend/
node scripts/runTsxWithOsUserInfoFallback.cjs ../artifacts/probe-recuperacao-telefone.ts
```

Resultado observado:

```json
{
  "scenario": "phone-is-lookup-email-is-delivery",
  "lookup": "(11) 99999-9999",
  "claims": 1,
  "emailCalls": 1,
  "recipient": "test-account@example.test",
  "response": {
    "message": "Se os dados informados existirem, enviamos um codigo para redefinir a senha."
  }
}
```

Isso comprova o canal escolhido pelo código, sem comprovar entrega operacional de e-mail.

## Proteções e limites

- Resposta genérica para contas existentes/inexistentes e para falha de entrega em produção; não informa se o telefone está cadastrado.
- Código aleatório de seis dígitos, hash bcrypt e duração de 15 minutos. Reenvio tem cooldown por conta de 30 segundos e claim atômico. Trocar e-mail por telefone não reinicia esse cooldown (`RequestPasswordResetCooldown.test.ts`).
- Cinco códigos incorretos bloqueiam a recuperação por 30 minutos; consumo válido revoga tokens anteriores via `authVersion` (`ResetPasswordByCodeService.ts:7`, `:45`, `:87`).
- Sem transporte configurado, o serviço retorna a mensagem genérica sem entregar código. Logs de código são restritos ao opt-in local. Isso é comportamento lido, não uma solicitação de credenciais externas.
- `UserRepository.findByPhone` remove caracteres não numéricos e compara os dígitos literalmente, com `LIMIT 1`, sem tenant ou ordenação (`backend/src/modules/auth/repositories/UserRepository.ts:26`). Não normaliza DDI; números com e sem `55` não são equivalentes por essa consulta.
- `User.phone` não tem unicidade no schema (`backend/prisma/schema.prisma:25`). Se múltiplos cadastros compartilharem telefone, a seleção é ambígua. Não foi reproduzido acesso indevido: o código continua enviado ao e-mail da conta encontrada. O risco identificado é recuperação imprevisível/da conta diferente da desejada.

## Próxima decisão de produto

O ajuste mínimo coerente é apresentar telefone como uma forma de localizar a conta e informar que o código segue para o e-mail cadastrado, mantendo a resposta sem enumeração de usuários. Se o produto realmente precisar entregar por telefone, definir e implementar um canal verificado de SMS/WhatsApp e a política para telefone compartilhado/normalização. Nenhuma dessas opções foi implementada nesta revisão.
