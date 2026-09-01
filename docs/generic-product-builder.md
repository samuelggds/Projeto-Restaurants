# Motor genérico de configuração de produtos

O motor permite vender qualquer item de duas formas sem introduzir regras específicas para pizza,
lanche, poke ou outro domínio:

- `COMPLETE`: produto pronto, adicionado diretamente à sacola pelo preço-base;
- `BUILDABLE`: produto personalizável por etapas, composição removível e, opcionalmente, porções.

Produtos novos começam como `COMPLETE` na interface administrativa. Um produto só pode ser salvo
como `BUILDABLE` quando possui ao menos uma etapa válida. Converter um produto configurado para
`COMPLETE` exige confirmação explícita, pois grupos, composição e porções são removidos.

## Modelo de configuração

### Etapas e opções

`ProductOptionGroup` representa uma etapa exibida ao cliente. Cada etapa define:

- nome, descrição e posição;
- seleção única ou múltipla;
- mínimo e máximo de opções;
- obrigatoriedade derivada das regras de seleção;
- opções ativas ligadas ao catálogo de ingredientes do mesmo restaurante.

`ProductOption` guarda o comportamento contextual da opção naquele produto. Alterar preço,
quantidade ou seleção padrão não altera o ingrediente reutilizado em outros produtos.

Uma opção pode permitir quantidade entre 1 e 99. `defaultSelected` inicia a opção marcada e
`locked` a torna fixa; toda opção fixa também precisa ser pré-selecionada. A ordem de grupos e
opções é persistida e usada no cardápio, snapshot, cozinha e impressão.

### Composição padrão

`ProductCompositionItem` descreve o que já acompanha o produto. O Admin define quais itens podem
ser retirados. O cliente envia apenas os IDs removidos; o backend recarrega a composição atual,
recusa itens fixos ou cross-tenant e grava nomes e IDs no snapshot do pedido.

### Porções

`ProductPortionConfiguration` liga o produto a uma etapa cujas opções podem ocupar partes iguais.
São aceitas de 1 a 8 porções e uma observação opcional de até 300 caracteres por parte.

As estratégias usam valores em centavos:

- `ADD`: soma os valores de todas as porções;
- `HIGHEST`: usa o maior valor;
- `AVERAGE`: usa a média arredondada;
- `PROPORTIONAL`: usa a média enquanto todas as frações forem iguais;
- `FIXED`: não altera o preço-base por causa das porções.

O modelo atual representa apenas partes iguais (`1/n`). Frações desiguais exigem uma evolução de
contrato e não devem ser inferidas no frontend.

## Autoridade de preço

O frontend calcula somente uma estimativa para resposta imediata. No pedido e na cotação, o backend
recarrega produto, desconto, grupos, opções, ingredientes e configuração de porções do banco.

Há dois modos de preço contextual:

- `ADDITIVE`: soma `additionalPrice * quantity` ao preço-base;
- `ABSOLUTE`: define o preço-base final da montagem; no máximo uma escolha pode fazer isso.

Uma montagem não pode combinar duas fontes de preço absoluto. Porções absolutas também não podem
usar `ADD`. Valores enviados pelo navegador nunca são usados como fonte de verdade.

## Contrato do cliente

O checkout envia intenção, não dinheiro:

```json
{
  "productId": 42,
  "quantity": 1,
  "configurationVersion": 3,
  "selectedOptions": [{ "optionId": 101, "quantity": 2 }],
  "removedCompositionItemIds": [55],
  "portions": [{ "optionId": 201 }, { "optionId": 202, "observation": "Bem assada" }],
  "observation": "Embalar separado"
}
```

O backend valida limites, disponibilidade, opções fixas, tenant e versão. Se a configuração mudou
desde que o cliente abriu o cardápio, o pedido é recusado para evitar uma compra diferente da que
foi revisada.

## Snapshot imutável

Cada `OrderItem` novo pode guardar `configurationSnapshot` versão 2 com:

- versão da configuração e modo de venda;
- preço-base e total autoritativo usados no pedido;
- grupos, opções, quantidades, preços unitários e totais;
- composição e retiradas;
- porções, frações, observações e estratégia de preço.

Cozinha e impressão leem esse snapshot sem consultar o catálogo atual. Pedidos antigos sem snapshot
continuam usando `ingredients`, customizações legadas e observações. Alterar ou excluir uma opção
no catálogo nunca reescreve pedidos já realizados.

## Modelos reutilizáveis

`ProductConfigurationTemplate` guarda uma configuração privada por restaurante. Aplicar um modelo
cria uma cópia independente no produto; edições posteriores não se propagam. Nomes são únicos no
tenant, inclusive quando o modelo foi desativado, e ingredientes de outro restaurante são recusados.

Ações de criar, editar e desativar modelos são auditadas. Criação e edição de produtos registram
modo, preço-base, versão e partes alteradas. Os logs guardam IDs e resumos, não imagens nem conteúdo
integral do cardápio importado.

## Isolamento multi-tenant

As relações novas usam chaves compostas com `restaurantId`, impedindo vínculos entre produto,
grupo, opção e ingrediente de restaurantes diferentes. `ProductCompositionItem`,
`ProductPortionConfiguration` e `ProductConfigurationTemplate` usam `ENABLE ROW LEVEL SECURITY`,
`FORCE ROW LEVEL SECURITY` e policy `FOR ALL` com `USING` e `WITH CHECK`.

Serviços acessam essas tabelas dentro de `withTenantDbContext` ou aplicam `setTenantDbContext` na
transação existente. A role de runtime precisa ser `NOSUPERUSER`, `NOBYPASSRLS` e não pode ser dona
das tabelas protegidas.

## Compatibilidade e importação

- Produtos simples e clientes antigos continuam aceitos.
- `ingredientIds` e `ProductIngredient` permanecem legíveis para pedidos legados.
- IDs e preços antigos são preservados pela migration; `additionalPrice` é preenchido pelo preço do
  ingrediente existente.
- Campos novos no snapshot são opcionais nas bordas de leitura.
- Importadores de imagem e iFood criam itens explicitamente como `COMPLETE`. A importação não
  inventa etapas, ingredientes ou porções a partir de texto ambíguo; o Admin pode personalizar o
  produto depois ou aplicar um modelo revisado.

## Operação

A migration `20260901140000_add_generic_product_builder` é aditiva. Antes do deploy:

1. faça backup e valide o estado das migrations;
2. execute `npm --prefix backend run db:migrate:deploy` com a conexão owner;
3. confirme as policies e grants da role runtime;
4. publique backend e frontend compatíveis;
5. monitore rejeições de versão e validação de montagem.

Não há rollback destrutivo automático. Em uma reversão de aplicação, mantenha as colunas e tabelas
novas até que nenhum pedido dependa dos snapshots versão 2.

## Validação

```powershell
npm --prefix backend run typecheck
npm --prefix backend run test:e2e:rls
npm --prefix frontend test -- src/pages/Home/domain/productCustomization.test.ts
npm --prefix frontend run test:e2e -- e2e/product-customization.spec.ts
npm run ci
```

O E2E RLS cria um PostgreSQL descartável em loopback, provisiona uma role runtime restrita, aplica
todas as migrations e remove o container ao terminar.
