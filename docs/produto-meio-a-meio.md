# Preço dinâmico do meio a meio

No cadastro de um **produto personalizável**, a etapa **Quanto custa?** permite escolher:

- **Preço fixo**: exige o preço inicial e mantém as regras existentes de personalização.
- **Meio a meio**: não exige preço inicial. O cadastro novo prepara duas etapas obrigatórias, uma para cada metade. Vincule os produtos já cadastrados em cada etapa.

O cliente vê **Preço conforme as escolhas** no cardápio. Na montagem, o preço acompanha o maior valor dos produtos selecionados. Exemplo: R$ 35,00 e R$ 42,00 resultam em R$ 42,00. Adicionais são somados separadamente. O servidor consulta os preços atuais e valida as escolhas, o restaurante e a disponibilidade; o checkout não aceita um total calculado pelo navegador.

Para corrigir um produto existente que anuncia R$ 29,90, edite-o, escolha **Meio a meio** em **Quanto custa?**, confira as etapas e salve. Os produtos existentes mantêm o comportamento anterior até essa escolha explícita.

## Persistência e publicação

`Product.pricingMode` usa `BASE` (padrão compatível) ou `HIGHEST_OPTION`. Neste último modo, `price` é armazenado como zero, sem representar um preço gratuito de venda. A compra exige produtos selecionados que definam o valor. Mudanças parciais também validam a configuração resultante.

A migração `20260919160000_product_dynamic_pricing` adiciona o enum e a coluna com padrão `BASE`, sem reescrever preços ou apagar dados. A publicação precisa executar `prisma migrate deploy` antes de iniciar o backend atualizado e gerar o Prisma Client durante o build. A migração não foi aplicada ao banco de produção durante o desenvolvimento.

O meio a meio exige ao menos uma etapa obrigatória composta por produtos vinculados. Regras avançadas de porções e preço final de ingredientes não podem competir com esse modo. Um produto de preço dinâmico não pode servir como fonte de preço de outro meio a meio.

## Verificação

Testes cobrem criação sem preço, atualização parcial, retorno ao preço fixo, maior valor após mudança de preço, escolhas obrigatórias, isolamento de restaurante, cálculo de adicionais e cadastro/compra em desktop e celular. Os testes de navegador usam APIs simuladas; a validação das regras de preço no backend possui testes separados.
