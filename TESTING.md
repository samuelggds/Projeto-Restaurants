# Estratégia de testes

O objetivo da suíte é reduzir risco de produção sem criar uma segunda implementação do sistema para manter. Cada comportamento deve ter um responsável e ser testado uma vez na camada mais barata que consiga detectar a falha.

## Matriz de decisão

| Risco                                                  | Camada padrão               | Exemplos                                                     |
| ------------------------------------------------------ | --------------------------- | ------------------------------------------------------------ |
| Cálculo, transformação ou validação pura               | Unitário                    | preço final, seleções obrigatórias, horário de funcionamento |
| Persistência, autorização ou isolamento de restaurante | Integração                  | Prisma, middleware, webhook, vínculo pedido/tenant           |
| Evento em tempo real entre atores                      | Integração                  | sala Socket.IO, remetente e destinatário corretos            |
| Jornada essencial entre várias telas/papéis            | E2E                         | QR da mesa até cozinha, garçom, motoqueiro e cliente         |
| CSS, cópia ou composição sem regra                     | Sem teste automatizado novo | revisão responsiva, lint e inspeção visual                   |

Antes de criar um teste, confirme:

1. Existe uma falha de negócio ou integração que ele detectará?
2. Um teste já existente cobre o mesmo contrato?
3. É possível comprová-lo em uma camada menor e mais estável?
4. O teste usa comportamento público, sem depender de estrutura interna ou tempos arbitrários?

Se a resposta à primeira for não, ou à segunda for sim, o novo teste não deve ser criado.

## Suítes

- `npm test`: regras e integrações rápidas do backend e frontend.
- `npm run test:e2e:critical`: somente as cinco jornadas críticas mantidas como porta de CI.
- `npm run test:e2e`: regressão E2E ampliada, usada antes de releases relevantes ou quando a área afetada exigir.
- `npm --prefix frontend run test:coverage`: diagnóstico sob demanda. Cobertura numérica não é meta isolada nem motivo para testes artificiais.

Os E2E obrigatórios são:

- `table-qr-role-flow.spec.ts`: criação/vínculo do QR, abertura da mesa e pedido identificado.
- `kitchen-order-customizations.spec.ts`: itens e observações chegam à cozinha.
- `waiter-operations.spec.ts`: operação essencial do salão.
- `courier-operations.spec.ts`: retirada, GPS, rastreamento e conclusão.
- `promotions-loyalty.spec.ts`: promoção, resgate e uso do benefício.

Os demais E2E continuam disponíveis como regressões direcionadas, mas não duplicam a porta obrigatória de cada alteração.

## Regras de manutenção

- Prefira fixtures pequenas e determinísticas.
- Não use `waitForTimeout`; aguarde uma condição observável.
- Selecione elementos por papel, rótulo ou `data-testid` estável.
- Não replique todos os estados de erro no E2E; cubra-os no domínio ou integração.
- Ao corrigir um teste frágil, reduza o acoplamento em vez de aumentar timeouts.
- Remova um teste quando sua regra deixar de existir ou quando outro teste mais barato passar a cobrir exatamente o mesmo risco.
# Qualidade incremental

O CI executa lint com zero avisos, TypeScript, testes, arquitetura, auditoria e build. O comando
`npm run format:check` permanece disponível, mas ainda não bloqueia o CI porque existe um legado
de formatação amplo. Arquivos alterados devem ser formatados; a base deve ser normalizada em lotes
separados para manter revisões legíveis.

O limite arquitetural padrão é de 1.200 linhas. Arquivos legados maiores possuem limites
individuais iguais ao tamanho atual: eles podem ser reduzidos, mas o CI impede qualquer crescimento.
Testes backend são descobertos automaticamente em `src/**/*.test.ts` por `npm run test`.

O frontend começa com limites globais de cobertura de 35% para linhas, funções e statements e 25%
para branches. Esses valores são um piso, não uma meta; aumente-os conforme as áreas administrativas
e os serviços HTTP recebam testes.
