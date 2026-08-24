# Arquitetura do projeto

O projeto é organizado por funcionalidades. Novas regras de negócio devem permanecer próximas do módulo que as possui, evitando componentes e serviços globais com múltiplas responsabilidades.

## Frontend

```text
frontend/src/
  components/         componentes visuais compartilhados
  contexts/           estado global e sessão
  routes/             política e composição de rotas
  Services/           clientes HTTP e integrações externas
  pages/<feature>/
    components/       componentes da funcionalidade
    hooks/            coordenação de estado e efeitos
    domain/            regras puras da funcionalidade
    types.ts           contratos da funcionalidade
    <Feature>.tsx      composição da página
```

Uma página deve coordenar componentes, não conter regras de persistência, validação de domínio e integração HTTP ao mesmo tempo. Formulários extensos devem ficar em componentes próprios. Regras puras devem ser testáveis sem renderizar React.

## Backend

```text
backend/src/modules/<feature>/
  controllers/        tradução HTTP para casos de uso
  services/           casos de uso
  repositories/       persistência
  providers/          integrações externas
  domain/             regras puras e tipos do domínio
  routes/             endpoints do módulo
```

Controllers não devem conter regras de negócio. Services não devem conhecer detalhes de Express. Integrações com Mercado Pago, Asaas e PagBank devem ser implementadas em providers separados e consumidas por um caso de uso coordenador.

## Limites práticos

- Evitar arquivos acima de 500 linhas; acima disso, revisar responsabilidades.
- Componentes de página apenas compõem seções e hooks.
- Um arquivo não deve importar diretamente detalhes internos de outra funcionalidade.
- Toda extração deve preservar a API pública do módulo durante a migração.
- Cada etapa de refatoração deve passar por typecheck, lint, pelos testes proporcionais ao risco e build antes da próxima.

## Estratégia de testes sustentável

Todo comportamento deve ser comprovado na camada mais baixa que represente o risco real. O projeto não exige que a mesma regra seja repetida em teste unitário, integração e E2E.

- **Unitário:** regra pura com ramificações relevantes, cálculos, validação ou regressão de bug. Não testar estilos, textos estáticos, getters triviais nem detalhes internos.
- **Integração:** contrato entre módulos, banco, autenticação, tenant, pagamento ou socket que um unitário isolado não comprova. Usar somente quando a fronteira é parte do risco.
- **E2E:** jornada crítica que atravessa telas e papéis. O conjunto obrigatório cobre QR/mesa, cozinha, garçom, entrega em tempo real e promoção/fidelidade. Variações devem ficar nas camadas menores.
- **Correção de bug:** adicionar um único teste de regressão na camada que detectaria a causa, não em todas as camadas.
- **Layout:** validar por revisão responsiva e acessibilidade; usar E2E apenas quando a interação ou contenção não puder ser testada de forma estável abaixo.

Os critérios e comandos completos estão em `TESTING.md`.

## Estratégia de migração

1. Extrair componentes visuais sem alterar comportamento.
2. Extrair hooks de coordenação e regras puras.
3. Separar clientes externos em providers.
4. Adicionar testes às regras extraídas.
5. Só então remover as implementações antigas.

Essa estratégia permite evoluir a arquitetura sem uma reescrita arriscada e sem interromper o funcionamento atual.
