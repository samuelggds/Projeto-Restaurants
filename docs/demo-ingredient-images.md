# Fotos de ingredientes da demonstração

Estas imagens pertencem exclusivamente ao catálogo fictício da GastroNexa. Não há migração, seed de banco ou atualização dos ingredientes dos restaurantes reais.

## Arquivos finais

Todas as imagens estão em `frontend/public/demo/ingredients/`, em WebP de 512 × 512 pixels. O conjunto ocupa aproximadamente 235 KiB.

| Ingrediente fictício | Arquivo        | Assunto da geração                                                  |
| -------------------- | -------------- | ------------------------------------------------------------------- |
| Bacon                | `bacon.webp`   | Fatias de bacon cozido e crocante                                   |
| Queijo cheddar       | `cheese.webp`  | Fatias de cheddar alaranjado e um pequeno bloco                     |
| Alface               | `lettuce.webp` | Folhas de alface frescas com gotas de água                          |
| Tomate               | `tomato.webp`  | Um tomate vermelho inteiro e duas fatias                            |
| Molho da casa        | `sauce.webp`   | Molho alaranjado claro em um ramequim, com pequenos pontos de ervas |
| Hambúrguer 160 g     | `patty.webp`   | Um disco de carne bovina grelhado, sem pão nem queijo               |

## Método e prompts

Modo utilizado: ferramenta nativa `image_gen`, com uma geração independente por ingrediente. Não foi utilizada API por CLI, banco de fotografias ou Pexels. Os PNGs gerados foram inspecionados visualmente e convertidos com Sharp para miniaturas WebP; o assunto das imagens não foi alterado nessa conversão.

Direção comum do conjunto de prompts, com o assunto de cada linha da tabela:

> Use case: product-mockup. Single square photorealistic food catalog photograph for one restaurant ingredient. Subject: [ingredient subject]. Centered close-up on pale warm neutral ceramic surface. Soft studio daylight, appetizing realistic texture. Object entirely fits with generous margins. No lettering, logo, watermark, props or other foods. This is one ingredient thumbnail, not a finished dish.

## Uso na interface

`demoIngredients.ts` vincula cada ingrediente à sua foto. A busca demonstrativa reconhece palavras do nome, inclusive em nomes personalizados como “Queijo de demonstração”. Quando não existe exemplo correspondente, oferece envio de foto ou cadastro sem imagem, em vez de sugerir uma fotografia de outro ingrediente.

Fotos enviadas e ingredientes criados pelo visitante permanecem no armazenamento da demonstração no navegador. Reiniciar o cenário restaura os exemplos iniciais. A pesquisa de imagens do cadastro real continua usando o serviço já existente.
