import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { createRestaurantSchema } from '../../../validators/RestaurantValidator.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';

type Cuisine = z.infer<typeof createRestaurantSchema>['restaurant']['category'];
type Dish = [section: string, name: string, description: string, price: number, image: string];

const catalogPhotos = '/marketing-vitrines/cardapios';
const espresso: Dish = ['Cafés', 'Espresso', 'Café curto servido na xícara.', 6, '/cardapio-inicial/espresso.webp'];
const croissant: Dish = ['Panificação', 'Croissant', 'Massa folhada assada e dourada.', 12, '/cardapio-inicial/croissant.webp'];
const pudding: Dish = ['Sobremesas', 'Pudim', 'Fatia de pudim de leite com calda de caramelo.', 12.9, catalogPhotos + '/dessert.webp'];
const brigadeiro: Dish = ['Sobremesas', 'Brigadeiro de colher', 'Doce de chocolate servido no potinho.', 9.9, '/demo/dessert.webp'];
const fries: Dish = ['Porções', 'Batata frita', 'Porção de batatas fritas crocantes.', 12.9, '/demo/fries.webp'];
const soda: Dish = ['Bebidas', 'Refrigerante em lata', 'Lata individual de 350 ml.', 6, '/demo/soda.webp'];
const burger: Dish = ['Lanches', 'Hambúrguer com cheddar', 'Hambúrguer na chapa, cheddar e pão tostado.', 29.9, catalogPhotos + '/burger.webp'];
const garlicBread: Dish = ['Entradas', 'Pão de alho', 'Pão tostado com alho e ervas.', 13.9, catalogPhotos + '/pao-de-alho.webp'];

export const trialMenus: Record<Cuisine, Dish[]> = {
  PIZZARIA: [
    ['Pizzas', 'Pizza margherita', 'Molho de tomate, muçarela e manjericão.', 48.9, catalogPhotos + '/pizza.webp'],
    ['Pizzas', 'Calabresa com cebola', 'Pizza com calabresa fatiada, muçarela e cebola.', 46.9, catalogPhotos + '/calabresa-cebola.webp'],
    ['Pizzas', 'Quatro queijos', 'Pizza gratinada com quatro queijos.', 52.9, catalogPhotos + '/quatro-queijos.webp'],
    garlicBread, brigadeiro, soda,
  ],
  HAMBURGUERIA: [
    burger,
    ['Lanches', 'Smash duplo', 'Dois discos de carne, cheddar e pão tostado.', 32.9, catalogPhotos + '/smash-duplo.webp'],
    ['Lanches', 'Frango crocante', 'Frango empanado no pão com alface e maionese.', 27.9, catalogPhotos + '/frango-crocante.webp'],
    fries, soda,
  ],
  ACAITERIA: [
    ['Açaís', 'Açaí com frutas', 'Tigela de açaí com banana, morango e granola.', 22.9, catalogPhotos + '/acai.webp'],
    ['Açaís', 'Açaí com paçoca', 'Açaí com paçoca de amendoim esfarelada.', 24.9, catalogPhotos + '/acai-pacoca.webp'],
    ['Cremes', 'Creme de cupuaçu', 'Creme gelado de cupuaçu no copo.', 18.9, catalogPhotos + '/creme-cupuacu.webp'],
    ['Bebidas', 'Vitamina de açaí', 'Açaí batido com banana e leite.', 17.9, catalogPhotos + '/vitamina-acai.webp'],
  ],
  RESTAURANTE: [
    ['Pratos principais', 'Tagliatelle ao ragù', 'Massa em fitas com molho de carne.', 42, catalogPhotos + '/pasta.webp'],
    ['Pratos principais', 'Nhoque ao sugo', 'Nhoque de batata com molho de tomate.', 36.9, catalogPhotos + '/nhoque-sugo.webp'],
    ['Pratos principais', 'Risoto de cogumelos', 'Arroz arbóreo com cogumelos e parmesão.', 44.9, catalogPhotos + '/risoto-cogumelos.webp'],
    pudding, soda,
  ],
  CAFETERIA: [espresso, croissant, pudding, brigadeiro],
  JAPONESA: [
    ['Sushi', 'Nigiri de salmão', 'Duas unidades de salmão sobre arroz de sushi.', 16, '/cardapio-inicial/nigiri.webp'],
    ['Sushi', 'Maki de salmão', 'Quatro unidades com salmão, arroz e alga.', 20, '/cardapio-inicial/maki.webp'],
    soda,
  ],
  CHURRASCARIA: [
    ['Na brasa', 'Picanha fatiada', 'Picanha grelhada e servida em fatias.', 55, '/cardapio-inicial/picanha.webp'],
    ['Na brasa', 'Linguiça grelhada', 'Porção de linguiça fatiada na brasa.', 25, '/cardapio-inicial/linguica.webp'],
    garlicBread, fries, soda,
  ],
  DOCERIA: [brigadeiro, pudding, croissant, espresso],
  LANCHONETE: [burger, fries, brigadeiro, soda],
  PADARIA: [croissant, garlicBread, espresso, pudding],
  OUTRO: [burger, fries, pudding, soda],
};

// Called only inside the transaction that creates a new tenant.
export async function seedRestaurantTrialMenu(tx: Prisma.TransactionClient, restaurantId: number, cuisine: Cuisine) {
  await setTenantDbContext(tx, restaurantId);
  const sections = new Map<string, number>();
  const products: Prisma.ProductCreateManyInput[] = [];
  for (const [section, name, description, price, image] of trialMenus[cuisine]) {
    let categoryId = sections.get(section);
    if (categoryId === undefined) {
      const category = await tx.category.create({
        data: { name: section, restaurantId, image, sortOrder: sections.size },
        select: { id: true },
      });
      categoryId = category.id;
      sections.set(section, categoryId);
    }
    products.push({ categoryId, restaurantId, name, description, price, image, saleMode: 'COMPLETE' });
  }
  await tx.product.createMany({ data: products });
}
