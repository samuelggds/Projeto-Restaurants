import type { DigitalMenuData } from './types';
const images = {
  pizza:
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=88',
  pepperoni:
    'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=88',
  burger:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=88',
  pasta:
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=88',
  dessert:
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=88',
  drink:
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=88',
};
export const digitalMenuMockData: DigitalMenuData = {
  restaurantName: 'Sabor & Casa',
  monogram: 'S&C',
  primaryColor: '#d64d08',
  tableNumber: 12,
  orderStatus: 'preparing',
  categories: [
    { id: 'featured', name: 'Destaques', image: images.pizza },
    { id: 'pizzas', name: 'Pizzas', image: images.pepperoni },
    { id: 'burgers', name: 'Hambúrgueres', image: images.burger },
    { id: 'pastas', name: 'Massas', image: images.pasta },
    { id: 'desserts', name: 'Sobremesas', image: images.dessert },
    { id: 'drinks', name: 'Bebidas', image: images.drink },
  ],
  products: [
    {
      id: '1',
      categoryId: 'featured',
      name: 'Pizza Margherita Especial',
      description: 'Molho de tomate italiano, muçarela de búfala e manjericão fresco.',
      price: 54.9,
      image: images.pizza,
      rating: 4.8,
      preparationTime: '25–30 min',
      customizable: true,
    },
    {
      id: '2',
      categoryId: 'pizzas',
      name: 'Pizza Calabresa',
      description: 'Calabresa artesanal, cebola roxa e muçarela.',
      price: 49.9,
      image: images.pepperoni,
      rating: 4.7,
      preparationTime: '25–30 min',
    },
    {
      id: '3',
      categoryId: 'burgers',
      name: 'Cheddar Artesanal',
      description: 'Blend Angus, cheddar cremoso e cebola caramelizada.',
      price: 42.9,
      image: images.burger,
      rating: 4.8,
      preparationTime: '20–25 min',
    },
    {
      id: '4',
      categoryId: 'pastas',
      name: 'Fettuccine Alfredo',
      description: 'Massa fresca, parmesão e molho cremoso.',
      price: 46.9,
      image: images.pasta,
      rating: 4.6,
      preparationTime: '20–25 min',
    },
    {
      id: '5',
      categoryId: 'desserts',
      name: 'Petit Gâteau',
      description: 'Bolo quente de chocolate com recheio cremoso.',
      price: 24.9,
      image: images.dessert,
      rating: 4.9,
      preparationTime: '15–20 min',
    },
    {
      id: '6',
      categoryId: 'drinks',
      name: 'Refrigerante',
      description: 'Copo 350 ml com gelo e limão.',
      price: 7.9,
      image: images.drink,
      rating: 4.7,
      preparationTime: '5 min',
    },
  ],
};
